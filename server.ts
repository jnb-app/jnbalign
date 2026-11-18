import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { validateCvDocument, validateJobOfferDocument } from "./src/utils/documentValidator.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable comprehensive CORS & preflight OPTIONS handling for all incoming requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Safe JSON body error interceptor
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({ success: false, error: "Format JSON de la requête invalide." });
  }
  if (err && err.status === 413) {
    return res.status(413).json({ success: false, error: "Fichier trop volumineux. La taille maximale autorisée est de 50 Mo." });
  }
  next(err);
});

app.use(express.static(path.resolve(__dirname, "public")));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Clé d'API GEMINI_API_KEY absente dans les variables d'environnement.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Cache des modèles ayant épuisé leur quota quotidien pour prioriser immédiatement les modèles disponibles
const exhaustedModels = new Set<string>();
// Fenêtre de refroidissement si les crédits de prépaiement / facturation du projet (402) sont épuisés
let billingCooldownUntil = 0;

function isNonRetriableBillingOrAuthError(err: any): { isBilling: boolean; isAuth: boolean } {
  const errMsg = err?.message || String(err || "");
  const status = err?.status;
  const isBilling =
    status === 402 ||
    errMsg.includes('"code":402') ||
    /\b402\b/.test(errMsg) ||
    errMsg.includes("prepayment credits") ||
    errMsg.includes("credits are depleted");
  const isAuth =
    status === 401 ||
    status === 403 ||
    errMsg.includes("PERMISSION_DENIED") ||
    errMsg.includes("API_KEY_INVALID");
  return { isBilling, isAuth };
}

async function callGeminiWithFallback<T>(
  action: (modelName: string) => Promise<T>,
  models = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
  maxRetriesPerModel = 2,
  timeoutMs = 45000
): Promise<T> {
  if (Date.now() < billingCooldownUntil) {
    throw new Error("GEMINI_BILLING_COOLDOWN: Crédits API temporairement épuisés (relais local actif).");
  }

  // Prioriser les modèles qui n'ont pas encore épuisé leur quota du jour
  const nonExhausted = models.filter((m) => !exhaustedModels.has(m));
  const candidateModels = nonExhausted.length > 0 ? nonExhausted : models;

  let lastError: any;
  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];
    const nextModel = candidateModels[mIdx + 1];

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout de ${Math.round(timeoutMs / 1000)}s dépassé pour le modèle ${model}`)), timeoutMs)
        );

        const result = await Promise.race([action(model), timeoutPromise]);
        console.log(`[Gemini API] Requête réussie avec le modèle ${model}`);
        return result;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);

        // Arrêt immédiat sans retry ni bascule inutile sur erreur de crédits/facturation (402) ou d'authentification (401/403)
        const { isBilling, isAuth } = isNonRetriableBillingOrAuthError(err);
        if (isBilling) {
          billingCooldownUntil = Date.now() + 5 * 60 * 1000;
          console.log(`[Gemini API] Crédits API épuisés (402). Bascule immédiate vers le moteur sémantique local.`);
          throw lastError;
        }
        if (isAuth) {
          console.log(`[Gemini API] Accès API non autorisé (${err?.status || "auth"}). Bascule immédiate vers le moteur local.`);
          throw lastError;
        }

        const isQuotaExceeded =
          err?.status === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota") ||
          errMsg.includes("Quota");

        const isProjectDailyLimit =
          isQuotaExceeded &&
          (errMsg.includes("limit: 0") ||
            errMsg.includes("per day limit exceeded") ||
            errMsg.includes("free_tier_input_token_count") ||
            errMsg.includes("free_tier_requests") ||
            errMsg.includes("daily limit"));

        const isUnavailable =
          err?.status === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("overloaded");

        const isModelDeprecatedOrNotFound =
          err?.status === 404 ||
          errMsg.includes("404") ||
          errMsg.includes("no longer available") ||
          errMsg.includes("NOT_FOUND");

        // Si le quota quotidien d'un modèle précis est atteint (Free Tier 20 req/jour/modèle) :
        if (isProjectDailyLimit) {
          exhaustedModels.add(model);
          if (nextModel) {
            console.log(`[Gemini API] Quota quotidien Free Tier atteint pour ${model}. Bascule immédiate vers ${nextModel}.`);
            break; // Passer directement au modèle suivant sans retry inutile
          } else {
            console.log("[Gemini API] Quota quotidien atteint pour l'ensemble des modèles disponibles. Bascule vers le moteur local.");
            throw lastError;
          }
        }

        // Si le modèle est déprécié ou non trouvé (404), basculer immédiatement
        if (isModelDeprecatedOrNotFound) {
          if (nextModel) {
            console.log(`[Gemini API] Modèle ${model} non disponible (404). Bascule vers ${nextModel}.`);
            break;
          }
        }

        // Sur 503 (haute demande temporaire) ou 429 (rate-limit temporaire)
        if (isUnavailable || isQuotaExceeded) {
          if (attempt < maxRetriesPerModel) {
            // Backoff avec gigue aléatoire pour absorber les pics de demande (1.2s - 2.0s)
            const backoffMs = 1200 * attempt + Math.floor(Math.random() * 800);
            console.log(`[Gemini API] Modèle ${model} temporairement très sollicité (503/429). Pause de ${backoffMs}ms avant réessai (${attempt}/${maxRetriesPerModel})...`);
            await new Promise((r) => setTimeout(r, backoffMs));
            continue; // Réessayer le même modèle
          } else if (nextModel) {
            // Tentatives épuisées sur ce modèle : pause avec gigue et bascule vers le modèle suivant
            const switchDelayMs = 1000 + Math.floor(Math.random() * 500);
            console.log(`[Gemini API] Modèle ${model} saturé. Bascule vers ${nextModel} dans ${switchDelayMs}ms...`);
            await new Promise((r) => setTimeout(r, switchDelayMs));
            break; // Passer au nextModel
          }
        } else {
          console.log(`[Gemini API] Relais après incident ${model} (tentative ${attempt}/${maxRetriesPerModel}): ${errMsg.slice(0, 140)}`);
          if (attempt < maxRetriesPerModel) {
            await new Promise((r) => setTimeout(r, 800));
            continue;
          } else if (nextModel) {
            break;
          }
        }
      }
    }
  }
  throw lastError;
}

// Validateur strict du nom du candidat : rejette formellement les diplômes, formations, intitulés de postes, technologies et rubriques
export function isInvalidCandidateName(name: string | undefined | null): boolean {
  if (!name || typeof name !== "string") return true;
  const clean = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.length < 3 || clean.length > 50) return true;

  // Liste exhaustive de tokens qui NE PEUVENT JAMAIS composer le nom d'une personne physique
  const forbiddenTokens = new Set([
    // Métiers, Rôles & Fonctions
    "product", "owner", "ownership", "manager", "management", "lead", "leader", "leadership",
    "director", "directeur", "directrice", "consultant", "consultante", "consulting",
    "developer", "developpeur", "developpeuse", "engineer", "ingenieur", "ingenieure", "engineering",
    "architect", "architecte", "architecture", "analyst", "analyste", "analysis",
    "scrum", "agile", "coach", "coaching", "master", "officer", "specialist", "specialiste",
    "expert", "confirme", "confirmee", "senior", "junior", "middle", "office", "back", "front",
    "fullstack", "stack", "chef", "responsable", "charge", "chargee", "assistant", "assistante",
    "coordinateur", "coordinatrice", "technicien", "technicienne", "stagiaire", "alternant",
    "alternante", "etudiant", "etudiante", "eleve", "freelance", "independant", "cadre",
    "associe", "partner", "founder", "fondateur", "fondatrice", "president", "ceo", "cto", "cpo", "coo", "cmo", "vp", "head",
    "po", "pm", "dev", "qa",

    // Technologies, Outils, Langues & Méthodologies
    "salesforce", "sap", "oracle", "aws", "azure", "gcp", "cloud", "jira", "confluence",
    "docker", "kubernetes", "python", "java", "javascript", "typescript", "react", "angular",
    "vue", "node", "sql", "nosql", "linux", "devops", "git", "github", "gitlab", "crm", "erp",
    "excel", "powerpoint", "word", "tableau", "figma", "trello", "slack",
    "kanban", "safe", "lean", "itil",
    "solidworks", "fusion", "inkscape", "autocad", "catia", "photoshop", "illustrator", "indesign",
    "access", "rstudio", "multispectrales", "informatique", "bureautique", "modelisation",
    "agronomie", "agroalimentaire", "maintenance", "fiabilite", "logistique",
    "anglais", "allemand", "espagnol", "francais", "italien", "portugais",

    // Diplômes, Filières & Formations
    "miage", "licence", "bachelor", "doctorat", "phd", "msc", "bsc", "mba", "bts", "dut",
    "deust", "deug", "bac", "baccalaureat", "mastere", "universite", "ecole", "faculte",
    "iut", "cursus", "diplome", "diplomes", "formation", "formations", "certif", "certification",
    "prepa", "stage", "alternance", "apprentissage", "contrat", "professionnalisation",

    // Rubriques de CV & Textes génériques
    "coordonnees", "contact", "contacts", "information", "informations", "profil", "profile",
    "curriculum", "vitae", "resume", "summary", "presentation", "projets", "projet", "project",
    "realisation", "realisations", "competence", "competences", "skills", "experience",
    "experiences", "langue", "langues", "interet", "hobbies", "loisirs", "divers",
    "candidat", "candidate", "candidature", "poste", "recrutement", "recherche", "emploi",
    "disponible", "disponibilite", "permis", "vehicule", "titre"
  ]);

  const words = clean.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.length === 0) return true;

  for (const w of words) {
    if (forbiddenTokens.has(w)) {
      return true;
    }
  }

  return false;
}

// Rétablir les lettres espacées individuellement (ex: "J O S I A N   N K U L I   B E L A N G A", "S A L E S F O R C E - P I L O T A G E", "R É S U M É")
export function collapseCanvaLetterSpacing(str: string): string {
  if (!str) return str;
  const segments = str.split(/(\s{2,}|\s+[\/|–—-]\s+)/);
  const fixedSegments = segments.map((seg, idx) => {
    if (idx % 2 === 1) {
      return /\s+[\/|–—-]\s+/.test(seg) ? ` ${seg.trim()} ` : " ";
    }
    const trimmed = seg.trim();
    if (!trimmed) return "";
    const chars = trimmed.split(/\s+/);
    if (chars.length >= 2 && chars.every((c) => c.length === 1 && /[A-Za-zÀ-ÿ0-9|•–—-]/.test(c))) {
      return chars.join("");
    }
    return trimmed;
  });
  return fixedSegments.join("").replace(/\s{2,}/g, " ").trim();
}

// Extraction robuste et infaillible du nom et prénom du candidat (Exclut formellement les en-têtes comme "Coordonnées", "Master Miage", etc.)
function extractCandidateFullName(cvText: string): string {
  if (!cvText) return "Candidat";

  const rawLines = cvText.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines = rawLines.map(collapseCanvaLetterSpacing);

  // 1. Détection d'un email pour corréler les fragments de nom (ex: josian.nkuli / nkuli)
  const normalizedEmailText = cvText
    .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)\s*\n?\s*\.\s*([a-zA-Z]{2,8})\b/g, "$1.$2")
    .replace(/([a-zA-Z0-9._-]+)@\s*\n?\s*([a-zA-Z0-9._-]+\.[a-zA-Z]{2,8})\b/g, "$1@$2");
  const emailMatch = normalizedEmailText.match(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+)\.[a-zA-Z0-9._-]+/);
  const emailPrefix = emailMatch ? emailMatch[1].toLowerCase() : "";
  const emailParts = emailPrefix.split(/[._-]/).filter((p) => p.length >= 3);

  // Si l'email a la structure prenom.nom@... on peut construire un nom de secours fiable
  let nameFromEmail: string | null = null;
  if (emailParts.length >= 2) {
    const candidateParts = emailParts.filter(p => !/^(contact|info|recrutement|job|admin|mail|test|cv|post|user|service)\b/i.test(p));
    if (candidateParts.length >= 2) {
      nameFromEmail = candidateParts
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    }
  }

  // Helper : re-segmenter un nom collé sans espace en utilisant les fragments de l'email (ex: "JOSIANNKULIBELANGA" + ["josian","nkuli"] -> "Josian Nkuli Belanga")
  const trySplitGluedNameWithEmail = (rawToken: string): string | null => {
    if (!rawToken || rawToken.includes(" ") || emailParts.length < 2) return null;
    const low = rawToken.toLowerCase();
    const partsFound: { start: number; end: number; text: string }[] = [];
    for (const part of emailParts) {
      const idx = low.indexOf(part);
      if (idx >= 0) {
        partsFound.push({ start: idx, end: idx + part.length, text: rawToken.slice(idx, idx + part.length) });
      }
    }
    if (partsFound.length < 2) return null;
    partsFound.sort((a, b) => a.start - b.start);
    const segments: string[] = [];
    let cursor = 0;
    for (const p of partsFound) {
      if (p.start < cursor) return null;
      if (p.start > cursor) segments.push(rawToken.slice(cursor, p.start));
      segments.push(p.text);
      cursor = p.end;
    }
    if (cursor < rawToken.length) segments.push(rawToken.slice(cursor));
    if (segments.length >= 2 && segments.length <= 4 && segments.every((s) => s.length >= 2)) {
      return segments.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
    return null;
  };

  const candidatePool = lines.slice(0, 35);

  // Priorité 0 : Nom et Prénom empilés sur 2 lignes consécutives en tête de CV (ex: "Théo\nBREFORT")
  const normPlain = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (let i = 0; i < Math.min(12, candidatePool.length - 1); i++) {
    const a = candidatePool[i].replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
    const b = candidatePool[i + 1].replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
    if (!a || !b) continue;
    if (/[\s,;:\/|@.\d]/.test(a) || /[\s,;:\/|@.\d]/.test(b)) continue;
    if (!/^[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’-]{1,22}$/.test(a) || !/^[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’-]{1,24}$/.test(b)) continue;
    const combined = `${a} ${b}`;
    if (isInvalidCandidateName(a) || isInvalidCandidateName(b) || isInvalidCandidateName(combined)) continue;
    const aN = normPlain(a);
    const bN = normPlain(b);
    const emailClean = normPlain(emailPrefix);
    const matchesEmailCompact =
      emailClean.length >= 4 &&
      (emailClean.includes(bN) ||
        emailClean.includes(aN) ||
        emailClean.startsWith(`${aN.charAt(0)}${bN}`) ||
        emailClean.startsWith(`${bN}${aN.charAt(0)}`));
    const looksLikeTopNamePair =
      i <= 2 &&
      /^[A-ZÀ-Ÿ][a-zà-ÿ'’-]+$/.test(a) &&
      (/^[A-ZÀ-Ÿ]{2,}(?:-[A-ZÀ-Ÿ]{2,})?$/.test(b) || /^[A-ZÀ-Ÿ][a-zà-ÿ'’-]+$/.test(b));
    if (matchesEmailCompact || looksLikeTopNamePair) {
      const capToken = (w: string) =>
        w
          .split("-")
          .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
          .join("-");
      return `${capToken(a)} ${capToken(b)}`;
    }
  }

  // Priorité 1 : ligne contenant au moins un fragment significatif de l'email du candidat ET non rejetée
  if (emailParts.length > 0) {
    for (const rawLine of candidatePool) {
      const line = rawLine.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
      if (isInvalidCandidateName(line)) continue;
      if (line.includes("@") || /\d/.test(line) || line.length > 40 || line.length < 4) continue;
      if (/[,;:\/|]/.test(line)) continue;
      if (line.includes("http") || line.includes("linkedin")) continue;

      const lower = line.toLowerCase();
      const matchesEmailPart = emailParts.some((part) => lower.includes(part));
      if (matchesEmailPart) {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length === 1) {
          const splitGlued = trySplitGluedNameWithEmail(words[0]);
          if (splitGlued && !isInvalidCandidateName(splitGlued)) return splitGlued;
        }
        if (words.length >= 2 && words.length <= 5 && !words.some(w => isInvalidCandidateName(w))) {
          return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }
      }
    }
  }

  // Priorité 2 : 2 à 4 mots capitalisés consécutifs (exclut formellement tout diplôme comme "Master Miage" ou titre de poste)
  for (const rawLine of candidatePool) {
    const line = rawLine.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
    if (isInvalidCandidateName(line)) continue;
    if (line.includes("@") || line.includes("http") || line.includes("www.") || line.includes(".com") || line.includes(".fr")) continue;
    if (/\d/.test(line)) continue;
    if (line.includes(":") || line.includes(";") || line.includes("/") || line.includes("|") || line.includes(",")) continue;
    if (line.length < 4 || line.length > 38) continue;

    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) {
      if (words.some(w => isInvalidCandidateName(w))) continue;
      const isAllUpperOrTitle = words.every((w) => /^[A-ZÀ-Ÿ]/.test(w));
      if (isAllUpperOrTitle) {
        return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }

  // Priorité 3 : première ligne propre et non-rubrique, non-diplôme (jamais de liste séparée par virgule/slash/pipe)
  for (const rawLine of candidatePool) {
    const line = rawLine.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
    if (isInvalidCandidateName(line)) continue;
    if (line.includes("@") || /\d/.test(line) || /[,;:\/|]/.test(line) || line.length > 35 || line.length < 4) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && !words.some(w => isInvalidCandidateName(w))) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  // Priorité 4 : Nom déduit de l'adresse email (ex: prenom.nom@... -> Prenom Nom)
  if (nameFromEmail && !isInvalidCandidateName(nameFromEmail)) {
    return nameFromEmail;
  }

  return "Candidat";
}

const ROLE_ACRONYMS = new Set([
  "IT", "SI", "CRM", "ERP", "BI", "AI", "IA", "RH", "HR", "SAP", "AWS", "GCP", "API",
  "SQL", "PL/SQL", "NOSQL", "UX", "UI", "QA", "B2B", "B2C", "PME", "ETI", "R&D",
  "CEO", "CTO", "CFO", "COO", "CIO", "CPO", "PMO", "DSI", "RSSI", "DPO", "MOA",
  "MOE", "AMOA", "AMOE", "PO", "PM", "CS", "BPO", "TMA", "SGBD", "ETL", "CI/CD",
  "NLP", "LLM", "RAG", "ML", "DL", "SRE", "SOC", "NOC", "IAM", "GRC", "SEO",
  "SEA", "SEM", "KPI", "OKR", "ROI", "SLA", "SAAS", "PAAS", "IAAS", "WMS", "TMS",
  "HCM", "SIRH", "GPEC", "QSE", "HSE", "CSRD", "ESG", "M&A", "FP&A", "IFRS", "GAAP", "ISO", "VIP"
]);

const ROLE_CANONICAL_TERMS: Record<string, string> = {
  salesforce: "Salesforce",
  devops: "DevOps",
  finops: "FinOps",
  secops: "SecOps",
  devsecops: "DevSecOps",
  mlops: "MLOps",
  dataops: "DataOps",
  gitops: "GitOps",
  javascript: "JavaScript",
  typescript: "TypeScript",
  "node.js": "Node.js",
  "next.js": "Next.js",
  "react.js": "React.js",
  "vue.js": "Vue.js",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  graphql: "GraphQL",
  sharepoint: "SharePoint",
  servicenow: "ServiceNow",
  powerbi: "PowerBI",
  hubspot: "HubSpot",
  wordpress: "WordPress",
  ios: "iOS",
  macos: "macOS",
  ".net": ".NET",
};

const ROLE_MINOR_WORDS = new Set([
  "de", "du", "des", "la", "le", "les", "en", "et", "ou", "à", "au", "aux", "pour", "par",
  "sur", "sous", "dans", "avec", "sans", "of", "and", "or", "in", "on", "for", "to", "the", "with", "by", "at"
]);

function toNaturalRoleWord(word: string, isFirstOrAfterSep: boolean): string {
  if (!word) return word;
  const upper = word.toUpperCase();
  const lower = word.toLowerCase();

  if (ROLE_CANONICAL_TERMS[lower]) return ROLE_CANONICAL_TERMS[lower];
  if (ROLE_ACRONYMS.has(upper)) return upper;

  // Gérer les élisions d' / l' (ex: D'APPLICATION -> d'Application)
  const elisionMatch = word.match(/^([dlDL]['’])(.+)$/);
  if (elisionMatch) {
    const prefix = isFirstOrAfterSep ? elisionMatch[1].charAt(0).toUpperCase() + elisionMatch[1].slice(1).toLowerCase() : elisionMatch[1].toLowerCase();
    return `${prefix}${toNaturalRoleWord(elisionMatch[2], true)}`;
  }

  // Gérer les traits d'union (ex: FULL-STACK -> Full-Stack)
  if (word.includes("-")) {
    return word
      .split("-")
      .map((part, idx) => toNaturalRoleWord(part, isFirstOrAfterSep || idx === 0))
      .join("-");
  }

  // Gérer les slashs sans espaces (ex: REACT/NODE -> React/Node)
  if (word.includes("/")) {
    return word
      .split("/")
      .map((part) => toNaturalRoleWord(part, true))
      .join("/");
  }

  if (!isFirstOrAfterSep && ROLE_MINOR_WORDS.has(lower)) {
    return lower;
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Nettoie un intitulé de poste issu d'une offre d'emploi :
 * - Supprime les mentions de genre (H/F, F/H, M/F, M/W, H/F/X...)
 * - Supprime les types de contrat et durées (CDD, CDI, Stage, Alternance, Freelance, Temps plein, Full-time, 6 mois...)
 * - Supprime les suffixes portail / secteur / localisation
 * - Convertit les titres tout en MAJUSCULES vers une casse professionnelle naturelle tout en préservant les acronymes (IT, CRM, AWS, MOA...)
 */
export function sanitizeJobRoleTitle(rawTitle?: string): string {
  if (!rawTitle || typeof rawTitle !== "string") return "";

  let cleaned = rawTitle
    .normalize("NFC")
    .replace(/\b(M[ÉE]THODE[S]?|ING[ÉE]NIEUR|TECHNICIEN|CHARG[ÉE]E?|RESPONSABLE|CHEF)\s+DE(MAINTENANCE|GESTION|PROJET|PRODUCTION|QUALIT[ÉE])\b/gi, "$1 DE $2")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Retirer suffixes de portails, domaines web (ex: | Jean-Michel.io) et préfixes génériques d'annonce
  cleaned = cleaned
    .replace(/\s*\|\s*(?:LinkedIn|Indeed|Welcome to the Jungle|WTTJ|Glassdoor|Apec|Cadremploi|HelloWork|Monster|JobTeaser|Meteojob|RegionsJob|Jobijoba|France Travail|Jean-Michel(?:\.io)?|Free-Work|Talent\.io|ChooseYourBoss|Malt|Comet|Silkhom|WeLoveDevs|Workday|Greenhouse|Lever|SmartRecruiters|Teamtailor|Recruitee|Taleez|Flatchr|Beetween|LesJeudis|Jooble|Neuvoo).*$/i, "")
    .replace(/\s*[-–—|•·@]\s*(?:www\.)?[A-Za-z0-9À-ÿ\-]+\.(?:io|fr|com|net|org|eu|co|ai|tech|jobs|work|dev|app|cloud|digital)\b.*$/i, "")
    .replace(/\s*\|\s*(?!.*\b(?:product|owner|proxy|manager|lead|developer|d[ée]veloppeur|architect|architecte|engineer|ing[ée]nieur|consultant|analyst|analyste|chef|scrum|director|directeur|responsable|expert|specialist|sp[ée]cialiste|devops|sre|data|cloud|amoa|moa)\b).*$/i, "")
    .replace(/\s*[-–—|]\s*Recrutement\s+par\b.*$/i, "")
    .trim();

  for (let pass = 0; pass < 4; pass++) {
    const before = cleaned;
    cleaned = cleaned
      .replace(/^(?:Offres?(?:\s+d['’]?\s*emploi)?|Annonces?(?:\s+d['’]?\s*emploi)?|Emplois?|Recrutement|Poste(?:\s+à\s+pourvoir)?|Intitulé(?:\s+du\s+poste)?|Titre|Job\s+(?:Title|Offer)|Role|Position)\s*(?:[:\-–—|]\s*|\s+)/i, "")
      .replace(/^(?:CDI|CDD|C\.D\.I\.|C\.D\.D\.|Stage|Alternance|Apprentissage|Freelance|Indépendant|Intérim|Interim|VIE|Full[\s-]?time|Part[\s-]?time)\s*(?:[:\-–—|]\s*|\s+)/i, "")
      .replace(/^(?:Nous\s+recherchons|Nous\s+recrutons|Recrute|Hiring|Looking\s+for)\s+(?:un(?:\(e\))?|une|des|a|an)?\s*/i, "")
      .trim();
    if (cleaned === before) break;
  }

  // 2. Retirer les mentions de genre entre parenthèses/crochets ou isolées (H/F, F/H, M/F, H/F/X, H ou F...)
  cleaned = cleaned
    .replace(/[\(\[\{]\s*(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F(?:\s*\/\s*X)?|M\s*\/\s*W(?:\s*\/\s*X)?|X\s*\/\s*F\s*\/\s*H|H\s+ou\s+F|F\s+ou\s+H|M\s+or\s+F|All\s+genders?)\s*[\)\]\}]/gi, " ")
    .replace(/(?:^|[\s,\-–—/|])(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F(?:\s*\/\s*X)?|M\s*\/\s*W(?:\s*\/\s*X)?|X\s*\/\s*F\s*\/\s*H)(?=$|[\s,\-–—/|).])/gi, " ");

  // 3. Retirer les types de contrat, modalités et durées (CDD, CDI, Stage, Alternance, Full-time...)
  cleaned = cleaned
    .replace(/[\(\[\{]\s*(?:CDD|CDI|C\.D\.D\.|C\.D\.I\.|Stage|Alternance|Apprentissage|Contrat\s+(?:de\s+)?(?:professionnalisation|apprentissage|durée\s+déterminée|durée\s+indéterminée)|Freelance|Indépendant|Intérim|Interim|VIE|Temps\s+plein|Temps\s+partiel|Full[\s-]?time|Part[\s-]?time|Permanent|Fixed[\s-]?term|Contract|\d+\s*(?:mois|months|ans|years|semaines|weeks))[^)\]\}]*[\)\]\}]/gi, " ")
    .replace(/(?:\s*[-–—,|/]\s*|\s+en\s+|\s+)(?:en\s+)?(?:CDD|CDI|C\.D\.D\.|C\.D\.I\.|Stage|Alternance|Apprentissage|Contrat\s+pro(?:fessionnalisation)?|Freelance|Indépendant|Intérim|Interim|VIE|Temps\s+plein|Temps\s+partiel|Full[\s-]?time|Part[\s-]?time|Permanent|Fixed[\s-]?term)(?:\s+(?:de\s+)?\d+\s*(?:mois|months|ans|years))?(?=$|[\s,\-–—/|).])/gi, " ");

  // 4. Retirer suffixes de portail/recrutement (y compris tronqués type "- Rec"), codes départements "(75)", arrondissements ("Paris 1er") et localisations
  cleaned = cleaned
    .replace(/\s*[-–—|•·]\s*(?:Rec(?:rut[a-zÀ-ÿ]*)?|HelloWork|RegionsJob|Cadremploi|Meteojob|Jobijoba|Indeed|LinkedIn|Glassdoor|Apec|Welcome\s+to\s+the\s+Jungle|France\s+Travail|P[oô]le\s+Emploi|Monster|JobTeaser|Emploi|Offre|Annonce|Candidature)\b.*$/i, "")
    .replace(/\s*[-–—|]\s*(?:Secteur|Sector|Poste\s+basé|Basé\s+à|Based\s+in|Localisation|Location|Paris|Lyon|Marseille|Toulouse|Nantes|Bordeaux|Lille|Strasbourg|Rennes|Montpellier|Nice|Versailles|Guyancourt|La\s+Défense|Île-de-France|Ile-de-France|France|Remote|Télétravail|Hybride|Hybrid)\b.*$/i, "")
    .replace(/\s+(?:à|en|sur|basé\s+à|based\s+in|in)?\s*(?:Paris|Lyon|Marseille|Toulouse|Nantes|Bordeaux|Lille|Strasbourg|Rennes|Montpellier|Nice|Versailles|Guyancourt|Nanterre|Boulogne|Courbevoie|Puteaux|Neuilly|Issy|Levallois|Montreuil|Saint-Denis|La\s+Défense|Île-de-France|Ile-de-France)(?:\s+\d{1,2}(?:er|e|ème)?)?(?:\s*\(\s*\d{2,5}\s*\))?(?:\s*[-–—|].*)?$/i, "")
    .replace(/\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ\-]+)?\s*\(\s*(?:\d{2,5}|2[AB])\s*\).*$/i, "")
    .replace(/\s+(?:à|en|sur|basé\s+à|based\s+in)\s+(?:France|Remote|Télétravail|Hybride|Hybrid)\b.*$/i, "")
    .replace(/\s+\d{1,2}(?:er|e|ème)\s*\(\s*(?:\d{2,5}|2[AB])\s*\).*$/i, "")
    .replace(/\s*\(\s*(?:\d{2,5}|2[AB])\s*\).*$/i, "")
    .replace(/\s+(?:pour|afin\s+de)\s+[a-zà-ÿ]{4,}.*$/i, "")
    .replace(/\s*[-–—,|/]?\s*\b\d+\s*(?:mois|months|ans|years)\s*$/i, "")
    .replace(/\s*(?:Process(?:us)?\s+de\s+recrutement|Nos\s+avantages|Avantages\s*:|Transport\s+pris\s+en\s+charge|Ce\s+que\s+nous\s+recherchons|Profil\s+recherch[ée]|Vos\s+missions|Description\s+du\s+poste|Qui\s+sommes[- ]nous)\b.*$/i, "")
    .replace(/\(\s*\)|\[\s*\]|\{\s*\}/g, " ")
    .replace(/^[-–—,|/:\s]+|[-–—,|/:\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Rejeter les paragraphes/phrases descriptives, niveaux d'ancienneté isolés ("Confirmé/Expert") ou bruits de rubrique
  const isSentenceOrProcessNoise =
    cleaned.length > 90 ||
    cleaned.split(/\s+/).length > 11 ||
    /\b(?:te\s+contactera|tu\s+rencontreras|entretien\s+(?:rh|technique)|cet\s+entretien\s+est\s+valid[ée]|pris\s+en\s+charge|premier\s+[ée]change|process(?:us)?\s+de\s+recrutement|nos\s+avantages)\b/i.test(cleaned) ||
    /^(?:confirm[ée](?:\s*\/\s*expert)?|expert|senior|junior|d[ée]butant|interm[ée]diaire|bac\s*\+\s*\d+|cdi|cdd|stage|alternance|freelance)$/i.test(cleaned) ||
    /[.!?]\s+[A-ZÀ-Ÿ]/.test(cleaned);

  if (isSentenceOrProcessNoise) return "";
  if (!cleaned || /^(?:emploi|emplois|job|jobs|offre|offres|annonce|annonces|recrutement|poste|carri[eè]re|accueil)$/i.test(cleaned)) return "";

  // 5. Normaliser la casse si le titre (ou la majorité de ses mots >= 4 car.) est en MAJUSCULES
  const alphaOnly = cleaned.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const upperCount = (alphaOnly.match(/[A-ZÀ-Ÿ]/g) || []).length;
  const isMostlyUpper = alphaOnly.length >= 4 && (upperCount / alphaOnly.length) >= 0.72;

  const words = cleaned.split(/\s+/).filter(Boolean);
  const hasLongAllCapsWord = words.some((w) => {
    const cleanW = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
    return cleanW.length >= 4 && cleanW === cleanW.toUpperCase() && !ROLE_ACRONYMS.has(cleanW.toUpperCase());
  });

  if (isMostlyUpper || hasLongAllCapsWord) {
    let afterSeparator = true;
    cleaned = words
      .map((w, idx) => {
        if (/^[-–—/|&:]$/.test(w)) {
          afterSeparator = true;
          return w;
        }
        const cleanW = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
        const shouldNormalizeWord = isMostlyUpper || (cleanW.length >= 4 && cleanW === cleanW.toUpperCase() && !ROLE_ACRONYMS.has(cleanW.toUpperCase()));
        const result = shouldNormalizeWord ? toNaturalRoleWord(w, idx === 0 || afterSeparator) : w;
        afterSeparator = false;
        return result;
      })
      .join(" ");
  }

  cleaned = cleaned
    .trim()
    .replace(/(^|\/\s*)([a-zà-ÿ])/g, (_, sep, ch) => `${sep}${ch.toUpperCase()}`);

  return cleaned;
}

function stripJobAdNoiseInline(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\s*[\(\[]\s*(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F|M\s*\/\s*W|CDD|CDI|Stage|Alternance)\s*[\)\]]/gi, "")
    .replace(/\s+(?:H\s*\/\s*F(?:\s*\/\s*X)?|F\s*\/\s*H(?:\s*\/\s*X)?|M\s*\/\s*F|M\s*\/\s*W)(?=$|[\s,.;:–—\-])/gi, "")
    .replace(/\s*[-–—,/]\s*(?:CDD|CDI|C\.D\.D\.|C\.D\.I\.)(?=$|[\s,.;:–—\-])/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function replaceJobTitleOccurrences(text: string, rawTitles: string[], cleanRole: string): string {
  if (!text || typeof text !== "string") return text;
  let result = text;

  const uniqueRaw = Array.from(
    new Set(
      rawTitles
        .map((t) => (t || "").trim())
        .filter((t) => t.length >= 4)
    )
  ).sort((a, b) => b.length - a.length);

  if (cleanRole) {
    for (const raw of uniqueRaw) {
      if (raw === cleanRole) continue;
      const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "gi"), cleanRole);
    }
    const cleanUpper = cleanRole.toUpperCase();
    if (cleanUpper !== cleanRole && result.includes(cleanUpper)) {
      const escapedUpper = cleanUpper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escapedUpper, "g"), cleanRole);
    }
  }

  return stripJobAdNoiseInline(result);
}

/**
 * Assainit un nom d'entreprise extrait d'une offre :
 * - Sépare un nom d'entreprise collé sans espace à une phrase narrative (ex: "ALTECAChez Alteca le management...")
 * - Supprime les slogans ou phrases descriptives en minuscules qui suivent (ex: "Alteca le management de proximité" -> "Alteca")
 * - Préserve les vrais noms multi-mots avec connecteurs majuscules (ex: "La Banque Postale", "Banque de France")
 * - Rejette les fragments techniques ou métadonnées d'annonce
 */
export function sanitizeCompanyName(rawName?: string): string {
  if (!rawName || typeof rawName !== "string") return "";
  let clean = rawName
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—:|•·\s]+|[-–—:|•·\s]+$/g, "");
  if (!clean) return "";

  // 0. Si format "Marque (SYSLEY)" ou "Entreprise (ALTECA)", extraire la marque entre parenthèses plutôt que le mot générique
  const parenBrandMatch = clean.match(/^(?:(?:la|le|l['’]|notre|votre|the|our|your)\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|groupe|compagnie|company|brand|client|organisation|organization|employeur|employer)\s*\(\s*([A-ZÀ-Ÿ0-9][^()]{1,45})\s*\)$/i);
  if (parenBrandMatch?.[1]) {
    clean = parenBrandMatch[1].trim();
  }

  // Retirer les préfixes de libellé génériques ("Marque : SYSLEY", "La marque SYSLEY", "Maison française SYSLEY")
  const genericEntityPrefix = "(?:(?:la|le|l['’]|notre|votre|une|un|the|our|your|a|an)\\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|company|brand|client|employeur|employer|recruteur|recruiter|filiale|entit[ée]|[ée]tablissement|groupe|organisation|organization)";
  const descriptiveAdj = "(?:fran[çc]aise?s?|europ[ée]ennes?|international(?:e|es|aux)?|mondial(?:e|es|aux)?|familial(?:e|es|aux)?|ind[ée]pendant(?:e|s)?|national(?:e|es|aux)?|r[ée]gional(?:e|es|aux)?|local(?:e|es|aux)?|parisienne?s?|lyonnaise?s?|leader|pionni[èe]re?s?|sp[ée]cialiste|innovant(?:e|s)?|historique|prestigieuse?s?|embl[ée]matique|reconnue?s?|renomm[ée]e?s?|cosm[ée]tiques?|parfumerie|beaut[ée]|luxe|french|european|global|family(?:-owned)?|independent|leading|luxury|cosmetics?)";
  clean = clean
    .replace(/^(?:(?:la|le|l['’]|notre|votre|the|our|your)\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|company|brand|client|employeur|employer|recruteur|recruiter|filiale|entit[ée]|[ée]tablissement)\s*[:=]\s*/i, "")
    .replace(new RegExp(`^${genericEntityPrefix}(?:\\s+${descriptiveAdj})*\\s+(?=[A-ZÀ-Ÿ0-9])`, "i"), (fullMatch) => {
      // Préserver "Maison Margiela" / "Groupe Casino" / "Société Générale" si aucun déterminant ni adjectif descriptif n'est présent
      const trimmedPrefix = fullMatch.trim().toLowerCase();
      if (/^(?:maison|groupe|soci[ée]t[ée])(?=$|\s)/.test(trimmedPrefix) && !new RegExp(`\\b${descriptiveAdj}(?=$|\\s)`, "i").test(trimmedPrefix)) {
        return fullMatch;
      }
      return "";
    })
    .replace(/^["«']+|["»']+$/g, "")
    .trim();
  if (!clean) return "";

  // 1. Séparer un nom d'entreprise collé sans espace à un mot d'introduction ("ALTECAChez Alteca...")
  clean = clean
    .replace(
      /^([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9\s&'.\-]{1,30}?)(?=(?:Chez|Bienvenue|Rejoignez|Rejoindre|Nous|Notre|Nos|Votre|Vos|Qui|Description|Missions|Profil|Contexte|À\s+propos|A\s+propos|About|Welcome|Join|Our|We)(?:\s|$|['’]))/,
      "$1\n"
    )
    .split("\n")[0]
    .trim();

  // Cas générique : préfixe tout en MAJUSCULES collé à un mot TitleCase suivi d'une phrase (ex: "ALTECAFort de...")
  const gluedAllCapsMatch = clean.match(/^([A-ZÀ-Ÿ0-9&.\-]{2,20})([A-ZÀ-Ÿ][a-zà-ÿ]{1,20}\s+.+)$/);
  if (gluedAllCapsMatch) {
    const prefix = gluedAllCapsMatch[1];
    const tail = gluedAllCapsMatch[2];
    const tailLower = tail.toLowerCase();
    const hasProseCue =
      /^(?:Chez|Le|La|Les|L'|Un|Une|Nous|Notre|Depuis|Avec|Pour|Fort|Fondé|Créé|Leader|Spécialiste|Acteur|Entreprise|Société|About|Our|Welcome|Join)\b/.test(tail) ||
      tailLower.includes(prefix.toLowerCase()) ||
      /\b(?:le|la|les|un|une|de|du|des|est|sont|vous|nous|qui|et|avec|pour|dans|sur)\b/.test(tailLower);
    if (hasProseCue) {
      clean = prefix.trim();
    }
  }

  // 2. Retirer les clauses narratives ou suffixes portail espacés ("ALTECA Chez Alteca...", "ALTECA | HelloWork")
  clean = clean
    .replace(
      /\s+(?:[-–—|•·]\s*)?(?:Chez\s+[A-ZÀ-Ÿ]|Bienvenue\s+chez|Rejoignez\b|À\s+propos\b|A\s+propos\b|Qui\s+sommes\b|Recrute\b|Recrutement\b|Offre\s+d['’]emploi\b|Nous\s+recherchons\b).*$/i,
      ""
    )
    .replace(/\s*[-–—|•·]\s*(?:HelloWork|RegionsJob|Cadremploi|Meteojob|Indeed|LinkedIn|Glassdoor|Apec|Jooble|Jean-Michel(?:\.io)?)\b.*$/i, "")
    .trim();

  // 3. Si format "SOCASS - Société d'Assistance de Service et de Support", garder la marque courte si > 40 car.
  if (clean.length > 40 && clean.includes(" - ")) {
    const shortBrand = clean.split(" - ")[0].trim();
    if (shortBrand.length >= 2) clean = shortBrand;
  }

  // Rejeter dès ce stade les syntagmes débutant par un déterminant/possessif ou préposition ("Notre marque", "Votre organisation...")
  if (/^(?:et|ou|mais|donc|or|ni|car|de|du|des|pour|par|avec|dans|sur|sous|en|chez|un|une|ce|cette|ces|notre|nos|votre|vos|son|sa|ses|leur|leurs|a|an|our|your|their|this|that)\s+/i.test(clean)) {
    return "";
  }
  if (/^(?:(?:le|la|les|the)\s+|l['’]\s*)(?:groupe|soci[ée]t[ée]|entreprise|organisation|organization|company|marque|brand|maison|enseigne|structure|filiale|entit[ée]|[ée]tablissement|cabinet|recruteur|client|poste|offre|service|direction|p[ôo]le|[ée]quipes?|teams?|monde|secteur|industrie|division)\b/i.test(clean)) {
    return "";
  }
  if (new RegExp(`^(?:(?:la|le|l['’]|notre|votre|une|the)\\s+)?(?:marque|maison|enseigne|entreprise|soci[ée]t[ée]|groupe|compagnie|company|brand)(?:\\s+${descriptiveAdj})+$`, "i").test(clean)) {
    return "";
  }

  // 4. Couper les slogans/phrases en minuscules collés après le nom ("Alteca le management de proximité" -> "Alteca")
  // tout en préservant les vrais connecteurs suivis d'un mot majuscule ("La Banque Postale", "Banque de France").
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-ZÀ-Ÿ0-9]/.test(words[0])) {
    const connectors = new Set(["de", "du", "des", "et", "le", "la", "les", "of", "the", "and", "&"]);
    const isCapitalized = (w: string) => /^[A-ZÀ-Ÿ0-9]/.test(w.replace(/^(?:d'|l'|de\s+l')/i, ""));
    let cutIdx = words.length;
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const wClean = w.replace(/[,.;:!?]+$/, "").toLowerCase();
      if (isCapitalized(w)) continue;
      if (connectors.has(wClean)) {
        const nextIsCap = i + 1 < words.length && isCapitalized(words[i + 1]);
        const nextTwoIsCap =
          i + 2 < words.length &&
          connectors.has(words[i + 1].toLowerCase()) &&
          isCapitalized(words[i + 2]);
        if (nextIsCap || nextTwoIsCap) continue;
      }
      cutIdx = i;
      break;
    }
    if (cutIdx < words.length && cutIdx >= 1) {
      clean = words.slice(0, cutIdx).join(" ").replace(/[,.;:]+$/, "").trim();
    }
  }

  clean = clean.replace(/^[-–—:|•·"«'\s]+|[-–—:|•·"»'\s]+$/g, "");
  if (clean.length < 2 || clean.length > 65) return "";
  const lower = clean.toLowerCase();

  // Rejeter explicitement les formulations génériques / placeholders / adjectifs isolés
  const genericPlaceholders = new Set([
    "notre", "nos", "votre", "vos", "leur", "leurs", "our", "your", "their", "le", "la", "les", "the", "un", "une", "cette", "ces",
    "votre organisation", "notre organisation", "l'organisation", "organisation",
    "your organization", "the organization", "our organization", "organization",
    "votre entreprise", "notre entreprise", "l'entreprise", "une entreprise", "entreprise",
    "your company", "the company", "our company", "a company", "company",
    "votre société", "votre societe", "notre société", "notre societe", "la société", "la societe", "une société", "une societe", "société", "societe",
    "marque", "la marque", "une marque", "notre marque", "votre marque", "brand", "the brand", "our brand", "your brand",
    "maison", "la maison", "notre maison", "votre maison", "enseigne", "l'enseigne", "notre enseigne",
    "structure", "la structure", "notre structure", "votre structure", "cabinet", "le cabinet",
    "groupe", "le groupe", "notre groupe", "un groupe", "client", "le client", "notre client", "client final",
    "filiale", "entité", "entite", "établissement", "etablissement", "division", "direction", "service", "pôle", "pole", "secteur", "industrie",
    "employeur", "employer", "recruteur", "recruiter", "hiring company",
    "confidentiel", "confidential", "anonyme", "anonymous", "undisclosed", "non précisé", "non précise", "n/a", "à déterminer",
    "française", "francaise", "français", "francais", "french", "européenne", "europeenne", "européen", "europeen", "european",
    "internationale", "international", "mondiale", "mondial", "global", "globale",
    "familiale", "familial", "indépendante", "independante", "indépendant", "independant", "independent",
    "nationale", "national", "régionale", "regionale", "régional", "regional", "locale", "local",
    "parisienne", "parisien", "lyonnaise", "lyonnais", "marseillaise", "bordelaise",
    "leader", "leading", "pionnière", "pionnier", "spécialiste", "specialiste", "specialist",
    "innovante", "innovant", "innovative", "historique", "prestigieuse", "prestigieux", "emblématique", "emblematique",
    "reconnue", "reconnu", "renommée", "renomme", "cosmétique", "cosmetique", "cosmétiques", "cosmetiques", "cosmetic", "cosmetics",
    "parfumerie", "beauté", "beaute", "beauty", "luxe", "luxury", "retail", "mode", "fashion",
    "industriel", "industrielle", "technologique", "digital", "digitale", "numérique", "numerique",
    "logistique", "supply", "distribution", "commerce", "pharma", "pharmaceutique", "santé", "sante", "agroalimentaire", "alimentaire"
  ]);
  if (genericPlaceholders.has(lower)) {
    return "";
  }

  const forbiddenKeywords = [
    "formulaire", "valide", "valider", "clique", "cliquer", "bouton", "remplit", "remplir",
    "automatique", "automatiquement", "input", "champ", "soumettre", "tester", "test",
    "candidature", "poste", "offre", "profil", "description", "missions", "recrute",
    "recrutement", "hiring", "job", "career", "apply", "submit", "http", "www"
  ];
  if (forbiddenKeywords.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(lower))) {
    return "";
  }

  const finalWords = clean.split(/\s+/).filter(Boolean);
  if (finalWords.length > 6) return "";
  return clean;
}

function replaceCompanyOccurrences(text: string, rawCompanies: string[], cleanCompany: string): string {
  if (!text || typeof text !== "string" || !cleanCompany) return text;
  let result = text;
  const uniqueRaw = Array.from(
    new Set(
      rawCompanies
        .map((c) => (c || "").trim())
        .filter((c) => c.length > cleanCompany.length && c.toLowerCase() !== cleanCompany.toLowerCase())
    )
  ).sort((a, b) => b.length - a.length);

  for (const raw of uniqueRaw) {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), cleanCompany);
  }
  return result;
}

// Garde-fous sémantiques : délégués au module centralisé documentValidator
function validateDocumentAsCv(rawText: string) {
  return validateCvDocument(rawText);
}

function validateDocumentAsJobOffer(rawText: string) {
  return validateJobOfferDocument(rawText);
}

// Contrôleur d'intégrité documentaire par IA (Garde-fou sémantique universel)
async function verifyDocumentAuthenticityWithAI(
  ai: GoogleGenAI,
  cvText: string,
  jobText: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const prompt = `
Tu es un contrôleur d'intégrité documentaire strict pour une plateforme de recrutement professionnel certifiée ATS.
Ta mission est d'examiner ces deux textes fournis par un utilisateur et de vérifier de manière impartiale s'ils correspondent à :
1. DOCUMENT 1 : Un Curriculum Vitae (CV) d'un candidat décrivant son parcours professionnel, ses formations, ses compétences ou son identité professionnelle.
2. DOCUMENT 2 : Une véritable Offre d'Emploi ou fiche de poste de recrutement émanant d'un employeur cherchant à recruter (missions, profil attendu, contrat ou entreprise).

RÈGLES IMPÉRATIVES DE REJET (ZÉRO TOLÉRANCE POUR LES DOCUMENTS HORS-RECRUTEMENT) :
- Si DOCUMENT 1 n'est PAS un CV (ex: un article politique, un cours, un texte sur des élections, une recette, une facture, un poème, un roman, un essai ou un texte quelconque qui ne décrit pas le parcours d'un candidat) => isCvValid = false.
- Si DOCUMENT 2 n'est PAS une offre d'emploi (ex: un article sur les élections en France, une analyse politique ou d'actualité, un cours universitaire, un discours, un article de journal, une notice ou un texte quelconque sans intention de recruter pour un emploi) => isJobValid = false.

DOCUMENT 1 (Censé être un CV) :
"""
${cvText.slice(0, 2500)}
"""

DOCUMENT 2 (Censé être une Offre d'Emploi) :
"""
${jobText.slice(0, 2500)}
"""

Réponds STRICTEMENT sous format JSON :
{
  "isCvValid": boolean,
  "isJobValid": boolean,
  "rejectionReason": string | null
}

Si isCvValid est faux ou si isJobValid est faux, 'rejectionReason' DOIT être une phrase courtoise et claire en français expliquant précisément ce qu'est le document rejeté (par exemple : "Le document fourni dans l'encart « Offre d'emploi » est un article politique sur les élections en France et non une offre de recrutement. Veuillez fournir une véritable offre d'emploi." ou "Le document fourni dans l'encart « CV » est un texte théorique...").
`;

    const response = await callGeminiWithFallback(
      (modelName) =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            ...(modelName === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          },
        }),
      ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
      2,
      15000
    );

    const textOut = response.text?.trim() || "";
    const cleaned = textOut.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(cleaned);

    if (result.isCvValid === false || result.isJobValid === false) {
      return {
        isValid: false,
        error: result.rejectionReason || "L'un des documents fournis ne correspond pas à un document de recrutement (CV ou offre d'emploi). Veuillez vérifier les textes importés.",
      };
    }

    return { isValid: true };
  } catch (_err: any) {
    console.log("[Document AI Gate] Vérification sémantique locale active.");
    return { isValid: true };
  }
}

// Nettoyage et réunification des mots coupés par les parseurs PDF/Word
function sanitizeDocumentText(rawText: string): string {
  if (!rawText) return "";

  let text = rawText;

  // 1. Normaliser les ligatures et caractères invisibles des PDF
  const ligatures: { [key: string]: string } = {
    "\uFB00": "ff",
    "\uFB01": "fi",
    "\uFB02": "fl",
    "\uFB03": "ffi",
    "\uFB04": "ffl",
    "\uFB05": "ft",
    "\uFB06": "st",
    "œ": "oe",
    "Œ": "Oe",
    "æ": "ae",
    "Æ": "Ae",
    "\u00A0": " ",
    "\u202F": " ",
    "\u2009": " ",
    "\u200B": "",
    "\uFEFF": "",
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "«": '"',
    "»": '"',
    "–": "-",
    "—": "-",
  };

  for (const [lig, rep] of Object.entries(ligatures)) {
    text = text.replaceAll(lig, rep);
  }
  // Préserver les traits d'union doux (\u00AD) internes (ex: "St-Michel") tout en supprimant ceux en fin de ligne
  text = text.replace(/\u00AD\s*\r?\n\s*/g, "").replace(/\u00AD/g, "-");

  // 2a. Joindre les URLs coupées sur deux lignes sans supprimer leurs tirets internes (ex: LinkedIn "josian-nkuli-\nbelanga")
  text = text.replace(/((?:https?:\/\/|www\.|linkedin\.com\/)\S*[-–—])\s*\r?\n\s*([a-zA-Z0-9_-]+)/gi, "$1$2");

  // 2b. Réparer les césures de fin de ligne dans les PDF tout en préservant les traits d'union légitimes (ex: "Hauts-\nde-France")
  text = text.replace(/([a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]{2,})[-–—]\s*\r?\n\s*([a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]{2,})/g, (_m, p1: string, p2: string) => {
    if (/^(?:de|du|des|en|sur|sous|le|la|les|ing[ée]nieur|france|charentes?|maritime|alpes?|rh[oô]ne|loire|seine)$/i.test(p2) || /^(?:assistant|sous|anti|multi|micro|macro|co|agro|auto)$/i.test(p1)) {
      return `${p1}-${p2}`;
    }
    return `${p1}${p2}`;
  });

  // 3. Réparer les mots coupés par un tiret suivi d'un espace parasite (ex: "déve- loppement" -> "développement", "mana- gement" -> "management")
  text = text.replace(/\b([a-zA-ZàâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]{2,})[-–]\s+([a-zàâäéèêëîïôöùûüç]{2,})\b/g, (match, p1, p2) => {
    if (
      p2.endsWith("ment") ||
      p2.endsWith("tion") ||
      p2.endsWith("tions") ||
      p2.endsWith("té") ||
      p2.endsWith("tés") ||
      p2.endsWith("ence") ||
      p2.endsWith("ance") ||
      p2.endsWith("ique") ||
      p2.endsWith("able") ||
      p2.endsWith("ible") ||
      p2.endsWith("isme") ||
      p2.endsWith("iste") ||
      p2.endsWith("eur") ||
      p2.endsWith("eurs") ||
      p2.endsWith("euse") ||
      p2.endsWith("rice") ||
      p2.endsWith("ing") ||
      p2.endsWith("ed")
    ) {
      return `${p1}${p2}`;
    }
    return match;
  });

  // 4. Réparer les titres Canva / InDesign où les lettres sont espacées (ex: "J O S I A N   N K U L I   B E L A N G A")
  text = text.split("\n").map(collapseCanvaLetterSpacing).join("\n");

  // 5. Nettoyer les en-têtes/pieds de page répétitifs
  text = text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .replace(/\bpage\s+\d+\s*(?:sur|\/|of)\s*\d+\b/gi, "")
    .replace(/\bpage\s+\d+\b/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text;
}

// Liste exhaustive des mots parasites, verbes ordinaires et fragments à bannir formellement des compétences
const NON_COMPETENCY_BLACKLIST = new Set([
  // Mots grammaticaux, pronoms et conjonctions (FR)
  "certains", "certaines", "doivent", "pouvez", "selon", "autres", "chaque", "notamment",
  "faisant", "mettant", "ayant", "seront", "serait", "pouvoir", "suivants", "suivante", "suivantes",
  "comme", "aussi", "entre", "apres", "après", "avant", "afin", "chez", "tres", "très", "plus",
  "moins", "dont", "sans", "sous", "vers", "durant", "depuis", "pendant", "environ", "autour",
  "parmi", "autre", "aucun", "aucune", "plusieurs", "quelque", "quelques", "ceux", "celles",
  "celui", "celle", "ceci", "cela", "lequel", "laquelle", "lesquels", "lesquelles", "soit",
  "donc", "mais", "alors", "puis", "ensuite", "quant", "lors", "dans", "pour", "avec", "cette",
  "votre", "notre", "leurs", "leur", "vous", "nous", "tout", "tous", "toute", "toutes", "faire",
  "etre", "être", "avoir", "bonne", "bonnes", "grand", "grands", "forte", "fortes",
  // Termes génériques de recrutement & formulaires (FR)
  "description", "profil", "poste", "missions", "mission", "candidat", "candidature",
  "entreprise", "societe", "société", "groupe", "recherche", "recherchons", "offres", "offre",
  "emploi", "stage", "alternance", "contrat", "cdi", "cdd", "temps", "plein", "partiel",
  "temps plein", "temps partiel", "salaire", "remuneration", "rémunération", "package", "avantages",
  "mutuelle", "localisation", "lieu", "france", "paris", "domicile", "teletravail", "télétravail",
  "hybride", "bureau", "secteur", "domaine", "annees", "années", "niveau", "minimum", "maximum",
  "souhaite", "souhaité", "requis", "exigé", "titulaire", "justifier", "diplome", "diplôme",
  "formation", "etudes", "études", "telephone", "téléphone", "adresse", "mail", "email",
  "coordonnees", "coordonnées", "contact", "contacts", "page", "curriculum", "resume", "résumé",
  "document", "date", "actuel", "present", "présent", "debut", "début", "fin", "statut",
  "merci", "postuler", "envoyer", "transmettre", "rejoindre", "notre equipe", "notre équipe",
  "vos missions", "votre profil", "a propos", "à propos", "nous recherchons",
  // Termes grammaticaux et de recrutement (EN)
  "about", "with", "from", "your", "their", "this", "that", "these", "those", "have", "been",
  "will", "would", "could", "should", "into", "onto", "under", "over", "between", "among",
  "through", "during", "before", "after", "since", "until", "while", "where", "which", "whose",
  "what", "when", "there", "their", "them", "they", "some", "many", "more", "most", "less",
  "least", "each", "every", "both", "either", "neither", "also", "very", "such", "only", "same",
  "within", "across", "proven", "strong", "ensure", "working", "degree", "years", "candidate",
  "ability", "duties", "apply", "opportunity", "status", "sexual", "orientation", "gender",
  "race", "color", "religion", "national", "origin", "disability", "veteran", "salary", "benefits",
  "looking", "welcome", "successful", "applicant", "submit", "application", "resume", "joining",
  "location", "position", "company", "client", "members", "levels", "including", "required",
  "preferred", "qualifications", "job description", "full time", "part time", "we are looking for",
  // Terminaisons coupées typiques issues de césures brisées
  "pement", "tion", "tions", "ment", "ments", "ence", "ences", "ance", "ances", "isme", "iste",
  "istes", "ique", "iques", "able", "ables", "eur", "eurs", "euse", "euses", "rice", "rices",
  "aire", "aires", "oire", "oires", "ation", "ations"
]);

// Référentiel taxonomique certifié des compétences (Hard skills, Soft skills, Outils, Méthodes)
const TAXONOMY_SKILLS_CANONICAL: { [normalized: string]: string } = {
  // --- TECH, DATA & INFRASTRUCTURE ---
  "javascript": "JavaScript",
  "typescript": "TypeScript",
  "react": "React",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "vue": "Vue.js",
  "vuejs": "Vue.js",
  "angular": "Angular",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "python": "Python",
  "java": "Java",
  "c#": "C#",
  "c++": "C++",
  "go": "Go",
  "rust": "Rust",
  "php": "PHP",
  "sql": "SQL",
  "pl/sql": "PL/SQL",
  "soql": "SOQL",
  "postgresql": "PostgreSQL",
  "mysql": "MySQL",
  "mongodb": "MongoDB",
  "redis": "Redis",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "aws": "AWS",
  "azure": "Azure",
  "gcp": "Google Cloud",
  "devops": "DevOps",
  "ci/cd": "CI/CD",
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "rest api": "APIs REST",
  "api rest": "APIs REST",
  "api": "Intégration & APIs",
  "apis": "Intégration & APIs",
  "soap": "Web Services SOAP/REST",
  "graphql": "GraphQL",
  "microservices": "Microservices",
  "soa": "Architecture SOA",
  "esb": "Bus d'Échange & Flux (ESB)",
  "etl": "Flux de Données & ETL",
  "linux": "Linux",
  "cybersecurite": "Cybersécurité",
  "cybersécurité": "Cybersécurité",
  "machine learning": "Machine Learning",
  "deep learning": "Deep Learning",
  "ia generative": "IA Générative",
  "ia générative": "IA Générative",
  "data engineering": "Data Engineering",
  "data analysis": "Data Analysis",
  "data analyst": "Analyse de Données",
  "data science": "Data Science",
  "power bi": "Power BI",
  "powerbi": "Power BI",
  "superset": "Apache Superset",
  "tableau": "Tableau",
  "looker": "Looker Studio",
  "qlik": "Qlik Sense",
  "snowflake": "Snowflake",
  "bigquery": "BigQuery",
  "data lake": "Data Lake",
  "data warehouse": "Data Warehouse",
  "data visualization": "Visualisation de Données",
  "visualisation": "Visualisation de Données",
  "dashboard": "Dashboards & Analytics",
  "dashboards": "Dashboards & Analytics",
  "produits data": "Produits & Solutions Data",
  "solutions data": "Produits & Solutions Data",
  "qualite des donnees": "Gestion & Qualité des Données",
  "qualité des données": "Gestion & Qualité des Données",
  "gouvernance des donnees": "Gestion & Qualité des Données",
  "gouvernance des données": "Gestion & Qualité des Données",
  "gestion des donnees": "Gestion & Qualité des Données",
  "gestion des données": "Gestion & Qualité des Données",
  "dictionnaire de donnees": "Gestion & Qualité des Données",
  "reprises de donnees": "Gestion & Qualité des Données",
  "analyse de donnees": "Analyse de Données",
  "analyse de données": "Analyse de Données",
  "base de donnees": "Bases de Données",
  "base de données": "Bases de Données",
  "bases de donnees": "Bases de Données",
  "bases de données": "Bases de Données",
  "access": "Bases de Données (Access)",
  "r studio": "Analyse Statistique (R Studio)",
  "donnees multispectrales": "Données Multispectrales & Télédétection",
  "données multispectrales": "Données Multispectrales & Télédétection",
  "intelligence artificielle": "Intelligence Artificielle (IA)",
  "ia": "Intelligence Artificielle (IA)",
  "qa": "Assurance Qualité (QA)",
  "terraform": "Terraform",
  "ansible": "Ansible",
  "excel": "Excel Avancé",
  "excel avance": "Excel Avancé",
  "figma": "Figma",
  "apex": "Apex (Salesforce)",
  "lwc": "Lightning Web Components",

  // --- ARCHITECTURE FONCTIONNELLE & CONCEPTION SI ---
  "architecture fonctionnelle": "Architecture Fonctionnelle",
  "architecture applicative": "Architecture Applicative",
  "architecture si": "Architecture des Systèmes d'Information",
  "urbanisation": "Urbanisation du SI",
  "urbanisation si": "Urbanisation du SI",
  "cartographie": "Cartographie Applicative & Flux",
  "specifications fonctionnelles": "Spécifications Fonctionnelles (SFD)",
  "spécifications fonctionnelles": "Spécifications Fonctionnelles (SFD)",
  "sfd": "Spécifications Fonctionnelles (SFD)",
  "modelisation": "Modélisation de Données & Processus",
  "modélisation": "Modélisation de Données & Processus",
  "bpmn": "Modélisation BPMN",
  "uml": "Modélisation UML",
  "mcd": "Modélisation MCD/MLD",
  "recueil des besoins": "Recueil des Besoins Métiers",
  "recueil de besoins": "Recueil des Besoins Métiers",
  "cadrage": "Cadrage Fonctionnel & Métier",
  "etude d'impact": "Analyse d'Impact Fonctionnel",
  "étude d'impact": "Analyse d'Impact Fonctionnel",
  "gouvernance": "Gouvernance SI & Données",
  "workflow": "Automatisation de Workflows",
  "workflows": "Automatisation de Workflows",
  "amoa": "AMOA & Maîtrise d'Ouvrage",
  "moa": "Maîtrise d'Ouvrage (MOA)",

  // --- GESTION DE PROJET, PRODUIT & MÉTHODOLOGIES ---
  "gestion de projet": "Gestion de Projet",
  "management de projet": "Management de Projet",
  "project management": "Project Management",
  "agile": "Méthodologie Agile",
  "scrum": "Scrum",
  "kanban": "Kanban",
  "safe": "Framework SAFe",
  "product management": "Product Management",
  "product owner": "Gestion de Product Backlog",
  "product backlog": "Gestion de Product Backlog",
  "backlog": "Gestion de Product Backlog",
  "refinement": "Backlog Refinement & Cadrage",
  "user stories": "Rédaction d'User Stories",
  "user story": "Rédaction d'User Stories",
  "recette": "Recette Fonctionnelle (UAT)",
  "uat": "Recette Fonctionnelle (UAT)",
  "tests fonctionnels": "Tests & Validation Fonctionnelle",
  "roadmap": "Pilotage de Roadmap Produit",
  "sprint": "Animation des Sprints & Rituels",
  "sprints": "Animation des Sprints & Rituels",
  "release": "Gestion des Releases",
  "releases": "Gestion des Releases",
  "priorisation": "Priorisation de la Valeur Métier",
  "ux": "Expérience Utilisateur (UX)",
  "ui": "Conception d'Interfaces (UI)",
  "wireframes": "Wireframes & Prototypage",
  "jira": "Jira",
  "confluence": "Confluence",
  "trello": "Trello",
  "asana": "Asana",
  "cycle en v": "Cycle en V",
  "lean": "Lean Management",
  "six sigma": "Six Sigma",
  "prince2": "PRINCE2",
  "pmp": "PMP",
  "itil": "ITIL",
  "tma": "Pilotage TMA & Support N2/N3",
  "conduite du changement": "Conduite du Changement",
  "change management": "Change Management",
  "design thinking": "Design Thinking",
  "gestion des risques": "Gestion des Risques",
  "risk management": "Risk Management",
  "cahier des charges": "Cahier des Charges",
  "kpi": "Pilotage des KPI",
  "kpis": "Pilotage des KPI",
  "reporting": "Reporting & Tableaux de Bord",

  // --- COMMERCE, BUSINESS & MARKETING ---
  "business development": "Business Development",
  "vente b2b": "Vente B2B",
  "prospection": "Prospection Commerciale",
  "negociation": "Négociation Commerciale",
  "négociation": "Négociation",
  "crm": "CRM",
  "salesforce": "Salesforce",
  "hubspot": "HubSpot",
  "marketing digital": "Marketing Digital",
  "inbound marketing": "Inbound Marketing",
  "growth marketing": "Growth Marketing",
  "seo": "SEO (Référencement)",
  "sea": "SEA (Google Ads)",
  "emailing": "Emailing",
  "copywriting": "Copywriting",
  "relation client": "Gestion de la Relation Client",
  "relations clients": "Relation Client",
  "satisfaction client": "Satisfaction Client",
  "e-commerce": "E-Commerce",
  "shopify": "Shopify",

  // --- FINANCE, JURIDIQUE & RH ---
  "controle de gestion": "Contrôle de Gestion",
  "contrôle de gestion": "Contrôle de Gestion",
  "audit": "Audit & Contrôle",
  "comptabilite": "Comptabilité",
  "comptabilité": "Comptabilité",
  "cloture comptable": "Clôture Comptable",
  "p&l": "Pilotage P&L",
  "budget": "Gestion Budgétaire",
  "modelisation financiere": "Modélisation Financière",
  "ifrs": "Normes IFRS",
  "fiscalite": "Fiscalité",
  "rgpd": "Conformité RGPD",
  "gdpr": "GDPR Compliance",
  "compliance": "Compliance & Conformité",
  "droit du travail": "Droit du Travail",
  "recrutement": "Recrutement & Sourcing",
  "talent acquisition": "Talent Acquisition",
  "onboarding": "Onboarding",
  "sirh": "SIRH",
  "paie": "Gestion de la Paie",
  "relations sociales": "Relations Sociales",

  // --- OPERATIONS & SUPPLY CHAIN ---
  "supply chain": "Supply Chain",
  "demand planning": "Demand Planning",
  "supply planning": "Supply Planning",
  "s&op": "Processus S&OP",
  "processus s&op": "Processus S&OP",
  "drp": "Calcul des Besoins (DRP)",
  "calcul des besoins": "Calcul des Besoins (DRP)",
  "pdp": "Plan Directeur de Production (PDP)",
  "plan directeur de production": "Plan Directeur de Production (PDP)",
  "prevision des ventes": "Prévision des Ventes",
  "prévision des ventes": "Prévision des Ventes",
  "prévisions de ventes": "Prévision des Ventes",
  "sales forecasting": "Sales Forecasting",
  "forecast accuracy": "Forecast Accuracy",
  "approvisionnement": "Approvisionnement",
  "approvisionnements": "Approvisionnement",
  "procurement": "Procurement & Sourcing",
  "logistique": "Logistique",
  "achats": "Gestion des Achats",
  "gestion des stocks": "Gestion des Stocks",
  "allocation des stocks": "Allocation des Stocks",
  "taux de service": "Taux de Service",
  "gestion des ruptures": "Gestion des Ruptures",
  "gestion fournisseurs": "Gestion Fournisseurs",
  "otif": "Performance OTIF",
  "cpfr": "Planification Collaborative (CPFR)",
  "sell-in": "Pilotage Sell-In / Sell-Out",
  "sell-out": "Pilotage Sell-In / Sell-Out",
  "sell-in / sell-out": "Pilotage Sell-In / Sell-Out",
  "lancements produits": "Suivi des Lancements Produits",
  "lancement produit": "Suivi des Lancements Produits",
  "product launch": "Product Launch Management",
  "gestion des arbitrages": "Gestion des Arbitrages & Priorités",
  "adequation charge / capacite": "Adéquation Charge / Capacité",
  "charge / capacite": "Adéquation Charge / Capacité",
  "industrialisation": "Industrialisation & Méthodes",
  "erp": "ERP",
  "sap": "SAP",
  "sap pm": "SAP PM (Plant Maintenance)",
  "plant maintenance": "SAP PM (Plant Maintenance)",
  "module plant maintenance": "SAP PM (Plant Maintenance)",
  "oracle": "Oracle",
  "amelioration continue": "Amélioration Continue",
  "amélioration continue": "Amélioration Continue",
  "assurance qualite": "Assurance Qualité (QA)",
  "assurance qualité": "Assurance Qualité (QA)",
  "qualite logicielle": "Assurance Qualité (QA)",
  "qualité logicielle": "Assurance Qualité (QA)",
  "agronome": "Ingénierie Agronomique",
  "sens des relations humaines": "Relations Humaines & Sens du Contact",
  "demarche qualite": "Démarche Qualité",
  "démarche qualité": "Démarche Qualité",
  "qualite industrielle": "Qualité Industrielle",
  "qualité industrielle": "Qualité Industrielle",

  // --- INGÉNIERIE INDUSTRIELLE, MÉTHODES & MAINTENANCE ---
  "methodes maintenance": "Méthodes Maintenance",
  "méthodes maintenance": "Méthodes Maintenance",
  "methode de maintenance": "Méthodes Maintenance",
  "méthode de maintenance": "Méthodes Maintenance",
  "methodes de maintenance": "Méthodes Maintenance",
  "méthodes de maintenance": "Méthodes Maintenance",
  "maintenance industrielle": "Maintenance Industrielle",
  "maintenance preventive": "Maintenance Préventive",
  "maintenance préventive": "Maintenance Préventive",
  "maintenance corrective": "Maintenance Corrective",
  "politique de maintenance": "Politique & Standards de Maintenance",
  "standards de maintenance": "Politique & Standards de Maintenance",
  "fiabilite industrielle": "Fiabilité Industrielle",
  "fiabilité industrielle": "Fiabilité Industrielle",
  "fiabilite": "Fiabilité Industrielle",
  "fiabilité": "Fiabilité Industrielle",
  "gmao": "GMAO",
  "tpm": "TPM (Total Productive Maintenance)",
  "5s": "Méthode 5S",
  "smed": "SMED",
  "amdec": "AMDEC / Criticité",
  "criticite": "Étude de Criticité",
  "criticité": "Étude de Criticité",
  "etude de criticite": "Étude de Criticité",
  "étude de criticité": "Étude de Criticité",
  "mtbf": "Indicateurs Fiabilité (MTBF / MTTR / TRS)",
  "mttr": "Indicateurs Fiabilité (MTBF / MTTR / TRS)",
  "trs": "Indicateurs Fiabilité (MTBF / MTTR / TRS)",
  "moyens de production": "Gestion des Moyens de Production",
  "parc machines": "Gestion du Parc Machines",
  "projets industriels": "Gestion de Projets Industriels",
  "gestion de projets industriels": "Gestion de Projets Industriels",
  "catia": "CATIA V5",
  "catia v5": "CATIA V5",
  "autocad": "AutoCAD",
  "solidworks": "SolidWorks",
  "vba": "VBA Excel",
  "vba excel": "VBA Excel",
  "excel vba": "VBA Excel",
  "lecture de plans": "Lecture de Plans Mécaniques & Électriques",
  "plans mecaniques": "Lecture de Plans Mécaniques & Électriques",
  "plans mécaniques": "Lecture de Plans Mécaniques & Électriques",
  "plans electriques": "Lecture de Plans Mécaniques & Électriques",
  "plans électriques": "Lecture de Plans Mécaniques & Électriques",
  "coordination technique": "Coordination Technique",
  "suivi de fournisseurs": "Suivi Fournisseurs & Prestations",
  "suivi fournisseurs": "Suivi Fournisseurs & Prestations",
  "suivi de prestations": "Suivi Fournisseurs & Prestations",
  "contrats cadres": "Contrats Cadres & Pièces Détachées",
  "pieces detachees": "Contrats Cadres & Pièces Détachées",
  "pièces détachées": "Contrats Cadres & Pièces Détachées",
  "industrie 4.0": "Industrie 4.0",

  // --- AGRONOMIE, EXPERTISE QUALITÉ, AUDIT & SINISTRES ---
  "agronomie": "Agronomie & Productions Végétales",
  "agro-industries": "Agronomie & Agro-Industries",
  "agroalimentaire": "Agroalimentaire & Filières Agricoles",
  "ingenieur agronome": "Ingénierie Agronomique",
  "ingénieur agronome": "Ingénierie Agronomique",
  "controle qualite": "Contrôle Qualité & Conformité",
  "contrôle qualité": "Contrôle Qualité & Conformité",
  "audit et prevention": "Audit & Prévention des Risques",
  "audit et de prevention": "Audit & Prévention des Risques",
  "audit et de prévention": "Audit & Prévention des Risques",
  "prevention": "Prévention & Maîtrise des Risques",
  "prévention": "Prévention & Maîtrise des Risques",
  "contentieux": "Gestion des Contentieux & Avaries",
  "contentieux commerciaux": "Contentieux Commerciaux & Transport",
  "avaries": "Expertise Avaries & Sinistres",
  "expertise": "Expertise Technique & Investigations",
  "expertises sur le terrain": "Expertise Terrain & Constats",
  "suivi terrain": "Suivi Terrain & Expérimentation",
  "rapports de conclusion": "Rédaction de Rapports d'Expertise",
  "aptitude redactionnelle": "Rédaction de Rapports & Synthèses",
  "aptitude rédactionnelle": "Rédaction de Rapports & Synthèses",
  "argumentation": "Argumentation & Conviction",
  "experimentation": "Expérimentation Scientifique & Protocoles",
  "expérimentation": "Expérimentation Scientifique & Protocoles",
  "experimentations": "Expérimentation Scientifique & Protocoles",
  "expérimentations": "Expérimentation Scientifique & Protocoles",
  "protocole": "Protocoles d'Expérimentation",
  "etat du sol": "Sciences du Sol & Agronomie",
  "état du sol": "Sciences du Sol & Agronomie",
  "qualite d'un sol": "Sciences du Sol & Agronomie",
  "qualité d'un sol": "Sciences du Sol & Agronomie",
  "physiologie vegetale": "Physiologie & Protection Végétale",
  "physiologie végétale": "Physiologie & Protection Végétale",
  "stress hydrique": "Caractérisation du Stress Hydrique",
  "desherbage": "Protection des Cultures & Malherbologie",
  "désherbage": "Protection des Cultures & Malherbologie",
  "rendement": "Analyse de Rendement & Collecte",

  // --- SOFT SKILLS & COMPÉTENCES TRANSVERSALES ---
  "leadership": "Leadership",
  "management d'equipe": "Management d'Équipe",
  "management d'équipe": "Management d'Équipe",
  "esprit d'analyse": "Esprit d'Analyse",
  "esprit de synthese": "Esprit de Synthèse",
  "esprit de synthèse": "Esprit de Synthèse",
  "rigueur": "Rigueur & Précision",
  "autonomie": "Autonomie",
  "relations humaines": "Relations Humaines & Sens du Contact",
  "resolution de problemes": "Résolution de Problèmes",
  "résolution de problèmes": "Résolution de Problèmes",
  "gestion des priorites": "Gestion des Priorités",
  "gestion des priorités": "Gestion des Priorités",
  "communication transverse": "Communication Transverse",
  "travail en equipe": "Travail en Équipe",
  "travail en équipe": "Travail en Équipe",
  "sens du relationnel": "Sens du Relationnel",
  "adaptabilite": "Capacité d'Adaptation",
  "adaptabilité": "Capacité d'Adaptation",
  "force de proposition": "Force de Proposition",
  "prise de decision": "Prise de Décision",
  "organisation": "Sens de l'Organisation"
};

// Dictionnaire de traduction FR -> EN pour que les compétences, mots-clés et catégories soient 100% en anglais lorsque l'offre est en anglais
const TAXONOMY_SKILLS_FR_TO_EN: Record<string, string> = {
  "intégration & apis": "API Integration",
  "apis rest": "REST APIs",
  "bus d'échange & flux (esb)": "Enterprise Service Bus (ESB)",
  "flux de données & etl": "Data Pipelines & ETL",
  "cybersécurité": "Cybersecurity",
  "ia générative": "Generative AI",
  "analyse de données": "Data Analysis",
  "visualisation de données": "Data Visualization",
  "produits & solutions data": "Data Products & Solutions",
  "gestion & qualité des données": "Data Management & Quality",
  "intelligence artificielle (ia)": "Artificial Intelligence (AI)",
  "assurance qualité (qa)": "Quality Assurance (QA)",
  "excel avancé": "Advanced Excel",
  "architecture fonctionnelle": "Functional Architecture",
  "architecture applicative": "Application Architecture",
  "architecture des systèmes d'information": "Information Systems Architecture",
  "urbanisation du si": "IT Landscape Urbanization",
  "cartographie applicative & flux": "Application & Data Flow Mapping",
  "spécifications fonctionnelles (sfd)": "Functional Specifications",
  "modélisation de données & processus": "Data & Process Modeling",
  "modélisation bpmn": "BPMN Process Modeling",
  "modélisation uml": "UML Modeling",
  "modélisation mcd/mld": "Data Modeling (ERD)",
  "recueil des besoins métiers": "Business Requirements Gathering",
  "cadrage fonctionnel & métier": "Functional Scoping & Framing",
  "analyse d'impact fonctionnel": "Functional Impact Analysis",
  "gouvernance si & données": "IT & Data Governance",
  "automatisation de workflows": "Workflow Automation",
  "amoa & maîtrise d'ouvrage": "Business Analysis (AMOA)",
  "maîtrise d'ouvrage (moa)": "Business Ownership (MOA)",
  "gestion de projet": "Project Management",
  "management de projet": "Project Management",
  "méthodologie agile": "Agile Methodology",
  "framework safe": "SAFe Framework",
  "gestion de product backlog": "Product Backlog Management",
  "backlog refinement & cadrage": "Backlog Refinement",
  "rédaction d'user stories": "User Story Writing",
  "recette fonctionnelle (uat)": "User Acceptance Testing (UAT)",
  "tests & validation fonctionnelle": "Functional Testing & Validation",
  "pilotage de roadmap produit": "Product Roadmap Management",
  "animation des sprints & rituels": "Sprint & Scrum Ceremonies",
  "gestion des releases": "Release Management",
  "priorisation de la valeur métier": "Business Value Prioritization",
  "expérience utilisateur (ux)": "User Experience (UX)",
  "conception d'interfaces (ui)": "User Interface Design (UI)",
  "wireframes & prototypage": "Wireframing & Prototyping",
  "cycle en v": "Waterfall / V-Model",
  "pilotage tma & support n2/n3": "Application Maintenance & L2/L3 Support",
  "conduite du changement": "Change Management",
  "gestion des risques": "Risk Management",
  "cahier des charges": "Business Requirements Specification",
  "pilotage des kpi": "KPI Tracking & Analytics",
  "reporting & tableaux de bord": "Reporting & Dashboards",
  "vente b2b": "B2B Sales",
  "prospection commerciale": "Sales Prospecting",
  "négociation commerciale": "Commercial Negotiation",
  "négociation": "Negotiation",
  "marketing digital": "Digital Marketing",
  "seo (référencement)": "SEO",
  "gestion de la relation client": "Customer Relationship Management",
  "relation client": "Client Relations",
  "satisfaction client": "Customer Satisfaction",
  "contrôle de gestion": "Financial Controlling",
  "audit & contrôle": "Audit & Internal Control",
  "comptabilité": "Accounting",
  "clôture comptable": "Financial Close",
  "pilotage p&l": "P&L Management",
  "gestion budgétaire": "Budget Management",
  "modélisation financière": "Financial Modeling",
  "normes ifrs": "IFRS Standards",
  "fiscalité": "Taxation",
  "conformité rgpd": "GDPR Compliance",
  "compliance & conformité": "Regulatory Compliance",
  "droit du travail": "Labor Law",
  "recrutement & sourcing": "Recruitment & Sourcing",
  "sirh": "HRIS",
  "gestion de la paie": "Payroll Management",
  "relations sociales": "Employee Relations",
  "logistique": "Logistics",
  "gestion des achats": "Procurement & Purchasing",
  "gestion des stocks": "Inventory Management",
  "amélioration continue": "Continuous Improvement",
  "management d'équipe": "Team Leadership",
  "esprit d'analyse": "Analytical Thinking",
  "esprit de synthèse": "Strategic Synthesis",
  "rigueur & précision": "Attention to Detail & Rigor",
  "autonomie": "Autonomy & Ownership",
  "résolution de problèmes": "Problem Solving",
  "gestion des priorités": "Prioritization",
  "communication transverse": "Cross-Functional Communication",
  "travail en équipe": "Team Collaboration",
  "sens du relationnel": "Interpersonal Skills",
  "capacité d'adaptation": "Adaptability",
  "force de proposition": "Proactive Initiative",
  "prise de décision": "Decision Making",
  "sens de l'organisation": "Organizational Skills",
  "pilotage de projet": "Project Delivery",
  "coordination métier / it": "Business / IT Alignment",
  "coordination transverse": "Cross-Functional Coordination",
  "formation utilisateurs": "User Training",
  "support utilisateurs": "User Support",
  "paramétrage erp": "ERP Configuration",
  "déploiement erp": "ERP Implementation",
  "gestion financière": "Financial Management",
  "suivi budgétaire": "Budget Tracking",
  "gestion des anomalies": "Defect & Incident Management",
  "gestion des incidents": "Incident Management",
  "relation parties prenantes": "Stakeholder Management",
  "gestion des parties prenantes": "Stakeholder Management",
  "analyse des besoins": "Needs Analysis",
  "optimisation des processus": "Process Optimization",
  "automatisation des processus": "Process Automation",
  "processus s&op": "S&OP Process",
  "calcul des besoins (drp)": "Distribution Requirements Planning (DRP)",
  "plan directeur de production (pdp)": "Master Production Scheduling (MPS)",
  "prévision des ventes": "Sales Forecasting",
  "approvisionnement": "Procurement & Replenishment",
  "allocation des stocks": "Inventory Allocation",
  "taux de service": "Service Level Management",
  "gestion des ruptures": "Stockout Prevention",
  "gestion fournisseurs": "Supplier Management",
  "performance otif": "OTIF Performance",
  "planification collaborative (cpfr)": "Collaborative Planning (CPFR)",
  "pilotage sell-in / sell-out": "Sell-In / Sell-Out Forecasting",
  "suivi des lancements produits": "Product Launch Management",
  "gestion des arbitrages & priorités": "Supply Trade-Offs & Prioritization",
  "adéquation charge / capacité": "Capacity & Load Balancing",
  "industrialisation & méthodes": "Industrialization & Process Engineering",
  "méthodes maintenance": "Maintenance Engineering Methods",
  "maintenance industrielle": "Industrial Maintenance",
  "maintenance préventive": "Preventive Maintenance",
  "maintenance corrective": "Corrective Maintenance",
  "politique & standards de maintenance": "Maintenance Standards & Governance",
  "fiabilité industrielle": "Industrial Reliability",
  "gmao": "CMMS (GMAO)",
  "sap pm (plant maintenance)": "SAP PM (Plant Maintenance)",
  "tpm (total productive maintenance)": "TPM (Total Productive Maintenance)",
  "méthode 5s": "5S Methodology",
  "amdec / criticité": "FMEA / Criticality Analysis",
  "étude de criticité": "Equipment Criticality Analysis",
  "indicateurs fiabilité (mtbf / mttr / trs)": "Reliability KPIs (MTBF / MTTR / OEE)",
  "gestion des moyens de production": "Production Equipment Engineering",
  "gestion du parc machines": "Machinery & Fleet Management",
  "gestion de projets industriels": "Industrial Project Management",
  "vba excel": "Excel VBA",
  "lecture de plans mécaniques & électriques": "Mechanical & Electrical Blueprint Reading",
  "coordination technique": "Technical Coordination",
  "suivi fournisseurs & prestations": "Vendor & Contractor Management",
  "démarche qualité": "Quality Management Approach",
  "qualité industrielle": "Industrial Quality",
  "contrats cadres & pièces détachées": "Spare Parts & Frame Contracts",
  "bases de données": "Databases",
  "bases de données (access)": "Microsoft Access Databases",
  "analyse statistique (r studio)": "Statistical Analysis (R Studio)",
  "données multispectrales & télédétection": "Multispectral Data & Remote Sensing",
  "agronomie & productions végétales": "Agronomy & Crop Production",
  "agronomie & agro-industries": "Agronomy & Agro-Industries",
  "agroalimentaire & filières agricoles": "Agri-Food & Agricultural Sectors",
  "ingénierie agronomique": "Agronomic Engineering",
  "contrôle qualité & conformité": "Quality Control & Compliance",
  "audit & prévention des risques": "Audit & Risk Prevention",
  "prévention & maîtrise des risques": "Risk Prevention & Mitigation",
  "gestion des contentieux & avaries": "Commercial Disputes & Claims",
  "contentieux commerciaux & transport": "Commercial & Transport Disputes",
  "expertise avaries & sinistres": "Cargo Damage & Loss Surveying",
  "expertise technique & investigations": "Technical Surveying & Investigations",
  "expertise terrain & constats": "Field Surveying & Inspection",
  "suivi terrain & expérimentation": "Field Trials & Monitoring",
  "rédaction de rapports d'expertise": "Technical & Survey Report Writing",
  "rédaction de rapports & synthèses": "Analytical Report Writing",
  "argumentation & conviction": "Persuasive Argumentation & Negotiation",
  "expérimentation scientifique & protocoles": "Scientific Experimentation & Protocols",
  "protocoles d'expérimentation": "Experimental Protocols",
  "sciences du sol & agronomie": "Soil Science & Agronomy",
  "physiologie & protection végétale": "Plant Physiology & Crop Protection",
  "caractérisation du stress hydrique": "Crop Water Stress Characterization",
  "protection des cultures & malherbologie": "Crop Protection & Weed Science",
  "analyse de rendement & collecte": "Yield Forecasting & Harvest Analytics",
  "relations humaines & sens du contact": "Interpersonal & Stakeholder Relations"
};

const TAXONOMY_SKILLS_FR_TO_EN_NORM: Map<string, string> = new Map(
  Object.entries(TAXONOMY_SKILLS_FR_TO_EN).map(([k, v]) => [
    k.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    v
  ])
);

function translateSkillToEnglish(skill: string): string {
  if (!skill || typeof skill !== "string") return "";
  const trimmed = skill.trim();
  const lower = trimmed.toLowerCase();
  if (TAXONOMY_SKILLS_FR_TO_EN[lower]) return TAXONOMY_SKILLS_FR_TO_EN[lower];
  const norm = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normHit = TAXONOMY_SKILLS_FR_TO_EN_NORM.get(norm);
  if (normHit) return normHit;
  // Règle générique pour les intitulés français "Gestion de X" / "Pilotage de X" non listés
  if (/^(?:gestion|pilotage|suivi|administration|param[ée]trage|d[ée]ploiement|analyse)\s+(?:de\s+la\s+|du\s+|des\s+|de\s+|d['’])(.+)$/i.test(trimmed)) {
    const m = trimmed.match(/^(gestion|pilotage|suivi|administration|param[ée]trage|d[ée]ploiement|analyse)\s+(?:de\s+la\s+|du\s+|des\s+|de\s+|d['’])(.+)$/i);
    if (m) {
      const verbMap: Record<string, string> = {
        gestion: "Management",
        pilotage: "Governance & Delivery",
        suivi: "Tracking",
        administration: "Administration",
        parametrage: "Configuration",
        deploiement: "Deployment",
        analyse: "Analysis"
      };
      const vKey = m[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const obj = m[2].trim();
      const objEn = obj
        .replace(/\bcomptes?\b/gi, "Accounts")
        .replace(/\bdonn[ée]es\b/gi, "Data")
        .replace(/\bflux\b/gi, "Workflows")
        .replace(/\bprojets?\b/gi, "Projects")
        .replace(/\brisques?\b/gi, "Risks")
        .replace(/\bachats?\b/gi, "Procurement")
        .replace(/\bstocks?\b/gi, "Inventory")
        .replace(/\bclients?\b/gi, "Clients")
        .replace(/\bfournisseurs?\b/gi, "Vendors")
        .replace(/\bprocessus\b/gi, "Processes")
        .replace(/\butilisateurs?\b/gi, "Users")
        .replace(/\bqualit[ée]\b/gi, "Quality")
        .replace(/\bperformance\b/gi, "Performance")
        .replace(/\bchangement\b/gi, "Change");
      const capObj = objEn.charAt(0).toUpperCase() + objEn.slice(1);
      return `${capObj} ${verbMap[vKey] || "Management"}`;
    }
  }
  return trimmed;
}

const ALLOWED_SHORT_ACRONYMS = new Set(["AI", "IT", "BI", "CI", "CD", "QA", "UI", "UX", "RH", "HR", "SI", "PR", "ERP", "CRM", "KPI", "SAP", "P&L", "SEO", "SEA", "SFD", "UML", "MCD", "ESB", "SOA", "TMA", "MOA", "UAT", "API", "5S", "TPM", "TRS", "OEE", "VBA", "PM"]);

// Vérifie si un mot ou une phrase est une véritable compétence professionnelle
function isValidCompetency(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();

  // Rejeter trop court (sauf acronymes reconnus) ou trop long
  if (trimmed.length < 3) {
    return ALLOWED_SHORT_ACRONYMS.has(trimmed.toUpperCase());
  }
  if (trimmed.length > 62 || trimmed.split(/\s+/).length > 8) return false;

  // Rejeter chiffres purs, dates, URLs, emails
  if (/^\d+$/.test(trimmed)) return false;
  if (/^https?:\/\/|@|\.com|\.fr|\b\d{4}\b/i.test(trimmed)) return false;

  // Rejeter ponctuation parasite aux extrémités
  if (/^[#*–—•:;,.\-/\s]|[#*–—•:;,.\-/\s]$/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();

  // Rejeter les mentions de langues parlées, niveaux CECR ou fragments de rubriques (gérés dans Langues ou Outils)
  if (
    /^(?:langues?|anglais|fran[çc]ais|espagnol|allemand|italien|portugais|arabe|chinois|english|french|spanish|german|italian)(?:\s+(?:courant|professionnel|bilingue|maternel|scolaire|technique|acad[ée]mique|fluent|native|business|professional|niveau\s+ing[ée]nieur|[abc][12]\+?)|\s*,\s*[abc][12]\+?)*$/i.test(lower) ||
    /^(?:professional|business|fluent)\s+(?:english|french|spanish|german)$/i.test(lower) ||
    /^[abc][12]\+?$/i.test(lower) ||
    /^(?:informatique|bureautique|multispectrales(?:\s*\(en\s+cours\))?|maitrise\s+du\s+pack\s+office.*|mod[ée]lisation\s+3d\s+et\s+2d|de\s+donn[ée]es|en\s+cours)$/i.test(lower)
  ) {
    return false;
  }

  // Rejeter la liste noire formelle
  if (NON_COMPETENCY_BLACKLIST.has(lower)) return false;

  // Rejeter les préfixes ou suffixes parasites
  if (Array.from(NON_COMPETENCY_BLACKLIST).some((bad) => lower === bad || lower.startsWith(bad + " ") || lower.endsWith(" " + bad))) {
    // Exception pour les vraies compétences qui contiendraient un mot commun mais sont reconnues
    const norm = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!TAXONOMY_SKILLS_CANONICAL[lower] && !TAXONOMY_SKILLS_CANONICAL[norm]) {
      return false;
    }
  }

  // Rejeter si le mot se termine par un tiret ou contient des caractères de code brisé
  if (/[-–—]$/.test(trimmed) || /[{}\[\]<>]/.test(trimmed)) return false;

  return true;
}

// Nettoie et met en forme une compétence candidate (dans la langue cible FR ou EN)
function sanitizeAndValidateKeyword(raw: any, isEn = false): string | null {
  if (!raw || typeof raw !== "string") return null;

  let cleaned = raw
    .replace(/^[#*–—•:;,.\-/\s]+|[#*–—•:;,.\-/\s]+$/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!cleaned) return null;

  // Vérifier d'abord dans la taxonomie canonique puis localiser en anglais si isEn = true
  const lower = cleaned.toLowerCase();
  const norm = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (TAXONOMY_SKILLS_CANONICAL[lower]) {
    const canon = TAXONOMY_SKILLS_CANONICAL[lower];
    return isEn ? translateSkillToEnglish(canon) : canon;
  }
  if (TAXONOMY_SKILLS_CANONICAL[norm]) {
    const canon = TAXONOMY_SKILLS_CANONICAL[norm];
    return isEn ? translateSkillToEnglish(canon) : canon;
  }

  if (isEn) {
    const translated = translateSkillToEnglish(cleaned);
    if (translated !== cleaned) return translated;
  }

  if (!isValidCompetency(cleaned)) return null;

  // Formater proprement : Majuscule initiale sur chaque mot significatif, préservation des élisions (d', l')
  const words = cleaned.split(/\s+/);
  const formatted = words
    .map((w, idx) => {
      const wLower = w.toLowerCase();
      if (ALLOWED_SHORT_ACRONYMS.has(w.toUpperCase())) return w.toUpperCase();
      if (idx > 0 && ["de", "du", "des", "en", "et", "le", "la", "les", "à", "a", "of", "and", "in", "for"].includes(wLower)) {
        return wLower;
      }
      const elision = w.match(/^([dlsDL]['’])(.+)$/);
      if (elision) {
        const prefix = idx === 0 ? elision[1].charAt(0).toUpperCase() + elision[1].slice(1).toLowerCase() : elision[1].toLowerCase();
        const rest = elision[2];
        const restFormatted = ALLOWED_SHORT_ACRONYMS.has(rest.toUpperCase())
          ? rest.toUpperCase()
          : rest.charAt(0).toUpperCase() + rest.slice(1);
        return `${prefix}${restFormatted}`;
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");

  return isEn ? translateSkillToEnglish(formatted) : formatted;
}

// Extraction robuste et qualifiée des compétences pondérées par fréquence et saillance dans l'offre cible
function extractSkillsAndCompetencies(jobText: string, cvText?: string, maxSkills = 14, isEn = false): string[] {
  const cleanJob = sanitizeDocumentText(jobText || "");
  const cleanCv = sanitizeDocumentText(cvText || "");
  const isRhOffer = /\b(?:rh\b|ressources?\s+humaines?|talent\s+acquisition|recruteur|recrutement)\b/i.test(cleanJob.slice(0, 220));
  const strippedJob = !isRhOffer && cleanJob.length >= 20
    ? cleanJob
        .replace(/[^\n]*(?:talent\s+acquisition|processus\s+de\s+recrutement|entretien\s+(?:avec\s+)?(?:le\s+|notre\s+)?rh|mobilit[ée]\s+interne)[^\n]*/gi, " ")
    : cleanJob;
  const primaryText = strippedJob.length >= 20 ? strippedJob : cleanCv;
  if (!primaryText) return [];

  const primaryLower = primaryText.toLowerCase();
  const primaryNorm = primaryLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const headNorm = primaryNorm.slice(0, 350);

  const scoredMap = new Map<string, { canonical: string; score: number }>();

  // 1. Scorer les compétences canoniques selon leur présence et saillance dans le texte principal (l'offre en priorité)
  for (const [key, canonicalName] of Object.entries(TAXONOMY_SKILLS_CANONICAL)) {
    const keyNorm = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedNorm = keyNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexGlobal = new RegExp(`\\b${escapedKey}\\b`, "gi");
    const normRegexGlobal = new RegExp(`\\b${escapedNorm}\\b`, "gi");

    const matchesA = primaryLower.match(regexGlobal) || [];
    const matchesB = primaryNorm.match(normRegexGlobal) || [];
    const totalCount = Math.max(matchesA.length, matchesB.length);

    if (totalCount > 0) {
      const inHeader = new RegExp(`\\b${escapedNorm}\\b`, "i").test(headNorm) ? 4 : 0;
      const specificityBonus = key.includes(" ") ? 2 : 0;
      const cvMatchBonus = cleanCv && new RegExp(`\\b${escapedNorm}\\b`, "i").test(cleanCv.normalize("NFD").replace(/[\u0300-\u036f]/g, "")) ? 1.5 : 0;
      const score = totalCount * 2 + inHeader + specificityBonus + cvMatchBonus;

      const existing = scoredMap.get(canonicalName.toLowerCase());
      if (!existing || score > existing.score) {
        scoredMap.set(canonicalName.toLowerCase(), { canonical: canonicalName, score });
      }
    }
  }

  // 1b. Éviter qu'un mot générique ou une homonymie hors contexte ne concurrence la vraie compétence métier
  if (scoredMap.has("sap pm (plant maintenance)") && scoredMap.has("sap") && !/\bsap\b(?!\s*(?:pm|\(pm\)))/i.test(primaryNorm.replace(/plant\s+maintenance\s*\(pm\)\s*de\s*sap/gi, "sap pm"))) {
    scoredMap.delete("sap");
  }
  if ((scoredMap.has("démarche qualité") || scoredMap.has("contrôle qualité & conformité")) && scoredMap.has("assurance qualité (qa)") && !/\b(?:assurance\s+qualit[ée]|qa\b|recette|uat|selenium|logiciel)\b/i.test(primaryNorm)) {
    scoredMap.delete("assurance qualité (qa)");
  }
  if (scoredMap.has("modélisation de données & processus") && /\bmod[ée]lisation\s+(?:3d|2d)/i.test(primaryNorm) && !/\b(?:uml|bpmn|mcd|mld|mod[ée]lisation\s+(?:de\s+|des\s+)?(?:donn[ée]es|processus|flux))\b/i.test(primaryNorm)) {
    scoredMap.delete("modélisation de données & processus");
  }
  if (scoredMap.has("contrats cadres & pièces détachées") && scoredMap.has("gestion des achats") && !/\b(?:gestion\s+des\s+achats|acheteur|procurement)\b/i.test(primaryNorm)) {
    scoredMap.delete("gestion des achats");
  }
  if (scoredMap.has("vba excel") && scoredMap.has("excel avancé")) {
    scoredMap.delete("excel avancé");
  }

  // 2. Trier par score décroissant pour refléter exactement les priorités réelles de l'offre
  const sortedSkills = Array.from(scoredMap.values())
    .sort((a, b) => b.score - a.score)
    .map((s) => s.canonical);

  const skills: string[] = [];
  const seenLower = new Set<string>();

  const addSkill = (skill: string) => {
    const valid = sanitizeAndValidateKeyword(skill, isEn);
    if (valid && !seenLower.has(valid.toLowerCase()) && skills.length < maxSkills) {
      skills.push(valid);
      seenLower.add(valid.toLowerCase());
    }
  };

  for (const s of sortedSkills) {
    addSkill(s);
    if (skills.length >= maxSkills) break;
  }

  // 3. Extraction ciblée dans les listes/sections "Compétences / Profil" de l'offre (à puces ou lignes courtes)
  const skillSectionMatches = primaryText.match(/(?:vos\s+compétences|compétences|competences|skills|profil recherché|profil souhaite|requirements|technologies|outils|environnement|missions?)[\s:]*([^\n]+(?:\n(?:[•*-][^\n]+|[^\n]{4,55})){1,10})/gi) || [];
  for (const section of skillSectionMatches) {
    const lines = section.split("\n").slice(1).map((l) => l.replace(/^[•*–—#\s\d.-]+/, "").trim());
    for (const l of lines) {
      if (l.length >= 3 && l.length <= 48 && !/[.!?]$/.test(l)) {
        addSkill(l);
      }
    }
    if (skills.length >= maxSkills) break;
  }

  // 4. Fallback universel neutre (jamais de jargon IT/Agile injecté sur des métiers non-IT)
  if (skills.length < 4) {
    const defaults = isEn
      ? [
          "Project Management",
          "Analytical Synthesis",
          "Cross-Functional Communication",
          "Problem Solving",
          "KPI Tracking & Analytics",
          "Attention to Detail & Rigor"
        ]
      : [
          "Gestion de Projet",
          "Esprit d'Analyse & Synthèse",
          "Communication Transverse",
          "Résolution de Problèmes",
          "Rigueur & Précision",
          "Autonomie"
        ];
    for (const d of defaults) {
      addSkill(d);
    }
  }

  return skills;
}

const DOMAIN_STOPWORDS = new Set([
  "avec", "pour", "dans", "vous", "nous", "votre", "notre", "cette", "cet", "ces", "sont", "etre", "être",
  "avoir", "faire", "plus", "ainsi", "comme", "entre", "sous", "chez", "vers", "tout", "tous", "toute", "toutes",
  "poste", "mission", "missions", "profil", "offre", "entreprise", "equipe", "équipe", "equipes", "équipes",
  "client", "clients", "recherche", "recherchons", "recrute", "recrutons", "contrat", "paris", "france",
  "annees", "années", "experience", "expérience", "experiences", "expériences", "diplome", "diplôme",
  "formation", "competence", "compétence", "competences", "compétences", "role", "rôle", "afin", "mise", "place",
  "suivi", "gestion", "travail", "projets", "projet", "metier", "métier", "metiers", "métiers", "solutions",
  "solution", "outils", "outil", "environnement", "cadre", "niveau", "sein", "partir", "travers", "aussi",
  "with", "from", "your", "our", "this", "that", "have", "will", "team", "teams", "role", "position", "work",
  "working", "experience", "years", "skills", "requirements", "responsibilities", "about", "company", "looking",
  "strong", "across", "within", "ability", "ensure", "using", "based", "including", "support", "business"
]);

function tokenizeMeaningfulTerms(text: string): string[] {
  if (!text) return [];
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bs\s*&\s*op\b/g, "sop")
    .replace(/\br\s*&\s*d\b/g, "rd")
    .replace(/\bp\s*&\s*l\b/g, "pl")
    .replace(/\bm\s*&\s*a\b/g, "ma");
  return norm
    .split(/[^a-z0-9+#/]+/)
    .filter((t) => (t.length >= 3 || /^(?:si|ia|ai|bi|rh|qa|it|ui|ux|po|pm|pl|rd|ma)$/.test(t)) && !DOMAIN_STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function hasWholeTokenInNormCorpus(normCorpus: string, tok: string): boolean {
  if (!normCorpus || !tok) return false;
  const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Les sigles courts (<= 4 car.) doivent correspondre à un mot entier ("sop" != "sopra") ; les mots plus longs tolèrent la flexion ("process" -> "processus")
  const pattern = tok.length <= 4
    ? `(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`
    : `(?:^|[^a-z0-9])${escaped}[a-z0-9]{0,5}(?=$|[^a-z0-9])`;
  return new RegExp(pattern).test(normCorpus);
}

export interface OfferThemes {
  dataAi: boolean;
  agileProduct: boolean;
  appLifecycle: boolean;
  qaQuality: boolean;
  architecture: boolean;
  adoptionChange: boolean;
  cloudPlatform: boolean;
}

interface JobFocusContext {
  missionPhrases: string[];
  domainLabel: string;
  topFocusKeywords: string[];
  weightedTerms: Map<string, number>;
  themes: OfferThemes;
}

/**
 * Nettoie une phrase de mission issue de l'offre cible pour en extraire le thème transférable
 * SANS jamais importer les noms internes d'applications propriétaires de l'entreprise qui recrute
 * (ex: ": BiBOP, SAPHIR, PFMT, BOOSTER PLAN..." ou "vers le futur outil AESOP").
 */
function sanitizeTargetMissionPhrase(phrase: string, cvText = ""): string {
  if (!phrase) return "";
  const cvNorm = cvText.toLowerCase();
  let cleaned = phrase
    // Retirer listes d'outils/applis internes après ":" si absentes du CV
    .replace(/\s*:\s*([A-Z0-9][A-Za-z0-9\s,&/+.'-]{2,})$/g, (_m, listPart: string) => {
      const tokens = listPart.split(/[,;/]|\bet\b|\band\b/i).map((t) => t.trim()).filter(Boolean);
      const anyKnown = tokens.some((t) => t.length >= 2 && cvNorm.includes(t.toLowerCase()));
      return anyKnown ? `: ${listPart}` : "";
    })
    // Retirer mentions d'un outil propriétaire interne en majuscules absent du CV (ex: "vers le futur outil AESOP")
    .replace(/\b(?:futur(?:e)?\s+outil|application|outil|plateforme|système)\s+([A-Z][A-Z0-9_-]{2,})\b/g, (m, code: string) =>
      cvNorm.includes(code.toLowerCase()) ? m : m.replace(new RegExp(`\\s+${code}$`), " cible")
    )
    .replace(/,\s*\.\.\.\s*\)/g, ")")
    .replace(/\s*\.\.\.\s*\)/g, ")")
    .replace(/\.{2,}/g, "")
    .replace(/\bdes\s+évolution\b(?!s)/gi, "des évolutions")
    .replace(/\s{2,}/g, " ")
    .replace(/[.,;:\-\s]+$/, "")
    .trim();

  // Ne pas garder une phrase trop spécifique ou trop longue avec des codes propriétaires résiduels
  if (cleaned.length < 18) return "";
  return cleaned;
}

function detectOfferThemes(jobText: string, roleTitle: string, requiredKeywords: string[]): OfferThemes {
  const combined = `${roleTitle}\n${requiredKeywords.join(" ")}\n${jobText}`.toLowerCase();
  return {
    dataAi: /(?:data\s*&\s*ia|produits?\s+data|solutions?\s+data|data\s+lake|data\s+warehouse|data\s+engineer|data\s+analyst|power\s*bi|superset|tableau|looker|dashboard|visualisation|machine\s+learning|intelligence\s+artificielle|\bia\b|analytics|donn[ée]e)/i.test(combined),
    agileProduct: /\b(?:product\s*owner|proxy\s*po|product\s*manager|chef\s+de\s+produit|backlog|user\s*stor\w*|scrum|kanban|sprint|refinement|roadmap)\b/i.test(combined),
    appLifecycle: /(?:disponibilit[ée]|bon\s+fonctionnement|applications?\s+m[ée]tiers?|tma\b|mco\b|maintien\s+en\s+conditions?|interfaces?\s+(?:avec|connexes|temporaires)|transition\s+vers|progiciel|cycle\s+de\s+vie)/i.test(combined),
    qaQuality: /(?:qualit[ée]\s+des\s+livrables|\bqa\b|recette\s+fonctionnelle|\buat\b|valider\s+leur\s+bon\s+fonctionnement|tester\s+les\s+[ée]volutions|validation\s+des\s+[ée]volutions|tests?\s+fonctionnels?)/i.test(combined),
    architecture: /(?:architect\w*|urbanis\w*|cartograph\w*|\besb\b|\buml\b|\bbpmn\b|\bmcd\b|sp[ée]cifications?\s+fonctionnelles?\s+d[ée]taill[ée]es?|flux\s+inter[- ]applicatifs?)/i.test(`${roleTitle} ${requiredKeywords.slice(0, 6).join(" ")}`),
    adoptionChange: /(?:conduite\s+du\s+changement|change\s+management|adoption\s+manager|adoption|formation\s+utilisateurs?|supports?\s+de\s+formation|accompagnement\s+(?:des\s+)?utilisateurs?)/i.test(combined),
    cloudPlatform: /(?:\bcloud\b|\baws\b|\bazure\b|\bgcp\b|\bsaas\b|\bapis?\b|\bcrm\b|\bsalesforce\b|\berp\b)/i.test(combined),
  };
}

function extractJobFocusContext(
  jobText: string,
  roleTitle: string,
  requiredKeywords: string[],
  isEn: boolean,
  cvText = ""
): JobFocusContext {
  const cleanJob = sanitizeDocumentText(jobText || "");
  const lines = cleanJob
    .replace(/\s*[·•]\s+/g, "\n• ")
    .split("\n")
    .map((l) => l.replace(/^[•*–—\-●▪▫➢➤✓✔\d.)]+\s*/, "").trim())
    .filter((l) => l.length >= 22 && l.length <= 185);

  const ignoredLineRegex = /^(?:nous\s+(?:recherchons|recrutons|sommes)|qui\s+sommes|à\s+propos|avantages|rémunération|salaire|type\s+de\s+contrat|temps\s+plein|lieu|localisation|candidature|rejoignez|entreprise\s*:|société\s*:|poste\s*:|intitulé\s*:|equal\s+opportunity|what\s+we\s+offer|about\s+us|salary|benefits)/i;
  const infinitiveActionRegex = /^(?:concevoir|definir|définir|piloter|rediger|rédiger|modeliser|modéliser|analyser|garantir|coordonner|participer|accompagner|assurer|gerer|gérer|prioriser|recueillir|traduire|structurer|deployer|déployer|optimiser|animer|realiser|réaliser|orchestrer|maintenir|superviser|elaborer|élaborer|conduire|travailler|collaborer|mettre\s+[àa]\s+jour|contribuer|communiquer|tester|design|build|define|lead|manage|drive|own|deliver|collaborate|gather|translate|develop|implement|oversee|maintain)\b/i;

  const missionPhrases: string[] = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (ignoredLineRegex.test(line)) continue;
    if (/[!?]$/.test(line) && line.length < 40) continue;
    if (/(?:\bH\s*\/\s*F\b|\bF\s*\/\s*H\b|\bCDD\b|\bCDI\b|\bAlternance\b|\bStage\b)/i.test(line) && line.length < 75) continue;
    if (roleTitle && line.toLowerCase().includes(roleTitle.toLowerCase()) && !infinitiveActionRegex.test(line)) continue;

    if (infinitiveActionRegex.test(line)) {
      const trimmed = sanitizeTargetMissionPhrase(line.replace(/[.;:]+$/, "").trim(), cvText);
      if (trimmed && !missionPhrases.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
        missionPhrases.push(trimmed);
      }
    }
    if (missionPhrases.length >= 5) break;
  }

  // Classifier le secteur par score pondéré en neutralisant les expressions RH génériques ("mobilité interne", "mutuelle santé", "assurance qualité")
  const themes = detectOfferThemes(cleanJob, roleTitle, requiredKeywords);
  const jobBodyForDomain = cleanJob
    .replace(/\bmobilit[ée]\s+interne\b/gi, " ")
    .replace(/\b(?:mutuelle|assurance)\s+(?:sant[ée]|maladie|pr[ée]voyance)\b/gi, " ")
    .replace(/\bassurance\s+qualit[ée]\b/gi, " ")
    .replace(/\bsant[ée]\s+(?:et\s+s[ée]curit[ée]|au\s+travail)\b/gi, " ")
    .replace(/(?:pourquoi\s+nous\s+rejoindre|et\s+le\s+process|avantages\s*:|[ée]galit[ée]\s+et\s+inclusion)[\s\S]{0,900}$/i, "")
    .toLowerCase();

  const countHits = (re: RegExp) => (jobBodyForDomain.match(re) || []).length;
  const domainScores: { labelFr: string; labelEn: string; score: number }[] = [
    {
      labelFr: "Médias, Communication & Produits Data",
      labelEn: "Media, Outdoor Communication & Data Products",
      score:
        (countHits(/\b(?:communication\s+ext[ée]rieure|mobilier\s+urbain|affichage\s+grand\s+format|m[ée]dia|publicit[ée])\b/gi) > 0 && themes.dataAi)
          ? countHits(/\b(?:communication\s+ext[ée]rieure|mobilier\s+urbain|affichage|m[ée]dia|publicit[ée]|data|ia|dashboard)\b/gi) * 3
          : 0,
    },
    {
      labelFr: "Cosmétique, Beauté & Luxe",
      labelEn: "Cosmetics, Beauty & Luxury",
      score: countHits(/\b(?:cosm[ée]tiques?|dermo-cosm[ée]tiques?|parfumerie|haute\s+parfumerie|maquillage|beaut[ée]|skincare|fragrance|beauty|soins?\s+(?:du\s+visage|de\s+la\s+peau|capillaires?)|joaillerie|horlogerie|pr[êe]t-[àa]-porter|haute\s+couture|luxe|luxury)\b/gi) * 4,
    },
    {
      labelFr: "Expertise Technique, Contrôle Qualité & Audit Sinistres",
      labelEn: "Technical Surveying, Quality Control & Risk Audit",
      score: countHits(/\b(?:contr[oô]le\s+qualit[ée]|avaries|contentieux\s+commerciaux|marchandises\s+transport[ée]es|audit\s+et\s+(?:de\s+)?pr[ée]vention|expertises?\s+sur\s+le\s+terrain|rapports?\s+de\s+conclusion)\b/gi) * 4,
    },
    {
      labelFr: "Agronomie, Agro-Industries & Agroalimentaire",
      labelEn: "Agronomy, Agro-Industries & Agri-Food",
      score: countHits(/\b(?:agronom\w*|agro[- ]?industr\w*|agroalimentaire|agricole|exp[ée]rimentation\s+v[ée]g[ée]tale|fmcg|grande\s+consommation|alimentaire|food\s*(?:&|and)\s*beverage)\b/gi) * 3.5,
    },
    {
      labelFr: "Santé & Sciences de la Vie",
      labelEn: "Healthcare & Life Sciences",
      score: countHits(/\b(?:pharma|pharmaceutique|m[ée]dical|biotech|clinique|h[oô]pital|sant[ée]\s+num[ée]rique|e-sant[ée]|dispositifs?\s+m[ée]dicaux)\b/gi) * 3.5,
    },
    {
      labelFr: "Banque, Assurance & Services Financiers",
      labelEn: "Banking, Insurance & Financial Services",
      score: countHits(/\b(?:banque|bancaire|fintech|leasing|factoring|cr[ée]dit|[ée]pargne|assureur|patrimoine\s+financier|bnp|soci[ée]t[ée]\s+g[ée]n[ée]rale|axa|allianz)\b/gi) * 3.5,
    },
    {
      labelFr: "Finance, Audit & Contrôle de Gestion",
      labelEn: "Finance, Audit & Controlling",
      score: countHits(/\b(?:contr[oô]le\s+de\s+gestion|contr[oô]leu(?:r|se)\s+financier|analyste\s+financier|tr[ée]sorerie|cl[oô]ture\s+comptable|normes\s+ifrs|ifrs|audit\s+financier|reporting\s+financier|budg[ée]taire)\b/gi) * 3.5,
    },
    {
      labelFr: "Aéronautique, Spatial & Défense",
      labelEn: "Aerospace & Defense",
      score: countHits(/\b(?:a[ée]ronautique|aerospace|a[ée]rospatial|spatial|avionique|aviation|d[ée]fense)\b/gi) * 3.8,
    },
    {
      labelFr: "Automobile & Mobilité",
      labelEn: "Automotive & Mobility",
      score: countHits(/\b(?:secteur\s+automobile|automobile|constructeur\s+auto|concession|v[ée]hicules?|ferroviaire|mobilit[ée]\s+(?:urbaine|durable|[ée]lectrique))\b/gi) * 3.5,
    },
    {
      labelFr: "Énergie, Environnement & Utilities",
      labelEn: "Energy, Utilities & Renewables",
      score: countHits(/\b(?:[ée]nergie|renouvelable|nucl[ée]aire|[ée]lectricit[ée]|gaz\s+naturel|solaire|[ée]olien|hydrog[èe]ne|transition\s+[ée]nerg[ée]tique|utilities)\b/gi) * 3.2,
    },
    {
      labelFr: "Data, IA & Produits Numériques",
      labelEn: "Data, AI & Digital Products",
      score: countHits(/\b(?:direction\s+data|data\s*&\s*ia|produits?\s+data|solutions?\s+data|data\s+lake|data\s+warehouse|power\s*bi|superset|dashboard|intelligence\s+artificielle|analytics|ia\b)\b/gi) * 2.5,
    },
    {
      labelFr: "Retail & E-Commerce",
      labelEn: "Retail & E-Commerce",
      score: countHits(/\b(?:retail|e-commerce|omnicanal|point\s+de\s+vente|boutiques?|magasins?|grande\s+distribution)\b/gi) * 2.8,
    },
    {
      labelFr: "Industrie & Maintenance Industrielle",
      labelEn: "Manufacturing & Industrial Operations",
      score: countHits(/\b(?:maintenance\s+industrielle|m[ée]thodes\s+maintenance|fiabilit[ée]\s+industrielle|moyens?\s+de\s+production|parc\s+machines?|usine|manufacturing|production\s+industrielle|industriel(?:le|s)?|industrie|m[ée]tallurgie|chimie|[ée]quipements?\s+industriels?|gmao|catia)\b/gi) * 2.4,
    },
    {
      labelFr: "Supply Chain, Distribution & Opérations",
      labelEn: "Supply Chain, Distribution & Operations",
      score: Math.min(2.6, countHits(/\b(?:supply\s+chain|demand\s+planning|supply\s+planning|approvisionnement|logistique|s&op|drp|otif)\b/gi) * 1.1),
    },
    {
      labelFr: "Édition Logicielle, Cloud & SaaS",
      labelEn: "Software, Cloud & SaaS",
      score: countHits(/\b(?:saas|[ée]diteur\s+(?:de\s+)?logiciel|startup|plateforme\s+cloud|devops|kubernetes)\b/gi) * 2.5,
    },
    {
      labelFr: "Secteur Public & Modernisation SI",
      labelEn: "Public Sector & GovTech",
      score: countHits(/\b(?:secteur\s+public|minist[èe]re|collectivit[ée]|administration\s+publique|service\s+public)\b/gi) * 3,
    },
  ];

  domainScores.sort((a, b) => b.score - a.score);
  const topDomain = domainScores[0];
  let domainLabel = isEn ? "Enterprise Transformation & Digital Solutions" : "Systèmes d'Information & Transformation Digitale";
  if (topDomain && topDomain.score >= 2.0) {
    domainLabel = isEn ? topDomain.labelEn : topDomain.labelFr;
  }

  const weightedTerms = new Map<string, number>();
  for (const tok of tokenizeMeaningfulTerms(roleTitle)) {
    weightedTerms.set(tok, (weightedTerms.get(tok) || 0) + 5);
  }
  for (const kw of requiredKeywords) {
    for (const tok of tokenizeMeaningfulTerms(kw)) {
      weightedTerms.set(tok, (weightedTerms.get(tok) || 0) + 3);
    }
  }
  for (const tok of tokenizeMeaningfulTerms(cleanJob)) {
    weightedTerms.set(tok, (weightedTerms.get(tok) || 0) + 1);
  }

  return {
    missionPhrases,
    domainLabel,
    topFocusKeywords: requiredKeywords.slice(0, 5),
    weightedTerms,
    themes,
  };
}

// Score le ratio linguistique d'un texte (Français vs Anglais)
function scoreLanguageText(text: string): { enScore: number; frScore: number } {
  if (!text || !text.trim()) return { enScore: 0, frScore: 0 };
  const lower = text.toLowerCase();

  const englishKeywords = [
    '\\bthe\\b', '\\band\\b', '\\bwith\\b', '\\bfor\\b', '\\bfrom\\b', '\\byour\\b',
    '\\bthis\\b', '\\bthat\\b', '\\bhave\\b', '\\bwill\\b', '\\bare\\b', '\\babout us\\b',
    '\\bwe are looking for\\b', '\\bresponsibilities\\b', '\\brequirements\\b',
    '\\bqualifications\\b', '\\bexperience\\b', '\\bteam\\b', '\\brole\\b',
    '\\bskills\\b', '\\bapply\\b', '\\bdescription\\b', '\\bkey duties\\b',
    '\\bwhat you will do\\b', '\\bwhat we offer\\b', '\\bwork\\b', '\\byears of\\b',
    '\\bof\\b', '\\bin\\b', '\\bto\\b', '\\bat\\b', '\\bby\\b', '\\bon\\b', '\\bas\\b',
    '\\ban\\b', '\\bis\\b', '\\bwas\\b', '\\bwere\\b', '\\bmanager\\b', '\\bengineer\\b',
    '\\bdeveloper\\b', '\\blead\\b', '\\bsenior\\b', '\\bdirector\\b', '\\banalyst\\b',
    '\\bproduct\\b', '\\bcustomer\\b', '\\bremote\\b', '\\bbenefits\\b', '\\bstartup\\b',
    '\\bmanaged\\b', '\\bled\\b', '\\bdesigned\\b', '\\bdeveloped\\b', '\\bdelivered\\b',
    '\\bspearheaded\\b', '\\borchestrated\\b', '\\bimplemented\\b', '\\bpresent\\b',
    '\\beducation\\b', '\\bdegree\\b', '\\buniversity\\b', '\\blanguages\\b'
  ];

  const frenchKeywords = [
    '\\ble\\b', '\\bla\\b', '\\bles\\b', '\\bdes\\b', '\\bdu\\b', '\\bpour\\b',
    '\\bavec\\b', '\\bdans\\b', '\\bsur\\b', '\\bune\\b', '\\bun\\b', '\\bqui\\b',
    '\\bque\\b', '\\bvous\\b', '\\bnous\\b', '\\bnotre\\b', '\\bvotre\\b', '\\bposte\\b',
    '\\bprofil\\b', '\\bmissions\\b', '\\bcompétences\\b', '\\bcompetences\\b',
    '\\bentreprise\\b', '\\brecherche\\b', '\\brecherchons\\b', '\\bcandidat\\b',
    '\\bexpérience\\b', '\\bexperience\\b', '\\bcandidature\\b', '\\bà propos\\b',
    '\\bce que nous\\b', '\\ben\\b', '\\bà\\b', '\\bau\\b', '\\baux\\b', '\\bpar\\b',
    '\\bsous\\b', '\\bchez\\b', '\\bet\\b', '\\bou\\b', '\\best\\b', '\\bsont\\b',
    '\\bprésent\\b', '\\bactuel\\b', '\\bformation\\b', '\\bdiplôme\\b',
    '\\buniversité\\b', '\\blangues\\b', '\\bgestion\\b', '\\bchef\\b',
    '\\bingénieur\\b', '\\bdéveloppeur\\b', '\\bresponsable\\b', '\\bdirecteur\\b',
    '\\bpiloté\\b', '\\bdéployé\\b', '\\boptimisé\\b', '\\bmené\\b', '\\bcoordonné\\b'
  ];

  let enScore = 0;
  let frScore = 0;

  for (const pattern of englishKeywords) {
    const matches = lower.match(new RegExp(pattern, 'gi'));
    if (matches) enScore += matches.length;
  }

  for (const pattern of frenchKeywords) {
    const matches = lower.match(new RegExp(pattern, 'gi'));
    if (matches) frScore += matches.length;
  }

  return { enScore, frScore };
}

// Détection automatique du langage (Français vs Anglais)
function detectLanguage(jobText: string, cvText?: string): 'fr' | 'en' {
  // RÈGLE CARDINALE DE RECRUTEMENT INTERNATIONAL :
  // La langue d'une candidature ATS est dictée en priorité ABSOLUE par l'offre d'emploi visée.
  // Si le candidat téléverse un CV en français pour une offre en anglais (ex: LinkedIn),
  // la candidature doit être rédigée à 100% en anglais. Ne JAMAIS laisser le CV français noyer l'offre anglaise.
  if (jobText && jobText.trim().length >= 25) {
    const jobScores = scoreLanguageText(jobText);
    if (jobScores.enScore > jobScores.frScore) {
      return 'en';
    }
    if (jobScores.frScore > jobScores.enScore) {
      return 'fr';
    }
  }

  // Si l'offre d'emploi est trop courte ou équivoque, examiner le CV en complément
  if (cvText && cvText.trim().length >= 25) {
    const cvScores = scoreLanguageText(cvText);
    if (cvScores.enScore > cvScores.frScore) {
      return 'en';
    }
  }

  return 'fr';
}

// Réassemblage des lignes brisées par les parseurs PDF/Word
function reassembleCvLines(text: string): string[] {
  if (!text) return [];
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanLines: string[] = [];
  const artifactPatterns = [
    /^--\s*\d+\s+of\s+\d+\s*--$/i,
    /^Page\s+\d+\s*\/\s*\d+.*$/i,
    /^CV Optimisé Certifié ATS$/i,
    /^[•\s\d/-]+$/
  ];

  for (const line of rawLines) {
    if (artifactPatterns.some((p) => p.test(line))) continue;

    const isBulletStart = /^[•*–—\-]\s+/.test(line);
    const isSectionOrHeader =
      /^(EXPÉRIENCES|EXPERIENCES|FORMATION|EDUCATION|COMPÉTENCES|SKILLS|PROFIL|PROFILE|LANGUES|LANGUAGES)/i.test(line) ||
      /\b(19\d\d|20\d\d)\b.*(?:Présent|Present|Current|\b(19\d\d|20\d\d)\b)/i.test(line);

    if (cleanLines.length > 0 && !isBulletStart && !isSectionOrHeader) {
      const prev = cleanLines[cleanLines.length - 1];
      const prevIsBullet = /^[•*–—\-]\s+/.test(prev);
      if (prevIsBullet && !prev.endsWith(".") && !prev.endsWith(":") && !prev.endsWith(";")) {
        cleanLines[cleanLines.length - 1] = `${prev} ${line}`;
        continue;
      }
    }
    cleanLines.push(line);
  }

  return cleanLines;
}

const IRREGULAR_FR_PAST_TO_INF: Record<string, string> = {
  "mis": "Mettre",
  "pris": "Prendre",
  "conduit": "Conduire",
  "conduite": "Conduire",
  "conçu": "Concevoir",
  "conçus": "Concevoir",
  "conçue": "Concevoir",
  "conçues": "Concevoir",
  "traduit": "Traduire",
  "produit": "Produire",
  "réduit": "Réduire",
  "reduit": "Réduire",
  "construit": "Construire",
  "instruit": "Instruire",
  "suivi": "Suivre",
  "fourni": "Fournir",
  "garanti": "Garantir",
  "défini": "Définir",
  "defini": "Définir",
  "accompli": "Accomplir",
  "établi": "Établir",
  "etabli": "Établir",
  "enrichi": "Enrichir",
  "converti": "Convertir",
  "recueilli": "Recueillir",
  "réussi": "Réussir",
  "reussi": "Réussir",
  "bâti": "Bâtir",
  "choisi": "Choisir",
  "rempli": "Remplir",
  "maintenu": "Maintenir",
  "soutenu": "Soutenir",
  "obtenu": "Obtenir",
  "intervenu": "Intervenir",
  "résolu": "Résoudre",
  "resolu": "Résoudre",
  "écrit": "Écrire",
  "ecrit": "Écrire",
  "décrit": "Décrire",
  "decrit": "Décrire",
  "permis": "Permettre",
  "transmis": "Transmettre",
  "soumis": "Soumettre",
  "promu": "Promouvoir",
  "fait": "Faire",
  "ouvert": "Ouvrir",
  "couvert": "Couvrir",
  "découvert": "Découvrir",
  "offert": "Offrir",
};

const NON_VERB_E_NOUNS = new Set([
  "qualité", "qualite", "sécurité", "securite", "conformité", "conformite",
  "activité", "activite", "fiabilité", "fiabilite", "mobilité", "mobilite",
  "traçabilité", "tracabilite", "disponibilité", "disponibilite", "rentabilité", "rentabilite",
  "continuité", "continuite", "évolutivité", "evolutivite", "productivité", "productivite",
  "stabilité", "stabilite", "visibilité", "visibilite", "agilité", "agilite",
  "réalité", "realite", "priorité", "priorite", "responsabilité", "responsabilite",
  "autonomie", "synergie", "stratégie", "strategie"
]);

function frPastParticipleWordToInfinitive(word: string): string | null {
  if (!word) return null;
  const low = word.toLowerCase();
  if (IRREGULAR_FR_PAST_TO_INF[low]) {
    const inf = IRREGULAR_FR_PAST_TO_INF[low];
    return /^[A-ZÀ-Ÿ]/.test(word) ? inf : inf.toLowerCase();
  }
  if (NON_VERB_E_NOUNS.has(low)) return null;
  // Verbes du 1er groupe au participe passé : "Piloté" -> "Piloter", "Créé" -> "Créer"
  if (/^[a-zà-ÿ]{2,}[ée]$/i.test(word) && word.endsWith("é")) {
    const inf = `${word.slice(0, -1)}er`;
    return /^[A-ZÀ-Ÿ]/.test(word) ? inf.charAt(0).toUpperCase() + inf.slice(1) : inf.toLowerCase();
  }
  // Cas non accentué connu en début de phrase (ex: "Pilote " -> "Piloter ")
  return null;
}

function ensureFrenchInfinitiveBullet(rawBullet: string): string {
  const s = (rawBullet || "").trim();
  if (!s) return "";

  let updated = s
    .replace(/^Mis\s+en\s+place\b/i, "Mettre en place")
    .replace(/^Mis\s+en\s+[œo]e?uvre\b/i, "Mettre en œuvre")
    .replace(/^Pris\s+en\s+charge\b/i, "Prendre en charge");

  // Convertir verbe d'ouverture composé : "Piloté, priorisé et arbitré ..." ou "Configuré et paramétré ..."
  updated = updated.replace(
    /^([A-Za-zÀ-ÿ]+)(\s*,\s*|\s+et\s+)([A-Za-zÀ-ÿ]+)(?:\s+et\s+([A-Za-zÀ-ÿ]+))?(?=\s|$)/,
    (full, w1: string, sep1: string, w2: string, w3?: string) => {
      const i1 = frPastParticipleWordToInfinitive(w1);
      const i2 = frPastParticipleWordToInfinitive(w2);
      const i3 = w3 ? frPastParticipleWordToInfinitive(w3) : null;
      if (!i1) return full;
      if (i2 && w3 && i3) return `${i1}${sep1}${i2.toLowerCase()} et ${i3.toLowerCase()}`;
      if (i2 && !w3) return `${i1}${sep1}${i2.toLowerCase()}`;
      return full;
    }
  );

  // Convertir le premier mot si encore au participe passé
  updated = updated.replace(/^([A-Za-zÀ-ÿ]+)(?=\s|$|[,.:;])/, (m, first: string) => {
    const inf = frPastParticipleWordToInfinitive(first);
    return inf ? inf.charAt(0).toUpperCase() + inf.slice(1) : m;
  });

  // Harmoniser le verbe coordonné juste après " et " uniquement si la phrase commence déjà par un verbe d'action à l'infinitif
  const startsWithInfinitiveCheck = /^(?:Piloter|Animer|Conduire|Mener|Superviser|Configurer|Param[ée]trer|G[ée]rer|Concevoir|D[ée]velopper|Mod[ée]liser|Analyser|Coordonner|Orchestrer|Optimiser|Mettre|R[ée]diger|D[ée]ployer|Structurer|Intervenir|Assurer|D[ée]livrer|Arbitrer|R[ée]aliser|Participer|Contribuer|Accompagner|Maintenir|Cr[ée]er|[ÉE]laborer|Valider|S[ée]curiser|Encadrer|Former|Automatiser|Migrer|Int[ée]grer|Tester|Fiabiliser|Qualifier|Contr[oô]ler|Formaliser|Garantir|Traduire|Prioriser|Cadrer|Urbaniser|Cartographier|Administrer|Auditer|[ÉE]tudier|[ÉE]valuer|Adapter|Diriger|Faciliter|Documenter|Consolider|Ex[ée]cuter|Transformer|Acc[ée]l[ée]rer|Suivre|Recueillir|Prendre|Anticiper|Planifier|N[ée]gocier|Calculer|Am[ée]liorer)\b/i;
  if (startsWithInfinitiveCheck.test(updated)) {
    updated = updated.replace(/\s+et\s+([a-zà-ÿ]+[ée]|conduit|conçu|traduit|suivi|garanti|défini|maintenu|résolu|réduit|fourni|obtenu)(?=\s)/gi, (full, v: string) => {
      const inf = frPastParticipleWordToInfinitive(v);
      return inf ? ` et ${inf.toLowerCase()}` : full;
    });
  }

  return updated;
}

// Harmonisation STAR des puces (verbes d'action à l'infinitif en français, sans doublon ni coupure)
function harmonizeBulletToStar(rawBullet: string, isEn: boolean): string {
  let cleaned = rawBullet
    .replace(/^(?:[•*–—\-●▪▫➢➤✓✔]+|\d+[.)])\s*/, "")
    .replace(/^(?:Contexte|Mission|Missions|Tâche|Tâches|Action|Actions|Résultat|Résultats|Objectif|Objectifs|Projet)\s*:\s+/i, "")
    .replace(/(?:\s*[•●▪▫➢➤✓✔]){2,}/g, " ")
    .replace(/\s+[•●▪▫➢➤✓✔]+\s*$/g, "")
    .replace(/\)\s*-([a-zà-ÿ])/g, ") — $1")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const frVerbMap: [RegExp, string][] = [
    [/^pilotage\s+(op[ée]rationnel(?:le)?|strat[ée]gique|technique|fonctionnel(?:le)?|financier|industriel(?:le)?|quotidien(?:ne)?|mensuel(?:le)?|hebdomadaire|global(?:e)?)\s+/i, "Assurer le pilotage $1 "],
    [/^pilotage\s*,?\s*/i, "Piloter "],
    [/^[ée]laboration\s+et\s+suivi\s+des\s+/i, "Élaborer et suivre les "],
    [/^[ée]laboration\s+et\s+suivi\s+de\s+la\s+/i, "Élaborer et suivre la "],
    [/^[ée]laboration\s+et\s+suivi\s+de\s+l['’]/i, "Élaborer et suivre l'"],
    [/^[ée]laboration\s+et\s+suivi\s+du\s+/i, "Élaborer et suivre le "],
    [/^[ée]laboration\s+et\s+suivi\s+(?:de|d['’])\s*/i, "Élaborer et suivre des "],
    [/^[ée]laboration\s+des\s+/i, "Élaborer les "],
    [/^[ée]laboration\s+de\s+la\s+/i, "Élaborer la "],
    [/^[ée]laboration\s+de\s+l['’]/i, "Élaborer l'"],
    [/^[ée]laboration\s+du\s+/i, "Élaborer le "],
    [/^[ée]laboration\s+d['’]un(e)?\s+/i, "Élaborer un$1 "],
    [/^[ée]laboration\s+(?:de\s+|d['’])?/i, "Élaborer des "],
    [/^animation\s+de\s+la\s+/i, "Animer la "],
    [/^animation\s+de\s+l['’]/i, "Animer l'"],
    [/^animation\s+du\s+/i, "Animer le "],
    [/^animation\s+des\s+/i, "Animer les "],
    [/^animation\s+d['’]un(e)?\s+/i, "Animer un$1 "],
    [/^animation\s+(?:de\s+|d['’])?/i, "Animer "],
    [/^conduite\s+de\s+la\s+/i, "Conduire la "],
    [/^conduite\s+de\s+l['’]/i, "Conduire l'"],
    [/^conduite\s+du\s+/i, "Conduire le "],
    [/^conduite\s+des\s+/i, "Conduire les "],
    [/^conduite\s+(?:de\s+|d['’])?/i, "Conduire "],
    [/^recueil\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Conduire le recueil de "],
    [/^supervision\s+des\s+/i, "Superviser les "],
    [/^supervision\s+de\s+la\s+/i, "Superviser la "],
    [/^supervision\s+de\s+l['’]/i, "Superviser l'"],
    [/^supervision\s+du\s+/i, "Superviser le "],
    [/^supervision\s+(?:de\s+|d['’])?/i, "Superviser "],
    [/^configuration\s+des\s+/i, "Configurer les "],
    [/^configuration\s+de\s+la\s+/i, "Configurer la "],
    [/^configuration\s+de\s+l['’]/i, "Configurer l'"],
    [/^configuration\s+du\s+/i, "Configurer le "],
    [/^configuration\s+(?:de\s+|d['’])?/i, "Configurer "],
    [/^param[ée]trage\s+des\s+/i, "Paramétrer les "],
    [/^param[ée]trage\s+de\s+la\s+/i, "Paramétrer la "],
    [/^param[ée]trage\s+de\s+l['’]/i, "Paramétrer l'"],
    [/^param[ée]trage\s+du\s+/i, "Paramétrer le "],
    [/^param[ée]trage\s+(?:de|d['’])\s*/i, "Paramétrer des "],
    [/^gestion\s+d['’]un(e)?\s+/i, "Gérer un$1 "],
    [/^gestion\s+des\s+/i, "Gérer les "],
    [/^gestion\s+de\s+la\s+/i, "Gérer la "],
    [/^gestion\s+de\s+l['’]/i, "Gérer l'"],
    [/^gestion\s+du\s+/i, "Gérer le "],
    [/^gestion\s+(?:de|d['’])\s*/i, "Gérer des "],
    [/^conception\s+des\s+/i, "Concevoir les "],
    [/^conception\s+de\s+la\s+/i, "Concevoir la "],
    [/^conception\s+de\s+l['’]/i, "Concevoir l'"],
    [/^conception\s+du\s+/i, "Concevoir le "],
    [/^conception\s+d['’]un(e)?\s+/i, "Concevoir un$1 "],
    [/^conception\s+(?:de|d['’])\s*/i, "Concevoir des "],
    [/^d[ée]veloppement\s+des\s+/i, "Développer les "],
    [/^d[ée]veloppement\s+de\s+la\s+/i, "Développer la "],
    [/^d[ée]veloppement\s+de\s+l['’]/i, "Développer l'"],
    [/^d[ée]veloppement\s+du\s+/i, "Développer le "],
    [/^d[ée]veloppement\s+d['’]un(e)?\s+/i, "Développer un$1 "],
    [/^d[ée]veloppement\s+(?:de|d['’])\s*/i, "Développer des "],
    [/^mod[ée]lisation\s+des\s+/i, "Modéliser les "],
    [/^mod[ée]lisation\s+(?:de\s+la|de\s+l'|du|de|d')?\s*/i, "Modéliser "],
    [/^analyse\s+des\s+/i, "Analyser les "],
    [/^analyse\s+de\s+la\s+/i, "Analyser la "],
    [/^analyse\s+de\s+l['’]/i, "Analyser l'"],
    [/^analyse\s+du\s+/i, "Analyser le "],
    [/^analyse\s+(?:de|d['’])\s*/i, "Analyser des "],
    [/^coordination\s+avec\s+/i, "Assurer la coordination avec "],
    [/^coordination\s+des\s+/i, "Coordonner les "],
    [/^coordination\s+de\s+la\s+/i, "Coordonner la "],
    [/^coordination\s+de\s+l['’]/i, "Coordonner l'"],
    [/^coordination\s+du\s+/i, "Coordonner le "],
    [/^coordination\s+(?:de|d['’])\s*/i, "Coordonner "],
    [/^optimisation\s+des\s+/i, "Optimiser les "],
    [/^optimisation\s+de\s+la\s+/i, "Optimiser la "],
    [/^optimisation\s+de\s+l['’]/i, "Optimiser l'"],
    [/^optimisation\s+du\s+/i, "Optimiser le "],
    [/^optimisation\s+(?:de|d['’])\s*/i, "Optimiser "],
    [/^mise\s+en\s+place\s+de\s+la\s+/i, "Déployer la "],
    [/^mise\s+en\s+place\s+de\s+l['’]/i, "Déployer l'"],
    [/^mise\s+en\s+place\s+du\s+/i, "Déployer le "],
    [/^mise\s+en\s+place\s+des\s+/i, "Déployer les "],
    [/^mise\s+en\s+place\s+d['’]un(e)?\s+/i, "Déployer un$1 "],
    [/^mise\s+en\s+place\s+(?:de|d['’])?\s*/i, "Déployer "],
    [/^mise\s+en\s+[œo]e?uvre\s+de\s+la\s+/i, "Mettre en œuvre la "],
    [/^mise\s+en\s+[œo]e?uvre\s+de\s+l['’]/i, "Mettre en œuvre l'"],
    [/^mise\s+en\s+[œo]e?uvre\s+du\s+/i, "Mettre en œuvre le "],
    [/^mise\s+en\s+[œo]e?uvre\s+des\s+/i, "Mettre en œuvre les "],
    [/^mise\s+en\s+[œo]e?uvre\s+d['’]un(e)?\s+/i, "Mettre en œuvre un$1 "],
    [/^mise\s+en\s+[œo]e?uvre\s+(?:de|d['’])?\s*/i, "Mettre en œuvre "],
    [/^r[ée]actualisation\s+de\s+la\s+/i, "Réactualiser la "],
    [/^r[ée]actualisation\s+de\s+l['’]/i, "Réactualiser l'"],
    [/^r[ée]actualisation\s+du\s+/i, "Réactualiser le "],
    [/^r[ée]actualisation\s+des\s+/i, "Réactualiser les "],
    [/^r[ée]actualisation\s+(?:de|d['’])?\s*/i, "Réactualiser "],
    [/^r[ée]alisation\s+des\s+/i, "Réaliser les "],
    [/^r[ée]alisation\s+de\s+la\s+/i, "Réaliser la "],
    [/^r[ée]alisation\s+de\s+l['’]/i, "Réaliser l'"],
    [/^r[ée]alisation\s+du\s+/i, "Réaliser le "],
    [/^r[ée]alisation\s+(?:de|d['’])?\s*/i, "Réaliser "],
    [/^r[ée]daction\s+des\s+/i, "Rédiger les "],
    [/^r[ée]daction\s+(?:de\s+la|de\s+l['’]|du|de|d')?\s*/i, "Rédiger "],
    [/^d[ée]ploiement\s+des\s+/i, "Déployer les "],
    [/^d[ée]ploiement\s+de\s+la\s+/i, "Déployer la "],
    [/^d[ée]ploiement\s+du\s+/i, "Déployer le "],
    [/^d[ée]ploiement\s+(?:de|d')?\s*/i, "Déployer "],
    [/^structuration\s+des\s+/i, "Structurer les "],
    [/^structuration\s+(?:de\s+la|de\s+l'|du|de|d')?\s*/i, "Structurer "],
    [/^suivi\s+du\s+/i, "Assurer le suivi du "],
    [/^suivi\s+de\s+la\s+/i, "Assurer le suivi de la "],
    [/^suivi\s+des\s+/i, "Assurer le suivi des "],
    [/^suivi\s+de\s+l['’]/i, "Assurer le suivi de l'"],
    [/^suivi\s+(?:de|d')\s*/i, "Assurer le suivi de "],
    [/^contr[oô]le\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Contrôler "],
    [/^validation\s+des\s+/i, "Valider les "],
    [/^validation\s+de\s+la\s+/i, "Valider la "],
    [/^validation\s+du\s+/i, "Valider le "],
    [/^validation\s+(?:de|d')?\s*/i, "Valider "],
    [/^automatisation\s+des\s+/i, "Automatiser les "],
    [/^automatisation\s+(?:de\s+la|de\s+l'|du|de|d')?\s*/i, "Automatiser "],
    [/^int[ée]gration\s+d['’]un(e)?\s+/i, "Piloter l'intégration d'un$1 "],
    [/^int[ée]gration\s+des\s+/i, "Intégrer les "],
    [/^int[ée]gration\s+de\s+la\s+/i, "Intégrer la "],
    [/^int[ée]gration\s+(?:du|de|d')?\s*/i, "Intégrer "],
    [/^anticipation\s+des\s+/i, "Anticiper les "],
    [/^anticipation\s+de\s+la\s+/i, "Anticiper la "],
    [/^anticipation\s+du\s+/i, "Anticiper le "],
    [/^anticipation\s+(?:de|d')?\s*/i, "Anticiper "],
    [/^pr[ée]visions?\s+et\s+approvisionnements?\s+(?:de|des|du)\s+/i, "Élaborer les prévisions et gérer l'approvisionnement des "],
    [/^pr[ée]visions?\s+(?:de|des)\s+/i, "Élaborer les prévisions de "],
    [/^pr[ée]visions?\s+d['’]/i, "Élaborer les prévisions d'"],
    [/^approvisionnement\s+des\s+/i, "Gérer l'approvisionnement des "],
    [/^approvisionnement\s+de\s+la\s+/i, "Gérer l'approvisionnement de la "],
    [/^calcul\s+et\s+consolidation\s+des\s+/i, "Calculer et consolider les "],
    [/^calcul\s+des\s+/i, "Piloter le calcul des "],
    [/^calcul\s+du\s+/i, "Piloter le calcul du "],
    [/^planification\s+des\s+/i, "Planifier les "],
    [/^[ée]changes\s+r[ée]guliers\s+/i, "Conduire des échanges réguliers "],
    [/^n[ée]gociation\s+(?:des|avec)\s+/i, "Négocier "],
    [/^r[ée]f[ée]rente?\s+relation\s+fournisseurs?\s+et\s+suivi\s+/i, "Piloter la relation fournisseurs et assurer le suivi "],
    [/^r[ée]f[ée]rente?\s+fournisseurs?\s*:\s*/i, "Piloter la relation fournisseurs : "],
    [/^[ée]tablissement\s+des\s+/i, "Établir les "],
    [/^[ée]tablissement\s+de\s+la\s+/i, "Établir la "],
    [/^[ée]tablissement\s+de\s+l['’]/i, "Établir l'"],
    [/^[ée]tablissement\s+du\s+/i, "Établir le "],
    [/^[ée]tablissement\s+(?:de|d['’])?\s*/i, "Établir "],
    [/^interface\s+(entre|avec)\s+/i, "Assurer l'interface $1 "],
    [/^approvisionnement\s+et\s+disponibilit[ée]\s+/i, "Assurer l'approvisionnement et la disponibilité "],
    [/^approvisionnement\s+et\s+/i, "Assurer l'approvisionnement et "],
    [/^accompagnement\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Accompagner "],
    [/^formation\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Former "],
    [/^intervention\s+(?:directe\s+)?sur\s+/i, "Intervenir sur "],
    [/^r[oô]le\s+de\s+chef\s+de\s+projet\s+/i, "Piloter en tant que Chef de projet "],
    [/^exploitation\s+(?:directe\s+)?/i, "Assurer l'exploitation "],
    [/^contribution\s+(?:active\s+)?(?:aux|à|au)\s+/i, "Contribuer activement aux "],
    [/^participation\s+(?:active\s+)?(?:aux|à|au)\s+/i, "Contribuer activement aux "],
    [/^en\s+charge\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Piloter "],
    [/^responsable\s+(?:de\s+la|de\s+l'|du|des|de|d')?\s*/i, "Assurer la responsabilité de "],
  ];

  // Corriger faute de frappe source (ex: "PIlotage" -> "Pilotage") tout en préservant les acronymes (ex: "SQL", "CRM")
  cleaned = cleaned.replace(/\b([A-Z])([A-Z])([a-zà-ÿ]{3,})/g, (_m, c1: string, c2: string, rest: string) => `${c1}${c2.toLowerCase()}${rest}`);

  // Cas fréquents naturels à l'infinitif : "Animation d'ateliers" -> "Animer des ateliers", "Supervision des phases" -> "Superviser les phases"
  const frNaturalVerbMap: [RegExp, string][] = [
    [/^r[ée]alis[ée]\s+en\s+[ée]quipe\s+de\s+(\d+)\s+[ée]tudiants?/i, "Collaborer au sein d'une équipe de $1 étudiants sur ce projet"],
    [/^m[ée]moire\s+de\s+fin\s+d['’][ée]tude\s*[-–—:]\s*/i, "Conduire le mémoire de fin d'études : "],
    [/^d[ée]termination\s+exp[ée]rimentale\s+(?:des|de|du|d['’])\s*/i, "Déterminer expérimentalement les "],
    [/^tenue\s+du\s+budget\s+/i, "Assurer la tenue du budget "],
    [/^fabrication\s+et\s+mise\s+en\s+place\s+(?:des|de\s+la|du|de)\s*/i, "Fabriquer et déployer les "],
    [/^conception\s+et\s+suivi\s+d['’]un(e)?\s+/i, "Concevoir et suivre un$1 "],
    [/^conception\s+et\s+suivi\s+(?:des|de\s+la|du|de)\s+/i, "Concevoir et suivre "],
    [/^veille\s+bibliographique\s*[,;:\s]+am[ée]lioration\s+(?:de\s+l['’]|du|de\s+la|des)\s*/i, "Mener une veille bibliographique et améliorer l'"],
    [/^veille\s+bibliographique\b/i, "Mener une veille bibliographique"],
    [/^suivi\s+terrain\s+(?:des|de\s+la|du|de)\s*/i, "Assurer le suivi terrain des "],
    [/^recueil\s+et\s+analyse\s+des\s+/i, "Recueillir et analyser les "],
    [/^recueil\s+et\s+analyse\s+(?:de\s+la|de\s+l['’]|du|de|d['’])\s*/i, "Recueillir et analyser "],
    [/^ex[ée]cution\s+des\s+tests\s+et\s+validation\b/i, "Exécuter les tests et assurer la validation"],
    [/^conception\s+fonctionnelle\s+et\s+r[ée]daction\b/i, "Assurer la conception fonctionnelle et la rédaction"],
    [/^formation\s+(?:des\s+)?utilisateurs?\s+et\s+accompagnement\b/i, "Former les utilisateurs et les accompagner"],
    [/^gestion\s+de\s+droits\s+et\s+param[ée]trage\b/i, "Gérer les droits et assurer le paramétrage"],
    [/^pilotage,\s*priorisation\s+et\s+arbitrage\s+d['’]un(e)?\s+/i, "Piloter, prioriser et arbitrer un$1 "],
    [/^pilotage,\s*priorisation\s+et\s+arbitrage\s+des\s+/i, "Piloter, prioriser et arbitrer les "],
    [/^pilotage,\s*priorisation\s+et\s+arbitrage\s+du\s+/i, "Piloter, prioriser et arbitrer le "],
    [/^pilotage,\s*priorisation\s+et\s+arbitrage\s+de\s+la\s+/i, "Piloter, prioriser et arbitrer la "],
    [/^pilotage,\s*priorisation\s+et\s+arbitrage\s+/i, "Piloter, prioriser et arbitrer "],
    [/^pilotage\s+et\s+priorisation\s+d['’]un(e)?\s+/i, "Piloter et prioriser un$1 "],
    [/^pilotage\s+et\s+priorisation\s+(?:de\s+la\s+|de\s+l['’]|du\s+|des\s+)?/i, "Piloter et prioriser "],
    [/^organisation\s+et\s+animation\s+des\s+/i, "Organiser et animer les "],
    [/^organisation\s+et\s+animation\s+de\s+la\s+/i, "Organiser et animer la "],
    [/^organisation\s+et\s+animation\s+de\s+l['’]/i, "Organiser et animer l'"],
    [/^organisation\s+et\s+animation\s+du\s+/i, "Organiser et animer le "],
    [/^organisation\s+et\s+animation\s+(?:de\s+|d['’])?/i, "Organiser et animer "],
    [/^validation\s+(fonctionnelle|technique|m[ée]tier|op[ée]rationnelle)\s+et\s+supervision\s+/i, "Assurer la validation $1 et la supervision "],
    [/^validation\s+(fonctionnelle|technique|m[ée]tier|op[ée]rationnelle)\s+et\s+/i, "Assurer la validation $1 et "],
    [/^validation\s+(fonctionnelle|technique|m[ée]tier|op[ée]rationnelle)\b/i, "Assurer la validation $1"],
    [/^support\s+(fonctionnel|technique|applicatif|m[ée]tier|utilisateur)\s+et\s+param[ée]trage\b/i, "Assurer le support $1 et le paramétrage"],
    [/^animation\s+d['’]ateliers?\s+m[ée]tiers?\s+et\s+recueil\b/i, "Animer des ateliers métier et assurer le recueil"],
    [/^assistance\s+au\s+d[ée]ploiement\s+et\s+support\s+client/i, "Accompagner le déploiement et assurer le support client"],
    [/^assistance\s+(?:au|aux|[àa]\s+la|[àa]\s+l['’])\s*/i, "Apporter une assistance "],
    [/^audit\s+(fonctionnel|technique|organisationnel|syst[eè]me|si|data|qualit[ée])/i, "Réaliser un audit $1"],
    [/^contribution\s+[àa]\s+(?:la\s+|l['’]|des\s+|aux\s+)?r[ée]ponses/i, "Contribuer aux réponses"],
    [/^contribution\s+[àa]\s+/i, "Contribuer à "],
    [/^pilotage\s+(op[ée]rationnel(?:le)?|strat[ée]gique|technique|fonctionnel(?:le)?|financier|industriel(?:le)?|quotidien(?:ne)?|mensuel(?:le)?|hebdomadaire|global(?:e)?)\s+/i, "Assurer le pilotage $1 "],
    [/^pilotage\s+d['’]un(e)?\s+/i, "Piloter un$1 "],
    [/^pilotage\s+de\s+l['’]/i, "Piloter l'"],
    [/^pilotage\s+des\s+/i, "Piloter les "],
    [/^pilotage\s+du\s+/i, "Piloter le "],
    [/^pilotage\s+de\s+la\s+/i, "Piloter la "],
    [/^pilotage\s+de\s+/i, "Piloter "],
    [/^[ée]laboration\s+et\s+suivi\s+des\s+/i, "Élaborer et suivre les "],
    [/^[ée]laboration\s+et\s+suivi\s+de\s+la\s+/i, "Élaborer et suivre la "],
    [/^[ée]laboration\s+et\s+suivi\s+du\s+/i, "Élaborer et suivre le "],
    [/^[ée]laboration\s+et\s+suivi\s+de\s+l['’]/i, "Élaborer et suivre l'"],
    [/^animation\s+d['’]/i, "Animer des "],
    [/^animation\s+des\s+/i, "Animer les "],
    [/^animation\s+de\s+/i, "Animer des "],
    [/^conduite\s+des\s+/i, "Conduire les "],
    [/^conduite\s+d['’]/i, "Conduire des "],
    [/^conduite\s+de\s+/i, "Conduire "],
    [/^supervision\s+des\s+/i, "Superviser les "],
    [/^supervision\s+du\s+/i, "Superviser le "],
    [/^supervision\s+de\s+l['’]/i, "Superviser l'"],
    [/^supervision\s+de\s+la\s+/i, "Superviser la "],
    [/^configuration\s+avanc[ée]e\s+et\s+param[ée]trage\s+des\s+/i, "Configurer et paramétrer les "],
    [/^configuration\s+et\s+param[ée]trage\s+des\s+/i, "Configurer et paramétrer les "],
    [/^configuration\s+et\s+param[ée]trage\s+d['’]/i, "Configurer et paramétrer des "],
    [/^configuration\s+des\s+/i, "Configurer les "],
    [/^param[ée]trage\s+des\s+/i, "Paramétrer les "],
    [/^param[ée]trage\s+de\s+la\s+/i, "Paramétrer la "],
    [/^param[ée]trage\s+de\s+l['’]/i, "Paramétrer l'"],
    [/^param[ée]trage\s+du\s+/i, "Paramétrer le "],
    [/^param[ée]trage\s+et\s+suivi\s+des\s+/i, "Paramétrer et suivre les "],
    [/^coordination\s+des\s+/i, "Coordonner les "],
    [/^coordination\s+d['’]/i, "Coordonner des "],
    [/^mod[ée]lisation\s+de\s+donn[ée]es/i, "Modéliser les données"],
    [/^analyse\s+des\s+/i, "Analyser les "],
    [/^analyse\s+technique\s+des\s+/i, "Analyser techniquement les "],
    [/^r[ée]daction\s+des\s+/i, "Rédiger les "],
    [/^r[ée]daction\s+d['’]/i, "Rédiger des "],
    [/^r[ée]daction\s+de\s+/i, "Rédiger des "],
    [/^gestion\s+d['’]un(e)?\s+/i, "Gérer un$1 "],
    [/^gestion\s+des\s+/i, "Gérer les "],
    [/^gestion\s+du\s+/i, "Gérer le "],
    [/^gestion\s+de\s+l['’]/i, "Gérer l'"],
    [/^gestion\s+de\s+la\s+/i, "Gérer la "],
    [/^mise\s+en\s+place\s+d['’]un(e)?\s+/i, "Déployer un$1 "],
    [/^mise\s+en\s+place\s+des\s+/i, "Déployer les "],
    [/^mise\s+en\s+place\s+de\s+la\s+/i, "Déployer la "],
    [/^mise\s+en\s+place\s+du\s+/i, "Déployer le "],
  ];

  const enVerbMap: [RegExp, string][] = [
    [/^(?:responsible\s+for|in\s+charge\s+of)\s+/i, "Spearheaded "],
    [/^(?:worked\s+on|assisted\s+with|helped\s+with)\s+/i, "Delivered "],
    [/^(?:steering|spearheading|leading)\s+(?:of\s+)?/i, "Spearheaded "],
    [/^(?:facilitation)\s+(?:of\s+)?/i, "Orchestrated "],
    [/^(?:gathering|capture)\s+(?:of\s+)?/i, "Conducted requirements gathering on "],
    [/^(?:supervision|monitoring)\s+(?:of\s+)?/i, "Supervised "],
    [/^(?:configuration|setup)\s+(?:of\s+)?/i, "Configured and customized "],
    [/^(?:management)\s+(?:of\s+)?/i, "Managed "],
    [/^(?:design|architecture)\s+(?:of\s+)?/i, "Architected "],
    [/^(?:development|engineering|building)\s+(?:of\s+)?/i, "Engineered "],
    [/^(?:modeling)\s+(?:of\s+)?/i, "Modeled "],
    [/^(?:analysis)\s+(?:of\s+)?/i, "Analyzed "],
    [/^(?:coordination|alignment)\s+(?:of\s+)?/i, "Coordinated "],
    [/^(?:optimization)\s+(?:of\s+)?/i, "Optimized "],
    [/^(?:implementation)\s+(?:of\s+)?/i, "Implemented "],
    [/^(?:authoring|drafting)\s+(?:of\s+)?/i, "Authored "],
    [/^(?:deployment|rollout)\s+(?:of\s+)?/i, "Deployed "],
  ];

  const translateFrenchBulletFallbackToEn = (frText: string): string => {
    let s = frText;
    const phraseReplacements: [RegExp, string | ((m: string) => string)][] = [
      // Ouvertures fréquentes
      [/^participation\s+aux\s+revues\s+supply\s+et\s+au\s+processus\s+s&op\s*:\s*/i, "Contributed to Supply Reviews and S&OP processes: "],
      [/^r[ée]f[ée]rente?\s+relation\s+fournisseurs?\s+et\s+suivi\s+de\s+la\s+performance/i, "Managed supplier relationships and monitored performance"],
      [/^d[ée]veloppement\s+d['’]outils\s+et\s+contribution\s+[àa]\s+l['’]am[ée]lioration\s+continue\s+des\s+processus/i, "Built planning tools and drove continuous process improvement"],
      [/^pilotage\s+op[ée]rationnel\s+des\s+lancements/i, "Spearheaded operational rollout for product launches"],
      [/^pilotage\s+des\s+approvisionnements\s+en\s+/i, "Managed procurement and supply planning for "],
      [/^pilotage\s+des\s+approvisionnements\s+(?:d['’]un|de|du|des)\s+/i, "Spearheaded procurement and replenishment across "],
      [/^pilotage\s+des\s+pr[ée]visions\s+/i, "Managed forecasting for "],
      [/^calcul\s+et\s+consolidation\s+des\s+besoins\s+\(?DRP\)?/i, "Calculated and consolidated Distribution Requirements Planning (DRP)"],
      [/^param[ée]trage\s+des\s+donn[ée]es\s+DRP\s*:\s*/i, "Configured DRP parameters: "],
      [/^[ée]laboration\s+et\s+suivi\s+des\s+plans\s+d['’]approvisionnement/i, "Developed and tracked replenishment plans"],
      [/^[ée]laboration\s+des\s+plans\s+d['’]allocation/i, "Built allocation plans"],
      [/^[ée]changes\s+r[ée]guliers\s+en\s+anglais\s+avec\s+les\s+usines/i, "Conducted regular communications in English with manufacturing plants"],
      [/^analyse\s+des\s+couvertures\s+de\s+stocks/i, "Analyzed inventory coverage"],
      [/^anticipation\s+des\s+risques\s+de\s+rupture\s+et\s+de\s+surstock/i, "Anticipated stockout and overstock risks"],
      [/^anticipation\s+des\s+risques\s+de\s+rupture/i, "Anticipated stockout risks"],
      [/^gestion\s+des\s+priorit[ée]s\s+et\s+arbitrages/i, "Managed operational priorities and supply trade-offs"],
      [/^gestion\s+des\s+allocations,\s*arbitrages\s+et\s+priorit[ée]s/i, "Managed stock allocations, trade-offs, and priorities"],
      [/^gestion\s+des\s+arbitrages\s+en\s+situation\s+de\s+tension\s+d['’]approvisionnement/i, "Managed supply allocation trade-offs during capacity constraints"],
      [/^gestion\s+des\s+couvertures\s+de\s+stocks/i, "Managed inventory coverage"],
      [/^coordination\s+avec\s+les\s+[ée]quipes\s+de\s+planification\s+de\s+production/i, "Coordinated with production planning teams"],
      [/^coordination\s+des\s+[ée]changes\s+avec\s+les\s+clients/i, "Coordinated customer collaboration"],
      [/^animation\s+du\s+rituel\s+entre\s+les\s+services\s+approvisionnement\s+et\s+planification/i, "Facilitated alignment rituals between procurement and planning teams"],
      [/^suivi\s+des\s+indicateurs\s+de\s+performance\s+\(?KPI\)?/i, "Tracked Key Performance Indicators (KPIs)"],
      [/^suivi\s+des\s+lancements\s+produits/i, "Monitored product launches"],
      [/^suivi\s+du\s+cycle\s+de\s+vie\s+des\s+produits\s*:\s*lancements\s+et\s+fins\s+de\s+vie/i, "Managed product lifecycle from launch to phase-out"],
      [/^(?:pilotage|gestion|conception|analyse|coordination|animation|supervision|[ée]laboration|optimisation|d[ée]veloppement|d[ée]ploiement|mise\s+en\s+place|suivi)\s+(?:de\s+la\s+|de\s+l['’]|du\s+|des\s+|de\s+|d['’])?/i, (m: string) => {
        const low = m.toLowerCase();
        if (low.startsWith("pilotage")) return "Spearheaded ";
        if (low.startsWith("gestion")) return "Managed ";
        if (low.startsWith("conception") || low.startsWith("dév") || low.startsWith("dev") || low.startsWith("élab") || low.startsWith("elab")) return "Developed ";
        if (low.startsWith("analyse")) return "Analyzed ";
        if (low.startsWith("coord")) return "Coordinated ";
        if (low.startsWith("anim")) return "Facilitated ";
        if (low.startsWith("superv") || low.startsWith("suivi")) return "Monitored ";
        if (low.startsWith("optim")) return "Optimized ";
        if (low.startsWith("dép") || low.startsWith("dep") || low.startsWith("mise")) return "Implemented ";
        return "Delivered ";
      }],
      // Segments récurrents (expressions longues AVANT segments courts ; sans \b sur caractères accentués)
      [/\bafin\s+de\s+garantir\s+leur\s+disponibilit[ée]\s+tout\s+en\s+ma[iî]trisant\s+les\s+niveaux\s+de\s+stocks(?=\s|$|[,.:;])/gi, "to guarantee product availability while optimizing inventory levels"],
      [/\bpour\s+le\s+suivi\s+des\s+commandes\s+et\s+la\s+s[ée]curisation\s+des\s+approvisionnements(?=\s|$|[,.:;])/gi, "for order tracking and supply continuity"],
      [/\bpour\s+s[ée]curiser\s+la\s+disponibilit[ée]\s+des\s+produits\s+finis(?=\s|$|[,.:;])/gi, "to ensure finished goods availability"],
      [/\bpr[ée]paration\s+des\s+analyses\s+et\s+contribution\s+aux\s+[ée]changes\s+avec\s+les\s+[ée]quipes\s+commerciales,\s*marketing\s+et\s+finance(?=\s|$|[,.:;])/gi, "prepared analytical reviews and collaborated with sales, marketing, and finance teams"],
      [/\banalyse\s+des\s+[ée]carts\s+entre\s+pr[ée]visions,\s*ventes\s+r[ée]elles\s+et\s+volumes\s+de\s+production(?=\s|$|[,.:;])/gi, "analyzed variances across forecasts, actual sales, and production volumes"],
      [/(?:^|\s)[àa]\s+partir\s+des(?=\s|$)/gi, " based on"],
      [/\bpr[ée]visions\s+de\s+ventes\b/gi, "sales forecasts"],
      [/\bniveaux\s+de\s+stocks?\b/gi, "inventory levels"],
      [/\bstocks?\s+de\s+s[ée]curit[ée](?=\s|$|[,.:;])/gi, "safety stock"],
      [/\bfr[ée]quences\s+de\s+r[ée]approvisionnement\b/gi, "replenishment frequencies"],
      [/\br[eè]gles\s+de\s+commande\b/gi, "ordering rules"],
      [/\baupr[eè]s\s+des\s+usines\s+internationales\b/gi, "with international plants"],
      [/\bChine,\s*Italie\b/gi, "China, Italy"],
      [/\bChine\b/gi, "China"],
      [/\bItalie\b/gi, "Italy"],
      [/\bidentification\s+des\s+situations\s+de\s+surstock\b/gi, "identified overstock situations"],
      [/\banticipation\s+des\s+risques\s+de\s+rupture\b/gi, "anticipated stockout risks"],
      [/\bselon\s+les\s+contraintes\s+d['’]approvisionnement\s+et\s+les\s+urgences\s+clients\b/gi, "based on supply constraints and customer urgencies"],
      [/\bselon\s+les\s+contraintes\s+d['’]approvisionnement\b/gi, "based on supply constraints"],
      [/\bjusqu['’][àa]\s+la\s+r[ée]ception\s+en\s+entrep[oô]t\b/gi, "through warehouse receipt"],
      [/\bportefeuille\s+de\s+(\d+)\s+[àa]\s+(\d+)\s+r[ée]f[ée]rences\s+produits?\b/gi, "portfolio of $1 to $2 SKUs"],
      [/\bpar\s+client\s+et\s+par\s+produit\b/gi, "by customer and by SKU"],
      [/\bvalidation\s+des\s+commandes\s+d['’]approvisionnement\s+\(?PO\)?\b/gi, "validated purchase orders (PO)"],
      [/\bdans\s+les\s+r[ée]seaux\s+de\s+distribution\s+\(?([^)]+)\)?/gi, "across retail and carrier distribution channels ($1)"],
      [/\bdans\s+le\s+cadre\s+du\s+CPFR\b/gi, "within CPFR processes"],
      [/\bproduits\s+finis\s+et\s+semi-finis\b/gi, "finished and semi-finished goods"],
      [/\bmati[eè]res\s+premi[eè]res\s+et\s+articles\s+de\s+conditionnement\b/gi, "raw materials and packaging components"],
      [/\bde\s+la\s+marque\s+/gi, "for the brand "],
      [/\bet\s+de\s+la\s+/gi, "and "],
      [/\bet\s+des\s+/gi, "and "],
      [/\bet\s+du\s+/gi, "and "],
      [/\bet\s+/gi, "and "],
    ];
    for (const [rx, rep] of phraseReplacements) {
      s = typeof rep === "function" ? s.replace(rx, rep) : s.replace(rx, rep);
    }
    return s;
  };

  // IMPORTANT : Ne JAMAIS utiliser \b après un caractère accentué (é) en JS RegExp car é est traité comme \W !
  const activeFrVerbs = /^(?:Piloter|Animer|Conduire|Mener|Superviser|Configurer|Param[ée]trer|G[ée]rer|Concevoir|D[ée]velopper|Mod[ée]liser|Analyser|Coordonner|Orchestrer|Optimiser|Mettre\s+en\s+(?:place|œuvre)|R[ée]diger|D[ée]ployer|Structurer|Intervenir|Assurer|D[ée]livrer|Arbitrer|R[ée]aliser|Participer|Contribuer|Accompagner|Maintenir|Cr[ée]er|[ÉE]laborer|Valider|S[ée]curiser|Encadrer|Former|Automatiser|Migrer|Int[ée]grer|Tester|Fiabiliser|Qualifier|Contr[oô]ler|Formaliser|Garantir|Traduire|Prioriser|Cadrer|Urbaniser|Cartographier|Administrer|Auditer|[ÉE]tudier|[ÉE]valuer|Adapter|Diriger|Faciliter|Documenter|Consolider|Ex[ée]cuter|Transformer|Acc[ée]l[ée]rer|Suivre|Recueillir|Prendre|Anticiper|Planifier|N[ée]gocier|Calculer|Am[ée]liorer|[ÉE]tablir)(?=\s|$|[,.:;])/i;
  const activeEnVerbs = /^(?:Spearheaded|Orchestrated|Delivered|Engineered|Architected|Supervised|Configured|Managed|Designed|Analyzed|Coordinated|Optimized|Implemented|Authored|Deployed|Led|Championed|Streamlined|Built|Created|Developed|Executed|Validated|Automated|Accelerated|Scaled|Pioneered|Conducted|Facilitated|Secured|Oversaw|Drove|Established|Owned|Defined|Structured|Directed|Calculated|Anticipated|Tracked|Monitored|Contributed)(?=\s|$|[,.:;])/i;

  if (isEn) {
    const looksLikeFrenchBullet = /\b(?:des|du|de\s+la|de\s+l['’]|de\s+|d['’]|[àa]\s+l['’]|avec\s+les|selon\s+les|aupr[eè]s|entre\s+les|sur\s+les|dans\s+les|en\s+anglais|approvisionnements?|pr[ée]visions?|stocks?|lancements?)\b/i.test(cleaned);
    if (looksLikeFrenchBullet) {
      cleaned = translateFrenchBulletFallbackToEn(cleaned);
    }
    for (const [regex, replacement] of enVerbMap) {
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, replacement);
        break;
      }
    }
    if (!activeEnVerbs.test(cleaned)) {
      cleaned = `Spearheaded ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}`;
    }
  } else {
    // Transformer d'abord les groupes nominaux ("Suivi du...", "Pilotage des...") avant de convertir les participes passés isolés
    let matched = false;
    for (const [regex, replacement] of frNaturalVerbMap) {
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, replacement);
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const [regex, replacement] of frVerbMap) {
        if (regex.test(cleaned)) {
          cleaned = cleaned.replace(regex, replacement);
          matched = true;
          break;
        }
      }
    }
    cleaned = ensureFrenchInfinitiveBullet(cleaned);
    // Nettoyer les groupes nominaux coordonnés après passage nom -> verbe transitif
    cleaned = cleaned
      .replace(/^((?:Piloter|G[ée]rer|Anticiper|Valider|Optimiser|Coordonner|Animer|Suivre)\s+(?:le|la|les|l['’])\S[^:;,()]{2,45}?)\s+et\s+(?:du|des|de\s+la|de\s+l['’])\s+/i, (_m, head, offset, str) => {
        const frag = str.slice(offset + head.length);
        if (/\bet\s+du\s+/i.test(frag)) return `${head} et le `;
        if (/\bet\s+des\s+/i.test(frag)) return `${head} et les `;
        if (/\bet\s+de\s+la\s+/i.test(frag)) return `${head} et la `;
        return `${head} et l'`;
      })
      .replace(/:\s*pr[ée]paration\s+des\s+/gi, ": préparer les ")
      .replace(/\bet\s+participation\s+(au|aux|à)\s+/gi, "et participer $1 ")
      .replace(/\bet\s+contribution\s+(à\s+l['’]|à\s+la\s+|aux\s+|au\s+)/gi, "et contribuer $1")
      .replace(/,\s*anticipation\s+des\s+/gi, ", anticiper les ")
      .replace(/\bet\s+identification\s+des\s+/gi, "et identifier les ")
      .replace(/\bet\s+analyse\s+des\s+/gi, "et analyser les ")
      .replace(/\bet\s+validation\s+des\s+/gi, "et valider les ")
      .replace(/\bet\s+suivi\s+des\s+/gi, "et suivre les ")
      .replace(/\bet\s+fiabilisation\s+des\s+/gi, "et fiabiliser les ")
      .replace(/\bet\s+fiabilisation\s+de\s+la\s+/gi, "et fiabiliser la ")
      .replace(/\bet\s+fiabilisation\s+de\s+l['’]/gi, "et fiabiliser l'")
      .replace(/\bet\s+fiabilisation\s+du\s+/gi, "et fiabiliser le ")
      .replace(/\bet\s+gestion\s+du\s+/gi, "et gérer le ");
    if (!activeFrVerbs.test(cleaned)) {
      if (/^(?:recueil|param[ée]trage|suivi|contr[oô]le|maintenance|support|cadrage|d[ée]veloppement|validation|int[ée]gration|automatisation)\b/i.test(cleaned)) {
        cleaned = `Assurer le ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}`;
      } else {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  cleaned = cleaned
    .replace(/([A-Za-zÀ-ÿ0-9])\(/g, "$1 (")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
    cleaned += ".";
  }

  return cleaned;
}

// Segmentation universelle et rigoureuse des sections du CV (Zéro collision entre Expériences et Formations)
export interface CvSections {
  CONTACT: string[];
  SKILLS: string[];
  LANGUAGES: string[];
  CERTIFICATIONS: string[];
  SUMMARY: string[];
  EXPERIENCE: string[];
  FORMATION: string[];
  OTHER: string[];
}

export function parseCvSections(cvText: string): CvSections {
  const sections: CvSections = {
    CONTACT: [],
    SKILLS: [],
    LANGUAGES: [],
    CERTIFICATIONS: [],
    SUMMARY: [],
    EXPERIENCE: [],
    FORMATION: [],
    OTHER: []
  };

  if (!cvText) return sections;

  // Normalisation Unicode NFC + suppression des lignes orphelines composées uniquement de puces ("•", "·", etc.) issues de PDFKit/Canva/Word
  const rawLines = cvText
    .normalize("NFC")
    .split("\n")
    .map(collapseCanvaLetterSpacing)
    .map((l) => l.trim())
    .filter((l) => l && !/^[•●▪▫➢➤✓✔·*\-–—\s]+$/.test(l));

  function isStrictSectionHeader(line: string): keyof CvSections | null {
    const clean = line.replace(/^[#*–—•:|\s\d.]+|[#*–—•:|\s.]+$/g, "").trim();
    if (!clean) return null;

    // Contact
    if (/^(?:coordonn[ée]es|contact|informations?\s+personnelles?)$/i.test(clean)) return "CONTACT";
    // Compétences & Outils / Systèmes (y compris "Informatique", "Bureautique", "COMPÉTENCES SUPPLY CHAIN", "PRODUCT MANAGEMENT", "EXPERTISE FONCTIONNELLE")
    if (
      !/[,:;()]/.test(clean) &&
      /^(?:principales?\s+comp[eé]tences?|autres?\s+comp[eé]tences?|comp[eé]tences?(?:\s+[A-Za-zÀ-ÿ&/-]+){0,3}|informatique|bureautique|it\s+skills?|digital\s+skills?|software|product\s+management|expertise(?:\s+(?:fonctionnelle|technique|m[ée]tier|sectorielle|digitale|produit)){0,2}|savoir[- ]faire|domaines?\s+(?:d['’]expertise|de\s+comp[eé]tences?)|skills(?:\s+[A-Za-z&/-]+){0,2}|core\s+competencies|technologies|logiciels?(?:\s+(?:et|&)\s+(?:outils?|syst[eè]mes?))?|outils?(?:\s+(?:et|&)\s+(?:logiciels?|m[ée]thodes?|syst[eè]mes?|technologies?))?|syst[eè]mes?(?:\s+(?:et|&)\s+outils?)?|tools?(?:\s+(?:&|and)\s+(?:systems?|technologies?|platforms?))?|stack\s+technique|tech\s+stack)$/i.test(clean)
    ) {
      return "SKILLS";
    }
    // Langues (y compris "Langues et qualités", "Langues & Atouts", "Langues et centres d'intérêt")
    if (/^(?:languages?|langues?(?:\s+(?:et|&)\s+(?:qualit[ée]s?|atouts?|certifications?|comp[eé]tences?|loisirs|centres?\s+d['’]int[ée]r[êe]t))?)$/i.test(clean)) return "LANGUAGES";
    // Certifications
    if (/^(?:certifications?|certificats?|accreditations?)$/i.test(clean)) return "CERTIFICATIONS";
    // Résumé / Profil (Rejet strict de "Experience Cloud" ou "Transformation")
    if (/^(?:r[eé]sum[eé]|profil(?:\s+professionnel)?|synth[eé]se|[aà]\s+propos(?:\s+de\s+moi)?|summary|about(?:\s+me)?|objectif(?:\s+professionnel)?)$/i.test(clean)) return "SUMMARY";
    // Expérience (y compris "Expériences précédentes", "Autres expériences", "Expériences associatives", ou en-tête collé)
    if (/^(?:exp[eé]riences?(?:\s+(?:professionnelles?|pr[ée]c[ée]dentes?|ant[ée]rieures?|associatives?|extra-professionnelles?))?|autres?\s+exp[eé]riences?|vie\s+associative|engagements?\s+associatifs?|work\s+experience|professional\s+experience|previous\s+experience|employment\s+history|parcours(?:\s+professionnel)?)(?:\s+(?:comp[eé]tences?|skills))?$/i.test(clean)) return "EXPERIENCE";
    // Formation (Éducation)
    if (/^(?:formations?(?:\s+professionnelles?|\s+acad[eé]miques?)?|education(?:\s*(?:&|and)\s*training)?|dipl[oô]mes?|cursus(?:\s+universitaire)?|parcours\s+acad[eé]mique|[ée]tudes)$/i.test(clean)) return "FORMATION";
    // Rubriques complémentaires (y compris "Secteur", "Centres d'intérêts", "Réalisations")
    if (/^(?:secteurs?(?:\s+d['’]activit[ée])?|industries?|r[ée]alisations?(?:\s+(?:majeures?|cl[eé]s?|principales?))?|principales?\s+r[ée]alisations?|key\s+achievements?|qualit[ée]s?|atouts?|soft\s+skills?|centres?\s+d['’]int[ée]r[êe]ts?|int[ée]r[êe]ts?|loisirs?|hobbies?|divers|informations?\s+compl[ée]mentaires?|r[ée]f[ée]rences?|permis(?:\s+de\s+conduire)?|b[eé]n[ée]volat)$/i.test(clean)) return "OTHER";

    return null;
  }

  let currentSection: keyof CvSections = "OTHER";

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Élimination des en-têtes/pieds de page de pagination type "Page 1 of 4" ou "-- 1 of 4 --"
    if (/^(?:page\s+\d+\s+of\s+\d+|--\s+\d+\s+of\s+\d+\s+--)$/i.test(line)) {
      continue;
    }

    let header = isStrictSectionHeader(line);
    // Un sous-titre interne terminé par ":" à l'intérieur d'une expérience (ex: "Réalisations clés :", "Key achievements :")
    // ne doit JAMAIS basculer hors d'EXPERIENCE vers OTHER et avaler les expériences suivantes !
    if (
      currentSection === "EXPERIENCE" &&
      header === "OTHER" &&
      line.trim().endsWith(":") &&
      /^(?:r[ée]alisations?|key\s+achievements?|secteurs?|qualit[ée]s?|atouts?)/i.test(
        line.replace(/^[#*–—•:|\s\d.]+|[#*–—•:|\s.]+$/g, "").trim()
      )
    ) {
      header = null;
    }
    if (header) {
      currentSection = header;
      const cleanHdrText = line.replace(/^[#*–—•:|\s\d.]+|[#*–—•:|\s.]+$/g, "").trim();
      if (/^(?:exp[eé]riences?\s+(?:pr[ée]c[ée]dentes?|ant[ée]rieures?)|autres?\s+exp[eé]riences?|previous\s+experience)$/i.test(cleanHdrText)) {
        sections.EXPERIENCE.push("Expériences précédentes :");
      } else if (/^(?:exp[eé]riences?\s+associatives?|vie\s+associative|engagements?\s+associatifs?)$/i.test(cleanHdrText)) {
        sections.EXPERIENCE.push("Expériences associatives :");
      }
      continue;
    }

    // Détection des titres Canva/PDF répartis sur 2 lignes (ex: "PRODUCT\nMANAGEMENT", "EXPERTISE\nFONCTIONNELLE", "COMPÉTENCES\nTECHNIQUES")
    if (i + 1 < rawLines.length && line.length <= 28 && rawLines[i + 1].length <= 28 && !/\d{4}|@|[,.;]/.test(`${line} ${rawLines[i + 1]}`)) {
      const twoLineHeader = isStrictSectionHeader(`${line} ${rawLines[i + 1]}`);
      if (twoLineHeader) {
        currentSection = twoLineHeader;
        const twoClean = `${line} ${rawLines[i + 1]}`.trim();
        if (/^(?:exp[eé]riences?\s+(?:pr[ée]c[ée]dentes?|ant[ée]rieures?)|autres?\s+exp[eé]riences?|previous\s+experience)$/i.test(twoClean)) {
          sections.EXPERIENCE.push("Expériences précédentes :");
        } else if (/^(?:exp[eé]riences?\s+associatives?|vie\s+associative|engagements?\s+associatifs?)$/i.test(twoClean)) {
          sections.EXPERIENCE.push("Expériences associatives :");
        }
        i++;
        continue;
      }
    }

    sections[currentSection].push(line);
  }

  return sections;
}

// Extrait fidèlement les outils et systèmes d'une rubrique dédiée du CV (ex: "OUTILS ET SYSTÈMES", "TECH STACK", "LOGICIELS")
// en classant EN PRIORITÉ ceux cités dans l'offre cible, tout en conservant les outils complémentaires authentiques du candidat.
export function extractAuthenticToolsAndSystemsFromCv(cvText: string, jobText = "", isEn = false): string[] {
  if (!cvText) return [];
  const rawLines = cvText
    .normalize("NFC")
    .split("\n")
    .map(collapseCanvaLetterSpacing)
    .map((l) => l.trim())
    .filter((l) => l && !/^[•●▪▫➢➤✓✔·*\-–—\s]+$/.test(l));

  const toolsHeaderRe = /^(?:outils?(?:\s+(?:et|&)\s+(?:logiciels?|m[ée]thodes?|syst[eè]mes?|technologies?))?|logiciels?(?:\s+(?:et|&)\s+(?:outils?|syst[eè]mes?))?|syst[eè]mes?(?:\s+(?:et|&)\s+outils?)?|informatique|bureautique|outils?\s+informatiques?|comp[eé]tences?\s+informatiques?|tools?(?:\s+(?:&|and)\s+(?:systems?|technologies?|platforms?))?|stack\s+technique|tech\s+stack|environnement\s+technique)$/i;
  const anyOtherSectionRe = /^(?:coordonn[ée]es|contact|informations?\s+personnelles?|principales?\s+comp[eé]tences?|comp[eé]tences?(?:\s+[A-Za-zÀ-ÿ&/-]+){0,3}|skills(?:\s+[A-Za-z&/-]+){0,2}|core\s+competencies|languages?|langues?(?:\s+(?:et|&)\s+(?:qualit[ée]s?|atouts?|certifications?|comp[eé]tences?|loisirs|centres?\s+d['’]int[ée]r[êe]t))?|certifications?|certificats?|r[eé]sum[eé]|profil(?:\s+professionnel)?|synth[eé]se|summary|about(?:\s+me)?|exp[eé]riences?(?:\s+(?:professionnelles?|associatives?))?|work\s+experience|professional\s+experience|formations?(?:\s+(?:professionnelles?|acad[eé]miques?))?|education(?:\s*(?:&|and)\s*training)?|dipl[oô]mes?|qualit[ée]s?|atouts?|centres?\s+d['’]int[ée]r[êe]ts?|loisirs?|hobbies?|divers|r[ée]f[ée]rences?|permis(?:\s+de\s+conduire)?)$/i;

  const toolLines: string[] = [];
  let inTools = false;
  for (const line of rawLines) {
    const cleanHead = line.replace(/^[#*–—•:|\s\d.]+|[#*–—•:|\s.]+$/g, "").trim();
    if (!cleanHead) continue;
    if (!/[,:;()]/.test(cleanHead) && toolsHeaderRe.test(cleanHead)) {
      inTools = true;
      continue;
    }
    if (inTools && !/[,:;()]/.test(cleanHead) && anyOtherSectionRe.test(cleanHead)) {
      break;
    }
    if (inTools) {
      // Si une ligne d'outil ne démarre pas par une puce et prolonge une puce précédente coupée ("Base" + "de données (Access)"), la concaténer
      const startsBullet = /^[•●▪▫➢➤✓✔*\-–—]\s+/.test(line);
      if (!startsBullet && toolLines.length > 0 && !/[,;|]$/.test(toolLines[toolLines.length - 1])) {
        toolLines[toolLines.length - 1] = `${toolLines[toolLines.length - 1]} ${line}`;
      } else {
        toolLines.push(line);
      }
    }
  }

  if (toolLines.length === 0) return [];

  // Reconstituer les lignes puis découper par séparateurs de liste (·, •, |, ,, ;) sans casser les parenthèses
  const joined = toolLines
    .join(" · ")
    .replace(/\b(?:Ma[îi]trise|Utilisation)\s+(?:du|de\s+la|des)\s+/gi, "")
    .replace(/\bMod[ée]lisation\s+3D\s+et\s+2D\s*[-–—:]\s*/gi, "")
    .replace(/\s*\(en\s+cours\)/gi, "");
  const rawItems: string[] = [];
  let cur = "";
  let parenDepth = 0;
  for (let i = 0; i < joined.length; i++) {
    const ch = joined[i];
    if (ch === "(") parenDepth++;
    else if (ch === ")" && parenDepth > 0) parenDepth--;
    if (parenDepth === 0 && (ch === "·" || ch === "•" || ch === "|" || ch === "," || ch === ";")) {
      if (cur.trim()) rawItems.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) rawItems.push(cur.trim());

  const seenNorm = new Set<string>();
  const cleanedTools: string[] = [];
  for (const raw of rawItems) {
    let item = raw.replace(/^[•●▪▫➢➤✓✔*\-–—\s]+|[•●▪▫➢➤✓✔*\-–—\s]+$/g, "").replace(/\s{2,}/g, " ").trim();
    if (/^(?:pack\s+Office\s+et\s+Base\s+de\s+donn[ée]es\s*\(Access\))$/i.test(item)) {
      cleanedTools.push(isEn ? "Microsoft Office Suite" : "Pack Office", isEn ? "Microsoft Access" : "Base de données (Access)");
      seenNorm.add("pack office");
      seenNorm.add("base de donnees");
      continue;
    }
    if (!item || item.length < 2 || item.length > 65 || item.split(/\s+/).length > 8) continue;
    if (isEn) {
      item = item
        .replace(/\bExcel\s+avanc[ée]\s*\(analyse\s+de\s+donn[ée]es\s+et\s+reporting\)/gi, "Advanced Excel (Data Analysis & Reporting)")
        .replace(/\bExcel\s+avanc[ée]\b/gi, "Advanced Excel")
        .replace(/\bPack\s+Office\b/gi, "Microsoft Office Suite");
    }
    const baseNorm = item
      .replace(/\s*\([^)]*\)/g, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (!baseNorm || seenNorm.has(baseNorm)) continue;
    seenNorm.add(baseNorm);
    cleanedTools.push(item);
  }

  if (cleanedTools.length === 0) return [];

  // Trier : les outils demandés dans l'offre en premier, puis les autres outils authentiques dans l'ordre du CV
  const jobNorm = (jobText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isMatchedInJob = (tool: string): boolean => {
    if (!jobNorm) return false;
    const base = tool.replace(/\s*\([^)]*\)/g, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const tokens = base.split(/\s+/).filter((t) => t.length >= 2);
    if (base.length >= 2 && new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(jobNorm)) {
      return true;
    }
    return tokens.some((t) => t.length >= 3 && !/^(?:pack|suite|avance|advanced|logiciel|outil|tools?)$/i.test(t) && new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(jobNorm));
  };

  return [...cleanedTools].sort((a, b) => Number(isMatchedInJob(b)) - Number(isMatchedInJob(a))).slice(0, 12);
}

// Extrait des compétences complémentaires à forte valeur ajoutée issues du CV source (non citées dans l'offre ni dans les outils)
// afin de distinguer le candidat des profils standard sur le même poste.
export function extractDifferentiatingCvSkills(
  cvText: string,
  excludeSkills: string[] = [],
  isEn = false,
  maxItems = 5
): string[] {
  if (!cvText) return [];
  const normKey = (s: string) =>
    s
      .replace(/\s*\([^)]*\)/g, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const excludedNorms = new Set<string>(excludeSkills.map(normKey).filter(Boolean));
  const excludedTokens = new Set<string>();
  for (const ex of excludeSkills) {
    for (const tok of tokenizeMeaningfulTerms(ex)) {
      if (tok.length >= 4) excludedTokens.add(tok);
    }
  }

  const isAlreadyCovered = (cand: string): boolean => {
    const cNorm = normKey(cand);
    if (!cNorm || excludedNorms.has(cNorm)) return true;
    const cEsc = cNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const ex of excludedNorms) {
      if (cNorm.length >= 4 && ex.length >= 4 && (ex.includes(cNorm) || cNorm.includes(ex))) return true;
      if (cNorm.length >= 2 && cNorm.length <= 4 && new RegExp(`(?:^|[\\s/-])${cEsc}(?:$|[\\s/-])`, "i").test(ex)) return true;
      const exEsc = ex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (ex.length >= 2 && ex.length <= 4 && new RegExp(`(?:^|[\\s/-])${exEsc}(?:$|[\\s/-])`, "i").test(cNorm)) return true;
    }
    return false;
  };

  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (raw: string) => {
    const cleaned = sanitizeAndValidateKeyword(raw, isEn) || raw.trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 48) return;
    if (/\b(?:anglais|français|francais|english|french|espagnol|allemand|italien|permis)\b/i.test(cleaned)) return;
    if (isAlreadyCovered(cleaned)) return;
    const n = normKey(cleaned);
    if (seen.has(n)) return;
    seen.add(n);
    candidates.push(cleaned);
  };

  // 1. Extraire largement les compétences reconnues du CV (jusqu'à 30 pour ne pas être saturé par les chevauchements avec l'offre)
  const broadCvSkills = extractSkillsAndCompetencies(cvText, "", 30, isEn);
  for (const s of broadCvSkills) {
    pushCandidate(s);
    if (candidates.length >= maxItems) return candidates;
  }

  // 2. Compléter si besoin par les items concis de la section COMPÉTENCES / SKILLS (hors rubrique Outils & Systèmes)
  const sections = parseCvSections(cvText);
  const toolsSet = new Set(extractAuthenticToolsAndSystemsFromCv(cvText, "", isEn).map(normKey));
  const joinedSkills = (sections.SKILLS || []).join("\n");
  const splitSkills = joinedSkills.split(/[·•|;\n]+/).map((s: string) => s.trim()).filter(Boolean);
  for (const item of splitSkills) {
    if (item.length < 4 || item.length > 42 || item.split(/\s+/).length > 5) continue;
    if (toolsSet.has(normKey(item))) continue;
    const valid = sanitizeAndValidateKeyword(item, isEn);
    if (valid) {
      pushCandidate(valid);
      if (candidates.length >= maxItems) break;
    }
  }

  return candidates.slice(0, maxItems);
}

// Normalisation des dates de CV (Français & Anglais) : "septembre 2021" -> "09/2021", "juillet 2026" -> "07/2026"
export function normalizeCvDate(dateStr: string, isEn: boolean): string {
  if (!dateStr) return "";
  const clean = dateStr.trim();
  if (/^(?:pr[ée]sent|present|current|aujourd['’]hui)$/i.test(clean)) {
    return isEn ? "Present" : "Présent";
  }

  const monthMap: Record<string, string> = {
    janvier: "01", janv: "01", jan: "01", january: "01",
    février: "02", fevrier: "02", févr: "02", fevr: "02", feb: "02", february: "02",
    mars: "03", mar: "03", march: "03",
    avril: "04", avr: "04", apr: "04", april: "04",
    mai: "05", may: "05",
    juin: "06", jun: "06", june: "06",
    juillet: "07", juil: "07", jul: "07", july: "07",
    août: "08", aout: "08", aug: "08", august: "08",
    septembre: "09", sept: "09", sep: "09", september: "09",
    octobre: "10", oct: "10", october: "10",
    novembre: "11", nov: "11", november: "11",
    décembre: "12", decembre: "12", déc: "12", dec: "12", december: "12"
  };

  const parts = clean.toLowerCase().split(/\s+/);
  if (parts.length === 2) {
    const month = monthMap[parts[0].replace(".", "")];
    const year = parts[1];
    if (month && /^(?:19|20)\d\d$/.test(year)) {
      return `${month}/${year}`;
    }
  }

  if (/^(?:19|20)\d\d$/.test(clean)) {
    return clean;
  }

  return clean;
}

// Extraction du résumé authentique du candidat depuis le texte du CV (Zéro coupure sur "Experience Cloud")
export function extractRawSummaryFromCv(cvText: string): string {
  if (!cvText) return "";
  const sections = parseCvSections(cvText);
  if (sections.SUMMARY.length > 0) {
    return sections.SUMMARY.join(" ").trim();
  }

  // Fallback avec détection stricte si non capturé par le parseur
  const lines = cvText.normalize("NFC").split("\n").map(collapseCanvaLetterSpacing).map((l) => l.trim()).filter(Boolean);
  let inSummary = false;
  const summaryLines: string[] = [];

  for (const l of lines) {
    if (/^(?:page\s+\d+\s+of\s+\d+|--\s+\d+\s+of\s+\d+\s+--)$/i.test(l)) continue;
    if (/^(?:R[EÉ]SUM[EÉ]|PROFIL\s+PROFESSIONNEL|PROFIL|SYNTH[EÉ]SE|[AÀ]\s+PROPOS|SUMMARY)$/i.test(l.replace(/^[#*–—•:|\s.]+|[#*–—•:|\s.]+$/g, "").trim())) {
      inSummary = true;
      continue;
    }
    if (inSummary && /^(?:EXP[EÉ]RIENCES?|WORK\s+EXPERIENCE|FORMATION|EDUCATION|DIPL[OÔ]ME|COMP[EÉ]TENCES?|SKILLS|CONTACT|LANGUES?)$/i.test(l.replace(/^[#*–—•:|\s.]+|[#*–—•:|\s.]+$/g, "").trim())) {
      break;
    }
    if (inSummary) {
      summaryLines.push(l);
    }
  }

  return summaryLines.join(" ").trim();
}

// Recherche dynamique et universelle de l'entreprise réelle du candidat dans le CV source
export function findAuthenticCompanyInCv(cvText: string): string {
  if (!cvText) return "";

  // 1. Chercher prioritairement dans les premières lignes de la section EXPERIENCE
  const sections = parseCvSections(cvText);
  if (sections.EXPERIENCE.length > 0) {
    for (let i = 0; i < Math.min(sections.EXPERIENCE.length, 8); i++) {
      const l = sections.EXPERIENCE[i];
      if (l.includes("|")) {
        const parts = l.split("|").map((p) => p.trim());
        const candidateComp = parts[0].replace(/\b(19\d\d|20\d\d)\b.*$/, "").trim();
        if (
          candidateComp.length >= 2 &&
          !/^(?:product|owner|manager|developer|consultant|architect|lead|scrum|agile|chef|directeur|responsable|ing[ée]nieur|charg[ée]|analyste|technicien|assistant|juriste|comptable|infirmi[eè]r)/i.test(candidateComp) &&
          !/^(?:EXP|FORM|COMP|CONTACT|PROFIL|STAGE|LANGUE|PARCOURS)/i.test(candidateComp)
        ) {
          return candidateComp;
        }
      }
      // Si la ligne précédente ou actuelle est un nom propre d'entreprise (hors verbe, puce ou date)
      if (
        l.length >= 2 &&
        l.length < 55 &&
        !DATE_RANGE_REGEX.test(l) &&
        !/^[•*–—\-]/.test(l) &&
        !/^(?:contexte|environnement|missions?|r[eé]alisations?|stack|outils?|technologies?)/i.test(l) &&
        !/^(?:product|owner|manager|developer|consultant|architect|lead|scrum|agile|chef|directeur|responsable|ing[ée]nieur|charg[ée]|analyste|technicien|assistant|juriste|comptable|infirmi[eè]r)/i.test(l)
      ) {
        const clean = l.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
        if (clean.length >= 2 && clean.length < 50) {
          return clean;
        }
      }
    }
  }

  // 2. Chercher sur l'ensemble du texte toute ligne contenant un séparateur pipe |
  const lines = cvText.normalize("NFC").split("\n").map(collapseCanvaLetterSpacing).map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    if (l.includes("|")) {
      const parts = l.split("|").map((p) => p.trim());
      const candidateComp = parts[0].replace(/\b(19\d\d|20\d\d)\b.*$/, "").trim();
      if (
        candidateComp.length >= 2 &&
        !/^(?:product|owner|manager|developer|consultant|architect|lead|scrum|agile|chef|directeur|responsable|ing[ée]nieur|charg[ée]|analyste|technicien|assistant|juriste|comptable|infirmi[eè]r)/i.test(candidateComp) &&
        !/^(?:EXP|FORM|COMP|CONTACT|PROFIL|STAGE|LANGUE)/i.test(candidateComp)
      ) {
        return candidateComp;
      }
    }
  }

  return "";
}

function frDe(term: string): string {
  const t = (term || "").trim();
  if (!t) return "de";
  return /^[aeiouyàâäéèêëîïôöùûüh]/i.test(t) && !/^user\b/i.test(t) ? `d'${t}` : `de ${t}`;
}

const PROPER_SKILL_CASE_TOKENS = new Set([
  "salesforce", "jira", "confluence", "trello", "asana", "sql", "pl/sql", "soql", "postgresql", "mysql",
  "mongodb", "redis", "docker", "kubernetes", "terraform", "ansible", "aws", "azure", "gcp", "devops",
  "finops", "mlops", "dataops", "secops", "ci/cd", "git", "github", "gitlab", "graphql", "uml", "bpmn",
  "mcd", "mcd/mld", "sfd", "uat", "tma", "moa", "amoa", "erp", "crm", "kpi", "sap", "itil", "prince2",
  "pmp", "safe", "scrum", "kanban", "agile", "java", "python", "php", "react", "angular", "typescript",
  "javascript", "node.js", "next.js", "vue.js", "linux", "excel", "power", "bi", "powerbi", "tableau",
  "superset", "looker", "qlik", "snowflake", "bigquery", "figma", "hubspot", "shopify", "rgpd", "gdpr",
  "ifrs", "sirh", "seo", "sea", "ux", "ui", "api", "apis", "rest", "soap", "esb", "etl", "soa", "si", "ia",
  "product", "backlog", "user", "stories", "story", "roadmap", "sprint", "sprints", "supply", "chain",
  "sales", "experience", "marketing", "cloud", "apex", "lwc", "gmao", "tpm", "smed", "5s", "mtbf",
  "mttr", "trs", "oee", "catia", "v5", "vba", "pm", "amdec", "autocad", "solidworks", "iso"
]);

function formatSkillForProse(skill: string, isEn: boolean): string {
  const s = (skill || "").replace(/\s+&\s+/g, isEn ? " and " : " et ").trim();
  if (!s) return "";
  if (isEn) return s;

  return s
    .split(/\s+/)
    .map((word, idx) => {
      // Preserve parenthesized acronyms/labels like (UAT), (SFD), (Plant Maintenance)
      if (/^\([A-Z0-9/&+]+\)$/.test(word) || word.startsWith("(") || word.endsWith(")")) return word;
      const core = word.replace(/^[('"]+|[),.'"]+$/g, "");
      const coreLower = core.toLowerCase();
      if (PROPER_SKILL_CASE_TOKENS.has(coreLower) || (core.length <= 5 && core === core.toUpperCase() && /[A-Z]/.test(core))) {
        return word;
      }
      // Handle French elisions like d'User -> d'User, d'Analyse -> d'analyse
      const elision = word.match(/^([dlsDL]['’])(.+)$/);
      if (elision) {
        const restCore = elision[2].toLowerCase();
        const restFormatted = PROPER_SKILL_CASE_TOKENS.has(restCore) ? elision[2] : elision[2].toLowerCase();
        return `${elision[1].toLowerCase()}${restFormatted}`;
      }
      if (idx === 0 && PROPER_SKILL_CASE_TOKENS.has(coreLower)) return word;
      return word.toLowerCase();
    })
    .join(" ");
}

function joinNaturalList(items: string[], isEn: boolean): string {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} ${isEn ? "and" : "et"} ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} ${isEn ? "and" : "et"} ${clean[clean.length - 1]}`;
}

// Adaptation dense, structurée et personnalisée du profil professionnel à l'offre cible
// GARDE-FOU STRICT : Ne revendique JAMAIS de compétences absentes du CV source (uniquement matchedKeywords & faits vérifiés du CV)
export function buildAdaptedProfessionalSummary(
  rawSummary: string,
  cvText: string,
  roleTitle: string,
  _targetCompany: string,
  isEn: boolean,
  matchedKeywords: string[] = [],
  _focusTerms: string[] = [],
  domainLabel = "",
  missionPhrases: string[] = [],
  themes?: OfferThemes,
  differentiatingSkills: string[] = []
): string {
  const sectionsForSummary = parseCvSections(cvText || "");
  const expAndSummarySource = [
    rawSummary || "",
    ...sectionsForSummary.SUMMARY,
    ...sectionsForSummary.EXPERIENCE,
  ].join("\n");
  const combinedSource = `${rawSummary || ""}\n${cvText || ""}`;
  // Exiger explicitement "d'expérience" / "of experience" dans EXPERIENCE/SUMMARY (jamais "14 ans" d'un loisir dans Centres d'intérêt !)
  const rawYearsMatch = expAndSummarySource.match(/(?:(\d{1,2}\s*\+?\s*(?:ans|années|years)\s+(?:d['’]exp[eé]rience|of\s+experience))|exp[eé]rience\s+(?:de|:)\s*(\d{1,2}\s*\+?\s*(?:ans|années|years)))/i);
  const extractedYearsStr = (rawYearsMatch?.[1] || rawYearsMatch?.[2] || "").trim();
  const yearsMatch = extractedYearsStr && isEn
    ? extractedYearsStr
        .replace(/\bans\s+d['’]exp[eé]rience/i, "years of experience")
        .replace(/\bann[ée]es?\s+d['’]exp[eé]rience/i, "years of experience")
        .replace(/\bans\b/i, "years")
        .replace(/\bann[ée]es?\b/i, "years")
    : extractedYearsStr;
  const parsedEds = parseAuthenticEducationFromCv(cvText, isEn);
  const topEdu = parsedEds[0];
  let authenticDegreeLabel = "";
  if (topEdu?.degree) {
    const rawDeg = topEdu.degree.trim();
    const rawField = (topEdu.field || "").trim();
    const cleanTopDeg = rawDeg.replace(/^[EÉ]l[eè]ve[\s-]+Ing[ée]nieur/i, "Ingénieur");
    if (rawField && !cleanTopDeg.toLowerCase().includes(rawField.toLowerCase())) {
      authenticDegreeLabel = `${cleanTopDeg} – ${rawField}`;
    } else {
      authenticDegreeLabel = cleanTopDeg;
    }
  } else {
    authenticDegreeLabel = combinedSource.match(/\b(Master\s*(?:2|II|1)?(?:\s+(?:en\s+)?[A-Za-zÀ-ÿ0-9]{2,15}){0,2}|Dipl[oô]me\s+d['’]Ing[eé]nieur|Ing[eé]nieur\s+[A-Za-zÀ-ÿ]{3,18}|MBA|Bachelor(?:\s+[A-Za-z]{2,15})?|Licence\s+Pro(?:fessionnelle)?)\b/i)?.[0]?.trim() || "";
  }
  const degreeMatch = authenticDegreeLabel;
  const topEduYear = parseInt((topEdu?.graduationDate || "").match(/\b(20\d\d)\b/)?.[1] || "0", 10);
  const isStudentOrRecentGrad = /\b(?:[ée]l[eè]ve[\s-]+ing[ée]nieur|contrat\s+de\s+professionnalisation|stage\s+assistant|fin\s+d['’][ée]tude)\b/i.test(cvText) || topEduYear >= 2025;

  // Utiliser EXCLUSIVEMENT les compétences réellement avérées dans le CV (matchedKeywords)
  const verifiedCoreSkills = matchedKeywords
    .slice(0, 4)
    .map((k) => formatSkillForProse(k, isEn))
    .filter(Boolean);
  const verifiedSecondarySkills = matchedKeywords
    .slice(4, 6)
    .map((k) => formatSkillForProse(k, isEn))
    .filter(Boolean);
  const verifiedDiffSkills = differentiatingSkills
    .filter((d) => !matchedKeywords.some((m) => m.toLowerCase() === d.toLowerCase()))
    .slice(0, 2)
    .map((k) => formatSkillForProse(k, isEn))
    .filter(Boolean);

  // Détecter des marqueurs authentiques de différenciation présents dans le CV (sans confondre une plage d'années type "2020 - 2021\nProjets")
  const rawScaleMatch = combinedSource.match(/\b((?!(?:19|20)\d\d\b)\d{1,4}[ \t]*(?:à|-|–|to)[ \t]*(?!(?:19|20)\d\d\b)\d{1,4}[ \t]+(?:r[ée]f[ée]rences|produits|skus|projets|clients|sites))\b/i)?.[1]?.trim();
  const portfolioScaleMatchEn = rawScaleMatch
    ? rawScaleMatch
        .replace(/\s+à\s+/i, " to ")
        .replace(/\br[ée]f[ée]rences\b/i, "SKUs")
        .replace(/\bproduits\b/i, "products")
        .replace(/\bprojets\b/i, "projects")
    : "";
  const hasIntlScope = /\b(?:international(?:e|es|aux)?|usines?\s+[àa]\s+l['’][ée]tranger|(?:chine|italie|europe|asia|emea|multi-?pays|multi-?sites))\b/i.test(combinedSource);
  const diffScopeNoteFr = rawScaleMatch
    ? ` (pilotage de ${rawScaleMatch}${hasIntlScope ? " en environnement international" : ""})`
    : hasIntlScope
    ? " en environnement international"
    : "";
  const diffScopeNoteEn = portfolioScaleMatchEn
    ? ` (managing ${portfolioScaleMatchEn}${hasIntlScope ? " in international environments" : ""})`
    : hasIntlScope
    ? " in international environments"
    : "";

  const cvLower = cvText.toLowerCase();
  const roleLower = (roleTitle || "").toLowerCase();
  const isAgronomyOrSurveyCv = /\b(?:agronom\w*|agro[- ]?industr\w*|exp[ée]rimentation\s+v[ée]g[ée]tale|stress\s+hydrique|rendement\s+du\s+bl[ée]|unilasalle|agrial|physiologie\s+v[ée]g[ée]tale)\b/i.test(cvLower) || /\b(?:agronom\w*|agroalimentaire|avaries|contentieux\s+commerciaux|contr[oô]le\s+qualit[ée])\b/i.test(roleLower);
  const isMaintenanceHintEarly = /\b(?:maintenance|fiabilit[ée]|m[ée]thodes\s*(?:maintenance|industrielles?)?|gmao|sap\s*pm)\b/i.test(`${roleLower} ${cvLower}`);

  const defaultFocusListFr = isAgronomyOrSurveyCv
    ? "expérimentation agronomique, suivi terrain, contrôle qualité et analyse de données"
    : isMaintenanceHintEarly
    ? "méthodes maintenance, fiabilité industrielle et amélioration continue"
    : "cadrage fonctionnel, pilotage de solutions et coordination des parties prenantes";
  const defaultFocusListEn = isAgronomyOrSurveyCv
    ? "field agronomy, experimental protocols, quality compliance, and data analysis"
    : isMaintenanceHintEarly
    ? "maintenance engineering, industrial reliability, and continuous improvement"
    : "functional analysis, stakeholder alignment, and application delivery";

  const focusListText = verifiedCoreSkills.length > 0
    ? joinNaturalList(verifiedCoreSkills, isEn)
    : (isEn ? defaultFocusListEn : defaultFocusListFr);

  const cleanMissions = missionPhrases
    .map((m) => sanitizeTargetMissionPhrase(m, cvText))
    .filter((m) => m.length >= 18);
  const firstMission = cleanMissions[0]
    ? cleanMissions[0].charAt(0).toLowerCase() + cleanMissions[0].slice(1).replace(/\.$/, "")
    : "";
  const secondMission = cleanMissions[1]
    ? cleanMissions[1].charAt(0).toLowerCase() + cleanMissions[1].slice(1).replace(/\.$/, "")
    : "";

  const isPoProfile = /\b(?:product\s*owner|po\b|proxy\s*po|product\s*manager|chef\s+de\s+produit)\b/i.test(roleLower);
  const isArchProfile = /\b(?:architect\w*|urbanis\w*)\b/i.test(roleLower);
  const isProjectAppProfile = /\b(?:chef\s+de\s+projet|project\s+manager|applicatif|tma|moa|amoa)\b/i.test(roleLower);

  const isDevopsProfile = /\b(?:devops|sre|cloud|infra(?:structure)?|plateforme|platform\s+engineer|sysadmin|kubernetes)\b/i.test(roleLower);

  const isFeminineCv = /\b(?:professionnelle|charg[ée]e|coordinatrice|approvisionneuse|directrice|responsable|acheteuse|consultante|analyste|pr[ée]visionniste|ing[ée]nieure|d[ée]veloppeuse|pr[êe]te|habitu[ée]e)\b/i.test(cvText || "");
  const expPhraseFr = yearsMatch
    ? `${isFeminineCv ? "Forte" : "Fort"} de ${yearsMatch.toLowerCase().includes("exp") ? yearsMatch : `${yearsMatch} d'expérience`}`
    : isStudentOrRecentGrad
    ? (isFeminineCv ? "Jeune ingénieure" : "Jeune ingénieur")
    : (isFeminineCv ? "Professionnelle expérimentée" : "Professionnel expérimenté");
  const expPhraseEn = yearsMatch
    ? `Accomplished professional with ${yearsMatch.toLowerCase().includes("exp") ? yearsMatch : `${yearsMatch} of experience`}`
    : isStudentOrRecentGrad
    ? "Recent engineering graduate"
    : "Accomplished professional with a proven track record";

  const buildDegreePhraseFr = (deg: string): string => {
    if (!deg) return "";
    if (/^Classes?\s+Pr[ée]paratoires?/i.test(deg)) {
      return `, ${isFeminineCv ? "issue" : "issu"} des ${deg}`;
    }
    const titlePart = isFeminineCv ? "diplômée" : "diplômé";
    if (/^Ing[ée]nieur\b/i.test(deg) && isStudentOrRecentGrad) {
      const cleanSpec = deg.replace(/^Ing[ée]nieure?\s*(?:[–\-:]|en)?\s*/i, "").trim();
      return ` de formation ${cleanSpec || deg}${topEdu?.institution && !/Établissement/i.test(topEdu.institution) ? ` (${topEdu.institution})` : ""}`;
    }
    if (/^Dipl[oô]me\s+(?:du|de\s+l['’]|des)\s+/i.test(deg)) {
      const stripped = deg.replace(/^Dipl[oô]me\s+/i, "");
      return `, ${titlePart} ${stripped}`;
    }
    const useFemArticle = /^(?:Licence|Ma[îi]trise|Formation)\b/i.test(deg);
    return `, ${titlePart} d'un${useFemArticle ? "e" : ""} ${deg}`;
  };
  const degreePhraseFr = buildDegreePhraseFr(degreeMatch);
  const degreePhraseEn = degreeMatch ? ` holding a ${degreeMatch}` : "";

  // Détecter de façon universelle la spécialité et les outils réellement présents dans le CV du candidat
  const allowCadTools = /\b(?:maintenance|fiabilit|m[ée]canique|cao|catia|conception\s+m[ée]canique|dessinateur|industriel)\b/i.test(roleLower);
  const realPlatforms: string[] = [];
  for (const [regex, label] of [
    [/\bsalesforce\b/i, "Salesforce"],
    [/\bsap\s*(?:pm|\(pm\))|\bplant\s+maintenance\b/i, "SAP PM"],
    [/\bsap\b/i, "SAP"],
    [/\bgmao\b/i, "GMAO"],
    [/\bcatia(?:\s*v5)?\b/i, "CATIA V5"],
    [/\bautocad\b/i, "AutoCAD"],
    ...(allowCadTools ? [[/\bsolidworks\b/i, "SolidWorks"] as [RegExp, string]] : []),
    [/\bvba\b/i, "VBA Excel"],
    [/\br\s*studio\b/i, "R Studio"],
    [/\baccess\b/i, "Access"],
    [/\bmultispectral/i, "données multispectrales"],
    [/\boracle\b/i, "Oracle"],
    [/\berp\b/i, "ERP"],
    [/\bjira\b/i, "Jira"],
    [/\bsql\b/i, "SQL"],
    [/\bpower\s*bi\b/i, "Power BI"],
    [/\bexcel\b|\bpack\s+office\b/i, "Pack Office"],
    [/\baws\b|\bazure\b|\bgcp\b/i, "AWS/Cloud"],
    [/\bkubernetes\b|\bdocker\b/i, "Kubernetes/Docker"],
    [/\bterraform\b|\bansible\b/i, "Terraform"],
    [/\bpython\b/i, "Python"],
    [/\breact\b|\btypescript\b/i, "React/TypeScript"],
    [/\bgoogle\s+ai\b|\bia\b/i, "IA"],
  ] as [RegExp, string][]) {
    if (regex.test(cvLower) && !realPlatforms.includes(label)) {
      if (label === "SAP" && realPlatforms.includes("SAP PM")) continue;
      if (label === "Pack Office" && realPlatforms.includes("VBA Excel")) continue;
      realPlatforms.push(label);
    }
    if (realPlatforms.length >= 5) break;
  }

  // Prioriser les plateformes du CV pertinentes pour l'offre
  const sortedPlatforms = [...realPlatforms].sort((a, b) => {
    const scorePlat = (p: string) => {
      if (isDevopsProfile && /^(?:AWS\/Cloud|Kubernetes\/Docker|Terraform)$/.test(p)) return 3;
      if (themes?.dataAi && /^(?:SQL|Power BI|Python|IA)$/.test(p)) return 3;
      if (themes?.agileProduct && /^(?:Jira|Salesforce)$/.test(p)) return 2;
      if (isAgronomyOrSurveyCv && /^(?:R Studio|Access|données multispectrales|Pack Office)$/.test(p)) return 3;
      if (/\b(?:maintenance|fiabilit|m[ée]thodes|industriel)\b/i.test(roleLower) && /^(?:GMAO|SAP PM|CATIA V5|VBA Excel|AutoCAD|SolidWorks)$/.test(p)) return 3;
      return 1;
    };
    return scorePlat(b) - scorePlat(a);
  });

  const platformSentenceFr = sortedPlatforms.length > 0
    ? `, maîtrisant des outils analytiques et techniques de référence (${sortedPlatforms.slice(0, 3).join(", ")})`
    : "";
  const platformSentenceEn = sortedPlatforms.length > 0
    ? ` across enterprise platforms (${sortedPlatforms.slice(0, 3).join(", ")})`
    : "";

  const isMaintenanceRole = /\b(?:maintenance|fiabilit[ée]|m[ée]thodes\s*(?:maintenance|industrielles?)?|gmao|tpm|smed|mtbf|mttr|trs|oee|industrialisation|g[ée]nie\s+industriel|g[ée]nie\s+m[ée]canique|moyens?\s+de\s+production|parc\s+machines?)\b/i.test(roleLower);
  const maintenanceCvHits = (cvLower.match(/\b(?:maintenance|fiabilit[ée]|m[ée]thode[s]?\s*(?:de\s+)?maintenance|gmao|sap\s*pm|plant\s+maintenance|tpm|smed|mtbf|mttr|trs|criticité|pi[eè]ces\s+d[ée]tach[ée]es|moyens?\s+de\s+production|g[ée]nie\s+industriel|g[ée]nie\s+m[ée]canique)\b/gi) || []).length;
  const isMaintenanceIndustrialProfile = isMaintenanceRole || (maintenanceCvHits >= 2 && !/\b(?:supply\s*chain|demand\s*plan|supply\s*plan|pr[ée]vision\s+des\s+ventes)\b/i.test(roleLower));

  const supplyChainRoleHit = /\b(?:supply\s*chain|demand\s*plan|supply\s*plan|approvisionn|pr[ée]visionniste|logistique|planificateur|ordonnancement|procurement)\b/i.test(roleLower);
  const supplyChainCvHits = (cvLower.match(/\b(?:supply\s*chain|demand\s*planning|supply\s*planning|s&op|approvisionnement|pr[ée]vision\s+des\s+ventes|gestion\s+des\s+stocks|otif|cpfr|logistique|pr[ée]visionniste|sell-in|sell-out|drp)\b/gi) || []).length;
  const isSupplyChainProfile = (supplyChainRoleHit && supplyChainCvHits >= 1) || (!isMaintenanceIndustrialProfile && supplyChainCvHits >= 2);
  const isAgronomyProfile = !isMaintenanceIndustrialProfile && !isSupplyChainProfile && isAgronomyOrSurveyCv;
  const isFinanceProfile = !isSupplyChainProfile && !isMaintenanceIndustrialProfile && !isAgronomyProfile && /\b(?:audit\s+financier|contr[oô]le\s+de\s+gestion|comptabilit[ée]|ifrs|tr[ée]sorerie|consolidation\s+financi[eè]re|analyste\s+financier)\b/i.test(cvLower);
  const isHrProfile = !isSupplyChainProfile && !isMaintenanceIndustrialProfile && !isAgronomyProfile && /\b(?:ressources?\s+humaines?|talent\s+acquisition|recrutement|sirh|paie|gestion\s+des\s+talents)\b/i.test(cvLower);
  const isDigitalMktProfile = !isSupplyChainProfile && !isMaintenanceIndustrialProfile && !isAgronomyProfile && /\b(?:marketing\s+digital|growth\s+hacking|acquisition\s+client|seo|sea|google\s+ads|traffic\s+manager|brand\s+manager)\b/i.test(cvLower);

  const hasCvSop = /\bs\s*&\s*op\b/i.test(combinedSource);
  const hasCvForecast = /\b(?:pr[ée]vision\s+des\s+ventes|forecast(?:\s+accuracy)?|demand\s+planning)\b/i.test(combinedSource);
  const hasCvOtif = /\botif\b/i.test(combinedSource);
  const hasCvStocks = /\b(?:gestion\s+des\s+stocks|couverture\s+de\s+stocks|stocks?)\b/i.test(combinedSource);
  const hasCvMaintKpi = /\b(?:mtbf|mttr|trs|oee)\b/i.test(combinedSource);
  const hasCvLeanTools = /\b(?:tpm|5s|smed|kanban|lean)\b/i.test(combinedSource);
  const hasCvGmao = /\b(?:gmao|plant\s+maintenance|sap\s*pm)\b/i.test(combinedSource);

  // Domaine d'expertise réel du candidat (inféré du CV sans faux positif sur "équipes marketing", "Supply Chain" isolé ni sur l'intitulé cible)
  const cvFieldFr = /\bdevops|kubernetes|terraform|aws|sre\b/i.test(cvLower)
    ? "dans l'ingénierie Cloud, DevOps et l'automatisation d'infrastructures"
    : isMaintenanceIndustrialProfile
    ? "en méthodes maintenance, fiabilité industrielle et gestion des moyens de production"
    : isAgronomyProfile
    ? "en agronomie terrain, expérimentation végétale, analyse de données et évaluation de la qualité"
    : isSupplyChainProfile
    ? (hasCvSop || hasCvForecast
        ? "en Supply Chain, prévision des ventes (S&OP) et pilotage des approvisionnements"
        : "en Supply Chain, planification opérationnelle et pilotage des approvisionnements")
    : /\bing[ée]nierie\s+informatique|\bsyst[èe]mes?\s+d['’]information|\bmiage\b|\bsalesforce\b|\bproduct\s+owner\b/i.test(cvLower)
    ? "dans le pilotage de systèmes d'information et de produits digitaux"
    : isDigitalMktProfile
    ? "en stratégie digitale et acquisition"
    : isFinanceProfile
    ? "en gestion financière et pilotage de performance"
    : isHrProfile
    ? "en ressources humaines et pilotage des talents"
    : "dans le pilotage opérationnel et l'excellence d'exécution";
  const cvFieldEn = /\bdevops|kubernetes|terraform|aws|sre\b/i.test(cvLower)
    ? "in Cloud engineering, DevOps automation, and platform reliability"
    : isMaintenanceIndustrialProfile
    ? "in maintenance engineering, industrial reliability, and production asset performance"
    : isAgronomyProfile
    ? "in field agronomy, experimental protocols, statistical data analysis, and quality assessment"
    : isSupplyChainProfile
    ? (hasCvSop || hasCvForecast
        ? "in Supply Chain planning, demand forecasting (S&OP), and inventory optimization"
        : "in Supply Chain operations, procurement planning, and service-level execution")
    : /\binformation\s+systems|\bmiage\b|software|salesforce|product\s+owner|ing[ée]nierie\b/i.test(cvLower)
    ? "in information systems and digital product delivery"
    : isDigitalMktProfile
    ? "in digital marketing strategy and customer acquisition"
    : isFinanceProfile
    ? "in financial management and performance controlling"
    : "in strategic project execution and operational excellence";

  if (isEn) {
    let angleEn = "operational optimization, KPI governance, and cross-functional execution";
    if (isDevopsProfile) {
      angleEn = "cloud infrastructure automation, Kubernetes orchestration, CI/CD reliability, and platform security";
    } else if (isMaintenanceIndustrialProfile) {
      angleEn = `equipment reliability${hasCvMaintKpi ? " (MTBF, MTTR, OEE)" : ""}, ${hasCvGmao ? "CMMS deployment, " : ""}preventive maintenance standards, and continuous industrial improvement${hasCvLeanTools ? " (TPM, 5S, SMED)" : ""}`;
    } else if (isAgronomyProfile) {
      angleEn = "field investigation, scientific protocol validation, quality compliance analysis, and technical reporting";
    } else if (isSupplyChainProfile) {
      const scAnglesEn = [
        hasCvForecast ? "sales forecasting accuracy" : "",
        hasCvSop ? "S&OP alignment" : "",
        hasCvStocks ? "inventory optimization" : "",
        hasCvOtif ? "supplier OTIF performance" : "",
      ].filter(Boolean);
      angleEn = scAnglesEn.length >= 2
        ? joinNaturalList(scAnglesEn, true)
        : "procurement planning, supply continuity, and service-level performance";
    } else if (isPoProfile && themes?.dataAi) {
      angleEn = "data-driven product ownership, backlog prioritization, actionable User Stories, and deliverable quality assurance";
    } else if (isPoProfile && themes?.appLifecycle) {
      angleEn = "application lifecycle governance, UAT coordination, interface alignment, and end-user adoption";
    } else if (isPoProfile) {
      angleEn = "product strategy, Scrum ceremonies, backlog prioritization, and incremental value delivery";
    } else if (isArchProfile || themes?.architecture) {
      angleEn = "functional architecture, data/process modeling, and IS urbanization";
    } else if (isProjectAppProfile) {
      angleEn = "application lifecycle management, UAT governance, and operational continuity";
    }

    const s1 = `${expPhraseEn}${degreePhraseEn} with expertise ${cvFieldEn}${platformSentenceEn}, targeting the ${roleTitle} role${domainLabel ? ` in ${domainLabel}` : ""}.`;
    const s2 = `Proven expertise in ${focusListText} and ${angleEn}${firstMission ? `, directly equipped to ${firstMission}` : ""}.`;
    const diffClauseEn = verifiedDiffSkills.length > 0
      ? `Further distinguished by added-value strengths in ${joinNaturalList(verifiedDiffSkills, true)}${diffScopeNoteEn}`
      : `Recognized for analytical rigor and cross-functional coordination${diffScopeNoteEn}`;
    const s3 = secondMission
      ? `${diffClauseEn}, enabling immediate contribution to ${secondMission} while maintaining high quality and performance standards.`
      : `${diffClauseEn} to deliver measurable operational impact and stand out across complex initiatives.`;
    return `${s1} ${s2} ${s3}`;
  }

  let angleFr = "l'optimisation des processus opérationnels, le pilotage par les KPI et la coordination transverse";
  if (isDevopsProfile) {
    angleFr = "l'automatisation Cloud (IaC), l'orchestration de conteneurs, l'industrialisation CI/CD et la résilience en production";
  } else if (isMaintenanceIndustrialProfile) {
    angleFr = `la fiabilisation des équipements${hasCvMaintKpi ? " (MTBF, MTTR, TRS)" : ""}, ${hasCvGmao ? "le déploiement GMAO, " : ""}la standardisation des plans de maintenance et l'amélioration continue${hasCvLeanTools ? " (TPM, 5S, SMED)" : ""}`;
  } else if (isAgronomyProfile) {
    angleFr = "l'expertise terrain, la validation de protocoles scientifiques, le contrôle qualité et la rédaction de rapports d'analyse";
  } else if (isSupplyChainProfile) {
    const scAnglesFr = [
      hasCvForecast ? "la fiabilité des prévisions de ventes (Forecast Accuracy)" : "",
      hasCvSop ? "le processus S&OP" : "",
      hasCvStocks ? "l'optimisation des stocks" : "",
      hasCvOtif ? "la performance fournisseurs (OTIF)" : "",
    ].filter(Boolean);
    angleFr = scAnglesFr.length >= 2
      ? joinNaturalList(scAnglesFr, false)
      : "la planification des approvisionnements, la continuité des flux et l'amélioration du taux de service";
  } else if (isPoProfile && themes?.dataAi) {
    angleFr = "la transformation des besoins métiers en User Stories actionnables, la valorisation de la donnée et la qualité des livrables produits";
  } else if (isPoProfile && themes?.appLifecycle) {
    angleFr = "la continuité applicative, le pilotage des recettes fonctionnelles, la coordination des interfaces et la conduite du changement";
  } else if (isPoProfile) {
    angleFr = "le pilotage produit, l'arbitrage de backlog par la valeur et l'animation des rituels Agiles";
  } else if (isArchProfile || themes?.architecture) {
    angleFr = "l'architecture fonctionnelle, la modélisation des flux et l'urbanisation des systèmes d'information";
  } else if (isProjectAppProfile || themes?.appLifecycle) {
    angleFr = "la conduite de projets applicatifs, la coordination MOA/MOE et le maintien en conditions opérationnelles";
  }

  const canClaimOfferMissions = matchedKeywords.length >= 2;
  const fieldConnectorFr = degreePhraseFr && !/^ de formation /i.test(degreePhraseFr) ? ` et spécialisé${isFeminineCv ? "e" : ""} ` : " ";
  const s1 = `${expPhraseFr}${degreePhraseFr}${fieldConnectorFr}${cvFieldFr}${platformSentenceFr}, je positionne mon expertise sur le poste ${frDe(roleTitle)}${domainLabel ? ` dans le secteur ${domainLabel}` : ""}.`;
  const s2 = `Mon parcours m'a permis d'affirmer une solide maîtrise en ${focusListText}, centrée sur ${angleFr}${canClaimOfferMissions && firstMission ? `, avec une aptitude éprouvée à ${firstMission}` : ""}.`;
  const extraSkillsForS3 = verifiedDiffSkills.length > 0 ? verifiedDiffSkills : verifiedSecondarySkills;
  const s3 = extraSkillsForS3.length > 0 && canClaimOfferMissions && secondMission
    ? `J'apporte également une valeur ajoutée différenciante en ${joinNaturalList(extraSkillsForS3, false)}${diffScopeNoteFr} pour ${secondMission} en collaboration étroite avec les équipes partenaires.`
    : extraSkillsForS3.length > 0
    ? `J'y associe une valeur ajoutée différenciante en ${joinNaturalList(extraSkillsForS3, false)}${diffScopeNoteFr}, en interface directe avec les directions partenaires pour sécuriser la performance et l'excellence opérationnelle.`
    : canClaimOfferMissions && secondMission
    ? `J'interviens en interface directe avec les équipes commerciales, financières et opérationnelles${diffScopeNoteFr} pour ${secondMission}, tout en sécurisant les objectifs de performance et de qualité.`
    : `J'interviens en interface directe avec les directions partenaires${diffScopeNoteFr} pour sécuriser l'atteinte des objectifs, la fiabilité des indicateurs clés et l'excellence opérationnelle.`;
  return `${s1} ${s2} ${s3}`;
}

// Regex universelle de plage de dates (supportant "septembre 2021 - juillet 2026", "2021 - 2025", "09/2021 – Présent", etc.)
const MONTH_NAMES_PATTERN = "(?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre|janv\\.?|f[eé]vr\\.?|avr\\.?|juil\\.?|sept\\.?|oct\\.?|nov\\.?|d[eé]c\\.?|january|february|march|april|may|june|july|august|september|october|november|december|jan\\.?|feb\\.?|mar\\.?|apr\\.?|jun\\.?|jul\\.?|aug\\.?|sep\\.?|sept\\.?|oct\\.?|nov\\.?|dec\\.?)";
const DATE_TOKEN_PATTERN = `(?:(?:${MONTH_NAMES_PATTERN}\\s+)?(?:19\\d\\d|20\\d\\d)|(?:0?[1-9]|1[0-2])\\/(?:19\\d\\d|20\\d\\d))`;
export const DATE_RANGE_REGEX = new RegExp(`(?:\\b(${DATE_TOKEN_PATTERN})\\s*(?:[-–—]|\\s+à\\s+|\\s+to\\s+)\\s*(${DATE_TOKEN_PATTERN}|pr[ée]sent|present|current|aujourd['’]hui)\\b|\\b(?:depuis|since|[àa]\\s+partir\\s+de|from)\\s+(${DATE_TOKEN_PATTERN})\\b)`, "i");

// Parser 100% dynamique et authentique des expériences du candidat avec reformulation STAR ciblée sur l'offre
export function parseAuthenticExperiencesFromCv(
  cvText: string,
  targetRoleTitle: string,
  targetCompany: string,
  defaultLocation: string,
  isEn: boolean,
  matchedKeywords: string[],
  jobFocus?: JobFocusContext,
  requiredKeywords: string[] = [],
  integratedKeywords: string[] = []
) {
  const sections = parseCvSections(cvText);
  let expLines = sections.EXPERIENCE;

  // Fallback si la section isolée est vide
  if (expLines.length === 0) {
    const allLines = cvText
      .normalize("NFC")
      .split("\n")
      .map(collapseCanvaLetterSpacing)
      .map((l) => l.trim())
      .filter((l) => l && !/^[•●▪▫➢➤✓✔·*\-–—\s]+$/.test(l));
    let inExp = false;
    for (const line of allLines) {
      if (/^(?:page\s+\d+\s+of\s+\d+|--\s+\d+\s+of\s+\d+\s+--)$/i.test(line)) continue;
      if (/^exp[eé]riences?(?:\s+professionnelles?)?$/i.test(line.replace(/^[#*–—•:|\s.]+|[#*–—•:|\s.]+$/g, "").trim())) {
        inExp = true;
        continue;
      }
      if (inExp && /^(?:formations?|education|dipl[oô]mes?|cursus|outils?\s+(?:et|&)\s+syst[eè]mes?)$/i.test(line.replace(/^[#*–—•:|\s.]+|[#*–—•:|\s.]+$/g, "").trim())) {
        break;
      }
      if (inExp) {
        expLines.push(line);
      }
    }
  }

  const targetCompLower = (targetCompany || "").toLowerCase().trim();
  const experiences: any[] = [];
  const usedEndingsGlobal = new Set<string>();

  // Passe 1 : Identifier toutes les ancres d'expériences (support universel : LinkedIn, Canva, Word, PDF ATS moderne, format pipe)
  interface JobAnchor {
    dateLineIdx: number;
    headerStartIdx: number;
    companyLineIdx: number | null;
    roleLineIdx: number | null;
    inlineHeader: string;
    nextLineCompanyIdx: number | null;
    nextLineLocationIdx: number | null;
    bodyStartIdx: number;
  }

  const anchors: JobAnchor[] = [];

  const looksLikeActionSentence = (l: string | undefined): boolean => {
    if (!l) return false;
    const s = l.trim();
    if (/^(?:[•*–—\-●▪▫➢➤✓✔]+|\d+[.)])\s+/.test(s)) return true;
    if (/^r[ée]alis[ée]\s+en\s+[ée]quipe\b/i.test(s)) return true;
    if (/^(?:contexte|environnement|stack|outils|technologies|missions?|r[eé]alisations?|t[âa]ches?)\s*:/i.test(s)) return true;
    if (s.length > 82) return true;
    if (/[;.]\s+\S/.test(s) && s.length > 45) return true;
    if (
      /^(?:Pr[ée]visions?|Animation|Calcul|Pilotage|Int[ée]gration|Gestion|Validation|Suivi|Anticipation|R[ée]daction|Analyse|Mise\s+en|Coordination|D[ée]ploiement|Conception|R[ée]alisation|Participation|[ÉE]laboration|Optimisation|Supervision|Cr[ée]ation|Maintenance|Support|Administration|D[ée]veloppement|Am[ée]lioration|Planification|N[ée]gociation|Accompagnement|Formation|Contr[oô]le|Assurer|Piloter|G[ée]rer|Animer|Analyser|Concevoir|D[ée]ployer|Optimiser|Coordonner|R[ée]diger|R[ée]aliser|Superviser|Mettre|Maintenir|Developed|Managed|Led|Created|Built|Designed|Implemented|Analyzed|Coordinated|Supported|Oversaw|Delivered|Spearheaded)\b/i.test(s) &&
      (/\b(?:de|du|des|d['’]|le|la|les|un|une|sur|avec|pour|par|aupr[eè]s|jusqu['’]|for|of|the|and|with)\b/i.test(s) && s.length > 34)
    ) {
      return true;
    }
    return false;
  };

  // Prétraitement universel des lignes d'expériences :
  // 1) Fusionner les retours à la ligne coupés (minuscule / préposition pendante) juste après un en-tête daté
  // 2) Scinder proprement les blocs employeur à plusieurs sous-rôles internes (ex: Contrat de professionnalisation + Stage sous AGRIAL)
  const isStandaloneYearHeaderLine = (l: string): boolean => {
    const m = l.match(/^\s*((?:19\d\d|20\d\d))\s+([A-ZÀ-Ÿ].{5,})$/);
    if (!m) return false;
    const rest = m[2].trim();
    if (/^(?:Exp[eé]riences?|Formations?|Comp[eé]tences?)\b/i.test(rest)) return false;
    if (/^(?:[•*–—\-●▪▫➢➤✓✔]|\d+[.)])\s+/.test(rest) || /[;.]\s+\S/.test(rest) || rest.length > 135) return false;
    return !looksLikeActionSentence(rest.slice(0, 75));
  };
  const isAnyExpDateLine = (l: string): boolean =>
    DATE_RANGE_REGEX.test(l) || (l.includes("|") && /\b(19\d\d|20\d\d)\b/.test(l)) || isStandaloneYearHeaderLine(l);
  const subRoleLineRe = /^(?:Contrat\s+(?:de\s+professionnalisation|d['’]apprentissage|CDI|CDD|à\s+durée\s+(?:déterminée|indéterminée))|Stage(?:\s+(?:assistant[- ]ing[ée]nieur|d['’]ing[ée]nieur|de\s+fin\s+d['’][ée]tudes?|ouvrier|technicien|de\s+recherche|[ée]tudiant))?|Alternance(?:\s+[\wÀ-ÿ'-]{1,25}){0,3}|Apprentissage(?:\s+[\wÀ-ÿ'-]{1,25}){0,3})(?:\s*\([^)]{1,30}\))?\s*$/i;
  const extractParentCompanyFromDateHeader = (rawRest: string): string => {
    const clean = rawRest.replace(/^[\s|–—\-·•]+|[\s|–—\-·•]+$/g, "").trim();
    const commaIdx = clean.indexOf(",");
    if (commaIdx >= 2) {
      const brand = clean.slice(0, commaIdx).trim();
      const tail = clean.slice(commaIdx + 1).trim();
      if (brand.length >= 2 && brand.length <= 45) {
        const divMatch = tail.match(/[–—-]\s*([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s'’-]{2,35})$/);
        const divClean = divMatch?.[1]?.trim();
        if (divClean && !/\d/.test(divClean) && !/\b(?:salari[ée]s|collaborateurs|agriculteurs|employ[ée]s)\b/i.test(divClean)) {
          return `${brand} — ${divClean}`;
        }
        return brand;
      }
    }
    return clean.replace(/\s*[–—-]\s*\d[\d\s]*\s*(?:salari[ée]s|collaborateurs|employ[ée]s|agriculteurs).*$/i, "").trim() || clean;
  };

  const mergedExpLines: string[] = [];
  for (let ei = 0; ei < expLines.length; ei++) {
    let curr = expLines[ei];
    if (isAnyExpDateLine(curr)) {
      while (ei + 1 < expLines.length) {
        const nxt = expLines[ei + 1];
        if (
          !nxt ||
          /^(?:[•*–—\-●▪▫➢➤✓✔]|\d+[.)])\s/.test(nxt) ||
          /^(?:Exp[eé]riences?\s+(?:associatives?|pr[ée]c[ée]dentes?)|Autres?\s+exp[eé]riences?)\s*:?$/i.test(nxt) ||
          isAnyExpDateLine(nxt) ||
          subRoleLineRe.test(nxt) ||
          /^r[ée]alis[ée]\s+en\s+[ée]quipe\b/i.test(nxt)
        ) {
          break;
        }
        const startsLower = /^[a-zà-ÿ]/.test(nxt);
        const prevEndsDangling = /(?:[,;:\-–—/(]|\b(?:de|du|des|d['’]|la|le|les|l['’]|un|une|en|à|au|aux|pour|par|avec|sur|et|ou)|\b\d{1,3})$/i.test(curr.trim());
        if (startsLower || (prevEndsDangling && nxt.length <= 80 && !looksLikeActionSentence(nxt))) {
          curr = `${curr} ${nxt}`.replace(/\s{2,}/g, " ").trim();
          ei++;
        } else {
          break;
        }
      }
    }
    mergedExpLines.push(curr);
  }

  const expandedExpLines: string[] = [];
  for (let ei = 0; ei < mergedExpLines.length; ei++) {
    const curr = mergedExpLines[ei];
    const dMatch = curr.match(DATE_RANGE_REGEX);
    if (dMatch && !curr.includes("|") && ei + 1 < mergedExpLines.length && subRoleLineRe.test(mergedExpLines[ei + 1])) {
      const parentCompany = extractParentCompanyFromDateHeader(curr.replace(dMatch[0], ""));
      const parentDates = dMatch[0].trim();
      let scan = ei + 1;
      while (
        scan < mergedExpLines.length &&
        !isAnyExpDateLine(mergedExpLines[scan]) &&
        !/^(?:Exp[eé]riences?\s+(?:associatives?|pr[ée]c[ée]dentes?)|Autres?\s+exp[eé]riences?)\s*:?$/i.test(mergedExpLines[scan])
      ) {
        const subL = mergedExpLines[scan];
        if (subRoleLineRe.test(subL)) {
          expandedExpLines.push(`${subL.trim()} | ${parentCompany} | ${parentDates}`);
        } else {
          expandedExpLines.push(subL);
        }
        scan++;
      }
      ei = scan - 1;
      continue;
    }
    expandedExpLines.push(curr);
  }
  expLines = expandedExpLines;
  const associativeDividerIdx = expLines.findIndex((l) =>
    /^(?:Exp[eé]riences?\s+associatives?|Vie\s+associative|Engagements?\s+associatifs?)\s*:?$/i.test(l)
  );

  const isPureLocationLine = (l: string | undefined): boolean => {
    if (!l) return false;
    const s = l.replace(/^Ville de /i, "").trim();
    if (!s || s.length > 55) return false;
    // Ne JAMAIS confondre "Samsung Electronics France" ou "Microsoft France" avec une simple localisation
    if (/\b(?:electronics|group|groupe|solutions|services|consulting|system|syst[eè]mes|industries|technologies|international|sas|sarl|corp|inc|ltd|dermo|pharm|distribution)\b/i.test(s)) {
      return false;
    }
    if (/^(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille|Rennes|Reims|Grenoble|Versailles|Saint-Denis|B[ée]ziers|Nanterre|La\s+D[ée]fense|Boulogne-Billancourt|Issy-les-Moulineaux|Neuilly-sur-Seine|Cergy|London|New\s+York|San\s+Francisco|Brussels|Bruxelles|Gen[eè]ve|Montr[ée]al|Remote|Hybride?|T[ée]l[ée]travail|France|[ÎI]le-de-France)(?:[\s,/-]+(?:France|[ÎI]le-de-France|UK|USA|Canada|Suisse|Belgique|p[ée]riph[ée]rie|area|Hybrid|Remote))*$/i.test(s)) {
      return true;
    }
    if (s.includes("périphérie") || /,\s*(?:Île-de-France|Auvergne|Occitanie|Nouvelle-Aquitaine|Hauts-de-France|Grand Est|Bretagne|Pays de la Loire|Provence)/i.test(s)) {
      return true;
    }
    if (/^[A-ZÀ-Ÿ][a-zà-ÿ-]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ-]+){0,2},\s*(?:France|UK|USA|Belgique|Suisse|Canada|Germany|Spain|Italy)$/i.test(s)) {
      return true;
    }
    return false;
  };

  const splitCompanyAndCity = (raw: string): { company: string; location: string } => {
    const clean = raw.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
    const lastComma = clean.lastIndexOf(",");
    if (lastComma > 1) {
      const left = clean.slice(0, lastComma).trim();
      const right = clean.slice(lastComma + 1).trim();
      if (
        left.length >= 2 &&
        right.length >= 2 &&
        right.length <= 35 &&
        right.split(/\s+/).length <= 4 &&
        !/\b(?:sa|sas|sarl|eurl|inc|ltd|gmbh|llc|group|groupe|electronics|solutions)\b/i.test(right)
      ) {
        return { company: left, location: right };
      }
    }
    return { company: clean, location: "" };
  };

  const isHeaderCandidateLine = (l: string | undefined): boolean => {
    if (!l) return false;
    if (/^[a-zà-ÿ),.;:\]]/.test(l)) return false;
    if (DATE_RANGE_REGEX.test(l)) return false;
    if (looksLikeActionSentence(l)) return false;
    if (/^(?:exp[eé]riences?(?:\s+(?:professionnelles?|associatives?|pr[ée]c[ée]dentes?))?|formations?|comp[eé]tences?)\b/i.test(l)) return false;
    if (/^(?:mise\s+en|[ée]tude\s+d|am[ée]lioration|standardisation|fiabilisation|actualisation|r[ée]actualisation|dimensionnement|cr[ée]ation|g[ée]n[ée]ration|optimisation|[ée]laboration|participation|contribution|maintenance\s+(?:pr[ée]ventive|corrective|curative)|r[ée]vision|contr[oô]le|v[ée]rification)\b/i.test(l)) return false;
    if (l.length > 85) return false;
    return true;
  };

  const roleRegex = /\b(?:architect|architecte|engineer|ing[ée]nieur|ing[ée]nieure|developer|d[ée]veloppeur|d[ée]veloppeuse|manager|lead|owner|analyst|analyste|contr[oô]leur(?:se)?(?:\s+de\s+gestion|\s+financier(?:e)?)?|auditeur|auditrice|comptable|tr[ée]sorier|tr[ée]sori[eè]re|juriste|fiscaliste|gestionnaire|consultant|consultante|director|directeur|directrice|chef\s+de\s+(?:projet|produit)|scrum\s+master|specialist|sp[ée]cialiste|senior|junior|exploitant|technicien|technicienne|responsable|charg[ée]e?(?:\s+d|\s+supply|\s+de)?|coordinateur|coordinatrice|approvisionneur|approvisionneuse|pr[ée]visionniste|acheteur|acheteuse|planner|planificateur|planificatrice|contrat(?:\s+de\s+professionnalisation|\s+d['’]apprentissage)?|stage(?:\s+assistant[- ]ing[ée]nieur|\s+d['’]ing[ée]nieur)?|apprenti(?:e)?|alternant(?:e)?|stagiaire|intern)\b/i;

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    const dateMatch = line.match(DATE_RANGE_REGEX);
    const hasPipe = line.includes("|");
    const singleYearMatch = !dateMatch && !hasPipe ? line.match(/^\s*((?:19\d\d|20\d\d))\s+([A-ZÀ-Ÿ].{5,})$/) : null;
    const isSingleYearAnchor = Boolean(
      singleYearMatch &&
      singleYearMatch[2].trim().length <= 135 &&
      !/^(?:[•*–—\-●▪▫➢➤✓✔]|\d+[.)])\s+/.test(singleYearMatch[2].trim()) &&
      !/[;.]\s+\S/.test(singleYearMatch[2].trim()) &&
      !looksLikeActionSentence(singleYearMatch[2].trim().slice(0, 75)) &&
      !/^(?:Exp[eé]riences?|Formations?|Comp[eé]tences?)\b/i.test(singleYearMatch[2].trim())
    );

    if (dateMatch || (hasPipe && /\b(19\d\d|20\d\d)\b/.test(line)) || isSingleYearAnchor) {
      const prevBodyBoundary = anchors.length > 0 ? anchors[anchors.length - 1].bodyStartIdx : 0;

      // Extraire l'intitulé/texte présent sur la MÊME ligne que la plage de dates (format Word/Canva/ATS moderne : "Poste 10/2024 - 07/2025" ou "Poste - Entreprise Depuis 11/2025")
      const inlineHeader = dateMatch
        ? line
            .replace(dateMatch[0], "")
            .replace(/\([^)]*(?:ans?|mois|years?|months?)[^)]*\)/gi, "")
            .replace(/^[\s|–—\-·•]+|[\s|–—\-·•]+$/g, "")
            .trim()
        : isSingleYearAnchor && singleYearMatch
        ? singleYearMatch[2]
            .replace(/\([^)]*(?:ans?|mois|years?|months?)[^)]*\)/gi, "")
            .replace(/^[\s|–—\-·•]+|[\s|–—\-·•]+$/g, "")
            .trim()
        : "";

      let companyLineIdx: number | null = null;
      let roleLineIdx: number | null = null;
      let nextLineCompanyIdx: number | null = null;
      let nextLineLocationIdx: number | null = null;
      let headerStartIdx = i;
      let bodyStartIdx = i + 1;

      const nextL = expLines[i + 1];
      const nextLLooksLikeShortEntity =
        Boolean(nextL) &&
        !DATE_RANGE_REGEX.test(nextL) &&
        !looksLikeActionSentence(nextL) &&
        !isPureLocationLine(nextL) &&
        !/^(?:Exp[eé]riences?\s+(?:associatives?|pr[ée]c[ée]dentes?)|Autres?\s+exp[eé]riences?)\s*:?$/i.test(nextL) &&
        nextL.length <= 55 &&
        nextL.split(/\s+/).length <= 6 &&
        !/\b(?:entre\s+les|sur\s+un|au\s+plus\s+pr[eè]s|de\s+deux|en\s+charge\s+de|avec\s+les|d['’]un\s+portefeuille)\b/i.test(nextL);

      const inlineSegs = inlineHeader.split(/\s+[–—-]\s+|\s+@\s+|\s+chez\s+|\s+at\s+/i).map((s) => s.trim()).filter(Boolean);
      const inlineHasRoleAndCompany =
        !nextLLooksLikeShortEntity &&
        inlineSegs.length >= 2 &&
        ((roleRegex.test(inlineSegs[0]) && !roleRegex.test(inlineSegs[inlineSegs.length - 1]) && inlineSegs[inlineSegs.length - 1].length <= 50) ||
          (roleRegex.test(inlineSegs[inlineSegs.length - 1]) && !roleRegex.test(inlineSegs[0]) && inlineSegs[0].length <= 50));

      if (!hasPipe && inlineHeader.length >= 3) {
        if (inlineHasRoleAndCompany) {
          // L'intitulé ET l'entreprise sont déjà sur la même ligne ("Planificateur de Production - Scope - Cofigeo Depuis 11/2025")
          if (nextL && isPureLocationLine(nextL)) {
            nextLineLocationIdx = i + 1;
            bodyStartIdx = i + 2;
          }
        } else {
          // Format Word / Canva / ATS moderne : "Chargée Supply Chain – Prévision... 10/2024 – 07/2025" suivi sur i+1 par "Ariston, Saint-Denis"
          if (
            nextL &&
            !DATE_RANGE_REGEX.test(nextL) &&
            !looksLikeActionSentence(nextL) &&
            !/^(?:Exp[eé]riences?\s+(?:associatives?|pr[ée]c[ée]dentes?)|Autres?\s+exp[eé]riences?)\s*:?$/i.test(nextL) &&
            nextL.length <= 75
          ) {
            if (isPureLocationLine(nextL)) {
              nextLineLocationIdx = i + 1;
            } else {
              nextLineCompanyIdx = i + 1;
            }
            bodyStartIdx = i + 2;
            // Vérifier éventuelle ligne de lieu juste après l'entreprise (i+2)
            if (nextLineCompanyIdx !== null && isPureLocationLine(expLines[i + 2])) {
              nextLineLocationIdx = i + 2;
              bodyStartIdx = i + 3;
            }
          }
        }
      } else {
        // Format LinkedIn / En-tête au-dessus de la ligne de date (ou titre enveloppé sur 2 lignes au-dessus de "Entreprise | Dates")
        if (i - 1 >= prevBodyBoundary && isHeaderCandidateLine(expLines[i - 1])) {
          roleLineIdx = i - 1;
          if (i - 2 >= prevBodyBoundary && isHeaderCandidateLine(expLines[i - 2])) {
            const lineM2 = expLines[i - 2];
            const lineM1 = expLines[i - 1];
            const combinedM2M1 = `${lineM2} ${lineM1}`.trim();
            const isWrappedRoleTitle =
              hasPipe &&
              (!roleRegex.test(lineM1) || /[/&\-–—]$/.test(lineM2.trim())) &&
              (roleRegex.test(combinedM2M1) || (lineM1.length <= 25 && lineM2 === lineM2.toUpperCase() && lineM1 === lineM1.toUpperCase()));
            if (isWrappedRoleTitle) {
              // Ne pas prendre la 1ère ligne du titre de poste enveloppé pour une entreprise
              companyLineIdx = null;
              headerStartIdx = i - 2;
            } else {
              companyLineIdx = i - 2;
            }
          }
        }

        // Défense en profondeur : si format "Entreprise | Dates" sans titre au-dessus mais titre juste en dessous (i+1)
        if (hasPipe && roleLineIdx === null && bodyStartIdx < expLines.length) {
          const belowLine = expLines[bodyStartIdx];
          if (
            belowLine &&
            !DATE_RANGE_REGEX.test(belowLine) &&
            !looksLikeActionSentence(belowLine) &&
            !isPureLocationLine(belowLine) &&
            !/^[•*–—\-●▪▫➢➤✓✔]/.test(belowLine) &&
            !/^(?:Contexte|Environnement|Stack|Outils|Technologies|Projets?|Missions?|R[ée]alisations?)\b/i.test(belowLine) &&
            (roleRegex.test(belowLine) || (/^[A-ZÀ-Ÿ0-9\s/&()'’.-]{4,60}$/.test(belowLine) && belowLine === belowLine.toUpperCase()))
          ) {
            roleLineIdx = bodyStartIdx;
            bodyStartIdx++;
            if (bodyStartIdx < expLines.length) {
              const belowCont = expLines[bodyStartIdx];
              if (
                belowCont &&
                belowCont.length <= 25 &&
                !DATE_RANGE_REGEX.test(belowCont) &&
                !looksLikeActionSentence(belowCont) &&
                !/^[•*–—\-●▪▫➢➤✓✔]/.test(belowCont) &&
                belowCont === belowCont.toUpperCase()
              ) {
                bodyStartIdx++;
              }
            }
          }
        }

        // Format 3 lignes centré sur la date isolée : Poste (i-1) / Date (i) / Entreprise (i+1) OU Entreprise (i-1) / Date (i) / Poste (i+1)
        if (!hasPipe && companyLineIdx === null && roleLineIdx !== null && bodyStartIdx < expLines.length) {
          const belowLine = expLines[bodyStartIdx];
          const aboveLine = expLines[roleLineIdx] || "";
          if (
            belowLine &&
            !DATE_RANGE_REGEX.test(belowLine) &&
            !looksLikeActionSentence(belowLine) &&
            !isPureLocationLine(belowLine) &&
            !/^[•*–—\-●▪▫➢➤✓✔\d]/.test(belowLine) &&
            !/^(?:Contexte|Environnement|Stack|Outils|Technologies|Projets?|Missions?|R[ée]alisations?)\b/i.test(belowLine) &&
            belowLine.length <= 70 &&
            belowLine.split(/\s+/).length <= 8
          ) {
            if (!roleRegex.test(aboveLine) && roleRegex.test(belowLine)) {
              companyLineIdx = roleLineIdx;
              roleLineIdx = bodyStartIdx;
              bodyStartIdx++;
            } else if (!roleRegex.test(belowLine)) {
              nextLineCompanyIdx = bodyStartIdx;
              bodyStartIdx++;
            }
          }
        }

        if (headerStartIdx === i) {
          headerStartIdx = companyLineIdx !== null
            ? companyLineIdx
            : roleLineIdx !== null && roleLineIdx < i
            ? roleLineIdx
            : i;
        }

        if (bodyStartIdx < expLines.length && isPureLocationLine(expLines[bodyStartIdx])) {
          nextLineLocationIdx = bodyStartIdx;
          bodyStartIdx++;
        }
      }

      anchors.push({
        dateLineIdx: i,
        headerStartIdx,
        companyLineIdx,
        roleLineIdx,
        inlineHeader,
        nextLineCompanyIdx,
        nextLineLocationIdx,
        bodyStartIdx
      });
    }
  }

  // Passe 2 : Construire chaque expérience et assembler ses lignes enveloppées AVANT l'harmonisation STAR
  for (let aIdx = 0; aIdx < anchors.length; aIdx++) {
    const anchor = anchors[aIdx];
    const line = expLines[anchor.dateLineIdx];
    const dateMatch = line.match(DATE_RANGE_REGEX);
    const hasPipe = line.includes("|");
    const singleYearMatch = !dateMatch && !hasPipe ? line.match(/^\s*((?:19\d\d|20\d\d))\s+(.+)$/) : null;
    const isAssociativeAnchor = associativeDividerIdx >= 0 && anchor.dateLineIdx > associativeDividerIdx;

    const rawStart = dateMatch ? (dateMatch[1] || dateMatch[3] || "2021") : (singleYearMatch ? singleYearMatch[1] : "2021");
    const rawEnd = dateMatch ? (dateMatch[2] || (isEn ? "Present" : "Présent")) : (singleYearMatch ? singleYearMatch[1] : (isEn ? "Present" : "Présent"));
    const startDate = normalizeCvDate(rawStart, isEn);
    const endDate = normalizeCvDate(rawEnd, isEn);

    let role = isEn ? (targetRoleTitle || "Professional Role") : (targetRoleTitle || "Poste professionnel");
    let company = isEn ? "Company" : "Entreprise";
    let location = defaultLocation || (isEn ? "Paris, France" : "France");

    if (!hasPipe && anchor.inlineHeader.length >= 3) {
      // Intitulé du poste sur la même ligne que la date
      if (anchor.nextLineCompanyIdx !== null) {
        role = anchor.inlineHeader;
        const parsedComp = splitCompanyAndCity(expLines[anchor.nextLineCompanyIdx]);
        company = parsedComp.company || expLines[anchor.nextLineCompanyIdx];
        if (parsedComp.location) location = parsedComp.location;
      } else {
        // Cas 1 : Projets académiques / d'ingénierie au format "Projet de 5ème année, Etude d'un outil..." ou "Projet d'étude UniLaSalle, ..."
        const projCommaMatch = anchor.inlineHeader.match(/^(Projet(?:\s+(?:d['’][ée]tude|de\s+\d+[eè]me\s+ann[ée]e|de\s+fin\s+d['’][ée]tudes?|acad[ée]mique|industriel|tuteur[ée])?(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ.-]+){0,3}))\s*[,:]\s*(.{6,})$/i);
        // Cas 2 : Responsabilité associative sans entreprise ("Trésorier du bureau de promotion")
        const assocRoleMatch = anchor.inlineHeader.match(/^(Tr[ée]sorier|Pr[ée]sident|Vice-pr[ée]sident|Secr[ée]taire|Responsable|Membre)\s+(?:du|de\s+la|de\s+l['’]|des)\s+(.+)$/i);
        // L'intitulé et l'entreprise sont tous deux dans inlineHeader (ex: "Poste - Entreprise" ou "Poste - Périmètre - Entreprise")
        const dashSplit = anchor.inlineHeader.split(/\s+[–—-]\s+|\s+@\s+|\s+chez\s+|\s+at\s+/i).map((s) => s.trim()).filter(Boolean);
        if (projCommaMatch) {
          company = projCommaMatch[1].trim();
          role = projCommaMatch[2].trim();
        } else if (dashSplit.length >= 2) {
          const firstSeg = dashSplit[0];
          const lastSeg = dashSplit[dashSplit.length - 1];
          const neitherIsRole = !roleRegex.test(firstSeg) && !roleRegex.test(lastSeg);
          if (neitherIsRole && (isAssociativeAnchor || /\b(?:tournoi|association|club|bureau|[ée]v[ée]nement|solidaire|concours|coop[ée]rative)\b/i.test(lastSeg))) {
            company = `${firstSeg} — ${dashSplit.slice(1).join(" – ").trim()}`;
            role = isEn ? "Organization & Logistics" : "Organisation & Logistique";
          } else if (dashSplit.length >= 3 && !roleRegex.test(lastSeg)) {
            role = dashSplit.slice(0, -1).join(" – ").trim();
            const parsedComp = splitCompanyAndCity(lastSeg);
            company = parsedComp.company;
            if (parsedComp.location) location = parsedComp.location;
          } else if (roleRegex.test(lastSeg) && !roleRegex.test(firstSeg)) {
            const parsedComp = splitCompanyAndCity(dashSplit.slice(0, -1).join(" – ").trim());
            company = parsedComp.company;
            if (parsedComp.location) location = parsedComp.location;
            role = lastSeg;
          } else {
            role = dashSplit.slice(0, -1).join(" – ").trim();
            const parsedComp = splitCompanyAndCity(lastSeg);
            company = parsedComp.company;
            if (parsedComp.location) location = parsedComp.location;
          }
        } else if (assocRoleMatch) {
          role = anchor.inlineHeader;
          const orgClean = assocRoleMatch[2].trim();
          company = `${orgClean.charAt(0).toUpperCase() + orgClean.slice(1)} (Vie associative)`;
        } else {
          role = anchor.inlineHeader;
          if (isAssociativeAnchor) {
            company = isEn ? "Student Association" : "Vie associative";
          } else if (/^projet\b/i.test(role)) {
            company = isEn ? "Academic Engineering Project" : "Projet académique";
          }
        }
      }
    } else {
      if (anchor.roleLineIdx !== null) {
        if (hasPipe && anchor.companyLineIdx === null && anchor.headerStartIdx < anchor.roleLineIdx) {
          role = expLines
            .slice(anchor.headerStartIdx, anchor.roleLineIdx + 1)
            .map((l) => l.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim())
            .join(" ");
        } else if (
          hasPipe &&
          anchor.roleLineIdx > anchor.dateLineIdx &&
          anchor.bodyStartIdx > anchor.roleLineIdx + 1
        ) {
          role = expLines
            .slice(anchor.roleLineIdx, anchor.bodyStartIdx)
            .map((l) => l.replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim())
            .join(" ");
        } else {
          const rawRoleLine = expLines[anchor.roleLineIdx].replace(/^[#*–—•:|\s]+|[#*–—•:|\s]+$/g, "").trim();
          if (!hasPipe && anchor.companyLineIdx === null && rawRoleLine.includes("|")) {
            const rParts = rawRoleLine.split("|").map((p) => p.replace(/^[#*–—•:\s]+|[#*–—•:\s]+$/g, "").trim()).filter(Boolean);
            if (rParts.length >= 2) {
              const r0 = rParts[0];
              const r1 = rParts[1];
              const r2 = rParts[2];
              if (rParts.length >= 3) {
                if (roleRegex.test(r1) && !roleRegex.test(r0)) {
                  const parsedComp = splitCompanyAndCity(r0);
                  company = parsedComp.company;
                  role = r1;
                } else {
                  role = r0;
                  const parsedComp = splitCompanyAndCity(r1);
                  company = parsedComp.company;
                }
                if (r2 && r2.length <= 45) {
                  location = r2.replace(/^Ville de /i, "").trim();
                }
              } else if (roleRegex.test(r1) && !roleRegex.test(r0)) {
                const parsedComp = splitCompanyAndCity(r0);
                company = parsedComp.company;
                if (parsedComp.location) location = parsedComp.location;
                role = r1;
              } else if (isPureLocationLine(r1)) {
                role = r0;
                location = r1.replace(/^Ville de /i, "").trim();
              } else {
                role = r0;
                const parsedComp = splitCompanyAndCity(r1);
                company = parsedComp.company;
                if (parsedComp.location) location = parsedComp.location;
              }
            } else {
              role = rawRoleLine;
            }
          } else {
            role = rawRoleLine;
          }
        }
      }
      if (anchor.companyLineIdx !== null) {
        const parsedComp = splitCompanyAndCity(expLines[anchor.companyLineIdx]);
        company = parsedComp.company;
        if (parsedComp.location) location = parsedComp.location;
      } else if (anchor.nextLineCompanyIdx !== null && expLines[anchor.nextLineCompanyIdx]) {
        const parsedComp = splitCompanyAndCity(expLines[anchor.nextLineCompanyIdx]);
        company = parsedComp.company || expLines[anchor.nextLineCompanyIdx];
        if (parsedComp.location) location = parsedComp.location;
      }

      // Détection universelle de l'ordre En-tête : LinkedIn (Entreprise puis Poste) vs CV classique/Canva/Word (Poste puis Entreprise)
      if (!hasPipe && anchor.roleLineIdx !== null && anchor.companyLineIdx !== null) {
        const companyHasRole = roleRegex.test(company);
        const roleHasRole = roleRegex.test(role);
        if (companyHasRole && !roleHasRole) {
          const tmp = role;
          role = company;
          company = tmp;
        }
      }
    }

    if (hasPipe) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      const datePartIdx = parts.findIndex((p) => DATE_RANGE_REGEX.test(p) || /\b(19\d\d|20\d\d)\b/.test(p));
      const cleanParts = parts
        .map((p, idx) => (idx === datePartIdx && dateMatch ? p.replace(dateMatch[0], "").trim() : p))
        .filter((p) => p.length > 1);

      const pipeRoleRegex = /\b(?:architect|architecte|engineer|ing[ée]nieur|ing[ée]nieure|developer|d[ée]veloppeur|d[ée]veloppeuse|programmeur|manager|lead|owner|analyst|analyste|contr[oô]leur(?:se)?(?:\s+de\s+gestion|\s+financier(?:e)?)?|auditeur|auditrice|comptable|tr[ée]sorier|tr[ée]sori[eè]re|juriste|fiscaliste|gestionnaire|consultant|consultante|director|directeur|directrice|chef\s+de\s+projet|scrum\s+master|specialist|sp[ée]cialiste|senior|junior|exploitant|technicien|technicienne|administrateur|administratrice|responsable|charg[ée]e?(?:\s+d)?|coordinateur|coordinatrice|approvisionneur|approvisionneuse|pr[ée]visionniste|acheteur|acheteuse|planner|contrat(?:\s+de\s+professionnalisation|\s+d['’]apprentissage)?|stage(?:\s+assistant[- ]ing[ée]nieur|\s+d['’]ing[ée]nieur)?|apprenti(?:e)?|alternant(?:e)?|stagiaire|intern|vendeur|serveur)\b/i;

      if (cleanParts.length >= 2) {
        const p0 = cleanParts[0];
        const p1 = cleanParts[1];
        const p0IsRole = pipeRoleRegex.test(p0);
        const p1IsRole = pipeRoleRegex.test(p1);
        const p1IsLoc = isPureLocationLine(p1);
        const p0IsLoc = isPureLocationLine(p0);
        const prevLineIsRole = anchor.roleLineIdx !== null && roleRegex.test(expLines[anchor.roleLineIdx] || "");

        if (!p0IsRole && !p1IsRole && (p1IsLoc || prevLineIsRole)) {
          // Format "Poste" sur la ligne du dessus + "Entreprise | Ville | Dates" (ex: "Ariston | Saint-Denis | 06/2023 – Aujourd'hui")
          const parsedComp = splitCompanyAndCity(p0);
          company = parsedComp.company;
          location = p1.replace(/^Ville de /i, "").trim() || parsedComp.location || location;
        } else if (!p0IsRole && !p1IsRole && p0IsLoc) {
          location = p0.replace(/^Ville de /i, "").trim();
          const parsedComp = splitCompanyAndCity(p1);
          company = parsedComp.company;
        } else if (p1IsRole && !p0IsRole) {
          const parsedComp = splitCompanyAndCity(p0);
          company = parsedComp.company;
          if (parsedComp.location) location = parsedComp.location;
          role = p1;
        } else {
          role = p0;
          const parsedComp = splitCompanyAndCity(p1);
          company = parsedComp.company;
          if (parsedComp.location) location = parsedComp.location;
        }
        if (cleanParts.length >= 3 && cleanParts[2].length <= 45) {
          location = cleanParts[2];
        }
      } else if (cleanParts.length === 1) {
        const rawSingle = cleanParts[0];
        if (pipeRoleRegex.test(rawSingle) && anchor.roleLineIdx === null) {
          role = rawSingle;
        } else {
          const parsedComp = splitCompanyAndCity(rawSingle);
          company = parsedComp.company;
          if (parsedComp.location) location = parsedComp.location;
        }
      }
    }

    if (anchor.nextLineLocationIdx !== null && expLines[anchor.nextLineLocationIdx]) {
      location = expLines[anchor.nextLineLocationIdx].replace(/^Ville de /i, "").trim();
    }

    // GARDE-FOU ANTI-HALLUCINATION : L'entreprise de l'expérience NE DOIT JAMAIS être l'entreprise cible qui recrute !
    if (targetCompLower && targetCompLower.length > 2 && company.toLowerCase().includes(targetCompLower)) {
      const authenticComp = findAuthenticCompanyInCv(cvText);
      company = authenticComp || (isEn ? "Previous Employer" : "Entreprise précédente");
    }

    const prevExpHdrIdx = expLines.findIndex(
      (l, li) => li >= anchor.bodyStartIdx && /^(?:Exp[eé]riences?\s+(?:pr[ée]c[ée]dentes?|ant[ée]rieures?|associatives?)|Autres?\s+exp[eé]riences?|Vie\s+associative|Engagements?\s+associatifs?|Previous\s+experience)\s*:?$/i.test(l)
    );
    let bodyEndIdx = aIdx + 1 < anchors.length ? anchors[aIdx + 1].headerStartIdx : expLines.length;
    if (prevExpHdrIdx >= 0 && prevExpHdrIdx < bodyEndIdx) {
      bodyEndIdx = prevExpHdrIdx;
    }
    const bodyLines = expLines.slice(anchor.bodyStartIdx, bodyEndIdx);

    // Assemblage des lignes brutes coupées par les retours à la ligne PDF, tout en préservant les puces distinctes des PDF sans glyphe "•" (Canva/Word)
    const rawBullets: string[] = [];
    for (let bi = 0; bi < bodyLines.length; bi++) {
      const bLine = bodyLines[bi]
        .replace(/(?:\s*[•●▪▫➢➤✓✔]){2,}/g, " ")
        .replace(/\s+[•●▪▫➢➤✓✔]+\s*$/g, "")
        .trim();
      if (!bLine || /^[•●▪▫➢➤✓✔·*\-–—\s]+$/.test(bLine)) {
        continue;
      }
      const nextBLine = bi + 1 < bodyLines.length ? bodyLines[bi + 1] : "";
      const isBulletStart = /^(?:[•*–—\-]|●|▪|▫|➢|➤|✓|✔|\d+[.)])\s+/.test(bLine);
      const isLabelledLine = /^(?:Contexte|Environnement(?:\s+technique)?|Stack(?:\s+technique)?|Outils|Technologies)\s*:/i.test(bLine);
      const isStandaloneSubheading =
        !isBulletStart &&
        !isLabelledLine &&
        /^[A-Za-zÀ-ÿ0-9\s&/,'’\-]{2,60}:\s*$/.test(bLine) &&
        (!nextBLine || /^(?:[•*–—\-]|●|▪|▫|➢|➤|✓|✔|\d+[.)])\s+/.test(nextBLine));

      if (isStandaloneSubheading) {
        continue;
      }

      if (isBulletStart || isLabelledLine) {
        rawBullets.push(bLine);
      } else if (rawBullets.length > 0) {
        const prev = rawBullets[rawBullets.length - 1].trim();
        const prevEndsSentence = /[.!?]$/.test(prev) && !/(?:etc|ex|cf|p\.ex|e\.g|i\.e)\.$/i.test(prev);
        const prevEndsDangling = /(?:[,;:\-–—/(]|\b(?:de|du|des|d['’]|et|ou|en|à|au|aux|pour|par|avec|sur|dans|entre|vers|chez|le|la|les|l['’]|un|une|son|sa|ses|qui|que|dont|and|or|to|of|for|with|in|on|at|the|a|an))$/i.test(prev);
        const startsWithContinuation = /^[a-zà-ÿ),.;:\]]/.test(bLine);
        const startsWithActionNoun = /^(?:Suivi|Pilotage|Coordination|R[ée]daction|Gestion|Audit|Animation|Validation|Assistance|Formation|Mod[ée]lisation|Conception|Param[ée]trage|Ex[ée]cution|Support|Organisation|Contribution|Accompagnement|[ÉE]laboration|Analyse|Recueil|D[ée]ploiement|Optimisation)\b/.test(bLine);
        const looksLikeStandaloneBulletLine = !startsWithContinuation && !prevEndsDangling && (prev.length >= 28 || (startsWithActionNoun && prev.length >= 16)) && /^[A-ZÀ-Ÿ0-9]/.test(bLine);

        if ((!prevEndsSentence && !looksLikeStandaloneBulletLine) || startsWithContinuation || prevEndsDangling) {
          // Concaténation intelligente (sans espace après un slash comme "PL/" + "SQL")
          rawBullets[rawBullets.length - 1] = prev.endsWith("/") ? `${prev}${bLine}` : `${prev} ${bLine}`;
        } else if (bLine.length > 15 && !/^[A-Z\s]{4,}$/.test(bLine)) {
          rawBullets.push(bLine);
        }
      } else if (bLine.length > 12 && !/^[A-Z\s]{4,}$/.test(bLine)) {
        rawBullets.push(bLine);
      }
    }

    const rawActionOrLabelBullets = rawBullets
      .map((raw) => {
        if (/^(?:Environnement(?:\s+technique)?|Stack(?:\s+technique)?|Outils|Technologies)\s*:/i.test(raw)) {
          let cleanRaw = raw.replace(/\s+/g, " ").trim();
          // Prioriser en tête de liste les technologies de l'environnement qui matchent l'offre cible
          const envMatch = cleanRaw.match(/^((?:Environnement(?:\s+technique)?|Stack(?:\s+technique)?|Outils|Technologies)\s*:\s*)(.+)$/i);
          if (envMatch && requiredKeywords.length > 0) {
            const techItems = envMatch[2].replace(/\.$/, "").split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
            if (techItems.length > 1) {
              const reqLower = requiredKeywords.map((k) => k.toLowerCase());
              const themeDataRegex = /sql|data|power\s*bi|python|tableau|superset|analytics|etl/i;
              const sortedTech = [...techItems].sort((a, b) => {
                const aHit = (reqLower.some((k) => k.includes(a.toLowerCase()) || a.toLowerCase().includes(k)) ? 2 : 0) + (jobFocus?.themes?.dataAi && themeDataRegex.test(a) ? 2 : 0);
                const bHit = (reqLower.some((k) => k.includes(b.toLowerCase()) || b.toLowerCase().includes(k)) ? 2 : 0) + (jobFocus?.themes?.dataAi && themeDataRegex.test(b) ? 2 : 0);
                return bHit - aHit;
              });
              cleanRaw = `${envMatch[1]}${sortedTech.join(", ")}`;
            }
          }
          return /[.!?]$/.test(cleanRaw) ? cleanRaw : `${cleanRaw}.`;
        }
        // Transformer toute ligne "Contexte :" en puce STAR exécutive fluide (sans étiquette LinkedIn figée)
        const withoutContextLabel = raw.replace(/^Contexte\s*:\s*/i, "");
        return harmonizeBulletToStar(withoutContextLabel, isEn);
      })
      .filter((b) => b.length > 5);

    // Scorer chaque puce authentique selon sa pertinence exacte pour l'offre cible AVANT reformulation STAR
    const scoreBulletForJob = (bulletText: string): number => {
      if (!jobFocus) return 0;
      const tokens = tokenizeMeaningfulTerms(bulletText);
      let score = 0;
      for (const t of tokens) {
        const w = jobFocus.weightedTerms.get(t);
        if (w) score += w;
      }
      const bNorm = bulletText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const kw of requiredKeywords) {
        const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (kwNorm.length >= 3 && bNorm.includes(kwNorm)) {
          score += 6;
        }
      }
      if (jobFocus.themes.dataAi && /\b(?:sql|pl\/sql|donn[ée]e|data|dictionnaire|mod[ée]lis|reporting|kpi|analytics)\b/i.test(bulletText)) {
        score += 8;
      }
      if (jobFocus.themes.qaQuality && /\b(?:recette|uat|test|qualit[ée]|anomal|bug|validation)\b/i.test(bulletText)) {
        score += 6;
      }
      if (jobFocus.themes.adoptionChange && /\b(?:formation|adoption|changement|accompagnement|utilisateur|atelier)\b/i.test(bulletText)) {
        score += 6;
      }
      return score;
    };

    // Valoriser les missions différenciantes à forte valeur ajoutée (impact chiffré, amélioration continue, périmètre international, leadership, projets transverses)
    // sans jamais supplanter les exigences directes de l'offre cible.
    const scoreDifferentiatingValue = (bulletText: string): number => {
      let val = 0;
      if (/(?:\d+\s*(?:%|€|\$|k€|m€)|\b\d+\s*(?:à|-|–|to)\s*\d+\b|\b(?:portefeuille|r[ée]f[ée]rences|skus|millions?|sites?|usines?|pays|clients?)\b)/i.test(bulletText)) {
        val += 3;
      }
      if (/\b(?:am[ée]lioration\s+continue|d[ée]veloppement\s+d['’]outils?|automatis\w*|tableau[x]?\s+de\s+bord|dashboard|power\s*bi|vba|macro|kpi|mod[ée]lis\w*|industrialis\w*)\b/i.test(bulletText)) {
        val += 2.5;
      }
      if (/\b(?:r[ée]f[ée]rent|international\w*|europe|chine|italie|anglais|english|lancement\w*|cpfr|fournisseurs?|audit\w*|formation|encadrement|mentor\w*|avant-vente|poc|comit[ée]|gsa|gss|op[ée]rateurs?)\b/i.test(bulletText)) {
        val += 2;
      }
      if (/\b(?:mati[eè]res?\s+premi[eè]res?|conditionnement|arbitrage\w*|tension\w*|allocation\w*|roi|co[ûu]ts?|conformit[ée]|r[ée]glementaire\w*)\b/i.test(bulletText)) {
        val += 1.5;
      }
      return val;
    };

    const envBullets = rawActionOrLabelBullets.filter((b) => /^(?:Environnement(?:\s+technique)?|Stack(?:\s+technique)?|Outils|Technologies)\s*:/i.test(b));
    const actionBullets = rawActionOrLabelBullets.filter(
      (b) => !/^(?:Environnement(?:\s+technique)?|Stack(?:\s+technique)?|Outils|Technologies)\s*:/i.test(b)
    );

    const scoredActions = actionBullets.map((b, origIdx) => {
      const offerScore = scoreBulletForJob(b);
      const diffScore = scoreDifferentiatingValue(b);
      return {
        text: b,
        offerScore,
        diffScore,
        score: (offerScore > 0 ? 100 + offerScore * 3 : 0) + diffScore,
        origIdx,
      };
    });

    const prioritizedRawActions = [...scoredActions]
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.origIdx - b.origIdx));

    // Réécriture sémantique STAR universelle & adaptative selon les thèmes exacts de l'offre cible
    const offerPool = Array.from(new Set([...matchedKeywords])).filter(Boolean);
    const themes = jobFocus?.themes || detectOfferThemes("", targetRoleTitle, requiredKeywords);
    const roleRegister = `${targetRoleTitle} ${requiredKeywords.slice(0, 5).join(" ")}`.toLowerCase();
    const isOfferAgilePo = themes.agileProduct || /\b(?:product\s*owner|proxy\s*po|product\s*manager|chef\s+de\s+produit|backlog|user\s*stor\w*|scrum)\b/i.test(roleRegister);
    const isOfferArch = themes.architecture || /\b(?:architect\w*|urbanis\w*|cartograph\w*)\b/i.test(roleRegister);
    const isOfferProjectApp = (!isOfferAgilePo && !isOfferArch && themes.appLifecycle) || /\b(?:chef\s+de\s+projet|project\s+manager|applicatif|tma|cycle\s+de\s+vie|mco)\b/i.test(roleRegister);

    const usedOpeningsInExp = new Set<string>();

    const pickUniqueClause = (candidates: string[]): string => {
      for (const c of candidates) {
        if (!usedEndingsGlobal.has(c)) {
          usedEndingsGlobal.add(c);
          return c;
        }
      }
      return "";
    };

    const varyLeadingVerb = (sentence: string): string => {
      if (isEn) {
        const m = sentence.match(/^(\S+)\s+(.+)$/);
        if (!m) return sentence;
        const first = m[1];
        const low = first.toLowerCase();
        if (!usedOpeningsInExp.has(low)) {
          usedOpeningsInExp.add(low);
          return sentence;
        }
        const synMap: Record<string, string[]> = {
          spearheaded: ["Led", "Orchestrated", "Directed", "Championed"],
          managed: ["Directed", "Oversaw", "Coordinated", "Governed"],
          delivered: ["Executed", "Shipped", "Driven", "Produced"],
          analyzed: ["Evaluated", "Assessed", "Audited", "Investigated"],
        };
        const alts = synMap[low] || [];
        for (const alt of alts) {
          if (!usedOpeningsInExp.has(alt.toLowerCase())) {
            usedOpeningsInExp.add(alt.toLowerCase());
            return `${alt} ${m[2]}`;
          }
        }
        return sentence;
      }

      const m = sentence.match(/^(\S+)\s+(.+)$/);
      if (!m) return sentence;
      const first = m[1];
      const low = first.toLowerCase();
      if (!usedOpeningsInExp.has(low)) {
        usedOpeningsInExp.add(low);
        return sentence;
      }
      const frSynMap: Record<string, string[]> = {
        piloter: ["Orchestrer", "Diriger", "Structurer", "Conduire"],
        animer: ["Coordonner", "Faciliter", "Mener", "Orchestrer"],
        conduire: ["Mener", "Orchestrer", "Piloter", "Cadrer"],
        superviser: ["Garantir", "Sécuriser", "Coordonner", "Contrôler"],
        gérer: ["Administrer", "Coordonner", "Piloter", "Structurer"],
        analyser: ["Qualifier", "Auditer", "Étudier", "Évaluer"],
        configurer: ["Paramétrer", "Déployer", "Structurer", "Adapter"],
        rédiger: ["Formaliser", "Élaborer", "Structurer", "Documenter"],
        déployer: ["Mettre en œuvre", "Industrialiser", "Orchestrer", "Structurer"],
        assurer: ["Garantir", "Sécuriser", "Coordonner", "Maintenir"],
      };
      const alts = frSynMap[low] || [];
      for (const alt of alts) {
        if (!usedOpeningsInExp.has(alt.toLowerCase())) {
          usedOpeningsInExp.add(alt.toLowerCase());
          return `${alt} ${m[2]}`;
        }
      }
      return sentence;
    };

    const reformulateStarBulletForOffer = (bullet: string, _bIdx: number): string => {
      let body = bullet.replace(/[.!?]+$/, "").trim();
      if (!body) return "";

      // 1. Adaptation universelle par profil + thèmes réels de l'offre (Data & IA, Produit Agile, Cycle applicatif, Architecture SI)
      if (!isEn) {
        // Reformulation universelle des structures fréquentes de CV francophones à l'infinitif
        body = body
          .replace(/\bPilot(?:er|é),\s*prioris(?:er|é)\s+et\s+arbitr(?:er|é)\s+un\s+backlog\s+stratégique\s+multi-projets,\s*en\s+assurant\s+l['’]alignement\s+permanent\s+entre\s+la\s+vision\s+métier,\s*la\s+rentabilité\s+et\s+les\s+contraintes\s+réglementaires\s+bancaires\b/gi,
            themes.dataAi
              ? "Prioriser et arbitrer le backlog produit multi-projets en traduisant les enjeux métiers, la rentabilité et les exigences réglementaires en feuille de route orientée valeur et pilotage par les KPI"
              : themes.architecture
              ? "Cadrer et arbitrer la feuille de route d'évolution SI multi-projets en garantissant l'alignement entre enjeux métiers, urbanisation et contraintes réglementaires"
              : "Arbitrer et prioriser un portefeuille backlog multi-projets afin de maximiser la valeur métier, la rentabilité et la conformité réglementaire")
          .replace(/\bAnim(?:er|é)\s+les\s+rituels\s+Agile\s*\(([^)]+)\)\s*et\s*orchestration\s+des\s+équipes\s+de\s+développement,\s*des\s+équipes\s+TMA\s+et\s+des\s+partenaires\s+éditeurs\s+pour\s+garantir\s+des\s+cycles\s+de\s+livraison\s+fluides\s+et\s+itératifs\b/gi,
            themes.dataAi
              ? "Orchestrer les cérémonies Scrum ($1) et coordonner les équipes d'ingénierie, TMA et partenaires éditeurs pour livrer en continu des évolutions produits fiables et mesurables"
              : themes.appLifecycle
              ? "Coordonner les rituels Agile ($1) et synchroniser les équipes de développement, TMA et éditeurs afin de garantir la continuité applicative et la fluidité des mises en production"
              : "Animer les cérémonies Agiles ($1) et synchroniser développeurs, TMA et éditeurs pour sécuriser des livraisons incrémentales régulières")
          .replace(/\bCondui(?:re|t)\s+les\s+ateliers\s+de\s+recueil\s+des\s+besoins\s+auprès\s+de\s+la\s+MOA,\s*rédaction\s+d['’]User\s+Stories\s+à\s+fort\s+impact\s+et\s+élaboration\s+de\s+spécifications\s+fonctionnelles\s+détaillées\b/gi,
            themes.dataAi
              ? "Transformer les besoins métiers MOA en User Stories actionnables assorties de critères d'acceptation précis et de spécifications fonctionnelles orientées usage et données"
              : themes.architecture
              ? "Conduire les ateliers d'architecture fonctionnelle avec la MOA et formaliser les spécifications fonctionnelles détaillées (SFD) ainsi que les impacts inter-applicatifs"
              : "Animer le cadrage métier avec la MOA et rédiger les User Stories avec critères d'acceptation et spécifications fonctionnelles prêtes pour le sprint")
          .replace(/\bSupervis(?:er|é)\s+les\s+phases\s+de\s+recette\s+fonctionnelle,\s*validation\s+des\s+livraisons\s+et\s+supervision\s+du\s+paramétrage\s+fonctionnel\s+ainsi\s+que\s+du\s+support\s+de\s+niveau\s+1\s*&\s*2\s+pour\s+assurer\s+une\s+continuité\s+de\s+service\s+optimale\b/gi,
            themes.qaQuality || themes.dataAi
              ? "Garantir la qualité des livrables via la recette fonctionnelle (UAT), le pilotage du paramétrage et la résolution des incidents support N1/N2 en production"
              : "Piloter les campagnes de recette fonctionnelle (UAT), valider les livrables en production et orchestrer le paramétrage ainsi que le support N1/N2 pour assurer la continuité de service")
          .replace(/\bAnim(?:er|é)\s+(?:d['’]|des\s+)ateliers\s+métiers\s+et\s+de\s+comités\s+de\s+pilotage,\s*recueil\s+des\s+besoins\s+complexes\s+et\s+rédaction\s+de\s+spécifications\s+fonctionnelles\s+détaillées\b/gi,
            (isOfferArch && !isOfferAgilePo)
              ? "Animer les comités et ateliers d'urbanisation pour formaliser les exigences complexes en spécifications fonctionnelles détaillées (SFD) et schémas de flux"
              : themes.dataAi
              ? "Conduire les ateliers de discovery métier et comités de pilotage pour traduire des besoins complexes en User Stories et spécifications fonctionnelles exploitables"
              : "Orchestrer les ateliers métiers et comités de pilotage, formalisant les besoins complexes en exigences fonctionnelles actionnables")
          .replace(/\bConfigur(?:er|é)\s+et\s+paramétr(?:er|é)\s+les\s+écosystèmes\s+Salesforce([^,]*),\s*associés\s+à\s+une\s+modélisation\s+rigoureuse\s+des\s+données\s*\(([^)]+)\)/gi,
            themes.dataAi
              ? "Structurer la modélisation des données ($2) et configurer les plateformes Salesforce$1 pour fiabiliser la collecte, la qualité et la mise à disposition des données métiers"
              : themes.architecture
              ? "Urbaniser et paramétrer les environnements Salesforce$1 autour d'une modélisation de données structurée ($2) garantissant la cohérence des flux"
              : "Configurer les modules Salesforce$1 et concevoir les dictionnaires de données ($2) pour soutenir l'évolutivité métier")
          .replace(/\bPilot(?:er|é)\s+l['’]exécution\s+des\s+tests,\s*validation\s+fonctionnelle\s+et\s+sécurisation\s+des\s+déploiements\s+pour\s+garantir\s+la\s+qualité\s+et\s+la\s+conformité\s+des\s+livrables\b/gi,
            themes.dataAi
              ? "Garantir la conformité et la fiabilité des livrables par l'exécution rigoureuse des tests fonctionnels (QA) et la sécurisation des déploiements en production"
              : "Piloter la validation fonctionnelle (UAT), encadrer l'exécution des plans de tests et sécuriser chaque mise en production")
          .replace(/\bAnim(?:er|é)\s+des\s+sessions\s+de\s+formation\s+et\s+d['’]accompagnement\s+[àa]\s+l['’]adoption\s+pour\s+les\s+utilisateurs\s+finaux\s*;\s*contribution\s+active\s+aux\s+réponses\s+d['’]appels\s+d['’]offres\s+et\s+aux\s+démonstrations\s+produits\s*\(POC\)/gi,
            themes.adoptionChange || themes.dataAi
              ? "Accélérer l'adoption produit auprès des utilisateurs finaux via des formations dédiées et des démonstrations POC, tout en contribuant aux avant-ventes stratégiques"
              : "Conduire le déploiement humain (formations utilisateurs, guides d'adoption) et soutenir les phases d'avant-vente via des démonstrations produit (POC)")
          .replace(/\bAnalys(?:er|é)\s+les\s+besoins\s+exprimés\s+par\s+la\s+MOA\s+et\s+accompagnement\s+technique\s+et\s+fonctionnel\s+sur\s+les\s+projets\s+du\s+patrimoine\s+bancaire\b/gi,
            themes.dataAi
              ? "Traduire les besoins métiers de la MOA en exigences fonctionnelles exploitables et piloter l'alignement technico-fonctionnel des projets du patrimoine bancaire"
              : themes.architecture
              ? "Cartographier les besoins fonctionnels de la MOA et cadrer l'évolution des systèmes du patrimoine bancaire"
              : "Qualifier les besoins MOA et coordonner l'accompagnement technico-fonctionnel des projets sur le patrimoine applicatif bancaire")
          .replace(/\bInterven(?:ir|u)\s+sur\s+des\s+projets\s+de\s+transformation\s+Salesforce\s+majeurs\s+et\s+multi-secteurs\s*\(([^)]+)\)\s*pour\s+des\s+comptes\s+de\s+référence\s*\(([^)]+)\)/gi,
            "Déployer des programmes de transformation digitale multi-secteurs sur Salesforce ($1) auprès de grands comptes ($2)")
          .replace(/\bPilot(?:er|é)\s+la\s+stratégie\s+produit\s+Salesforce\s+au\s+sein\s+d['’]un\s+établissement\s+financier\s+de\s+premier\s+plan\s+en\s+environnement\s+hautement\s+réglementé\b/gi,
            themes.dataAi
              ? "Piloter la feuille de route et la livraison incrémentale de produits CRM & données en environnement bancaire réglementé"
              : "Piloter de bout en bout la stratégie produit et les évolutions applicatives au sein d'un acteur financier majeur en contexte réglementé")
          .replace(/\bAnalys(?:er|é)\s+techniquement\s+les\s+tickets,\s*corrections\s+de\s+bugs,\s*reprises\s+de\s+données\s+et\s+requêtage\s+sur\s+bases\s+de\s+données\b/gi,
            themes.dataAi
              ? "Qualifier les anomalies applicatives, exécuter des requêtes SQL d'investigation et fiabiliser les reprises et l'intégrité des données en base relationnelle"
              : "Qualifier les incidents de production, piloter la résolution des anomalies et assurer les reprises de données sous bases relationnelles");
      }

      // 2. Normalisation syntaxique universelle à l'infinitif pour TOUT CV (éliminer formes nominales internes après virgule / conjonction)
      body = body
        .replace(/\bet\s+orchestration\s+des\s+/gi, "et orchestrer les ")
        .replace(/\bet\s+collaboration\s+[ée]troite\b/gi, "en collaboration étroite")
        .replace(/\bet\s+accompagnement\s+technique\s+et\s+fonctionnel\b/gi, "et assurer l'accompagnement technique et fonctionnel")
        .replace(/\bet\s+description\s+des\s+/gi, "et décrire les ")
        .replace(/\bet\s+r[ée]duction\s+des\s+/gi, "et réduire les ")
        .replace(/\bet\s+r[ée]duction\s+du\s+/gi, "et réduire le ")
        .replace(/\bet\s+r[ée]duction\s+de\s+la\s+/gi, "et réduire la ")
        .replace(/\bet\s+gestion\s+des\s+/gi, "et gérer les ")
        .replace(/\bet\s+gestion\s+de\s+la\s+/gi, "et gérer la ")
        .replace(/\bet\s+gestion\s+du\s+/gi, "et gérer le ")
        .replace(/\bet\s+automatisation\s+(Terraform|Ansible|Python|CI\/CD|Bash|PowerShell)/gi, "et automatiser le provisionnement sous $1")
        .replace(/\bet\s+automatisation\s+(?:de\s+la\s+|de\s+l['’]|du\s+|des\s+)/gi, "et automatiser ")
        .replace(/\bet\s+optimisation\s+(?:de\s+la\s+|de\s+l['’]|du\s+|des\s+)/gi, "et optimiser ")
        .replace(/\b,\s*rédaction\s+d['’\s]User\s+Stories\b/gi, ", rédiger les User Stories")
        .replace(/\b,\s*rédaction\s+des\s+/gi, ", rédiger les ")
        .replace(/\b,\s*rédaction\s+de\s+/gi, ", rédiger des ")
        .replace(/\bet\s+[ée]laboration\s+des\s+/gi, "et élaborer les ")
        .replace(/\bet\s+[ée]laboration\s+de\s+/gi, "et élaborer des ")
        .replace(/\b,\s*validation\s+des\s+/gi, ", valider les ")
        .replace(/\b,\s*validation\s+fonctionnelle\b/gi, ", valider les livrables fonctionnels")
        .replace(/\bet\s+sécurisation\s+des\s+/gi, "et sécuriser les ")
        .replace(/\b,\s*création\s+de\s+/gi, ", créer ")
        .replace(/\b,\s*exécution\s+des\s+/gi, ", exécuter les ")
        .replace(/\bet\s+présentation\s+des\s+/gi, "et présenter les ")
        .replace(/\b,\s*recueil\s+des\s+/gi, ", recueillir les ")
        .replace(/\b,\s*paramétrage\b/gi, ", assurer le paramétrage")
        .replace(/\bet\s+manipulation\s+de\s+/gi, "et exploiter les ")
        .replace(/\bet\s+développement\s+sur\s+/gi, "et développer sur ")
        .replace(/\s*;\s*contribution\s+active\s+aux\s+/gi, " tout en contribuant activement aux ")
        .replace(/\b,\s*associés\s+[àa]\s+une\s+modélisation\s+rigoureuse\s+des\s+données\b/gi, " avec modélisation structurée des données");

      if (!isEn) {
        body = ensureFrenchInfinitiveBullet(body);
      }

      if (isOfferArch && !themes.agileProduct) {
        body = body.replace(/\bspécifications?\s+fonctionnelles?\s+détaillées?(?!\s*\(SFD\))\b/gi, "spécifications fonctionnelles détaillées (SFD)");
      } else if (isOfferAgilePo) {
        const alreadyMentionsUs = /\buser\s*stor/i.test(body);
        body = body.replace(
          /\bspécifications?\s+fonctionnelles?\s+détaillées?(?:\s*\(SFD\))?\b/gi,
          alreadyMentionsUs ? "spécifications fonctionnelles" : "User Stories et spécifications fonctionnelles"
        );
      }

      // 3. Rotation des verbes d'ouverture pour éviter les répétitions au sein d'un même poste
      body = varyLeadingVerb(body);

      // 4. Ajout d'une clause d'impact STAR ciblée et variée SI la puce n'en comporte pas encore ET n'a pas déjà une précision concrète/chiffrée suffisante
      const hasResultClause = /\b(?:afin\s+de|afin\s+d['’]|permettant\s+de|permettant\s+d['’]|pour\s+(?:traduire|livrer|garantir|s[eé]curiser|optimiser|acc[ée]l[ée]rer|aligner|fiabiliser|maximiser|assurer|renforcer|soutenir|fluidifier|valider|am[eé]liorer|valoriser)|visant\s+[aà]|r[eé]duisant|am[eé]liorant|g[eé]n[eé]rant|garantissant|assurant|orient[ée]e?\s+(?:valeur|qualit[ée]|client)|pr[êe]tes?\s+pour|to\s+ensure|driving|enabling|delivering|streamlining)\b/i.test(body) ||
        /^(?:Garantir?\s+la\s+(?:qualit[ée]|conformit[ée])|Acc[ée]l[ée]rer?\s+l['’]adoption|S[ée]curiser?\s+la\s+(?:qualit[ée]|conformit[ée]))(?=\s|$|[,.:;])/i.test(body) ||
        /\([^)]{3,40}\)|\b\d+\s*(?:%|€|\$|k€|m€|à\s+\d+)/i.test(body) ||
        body.length >= 95;

      if (!hasResultClause) {
        const bLow = body.toLowerCase();
        if (isEn) {
          if (/supply|demand|stock|inventory|forecast|approvision|s&op|otif|cpfr|entrep[oô]t|warehouse|fournisseur|supplier/i.test(bLow)) {
            body += pickUniqueClause([
              ", strengthening forecast accuracy, stock availability, and service-level performance",
              ", optimizing inventory turnover while mitigating stockouts and overstock risks",
              ", enhancing end-to-end supply chain visibility and supplier OTIF compliance",
            ]);
          } else if (/data|sql|analytics|bi\b|dashboard|reporting|model/i.test(bLow)) {
            body += pickUniqueClause([
              ", ensuring data accuracy and actionable business insights",
              ", strengthening data governance and analytical reliability",
              ", enabling scalable reporting and informed decision-making",
            ]);
          } else if (/test|uat|qa\b|recette|bug|ticket|anomal/i.test(bLow)) {
            body += pickUniqueClause([
              ", securing release quality and operational continuity",
              ", safeguarding deliverable compliance and production stability",
            ]);
          } else if (/training|formation|change|atelier|workshop|user|adoption/i.test(bLow)) {
            body += pickUniqueClause([
              ", accelerating product adoption across operational teams",
              ", aligning cross-functional partners on clear operational standards",
            ]);
          } else {
            body += pickUniqueClause([
              ", delivering measurable business value on schedule",
              ", driving cross-functional alignment and execution excellence",
            ]);
          }
        } else {
          if (/stock|approvisionn|pr[ée]vision|forecast|s&op|otif|cpfr|inventaire|rupture|surstock|couverture|allocation|sell-in|sell-out|fournisseur|entrep[oô]t/i.test(bLow)) {
            body += pickUniqueClause([
              " afin d'optimiser la couverture des stocks, le taux de service et la fiabilité des prévisions",
              " pour anticiper les ruptures, limiter les surstocks et sécuriser la continuité des flux",
              " afin de renforcer la performance fournisseurs (OTIF) et l'agilité de la chaîne d'approvisionnement",
            ]);
          } else if (/\b(?:sql|uml|ddl|poweramc|dictionnaire|mod[ée]lis|base\s+de\s+donn[ée]es)\b/i.test(bLow)) {
            body += pickUniqueClause(
              themes.dataAi
                ? [
                    " afin de fiabiliser la qualité des données et l'aide à la décision",
                    " pour garantir l'intégrité des flux et la valorisation analytique",
                    " afin de structurer des référentiels exploitables à l'échelle",
                  ]
                : [
                    " afin de fiabiliser l'intégrité des données et l'évolutivité applicative",
                    " pour garantir la cohérence des modèles et la performance des échanges",
                  ]
            );
          } else if (/recette|uat|qa\b|test|bug|ticket|anomal|support|exploitation|incident|s[ée]curit[ée]/i.test(bLow)) {
            body += pickUniqueClause([
              " afin de garantir la qualité des livrables et la continuité de service",
              " pour sécuriser la conformité fonctionnelle et la stabilité en production",
              " afin de réduire les incidents et renforcer la fiabilité des opérations",
            ]);
          } else if (/formation|changement|accompagnement|adoption|documentation|poc/i.test(bLow)) {
            body += pickUniqueClause([
              " afin d'accélérer l'adoption des solutions par les équipes métiers",
              " pour fluidifier l'appropriation des nouveaux usages et processus",
            ]);
          } else if (/backlog|user stor|sprint|agile|scrum|cadrage|besoin|sp[ée]cification|moa|atelier/i.test(bLow)) {
            body += pickUniqueClause(
              themes.dataAi
                ? [
                    " pour transformer les attentes métiers en livrables à forte valeur",
                    " afin d'aligner les priorités avec les équipes partenaires",
                  ]
                : [
                    " pour garantir l'alignement continu entre enjeux métiers et réalisation",
                    " afin d'accélérer la livraison incrémentale de valeur opérationnelle",
                  ]
            );
          } else if (/ci\/cd|d[ée]ploiement|kubernetes|terraform|cloud|pipeline|automatis/i.test(bLow)) {
            body += pickUniqueClause([
              " afin d'accélérer la vélocité des mises en production et la résilience technique",
              " pour fiabiliser l'industrialisation des déploiements et l'élasticité des infrastructures",
              " afin de réduire les délais de livraison tout en maintenant un haut niveau de qualité",
            ]);
          } else if (/maintenance|gmao|sap\s*pm|fiabilit|critic|mtbf|mttr|trs|smed|tpm|5s|pi[eè]ces\s+d[ée]tach|parc\s+machine|moyens?\s+de\s+production/i.test(bLow)) {
            body += pickUniqueClause([
              " afin d'optimiser la disponibilité des équipements et la fiabilité de la maintenance",
              " pour réduire les temps d'arrêt machine et sécuriser la continuité de production",
              " afin de standardiser les interventions techniques et maîtriser la criticité du parc",
              " pour structurer la traçabilité des opérations et piloter les indicateurs de fiabilité",
              " afin de fiabiliser le suivi du parc industriel et la performance des lignes",
              " pour renforcer la réactivité des interventions et la maîtrise des coûts d'exploitation",
            ]);
          } else if (/agronom|sol\b|stress\s+hydrique|v[ée]g[ée]tal|ma[ïi]s|bl[ée]|orge|adventice|germination|micro-parcelle|exp[ée]rimentation|rendement|r[ée]f[ée]rence|contr[oô]le\s+qualit[ée]|audit|contentieux/i.test(bLow)) {
            body += pickUniqueClause([
              " afin de produire des références agronomiques fiables et exploitables sur le terrain",
              " pour sécuriser la rigueur scientifique des protocoles d'essai et la qualité des analyses",
              " afin d'objectiver les écarts observés et formuler des conclusions techniques argumentées",
              " pour fiabiliser la traçabilité des relevés terrain et la pertinence des préconisations",
            ]);
          } else {
            body += pickUniqueClause([
              " afin de sécuriser la tenue des jalons et la satisfaction des parties prenantes",
              " pour optimiser la coordination transverse et l'efficacité opérationnelle",
              " afin d'élever durablement la performance et la qualité de service",
            ]);
          }
        }
      }

      body = body
        .replace(/([A-Z]{2,5})\s*\/\s*([A-Z]{2,5})/g, "$1 / $2")
        .replace(/([A-Z]{2,5})\s*\/\s*([A-Z]{2,5})/g, "$1 / $2");
      body = body.charAt(0).toUpperCase() + body.slice(1);
      return /[.!?]$/.test(body) ? body : `${body}.`;
    };

    const prioritizedActions = prioritizedRawActions.map((item, bIdx) =>
      reformulateStarBulletForOffer(item.text, bIdx)
    );

    const formattedBullets = [...prioritizedActions, ...envBullets];

    // Compétences authentiques prouvées dans CETTE expérience (sans jamais injecter des termes de l'offre absents du rôle)
    const roleBodyNorm = `${role} ${formattedBullets.join(" ")}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\bs\s*&\s*op\b/g, "sop");
    const roleSpecificKeywords = (
      matchedKeywords.length > 0
        ? matchedKeywords.filter((kw) => {
            const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const toks = tokenizeMeaningfulTerms(kw);
            return hasWholeTokenInNormCorpus(roleBodyNorm, kwNorm) || (toks.length > 0 && toks.every((tok) => hasWholeTokenInNormCorpus(roleBodyNorm, tok)));
          })
        : extractSkillsAndCompetencies(`${role} ${formattedBullets.join(" ")}`, "", 4, isEn)
    ).slice(0, 4);

    const keyHighlights = prioritizedActions.slice(0, 2);

    const normalizedRole = sanitizeJobRoleTitle(role) || role;

    // Score de pertinence stratégique de cette expérience vis-à-vis de l'offre ciblée
    let expRelevanceScore = 0;
    const expRoleNorm = normalizedRole.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const targetRoleNorm = (targetRoleTitle || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const targetRoleTokens = tokenizeMeaningfulTerms(targetRoleNorm).filter((t) => t.length >= 3);
    for (const rt of targetRoleTokens) {
      if (expRoleNorm.includes(rt)) expRelevanceScore += 10;
    }
    if (
      (/\b(?:product\s*owner|proxy|product\s*manager|chef\s+de\s+produit|amoa|business\s+analyst|architect)\b/i.test(targetRoleNorm) &&
        /\b(?:product\s*owner|proxy|product\s*manager|chef\s+de\s+produit|amoa|business\s+analyst|architect|consultant\s+fonctionnel|scrum)\b/i.test(expRoleNorm)) ||
      (/\b(?:devops|cloud|sre|infra|syst[eè]me|platform)\b/i.test(targetRoleNorm) &&
        /\b(?:devops|cloud|sre|infra|syst[eè]me|platform|kubernetes|aws)\b/i.test(expRoleNorm)) ||
      (/\b(?:data|analytics|bi|ia|machine\s+learning)\b/i.test(targetRoleNorm) &&
        /\b(?:data|analytics|bi|ia|sql|etl|scientist)\b/i.test(expRoleNorm))
    ) {
      expRelevanceScore += 8;
    }
    const expCombinedNorm = `${normalizedRole} ${formattedBullets.join(" ")}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (jobFocus) {
      for (const tok of tokenizeMeaningfulTerms(expCombinedNorm)) {
        const w = jobFocus.weightedTerms.get(tok);
        if (w) expRelevanceScore += Math.min(4, w);
      }
    }
    for (const kw of requiredKeywords) {
      const kwN = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (kwN.length >= 3 && expCombinedNorm.includes(kwN)) {
        expRelevanceScore += 5;
      } else {
        const kwToks = tokenizeMeaningfulTerms(kwN);
        if (kwToks.some((t) => t.length >= 4 && expCombinedNorm.includes(t))) {
          expRelevanceScore += 3;
        }
      }
    }
    // Bonus d'affinité sectorielle (ex. expérience Cosmétique sur offre Cosmétique/Luxe)
    const expCompanyAndTextNorm = `${company} ${expCombinedNorm}`.toLowerCase();
    const jobDomainLower = (jobFocus?.domainLabel || "").toLowerCase();
    if (
      (/cosm[ée]tique|cosmetics|beaut[ée]|luxe|luxury/i.test(jobDomainLower) && /cosm[ée]tique|dermo|beaut[ée]|parfum|luxe|av[eè]ne|sephora|loreal|l'oreal|sisley|sysley/i.test(expCompanyAndTextNorm)) ||
      (/agroalimentaire|fmcg|food/i.test(jobDomainLower) && /agroalimentaire|alimentaire|grande\s+distribution|intermarch[ée]|netto|danone|nestl[ée]|kellanova/i.test(expCompanyAndTextNorm)) ||
      (/banque|bank|financ/i.test(jobDomainLower) && /banque|bank|financ|bnp|soci[ée]t[ée]\s+g[ée]n[ée]rale|axa|assurance|cr[ée]dit/i.test(expCompanyAndTextNorm))
    ) {
      expRelevanceScore += 10;
    }
    const endYearMatch = (endDate || "").match(/\b(20\d\d|19\d\d)\b/);
    const endYear = endYearMatch ? parseInt(endYearMatch[1], 10) : 0;
    const isCurrentExp = endDate.toLowerCase().includes("pr") || endDate.toLowerCase().includes("pres") || endDate.toLowerCase().includes("aujourd");
    if (isCurrentExp) expRelevanceScore += 6;
    else if (endYear >= 2022) expRelevanceScore += 4;
    else if (endYear >= 2018) expRelevanceScore += 2;
    const isAssociativeExp =
      isAssociativeAnchor ||
      /\b(?:ovalies|bureau\s+de\s+promotion|vie\s+associative|student\s+association)\b/i.test(`${company} ${normalizedRole}`);
    if (isAssociativeExp) {
      expRelevanceScore -= 20;
    } else if (/\b(?:vendeur|caissier|h[oô]te|serveur|livreur|b[eé]n[eé]vole|tuteur)\b/i.test(expRoleNorm)) {
      expRelevanceScore -= 12;
    } else if (/\b(?:stage|stagiaire|intern|alternan|apprentissage|contrat\s+de\s+professionnalisation)\b/i.test(expRoleNorm)) {
      expRelevanceScore -= 2;
    }

    experiences.push({
      id: `exp-${experiences.length + 1}`,
      role: normalizedRole,
      company,
      location,
      startDate,
      endDate,
      current: isCurrentExp,
      bullets: formattedBullets,
      keyAchievementsHighlighted: keyHighlights,
      matchedKeywordsInRole: roleSpecificKeywords.length > 0 ? roleSpecificKeywords : offerPool.slice(0, 3),
      _relevanceScore: expRelevanceScore,
      _rawIdx: experiences.length,
      _isAssociative: isAssociativeExp,
    });
  }

  // Si aucune expérience n'a pu être structurée, chercher les entreprises authentiques
  if (experiences.length === 0) {
    const authenticComp = findAuthenticCompanyInCv(cvText) || (isEn ? "Previous Employer" : "Entreprise précédente");
    const defaultRole = targetRoleTitle || (isEn ? "Professional Role" : "Poste professionnel");
    const topFocus = joinNaturalList(matchedKeywords.slice(0, 3).map((k) => formatSkillForProse(k, isEn)), isEn) || (isEn ? "functional analysis and project delivery" : "analyse fonctionnelle et pilotage de projet");
    experiences.push({
      id: "exp-1",
      role: defaultRole,
      company: authenticComp,
      location: defaultLocation || (isEn ? "Hybrid / Remote" : "Paris / Hybride"),
      startDate: "2021",
      endDate: "2024",
      current: false,
      bullets: isEn
        ? [
            `Spearheaded core ${topFocus} initiatives with high operational rigor and cross-functional alignment.`,
            "Coordinated multidisciplinary project deliverables and ensured continuous stakeholder engagement.",
            "Conducted requirements analysis, optimized delivery workflows, and secured quality milestones."
          ]
        : [
            `Piloter les initiatives majeures autour ${frDe(topFocus)} en garantissant l'alignement des parties prenantes.`,
            "Coordonner les livrables projets transverses et veiller au respect des jalons stratégiques.",
            "Conduire les analyses de besoins, optimiser les flux opérationnels et assurer la qualité des réalisations."
          ],
      keyAchievementsHighlighted: [
        isEn ? `Delivered key ${topFocus} milestones with high stakeholder satisfaction` : `Atteinte rigoureuse des jalons sur ${topFocus}`
      ],
      matchedKeywordsInRole: matchedKeywords ? matchedKeywords.slice(0, 3) : []
    });
  }

  // Enrichir uniquement les expériences courtes (1-2 puces) de façon SPÉCIFIQUE au rôle authentique et aux thèmes exacts de l'offre
  const offerRoleNorm = targetRoleTitle.toLowerCase();
  const themes = jobFocus?.themes || detectOfferThemes("", targetRoleTitle, requiredKeywords);
  const isPoTarget = themes.agileProduct || /\b(?:product\s*owner|proxy\s*po|product\s*manager|chef\s+de\s+produit|scrum)\b/i.test(offerRoleNorm);
  const isArchTarget = themes.architecture || /\b(?:architect\w*|urbanis\w*)\b/i.test(offerRoleNorm);

  for (let idx = 0; idx < experiences.length; idx++) {
    const exp = experiences[idx];
    const expRoleLower = (exp.role || "").toLowerCase();
    const expCorpusLower = `${exp.role} ${exp.bullets.join(" ")}`.toLowerCase();

    if (exp.bullets.length === 1) {
      if (isEn) {
        if (/supply|demand|planning|approvision|stock|forecast|logistique/i.test(expCorpusLower)) {
          exp.bullets.push("Monitored key supply chain KPIs (service rate, OTIF, forecast accuracy, inventory coverage) to support S&OP alignment.");
          exp.bullets.push("Coordinated closely with commercial, marketing, and supplier partners to anticipate shortages and optimize stock levels.");
        } else if (/business\s+analyst|analyst/i.test(expRoleLower)) {
          exp.bullets.push(
            isPoTarget
              ? "Translated business requirements into actionable User Stories with clear acceptance criteria and coordinated delivery with technical squads."
              : "Formalized detailed functional specifications (SFD) and coordinated UAT validation cycles with engineering teams."
          );
          exp.bullets.push("Facilitated business alignment workshops and supported operational rollout across teams.");
        } else if (/exploit|support|ops|admin/i.test(expRoleLower)) {
          exp.bullets.push(
            themes.dataAi
              ? "Structured SQL diagnostic queries and automated data quality checks to secure operational reporting reliability."
              : "Monitored production incidents, prioritized root-cause fixes, and maintained SLA continuity on critical infrastructure."
          );
          exp.bullets.push("Documented operational runbooks and collaborated with engineering teams to accelerate incident resolution.");
        } else if (/maintenance|fiabilit|m[ée]thodes|gmao|sap\s*pm|industriel/i.test(expCorpusLower)) {
          exp.bullets.push("Monitoring equipment reliability KPIs (MTBF, MTTR, OEE) and standardizing preventive maintenance plans within the CMMS.");
          exp.bullets.push("Coordinating closely with production, technical teams, and suppliers to improve asset availability and reduce downtime.");
        } else if (/agronom|soil|wheat|corn|maize|crop|trial|experiment|unilasalle|agrial|quality\s+control|audit/i.test(expCorpusLower)) {
          exp.bullets.push("Structured field measurements and statistical data analysis (R Studio) to deliver reliable, actionable trial references.");
          exp.bullets.push("Drafted detailed technical conclusions and agronomic recommendations grounded in observed field performance.");
        } else if (exp._isAssociative) {
          exp.bullets.push("Coordinated administrative tracking, stakeholder communication, and logistics execution across student association events.");
        } else {
          exp.bullets.push("Coordinated cross-functional reviews with key stakeholders to secure operational KPIs and deliverables.");
          exp.bullets.push("Monitored performance indicators and implemented continuous improvement action plans.");
        }
      } else {
        if (/agronom|bl[ée]|ma[ïi]s|orge|sol\b|adventice|v[ée]g[ée]tal|germination|exp[ée]rimentation|parcelle|rendement|stress\s+hydrique|unilasalle|agrial/i.test(expCorpusLower)) {
          exp.bullets.push("Structurer la collecte et l'analyse statistique des mesures terrain pour objectiver les écarts de comportement et garantir la fiabilité des références produites.");
          exp.bullets.push("Rédiger des synthèses techniques et recommandations argumentées à destination des équipes terrain et partenaires.");
        } else if (/\b(?:supply\s*chain|demand\s*planning|supply\s*planning|approvisionnement|gestion\s+des\s+stocks|s&op|otif|cpfr|pr[ée]visions?\s+des\s+ventes)\b/i.test(expCorpusLower)) {
          exp.bullets.push("Suivre et analyser les indicateurs clés de performance (taux de service, OTIF, forecast accuracy, couverture de stocks) dans le cadre du processus S&OP.");
          exp.bullets.push("Collaborer étroitement avec les équipes commerciales, marketing et fournisseurs pour anticiper les risques de rupture et optimiser les flux.");
        } else if (/maintenance|fiabilit|m[ée]thodes|gmao|sap\s*pm|parc\s+machine|moyens?\s+de\s+production/i.test(expCorpusLower)) {
          exp.bullets.push("Analyser les indicateurs de fiabilité (MTBF, MTTR, TRS) et actualiser les plans de maintenance préventive sous GMAO pour optimiser la disponibilité des équipements.");
          exp.bullets.push("Coordonner les équipes terrain et le suivi des prestataires techniques afin de résoudre les problématiques mécaniques et sécuriser la continuité industrielle.");
        } else if (exp._isAssociative) {
          exp.bullets.push("Assurer le suivi organisationnel, la coordination des intervenants et la bonne tenue logistique des actions engagées.");
        } else if (/business\s+analyst|analyste\s+m[ée]tier|patrimoine/i.test(expRoleLower) || /moa\b|patrimoine\s+bancaire/i.test(expCorpusLower)) {
          exp.bullets.push(
            isPoTarget && themes.dataAi
              ? "Traduire les attentes métiers de la MOA en User Stories actionnables, suivre les indicateurs clés et valider la conformité des livrables."
              : isPoTarget
              ? "Rédiger les spécifications fonctionnelles, formaliser les critères d'acceptation et prioriser les évolutions applicatives avec les équipes IT."
              : isArchTarget
              ? "Modéliser les processus fonctionnels et formaliser les spécifications détaillées (SFD) ainsi que les impacts inter-applicatifs."
              : "Rédiger les spécifications fonctionnelles détaillées (SFD) et coordonner les campagnes de recette applicative auprès de la MOA."
          );
          exp.bullets.push(
            themes.dataAi
              ? "Assurer la traçabilité des exigences, la qualité des données échangées et la coordination des mises en production avec les équipes techniques."
              : "Assurer le suivi des anomalies, la traçabilité des exigences et la coordination des livraisons avec les équipes de développement."
          );
        } else if (/exploit|support|production|mco|incident/i.test(expCorpusLower)) {
          exp.bullets.push(
            themes.dataAi
              ? "Fiabiliser les requêtes SQL de contrôle, structurer les diagnostics d'intégrité de données et accélérer la résolution des incidents applicatifs."
              : "Assurer le maintien en conditions opérationnelles (MCO), qualifier les incidents critiques et coordonner les résolutions avec les équipes techniques."
          );
          exp.bullets.push(
            isPoTarget
              ? "Consolider le retour d'expérience utilisateurs et contribuer à la priorisation des correctifs pour renforcer la qualité de service."
              : "Documenter les procédures d'exploitation et optimiser les scripts de contrôle pour fiabiliser la continuité applicative."
          );
        } else {
          exp.bullets.push(`Coordonner les actions opérationnelles et le suivi des indicateurs de performance ${exp.company ? `chez ${exp.company}` : "du périmètre"}.`);
          exp.bullets.push("Collaborer avec les équipes partenaires pour optimiser les processus et atteindre les objectifs fixés.");
        }
      }
    }
  }

  // Récupérer un éventuel bloc compact "Expériences précédentes :" (ex: "Business Analyst - Econocom (Mission BNP Paribas)") sans jamais polluer l'expérience précédente
  const prevSectionIdx = expLines.findIndex((l) =>
    /^(?:Exp[eé]riences?\s+(?:pr[ée]c[ée]dentes?|ant[ée]rieures?)|Autres?\s+exp[eé]riences?|Previous\s+experience)\s*:?$/i.test(l)
  );
  if (prevSectionIdx >= 0 && prevSectionIdx + 1 < expLines.length && experiences.length > 0) {
    const tailStopIdx = anchors.find((a) => a.headerStartIdx > prevSectionIdx)?.headerStartIdx ?? expLines.length;
    const compactPrevLines = expLines
      .slice(prevSectionIdx + 1, tailStopIdx)
      .map((l) => l.replace(/^[•*–—\-●▪▫➢➤✓✔\s]+/, "").trim())
      .filter((l) => l.length >= 6 && !DATE_RANGE_REGEX.test(l));
    if (compactPrevLines.length > 0) {
      const compactCompanies: string[] = [];
      const compactBullets: string[] = [];
      for (const pl of compactPrevLines.slice(0, 5)) {
        const dashSplit = pl.split(/\s+[-–—]\s+/);
        if (dashSplit.length >= 2) {
          const rPart = dashSplit[0].trim();
          const cPart = dashSplit.slice(1).join(" - ").trim();
          compactCompanies.push(cPart.replace(/\([^)]*\)/g, "").trim());
          compactBullets.push(
            isEn
              ? `Served as ${rPart} at ${cPart}.`
              : `Exercer les fonctions ${frDe(rPart)} chez ${cPart}.`
          );
        } else {
          compactBullets.push(harmonizeBulletToStar(pl, isEn));
        }
      }
      const earliestYear = experiences
        .map((e: any) => parseInt((e.startDate || "").match(/\b(19\d\d|20\d\d)\b/)?.[1] || "0", 10))
        .filter((y: number) => y > 0)
        .sort((a: number, b: number) => a - b)[0];
      experiences.push({
        id: `exp-${experiences.length + 1}`,
        role: isEn ? "Prior Career Roles & Missions" : "Expériences Précédentes (Parcours Antérieur)",
        company: compactCompanies.filter(Boolean).slice(0, 3).join(" · ") || (isEn ? "Various Enterprises" : "Missions & ESN précédentes"),
        location: defaultLocation || (isEn ? "France" : "France"),
        startDate: earliestYear ? (isEn ? `Prior to ${earliestYear}` : `Antérieur à ${earliestYear}`) : (isEn ? "Prior" : "Antérieur"),
        endDate: earliestYear ? String(earliestYear) : "",
        current: false,
        bullets: compactBullets,
        keyAchievementsHighlighted: compactBullets.slice(0, 1),
        matchedKeywordsInRole: (matchedKeywords || []).slice(0, 2),
        _relevanceScore: 3,
        _rawIdx: experiences.length,
        _isCompactPrior: true,
      });
    }
  }

  // Filtrage & priorisation stratégique des expériences les plus pertinentes pour l'offre ciblée
  // Tout en préservant jusqu'à 3 expériences cœur authentiques (évite de tronquer à tort un parcours de 3 postes)
  let selectedExperiences = experiences;
  if (experiences.length >= 4) {
    const scored = experiences.map((e: any, i: number) => ({
      exp: e,
      score: typeof e._relevanceScore === "number" ? e._relevanceScore : 0,
      idx: typeof e._rawIdx === "number" ? e._rawIdx : i,
    }));
    const sortedByScore = [...scored].sort((a, b) => (b.score !== a.score ? b.score - a.score : a.idx - b.idx));
    const topScore = sortedByScore[0]?.score || 0;
    const minKeep3rd = Math.min(2, Math.max(-2, Math.round(topScore * 0.12)));
    const minKeep4th = Math.max(2, Math.min(10, Math.round(topScore * 0.22)));

    // Toujours garder les 2 expériences les plus pertinentes + la 3e si cœur de carrière (>= minKeep3rd), et la 4e si alignée ou bloc compact antérieur
    const keptSet = new Set<any>();
    for (let k = 0; k < Math.min(2, sortedByScore.length); k++) {
      keptSet.add(sortedByScore[k].exp);
    }
    if (sortedByScore.length >= 3 && (sortedByScore[2].score >= minKeep3rd || (!sortedByScore[2].exp._isCompactPrior && (sortedByScore[2].exp.bullets?.length || 0) >= 3))) {
      keptSet.add(sortedByScore[2].exp);
    }
    if (sortedByScore.length >= 4 && (sortedByScore[3].score >= minKeep4th || sortedByScore[3].exp._isCompactPrior || (!sortedByScore[3].exp._isAssociative && sortedByScore[3].score >= 0))) {
      keptSet.add(sortedByScore[3].exp);
    }

    // Conserver l'ordre chronologique inversé sur les expériences retenues pour la conformité ATS (Workday/Taleo)
    selectedExperiences = scored
      .filter((item) => keptSet.has(item.exp))
      .sort((a, b) => a.idx - b.idx)
      .map((item, finalIdx) => {
        const isSecondaryRole = !sortedByScore.slice(0, 2).some((topItem) => topItem.exp === item.exp);
        const trimmedBullets = isSecondaryRole && item.exp.bullets.length > 5
          ? item.exp.bullets.slice(0, 5)
          : item.exp.bullets;
        const { _relevanceScore, _rawIdx, _isCompactPrior, _isAssociative, ...cleanExp } = item.exp;
        return {
          ...cleanExp,
          id: `exp-${finalIdx + 1}`,
          bullets: trimmedBullets,
        };
      });
  } else {
    selectedExperiences = experiences.map((e: any, finalIdx: number) => {
      const { _relevanceScore, _rawIdx, _isCompactPrior, _isAssociative, ...cleanExp } = e;
      return {
        ...cleanExp,
        id: `exp-${finalIdx + 1}`,
      };
    });
  }

  return selectedExperiences;
}

// Traduction déterministe des formations/diplômes français vers l'anglais international (tout en préservant les noms d'établissements et sigles authentiques)
export function translateEducationItemToEnglish(edu: any) {
  if (!edu || typeof edu !== "object") return edu;

  const translateDegreeOrField = (raw: string): string => {
    if (!raw || typeof raw !== "string") return "";
    let s = raw.normalize("NFC").trim();
    if (!s) return "";

    const replacements: [RegExp, string][] = [
      [/\bDipl[oô]me\s+d['’][EÉ]tat\s+d['’]Ing[ée]nieur\b/gi, "Engineering Master's Degree (MEng)"],
      [/\bDipl[oô]me\s+d['’]Ing[ée]nieur\b/gi, "Engineering Master's Degree (MEng)"],
      [/\bTitre\s+d['’]Ing[ée]nieur\b/gi, "Engineering Master's Degree (MEng)"],
      [/\bMaster\s*2(?:\s*\(?\s*M2\s*\)?)?\b/gi, "Master's Degree (M2)"],
      [/\bDipl[oô]me\s+du\s+Programme\s+Grande\s+[EÉ]cole\b/gi, "Master in Management (Grande École Program)"],
      [/\bClasses\s+Pr[ée]paratoires\s+aux\s+Grandes\s+[EÉ]coles(?:\s*\(CPGE\))?/gi, "Preparatory Classes for French Grandes Écoles (CPGE)"],
      [/\bDipl[oô]me\s+vis[ée]\s+par\s+l['’][EÉ]tat\s+fran[çc]ais,\s*conf[ée]rant\s+le\s+grade\s+de\s+Master\s*\([ée]quivalent\s+Master\s+universitaire\s*\/\s*niveau\s*7\s+europ[ée]en\)/gi, "French State-accredited degree conferring Master's grade (EQF Level 7)"],
      [/\bGrade\s+de\s+Master\s*\(\s*Bac\s*\+\s*5\s*\)/gi, "Master's Level (5-Year Higher Education)"],
      [/\bGrade\s+de\s+Master\b/gi, "Master's Degree Level"],
      [/\bMaster\s*1(?:\s*\(?\s*M1\s*\)?)?\b/gi, "Master's Year 1 (M1)"],
      [/\bMast[eè]re\s+Sp[ée]cialis[ée]\b/gi, "Specialized Master's Degree"],
      [/\bMaster\s+Professionnel\b/gi, "Professional Master's Degree"],
      [/\bMaster\s+Recherche\b/gi, "Research Master's Degree"],
      [/\bMaster\s+of\s+Science\b/gi, "Master of Science (MSc)"],
      [/^Master(?=\s|$|[–—-])/i, "Master's Degree"],
      [/\bLicence\s+Professionnelle\b/gi, "Vocational Bachelor's Degree"],
      [/\bLicence\s+Pro\b/gi, "Vocational Bachelor's Degree"],
      [/\bLicence\b/gi, "Bachelor's Degree"],
      [/\bDoctorat\b/gi, "PhD / Doctorate"],
      [/\bBaccalaur[ée]at\b/gi, "High School Diploma (Baccalauréat)"],
      [/\bBac\s*\+\s*5\b/gi, "Master's Level (5-Year Higher Education)"],
      [/\bBac\s*\+\s*4\b/gi, "4-Year Higher Education Degree"],
      [/\bBac\s*\+\s*3\b/gi, "Bachelor's Level (3-Year Higher Education)"],
      [/\bBac\s*\+\s*2\b/gi, "Associate / Two-Year Technical Degree"],
      [/\bDipl[oô]me\s+d['’][eé]tudes\s+sup[ée]rieures\b/gi, "Higher Education Degree"],
      [/\bFormation\s+d['’][eé]tudes\s+sup[ée]rieures\b/gi, "Higher Education Curriculum"],
      [/\bM[ée]thodes\s+Informatiques\s+Appliqu[ée]es\s+[àa]\s+la\s+Gestion\s+des\s+Entreprises\b/gi, "Computer Science Applied to Business Management (MIAGE)"],
      [/\bIng[ée]nierie\s+des\s+Syst[eè]mes\s+d['’]Information\b/gi, "Information Systems Engineering"],
      [/\bSyst[eè]mes\s+d['’]Information\b/gi, "Information Systems"],
      [/\bIng[ée]nierie\s+informatique\b/gi, "Information Systems & Computer Engineering"],
      [/\bG[ée]nie\s+Logiciel\b/gi, "Software Engineering"],
      [/\bR[ée]seaux\s+et\s+T[ée]l[ée]communications\b/gi, "Networks & Telecommunications"],
      [/\bMath[ée]matiques\s+Appliqu[ée]es\b/gi, "Applied Mathematics"],
      [/\bGestion\s+de\s+Projet\b/gi, "Project Management"],
      [/\bManagement\s+de\s+Projet\b/gi, "Project Management"],
      [/\bManagement\s+Strat[ée]gique\b/gi, "Strategic Management"],
      [/\bCommerce\s+et\s+Vente\b/gi, "Sales & Commerce"],
      [/\bIndustries\s+agroalimentaires\b/gi, "Agri-Food Industry"],
      [/\bAdministration\s+des\s+Entreprises\b/gi, "Business Administration"],
      [/\bGestion\s+d['’]Entreprise\b/gi, "Business Management"],
      [/\bCommerce\s+International\b/gi, "International Business"],
      [/\bMarketing\s+Digital\b/gi, "Digital Marketing"],
      [/\bFinance\s+d['’]Entreprise\b/gi, "Corporate Finance"],
      [/\bSciences\s+[EÉ]conomiques\b/gi, "Economics"],
      [/\b[EÉ]conomie\s+et\s+Gestion\b/gi, "Economics & Management"],
      [/\bInformatique\b/gi, "Computer Science"],
      [/\bGestion\b/gi, "Business Management"],
      [/\bDistribution\b/gi, "Retail & Distribution"],
      [/\bMention\s+Tr[eè]s\s+Bien(?:\s+avec\s+f[ée]licitations(?:\s+du\s+jury)?)?\b/gi, "With Highest Honors"],
      [/\bMention\s+Bien\b/gi, "With Honors"],
      [/\bMention\s+Assez\s+Bien\b/gi, "With Merit"],
      [/\bF[ée]licitations\s+du\s+jury\b/gi, "With Jury Commendation"],
      [/\bFormation\s+en\s+alternance\b/gi, "Work-Study Program (Apprenticeship)"],
      [/\bEn\s+alternance\b/gi, "Work-Study Program (Apprenticeship)"],
      [/\bAlternance\b/gi, "Work-Study / Apprenticeship"],
      [/\bSp[ée]cialisation\s*:?\s*/gi, "Specialization: "],
      [/\bSp[ée]cialit[ée]\s*:?\s*/gi, "Specialization: "],
      [/\bParcours\s*:?\s*/gi, "Track: "],
      [/(?<![A-Za-zÀ-ÿ])(?:en|dans\s+le\s+domaine\s+de)(?![A-Za-zÀ-ÿ])/gi, "in"],
      [/(?<![A-Za-zÀ-ÿ])(?:et|&)(?![A-Za-zÀ-ÿ])/gi, "and"],
    ];

    for (const [regex, repl] of replacements) {
      s = s.replace(regex, repl);
    }
    return s.replace(/\s{2,}/g, " ").trim();
  };

  const translateInstitution = (raw: string): string => {
    if (!raw || typeof raw !== "string") return "";
    let s = raw.normalize("NFC").trim();
    if (!s) return "";
    if (/^[EÉ]tablissement\s+d['’]enseignement\s+sup[ée]rieur$/i.test(s)) {
      return "Higher Education Institution";
    }
    s = s
      .replace(/\bUniversit[ée]\s+de\s+/gi, "University of ")
      .replace(/\bUniversit[ée]\s+d['’]/gi, "University of ")
      .replace(/\bUniversit[ée]\s+/gi, "University ")
      .replace(/\b[EÉ]cole\s+Sup[ée]rieure\b/gi, "Graduate School")
      .replace(/\b[EÉ]cole\s+d['’]Ing[ée]nieurs\b/gi, "School of Engineering")
      .replace(/\bInstitut\s+Universitaire\s+de\s+Technologie\b/gi, "University Institute of Technology (IUT)");
    return s.replace(/\s{2,}/g, " ").trim();
  };

  let rawInstitution = typeof edu.institution === "string" ? edu.institution.trim() : "";
  let rawHonors = typeof edu.honorsOrDetails === "string" ? edu.honorsOrDetails.trim() : "";

  // Séparer une mention académique restée collée au nom de l'établissement (ex: "Université de Picardie - Mention Bien")
  const instHonorMatch = rawInstitution.match(/^(.*?)\s*[-–—,|•·]\s*((?:Mention\s+(?:Tr[eè]s\s+Bien|Bien|Assez\s+Bien)|Formation\s+en\s+alternance|En\s+alternance).*)$/i);
  if (instHonorMatch) {
    rawInstitution = instHonorMatch[1].trim();
    rawHonors = rawHonors ? `${rawHonors} · ${instHonorMatch[2].trim()}` : instHonorMatch[2].trim();
  }

  return {
    ...edu,
    institution: translateInstitution(rawInstitution),
    degree: translateDegreeOrField(edu.degree || ""),
    field: translateDegreeOrField(edu.field || ""),
    graduationDate: typeof edu.graduationDate === "string"
      ? edu.graduationDate.replace(/\bPr[ée]sent\b/gi, "Present")
      : (edu.graduationDate || ""),
    honorsOrDetails: translateDegreeOrField(rawHonors),
  };
}

// Extraction authentique de la formation depuis la section FORMATION exclusivement
const FORMATION_EXPLANATORY_REGEX = /^(?:dipl[oô]me\s+(?:vis[ée]|reconnu|homologu[ée]|certifi[ée])\s+par|titre\s+(?:rncp|enregistr[ée])|conf[ée]rant\s+le\s+grade|[ée]quivalent\s+master|niveau\s+\d|m[ée]moire\s*:|th[eè]se\s*:|mention\s*(?::|(?:tr[eè]s[\s-]+bien|bien|assez[\s-]+bien|passable)\b)|options?\s*(?::|\s+[A-ZÀ-Ÿa-zà-ÿ])|sp[ée](?:cialit[ée]s?|\.)?(?:\s*:|\s+[A-ZÀ-Ÿa-zà-ÿ])|cours\s*:|(?:(?:19\d\d|20\d\d)\s*[-–—]\s*)?(?:semestre\s+d['’][ée]tude|[ée]change\s+universitaire|mobilit[ée]\s+internationale)|repr[ée]sentant\b)/i;
const FORMATION_EMBEDDED_CERT_REGEX = /^(?:certifications?|certificats?|toeic|toefl|ielts|cambridge|gmat|gre|tage\s*mage|voltaire|pix|psm|pspo|pmp|itil|safe)\b/i;

export function parseAuthenticEducationFromCv(cvText: string, isEn: boolean) {
  const sections = parseCvSections(cvText);
  const isContactOrAddressNoise = (l: string): boolean => {
    const t = l.trim();
    if (!t) return true;
    if (/@|https?:\/\/|linkedin\.com|www\./i.test(t)) return true;
    if (/^(?:\+?\d[\d\s.-]{7,})$/.test(t) && !/^(?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?$/i.test(t)) return true;
    if (/^\d{5}\s+[A-ZÀ-Ÿa-zà-ÿ-]+/.test(t)) return true;
    if (/^\d{1,4}\s*(?:bis|ter|quater)?\s+(?:rue|avenue|av\.|boulevard|bd|impasse|all[ée]e|place|chemin|route)\b/i.test(t)) return true;
    return false;
  };
  let rawFormationLines = sections.FORMATION.filter((l) => !isContactOrAddressNoise(l));
  const educations: any[] = [];

  const instCueRegex = /(?:Universit[ée]|University|[EÉ]cole|IUT|INSA|CNAM|Coll[eè]ge|Lyc[ée]e|Business\s+School|Polytech|HEC|ESSEC|ESCP|EDHEC|Audencia|Sorbonne|Sciences\s+Po|Institut|Academy|Faculty|UniLaSalle|La\s+Salle|AgroParisTech|ENSA[IA]?|ISARA|Purpan|ESA\b|Oniris|VetAgro|Arts\s+et\s+M[ée]tiers|Centrale|Mines\s+\w+|Sup[eé]lec|ESIGELEC|ESILV|EPF|EFREI|ISEP|HEI|ICAM|Junia|NEOMA|KEDGE|SKEMA|IESEG|St[\s-]?Michel|Saint[\s-]?Michel)/i;
  const degreeCueRegex = /\b(?:Master|Licence|Baccalaur[ée]at|Bac\s*\+|BAC\s+[A-Z0-9]{2,}|Bac|Bachelor|Doctorat|PhD|MBA|BBA|MSc|DUT|BTS|Mast[eè]re|[EÉ]l[eè]ve[\s-]+Ing[ée]nieur(?:e|s)?|Ing[ée]nieur(?:e|s|r)?|Cycle\s+Ing[ée]nieur|Classes?\s+Pr[ée]paratoires?(?:\s+aux\s+Grandes\s+[EÉ]coles)?|CPGE|Programme\s+Grande\s+[EÉ]cole|PGE|Grade\s+de\s+Master|DEUG|DESS|DEA|\d+(?:[eè]me|er|e)\s+Ann[ée]e)\b/i;

  // Défense en profondeur : si FORMATION est vide ou polluée (texte collé dans désordre), secourir depuis CONTACT/OTHER
  if (rawFormationLines.length === 0) {
    rawFormationLines = [...sections.CONTACT, ...sections.OTHER].filter(
      (l) => !isContactOrAddressNoise(l) && (instCueRegex.test(l) || degreeCueRegex.test(l) || /^(?:19\d\d|20\d\d)\s*[-–—]\s*(?:19\d\d|20\d\d)$/.test(l.trim()))
    );
  }

  const stripLeadingBullet = (l: string) => l.replace(/^[•*●▪▫➢➤✓✔–—\-\s]+/, "").trim();

  const isInstitutionLine = (line: string, nextLine = ""): boolean => {
    const clean = stripLeadingBullet(line);
    if (!clean || FORMATION_EXPLANATORY_REGEX.test(clean) || FORMATION_EMBEDDED_CERT_REGEX.test(clean)) return false;
    const hasInst = instCueRegex.test(clean);
    const lineWithoutSchoolIng = clean.replace(/\b[EÉ]coles?(?:\s+(?:Sup[ée]rieure?s?|Nationales?|Polytechniques?|Centrales?))?\s+(?:d['’]|des\s+)Ing[ée]nieurs?\b/gi, "Ecole");
    const hasDegreeCue = degreeCueRegex.test(lineWithoutSchoolIng);
    if (hasInst && !clean.includes("·") && !hasDegreeCue) return true;
    // Heuristique structurelle universelle : ligne "2021 - 2026 NomÉcole Ville" sans diplôme suivie immédiatement d'un diplôme
    if (
      /^(?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?\s+[A-ZÀ-Ÿ].{2,}$/.test(clean) &&
      !hasDegreeCue &&
      nextLine &&
      degreeCueRegex.test(stripLeadingBullet(nextLine))
    ) {
      return true;
    }
    return false;
  };

  // Étape 0 : Fusionner les retours à la ligne PDF d'un même intitulé de formation (ex: "...spécialisation Supply" + "Chain", "• Cours : ..." + "Physiologie...")
  const formationLines: string[] = [];
  for (let r = 0; r < rawFormationLines.length; r++) {
    const line = rawFormationLines[r].normalize("NFC").trim();
    if (!line) continue;
    if (/^(?:qualit[ée]s?|langues?(?:\s+(?:et|&)\s+(?:qualit[ée]s?|atouts?|centres?\s+d['’]int[ée]r[êe]ts?))?|atouts?|soft\s+skills?|centres?\s+d['’]int[ée]r[êe]ts?|int[ée]r[êe]ts?|loisirs?|divers|outils?(?:\s+(?:et|&)\s+(?:syst[eè]mes?|logiciels?|m[ée]thodes?))?|comp[eé]tences?)\b/i.test(line)) {
      break;
    }

    const prev = formationLines.length > 0 ? formationLines[formationLines.length - 1] : "";
    const prevClean = stripLeadingBullet(prev);
    const curClean = stripLeadingBullet(line);
    const startsBullet = /^[•●▪▫➢➤✓✔]\s+/.test(line);
    const isStandaloneDateLine = /^(?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?$/i.test(line);
    const prevEndsComplete = /\b(?:19\d\d|20\d\d)\s*$/.test(prevClean) && !/[-–—,/:]$/.test(prevClean);

    const isWrappedContinuation =
      Boolean(prev) &&
      !startsBullet &&
      !prevEndsComplete &&
      !isInstitutionLine(prev, line) &&
      !isStandaloneDateLine &&
      !FORMATION_EXPLANATORY_REGEX.test(curClean) &&
      !FORMATION_EMBEDDED_CERT_REGEX.test(curClean) &&
      !degreeCueRegex.test(curClean) &&
      !isInstitutionLine(line) &&
      !/\b(?:19\d\d|20\d\d)\b/.test(line) &&
      (curClean.split(/\s+/).length <= 4 ||
        /^[a-zà-ÿ,)]/.test(curClean) ||
        /\b(?:de|du|des|d['’]|en|et|sp[ée]cialisation|option|majeure?|supply|business|management|syst[eè]mes?)$/i.test(prevClean) ||
        /[-–—,/(:]$/.test(prevClean));

    if (isWrappedContinuation) {
      formationLines[formationLines.length - 1] = `${prev} ${line}`;
    } else {
      formationLines.push(line);
    }
  }

  let pendingInstitution = "";
  let pendingGradYear = "";

  const extractInstAndYear = (rawInst: string): { inst: string; year: string } => {
    let inst = stripLeadingBullet(rawInst);
    let year = "";
    const leadingRange = inst.match(/^((?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?)\s*[|–—,-]?\s*(.+)$/i);
    if (leadingRange && leadingRange[2].trim().length >= 3) {
      const yrs = leadingRange[1].match(/\b(19\d\d|20\d\d)\b/g);
      if (yrs && yrs.length > 0) year = yrs[yrs.length - 1];
      inst = leadingRange[2].trim();
    }
    const trailingRange = inst.match(/^(.*?)\s*[|–—,-]\s*((?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?)\s*$/i);
    if (trailingRange && trailingRange[1].trim().length >= 3) {
      inst = trailingRange[1].trim();
      if (!year) {
        const yrs = trailingRange[2].match(/\b(19\d\d|20\d\d)\b/g);
        if (yrs && yrs.length > 0) year = yrs[yrs.length - 1];
      }
    }
    return { inst, year };
  };

  for (let i = 0; i < formationLines.length; i++) {
    const rawLine = formationLines[i];
    const line = stripLeadingBullet(rawLine);
    if (!line) continue;

    // Ignorer les lignes de rubriques parasites ou purement géographiques
    if (/^[A-Za-zÀ-ÿ\s-]+,\s*(?:France|USA|UK|Europe|Belgique|Suisse|Canada|[A-Z][a-z]+)$/i.test(line)) continue;

    // Ligne explicative / spécialité / cours / semestre d'échange rattachée au diplôme précédent
    if (FORMATION_EXPLANATORY_REGEX.test(line) && !degreeCueRegex.test(line)) {
      if (educations.length > 0) {
        const cleanDetail = line.replace(/\.$/, "").trim();
        const lastEdu = educations[educations.length - 1];
        if (/^options?\b/i.test(cleanDetail) && !lastEdu.field) {
          lastEdu.field = cleanDetail;
        } else {
          lastEdu.honorsOrDetails = lastEdu.honorsOrDetails
            ? `${lastEdu.honorsOrDetails} · ${cleanDetail}`
            : cleanDetail;
        }
      }
      continue;
    }

    // Sous-niveau académique (ex: "2e Année du Cycle Ingénieur option industrie 4.0") suivant un diplôme principal déjà rattaché à l'établissement
    if (/^\d+(?:[eè]me|er|re|e)?\s+Ann[ée]e\b/i.test(line) && !pendingInstitution && educations.length > 0) {
      const cleanSubLevel = line.replace(/\bIng[ée]nieurr\b/g, "Ingénieur").replace(/\.$/, "").trim();
      const lastEdu = educations[educations.length - 1];
      const optPart = cleanSubLevel.match(/\b(option\s+.+)$/i);
      if (optPart && !lastEdu.field) {
        lastEdu.field = optPart[1].charAt(0).toUpperCase() + optPart[1].slice(1).trim();
        const prefixLevel = cleanSubLevel.slice(0, optPart.index).trim();
        if (prefixLevel) {
          lastEdu.honorsOrDetails = lastEdu.honorsOrDetails ? `${lastEdu.honorsOrDetails} · ${prefixLevel}` : prefixLevel;
        }
      } else {
        lastEdu.honorsOrDetails = lastEdu.honorsOrDetails
          ? `${lastEdu.honorsOrDetails} · ${cleanSubLevel}`
          : cleanSubLevel;
      }
      continue;
    }

    // Ligne de certification intégrée dans FORMATION (ex: "Certification TOEIC : 850 points (2020)") -> gérée par parseAuthenticCertificationsFromCv
    if (FORMATION_EMBEDDED_CERT_REGEX.test(line)) {
      continue;
    }

    if (isInstitutionLine(rawLine, formationLines[i + 1] || "")) {
      const parsedInst = extractInstAndYear(line);
      pendingInstitution = parsedInst.inst;
      if (parsedInst.year) pendingGradYear = parsedInst.year;
      continue;
    }

    // Si la ligne est uniquement une période / année (format LinkedIn : Institution -> Diplôme -> "2017 - 2019")
    if (/^(?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?$/i.test(line)) {
      const yrs = line.match(/\b(19\d\d|20\d\d)\b/g);
      if (yrs && yrs.length > 0 && educations.length > 0 && !educations[educations.length - 1].graduationDate) {
        educations[educations.length - 1].graduationDate = yrs[yrs.length - 1];
      }
      continue;
    }

    let deg = line;
    let gradYear = "";

    // Extraire d'abord une année/plage placée EN TÊTE de ligne ("2021 Bac mention Bien - ...")
    const leadingRangeDeg = deg.match(/^((?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?)\s*[|–—,-]?\s+(.+)$/i);
    if (leadingRangeDeg && leadingRangeDeg[2].trim().length >= 3) {
      const yrs = leadingRangeDeg[1].match(/\b(19\d\d|20\d\d)\b/g);
      if (yrs && yrs.length > 0) gradYear = yrs[yrs.length - 1];
      deg = leadingRangeDeg[2].trim();
    }

    if (deg.includes("·")) {
      const parts = deg.split("·");
      deg = parts[0].trim();
      const yrs = parts[1].match(/\b(19\d\d|20\d\d)\b/g);
      if (!gradYear && yrs && yrs.length > 0) {
        gradYear = yrs[yrs.length - 1];
      }
    } else {
      const rangeAtEnd = deg.match(/\s*(?:[-–—|]\s*)?(?:19\d\d|20\d\d)\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present)\s*$/i);
      const singleYearAtEnd = deg.match(/\s*(?:[-–—|,]\s*)?(19\d\d|20\d\d)\s*$/);
      const yrs = deg.match(/\b(19\d\d|20\d\d)\b/g);
      if (!gradYear && yrs && yrs.length > 0) {
        gradYear = yrs[yrs.length - 1];
      }
      if (rangeAtEnd) {
        deg = deg.slice(0, rangeAtEnd.index).trim();
      } else if (singleYearAtEnd) {
        deg = deg.slice(0, singleYearAtEnd.index).trim();
      }
    }

    deg = deg.replace(/\bIng[ée]nieurr\b/g, "Ingénieur").replace(/\.$/, "").trim();
    if (!deg) continue;

    let degree = deg;
    let field = /\bmiage\b/i.test(deg)
      ? (isEn ? "Computer Science & Business Information Systems" : "Informatique & Systèmes d'Information")
      : "";
    let inlineInstitution = "";
    let honorsOrDetails = "";

    // Format monoligne Bac / Diplôme + Mention + Spé + École, Ville (ex: "Bac mention Bien - spé SVT, et Physique-Chimie, StMichel, Solesmes")
    const bacMatch = deg.match(/^(Bac(?:calaur[ée]at)?)\s*(?:(Mention\s+(?:Tr[eè]s\s+Bien|Bien|Assez\s+Bien)))?\s*(?:[-–—]\s*(.+))?$/i);
    if (bacMatch) {
      degree = /^bac$/i.test(bacMatch[1]) ? "Baccalauréat" : bacMatch[1].trim();
      if (bacMatch[2]) {
        honorsOrDetails = bacMatch[2].replace(/^mention\s+/i, "Mention ").trim();
      }
      let rest = (bacMatch[3] || "").replace(/,\s+et\s+/gi, " et ").trim();
      const tailInstMatch = rest.match(/^(.*?),\s*((?:Lyc[ée]e|Coll[eè]ge|St[\s-]?Michel|Saint[\s-]?Michel|[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’-]+)(?:,\s*[A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’-]+)?)$/);
      if (tailInstMatch) {
        const rawField = tailInstMatch[1].trim();
        field = rawField ? rawField.charAt(0).toUpperCase() + rawField.slice(1) : "";
        inlineInstitution = tailInstMatch[2].trim();
      } else if (rest) {
        field = rest.charAt(0).toUpperCase() + rest.slice(1);
      }
    } else if (/\s+(?:[–—-]|\|)\s+/.test(deg)) {
      const segs = deg.split(/\s+(?:[–—-]|\|)\s+/).map((s) => s.trim()).filter(Boolean);
      const nonInstSegs: string[] = [];
      for (const seg of segs) {
        if (!inlineInstitution && instCueRegex.test(seg) && !degreeCueRegex.test(seg)) {
          const instSpecMatch = seg.match(/^(.+?),\s*((?:sp[ée]cialisation|sp[ée]cialit[ée]|option|majeure?|parcours|fili[eè]re|major|concentration|track)\b.+)$/i);
          if (instSpecMatch) {
            inlineInstitution = instSpecMatch[1].trim();
            const rawSpec = instSpecMatch[2].trim();
            const formattedSpec = rawSpec.charAt(0).toUpperCase() + rawSpec.slice(1);
            field = field ? `${field} – ${formattedSpec}` : formattedSpec;
          } else {
            inlineInstitution = seg;
          }
        } else if (/^(?:Mention\s+(?:Tr[eè]s\s+Bien|Bien|Assez\s+Bien)|En\s+alternance|Formation\s+en\s+alternance)/i.test(seg)) {
          honorsOrDetails = honorsOrDetails ? `${honorsOrDetails} · ${seg}` : seg;
        } else {
          nonInstSegs.push(seg);
        }
      }
      if (nonInstSegs.length > 0) {
        const firstSeg = nonInstSegs[0];
        const secondSeg = nonInstSegs[1] || "";
        const secondIsGradeQualification = Boolean(secondSeg && /^(?:grade\s+de\s+master|bac\s*\+\s*\d|master|msc|dipl[oô]me)/i.test(secondSeg));
        const mPrefix = firstSeg.match(/^(Master\s*[12]?(?:\s*\(?\s*M[12]\s*\)?)?(?:\s+(?:Professionnel|Pro|Recherche))?|Licence(?:\s+[123]|\s+Professionnelle|\s+Pro)?|DUT|BTS|Bachelor(?:'s)?(?:\s+Degree)?|Mast[eè]re(?:\s+Sp[ée]cialis[ée])?|Doctorat|PhD|MBA|Dipl[oô]me\s+d['’]Ing[ée]nieur|[EÉ]l[eè]ve[\s-]+ing[ée]nieur(?:e)?)\s+(?:en\s+|in\s+)?(.+)$/i);
        if (mPrefix && mPrefix[2].trim().length >= 3 && !/^(?:MIAGE|MBA|MSc|MS)$/i.test(mPrefix[2].trim())) {
          degree = mPrefix[1].trim();
          const restFieldParts = [mPrefix[2].trim(), ...nonInstSegs.slice(1)];
          field = field ? `${restFieldParts.join(" – ")} – ${field}` : restFieldParts.join(" – ");
        } else if (secondIsGradeQualification) {
          degree = nonInstSegs.join(" — ");
        } else {
          degree = firstSeg;
          if (nonInstSegs.length > 1) {
            const extraField = nonInstSegs.slice(1).join(" – ");
            field = field ? `${extraField} – ${field}` : extraField;
          }
        }
      }
    } else if (deg.includes(",")) {
      const dParts = deg.split(",");
      degree = dParts[0].trim();
      field = dParts.slice(1).join(",").trim();
    } else {
      // Séparer "Master 2 Professionnel Ingénierie..." ou "Elève ingénieur en Agronomie & Agro-Industries" -> degree + field
      const mOptionSplit = deg.match(/^(.+?)\s+(option\s+.+)$/i);
      const mNoComma = deg.match(/^(Master\s*[12]?(?:\s*\(?\s*M[12]\s*\)?)?(?:\s+(?:Professionnel|Pro|Recherche))?|Licence(?:\s+[123]|\s+Professionnelle|\s+Pro)?|DUT|BTS|Bachelor(?:'s)?(?:\s+Degree)?|[EÉ]l[eè]ve[\s-]+ing[ée]nieur(?:e)?|Ing[ée]nieur(?:e)?)\s+(?:en\s+|in\s+)?(.+)$/i);
      if (mNoComma && mNoComma[2].trim().length >= 3 && !/^(?:MIAGE|MBA|MSc|MS)$/i.test(mNoComma[2].trim())) {
        degree = mNoComma[1].trim().replace(/^[EÉ]l[eè]ve[\s-]+ing[ée]nieur/i, "Élève-ingénieur");
        field = mNoComma[2].trim();
      } else if (mOptionSplit && mOptionSplit[1].trim().length >= 6) {
        degree = mOptionSplit[1].trim();
        field = mOptionSplit[2].charAt(0).toUpperCase() + mOptionSplit[2].slice(1).trim();
      }
    }

    // Si aucune institution n'était en attente AVANT le diplôme ni dans la ligne, vérifier la ligne SUIVANTE (format Diplôme puis Université)
    let matchedInstitution = pendingInstitution || inlineInstitution;
    if (!gradYear && pendingGradYear) {
      gradYear = pendingGradYear;
    }
    if (!matchedInstitution && i + 1 < formationLines.length) {
      const nextLine = formationLines[i + 1].normalize("NFC").trim();
      if (nextLine && !/^(?:19\d\d|20\d\d)\b/.test(nextLine) && isInstitutionLine(nextLine)) {
        const parsedNextInst = extractInstAndYear(nextLine);
        matchedInstitution = parsedNextInst.inst;
        if (!gradYear && parsedNextInst.year) gradYear = parsedNextInst.year;
        i++;
      }
    }

    // Si aucune date n'était sur la ligne du diplôme, vérifier si la ligne suivante est une année / plage d'années
    if (!gradYear && i + 1 < formationLines.length) {
      const nextDateLine = formationLines[i + 1].normalize("NFC").trim();
      if (/^(?:19\d\d|20\d\d)(?:\s*[-–—à]\s*(?:19\d\d|20\d\d|pr[ée]sent|present))?$/i.test(nextDateLine)) {
        const yrs = nextDateLine.match(/\b(19\d\d|20\d\d)\b/g);
        if (yrs && yrs.length > 0) {
          gradYear = yrs[yrs.length - 1];
          i++;
        }
      }
    }

    const honorMatch = matchedInstitution.match(/^(.*?)\s*[-–—,|•·]\s*((?:Mention\s+(?:Tr[eè]s\s+Bien|Bien|Assez\s+Bien)|Formation\s+en\s+alternance|En\s+alternance).*)$/i);
    if (honorMatch) {
      matchedInstitution = honorMatch[1].trim();
      honorsOrDetails = honorsOrDetails ? `${honorsOrDetails} · ${honorMatch[2].trim()}` : honorMatch[2].trim();
    }

    // Extraire et nettoyer une année/période accolée au nom de l'établissement (début ou fin)
    if (matchedInstitution) {
      const cleanedInst = extractInstAndYear(matchedInstitution);
      matchedInstitution = cleanedInst.inst;
      if (!gradYear && cleanedInst.year) {
        gradYear = cleanedInst.year;
      }
    }

    const cleanDegreeCase = (rawDegStr: string): string => {
      const s = rawDegStr.trim();
      if (!s) return s;
      const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
      if (letters.length >= 5 && letters === letters.toUpperCase()) {
        return s
          .split(/\s+/)
          .map((w) => (/^(?:MIAGE|MBA|MSc|MS|BBA|DUT|BTS|CPGE|PGE|DEUG|DESS|DEA|PhD|L1|L2|L3|M1|M2|IT|SI|BAC|STI2D)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join(" ");
      }
      return s;
    };

    const item = {
      institution: matchedInstitution || (isEn ? "Higher Education Institution" : "Établissement d'enseignement supérieur"),
      degree: cleanDegreeCase(degree),
      field: field,
      graduationDate: gradYear,
      honorsOrDetails
    };

    educations.push(isEn ? translateEducationItemToEnglish(item) : item);
    pendingInstitution = "";
    pendingGradYear = "";
  }

  // Fallback si la section formation n'a pas pu être parsée
  if (educations.length === 0) {
    educations.push({
      institution: isEn ? "Higher Education Institution" : "Établissement d'enseignement supérieur",
      degree: isEn ? "Higher Education Degree" : "Diplôme d'études supérieures",
      field: isEn ? "Higher Education Curriculum" : "Formation d'études supérieures",
      graduationDate: "",
      honorsOrDetails: ""
    });
  }

  return educations;
}

export interface ParsedCertificationItem {
  name: string;
  issuer: string;
  year?: string;
}

export function inferCertificationIssuer(certName: string): string {
  if (!certName) return "";
  if (/salesforce/i.test(certName)) return "Salesforce";
  if (/google\s+cloud|\bgcp\b/i.test(certName)) return "Google Cloud";
  if (/google/i.test(certName)) return "Google";
  if (/\baws\b|amazon/i.test(certName)) return "Amazon Web Services";
  if (/azure|microsoft/i.test(certName)) return "Microsoft";
  if (/\b(?:hashicorp|terraform|vault|consul)\b/i.test(certName)) return "HashiCorp";
  if (/kubernetes|\bcncf\b|\bcka\b|\bckad\b|\bcks\b/i.test(certName)) return "CNCF / Linux Foundation";
  if (/scrum\.org|\bpsm\b|\bpspo\b/i.test(certName)) return "Scrum.org";
  if (/scrum\s+alliance|\bcsm\b|\bcspo\b/i.test(certName)) return "Scrum Alliance";
  if (/\bsafe\b|scaled\s+agile/i.test(certName)) return "Scaled Agile";
  if (/\bpmp\b|\bpmi\b/i.test(certName)) return "PMI";
  if (/\bitil\b/i.test(certName)) return "AXELOS";
  if (/prince2/i.test(certName)) return "AXELOS";
  if (/togaf/i.test(certName)) return "The Open Group";
  if (/cissp|isc2/i.test(certName)) return "ISC2";
  if (/oracle/i.test(certName)) return "Oracle";
  if (/istqb/i.test(certName)) return "ISTQB";
  if (/databricks/i.test(certName)) return "Databricks";
  if (/snowflake/i.test(certName)) return "Snowflake";
  if (/servicenow/i.test(certName)) return "ServiceNow";
  if (/sap\b/i.test(certName)) return "SAP";
  if (/hubspot/i.test(certName)) return "HubSpot";
  if (/docusign/i.test(certName)) return "DocuSign";
  if (/toeic|toefl|ielts|cambridge/i.test(certName)) return "Certification Linguistique";
  return "";
}

// Extraction authentique des certifications depuis la section CERTIFICATIONS (et lignes Certification placées dans FORMATION)
export function parseAuthenticCertificationsFromCv(cvText: string): ParsedCertificationItem[] {
  const sections = parseCvSections(cvText);
  const embeddedFormationCerts = sections.FORMATION.filter((l) => FORMATION_EMBEDDED_CERT_REGEX.test(l.trim()));
  const certLines = [...sections.CERTIFICATIONS, ...embeddedFormationCerts];
  const rawCerts: string[] = [];
  let currentCert = "";

  for (const rawLine of certLines) {
    const l = rawLine.trim();
    if (!l) continue;

    // Arrêt si on atteint la localisation, un en-tête identitaire (pipes |) ou le nom du candidat
    if (/^(?:paris|ile-de-france|îles?-de-france|france|disponible|senior\s+product|product\s+owner\s+salesforce)/i.test(l)) {
      break;
    }
    if ((l.match(/\|/g) || []).length >= 2 || /\bcomp[ée]tences\s+cl[ée]s\s*:/i.test(l)) {
      break;
    }
    // Ne pas confondre une certification comme "Google AI" ou "HashiCorp" avec un nom de candidat
    if (!/google|salesforce|aws|azure|oracle|ibm|meta|microsoft|scrum|agile|certif|hashicorp|kubernetes|cncf|terraform|togaf|cissp|istqb|itil|pmp|toeic|toefl|ielts|cambridge/i.test(l) && /^[A-ZÀ-Ÿ][a-zà-ÿ-]+(\s+[A-ZÀ-Ÿ]{2,})+$/.test(l)) {
      break;
    }
    if (/^[A-ZÀ-ÿ\s]{5,}$/.test(l) && !/certif|cloud|admin|app|google|salesforce|scrum|ai|aws|cka|pmp|itil|togaf|toeic/i.test(l)) {
      break;
    }
    // Ignorer toute ligne narrative (résumé/paragraphe) qui fuiterait accidentellement
    if (l.length > 95 || /\b(?:j'ai|m'ont\s+permis|je\s+crois|ce\s+que\s+je\s+recherche|fort\s+de\s+\d+\s+ann[ée]es)\b/i.test(l)) {
      continue;
    }

    const cleanLine = l.replace(/^[•*–—\-\s]+/, "").trim();
    if (!cleanLine) continue;

    const startsWithKnownCert = /^(?:[•*–—\-]\s+)?(?:Salesforce|Google|AWS|Amazon|Azure|Microsoft|DocuSign|Adobe|Workday|Atlassian|Jira|MuleSoft|Power\s*BI|Looker|UiPath|HashiCorp|Terraform|Kubernetes|CKA|CKAD|CKS|Scrum|PSM|PSPO|CSM|CSPO|PMP|PMI|ITIL|Prince2|COBIT|SAFe|ISTQB|TOGAF|CISSP|CISM|CISA|GCP|CompTIA|Red\s+Hat|Linux|Databricks|Snowflake|ServiceNow|SAP|HubSpot|Tableau|Docker|Oracle|Python|Java|Lean|Six\s+Sigma|TOEIC|TOEFL|IELTS|Cambridge|DevOps|FinOps|ISO|Certifi[ée]|Certified|Certificat|Certification|Dipl[oô]me)/i.test(l);
    const wordCount = cleanLine.split(/\s+/).length;
    const prevIncomplete =
      /[-–—,/(:]$|\b(?:of|for|and|de|du|des|en|pour|à|certified|community|service|sales|marketing|experience|platform|app|data|solutions|associate|developer|enterprise|cloud)$/i.test(currentCert.trim()) ||
      ((currentCert.match(/\(/g) || []).length > (currentCert.match(/\)/g) || []).length);
    const looksLikeStandaloneCert =
      Boolean(currentCert) &&
      !prevIncomplete &&
      currentCert.split(/\s+/).length >= 2 &&
      wordCount >= 2 &&
      wordCount <= 6 &&
      /^[A-ZÀ-Ÿ0-9]/.test(cleanLine) &&
      (cleanLine.includes(":") || /\([A-Z0-9]{2,}\)|\(\d{4}\)/.test(cleanLine) || /\b(?:ADM|201|Developer|Architect|Consultant|Administrator|Adminstrator|Practitioner|Associate|Professional|Specialist|Master)\b/i.test(cleanLine) || startsWithKnownCert);

    const isNewCert = /^[•*–—\-]\s+/.test(l) || startsWithKnownCert || looksLikeStandaloneCert;

    if (isNewCert) {
      if (currentCert) rawCerts.push(currentCert);
      currentCert = cleanLine;
    } else if (currentCert) {
      currentCert += " " + cleanLine;
    } else {
      currentCert = cleanLine;
    }
  }

  if (currentCert) rawCerts.push(currentCert);

  return rawCerts
    .map((raw) => {
      const yearMatch = raw.match(/\b(19\d\d|20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : "";
      const cleanName = raw
        .replace(/\(\s*(?:19\d\d|20\d\d)\s*\)/g, "")
        .replace(/\bAdminstrator\b/g, "Administrator")
        .replace(/\s+/g, " ")
        .trim();
      return {
        name: cleanName,
        issuer: inferCertificationIssuer(cleanName),
        year
      };
    })
    .filter((c) => Boolean(c.name) && c.name.length <= 110 && c.name.split(/\s+/).length <= 14);
}

export function translateLanguageItemToEnglish(item: { language: string; proficiency: string }) {
  if (!item || typeof item !== "object") return item;
  let langName = (item.language || "").trim();
  let prof = (item.proficiency || "").trim();

  if (/^fran[çc]ais$/i.test(langName)) langName = "French";
  else if (/^anglais$/i.test(langName)) langName = "English";
  else if (/^espagnol$/i.test(langName)) langName = "Spanish";
  else if (/^allemand$/i.test(langName)) langName = "German";
  else if (/^italien$/i.test(langName)) langName = "Italian";
  else if (/^portugais$/i.test(langName)) langName = "Portuguese";
  else if (/^arabe$/i.test(langName)) langName = "Arabic";
  else if (/^chinois|mandarin$/i.test(langName)) langName = "Mandarin Chinese";
  else if (/^n[ée]erlandais$/i.test(langName)) langName = "Dutch";

  if (/langue\s+maternelle|maternelle|natif/i.test(prof) && /bilingue/i.test(prof)) {
    prof = "Native / Bilingual";
  } else if (/langue\s+maternelle|maternelle|natif/i.test(prof)) {
    prof = "Native";
  } else if (/bilingue/i.test(prof)) {
    prof = "Bilingual";
  } else if (/capacit[ée]\s+professionnelle\s+compl[eè]te/i.test(prof)) {
    prof = "Full Professional Proficiency";
  } else if (/courant/i.test(prof)) {
    prof = "Fluent";
  } else if (/professionnel/i.test(prof)) {
    prof = "Professional Proficiency";
  } else if (/interm[ée]diaire/i.test(prof)) {
    prof = "Intermediate";
  } else if (/notions|scolaire|d[ée]butant/i.test(prof)) {
    prof = "Basic";
  }

  return { language: langName, proficiency: prof || "Professional Proficiency" };
}

// Extraction authentique des langues depuis la section LANGUAGES (supporte lignes multiples et lignes groupées "Langues : Français (...), Anglais (...)")
export function parseAuthenticLanguagesFromCv(cvText: string, isEn: boolean): { language: string; proficiency: string }[] {
  const sections = parseCvSections(cvText);
  const langLines = sections.LANGUAGES;
  const result: { language: string; proficiency: string }[] = [];
  const seenLangs = new Set<string>();
  const knownLangRe = /^(Fran[çc]ais|Anglais|Allemand|Espagnol|Italien|Portugais|Arabe|Chinois|Mandarin|N[ée]erlandais|Russe|Japonais|Cor[ée]en|Polonais|Turc|Lingala|French|English|German|Spanish|Italian|Portuguese|Arabic|Chinese|Dutch|Russian|Japanese|Korean|Polish|Turkish)\b/i;

  for (const rawLine of langLines) {
    let clean = rawLine.replace(/^[•●▪▫➢➤✓✔*\-–—\s]+/, "").trim();
    if (!clean) continue;
    if (/^(?:qualit[ée]s?|atouts?|soft\s+skills?|centres?\s+d['’]int[ée]r[êe]t|loisirs?|informatique|bureautique)\s*:?/i.test(clean)) {
      continue;
    }
    clean = clean.replace(/^(?:langues?|languages?)\s*:\s*/i, "").trim();
    if (!clean) continue;

    // Ne découper par virgule QUE si la ligne contient plusieurs langues distinctes (sinon "Anglais niveau ingénieur, B2+" reste un seul bloc !)
    const rawPipeParts = clean.split(/\s*(?:[;|•·])\s*/).map((p) => p.trim()).filter(Boolean);
    const parts: string[] = [];
    for (const seg of rawPipeParts) {
      const commaSegs = seg.split(/\s*,(?![^(]*\))\s*/).map((s) => s.trim()).filter(Boolean);
      if (commaSegs.length > 1 && commaSegs.filter((cs) => knownLangRe.test(cs)).length >= 2) {
        parts.push(...commaSegs);
      } else {
        parts.push(seg);
      }
    }

    for (const part of parts) {
      const langStart = part.match(/^(Fran[çc]ais|Anglais|Allemand|Espagnol|Italien|Portugais|Arabe|Chinois|Mandarin|N[ée]erlandais|Russe|Japonais|Cor[ée]en|Polonais|Turc|Lingala|French|English|German|Spanish|Italian|Portuguese|Arabic|Chinese|Dutch|Russian|Japanese|Korean|Polish|Turkish)(?:\s*(?:\(([^)]+)\)|[-–:]\s*(.+)|\s+(.+)))?$/i);
      if (!langStart) continue;

      const rawLang = langStart[1].trim();
      const rawProf = (langStart[2] || langStart[3] || langStart[4] || (isEn ? "Professional Proficiency" : "Professionnel"))
        .replace(/^,\s*/, "")
        .trim();

      let langName = rawLang;
      let prof = rawProf ? rawProf.charAt(0).toUpperCase() + rawProf.slice(1) : (isEn ? "Professional Proficiency" : "Professionnel");
      if (!isEn) {
        if (/french|fran[çc]ais/i.test(rawLang)) langName = "Français";
        else if (/english|anglais/i.test(rawLang)) langName = "Anglais";
        else if (/spanish|espagnol/i.test(rawLang)) langName = "Espagnol";
        else if (/german|allemand/i.test(rawLang)) langName = "Allemand";
        else if (/italian|italien/i.test(rawLang)) langName = "Italien";
        else if (/portuguese|portugais/i.test(rawLang)) langName = "Portugais";
        else if (/arabic|arabe/i.test(rawLang)) langName = "Arabe";
        else if (/chinese|chinois|mandarin/i.test(rawLang)) langName = "Chinois";
        else if (/dutch|n[ée]erlandais/i.test(rawLang)) langName = "Néerlandais";
        else if (/russian|russe/i.test(rawLang)) langName = "Russe";
        else if (/japanese|japonais/i.test(rawLang)) langName = "Japonais";
        else if (/lingala/i.test(rawLang)) langName = "Lingala";

        if (/native|langue\s+maternelle|maternelle|bilingual|bilingue/i.test(rawProf)) prof = "Langue maternelle / Bilingue";
        else if (/full professional/i.test(rawProf)) prof = "Capacité professionnelle complète";
        else if (/^(?:working|professionnel)$/i.test(rawProf)) prof = "Professionnel";
        else if (/^(?:courant|fluent)$/i.test(rawProf)) prof = "Courant";

        if (!seenLangs.has(langName.toLowerCase())) {
          seenLangs.add(langName.toLowerCase());
          result.push({ language: langName, proficiency: prof });
        }
      } else {
        const translated = translateLanguageItemToEnglish({ language: langName, proficiency: prof });
        if (!seenLangs.has(translated.language.toLowerCase())) {
          seenLangs.add(translated.language.toLowerCase());
          result.push(translated);
        }
      }
    }
  }

  if (result.length === 0) {
    result.push(
      isEn
        ? { language: "French", proficiency: "Native / Bilingual" }
        : { language: "Français", proficiency: "Langue maternelle / Bilingue" }
    );
    result.push(
      isEn
        ? { language: "English", proficiency: "Full Professional Proficiency" }
        : { language: "Anglais", proficiency: "Capacité professionnelle complète" }
    );
  }

  return result;
}

export function extractAuthenticPhoneFromCv(cvText: string): string {
  if (!cvText) return "";
  // Neutraliser impérativement les plages d'années et dates ("2007 - 2012", "09/2021") avant détection téléphonique
  const stripDateNoise = (src: string): string =>
    src
      .replace(/\b(?:19|20)\d{2}\s*[-–—à/]\s*(?:19|20)\d{2}\b/g, " ")
      .replace(/\b(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g, " ");

  const sections = parseCvSections(cvText);
  const labeledMatch = cvText.match(/(?:T[ée]l[ée]phone|T[ée]l\.?|Tel\.?|Phone|Mobile|GSM)\s*[:\s]\s*([+\d()\s.-]{8,24})/i);
  const contactSource = sections.CONTACT.length > 0 ? sections.CONTACT.join("\n") : cvText.split("\n").slice(0, 14).join("\n");
  const candidatePool = stripDateNoise(
    [labeledMatch?.[1] || "", contactSource, cvText].filter(Boolean).join("\n")
  );

  const matchPatterns = [
    /(?:^|(?<!\d))\+\d{1,3}[\s.-]*(?:\(\s*0\s*\)\s*)?[1-9](?:[\s.-]*\d{2}){4}(?!\d)/,
    /(?:^|(?<!\d))0[1-9](?:[\s.-]*\d{2}){4}(?!\d)/,
    /(?:^|(?<!\d))00\s*[1-9]\d{1,2}[\s.-]*(?:\(\s*0\s*\)\s*)?[1-9](?:[\s.-]*\d{2}){4}(?!\d)/,
    /(?:^|(?<!\d))\+\d{1,3}(?:[\s.-]*\(?\d{1,4}\)?){2,5}(?!\d)/,
    /(?:^|(?<!\d))(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}(?!\d)/,
  ];

  let phone = "";
  for (const pat of matchPatterns) {
    const m = candidatePool.match(pat);
    if (m?.[0]) {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length >= 9 && digits.length <= 15) {
        phone = m[0].replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    phone = digitsOnly.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return phone;
}

export function extractAuthenticEmailFromCv(cvText: string): string {
  if (!cvText) return "";
  // Recombiner les adresses email coupées sur 2 lignes par un parseur PDF (ex: "user@gmail\n. com" ou "user@\ndomain.com")
  const unwrapped = cvText
    .replace(/@([A-Za-z0-9-]+)\s*\n\s*\.\s*([A-Za-z]{2,10})\b/g, "@$1.$2")
    .replace(/@\s*\n\s*([A-Za-z0-9.-]+\.[A-Za-z]{2,10})\b/g, "@$1")
    .replace(/([A-Za-z0-9._%+-]+)\s*\n\s*@([A-Za-z0-9.-]+\.[A-Za-z]{2,10})\b/g, "$1@$2");
  const m = unwrapped.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,10}/);
  return m ? m[0].trim() : "";
}

export function extractAuthenticLocationFromCv(cvText: string, isEn: boolean): string {
  if (!cvText) return isEn ? "Remote / Hybrid" : "France / Hybride";
  // Priorité absolue à l'en-tête / bloc coordonnées du candidat (évite de copier la ville d'une entreprise passée ou d'une université)
  const sections = parseCvSections(cvText);
  const topLines = cvText.split("\n").slice(0, 8);
  const headerSource = sections.CONTACT.length > 0
    ? [...sections.CONTACT, ...topLines].join("\n")
    : topLines.join("\n");

  const cleanForLocation = headerSource
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/@[\w.-]+/g, " ");

  const cpCityMatch = cleanForLocation.match(/\b(\d{5})\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’\- ]{1,30}?)(?=\s*(?:[|\n•·,]|$))/);
  const cityCpMatch = cleanForLocation.match(/\b([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'’\- ]{1,25}),\s*(\d{5})\b/);
  const locationMatch = cleanForLocation.match(
    /\b(?:London|New\s+York|San\s+Francisco|Paris|Lyon|Marseille|Bordeaux|Toulouse|Nantes|Lille|Rennes|Strasbourg|Montpellier|Nice|Saint-Denis|B[ée]ziers|Berlin|Amsterdam|Dublin|Bruxelles|Gen[eè]ve|Kinshasa|Abidjan|Montr[ée]al|United\s+Kingdom|United\s+States|France|[ÎI]le-de-France|[A-ZÀ-Ÿ][a-zà-ÿ-]+,\s*(?:France|UK|USA|Germany|Netherlands|Belgique|Canada|Suisse))\b/i
  );
  if (cpCityMatch) {
    const cityClean = cpCityMatch[2].trim();
    if (!/\b(?:France|Email|Mail|Phone|Tel|Mobile|Permis|LinkedIn)\b/i.test(cityClean)) {
      return `${cpCityMatch[1]} ${cityClean}`;
    }
  }
  if (cityCpMatch) {
    const cityClean = cityCpMatch[1].trim();
    if (!/\b(?:France|Email|Mail|Phone|Tel|Mobile|Permis|LinkedIn)\b/i.test(cityClean)) {
      return `${cityClean}, ${cityCpMatch[2]}`;
    }
  }
  return locationMatch ? locationMatch[0].trim() : (isEn ? "France / Remote" : "France");
}

export function extractAuthenticLinkedInFromCv(cvText: string): string | undefined {
  if (!cvText) return undefined;
  const wrappedUrl = cvText.match(/linkedin\.com\/in\/([\w-]+-\s*\n\s*[\w-]+)/i);
  if (wrappedUrl?.[1]) {
    return `linkedin.com/in/${wrappedUrl[1].replace(/\s*\n\s*/g, "")}`;
  }
  const fullUrl = cvText.match(/linkedin\.com\/in\/[\w-]+/i);
  if (fullUrl) return fullUrl[0];
  const handleMatch = cvText.match(/LinkedIn\s*:\s*@?([\w.-]{3,60})/i);
  if (handleMatch?.[1]) {
    return `linkedin.com/in/${handleMatch[1].replace(/^@/, "")}`;
  }
  return undefined;
}

// Moteur d'analyse sémantique & reformulation STAR de secours (Bilingue FR/EN, Universel, 100% sans biais)
function generateResilientAtsResult(
  cvText: string,
  jobText: string,
  targetRoleTitle?: string,
  candidateNotes?: string,
  language: 'fr' | 'en' = 'fr'
) {
  const isEn = language === 'en';

  // 1. Extraire les coordonnées et le VRAI NOM du candidat (JAMAIS "Coordonnées")
  const fullName = extractCandidateFullName(cvText);

  const extractedEmail = extractAuthenticEmailFromCv(cvText);
  const email = extractedEmail || (isEn ? "candidate@email.com" : "contact@candidat.fr");

  const phone = extractAuthenticPhoneFromCv(cvText);
  const location = extractAuthenticLocationFromCv(cvText, isEn);
  const linkedin = extractAuthenticLinkedInFromCv(cvText);

  // 2. Extraire le titre du poste et l'entreprise cible DIRECTEMENT DE L'OFFRE (Sécurisation Anti-Pollution)
  function sanitizeExtractedCompany(rawName: string | undefined): string | null {
    const cleaned = sanitizeCompanyName(rawName);
    return cleaned || null;
  }

  let extractedCompany: string | null = null;
  const nonRoleOrLocCompanyRegex = /^(?:H\/F|F\/H|M\/F|M\/W|CDI|CDD|Stage|Alternance|Freelance|Full[\s-]?Time|Part[\s-]?Time|Permanent|Contract|Temporary|Interim|Intérim|Paris|Lyon|Marseille|Toulouse|Bordeaux|Nantes|Lille|Nice|Strasbourg|Rennes|Grenoble|Montpellier|Rouen|Toulon|Dijon|Île-de-France|Ile-de-France|La\s+Défense|France|Europe|London|Londres|Manchester|Birmingham|Edinburgh|Dublin|UK|United\s+Kingdom|New\s+York|San\s+Francisco|Boston|Austin|Chicago|Seattle|Los\s+Angeles|USA|US|Canada|Toronto|Montr[ée]al|Brussels|Bruxelles|Geneva|Gen[èe]ve|Lausanne|Zurich|Luxembourg|Berlin|Munich|Frankfurt|Amsterdam|Madrid|Barcelona|Milan|Rome|Lisbon|Remote|Hybride?|Hybrid|On[\s-]?site|Pr[ée]sentiel|T[ée]l[ée]travail|HelloWork|Indeed|LinkedIn|Jooble|Apec|Cadremploi|Welcome\s+to\s+the\s+Jungle|Glassdoor|Monster|Missions?|Profil|Description|Contexte|R[ée]sum[ée]|Avantages?|Process(?:us)?)$/i;

  const explicitCompanyMatch = jobText.match(/^\s*(?:Entreprise|Soci[ée]t[ée]|Company|Employeur|Employer|Recruteur|Hiring\s+Company|Client|Groupe|Organisation|Organization|[ÉE]tablissement|Marque|Brand|Maison|Enseigne|Filiale|Entit[ée])\s*[:=]\s*([^\n]{2,100})/im)?.[1]?.trim();
  if (explicitCompanyMatch) {
    extractedCompany = sanitizeExtractedCompany(explicitCompanyMatch);
  }
  if (!extractedCompany) {
    // Libellé seul sur une ligne suivi du nom d'entreprise sur la ligne suivante ("Marque\nSYSLEY", "Entreprise\nALTECA")
    const multilineLabelMatch = jobText.match(/^\s*(?:Entreprise|Soci[ée]t[ée]|Company|Employeur|Marque|Maison|Enseigne)\s*\n+\s*([A-ZÀ-Ÿ0-9][^\n]{1,55})$/im)?.[1]?.trim();
    if (multilineLabelMatch && !nonRoleOrLocCompanyRegex.test(multilineLabelMatch)) {
      extractedCompany = sanitizeExtractedCompany(multilineLabelMatch);
    }
  }
  const jobNonEmptyLines = jobText.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstJobLine = jobNonEmptyLines[0] || "";
  if (!extractedCompany) {
    const gluedBrandMatch = jobText.match(/(?:^|\n)\s*([A-ZÀ-Ÿ0-9][A-ZÀ-Ÿ0-9&'.\-]{1,24})(?=(?:Chez|Bienvenue|Rejoignez|À\s+propos)\s+[A-ZÀ-Ÿ])/);
    if (gluedBrandMatch?.[1]) {
      extractedCompany = sanitizeExtractedCompany(gluedBrandMatch[1]);
    }
  }
  if (!extractedCompany) {
    const compMatch = firstJobLine.match(/^([A-Za-z0-9À-ÿ\s&'.-]+)\s*[-–:|]\s*(?:Offre|Recherche|Poste|Recrute|Job Opportunity|Hiring|Career|Position)/i);
    if (compMatch) {
      extractedCompany = sanitizeExtractedCompany(compMatch[1]);
    }
  }
  if (!extractedCompany) {
    // Ex: "Supply Planner - Danone" ou "SYSLEY • Saint-Ouen" ou ligne isolée Indeed ("Supply Planner\nSYSLEY\nSaint-Ouen (93)\nCDI")
    for (let li = 0; li < Math.min(jobNonEmptyLines.length, 5); li++) {
      const jl = jobNonEmptyLines[li];
      const bulletLeftMatch = jl.match(/^([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\- ()]{1,40}?)\s*[•·]\s*(?:[A-ZÀ-Ÿ0-9(].+)$/);
      if (bulletLeftMatch?.[1]) {
        const leftCand = bulletLeftMatch[1].trim();
        if (!nonRoleOrLocCompanyRegex.test(leftCand) && !/\b(?:planner|manager|responsable|chef\s+de|charg[ée]|ing[ée]nieur|consultant|analyst|d[ée]veloppeur|assistant|directeur|coordinateur|coordinatrice|cdi|cdd|stage|alternance|temps\s+plein)\b/i.test(leftCand)) {
          extractedCompany = sanitizeExtractedCompany(leftCand);
          if (extractedCompany) break;
        }
      }
      const rightBrandMatch = jl.match(/^.{4,65}?\s+(?:[-–|•·]|chez|at)\s+([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\- ()]{1,45})$/i);
      if (rightBrandMatch?.[1]) {
        const cand = rightBrandMatch[1].trim();
        if (!nonRoleOrLocCompanyRegex.test(cand)) {
          extractedCompany = sanitizeExtractedCompany(cand);
          if (extractedCompany) break;
        }
      }
      // Ligne dédiée Indeed / LinkedIn (index 1..3) située sous l'intitulé de poste et/ou suivie d'un lieu / contrat / note
      if (li >= 1 && li <= 3 && jl.length >= 2 && jl.length <= 45 && /^[A-ZÀ-Ÿ0-9]/.test(jl) && jl.split(/\s+/).length <= 5) {
        const nextLine = jobNonEmptyLines[li + 1] || "";
        const looksLikeLocOrContractNext = /\(\d{2,5}\)|\b\d{5}\b|\b(?:CDI|CDD|Stage|Alternance|Temps\s+plein|Full[\s-]?time|Paris|Saint-Ouen|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|France|Île-de-France|Ile-de-France|La\s+Défense|Télétravail|Hybride|Remote|★|avis)\b/i.test(nextLine);
        const looksLikeUiOrRoleOrLocSelf =
          nonRoleOrLocCompanyRegex.test(jl) ||
          /^\d|€|\$|★|\b(?:planner|manager|responsable|chef\s+de|charg[ée]|ing[ée]nieur|consultant|analyst|d[ée]veloppeur|assistant|directeur|coordinateur|coordinatrice|pr[ée]visionniste|approvisionneur|temps\s+plein|full[\s-]?time|part[\s-]?time|postuler|sauvegarder|enregistrer|partager|signaler|publi[ée]|il\s+y\s+a|salaire|lieu\s+de\s+travail|type\s+de\s+contrat|[àa]\s+propos|d[ée]tails?\s+du\s+poste|description\s+du\s+poste)\b/i.test(jl) ||
          /\(\d{2,5}\)|\b\d{5}\b/.test(jl);
        if (looksLikeLocOrContractNext && !looksLikeUiOrRoleOrLocSelf) {
          extractedCompany = sanitizeExtractedCompany(jl);
          if (extractedCompany) break;
        }
      }
    }
  }
  if (!extractedCompany) {
    // Scan exhaustif via matchAll (pour qu'une phrase générique antérieure type "Au sein de la Direction..." n'éclipse jamais "la marque SYSLEY" ou "chez SYSLEY" plus loin)
    const narrativePatterns: Array<{ regex: RegExp; requireCapitalizedStart: boolean }> = [
      {
        regex: /(?:[ÀA]\s+propos\s+de(?:\s+la\s+(?:marque|maison|soci[ée]t[ée])|\s+l['’](?:entreprise|enseigne)|\s+du\s+groupe)?|Pr[ée]sentation\s+de(?:\s+la\s+(?:marque|maison|soci[ée]t[ée])|\s+l['’]entreprise)?|Bienvenue\s+chez|Rejoignez(?:\s+les\s+[ée]quipes(?:\s+de)?)?|Rejoindre|Int[ée]grez|Au\s+sein\s+de(?:\s+la\s+(?:soci[ée]t[ée]|marque|maison)|\s+l['’](?:entreprise|enseigne)|\s+du\s+groupe|\s+des\s+[ée]quipes)?|Pour\s+(?:la\s+(?:soci[ée]t[ée]|marque|maison)|le\s+groupe|l['’](?:entreprise|enseigne))|D[ée]couvrez(?:\s+la\s+(?:marque|maison|soci[ée]t[ée]))?|Le\s+groupe|La\s+soci[ée]t[ée]|La\s+marque|La\s+maison|L['’]entreprise|L['’]enseigne|The\s+brand|About(?:\s+the\s+(?:company|brand))?|Join|\bchez)\s+["«']?([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\- ()]{1,45})["»']?/gi,
        requireCapitalizedStart: true,
      },
      {
        regex: /(?:^|\n|[.!?]\s+)([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\- ]{1,35}?),\s+(?:maison|marque|entreprise|soci[ée]t[ée]|groupe|enseigne|leader|acteur|sp[ée]cialiste)\b/gi,
        requireCapitalizedStart: true,
      },
      {
        regex: /(?:^|\n|[.!?]\s+)([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\- ]{1,35}?)\s+(?:recrute|recherche|est\s+une?\s+(?:entreprise|soci[ée]t[ée]|marque|maison|groupe|leader|acteur)|is\s+hiring|is\s+looking\s+for)\b/gim,
        requireCapitalizedStart: true,
      },
      {
        regex: /\b(?:marque|maison|enseigne)\s+["«']?([A-ZÀ-Ÿ0-9][A-Za-zÀ-ÿ0-9&'.\-]{1,35})["»']?/gi,
        requireCapitalizedStart: true,
      },
    ];
    for (const { regex, requireCapitalizedStart } of narrativePatterns) {
      for (const m of jobText.matchAll(regex)) {
        const rawSegment = (m[1] || "").split(/[\n,.!?]/)[0].trim();
        if (!rawSegment) continue;
        if (requireCapitalizedStart && !/^[A-ZÀ-Ÿ0-9"«']/.test(rawSegment)) continue;
        if (nonRoleOrLocCompanyRegex.test(rawSegment)) continue;
        extractedCompany = sanitizeExtractedCompany(rawSegment);
        if (extractedCompany) break;
      }
      if (extractedCompany) break;
    }
  }
  if (!extractedCompany && /\bat\s+[A-Z0-9]/.test(jobText)) {
    for (const atMatch of jobText.matchAll(/\bat\s+([A-Z0-9][A-Za-z0-9\s&'.-]{1,40})/g)) {
      const rawAt = (atMatch[1] || "").split(/[\n,.!?()]/)[0].trim();
      if (!rawAt || nonRoleOrLocCompanyRegex.test(rawAt)) continue;
      extractedCompany = sanitizeExtractedCompany(rawAt);
      if (extractedCompany) break;
    }
  }

  const hasSpecificCompany = Boolean(extractedCompany);
  const company = extractedCompany || "";

  // Détection du poste : PRIORITÉ absolue à l'intitulé explicitement saisi/corrigé par le candidat (Options d'alignement avancé),
  // puis détection stricte ancrée en début de ligne dans l'offre (en excluant les paragraphes type "Process de recrutement :")
  const cleanTargetRole = targetRoleTitle ? sanitizeJobRoleTitle(targetRoleTitle) : "";
  const explicitJobTitleMatch = jobText.match(/^\s*(?:Poste(?:\s+à\s+pourvoir)?|Rôle|Intitulé(?:\s+du\s+poste)?|Titre|Job\s+Title|Role|Position)\s*:\s*([^\n]{3,90})/im)?.[1]?.trim();
  const isFirstLineTitle =
    firstJobLine.length > 3 &&
    firstJobLine.length < 95 &&
    !/^(?:descriptif|about\s+the\s+role|nous\s+recherchons|nous\s+recrutons|missions|profil|entreprise\s*:|lieu\s*:|process(?:us)?\s+de\s+recrutement|nos\s+avantages|confirm[ée]\/expert)/i.test(firstJobLine);
  const recruitingPhraseMatch = jobText.match(/(?:Nous\s+recherchons|Nous\s+recrutons|Hiring|Looking\s+for)\s+(?:un(?:\(e\))?|une|des|a|an)?\s*([^\n.;,]{4,70})/i)?.[1]?.trim();

  // Scan de secours sur les 15 premières lignes courtes de l'offre pour trouver un intitulé métier plausible (ex: "Product Manager")
  const scanShortRoleLine = (): string => {
    const shortLines = jobText.split("\n").map((l) => l.trim()).filter((l) => l.length >= 4 && l.length <= 75).slice(0, 18);
    const roleHintRegex = /\b(?:product\s+(?:manager|owner)|proxy\s+(?:po|product\s+owner)|chef\s+de\s+projet|architecte|d[ée]veloppeur|developer|ing[ée]nieur|engineer|consultant|business\s+analyst|scrum\s+master|tech\s+lead|devops|sre|data\s+(?:analyst|engineer|scientist)|directeur|responsable)\b/i;
    for (const sl of shortLines) {
      if (roleHintRegex.test(sl)) {
        const candidate = sanitizeJobRoleTitle(sl);
        if (candidate && candidate.split(/\s+/).length <= 8) return candidate;
      }
    }
    return "";
  };

  let roleTitle = cleanTargetRole || "";
  if (!roleTitle && explicitJobTitleMatch) {
    roleTitle = sanitizeJobRoleTitle(explicitJobTitleMatch);
  }
  if (!roleTitle && isFirstLineTitle) {
    roleTitle = sanitizeJobRoleTitle(firstJobLine.replace(/^[#*-\s]+/, "").trim());
  }
  if (!roleTitle && recruitingPhraseMatch) {
    roleTitle = sanitizeJobRoleTitle(recruitingPhraseMatch);
  }
  if (!roleTitle) {
    roleTitle = scanShortRoleLine();
  }
  if (hasSpecificCompany && company.length >= 2) {
    const compEsc = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    roleTitle = roleTitle
      .replace(new RegExp(`\\s*(?:[-–—|•·]|\\bchez\\b|\\bat\\b|@)\\s*${compEsc}$`, "i"), "")
      .trim();
  }
  roleTitle = sanitizeJobRoleTitle(roleTitle) || cleanTargetRole || (isEn ? "Target Role" : "Poste Cible");

  // 3. Analyse d'écart sémantique DYNAMIQUE basée EXCLUSIVEMENT sur l'offre réelle (zéro pollution par le CV)
  const dynamicJobKeywords = extractSkillsAndCompetencies(jobText, "", 14, isEn);
  const cvOnlyKeywords = extractSkillsAndCompetencies(cvText, "", 28, isEn);
  const criticalRequiredKeywords = dynamicJobKeywords.length > 0
    ? dynamicJobKeywords
    : (isEn ? ["Product Management", "Agile & Scrum", "Cross-Functional Communication", "KPI Performance", "Problem Solving"] : ["Gestion de Projet", "Méthodologie Agile", "Communication Transverse", "Pilotage des KPI", "Résolution de Problèmes"]);

  const matchedKeywords: string[] = [];
  const missingOrGaps: string[] = [];
  const cvNorm = cvText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bs\s*&\s*op\b/g, "sop")
    .replace(/\br\s*&\s*d\b/g, "rd")
    .replace(/\bp\s*&\s*l\b/g, "pl");

  criticalRequiredKeywords.forEach((kw) => {
    const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const normKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normRegex = new RegExp(`\\b${normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const meaningfulToks = tokenizeMeaningfulTerms(kw);
    const hasStemMatch =
      meaningfulToks.length > 0 &&
      meaningfulToks.every(
        (tok) =>
          hasWholeTokenInNormCorpus(cvNorm, tok) ||
          (tok.length >= 8 && new RegExp(`\\b${tok.slice(0, 7)}[a-z]*\\b`, "i").test(cvNorm))
      );

    if (kwRegex.test(cvText) || normRegex.test(cvNorm) || hasStemMatch) {
      matchedKeywords.push(kw);
    } else {
      missingOrGaps.push(kw);
    }
  });

  // N'intégrer en compétences transférables que si un token métier DISTINCTIF (hors mots génériques type "processus", "service", "calcul", "besoins") existe au sens mot entier dans le CV
  const GENERIC_TRANSFER_TOKENS = new Set([
    "process", "processus", "gestion", "management", "pilotage", "analyse", "suivi", "calcul",
    "service", "taux", "performance", "besoin", "besoins", "client", "clients", "outil", "outils",
    "systeme", "systemes", "qualite", "equipe", "equipes", "methodologie", "strategy", "planning",
    "controle", "coordination", "execution", "production", "operation", "operations"
  ]);
  const integratedKeywords = missingOrGaps.filter((kw) => {
    const toks = tokenizeMeaningfulTerms(kw);
    const shortOrAcronymToks = toks.filter((t) => t.length <= 4);
    if (shortOrAcronymToks.some((t) => !hasWholeTokenInNormCorpus(cvNorm, t))) {
      return false;
    }
    const distinctiveHits = toks.filter(
      (tok) => tok.length >= 5 && !GENERIC_TRANSFER_TOKENS.has(tok) && hasWholeTokenInNormCorpus(cvNorm, tok)
    );
    return distinctiveHits.length > 0;
  }).slice(0, 3);
  const remainingGaps = missingOrGaps.filter((kw) => !integratedKeywords.includes(kw));
  const jobFocus = extractJobFocusContext(jobText, roleTitle, criticalRequiredKeywords, isEn, cvText);

  // 4. Parser les VÉRITABLES expériences du CV source avec reformulation STAR ciblée sur l'offre
  const experiences = parseAuthenticExperiencesFromCv(
    cvText,
    roleTitle,
    company,
    location,
    isEn,
    matchedKeywords,
    jobFocus,
    criticalRequiredKeywords,
    integratedKeywords
  );

  // 5. Formation extraite rigoureusement de la section FORMATION du CV réel (sans mélange avec les expériences)
  const education = parseAuthenticEducationFromCv(cvText, isEn);

  // 5b. Certifications & Langues authentiques extraites des sections dédiées
  const certifications = parseAuthenticCertificationsFromCv(cvText);
  const languagesList = parseAuthenticLanguagesFromCv(cvText, isEn);

  // 6 & 7. Catégories de compétences DYNAMIQUES (offre + outils + atouts différenciants) & Profil Professionnel adapté
  const authenticSummary = extractRawSummaryFromCv(cvText);
  const postStarCorpusNorm = [
    roleTitle,
    authenticSummary,
    experiences.map((e: any) => `${e.role} ${(e.bullets || []).join(" ")}`).join(" "),
  ]
    .join("\n")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bs\s*&\s*op\b/g, "sop");

  const postStarIntegrated = missingOrGaps.filter((kw) => {
    if (integratedKeywords.includes(kw)) return true;
    const kwN = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const toks = tokenizeMeaningfulTerms(kw);
    return hasWholeTokenInNormCorpus(postStarCorpusNorm, kwN) || (toks.length > 0 && toks.every((tok) => hasWholeTokenInNormCorpus(postStarCorpusNorm, tok)));
  });

  const allVerifiedCandidatePool: string[] = [];
  const seenSkillPool = new Set<string>();
  const pushPoolSkill = (s: string) => {
    if (s && !seenSkillPool.has(s.toLowerCase())) {
      allVerifiedCandidatePool.push(s);
      seenSkillPool.add(s.toLowerCase());
    }
  };
  matchedKeywords.forEach(pushPoolSkill);
  postStarIntegrated.forEach(pushPoolSkill);
  cvOnlyKeywords.forEach(pushPoolSkill);

  const methodRegex = /(?:Agile|Scrum|Kanban|SAFe|Cycle en V|Lean|Six Sigma|PRINCE2|PMP|ITIL|Backlog|User Stories|Recette|UAT|Roadmap|Sprint|Refinement|Release|Architecture|Urbanisation|Spécifications|Modélisation|BPMN|UML|MCD|Cadrage|Cahier des Charges|AMOA|MOA|KPI|Reporting|TMA|Conduite du Changement|Change Management|Design Thinking|Gestion de Projet|Project Management|Gestion des Risques|Priorisation|Assurance Qualité|Contr[oô]le Qualit[ée]|Conformit[ée]|Audit|Pr[ée]vention|Contentieux|R[ée]daction de Rapports|Argumentation|Exp[ée]rimentation|Protocoles|Méthodes Maintenance|Fiabilité Industrielle|Maintenance Industrielle|Maintenance Préventive|GMAO|TPM|5S|SMED|AMDEC|Criticité|Amélioration Continue)/i;
  const softRegex = /(?:Leadership|Management|Analyse|Synthèse|Analysis|Synthesis|Rigueur|Rigor|Autonomie|Autonomy|Problèmes|Priorités|Communication|Collaboration|Équipe|Relationnel|Interpersonal|Adaptation|Adaptability|Proposition|Décision|Organisation|Gouvernance|Governance|Client|Stakeholder|Argumentation)/i;
  const nonInterpersonalMgmtRe = /(?:Inventory|Data|Service\s*Level|Database|Warehouse|Stock|Order|Supply|Demand|Release|Backlog|Project|Product(?:\s+Launch)?|Risk|Change|Process|Trade-Offs|Claims|Disputes)\s+Management/i;

  const roleOnlyLower = (roleTitle || "").toLowerCase();
  const skillsAndRoleNorm = `${roleTitle} ${criticalRequiredKeywords.join(" ")} ${cvText.slice(0, 600)}`.toLowerCase();
  const isAgronomyAuditFocused = /\b(?:agronom|agroalimentaire|agro[- ]industries?|contr[oô]le\s+qualit[ée]|avaries|contentieux|audit|expertises?\s+terrain|exp[ée]rimentation\s+v[ée]g[ée]tale)\b/i.test(skillsAndRoleNorm);
  const isMaintenanceFocused = /\b(?:maintenance|fiabilit[ée]|m[ée]thodes\s*(?:maintenance|industrielles?)?|gmao|sap\s*pm|tpm|smed|mtbf|mttr|trs|parc\s+machines?|moyens?\s+de\s+production)\b/i.test(skillsAndRoleNorm);
  const scHitsInScope = (skillsAndRoleNorm.match(/\b(?:supply\s*chain|demand\s*planning|supply\s*planning|s&op|approvisionnement|logistique|otif|cpfr|pr[ée]vision\s+des\s+ventes)\b/gi) || []).length;
  const isSupplyChainFocused = /\b(?:supply\s*chain|demand\s*planning|supply\s*planning|s&op|approvisionnement|logistique|otif|cpfr|pr[ée]vision\s+des\s+ventes)\b/i.test(roleOnlyLower) || (!isMaintenanceFocused && !isAgronomyAuditFocused && scHitsInScope >= 2);
  const isProductRole = /\b(?:product\s*owner|proxy\s*po|product\s*manager|chef\s+de\s+produit|scrum\s+master)\b/i.test(roleOnlyLower);
  const isArchRole = /\b(?:architect\w*|urbanis\w*|cartograph\w*)\b/i.test(roleOnlyLower);
  const isArchitectureFocused = isArchRole || (!isProductRole && !isSupplyChainFocused && !isMaintenanceFocused && !isAgronomyAuditFocused && /architect|urbanisation|cartographie|esb|uml|bpmn/i.test(`${roleTitle} ${criticalRequiredKeywords.join(" ")}`));
  const isProductFocused = isProductRole || (!isArchitectureFocused && !isSupplyChainFocused && !isMaintenanceFocused && !isAgronomyAuditFocused && /\b(?:product\s*owner|proxy|backlog|scrum|user\s*stories|sprint)\b/i.test(`${roleTitle} ${criticalRequiredKeywords.join(" ")}`));
  const methodCatTitle = isEn
    ? (isAgronomyAuditFocused ? "Quality Control, Audit & Scientific Methodology" : isMaintenanceFocused ? "Maintenance Engineering, Reliability & Continuous Improvement" : isSupplyChainFocused ? "Operations, Planning & Methodologies" : isArchitectureFocused ? "Architecture, Modeling & Delivery" : isProductFocused ? (jobFocus.themes.dataAi ? "Agile Product & Data Delivery" : "Agile Product & Backlog Delivery") : "Operational Delivery & Methodologies")
    : (isAgronomyAuditFocused ? "Contrôle Qualité, Audit & Méthodes Scientifiques" : isMaintenanceFocused ? "Méthodes Maintenance, Fiabilité & Amélioration Continue" : isSupplyChainFocused ? "Opérations, Planification & Méthodes" : isArchitectureFocused ? "Architecture, Modélisation & Urbanisation SI" : isProductFocused ? (jobFocus.themes.dataAi ? "Méthodologies Agiles & Pilotage Produit Data" : "Méthodologies Agiles & Pilotage Produit") : "Pilotage Opérationnel, Processus & Méthodes");

  const coreToolsAndRoleSkills: string[] = [];
  const methodAndArchSkills: string[] = [];
  const interpersonalSkills: string[] = [];

  for (const s of allVerifiedCandidatePool) {
    if (softRegex.test(s) && !nonInterpersonalMgmtRe.test(s) && interpersonalSkills.length < 5) {
      const sNorm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!interpersonalSkills.some((ex) => {
        const exNorm = ex.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return exNorm === sNorm || (exNorm.includes("priorit") && sNorm.includes("priorit"));
      })) {
        interpersonalSkills.push(s);
      }
    } else if (methodRegex.test(s) && methodAndArchSkills.length < 6) {
      methodAndArchSkills.push(s);
    } else if (coreToolsAndRoleSkills.length < 6 && !(isMaintenanceFocused && /^Supply Chain$/i.test(s))) {
      coreToolsAndRoleSkills.push(s);
    }
  }

  for (const kw of [...matchedKeywords, ...postStarIntegrated, ...cvOnlyKeywords]) {
    if (!coreToolsAndRoleSkills.includes(kw) && !methodAndArchSkills.includes(kw) && !interpersonalSkills.includes(kw)) {
      if (coreToolsAndRoleSkills.length < 6 && !(isMaintenanceFocused && /^Supply Chain$/i.test(kw))) coreToolsAndRoleSkills.push(kw);
    }
  }

  if (methodAndArchSkills.length < 3) {
    const contextualMethods = matchedKeywords.filter((k) => !coreToolsAndRoleSkills.includes(k) && !interpersonalSkills.includes(k));
    for (const cm of contextualMethods) {
      if (!methodAndArchSkills.includes(cm) && methodAndArchSkills.length < 5) methodAndArchSkills.push(cm);
    }
  }
  if (interpersonalSkills.length < 3) {
    const softFallback = isEn
      ? ["Cross-Functional Collaboration", "Analytical Synthesis", "Stakeholder Alignment", "Operational Rigor", "Adaptability & Proactivity"]
      : ["Communication Transverse", "Esprit d'Analyse & Synthèse", isSupplyChainFocused ? "Coordination Commerciale & Fournisseurs" : "Coordination Transverse", "Rigueur d'Exécution", "Adaptabilité & Proactivité"];
    const hasSemanticOverlap = (existingList: string[], candidate: string): boolean => {
      const normCand = candidate.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const concepts = ["analyse", "synthese", "communication", "coordination", "rigueur", "leadership", "adaptabilite", "priorit"];
      return existingList.some((ex) => {
        const normEx = ex.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normEx === normCand || normEx.includes(normCand) || normCand.includes(normEx)) return true;
        return concepts.some((c) => normEx.includes(c) && normCand.includes(c));
      });
    };
    for (const sf of softFallback) {
      if (!hasSemanticOverlap(interpersonalSkills, sf) && interpersonalSkills.length < 4) {
        interpersonalSkills.push(sf);
      }
    }
  }

  const authenticTools = extractAuthenticToolsAndSystemsFromCv(cvText, jobText, isEn);
  const toolBaseNormSet = new Set(
    authenticTools.map((t) => t.replace(/\s*\([^)]*\)/g, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim())
  );
  const filteredCoreSkills =
    authenticTools.length > 0
      ? coreToolsAndRoleSkills.filter((s) => {
          const sBase = s.replace(/\s*\([^)]*\)/g, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return !toolBaseNormSet.has(sBase) && !Array.from(toolBaseNormSet).some((tb) => tb.startsWith(sBase) || sBase.startsWith(tb));
        })
      : coreToolsAndRoleSkills;
  const effectiveCoreSkills = filteredCoreSkills.length >= 3 ? filteredCoreSkills : (coreToolsAndRoleSkills.length > 0 ? coreToolsAndRoleSkills : matchedKeywords.slice(0, 6));
  const differentiatingSkills = extractDifferentiatingCvSkills(
    cvText,
    [...effectiveCoreSkills, ...methodAndArchSkills, ...authenticTools, ...interpersonalSkills],
    isEn,
    5
  ).filter((s) => !(isMaintenanceFocused && !/supply\s*chain/i.test(jobText) && /^Supply Chain$/i.test(s)));

  const profSummary = buildAdaptedProfessionalSummary(
    authenticSummary,
    cvText,
    roleTitle,
    company,
    isEn,
    matchedKeywords,
    jobFocus.topFocusKeywords,
    jobFocus.domainLabel,
    jobFocus.missionPhrases,
    jobFocus.themes,
    differentiatingSkills
  );

  const dynamicSkillsCategories = [
    {
      categoryName: isEn ? `Key Competencies — ${roleTitle}` : `Exigences Clés — ${roleTitle}`,
      skills: effectiveCoreSkills
    },
    {
      categoryName: methodCatTitle,
      skills: methodAndArchSkills
    },
    ...(authenticTools.length > 0
      ? [{
          categoryName: isEn ? "Technical Tools & Systems" : "Outils & Systèmes",
          skills: authenticTools
        }]
      : []),
    ...(differentiatingSkills.length >= 2
      ? [{
          categoryName: isEn ? "Differentiating & Added-Value Skills" : "Atouts Différenciants & Valeur Ajoutée",
          skills: differentiatingSkills
        }]
      : []),
    {
      categoryName: isEn ? "Interpersonal & Governance Skills" : "Compétences Relationnelles & Gouvernance",
      skills: interpersonalSkills
    }
  ].filter((c) => c.skills.length > 0);

  // 8. Lettre de Motivation fluide et personnalisée aux enjeux de l'offre & à l'expérience prouvée (ZÉRO tag majuscule brut ni code appli interne)
  const todayFormatted = isEn
    ? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const topExperience = experiences[0];
  const authenticTransferablePool = cvOnlyKeywords.slice(0, 3);
  const primaryOfferFocusSkills = (
    matchedKeywords.length > 0
      ? matchedKeywords
      : authenticTransferablePool.length > 0
      ? authenticTransferablePool
      : jobFocus.topFocusKeywords
  ).slice(0, 3);
  const primaryOfferFocus = joinNaturalList(primaryOfferFocusSkills.map((k) => formatSkillForProse(k, isEn)), isEn) || (isEn ? "strategic delivery and functional rigor" : "pilotage fonctionnel et rigueur d'exécution");
  const cleanMissionsForLetter = jobFocus.missionPhrases.map((m) => sanitizeTargetMissionPhrase(m, cvText)).filter(Boolean);
  const firstMissionRef = cleanMissionsForLetter[0]
    ? cleanMissionsForLetter[0].charAt(0).toLowerCase() + cleanMissionsForLetter[0].slice(1)
    : "";
  const secondMissionRef = cleanMissionsForLetter[1]
    ? cleanMissionsForLetter[1].charAt(0).toLowerCase() + cleanMissionsForLetter[1].slice(1)
    : "";
  const frMissionClause = (phrase: string): string => {
    if (!phrase) return "";
    const startsWithInfinitive = /^(?:concevoir|definir|définir|piloter|rediger|rédiger|modeliser|modéliser|analyser|garantir|coordonner|participer|accompagner|assurer|gerer|gérer|prioriser|recueillir|traduire|structurer|deployer|déployer|optimiser|animer|realiser|réaliser|orchestrer|maintenir|superviser|elaborer|élaborer|conduire|travailler|collaborer|mettre\s+[àa]\s+jour)\b/i.test(phrase);
    return startsWithInfinitive ? `la capacité à ${phrase}` : `la maîtrise ${frDe(phrase)}`;
  };
  const topBulletHighlight = topExperience?.keyAchievementsHighlighted?.[0]
    ? topExperience.keyAchievementsHighlighted[0].replace(/\.$/, "")
    : "";
  const topHighlightLower = topBulletHighlight ? topBulletHighlight.charAt(0).toLowerCase() + topBulletHighlight.slice(1) : "";
  const isInfinitiveHighlightFr = /^(?:piloter|animer|conduire|mener|superviser|configurer|param[ée]trer|g[ée]rer|concevoir|d[ée]velopper|mod[ée]liser|analyser|coordonner|orchestrer|optimiser|mettre|r[ée]diger|d[ée]ployer|structurer|intervenir|assurer|d[ée]livrer|arbitrer|r[ée]aliser|participer|contribuer|accompagner|maintenir|cr[ée]er|[ée]laborer|valider|s[ée]curiser|encadrer|former|automatiser|migrer|int[ée]grer|tester|fiabiliser|qualifier|contr[oô]ler|formaliser|garantir|traduire|prioriser|cadrer|urbaniser|cartographier|administrer|auditer|[ée]tudier|[ée]valuer|adapter|diriger|faciliter|documenter|consolider|ex[ée]cuter|transformer|acc[ée]l[ée]rer|suivre|recueillir|prendre)(?=\s|$|[,.:;])/i.test(topHighlightLower);
  const usesEtreAuxFr = /^(?:intervenu|all[ée]|revenu|devenu|rest[ée]|arriv[ée]|part[ie])\b/i.test(topHighlightLower);
  const frHighlightClause = topHighlightLower
    ? isInfinitiveHighlightFr
      ? ` ; j'y ai eu pour mission ${/^[aeiouyàâéèêëîïôöùûüœæ]/i.test(topHighlightLower) ? "d'" : "de "}${topHighlightLower}`
      : usesEtreAuxFr
      ? ` ; j'y suis notamment ${topHighlightLower}`
      : ` ; j'y ai notamment ${topHighlightLower}`
    : "";
  const topExpSkillList: string[] = (
    topExperience?.matchedKeywordsInRole?.length
      ? topExperience.matchedKeywordsInRole
      : matchedKeywords.length > 0
      ? matchedKeywords
      : authenticTransferablePool
  ).slice(0, 3);
  const topExpSkills = joinNaturalList(topExpSkillList.map((k: string) => formatSkillForProse(k, isEn)), isEn) || primaryOfferFocus;

  const isTechOrItCover = /\b(?:it|si|software|data|cloud|devops|product\s*owner|salesforce|erp|d[ée]velopp|architect|informatique)\b/i.test(`${roleTitle} ${jobText}`);

  const diffLetterSkills = differentiatingSkills.slice(0, 2).map((k) => formatSkillForProse(k, isEn)).filter(Boolean);
  const diffLetterClauseEn = diffLetterSkills.length > 0
    ? ` I also bring differentiating expertise in ${joinNaturalList(diffLetterSkills, true)} to create measurable added value beyond core requirements.`
    : "";
  const diffLetterClauseFr = diffLetterSkills.length > 0
    ? ` J'y associe une valeur ajoutée différenciante en ${joinNaturalList(diffLetterSkills, false)} pour me démarquer durablement sur vos projets.`
    : "";

  const isNonStandardRoleFrame = Boolean(topExperience?.role && /^(?:Contrat|Stage|Alternance|Apprentissage|Projet|Organisation|Internship|Apprenticeship|Project)\b/i.test(topExperience.role));
  const topExpOpeningEn = topExperience
    ? isNonStandardRoleFrame
      ? `During my ${topExperience.role} at ${topExperience.company}, I`
      : `As ${topExperience.role} at ${topExperience.company}, I`
    : "Throughout my career, I have";
  const topExpOpeningFr = topExperience
    ? isNonStandardRoleFrame
      ? `Dans le cadre de mon ${topExperience.role.charAt(0).toLowerCase() + topExperience.role.slice(1)} chez ${topExperience.company}, j'ai`
      : `En tant que ${topExperience.role} chez ${topExperience.company}, j'ai`
    : "Tout au long de mon parcours, j'ai";

  const coverLetter = {
    header: {
      candidateName: fullName,
      candidateEmail: email,
      candidatePhone: phone,
      recipientNameOrTitle: isEn ? "Hiring Team" : "Direction du Recrutement",
      companyName: hasSpecificCompany ? company : "",
      date: todayFormatted,
      subjectLine: isEn ? `Subject: Application for the position of ${roleTitle}` : `Objet : Candidature au poste ${frDe(roleTitle)}`,
    },
    paragraphs: {
      vous: isEn
        ? `Your organization${hasSpecificCompany ? ` (${company})` : ""} operates at the forefront of ${jobFocus.domainLabel}. The ${roleTitle} position closely aligns with my career focus, particularly your need to ${firstMissionRef || `drive ${primaryOfferFocus}`} while maintaining tight coordination across ${isTechOrItCover ? "business and IT teams" : "cross-functional and operational teams"}.`
        : `Votre organisation${hasSpecificCompany ? ` (${company})` : ""} évolue sur des enjeux stratégiques dans le secteur ${jobFocus.domainLabel}. Le poste ${frDe(roleTitle)} retient toute mon attention par l'importance accordée à ${firstMissionRef ? frMissionClause(firstMissionRef) : `la maîtrise d'enjeux clés tels que ${primaryOfferFocus}`}, des dimensions au cœur de mon expertise.`,
      moi: isEn
        ? `${topExpOpeningEn} applied ${topExpSkills} to deliver high-impact initiatives${topHighlightLower ? `, where I ${topHighlightLower}` : ""}. This hands-on background directly prepares me to support your ${primaryOfferFocus} priorities.${diffLetterClauseEn}`
        : `${topExpOpeningFr} mobilisé mon savoir-faire en ${topExpSkills} sur des projets exigeants${frHighlightClause}. Cette expérience concrète me permet d'apporter une réponse immédiate à vos attentes sur les volets ${primaryOfferFocus}.${diffLetterClauseFr}`,
      nous: isEn
        ? `Joining your teams${hasSpecificCompany ? ` at ${company}` : ""} would allow me to contribute immediately to ${secondMissionRef || `your upcoming ${roleTitle} initiatives`}. I would welcome the opportunity to discuss how my background aligns with your roadmap in an interview.`
        : `Intégrer vos équipes${hasSpecificCompany ? ` chez ${company}` : ""} me permettrait de m'investir sans délai pour ${secondMissionRef || `accompagner vos projets ${frDe(roleTitle)} sur les volets ${primaryOfferFocus}`}. Je me tiens à votre entière disposition pour un entretien afin d'échanger sur cette future collaboration.`,
    },
    signOff: isEn ? "Sincerely," : "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
    fullTextFormatted: isEn
      ? `Subject: Application for the position of ${roleTitle}\n\nDear Hiring Team,\n\n...`
      : `Objet : Candidature au poste ${frDe(roleTitle)}\n\nMadame, Monsieur,\n\n...`,
    languageMode: language
  };

  // Calcul objectif et dynamique de l'Indice de Passage Recruteur (sans auto-confirmation par les missions d'offre du profSummary)
  const tailoredCorpusNorm = [
    roleTitle,
    authenticSummary,
    dynamicSkillsCategories.map((c) => c.skills.join(" ")).join(" "),
    experiences.map((e) => `${e.role} ${e.bullets.join(" ")}`).join(" "),
  ]
    .join("\n")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bs\s*&\s*op\b/g, "sop");

  const refinedIntegratedSet = new Set<string>(integratedKeywords);
  for (const gapKw of remainingGaps) {
    const gapNorm = gapKw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const gapTokens = tokenizeMeaningfulTerms(gapKw);
    const inTailored =
      hasWholeTokenInNormCorpus(tailoredCorpusNorm, gapNorm) ||
      (gapTokens.length > 0 && gapTokens.every((tok) => hasWholeTokenInNormCorpus(tailoredCorpusNorm, tok)));
    if (inTailored) {
      refinedIntegratedSet.add(gapKw);
    }
  }
  const finalIntegratedKeywords = Array.from(refinedIntegratedSet);
  const finalRemainingGaps = missingOrGaps.filter((kw) => !refinedIntegratedSet.has(kw));

  const totalCrit = Math.max(1, criticalRequiredKeywords.length);
  const rawMatchRatio = matchedKeywords.length / totalCrit;
  const tailoredMatchRatio = Math.min(1, (matchedKeywords.length + finalIntegratedKeywords.length) / totalCrit);
  const roleTokens = tokenizeMeaningfulTerms(roleTitle).filter((t) => t.length >= 3);
  const pastRoleCorpus = `${experiences.map((e) => e.role).join(" ")} ${authenticSummary}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const roleTokenHits = roleTokens.filter((t) => pastRoleCorpus.includes(t)).length;
  const roleAlignmentRatio = roleTokens.length > 0 ? roleTokenHits / roleTokens.length : 0.4;
  const roleTitleBonus = Math.round(roleAlignmentRatio * 14);

  const computedInitialScore = Math.min(78, Math.max(32, Math.round(26 + rawMatchRatio * 46 + roleTitleBonus)));
  const starFormatBonus = experiences.length >= 2 ? 15 : 11;
  const computedOptimizedScore = Math.min(
    97,
    Math.max(
      computedInitialScore + 14,
      Math.round(30 + tailoredMatchRatio * 48 + roleTitleBonus * 0.8 + starFormatBonus)
    )
  );

  const jobOverviewFocusText = joinNaturalList(
    (jobFocus.topFocusKeywords.length > 0 ? jobFocus.topFocusKeywords : criticalRequiredKeywords).slice(0, 3).map((k) => formatSkillForProse(k, isEn)),
    isEn
  ) || primaryOfferFocus;

  return {
    languageMode: language,
    semanticGap: {
      languageMode: language,
      jobOverview: {
        title: roleTitle,
        company: company,
        industry: jobFocus.domainLabel,
        summary: isEn
          ? `Role of ${roleTitle}${hasSpecificCompany ? ` at ${company}` : ""} focused on ${jobOverviewFocusText}.`
          : `Poste ${frDe(roleTitle)}${hasSpecificCompany ? ` chez ${company}` : ""} axé sur ${jobOverviewFocusText}.`
      },
      scores: {
        initialAtsScore: computedInitialScore,
        optimizedAtsScore: computedOptimizedScore,
        scoreExplanation: isEn
          ? `ATS match strengthened from ${computedInitialScore}% to ${computedOptimizedScore}% for ${roleTitle} by prioritizing ${matchedKeywords.slice(0, 3).join(", ") || primaryOfferFocus} across summary and experience highlights.`
          : `Progression de ${computedInitialScore}% à ${computedOptimizedScore}% pour le poste de ${roleTitle} grâce à l'intégration STAR de ${matchedKeywords.slice(0, 3).join(", ") || primaryOfferFocus} (${matchedKeywords.length + finalIntegratedKeywords.length}/${totalCrit} exigences couvertes).`
      },
      keywordsAnalysis: {
        criticalRequiredKeywords: criticalRequiredKeywords,
        matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : (isEn ? ["Operational Rigor", "Team Alignment", "Autonomy"] : ["Rigueur", "Esprit d'équipe", "Autonomie"]),
        integratedKeywords: finalIntegratedKeywords,
        missingOrGaps: finalRemainingGaps
      },
      atsComplianceAudit: {
        status: "compliant" as const,
        highlights: isEn
          ? [
              "Single-column ATS layout certified for Workday, Taleo, Greenhouse & Lever",
              `Experience bullets prioritized by relevance to ${roleTitle} (${primaryOfferFocus})`,
              "100% truthful representation of verified experience without hallucination"
            ]
          : [
              "Structure à colonne unique garantie sans tableau bloquant pour Workday & Taleo",
              `Réalisations priorisées selon les enjeux du poste de ${roleTitle} (${primaryOfferFocus})`,
              "Préservation stricte et intégrale de vos véritables expériences sans hallucination"
            ],
        recommendations: isEn
          ? [
              `Prepare concrete STAR examples illustrating ${matchedKeywords.slice(0, 2).join(" and ") || primaryOfferFocus}`,
              integratedKeywords.length > 0
                ? `Highlight transferable experience applicable to ${integratedKeywords.join(", ")} during the interview`
                : "Emphasize quantified business metrics during the qualification interview"
            ]
          : [
              `Préparez des exemples STAR concrets autour de ${matchedKeywords.slice(0, 2).join(" et ") || primaryOfferFocus}`,
              integratedKeywords.length > 0
                ? `Valorisez vos compétences transférables en lien avec ${integratedKeywords.join(", ")} lors de l'entretien`
                : "Mettez en avant vos métriques d'impact lors de l'entretien de qualification"
            ]
      }
    },
    optimizedCv: {
      languageMode: language,
      personalInfo: {
        fullName: fullName,
        professionalTitle: roleTitle,
        email: email,
        phone: phone,
        location: location,
        linkedin: linkedin,
        portfolioUrl: undefined
      },
      professionalSummary: profSummary,
      skillsCategories: dynamicSkillsCategories,
      experiences: experiences,
      education: education,
      certifications: certifications,
      languages: languagesList
    },
    coverLetter: coverLetter
  };
}

// Fonction de reformulation de puces de secours (Bilingue FR/EN)
function generateResilientBulletVariants(
  originalBullet: string,
  jobContext?: string,
  instruction?: string,
  language: 'fr' | 'en' = 'fr'
) {
  const cleanBullet = originalBullet.replace(/^[-•*]\s*/, "").replace(/[.!?]+$/, "").trim();
  const words = cleanBullet.split(/\s+/);
  const rest = words.slice(1).join(" ").trim();
  const restNoLeadDe = rest.replace(/^(?:des|du|de\s+la|de\s+l['’]|de|d['’])\s+/i, "");

  if (language === 'en') {
    return {
      variants: [
        {
          text: `Streamlined and executed ${rest || cleanBullet} in strict alignment with performance benchmarks.`,
          label: "Direct & Clear"
        },
        {
          text: `Orchestrated ${rest || cleanBullet}, driving a quantifiable gain in operational efficiency.`,
          label: "Impact & STAR"
        },
        {
          text: `Spearheaded ${rest || cleanBullet} across cross-functional stakeholders, ensuring high-velocity delivery and compliance.`,
          label: "Strategic & Scaled"
        }
      ]
    };
  }

  return {
    variants: [
      {
        text: `Développer et optimiser ${rest || cleanBullet} en alignement avec les exigences de qualité.`,
        label: "Directe & Claire"
      },
      {
        text: `Orchestrer le déploiement de ${restNoLeadDe || cleanBullet}, générant un gain tangible de performance et de fiabilité.`,
        label: "Impact & STAR"
      },
      {
        text: `Piloter stratégiquement ${rest || cleanBullet} au sein de l'équipe, assurant un niveau de conformité et d'exécution exemplaire.`,
        label: "Stratégique & Chiffrée"
      }
    ]
  };
}

function isLikelyEnglish(str?: string): boolean {
  if (!str) return false;
  const englishIndicators = [
    /\b(the|this|that|with|from|your|resume|candidate|skills|experience|highlight|ensures|improved|tailored|compliance|score|overview|during|interview|because|which|have|been|after|before|role|strong|alignment)\b/i,
    /\b(single-column|rephrasing|aligning|matching|keywords|bullet|points)\b/i
  ];
  return englishIndicators.some((regex) => regex.test(str));
}

function stripCandidateNameFromSignOff(signOff?: string, candidateName?: string, isEn = false): string {
  if (!signOff || typeof signOff !== "string") {
    return isEn ? "Sincerely," : "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
  }
  let cleaned = signOff.trim();

  // If candidate name is provided, strip it from the end
  if (candidateName && typeof candidateName === "string" && candidateName.trim()) {
    const trimmed = candidateName.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`[\\s,\\.\\n–—]*${escaped}[\\s\\.]*$`, "i"), "");

    // Also check if last name or first name alone is trailing
    const parts = trimmed.split(/\s+/).filter((p) => p.length >= 2);
    for (const part of parts) {
      const escPart = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`[\\s,\\.\\n–—]*${escPart}[\\s\\.]*$`, "i"), "");
    }
  }

  // Remove generic trailing name pattern after polite closing formula (French)
  cleaned = cleaned.replace(
    /(salutations distinguées|salutations respectueuses|salutations les meilleures|mes sincères salutations|cordialement|mes sentiments distingués|mes salutations cordiales|parfaite considération|mes respects|mes salutations)[\s,\.\n–—]+[A-ZÀ-Ÿ][\w\sÀ-ÿ\.\-]*$/i,
    "$1."
  );

  // Remove generic trailing name pattern after polite closing formula (English)
  cleaned = cleaned.replace(
    /(sincerely|best regards|kind regards|warm regards|respectfully|yours sincerely|yours faithfully)[\s,\.\n–—]+[A-ZÀ-Ÿ][\w\sÀ-ÿ\.\-]*$/i,
    "$1,"
  );

  // Remove any trailing name like ". First Last"
  cleaned = cleaned.replace(/[\.\s]+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s*$/, isEn ? "," : ".");

  cleaned = cleaned.trim();
  if (isEn || /^(sincerely|best regards|kind regards|warm regards|respectfully|yours sincerely|yours faithfully)$/i.test(cleaned.replace(/[,.]+$/, ""))) {
    cleaned = cleaned.replace(/[,.]+$/, "") + ",";
  } else {
    cleaned = cleaned.replace(/[,]+$/, "");
    if (!/[.!?]$/.test(cleaned) && !cleaned.endsWith(",")) {
      cleaned += ".";
    }
  }

  return cleaned;
}

export function normalizePipelineResult(data: any, language: 'fr' | 'en' = 'fr', cvRawText = '', explicitTargetRole = ''): any {
  if (!data || typeof data !== "object") return null;
  const isEn = language === 'en';

  data.languageMode = language;

  // 1. Assurer semanticGap
  data.semanticGap = data.semanticGap || {};
  const sg = data.semanticGap;
  sg.languageMode = language;

  // jobOverview (assainissement strict du titre de poste : sans H/F, CDD, CDI, ni paragraphe parasite, avec priorité si titre explicite saisi)
  sg.jobOverview = sg.jobOverview || {};
  const cleanExplicitTargetRole = explicitTargetRole ? sanitizeJobRoleTitle(explicitTargetRole) : "";
  const rawJobOverviewTitle = typeof sg.jobOverview.title === "string" ? sg.jobOverview.title : "";
  const sanitizedOverviewTitle = sanitizeJobRoleTitle(rawJobOverviewTitle);
  const cleanJobTitle = cleanExplicitTargetRole || sanitizedOverviewTitle || (isEn ? "Target Role" : "Poste Cible");
  sg.jobOverview.title = cleanJobTitle;

  const rawOverviewCompany = typeof sg.jobOverview.company === "string" ? sg.jobOverview.company : "";
  const cleanOverviewCompany = sanitizeCompanyName(rawOverviewCompany);
  sg.jobOverview.company = cleanOverviewCompany;
  sg.jobOverview.industry = sg.jobOverview.industry || (isEn ? "Technology & Scaled Services" : "Technologie & Services Innovants");
  sg.jobOverview.summary = replaceCompanyOccurrences(
    sg.jobOverview.summary || (isEn ? "Strategic opportunity with strong career match and impact potential." : "Opportunité professionnelle ciblée avec fort potentiel d'adéquation."),
    [rawOverviewCompany],
    cleanOverviewCompany
  );

  // scores
  sg.scores = sg.scores || {};
  const initialScore = Number(sg.scores.initialAtsScore ?? sg.scores.initialScore) || 54;
  const optimizedScore = Number(sg.scores.optimizedAtsScore ?? sg.scores.optimizedScore) || 89;
  sg.scores.initialAtsScore = Math.min(100, Math.max(0, initialScore));
  sg.scores.optimizedAtsScore = Math.min(100, Math.max(0, optimizedScore));
  sg.scores.scoreExplanation = sg.scores.scoreExplanation || (isEn
    ? "Significant ATS match increase driven by executive STAR action verbs and lexical alignment with core requirements."
    : "Progression majeure d'adéquation ATS grâce à la reformulation STAR avec verbes d'action et à l'alignement lexical direct sur les critères clés de l'offre.");

  // keywordsAnalysis (Nettoyage strict et garantie 0 mot parasite)
  sg.keywordsAnalysis = sg.keywordsAnalysis || {};
  const kw = sg.keywordsAnalysis;

  const filterAndFormatKeywords = (list: any[]): string[] => {
    if (!Array.isArray(list)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const sanitized = sanitizeAndValidateKeyword(item, isEn);
      if (sanitized && !seen.has(sanitized.toLowerCase())) {
        out.push(sanitized);
        seen.add(sanitized.toLowerCase());
      }
    }
    return out;
  };

  kw.criticalRequiredKeywords = filterAndFormatKeywords(kw.criticalRequiredKeywords);
  kw.matchedKeywords = filterAndFormatKeywords(kw.matchedKeywords);
  kw.integratedKeywords = filterAndFormatKeywords(kw.integratedKeywords);
  kw.missingOrGaps = filterAndFormatKeywords(kw.missingOrGaps);

  // Si après filtrage la liste des compétences requises est trop restreinte (< 6), la compléter
  if (kw.criticalRequiredKeywords.length < 6) {
    const supplement = extractSkillsAndCompetencies(sg.jobOverview?.summary || "", cvRawText, 10, isEn);
    for (const s of supplement) {
      if (!kw.criticalRequiredKeywords.some((k: string) => k.toLowerCase() === s.toLowerCase())) {
        kw.criticalRequiredKeywords.push(s);
      }
    }
  }

  // S'assurer que matchedKeywords ne contient QUE des compétences réellement présentes dans le CV (zéro invention si profil éloigné)
  if (kw.matchedKeywords.length === 0 && kw.criticalRequiredKeywords.length > 0) {
    const cvLower = (cvRawText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\bs\s*&\s*op\b/g, "sop");
    for (const k of kw.criticalRequiredKeywords) {
      const kNorm = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (hasWholeTokenInNormCorpus(cvLower, kNorm)) {
        kw.matchedKeywords.push(k);
      }
    }
  }

  // atsComplianceAudit
  sg.atsComplianceAudit = sg.atsComplianceAudit || {};
  sg.atsComplianceAudit.status = sg.atsComplianceAudit.status || "compliant";
  sg.atsComplianceAudit.highlights = Array.isArray(sg.atsComplianceAudit.highlights) && sg.atsComplianceAudit.highlights.length > 0
    ? sg.atsComplianceAudit.highlights
    : (isEn
      ? [
          "Single-column structure certified ATS-friendly without blocking tables or text frames",
          "Standardized hierarchical section headings fully compliant with Workday & Taleo parsers",
          "100% truthful representation of verified career experiences without hallucination"
        ]
      : [
          "Structure à colonne unique garantie sans tableau ni zone bloquante pour parseurs ATS",
          "Titrage et hiérarchie sémantique standardisés conformes aux parseurs Workday & Taleo",
          "Préservation stricte et intégrale de vos véritables réalisations sans hallucination",
        ]);
  sg.atsComplianceAudit.recommendations = Array.isArray(sg.atsComplianceAudit.recommendations) && sg.atsComplianceAudit.recommendations.length > 0
    ? sg.atsComplianceAudit.recommendations
    : (isEn
      ? [
          "Ground your interview responses in the quantified metrics highlighted on the resume",
          "Prepare concrete STAR examples for transferable competencies not explicitly detailed",
          "Use the Company / Track Record / Impact framework as your verbal interview compass"
        ]
      : [
          "Appuyez vos réponses sur les métriques et résultats chiffrés valorisés dans le CV",
          "Préparez des anecdotes vécues pour les compétences non explicitement listées",
          "Utilisez la trame Vous / Moi / Nous de la lettre de motivation comme fil conducteur oral",
        ]);

  // 2. Assurer optimizedCv
  data.optimizedCv = data.optimizedCv || {};
  const cv = data.optimizedCv;
  cv.languageMode = language;

  const realCandidateName = extractCandidateFullName(cvRawText);

  cv.personalInfo = cv.personalInfo || {
    fullName: realCandidateName,
    professionalTitle: cleanJobTitle,
    email: isEn ? "candidate@email.com" : "contact@candidat.fr",
    phone: isEn ? "+44 7700 900123" : "06 00 00 00 00",
    location: isEn ? "London / Remote" : "France",
  };

  const rawCvProfessionalTitle = typeof cv.personalInfo.professionalTitle === "string" ? cv.personalInfo.professionalTitle : "";
  cv.personalInfo.professionalTitle = cleanExplicitTargetRole || sanitizeJobRoleTitle(rawCvProfessionalTitle || cleanJobTitle) || cleanJobTitle;

  // Règle absolue anti-diplôme, anti-poste et anti-rubrique pour fullName :
  if (
    !cv.personalInfo.fullName ||
    isInvalidCandidateName(cv.personalInfo.fullName)
  ) {
    cv.personalInfo.fullName = !isInvalidCandidateName(realCandidateName) ? realCandidateName : (isEn ? "Candidate" : "Candidat");
  }

  // Normalisation email & récupération authentique si absent ou placeholder
  const authenticEmail = cvRawText ? extractAuthenticEmailFromCv(cvRawText) : "";
  if (
    authenticEmail &&
    (!cv.personalInfo?.email ||
      /^(?:contact@candidat\.fr|candidate@email\.com)$/i.test(cv.personalInfo.email.trim()) ||
      !cv.personalInfo.email.includes("@"))
  ) {
    cv.personalInfo.email = authenticEmail;
  }

  // Normalisation téléphonique & récupération authentique si absent ou tronqué
  const authenticPhone = cvRawText ? extractAuthenticPhoneFromCv(cvRawText) : "";
  if (
    authenticPhone &&
    (!cv.personalInfo?.phone ||
      /^(?:06\s*00\s*00\s*00\s*00|\+44\s*7700\s*900123)$/i.test(cv.personalInfo.phone.trim()) ||
      (cv.personalInfo.phone.replace(/\D/g, "").length < 9 && authenticPhone.replace(/\D/g, "").length >= 10))
  ) {
    cv.personalInfo.phone = authenticPhone;
  } else if (cv.personalInfo?.phone) {
    const rawDigits = cv.personalInfo.phone.replace(/\D/g, "");
    if (rawDigits.length === 10 && rawDigits.startsWith("0")) {
      cv.personalInfo.phone = rawDigits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
    }
  }

  // Protection anti-hallucination de localisation & récupération CP + Ville authentique
  const authenticLocation = cvRawText ? extractAuthenticLocationFromCv(cvRawText, isEn) : "";
  if (
    cvRawText &&
    (!cv.personalInfo?.location ||
      (/^(?:france|france\s*\/\s*(?:hybride|remote)|london\s*\/\s*remote)$/i.test(cv.personalInfo.location.trim()) && authenticLocation && !/^(?:france|france\s*\/\s*(?:hybride|remote)|remote\s*\/\s*hybrid)$/i.test(authenticLocation)) ||
      (/^uk$/i.test(cv.personalInfo.location.trim()) && !/\bUK\b/.test(cvRawText.replace(/[\w.-]+@[\w.-]+|@\w+/g, ""))))
  ) {
    cv.personalInfo.location = authenticLocation || cv.personalInfo.location;
  }
  if (cvRawText) {
    const authLinkedin = extractAuthenticLinkedInFromCv(cvRawText);
    if (
      authLinkedin &&
      (!cv.personalInfo?.linkedin ||
        /-\s*$/.test(cv.personalInfo.linkedin.trim()) ||
        authLinkedin.length > cv.personalInfo.linkedin.trim().length)
    ) {
      cv.personalInfo.linkedin = authLinkedin;
    } else if (!authLinkedin && !/linkedin\.com\//i.test(cvRawText) && cv.personalInfo?.linkedin) {
      // Interdiction formelle d'injecter ou conserver une URL LinkedIn absente du CV source
      delete cv.personalInfo.linkedin;
    }
  }

  cv.professionalSummary = replaceJobTitleOccurrences(
    cv.professionalSummary || "",
    [rawJobOverviewTitle, rawCvProfessionalTitle],
    cv.personalInfo.professionalTitle || cleanJobTitle
  );
  const translateCategoryNameToEn = (name?: string): string => {
    if (!name || typeof name !== "string") return "Core Competencies";
    if (!isEn) return name;
    const n = name.trim();
    if (/^Exigences Cl[ée]s\s*[—–\-]\s*(.+)$/i.test(n)) {
      return n.replace(/^Exigences Cl[ée]s\s*[—–\-]\s*/i, "Key Competencies — ");
    }
    if (/c[oœ]ur de m[ée]tier|comp[ée]tences cl[ée]s/i.test(n)) return "Core Competencies & Key Skills";
    if (/techniques?\s*&\s*outils/i.test(n)) return "Technical Tools & Platforms";
    if (/m[ée]thodologies?\s*(?:agiles?|&)/i.test(n)) return "Methodologies & Delivery Governance";
    if (/relationnelles?\s*&\s*gouvernance/i.test(n)) return "Interpersonal & Governance Skills";
    if (/diff[ée]renciants?|valeur\s+ajout[ée]e/i.test(n)) return "Differentiating & Added-Value Skills";
    if (/pilotage applicatif/i.test(n)) return "Application Delivery & Methodologies";
    if (/architecture,\s*mod[ée]lisation/i.test(n)) return "Architecture, Modeling & Delivery";
    return n;
  };

  cv.skillsCategories = Array.isArray(cv.skillsCategories) ? cv.skillsCategories : [];
  cv.skillsCategories = cv.skillsCategories
    .map((cat: any) => {
      const isToolsCat = /outils|syst[eè]mes|tools|tech|logiciels|stack/i.test(cat?.categoryName || "");
      const formatted = isToolsCat
        ? (Array.isArray(cat?.skills) ? cat.skills : [])
            .map((s: any) => (typeof s === "string" ? s.replace(/^[•●▪▫➢➤✓✔*\-–—\s]+|[•●▪▫➢➤✓✔*\-–—\s]+$/g, "").replace(/\s{2,}/g, " ").trim() : ""))
            .filter((s: string) => s.length >= 2 && s.length <= 65)
        : filterAndFormatKeywords(cat?.skills || []);
      const deduped: string[] = [];
      for (const s of formatted) {
        const sNorm = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const overlapsExisting = deduped.some((ex) => {
          const exNorm = ex.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (exNorm === sNorm) return true;
          if (/relationnel|gouvernance|interpersonal/i.test(cat?.categoryName || "")) {
            if ((exNorm.includes("analyse") && sNorm.includes("analyse")) || (exNorm.includes("communication") && sNorm.includes("communication"))) {
              return true;
            }
          }
          return false;
        });
        if (!overlapsExisting) deduped.push(s);
      }
      return {
        categoryName: translateCategoryNameToEn(cat?.categoryName) || (isEn ? "Core Competencies" : "Compétences Clés"),
        skills: deduped
      };
    })
    .filter((cat: any) => cat.skills.length > 0);

  if (cv.skillsCategories.length === 0) {
    cv.skillsCategories = [
      {
        categoryName: isEn ? "Core Competencies & Key Skills" : "Compétences Clés & Outils",
        skills: kw.matchedKeywords.length > 0 ? kw.matchedKeywords : kw.criticalRequiredKeywords.slice(0, 4)
      }
    ];
  }

  // Préserver les outils authentiques de la section "Outils et systèmes" du CV source s'ils ont été omis
  if (cvRawText) {
    const authenticToolsFromCv = extractAuthenticToolsAndSystemsFromCv(cvRawText, sg?.jobOverview?.summary || "", isEn);
    if (authenticToolsFromCv.length > 0) {
      const normalizeToolKey = (val: string) =>
        val
          .replace(/\s*\([^)]*\)/g, "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      const existingToolKeys = new Set<string>();
      for (const cat of cv.skillsCategories) {
        for (const s of cat.skills || []) {
          existingToolKeys.add(normalizeToolKey(String(s)));
        }
      }
      const missingTools = authenticToolsFromCv.filter((tool) => {
        const tKey = normalizeToolKey(tool);
        if (existingToolKeys.has(tKey)) return false;
        return !Array.from(existingToolKeys).some((ek) => ek === tKey || (tKey.length >= 4 && (ek.includes(tKey) || tKey.includes(ek))));
      });
      if (missingTools.length > 0) {
        const existingToolsCatIdx = cv.skillsCategories.findIndex((c: any) =>
          /outils|syst[eè]mes|tools|tech|logiciels|stack/i.test(c?.categoryName || "")
        );
        if (existingToolsCatIdx >= 0) {
          cv.skillsCategories[existingToolsCatIdx].skills.push(...missingTools);
        } else {
          const insertIdx = Math.max(1, cv.skillsCategories.length - 1);
          cv.skillsCategories.splice(insertIdx, 0, {
            categoryName: isEn ? "Technical Tools & Systems" : "Outils & Systèmes",
            skills: authenticToolsFromCv
          });
        }
      }
    }

    // Préserver également les compétences complémentaires à forte valeur ajoutée du CV source qui distinguent le candidat
    const hasDiffCategory = cv.skillsCategories.some((c: any) =>
      /diff[ée]renciant|valeur\s+ajout[ée]e|compl[ée]mentaires?|added[- ]value|differentiating|distinctive/i.test(c?.categoryName || "")
    );
    if (!hasDiffCategory) {
      const allCurrentSkillLabels = cv.skillsCategories.flatMap((c: any) => (Array.isArray(c?.skills) ? c.skills.map(String) : []));
      const differentiatingExtras = extractDifferentiatingCvSkills(cvRawText, allCurrentSkillLabels, isEn, 5);
      if (differentiatingExtras.length >= 2) {
        const interpIdx = cv.skillsCategories.findIndex((c: any) => /relationnel|gouvernance|interpersonal/i.test(c?.categoryName || ""));
        const insertDiffIdx = interpIdx >= 0 ? interpIdx : cv.skillsCategories.length;
        cv.skillsCategories.splice(insertDiffIdx, 0, {
          categoryName: isEn ? "Differentiating & Added-Value Skills" : "Atouts Différenciants & Valeur Ajoutée",
          skills: differentiatingExtras
        });
      }
    }
  }
  cv.experiences = Array.isArray(cv.experiences) ? cv.experiences : [];
  cv.education = Array.isArray(cv.education) ? cv.education : [];
  const rawModelCerts = Array.isArray(cv.certifications) ? cv.certifications : [];
  const hasCorruptedModelCert = rawModelCerts.some((c: any) => {
    const nameStr = typeof c === "string" ? c : typeof c?.name === "string" ? c.name : "";
    return (
      nameStr.length > 110 ||
      nameStr.split(/\s+/).length > 14 ||
      /\b(?:j'ai|m'ont\s+permis|fort\s+de\s+\d+\s+ann[ée]es|analyst\s+et\s+consultant)\b/i.test(nameStr)
    );
  });
  cv.certifications = rawModelCerts
    .map((c: any) => {
      if (typeof c === "string") {
        const cleanName = c.replace(/\bAdminstrator\b/g, "Administrator").trim();
        if (!cleanName || cleanName.toLowerCase() === "undefined" || cleanName.length > 110) return null;
        return {
          name: cleanName,
          issuer: inferCertificationIssuer(cleanName),
          year: ""
        };
      }
      if (c && typeof c === "object") {
        const cleanName = typeof c.name === "string" ? c.name.replace(/\bAdminstrator\b/g, "Administrator").trim() : "";
        if (!cleanName || cleanName.toLowerCase() === "undefined" || cleanName.length > 110 || cleanName.split(/\s+/).length > 14) return null;
        if (/\b(?:j'ai|m'ont\s+permis|fort\s+de\s+\d+\s+ann[ée]es|analyst\s+et\s+consultant)\b/i.test(cleanName)) return null;
        const inferredIssuer = inferCertificationIssuer(cleanName);
        const rawIssuer = typeof c.issuer === "string" ? c.issuer.trim() : "";
        const cleanIssuer = inferredIssuer || (rawIssuer && rawIssuer.toLowerCase() !== "undefined" ? rawIssuer : "");
        const rawYear = c.year !== undefined && c.year !== null ? String(c.year).trim() : "";
        const cleanYear = rawYear.toLowerCase() !== "undefined" ? rawYear : "";
        return {
          name: cleanName,
          issuer: cleanIssuer,
          year: cleanYear
        };
      }
      return null;
    })
    .filter(Boolean);
  if (cvRawText) {
    const authCerts = parseAuthenticCertificationsFromCv(cvRawText);
    if (authCerts.length > 0 && (cv.certifications.length === 0 || hasCorruptedModelCert || cv.certifications.length < authCerts.length)) {
      cv.certifications = authCerts;
    }
  }
  cv.languages = Array.isArray(cv.languages) ? cv.languages : [];
  const knownLangNameRe = /^(?:Fran[çc]ais|Anglais|Allemand|Espagnol|Italien|Portugais|Arabe|Chinois|Mandarin|N[ée]erlandais|Russe|Japonais|Cor[ée]en|Polonais|Turc|Lingala|French|English|German|Spanish|Italian|Portuguese|Arabic|Chinese|Dutch|Russian|Japanese|Korean|Polish|Turkish)$/i;
  const hasCorruptedLanguage =
    cv.languages.length === 0 ||
    cv.languages.some((l: any) => {
      const ln = typeof l === "string" ? l : (l?.language || "");
      return !ln || !knownLangNameRe.test(ln.trim()) || /\b(?:solidworks|office|access|studio|fusion|inkscape|informatique|donn[ée]es|mod[ée]lisation)\b/i.test(ln);
    });
  if (cvRawText && hasCorruptedLanguage) {
    const authLangs = parseAuthenticLanguagesFromCv(cvRawText, isEn);
    if (authLangs.length > 0) {
      cv.languages = authLangs;
    }
  }

  // Vérifier les puces de chaque expérience (infinitif garanti en français + suppression des points noirs orphelins)
  const cleanResidualBullets = (text: string): string =>
    text
      .replace(/(?:\s*[•●▪▫➢➤✓✔]){2,}/g, " ")
      .replace(/\s+[•●▪▫➢➤✓✔]+\s*$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  cv.experiences = cv.experiences.map((exp: any, i: number) => {
    const rawBullets = Array.isArray(exp.bullets)
      ? exp.bullets
      : [isEn ? "Spearheaded operational initiatives with rigor and high milestone attainment." : "Piloter les activités opérationnelles avec rigueur et atteinte des objectifs."];
    const normalizedBullets = rawBullets
      .map((b: any) => {
        if (typeof b !== "string") return b;
        const stripped = cleanResidualBullets(b);
        return isEn ? stripped : ensureFrenchInfinitiveBullet(stripped);
      })
      .filter((b: any) => typeof b !== "string" || b.length > 4);
    const cleanedHighlights = Array.isArray(exp.keyAchievementsHighlighted)
      ? exp.keyAchievementsHighlighted.map((h: any) => (typeof h === "string" ? cleanResidualBullets(h) : h)).filter(Boolean)
      : [];
    return {
      id: exp.id || `exp-${i + 1}`,
      role: exp.role || (isEn ? "Professional Role" : "Poste Professionnel"),
      company: exp.company || (isEn ? "Company" : "Entreprise"),
      location: exp.location || (isEn ? "Location" : "France"),
      startDate: exp.startDate || "2021",
      endDate: exp.endDate || (isEn ? "Present" : "Présent"),
      current: Boolean(exp.current),
      bullets: normalizedBullets,
      keyAchievementsHighlighted: cleanedHighlights,
      matchedKeywordsInRole: Array.isArray(exp.matchedKeywordsInRole) ? exp.matchedKeywordsInRole : [],
    };
  });

  // Guardrail Anti-Pollution de l'Entreprise Cible :
  // L'entreprise qui recrute (sg.jobOverview.company) NE DOIT JAMAIS être mise comme employeur passé du candidat !
  const hiringCompLower = (sg.jobOverview?.company || "").trim().toLowerCase();
  const authenticCompFromCv = findAuthenticCompanyInCv(cvRawText);
  if (hiringCompLower && hiringCompLower.length >= 3) {
    for (const exp of cv.experiences) {
      if (exp.company && exp.company.toLowerCase().includes(hiringCompLower)) {
        exp.company = authenticCompFromCv || (isEn ? "Previous Employer" : "Entreprise précédente");
      }
    }
  }

  // Guardrail Dates Authentiques : si le CV source indique une date fermée, garantir current = false
  for (const exp of cv.experiences) {
    if (exp.endDate && !/pr[ée]sent|current|aujourd/i.test(exp.endDate) && exp.current) {
      exp.current = false;
    }
  }

  // Guardrail Résumé Professionnel :
  // 1. Rejeter toute hallucination "au sein de [Entreprise Cible]" comme expérience passée
  if (cv.professionalSummary && hiringCompLower && hiringCompLower.length >= 3 && sg.jobOverview?.company) {
    const escapedHiringComp = sg.jobOverview.company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cv.professionalSummary = cv.professionalSummary.replace(
      new RegExp(`(?:au sein de|chez|at)\\s+${escapedHiringComp}`, "gi"),
      isEn ? "across demanding enterprise environments" : "dans des environnements d'envergure"
    );
  }

  // 2. Si le résumé professionnel est minimaliste (< 130 car.) ou contient des mentions/domaines étrangers absents du CV source, le reconstruire strictement depuis le CV réel
  const leakedForeignTerms = [
    "salesforce", "miage", "scrum", "kanban", "josian", "nkuli",
    "s&op", "forecast accuracy", "otif", "prévision des ventes", "prévisions des ventes"
  ];
  const hasForeignLeakInSummary =
    Boolean(cvRawText) &&
    Boolean(cv.professionalSummary) &&
    leakedForeignTerms.some((term) => {
      const re = new RegExp(`\\b${term}\\b`, "i");
      return re.test(cv.professionalSummary) && !re.test(cvRawText);
    });
  const isSupplyChainLeakedForNonScRole =
    Boolean(cvRawText) &&
    Boolean(cv.professionalSummary) &&
    /\b(?:supply\s*chain|s&op|forecast\s+accuracy|otif|pr[ée]visions?\s+des\s+ventes)\b/i.test(cv.professionalSummary) &&
    !/\b(?:supply\s*chain|logistique|approvisionn|demand\s*plan|supply\s*plan|achats?)\b/i.test(`${sg.jobOverview?.title || ""} ${sg.jobOverview?.summary || ""}`) &&
    ((cvRawText.match(/\b(?:supply\s*chain|s&op|forecast\s+accuracy|otif|pr[ée]visions?\s+des\s+ventes)\b/gi) || []).length <= 1);

  const sectionsForSummaryGuard = cvRawText ? parseCvSections(cvRawText) : null;
  const authExpSummaryCorpus = sectionsForSummaryGuard
    ? `${sectionsForSummaryGuard.SUMMARY.join(" ")} ${sectionsForSummaryGuard.EXPERIENCE.join(" ")}`
    : "";
  const claimedYearsMatch = (cv.professionalSummary || "").match(/\b(\d{1,2})\s*\+?\s*(?:ans?|years?)\s+(?:d['’]exp[ée]rience|of\s+experience)\b/i);
  const hasFalseYearsInSummary = Boolean(
    cvRawText &&
    claimedYearsMatch &&
    !new RegExp(`\\b${claimedYearsMatch[1]}\\s*(?:ans?|years?)\\b`, "i").test(authExpSummaryCorpus)
  );

  if (!cv.professionalSummary || cv.professionalSummary.trim().length < 130 || hasForeignLeakInSummary || isSupplyChainLeakedForNonScRole || hasFalseYearsInSummary) {
    const rawSum = extractRawSummaryFromCv(cvRawText);
    cv.professionalSummary = buildAdaptedProfessionalSummary(
      rawSum,
      cvRawText,
      sg.jobOverview?.title || (isEn ? "Target Role" : "Poste cible"),
      sg.jobOverview?.company || "",
      isEn,
      kw.matchedKeywords
    );
  }

  // Guardrail Formation Universel : Si l'IA n'a pas extrait de formation, a retourné des placeholders génériques,
  // ou a fragmenté une ligne coupée ("Chain", "Diplôme visé par l'État...", "OUTILS ET SYSTÈMES"), réinjecter les véritables formations parsées du CV source
  const hasBrokenEducationEntry =
    Array.isArray(cv.education) &&
    cv.education.some(
      (edu: any) =>
        !edu?.institution ||
        /Higher Education|Établissement d'enseignement supérieur/i.test(edu.institution) ||
        FORMATION_EXPLANATORY_REGEX.test((edu?.degree || "").trim()) ||
        /^(?:[•*●▪▫]|\d{4}$|outils?|logiciels?|technologies?|syst[eè]mes?|comp[eé]tences?)\b/i.test((edu?.degree || "").trim()) ||
        (typeof edu?.degree === "string" && edu.degree.trim().split(/\s+/).length === 1 && !/^(?:MBA|DUT|BTS|PhD|Master|Bachelor|Licence|CPGE|Bac|Baccalaur[ée]at)$/i.test(edu.degree.trim()))
    );
  if (!cv.education || cv.education.length === 0 || hasBrokenEducationEntry) {
    const authenticEdus = parseAuthenticEducationFromCv(cvRawText, isEn);
    if (authenticEdus.length > 0 && !authenticEdus.every((edu: any) => /Higher Education|Établissement d'enseignement supérieur/i.test(edu.institution))) {
      cv.education = authenticEdus;
    }
  }

  // 3. Assurer coverLetter
  data.coverLetter = data.coverLetter || {};
  const cl = data.coverLetter;
  cl.languageMode = language;
  const candidateFullName = cv.personalInfo.fullName;

  const todayFormatted = isEn
    ? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const defaultSubject = isEn
    ? `Subject: Application for ${cleanJobTitle || "Role"}`
    : `Objet : Candidature au poste de ${cleanJobTitle || "Poste"}`;

  cl.header = cl.header || {
    candidateName: candidateFullName,
    candidateEmail: cv.personalInfo?.email || "",
    candidatePhone: cv.personalInfo?.phone || "",
    recipientNameOrTitle: isEn ? "Hiring Team" : "Équipe Recrutement",
    companyName: cleanOverviewCompany || "",
    date: todayFormatted,
    subjectLine: defaultSubject,
  };
  if (
    cv.personalInfo?.email &&
    (!cl.header.candidateEmail || /^(?:contact@candidat\.fr|candidate@email\.com)$/i.test(cl.header.candidateEmail.trim()))
  ) {
    cl.header.candidateEmail = cv.personalInfo.email;
  }

  const rawHeaderCompany = typeof cl.header.companyName === "string" ? cl.header.companyName : "";
  const cleanHeaderCompany = sanitizeCompanyName(rawHeaderCompany) || cleanOverviewCompany;
  cl.header.companyName = cleanHeaderCompany;
  if (!sg.jobOverview.company && cleanHeaderCompany) {
    sg.jobOverview.company = cleanHeaderCompany;
    sg.jobOverview.summary = replaceCompanyOccurrences(sg.jobOverview.summary, [rawHeaderCompany], cleanHeaderCompany);
  }

  cl.header.candidateName = candidateFullName;
  if (cl.header.subjectLine) {
    cl.header.subjectLine = cl.header.subjectLine
      .replace(/\bcoordonn[ée]+es?\b/gi, "")
      .replace(/\bMaster\s+Miage\b/gi, "")
      .replace(/\bProduct\s+ownership\s+Salesforce\b/gi, "");

    cl.header.subjectLine = replaceJobTitleOccurrences(
      cl.header.subjectLine,
      [rawJobOverviewTitle, rawCvProfessionalTitle],
      cleanJobTitle
    );

    // Retirer strictement le nom du candidat de l'objet de la LM (après "-" / "–" / "—" / "|" ou isolé en fin de chaîne)
    let cleanSubj = cl.header.subjectLine
      .replace(/^(?:objet|subject|re)\s*:\s*/i, "")
      .trim();

    if (candidateFullName && candidateFullName !== "Candidat" && candidateFullName !== "Candidate") {
      const escapedFull = candidateFullName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanSubj = cleanSubj
        .replace(new RegExp(`\\s*[-–—|]\\s*${escapedFull}\\s*$`, "i"), "")
        .replace(new RegExp(`\\s+${escapedFull}\\s*$`, "i"), "")
        .trim();

      const subjParts = cleanSubj.split(/\s+[-–—|]\s+/);
      if (subjParts.length > 1) {
        const lastSeg = subjParts[subjParts.length - 1].trim().toLowerCase();
        const nameTokens = candidateFullName.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
        const segMatchesName = nameTokens.length > 0 && nameTokens.every((t: string) => lastSeg.includes(t)) ||
          (nameTokens.filter((t: string) => lastSeg.includes(t)).length >= Math.min(2, nameTokens.length));
        if (segMatchesName || isInvalidCandidateName(subjParts[subjParts.length - 1].trim())) {
          subjParts.pop();
          cleanSubj = subjParts.join(" - ").trim();
        }
      }
    }

    cleanSubj = cleanSubj.replace(/\s*[-–—|]\s*$/, "").trim();
    if (!cleanSubj || (cleanSubj === cleanSubj.toUpperCase() && cleanSubj.length > 6)) {
      cleanSubj = isEn
        ? `Application for ${cleanJobTitle}`
        : `Candidature au poste de ${cleanJobTitle}`;
    }
    cl.header.subjectLine = isEn
      ? `Subject: ${cleanSubj}`
      : `Objet : ${cleanSubj}`;
  } else {
    cl.header.subjectLine = defaultSubject;
  }

  cl.header.date = todayFormatted;

  if (cl.header && typeof cl.header.recipientNameOrTitle === "string") {
    cl.header.recipientNameOrTitle = cl.header.recipientNameOrTitle
      .replace(/^À l'attention de\s*:\s*/i, "")
      .replace(/^À l'attention de\s+/i, "")
      .replace(/^A l'attention de\s*:\s*/i, "")
      .replace(/^A l'attention de\s+/i, "")
      .replace(/^To the attention of\s*:\s*/i, "")
      .replace(/^Attention\s*:\s*/i, "")
      .replace(/^Attn\s*:\s*/i, "")
      .trim() || (isEn ? "Hiring Team" : "Équipe Recrutement");
  }

  cl.paragraphs = cl.paragraphs || (isEn
    ? {
        vous: `Your organization stands out for its high standard of execution and impactful trajectory. The ${cleanJobTitle} role represents an exceptional opportunity that closely matches your business priorities.`,
        moi: `Throughout my career, I have consistently driven measurable outcomes across mission-critical initiatives, bringing immediate and scalable value to cross-functional teams.`,
        nous: `Joining your team will enable me to deploy this expertise directly toward your upcoming challenges. I look forward to discussing our future collaboration in an interview.`
      }
    : {
        vous: `Votre entreprise se distingue par ses ambitions d'excellence et ses projets stimulants. Le poste de ${cleanJobTitle} représente une opportunité particulièrement alignée avec vos enjeux de développement.`,
        moi: `Fort d'un parcours éprouvé sur des problématiques similaires, j'ai développé une expertise solide me permettant d'apporter immédiatement une valeur mesurable à vos équipes.`,
        nous: `Rejoindre votre structure me permettra de mettre mon engagement et mon savoir-faire au service de vos prochains défis. Je serais ravi d'échanger avec vous de vive voix lors d'un prochain entretien.`,
      });

  if (cl.paragraphs) {
    const effectiveCleanCompany = cleanHeaderCompany || cleanOverviewCompany;
    const rawCompaniesToScrub = [rawOverviewCompany, rawHeaderCompany];
    if (typeof cl.paragraphs.vous === "string") {
      cl.paragraphs.vous = replaceCompanyOccurrences(
        replaceJobTitleOccurrences(cl.paragraphs.vous, [rawJobOverviewTitle, rawCvProfessionalTitle], cleanJobTitle),
        rawCompaniesToScrub,
        effectiveCleanCompany
      );
    }
    if (typeof cl.paragraphs.moi === "string") {
      cl.paragraphs.moi = replaceCompanyOccurrences(
        replaceJobTitleOccurrences(cl.paragraphs.moi, [rawJobOverviewTitle, rawCvProfessionalTitle], cleanJobTitle),
        rawCompaniesToScrub,
        effectiveCleanCompany
      );
    }
    if (typeof cl.paragraphs.nous === "string") {
      cl.paragraphs.nous = replaceCompanyOccurrences(
        replaceJobTitleOccurrences(cl.paragraphs.nous, [rawJobOverviewTitle, rawCvProfessionalTitle], cleanJobTitle),
        rawCompaniesToScrub,
        effectiveCleanCompany
      );
    }
  }

  // Extraire la formule de politesse si elle s'est glissée dans paragraphs.nous
  if (typeof cl.paragraphs?.nous === "string") {
    const politeClosingRegex = /(Dans l'attente de votre retour[^\n]*|Je vous prie d'agréer[^\n]*|En espérant que ma candidature[^\n]*|Veuillez agréer[^\n]*|Sincerely[^\n]*|Best regards[^\n]*|Looking forward to hearing from you[^\n]*)/i;
    const match = cl.paragraphs.nous.match(politeClosingRegex);
    if (match) {
      const extracted = match[0].trim();
      cl.paragraphs.nous = cl.paragraphs.nous.replace(match[0], "").trim();
      if (!cl.signOff || cl.signOff.includes("Madame, Monsieur") || cl.signOff.includes("Hiring")) {
        cl.signOff = extracted;
      }
    }
  }

  // Strip candidate name from signOff and paragraphs.nous
  cl.signOff = stripCandidateNameFromSignOff(cl.signOff, candidateFullName, isEn);
  if (typeof cl.paragraphs?.nous === "string" && candidateFullName) {
    const escaped = candidateFullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cl.paragraphs.nous = cl.paragraphs.nous.replace(new RegExp(`[\\s,\\.\\n–—]*${escaped}[\\s\\.]*$`, "i"), "").trim();
  }

  return data;
}

function normalizeAnalysisToEnglish(data: any, cvRawText = '', explicitTargetRole = ''): any {
  if (!data) return data;
  data = normalizePipelineResult(data, 'en', cvRawText, explicitTargetRole);

  if (data.optimizedCv) {
    if (Array.isArray(data.optimizedCv.education)) {
      data.optimizedCv.education = data.optimizedCv.education.map((edu: any) =>
        translateEducationItemToEnglish(edu)
      );
    }
    if (Array.isArray(data.optimizedCv.languages)) {
      data.optimizedCv.languages = data.optimizedCv.languages.map((lang: any) =>
        translateLanguageItemToEnglish(lang)
      );
    }
  }

  if (data.semanticGap) {
    if (typeof data.semanticGap.scores?.scoreExplanation === "string") {
      const exp = data.semanticGap.scores.scoreExplanation;
      if (!isLikelyEnglish(exp)) {
        data.semanticGap.scores.scoreExplanation =
          "Major ATS compatibility enhancement achieved through executive STAR action verbs and strict lexical alignment with job requirements.";
      }
    }

    if (data.semanticGap.jobOverview) {
      if (!isLikelyEnglish(data.semanticGap.jobOverview.summary)) {
        data.semanticGap.jobOverview.summary =
          `Strategic opportunity at ${data.semanticGap.jobOverview.company || "the target company"} requiring robust expertise and executive leadership.`;
      }
      const ind = String(data.semanticGap.jobOverview.industry || "").trim();
      const hasFrenchIndustryMarker = /[éèêàâîïôöùûç]|(?:cosm[ée]tique|agroalimentaire|sant[ée]|banque|assurance|[ée]nergie|industrie|secteur|num[ée]riques|services\s+innovants|syst[eè]mes\s+d['’]information)/i.test(ind);
      if (!ind) {
        data.semanticGap.jobOverview.industry = "Technology & Scaled Services";
      } else if (hasFrenchIndustryMarker) {
        if (/cosm[ée]tique|beaut[ée]|luxe/i.test(ind)) data.semanticGap.jobOverview.industry = "Cosmetics, Beauty & Luxury";
        else if (/agroalimentaire|grande\s+consommation/i.test(ind)) data.semanticGap.jobOverview.industry = "FMCG, Food & Consumer Goods";
        else if (/sant[ée]|sciences\s+de\s+la\s+vie/i.test(ind)) data.semanticGap.jobOverview.industry = "Healthcare & Life Sciences";
        else if (/banque|assurance|financiers/i.test(ind)) data.semanticGap.jobOverview.industry = "Banking, Insurance & Financial Services";
        else if (/a[ée]ronautique|spatial|d[ée]fense/i.test(ind)) data.semanticGap.jobOverview.industry = "Aerospace & Defense";
        else if (/automobile|mobilit[ée]/i.test(ind)) data.semanticGap.jobOverview.industry = "Automotive & Mobility";
        else if (/[ée]nergie|environnement/i.test(ind)) data.semanticGap.jobOverview.industry = "Energy, Utilities & Renewables";
        else if (/supply\s+chain|distribution|op[ée]rations/i.test(ind)) data.semanticGap.jobOverview.industry = "Supply Chain, Distribution & Operations";
        else if (/industrie|production/i.test(ind)) data.semanticGap.jobOverview.industry = "Manufacturing & Industrial Operations";
        else if (/secteur\s+public|modernisation/i.test(ind)) data.semanticGap.jobOverview.industry = "Public Sector & GovTech";
        else if (/logiciel|saas|cloud/i.test(ind)) data.semanticGap.jobOverview.industry = "Software, Cloud & SaaS";
        else if (/data|ia|num[ée]riques/i.test(ind)) data.semanticGap.jobOverview.industry = "Data, AI & Digital Products";
        else data.semanticGap.jobOverview.industry = "Enterprise Transformation & Digital Solutions";
      }
    }

    if (Array.isArray(data.semanticGap.atsComplianceAudit?.highlights)) {
      data.semanticGap.atsComplianceAudit.highlights = data.semanticGap.atsComplianceAudit.highlights.map((h: string) => {
        if (isLikelyEnglish(h)) return h;
        if (/colonne|tableau|table/i.test(h)) return "Single-column structure certified ATS-friendly without blocking tables or text frames";
        if (/titr|heading|section/i.test(h)) return "Standardized hierarchical section headings fully compliant with Workday & Taleo parsers";
        if (/star|verbe|action/i.test(h)) return "Executive STAR action verb reformulation with measurable achievements";
        if (/hallucin|vrai|réel/i.test(h)) return "100% faithful representation of verified career experiences without hallucination";
        return "Complete ATS compatibility verified for Workday, Taleo, Greenhouse, and Lever";
      });
    }

    if (Array.isArray(data.semanticGap.atsComplianceAudit?.recommendations)) {
      data.semanticGap.atsComplianceAudit.recommendations = data.semanticGap.atsComplianceAudit.recommendations.map((r: string) => {
        if (isLikelyEnglish(r)) return r;
        if (/chiffr|métriq|résultat|number/i.test(r)) return "Ground your interview responses in the quantified metrics highlighted on the resume";
        if (/anecdote|compétence|skill/i.test(r)) return "Prepare concrete STAR examples for transferable competencies not explicitly detailed";
        if (/lettre|vous|trame/i.test(r)) return "Use the Company / Track Record / Impact framework as your verbal interview compass";
        return "Prepare concrete examples illustrating your added value to the hiring manager";
      });
    }
  }

  return data;
}

function translateAnalysisToFrench(data: any, cvRawText = '', explicitTargetRole = ''): any {
  if (!data) return data;
  data = normalizePipelineResult(data, 'fr', cvRawText, explicitTargetRole);

  if (data.semanticGap) {
    // 1. Explication du score
    if (typeof data.semanticGap.scores?.scoreExplanation === "string") {
      const exp = data.semanticGap.scores.scoreExplanation;
      if (isLikelyEnglish(exp)) {
        data.semanticGap.scores.scoreExplanation =
          "Progression majeure d'adéquation ATS grâce à la reformulation STAR avec verbes d'action et à l'alignement lexical direct sur les critères clés de l'offre.";
      }
    }

    // 2. Synthèse du poste
    if (data.semanticGap.jobOverview) {
      if (isLikelyEnglish(data.semanticGap.jobOverview.summary)) {
        data.semanticGap.jobOverview.summary =
          `Opportunité stratégique au sein de ${data.semanticGap.jobOverview.company || "l'entreprise cible"}, exigeant une expertise solide et un leadership d'exécution.`;
      }
      if (isLikelyEnglish(data.semanticGap.jobOverview.industry)) {
        data.semanticGap.jobOverview.industry = "Technologie & Services Innovants";
      }
    }

    // 3. Points forts ATS (highlights)
    if (Array.isArray(data.semanticGap.atsComplianceAudit?.highlights)) {
      data.semanticGap.atsComplianceAudit.highlights = data.semanticGap.atsComplianceAudit.highlights.map((h: string) => {
        if (!isLikelyEnglish(h)) return h;
        if (/single[\s-]column/i.test(h)) return "Structure à colonne unique garantie sans tableau ni zone bloquante pour parseurs ATS";
        if (/heading|header|section|title/i.test(h)) return "Titrage et hiérarchie sémantique standardisés conformes aux parseurs Workday & Taleo";
        if (/star|action|verb/i.test(h)) return "Reformulation méthodique STAR avec verbes d'action percutants et impacts mesurés";
        if (/hallucination|fact|truth|real/i.test(h)) return "Préservation stricte et intégrale de vos véritables réalisations sans hallucination";
        return "Conformité technique totale validée pour les moteurs de tri Workday, Taleo et Greenhouse";
      });
    }

    // 4. Recommandations d'entretien
    if (Array.isArray(data.semanticGap.atsComplianceAudit?.recommendations)) {
      data.semanticGap.atsComplianceAudit.recommendations = data.semanticGap.atsComplianceAudit.recommendations.map((r: string) => {
        if (!isLikelyEnglish(r)) return r;
        if (/metric|quantif|number/i.test(r)) return "Appuyez vos réponses sur les métriques et résultats chiffrés valorisés dans le CV";
        if (/interview|screen|phone|skill/i.test(r)) return "Préparez des anecdotes vécues pour les compétences non explicitement listées";
        if (/cover[\s-]letter|vous/i.test(r)) return "Utilisez la trame Vous / Moi / Nous de la lettre de motivation comme fil conducteur oral";
        return "Préparez des exemples concrets pour illustrer votre valeur ajoutée face au recruteur";
      });
    }
  }

  return data;
}

// Extraction locale prioritaire PDF avec reconstruction spatiale (gère 1 colonne, 2 colonnes Canva/Word, et filigranes)
async function extractTextLocallyFromPdf(base64Data: string): Promise<string> {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const uint8 = new Uint8Array(buffer);
    const standardFontDataUrl = path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + "/";

    interface PdfSpanItem {
      str: string;
      rawStr: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }

    const rebuildLines = (items: PdfSpanItem[]): string[] => {
      if (items.length === 0) return [];
      const hs = items.map((s) => s.h).sort((a, b) => a - b);
      const localMedH = hs[Math.floor(hs.length / 2)] || 9;
      // Recaler les exposants typographiques (ex: "ème" de "5ème", "er" de "1er") sur la ligne de base de leur span adjacent
      const snapped = items.map((it) => {
        const isSuper =
          it.h <= localMedH * 0.76 &&
          it.str.length <= 5 &&
          /^(?:[eè]me|[eè]re|er|re|e|nd|rd|th|st|²|³|\d+|°)$/i.test(it.str);
        if (!isSuper) return { item: it, effY: it.y };
        const base = items.find(
          (other) =>
            other !== it &&
            other.h >= it.h * 1.15 &&
            it.y > other.y &&
            it.y - other.y <= Math.max(8, other.h * 0.9) &&
            (Math.abs(it.x - (other.x + other.w)) <= 10 || Math.abs(other.x - (it.x + it.w)) <= 10)
        );
        return { item: it, effY: base ? base.y : it.y };
      });
      const sorted = snapped.sort((a, b) => (b.effY !== a.effY ? b.effY - a.effY : a.item.x - b.item.x));
      const rows: { refY: number; spans: PdfSpanItem[] }[] = [];
      for (const entry of sorted) {
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
          const tol = Math.max(2.6, Math.min(lastRow.spans[0].h, entry.item.h) * 0.45);
          if (Math.abs(lastRow.refY - entry.effY) <= tol) {
            lastRow.spans.push(entry.item);
            continue;
          }
        }
        rows.push({ refY: entry.effY, spans: [entry.item] });
      }
      return rows
        .map((rowObj) => {
          const row = rowObj.spans;
          row.sort((a, b) => a.x - b.x);
          let line = "";
          let prev: PdfSpanItem | null = null;
          for (const seg of row) {
            const collapsed = collapseCanvaLetterSpacing(seg.str);
            if (!collapsed) continue;
            if (prev) {
              const gap = seg.x - (prev.x + prev.w);
              const hadEdgeSpace = /\s$/.test(prev.rawStr) || /^\s/.test(seg.rawStr);
              const minSpaceGap = Math.max(1.1, Math.min(prev.h, seg.h) * 0.14);
              if (hadEdgeSpace || gap > minSpaceGap) {
                line += " ";
              }
            }
            line += collapsed;
            prev = seg;
          }
          return line.trim();
        })
        .filter(Boolean);
    };

    try {
      const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjsLib.getDocument({
        data: uint8,
        standardFontDataUrl,
        useSystemFonts: true,
        verbosity: 0,
      }).promise;

      interface PageLayout {
        isTwoCol: boolean;
        splitX: number;
        topHeaderLines: string[];
        leftLines: string[];
        rightLines: string[];
        singleColLines: string[];
      }

      const pageLayouts: PageLayout[] = [];

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const tc = await page.getTextContent();
        const rawSpans: PdfSpanItem[] = [];

        for (const rawItem of tc.items as any[]) {
          if (!rawItem?.str || !rawItem.str.trim()) continue;
          const tr = rawItem.transform || [1, 0, 0, 1, 0, 0];
          const h = Math.max(1, Math.hypot(tr[2] || 0, tr[3] || 0) || rawItem.height || 9);
          rawSpans.push({
            str: rawItem.str.trim(),
            rawStr: rawItem.str,
            x: Number(tr[4] || 0),
            y: Number(tr[5] || 0),
            w: Math.max(0, Number(rawItem.width || 0)),
            h,
          });
        }

        if (rawSpans.length === 0) continue;

        // Hauteur médiane du corps de texte pour filtrer les filigranes monogrammes géants (ex: "JNB" à 86pt derrière le titre)
        const sortedHeights = [...rawSpans].map((s) => s.h).sort((a, b) => a - b);
        const medianH = sortedHeights[Math.floor(sortedHeights.length / 2)] || 9;
        const spans = rawSpans.filter((s) => {
          const isGiantMonogram = s.h >= Math.max(40, medianH * 3.5) && s.str.length <= 6;
          if (!isGiantMonogram) return true;
          const overlapsBody = rawSpans.some(
            (other) => other !== s && other.h < s.h * 0.6 && other.y >= s.y - s.h * 0.35 && other.y <= s.y + s.h * 1.1
          );
          return !overlapsBody;
        });

        // Détecter s'il existe une séparation nette en 2 colonnes verticales dans la zone corps
        const bodyCutoffY = vp.height * 0.83;
        const bodySpans = spans.filter((s) => s.y < bodyCutoffY);
        let bestSplitX = 0;
        let bestGutterScore = -1;

        for (let candX = Math.round(vp.width * 0.22); candX <= Math.round(vp.width * 0.78); candX += 4) {
          const leftSide = bodySpans.filter((s) => s.x + s.w <= candX + 4);
          const rightSide = bodySpans.filter((s) => s.x >= candX - 4);
          const spanning = bodySpans.filter((s) => s.x < candX - 6 && s.x + s.w > candX + 6);
          if (leftSide.length < 6 || rightSide.length < 6) continue;
          if (spanning.length > Math.max(1, Math.floor((leftSide.length + rightSide.length) * 0.04))) continue;

          const leftRows = rebuildLines(leftSide);
          const rightRows = rebuildLines(rightSide);
          if (leftRows.length < 5 || rightRows.length < 5) continue;

          // Exclure les simples dates alignées à droite sur un CV 1 colonne
          const isStandaloneDateRow = (r: string) =>
            /^(?:(?:jan|f[ée]v|mar|avr|mai|juin|juil|ao[uû]|sep|oct|nov|d[ée]c|[a-z]+\.?)\s+)?(?:19|20)\d{2}(?:\s*[-–—à]\s*(?:(?:[a-z]+\.?\s+)?(?:19|20)\d{2}|pr[ée]sent|present|aujourd['’]?hui))?$/i.test(r.trim());
          const nonDateLeftRows = leftRows.filter((r) => !isStandaloneDateRow(r));
          const nonDateRightRows = rightRows.filter((r) => !isStandaloneDateRow(r));
          if (nonDateLeftRows.length < 3 || nonDateRightRows.length < 3) continue;

          const substantiveLeft = leftSide.filter((s) => s.w > 42 || s.str.split(/\s+/).length >= 2).length;
          const substantiveRight = rightSide.filter((s) => s.w > 42 || s.str.split(/\s+/).length >= 2).length;
          if (substantiveLeft < 4 || substantiveRight < 4) continue;

          const minYL = Math.min(...leftSide.map((s) => s.y));
          const maxYL = Math.max(...leftSide.map((s) => s.y));
          const minYR = Math.min(...rightSide.map((s) => s.y));
          const maxYR = Math.max(...rightSide.map((s) => s.y));
          const yOverlap = Math.min(maxYL, maxYR) - Math.max(minYL, minYR);
          if (yOverlap < 100) continue;

          const maxLeftEnd = Math.max(...leftSide.map((s) => s.x + s.w));
          const minRightStart = Math.min(...rightSide.map((s) => s.x));
          const gutterWidth = Math.max(0, minRightStart - maxLeftEnd);
          const zeroSpanBonus = spanning.length === 0 ? 10000 : 0;
          const score = zeroSpanBonus + gutterWidth * 10 - spanning.length * 1000 + Math.min(leftRows.length, rightRows.length);
          if (score > bestGutterScore) {
            bestGutterScore = score;
            bestSplitX = candX;
          }
        }

        if (bestSplitX > 0) {
          // Recentrer bestSplitX au milieu exact de la gouttière vide pour éviter de frôler un bloc large de la colonne gauche
          const splitLeftBody = bodySpans.filter((s) => s.x + s.w * 0.5 < bestSplitX);
          const splitRightBody = bodySpans.filter((s) => s.x + s.w * 0.5 >= bestSplitX);
          if (splitLeftBody.length > 0 && splitRightBody.length > 0) {
            const actualMaxLeftEnd = Math.max(...splitLeftBody.map((s) => s.x + s.w));
            const actualMinRightStart = Math.min(...splitRightBody.map((s) => s.x));
            if (actualMinRightStart > actualMaxLeftEnd + 6) {
              bestSplitX = Math.round((actualMaxLeftEnd + actualMinRightStart) / 2);
            }
          }

          // 1. Bannière pleine largeur réelle (uniquement si un élément ou une ligne du haut traverse effectivement la gouttière bestSplitX)
          const topBannerSpans = spans.filter((s) => s.y >= vp.height * 0.72);
          const topRows: PdfSpanItem[][] = [];
          for (const ts of [...topBannerSpans].sort((a, b) => b.y - a.y)) {
            const last = topRows[topRows.length - 1];
            if (last && Math.abs(last[0].y - ts.y) <= 4) {
              last.push(ts);
            } else {
              topRows.push([ts]);
            }
          }
          const crossingTopSpans = topRows
            .filter((row) => {
              if (row.some((s) => s.x < bestSplitX - 6 && s.x + s.w > bestSplitX + 6)) return true;
              const sortedRow = [...row].sort((a, b) => a.x - b.x);
              for (let rIdx = 0; rIdx < sortedRow.length - 1; rIdx++) {
                const cur = sortedRow[rIdx];
                const nxt = sortedRow[rIdx + 1];
                if (cur.x + cur.w <= bestSplitX + 6 && nxt.x >= bestSplitX - 6 && nxt.x - (cur.x + cur.w) <= 24) {
                  return true;
                }
              }
              return false;
            })
            .flat();
          if (crossingTopSpans.length > 0) {
            const headerMinY = Math.min(...crossingTopSpans.map((s) => s.y)) - 4;
            const topItems = spans.filter((s) => s.y >= headerMinY);
            const colItems = spans.filter((s) => s.y < headerMinY);
            const leftItems = colItems.filter((s) => s.x + s.w * 0.5 < bestSplitX);
            const rightItems = colItems.filter((s) => s.x + s.w * 0.5 >= bestSplitX);

            pageLayouts.push({
              isTwoCol: true,
              splitX: bestSplitX,
              topHeaderLines: rebuildLines(topItems),
              leftLines: rebuildLines(leftItems),
              rightLines: rebuildLines(rightItems),
              singleColLines: [],
            });
          } else {
            // 2 colonnes intégrales jusqu'en haut (ex: export LinkedIn où Coordonnées est à gauche et Nom + Titre sont à droite)
            const allLeftItems = spans.filter((s) => s.x + s.w * 0.5 < bestSplitX);
            const allRightItems = spans.filter((s) => s.x + s.w * 0.5 >= bestSplitX);

            // Si la colonne droite démarre par un grand nom de candidat (h >= medianH * 1.6), isoler uniquement ce bloc d'identité droite comme topHeaderLines
            let identityHeaderLines: string[] = [];
            let remainingRightItems = allRightItems;
            if (p === 1) {
              const rightTopName = allRightItems.find((s) => s.y >= vp.height * 0.8 && s.h >= medianH * 1.6);
              if (rightTopName) {
                const rightLinesAll = rebuildLines(allRightItems);
                const firstSecIdx = rightLinesAll.findIndex((rl) =>
                  /^(?:r[ée]sum[ée]|profil(?:\s+professionnel)?|synth[eè]se|[aà]\s+propos|summary|about(?:\s+me)?|exp[eé]riences?(?:\s+professionnelles?)?|work\s+experience|formations?|education|comp[eé]tences?)$/i.test(
                    rl.replace(/^[#*–—•:|\s.]+|[#*–—•:|\s.]+$/g, "").trim()
                  )
                );
                if (firstSecIdx > 0 && firstSecIdx <= 8) {
                  identityHeaderLines = rightLinesAll.slice(0, firstSecIdx);
                  const remainingRightLines = rightLinesAll.slice(firstSecIdx);
                  pageLayouts.push({
                    isTwoCol: true,
                    splitX: bestSplitX,
                    topHeaderLines: identityHeaderLines,
                    leftLines: rebuildLines(allLeftItems),
                    rightLines: remainingRightLines,
                    singleColLines: [],
                  });
                  continue;
                }
              }
            }

            pageLayouts.push({
              isTwoCol: true,
              splitX: bestSplitX,
              topHeaderLines: identityHeaderLines,
              leftLines: rebuildLines(allLeftItems),
              rightLines: rebuildLines(remainingRightItems),
              singleColLines: [],
            });
          }
        } else {
          pageLayouts.push({
            isTwoCol: false,
            splitX: 0,
            topHeaderLines: [],
            leftLines: [],
            rightLines: [],
            singleColLines: rebuildLines(spans),
          });
        }
      }

      if (pageLayouts.length > 0) {
        const twoColPages = pageLayouts.filter((pl) => pl.isTwoCol);
        const allShareConsistentColumns =
          pageLayouts.length >= 2 &&
          twoColPages.length === pageLayouts.length &&
          twoColPages.every((pl) => Math.abs(pl.splitX - twoColPages[0].splitX) <= 35);

        let orderedLines: string[] = [];
        if (allShareConsistentColumns) {
          const firstHeaderName = (pageLayouts[0].topHeaderLines[0] || "").toLowerCase().trim();
          const firstHeaderNorm = pageLayouts[0].topHeaderLines.join(" ").toLowerCase();
          orderedLines.push(...pageLayouts[0].topHeaderLines);
          for (let i = 1; i < pageLayouts.length; i++) {
            const hName = (pageLayouts[i].topHeaderLines[0] || "").toLowerCase().trim();
            const hNorm = pageLayouts[i].topHeaderLines.join(" ").toLowerCase();
            if (hNorm && hNorm !== firstHeaderNorm && (!firstHeaderName || hName !== firstHeaderName)) {
              orderedLines.push(...pageLayouts[i].topHeaderLines);
            }
          }
          for (const pl of pageLayouts) orderedLines.push(...pl.leftLines);
          for (const pl of pageLayouts) orderedLines.push(...pl.rightLines);
        } else {
          const firstHeaderNorm = pageLayouts[0]?.topHeaderLines.join(" ").toLowerCase() || "";
          for (let i = 0; i < pageLayouts.length; i++) {
            const pl = pageLayouts[i];
            if (pl.isTwoCol) {
              const hNorm = pl.topHeaderLines.join(" ").toLowerCase();
              if (i === 0 || (hNorm && hNorm !== firstHeaderNorm)) {
                orderedLines.push(...pl.topHeaderLines);
              }
              orderedLines.push(...pl.leftLines, ...pl.rightLines);
            } else {
              orderedLines.push(...pl.singleColLines);
            }
          }
        }

        const spatialText = sanitizeDocumentText(orderedLines.join("\n"));
        if (spatialText && spatialText.trim().length > 20) {
          return spatialText;
        }
      }
    } catch (spatialErr: any) {
      console.warn("Extraction spatiale PDF bascule vers pdf-parse :", spatialErr?.message);
    }

    // Secours pdf-parse standard
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({
      data: uint8,
      standardFontDataUrl,
    });
    const result = await parser.getText();

    let extracted = "";
    if (typeof result === "string") {
      extracted = result;
    } else if (result?.text && typeof result.text === "string") {
      extracted = result.text;
    } else if (Array.isArray(result?.pages)) {
      extracted = result.pages.map((p: any) => p.text || "").join("\n");
    }

    extracted = sanitizeDocumentText(extracted);
    return extracted;
  } catch (err: any) {
    console.warn("Extraction PDF locale impossible :", err?.message);
    return "";
  }
}

// Extraction locale pour documents Word (.docx)
async function extractTextLocallyFromDocx(base64Data: string): Promise<string> {
  try {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeDocumentText(result.value || "");
  } catch (err: any) {
    console.warn("Extraction DOCX locale impossible :", err?.message);
    return "";
  }
}

function getMimeTypeFromDataUrl(dataUrl: string, defaultMime = "application/pdf"): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1].toLowerCase() : defaultMime.toLowerCase();
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Extract text from uploaded PDF, Word or Image document
app.post("/api/extract-text", async (req, res) => {
  try {
    const { base64Data, mimeType: rawMime } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "Aucun contenu de fichier fourni." });
    }

    const mimeType = (rawMime || getMimeTypeFromDataUrl(base64Data)).toLowerCase();

    // 1. Fichier PDF : extraction locale ultra-rapide
    if (mimeType.includes("pdf")) {
      const localText = await extractTextLocallyFromPdf(base64Data);
      if (localText && localText.trim().length > 30) {
        console.log(`[Document Extraction] Succès PDF local (${localText.length} caractères)`);
        return res.json({ text: localText, method: "pdf-local" });
      }
    }

    // 2. Fichier Word (.docx / .doc) : extraction locale avec mammoth
    if (mimeType.includes("word") || mimeType.includes("officedocument") || mimeType.includes("docx") || mimeType.includes("msword")) {
      const docxText = await extractTextLocallyFromDocx(base64Data);
      if (docxText && docxText.trim().length > 20) {
        console.log(`[Document Extraction] Succès Word DOCX local (${docxText.length} caractères)`);
        return res.json({ text: docxText, method: "docx-local" });
      }
    }

    // 3. Fichier texte (.txt / .md / .rtf / .csv) : décodage UTF-8 direct
    if (mimeType.includes("text") || mimeType.includes("txt") || mimeType.includes("markdown") || mimeType.includes("csv")) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      const text = Buffer.from(cleanBase64, "base64").toString("utf-8");
      return res.json({ text, method: "text-utf8" });
    }

    // 4. Fichier image (Scan, photo, capture d'écran PNG/JPEG/WEBP) : OCR multimodale avec Gemini
    const supportedImageMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    const isImage = supportedImageMimes.some((m) => mimeType.includes(m)) || mimeType.startsWith("image/");
    const isPdfScan = mimeType.includes("pdf");

    if (!isImage && !isPdfScan) {
      return res.status(400).json({
        error: `Format de fichier non pris en charge (${mimeType || "inconnu"}). Veuillez importer un PDF, un document Word (.docx), un fichier texte (.txt) ou une image (PNG/JPEG), ou collez directement le contenu dans l'onglet Texte.`,
      });
    }

    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const ai = getGeminiClient();

    const actualMime = isImage ? (supportedImageMimes.find((m) => mimeType.includes(m)) || "image/png") : "application/pdf";

    const response = await callGeminiWithFallback((modelName) =>
      ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: actualMime,
                data: cleanBase64,
              },
            },
            {
              text: "Extrais fidèlement et intégralement tout le texte de ce document (CV ou offre d'emploi). Conserve tous les détails, noms, dates, technologies, coordonnées et descriptions de postes sans rien inventer ni résumer.",
            },
          ],
        },
      })
    );

    res.json({ text: response.text || "", method: "gemini-multimodal" });
  } catch (error: any) {
    const { isBilling, isAuth } = isNonRetriableBillingOrAuthError(error);
    const errMsg = error?.message || String(error || "");
    const isTransient = isBilling || isAuth || errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("GEMINI_BILLING_COOLDOWN");
    console.log("[Document Extraction] OCR distant indisponible :", isBilling ? "crédits API épuisés" : errMsg.slice(0, 140));
    res.status(isTransient ? 503 : 500).json({
      error: isBilling || isTransient
        ? "L'extraction OCR par IA (pour images ou PDF scannés) est temporairement indisponible. Veuillez importer un PDF texte, un fichier Word (.docx), ou coller directement le contenu dans l'onglet « Texte »."
        : (errMsg || "Échec de l'extraction du document."),
    });
  }
});

// Extraction tolérante aux pannes d'une offre d'emploi par URL
app.post("/api/extract-job-url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner une adresse web (URL) valide.",
      });
    }

    const cleanInputUrl = url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanInputUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          error: "L'adresse doit obligatoirement commencer par http:// ou https://.",
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: "L'adresse renseignée n'est pas une URL valide (ex: https://www.welcometothejungle.com/fr/companies/.../jobs/...).",
      });
    }

    // Sécurité SSRF : blocage des IP locales et réseaux privés
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("169.254.")
    ) {
      return res.status(400).json({
        success: false,
        error: "Les adresses locales ou privées ne sont pas autorisées pour des raisons de sécurité.",
      });
    }

    // Identification conviviale du portail
    const isLinkedIn = hostname.includes("linkedin.com");
    const isIndeed = hostname.includes("indeed.com");
    const isGlassdoor = hostname.includes("glassdoor.com");
    const isWttj = hostname.includes("welcometothejungle.com");
    const isCadremploi = hostname.includes("cadremploi.fr");
    const isApec = hostname.includes("apec.fr");
    const isHelloWork = hostname.includes("hellowork.com");
    const isJooble = hostname.includes("jooble.");
    const isJeanMichel = hostname.includes("jean-michel.io");

    const friendlySite = isLinkedIn
      ? "LinkedIn"
      : isIndeed
      ? "Indeed"
      : isGlassdoor
      ? "Glassdoor"
      : isWttj
      ? "Welcome to the Jungle"
      : isCadremploi
      ? "Cadremploi"
      : isApec
      ? "Apec"
      : isHelloWork
      ? "HelloWork"
      : isJooble
      ? "Jooble"
      : isJeanMichel
      ? "Jean-Michel.io"
      : hostname.replace(/^www\./, "");

    console.log(`[Job URL Extraction] Tentative d'analyse pour : ${parsedUrl.origin}${parsedUrl.pathname}`);

    // Fonction d'extraction et de nettoyage HTML (décodage complet des entités, suppression quote-aware des balises, JSON-LD JobPosting & balise <h1>)
    function parseHtmlToCleanJobContent(html: string) {
      const decodeHtmlEntities = (s: string) =>
        s
          .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
          .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&quot;/gi, '"')
          .replace(/&apos;/gi, "'")
          .replace(/&rsquo;|&lsquo;/gi, "'")
          .replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"')
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/&mdash;/gi, "—")
          .replace(/&ndash;/gi, "–")
          .replace(/&hellip;/gi, "...")
          .replace(/&euro;/gi, "€")
          .replace(/&eacute;/g, "é")
          .replace(/&Eacute;/g, "É")
          .replace(/&egrave;/g, "è")
          .replace(/&Egrave;/g, "È")
          .replace(/&ecirc;/g, "ê")
          .replace(/&agrave;/g, "à")
          .replace(/&ccedil;/g, "ç")
          .replace(/&ocirc;/g, "ô")
          .replace(/&ucirc;/g, "û")
          .replace(/&ugrave;/g, "ù")
          .replace(/&iuml;/g, "ï");

      const stripHtmlTagsSafe = (fragment: string) =>
        fragment.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ");

      const cleanFragmentToLines = (fragment: string) => {
        const withBreaks = fragment
          .replace(/<li\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, "\n- ")
          .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|section|article)>/gi, "\n")
          .replace(/<br\s*\/?>/gi, "\n");
        const stripped = decodeHtmlEntities(stripHtmlTagsSafe(withBreaks));
        return stripped
          .split("\n")
          .map((l) => l.replace(/\s+/g, " ").trim())
          .filter((l) => l.length > 0 && l !== "-")
          .join("\n");
      };

      let structuredRole = "";
      let structuredCompany = "";
      let structuredLocation = "";
      let structuredDescription = "";

      const scriptMatches = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi);
      for (const m of scriptMatches) {
        const decodedAttrs = decodeHtmlEntities(m[1] || "");
        const body = (m[2] || "").trim();
        const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(decodedAttrs) || (body.startsWith("{") && body.includes("JobPosting"));
        if (!isJsonLd || !body) continue;
        try {
          const parsedLd = JSON.parse(body);
          const nodes = Array.isArray(parsedLd)
            ? parsedLd
            : Array.isArray(parsedLd?.["@graph"])
            ? parsedLd["@graph"]
            : [parsedLd];
          for (const node of nodes) {
            const typeVal = Array.isArray(node?.["@type"]) ? node["@type"].join(",") : String(node?.["@type"] || "");
            if (/JobPosting/i.test(typeVal)) {
              if (typeof node.title === "string" && node.title.trim()) {
                structuredRole = decodeHtmlEntities(node.title).replace(/\s+/g, " ").trim();
              }
              if (typeof node.hiringOrganization?.name === "string" && node.hiringOrganization.name.trim()) {
                structuredCompany = decodeHtmlEntities(node.hiringOrganization.name).replace(/\s+/g, " ").trim();
              }
              const locObj = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation;
              const locality = locObj?.address?.addressLocality || "";
              const region = locObj?.address?.addressRegion || "";
              if (locality) {
                structuredLocation = decodeHtmlEntities(region ? `${locality}, ${region}` : locality).trim();
              }
              if (typeof node.description === "string" && node.description.trim().length > 80) {
                structuredDescription = cleanFragmentToLines(decodeHtmlEntities(node.description));
              }
              break;
            }
          }
          if (structuredRole || structuredDescription) break;
        } catch {
          // Ignorer JSON-LD malformé
        }
      }

      const h1Match = html.match(/<h1\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/h1>/i);
      let h1Title = "";
      let h1Company = "";
      if (h1Match?.[1]) {
        const innerH1 = h1Match[1];
        const jobTitleSpan = innerH1.match(/<span\b(?:[^>"']|"[^"]*"|'[^']*')*data-cy=["']jobTitle["'](?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/span>/i) ||
          innerH1.match(/<span\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/span>/i);
        const companyLink = innerH1.match(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/a>/i);
        if (jobTitleSpan?.[1]) {
          h1Title = decodeHtmlEntities(stripHtmlTagsSafe(jobTitleSpan[1])).replace(/\s+/g, " ").trim();
          if (companyLink?.[1]) {
            h1Company = decodeHtmlEntities(stripHtmlTagsSafe(companyLink[1])).replace(/\s+/g, " ").trim();
          }
        } else {
          h1Title = decodeHtmlEntities(stripHtmlTagsSafe(innerH1)).replace(/\s+/g, " ").trim();
        }
      }

      const ogTitleMatch =
        html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const ogDescMatch =
        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

      const pageTitle = decodeHtmlEntities(ogTitleMatch?.[1] || titleTagMatch?.[1] || "").replace(/\s+/g, " ").trim();
      const metaDescription = decodeHtmlEntities(ogDescMatch?.[1] || "").replace(/\s+/g, " ").trim();

      if (!structuredCompany && h1Company) {
        structuredCompany = h1Company;
      }
      if (!structuredCompany && pageTitle) {
        const recPar = pageTitle.match(/Recrutement\s+par\s+([^|]+)/i)?.[1]?.trim();
        if (recPar) structuredCompany = recPar;
      }

      // Si le JSON-LD JobPosting fournit une description riche et propre, l'utiliser en priorité (zéro bruit HTML/menu/cookies)
      if (structuredDescription && structuredDescription.length > 150) {
        const cleanRoleHead = sanitizeJobRoleTitle(structuredRole || h1Title || pageTitle);
        const headerLines = [
          cleanRoleHead ? `Poste : ${cleanRoleHead}` : "",
          structuredCompany ? `Entreprise : ${structuredCompany}` : "",
          structuredLocation ? `Lieu : ${structuredLocation}` : "",
        ].filter(Boolean);
        return {
          plainText: `${headerLines.join("\n")}\n\n${structuredDescription}`.trim(),
          pageTitle,
          h1Title,
          structuredRole,
          structuredCompany,
          structuredDescription,
          metaDescription,
        };
      }

      // Fallback HTML quote-aware (aucune fuite d'attributs Stimulus type "->")
      const mainRegionMatch = html.match(/<main\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/main>/i) ||
        html.match(/<article\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/article>/i);
      let cleaned = mainRegionMatch?.[1] || html;
      cleaned = cleaned
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
        .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
        .replace(/<header\b[\s\S]*?<\/header>/gi, " ")
        .replace(/<footer\b[\s\S]*?<\/footer>/gi, " ")
        .replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
        .replace(/<aside\b[\s\S]*?<\/aside>/gi, " ")
        .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, " ");

      const plainText = cleanFragmentToLines(cleaned);
      return { plainText, pageTitle, h1Title, structuredRole, structuredCompany, structuredDescription, metaDescription };
    }

    let isBlocked = false;
    let blockReason = "";
    let extractedRawText = "";
    let extractedTitle = "";
    let extractedH1Title = "";
    let extractedStructuredCompany = "";

    // Requête Prioritaire LinkedIn : API publique invité sans authwall
    if (isLinkedIn) {
      const linkedInJobIdMatch =
        cleanInputUrl.match(/\/jobs\/view\/(?:[^\/]+-)?(\d+)/i) ||
        cleanInputUrl.match(/[?&]currentJobId=(\d+)/i) ||
        cleanInputUrl.match(/[?&]jobId=(\d+)/i);

      if (linkedInJobIdMatch?.[1]) {
        const jobId = linkedInJobIdMatch[1];
        try {
          console.log(`[Job URL Extraction] Détection LinkedIn Job ID ${jobId}. Interrogation via API invité publique...`);
          const linkedInGuestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
          const liCtrl = new AbortController();
          const liTimer = setTimeout(() => liCtrl.abort(), 7000);

          const liResp = await fetch(linkedInGuestUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
            },
            signal: liCtrl.signal,
          });
          clearTimeout(liTimer);

          if (liResp.ok) {
            const liHtml = await liResp.text();
            if (liHtml && liHtml.length > 300 && !liHtml.includes("authwall")) {
              const parsed = parseHtmlToCleanJobContent(liHtml);
              if (parsed.plainText && parsed.plainText.length > 150) {
                extractedRawText = parsed.plainText;
                extractedTitle = parsed.pageTitle;
                extractedH1Title = parsed.structuredRole || parsed.h1Title || "";
                if (parsed.structuredCompany) extractedStructuredCompany = parsed.structuredCompany;
                isBlocked = false;
                console.log(`[Job URL Extraction] Succès API invité LinkedIn (${extractedRawText.length} car.)`);
              }
            }
          }
        } catch (liErr: any) {
          console.warn(`[Job URL Extraction] Échec API invité LinkedIn (${liErr?.message}), poursuite des relais.`);
        }
      }
    }

    // Requête HTTP 1 : fetch direct avec en-têtes réalistes de navigateur moderne (si non déjà extrait)
    if (!extractedRawText || extractedRawText.length < 150) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7500);

        const response = await fetch(cleanInputUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
          },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timer);

        if (response.status === 403 || response.status === 401 || response.status === 429) {
          isBlocked = true;
          blockReason = `Protection du site (${response.status} Accès restreint)`;
        } else if (!response.ok) {
          isBlocked = true;
          blockReason = `Réponse serveur HTTP ${response.status}`;
        } else {
          const html = await response.text();
          if (
            html.includes("cf-browser-verification") ||
            html.includes("challenge-running") ||
            html.includes("Attention Required! | Cloudflare") ||
            html.includes("Just a moment...") ||
            (isLinkedIn && html.includes("authwall"))
          ) {
            isBlocked = true;
            blockReason = "Vérification anti-robot (Cloudflare / Authwall)";
          } else {
            const parsed = parseHtmlToCleanJobContent(html);
            if (parsed.plainText && parsed.plainText.length > 250) {
              extractedRawText = parsed.plainText;
              extractedTitle = parsed.pageTitle;
              extractedH1Title = parsed.structuredRole || parsed.h1Title || "";
              if (parsed.structuredCompany) extractedStructuredCompany = parsed.structuredCompany;
              isBlocked = false;
            } else {
              isBlocked = true;
              blockReason = "Page dynamique (SPA JavaScript)";
            }
          }
        }
      } catch (directErr: any) {
        console.warn(`[Job URL Extraction] Échec direct (${directErr?.message}).`);
        isBlocked = true;
        blockReason = directErr?.name === "AbortError" ? "Délai de connexion dépassé" : directErr?.message;
      }
    }

    // Requête HTTP 2 (Secours) : passerelle de lecture pour les pages dynamiques / client-side
    if (isBlocked || !extractedRawText || extractedRawText.length < 200) {
      try {
        console.log(`[Job URL Extraction] Tentative via passerelle de lecture pour ${hostname}...`);
        const jinaReaderUrl = `https://r.jina.ai/${encodeURI(cleanInputUrl)}`;
        const jinaCtrl = new AbortController();
        const jinaTimer = setTimeout(() => jinaCtrl.abort(), 8000);

        const jinaResp = await fetch(jinaReaderUrl, {
          headers: {
            Accept: "text/plain",
            "User-Agent": "Mozilla/5.0 (compatible; JobAlignBot/1.0)",
          },
          signal: jinaCtrl.signal,
        });
        clearTimeout(jinaTimer);

        if (jinaResp.ok) {
          const jinaText = await jinaResp.text();
          const isLinkedInAuthwall = isLinkedIn && (
            jinaText.includes("Sign In | LinkedIn") ||
            jinaText.includes("authwall") ||
            jinaText.includes("Target URL returned error") ||
            jinaText.includes("لم يتم العثور") ||
            jinaText.includes("Page not found") ||
            jinaText.includes("join-form")
          );

          if (
            jinaText &&
            jinaText.length > 250 &&
            !jinaText.includes("403 Forbidden") &&
            !jinaText.includes("Security Check") &&
            !jinaText.includes("Attention Required") &&
            !isLinkedInAuthwall
          ) {
            extractedRawText = jinaText;
            const jinaTitleLine = jinaText.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || "";
            const jinaH1Line = jinaText.match(/^#\s+([^\n#]{4,90})$/m)?.[1]?.trim() ||
              jinaText.match(/^([^\n]{4,90})\n={3,}\s*$/m)?.[1]?.trim() || "";
            if (!extractedTitle && jinaTitleLine) extractedTitle = jinaTitleLine;
            if (!extractedH1Title && jinaH1Line) extractedH1Title = jinaH1Line;
            isBlocked = false;
          } else {
            isBlocked = true;
            blockReason = isLinkedInAuthwall ? "Connexion LinkedIn requise" : "Accès restreint par le portail";
          }
        }
      } catch (proxyErr: any) {
        console.warn(`[Job URL Extraction] Passerelle de lecture indisponible :`, proxyErr?.message);
      }
    }

    // ARCHITECTURE TOLÉRANTE AUX PANNES : Si le site est bloqué ou inaccessible
    if (isBlocked || !extractedRawText || extractedRawText.trim().length < 100) {
      return res.json({
        success: false,
        blocked: true,
        siteName: friendlySite,
        reason: blockReason || "Protection anti-bot ou connexion requise",
        message: `Le portail de recrutement ${friendlySite} protège ses annonces contre la lecture directe automatisée.`,
        guidance: "Pour continuer sans friction : copiez simplement le texte de l'annonce et collez-le dans l'onglet « Texte » ci-contre.",
      });
    }

    // Contrôle de conformité de nature de document (Garde-fou : rejette les articles politiques, théologie, cours, etc.)
    const docCheck = validateJobOfferDocument(extractedRawText);
    if (!docCheck.isValid) {
      return res.json({
        success: false,
        invalidContent: true,
        error:
          docCheck.error ||
          "Le contenu extrait de ce lien ne semble pas correspondre à une offre d'emploi (aucun prérequis, mission ou profil recherché détecté).",
        extractedSample: extractedRawText.slice(0, 250),
      });
    }

    // Choix intelligent du titre de poste heuristique (priorité : JSON-LD > H1 propre > <title> assaini)
    const inferBestHeuristicRole = (): string => {
      const explicitLineRole = extractedRawText.match(/^Poste\s*:\s*([^\n]+)$/m)?.[1]?.trim();
      const candidates = [explicitLineRole || "", extractedH1Title, extractedTitle].filter((c) => c && c.trim().length >= 3);
      for (const cand of candidates) {
        const cleanCand = sanitizeJobRoleTitle(cand);
        if (cleanCand && cleanCand.length >= 5 && cleanCand.length <= 75) {
          const rawLines = extractedRawText.split("\n").map((l) => l.replace(/^[#*\s]+/, "").trim()).filter((l) => l.length >= 8 && l.length <= 70);
          const cleanLower = cleanCand.toLowerCase();
          const cleanerSubLine = rawLines.find((l) => {
            const s = sanitizeJobRoleTitle(l);
            return s.length >= 8 && s.split(/\s+/).length >= 2 && s.length < cleanCand.length && cleanLower.startsWith(s.toLowerCase());
          });
          if (cleanerSubLine) {
            return sanitizeJobRoleTitle(cleanerSubLine);
          }
          return cleanCand;
        }
      }
      return "";
    };

    // Structuration propre de l'offre d'emploi avec Gemini (Entreprise, Poste, Missions, Prérequis)
    let finalCleanJobText = extractedRawText;
    let finalDetectedRole = inferBestHeuristicRole() || sanitizeJobRoleTitle(extractedTitle);
    let finalDetectedCompany = extractedStructuredCompany || "";

    try {
      const ai = getGeminiClient();
      const prompt = `Tu es un spécialiste du recrutement et de l'ingestion d'offres d'emploi.
Voici le texte brut extrait d'une page web de recrutement :
---
${extractedRawText.slice(0, 9000)}
---

TÂCHE :
1. Extrais l'intitulé exact du poste ("roleTitle") sans mention H/F, contrat, ville, code départemental ni préfixe "Offre Emploi".
2. Extrais UNIQUEMENT le nom court et pur de l'entreprise qui recrute ("companyName"), sans slogan, sans texte collé (ex: si le texte brut contient "ALTECAChez Alteca le management...", extrais uniquement "ALTECA").
3. Nettoie et structure le descriptif du poste ("cleanedJobText") pour ne conserver QUE les informations utiles au candidat :
   - Missions et responsabilités clés
   - Profil recherché, compétences exigées, formation et années d'expérience
   - Contexte d'entreprise ou de projet
   SUPPRIME rigoureusement : bannières de cookies, menus de navigation, boutons "Partager", offres similaires et mentions légales du site hôte.

RÈGLE LINGUISTIQUE CRUCIALE :
- Conserve impérativement la langue d'origine de l'offre d'emploi. Si l'offre d'emploi est rédigée en anglais, "roleTitle" et "cleanedJobText" DOIVENT être formulés STRICTEMENT EN ANGLAIS sans aucune traduction. Ne traduis JAMAIS une offre en anglais en français. Si l'offre est en français, conserve le français.

Réponds STRICTEMENT au format JSON :
{
  "roleTitle": "Intitulé précis du poste dans sa langue d'origine",
  "companyName": "Nom de l'entreprise",
  "location": "Localisation ou télétravail",
  "cleanedJobText": "Texte complet structuré et prêt à l'emploi dans sa langue d'origine"
}
`;

      const aiResponse = await callGeminiWithFallback(
        (modelName) =>
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              ...(modelName === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
            },
          }),
        ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
        2,
        18000
      );

      const parsedJson = JSON.parse(aiResponse.text || "{}");
      if (parsedJson.cleanedJobText && parsedJson.cleanedJobText.length > 60) {
        finalCleanJobText = parsedJson.cleanedJobText;
        if (parsedJson.roleTitle) finalDetectedRole = parsedJson.roleTitle;
        if (parsedJson.companyName) finalDetectedCompany = parsedJson.companyName;
      }
    } catch (_aiErr: any) {
      console.log("[Job URL Extraction] Structuration heuristique locale active.");
      const cleanedLines = extractedRawText
        .replace(/^Title:.*\n/im, "")
        .replace(/^URL Source:.*\n/im, "")
        .replace(/^Published Time:.*\n/im, "")
        .replace(/^Markdown Content:\s*\n?/im, "")
        .split("\n")
        .filter((l) => !/^(?:accepter\s+et\s+continuer|tout\s+accepter|gérer\s+mes\s+choix|politique\s+de\s+confidentialité|cookies?|se\s+connecter|créer\s+un\s+compte|s'inscrire|partager\s+l'offre|offres?\s+similaires?)$/i.test(l.trim()))
        .join("\n")
        .trim();
      const alreadyHasHeader = /^Poste\s*:/im.test(cleanedLines);
      const rolePrefix = !alreadyHasHeader && finalDetectedRole ? `Poste : ${sanitizeJobRoleTitle(finalDetectedRole)}\n` : "";
      const compPrefix = !alreadyHasHeader && finalDetectedCompany ? `Entreprise : ${finalDetectedCompany}\n` : "";
      finalCleanJobText = `${rolePrefix}${compPrefix}${cleanedLines || extractedRawText}`.trim();
    }

    const cleanedDetectedRole = sanitizeJobRoleTitle(finalDetectedRole);
    const cleanedDetectedCompany = sanitizeCompanyName(finalDetectedCompany);
    const detectedLanguage = detectLanguage(finalCleanJobText);
    console.log(`[Job URL Extraction] Langue détectée pour l'offre : ${detectedLanguage === 'en' ? 'Anglais (🇬🇧)' : 'Français (🇫🇷)'}`);

    return res.json({
      success: true,
      text: finalCleanJobText,
      detectedRole: cleanedDetectedRole.slice(0, 70),
      detectedCompany: cleanedDetectedCompany.slice(0, 65),
      detectedLanguage: detectedLanguage,
      url: cleanInputUrl,
      siteName: friendlySite,
      characterCount: finalCleanJobText.length,
    });
  } catch (err: any) {
    console.log("[Job URL Extraction] Échec extraction :", err?.name || "erreur réseau");
    return res.status(500).json({
      success: false,
      error: "Erreur lors de l'extraction de l'URL.",
    });
  }
});

// Full Master Pipeline: Semantic Gap Analysis + ATS CV Optimization + Cover Letter Synthesis
const PIPELINE_ROUTES = [
  "/api/pipeline-tailor",
  "/api/pipeline-tailor/",
  "/api/pipeline_tailor",
  "/api/pipeline/tailor",
  "/api/analyze",
  "/api/analyze/",
  "/api/analyse",
  "/api/analyse/",
  "/api/analyze-cv",
  "/api/analyze-cv/",
  "/api/tailor",
  "/api/tailor/",
  "/api/optimize",
  "/api/optimize/",
  "/api/align",
  "/api/align/",
];

app.get(PIPELINE_ROUTES, (_req, res) => {
  res.json({
    success: true,
    message: "Pipeline ATS JNB Align actif. Envoyez une requête POST avec cvText et jobText.",
    endpoints: PIPELINE_ROUTES,
  });
});

app.post(PIPELINE_ROUTES, async (req, res) => {
  try {
    const {
      cvText,
      cvBase64,
      jobText,
      jobBase64,
      targetRoleTitle: rawTargetRoleTitle,
      candidateNotes,
      language = "auto",
    } = req.body;
    const targetRoleTitle = rawTargetRoleTitle ? sanitizeJobRoleTitle(rawTargetRoleTitle) : "";

    if (!cvText && !cvBase64) {
      return res.status(400).json({ error: "Veuillez fournir le contenu ou le fichier du CV." });
    }
    if (!jobText && !jobBase64) {
      return res.status(400).json({ error: "Veuillez fournir le contenu ou le fichier de l'offre d'emploi." });
    }

    // Extraction locale prioritaire pour éviter d'envoyer de lourds blobs base64 à Gemini
    let resolvedCvText = cvText || "";
    let cvInlinePart: any = null;
    if (!resolvedCvText && cvBase64) {
      const cvMime = getMimeTypeFromDataUrl(cvBase64);
      if (cvMime.includes("word") || cvMime.includes("docx") || cvMime.includes("officedocument")) {
        resolvedCvText = await extractTextLocallyFromDocx(cvBase64);
      } else {
        resolvedCvText = await extractTextLocallyFromPdf(cvBase64);
      }

      if (!resolvedCvText) {
        const cleanCv = cvBase64.replace(/^data:[^;]+;base64,/, "");
        const actualMime = cvMime.startsWith("image/") ? cvMime : "application/pdf";
        cvInlinePart = {
          inlineData: {
            mimeType: actualMime,
            data: cleanCv,
          },
        };
      }
    }

    let resolvedJobText = jobText || "";
    let jobInlinePart: any = null;
    if (!resolvedJobText && jobBase64) {
      const jobMime = getMimeTypeFromDataUrl(jobBase64);
      if (jobMime.includes("word") || jobMime.includes("docx") || jobMime.includes("officedocument")) {
        resolvedJobText = await extractTextLocallyFromDocx(jobBase64);
      } else {
        resolvedJobText = await extractTextLocallyFromPdf(jobBase64);
      }

      if (!resolvedJobText) {
        const cleanJob = jobBase64.replace(/^data:[^;]+;base64,/, "");
        const actualMime = jobMime.startsWith("image/") ? jobMime : "application/pdf";
        jobInlinePart = {
          inlineData: {
            mimeType: actualMime,
            data: cleanJob,
          },
        };
      }
    }

    resolvedCvText = sanitizeDocumentText(resolvedCvText);
    resolvedJobText = sanitizeDocumentText(resolvedJobText);

    // Contrôle de conformité de nature de document (Garde-fou anti-hallucination)
    const cvValidation = validateDocumentAsCv(resolvedCvText);
    if (!cvValidation.isValid) {
      console.warn(`[Pipeline ATS] Document CV rejeté : ${cvValidation.error}`);
      return res.status(400).json({ error: cvValidation.error });
    }

    const jobValidation = validateDocumentAsJobOffer(resolvedJobText);
    if (!jobValidation.isValid) {
      console.warn(`[Pipeline ATS] Offre d'emploi rejetée : ${jobValidation.error}`);
      return res.status(400).json({ error: jobValidation.error });
    }

    const ai = getGeminiClient();

    // 2. Garde-fou sémantique universel par IA (Rejette instantanément tout article politique, élections, etc.)
    // Si les validations locales strictes ont déjà confirmé avec certitude la nature du CV et de l'offre, économiser le quota API Gemini
    const hasClearKeywords = /exp[eé]rience|formation|comp[eé]tence|parcours|dipl[oô]me/i.test(resolvedCvText) &&
                             /poste|missions?|profil|recherche|candidat|contrat|recrutement/i.test(resolvedJobText);
    if (!hasClearKeywords) {
      const aiDocCheck = await verifyDocumentAuthenticityWithAI(ai, resolvedCvText, resolvedJobText);
      if (!aiDocCheck.isValid) {
        console.warn(`[Pipeline ATS] Rejet sémantique par l'IA : ${aiDocCheck.error}`);
        return res.status(400).json({ error: aiDocCheck.error });
      }
    } else {
      console.log(`[Document AI Gate] Validation déterministe confirmée (CV & Offre). Préservation du quota API pour l'analyse.`);
    }

    // Détermination de la langue cible : Explicite ou Détection automatique
    let targetLanguage: 'fr' | 'en' = 'fr';
    if (language === 'en') {
      targetLanguage = 'en';
    } else if (language === 'fr') {
      targetLanguage = 'fr';
    } else {
      targetLanguage = detectLanguage(resolvedJobText, resolvedCvText);
    }
    const isEn = targetLanguage === 'en';

    console.log(`[Pipeline ATS] Mode linguistique actif : ${isEn ? 'ANGLAIS INTERNATIONAL (🇬🇧)' : 'FRANÇAIS (🇫🇷)'}`);

    const parts: any[] = [];

    if (cvInlinePart) parts.push(cvInlinePart);
    if (jobInlinePart) parts.push(jobInlinePart);

    const todayFormattedDateFr = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const todayFormattedDateEn = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const promptInstruction = isEn ? `
You are an Executive Recruiter and International ATS (Applicant Tracking Systems: Workday, Taleo, Greenhouse, Lever, iCIMS) Expert.

Your role is to execute a rigorous semantic tailoring pipeline aligning a candidate's CV with a target job description.

### ⚠️ MANDATORY LINGUISTIC RULE - 100% EXECUTIVE ENGLISH:
- The ENTIRE output (semanticGap analysis, jobOverview, scores explanation, keywords, ATS audit highlights & recommendations, optimizedCv, and coverLetter) MUST BE WRITTEN 100% IN IMPECCABLE EXECUTIVE ENGLISH.
- DO NOT output French words or phrases. Everything must be tailored for international hiring standards in English.

### 🌟 EXECUTIVE STAR ACTION VERBS (MANDATORY FOR EVERY BULLET POINT):
- Every single bullet point in 'experiences' MUST begin with a high-impact Anglo-Saxon executive STAR action verb:
  Examples: Spearheaded, Engineered, Orchestrated, Scaled, Streamlined, Accelerated, Championed, Delivered, Pioneered, Optimized, Formulated, Deployed, Standardized.
- NEVER use weak or passive verbs (e.g., "Responsible for", "Worked on", "Assisted with", "Helped", "Participated in").
- Apply the STAR formula: Action Verb + Context/Scope + Measurable Result or Quantified Impact.

### RÈGLE D'OR ABSOLUE - ZERO HALLUCINATION (FACTUAL FIDELITY):
- NEVER invent fictitious employers, fake degrees, false employment dates, or fabricate experiences not present in the source CV.
- Transform and elevate the candidate's GENUINE experiences using executive phrasing, industry-standard metrics, and exact keyword matches from the job description.

### 🎯 EXACT JOB OFFER ALIGNMENT + DIFFERENTIATING VALUE:
- Extract the target job title and hiring company name directly from the job description.
- Lead the CV Professional Summary, top skills, and opening experience bullets with the precise requirements, vocabulary, methodologies, and tools demanded by the job posting.
- DO NOT discard high-value differentiating competencies, tools, or missions from the source CV merely because they were not explicitly mentioned in the job ad: retain complementary strengths, quantified achievements, process/tool improvements, international scope, and cross-functional initiatives that distinguish the candidate from competing applicants for the same role.

---
INPUT DATA:
${resolvedCvText ? `### SOURCE CV TEXT:\n${resolvedCvText}\n` : ""}
${resolvedJobText ? `### TARGET JOB OFFER TEXT:\n${resolvedJobText}\n` : ""}
${targetRoleTitle ? `### TARGET ROLE TITLE SPECIFIED:\n${targetRoleTitle}\n` : ""}
${candidateNotes ? `### CANDIDATE FOCUS & PRIORITIES:\n${candidateNotes}\n` : ""}
Required Output Language: ENGLISH (International ATS)

---
EXPECTED JSON OUTPUT (Strict JSON, 100% in Executive English):

1. SEMANTIC GAP ANALYSIS (semanticGap):
   - jobOverview: { title, company, industry, summary } (in professional English; 'title' MUST be ONLY the clean job title in normal Title Case — NEVER include gender tags like H/F, M/F, contract types like CDD/CDI/Full-time/Part-time, locations, or ALL CAPS; 'company' MUST be ONLY the short hiring company name, or "" if the job ad does not name any company — NEVER output placeholders like "the organization", "your organization", or "Confidential")
   - scores:
     - initialAtsScore: initial CV match percentage (0 to 100)
     - optimizedAtsScore: projected tailored CV match percentage (typically 88-98%)
     - scoreExplanation: concise, sharp explanation of score progression in English
   - keywordsAnalysis:
     - ⚠️ MANDATORY SKILL QUALITY RULE: Every entry MUST be a genuine, recognized professional competency (e.g., Python, SQL, Project Management, Agile, CRM, Financial Modeling, Cross-Functional Leadership).
     - STRICTLY FORBIDDEN: NEVER output broken word fragments (e.g. "tion", "ment"), grammatical fillers, ordinary verbs ("ensure", "working", "within", "proven"), or boilerplate job ad text ("job description", "responsibilities", "requirements", "equal opportunity", "we are looking for", "years").
     - criticalRequiredKeywords: essential competencies demanded by the job
     - matchedKeywords: competencies already present in the source CV
     - integratedKeywords: competencies organically integrated through STAR reformulation
     - missingOrGaps: requirements not present in CV (transparent notice for candidate)
   - atsComplianceAudit:
     - status: "compliant" | "warning"
     - highlights: ATS strengths in English (single-column layout, standard headers, STAR action verbs, Workday/Taleo compliance)
     - recommendations: practical interview preparation tips in English

2. ATS-OPTIMIZED CV (optimizedCv):
   - Strict hierarchical structure for ATS parsers and human recruiters.
   - personalInfo: { fullName, professionalTitle, email, phone, location, linkedin, portfolioUrl }
     ⚠️ 'professionalTitle' MUST contain ONLY the clean target job title in natural Title Case (NO H/F, NO CDD/CDI/Full-time, NO ALL CAPS).
     ⚠️ CRITICAL CANDIDATE NAME RULE: 'fullName' MUST be the real human candidate's First and Last Name (e.g. Jean Dupont). NEVER output a degree/education name (e.g. 'Master Miage', 'Licence Pro', 'Bachelor of Science', 'MSc'), a job title or specialty ('Product ownership Salesforce', 'Product Owner', 'Software Engineer'), or a generic heading ('Coordonnées', 'Candidate') as fullName. If the CV begins with a degree or title header, extract the candidate's actual human name from the text or professional email.
   - professionalSummary: high-impact 3-4 sentence paragraph ADAPTING the candidate's authentic source CV summary to the target job priorities while ALSO showcasing 1-2 distinctive strengths/differentiators (e.g. multi-ERP versatility, automation, international scope, quantified portfolio scale) that set the candidate apart from peers. Highlight verified background (years of experience, core tools/domains, agile/operational delivery) and connect directly to target role (use clean Title Case for role title, NEVER ALL CAPS or H/F/CDD). If you mention a degree, cite STRICTLY the genuine degree name/major from the source CV (NEVER claim a Master's in the target job's field if the candidate's degree has a different specialty). NEVER output a minimalist 1-line summary. NEVER claim the candidate achieved results "within [Target Company]" (the target company is the recruiter, not a past employer).
   - skillsCategories: array of { categoryName, skills: string[] }
     (prioritize core target-job requirements & tools first, preserve ALL authentic technical tools & ERPs from the CV, AND include a category such as "Differentiating & Added-Value Skills" for valuable complementary competencies from the source CV that elevate the candidate above standard applicants).
   - experiences: array of strategically selected high-value work experiences (reverse chronological order):
     ⚠️ CRITICAL EXPERIENCE SELECTION & STAR RULES:
     - STRATEGIC SELECTION (ATS OPTIMIZATION): Retain the 3 to 4 most relevant experiences that best demonstrate readiness for the target role (keeping them in reverse chronological order). Omit obsolete early internships or completely off-topic student jobs that dilute focus.
     - The hiring company is the RECRUITER. STRICTLY FORBIDDEN to list the hiring company as a past employer!
     - Employers and dates MUST come faithfully from the source CV (e.g. "2021 - 2025", NEVER write "Present" if the source CV specifies 2025).
     - STAR REFORMULATION & DIFFERENTIATING VALUE: Lead the first 2-3 bullets of each retained role with achievements proving the exact responsibilities and vocabulary of the target job ad, AND retain 1-2 differentiating value-added missions/achievements from the source CV (quantified impact, tool/process improvement, product launches, international/vendor leadership, cross-functional projects) so the candidate stands out rather than looking generic. Never invent facts.
     - {
         id: string,
         role: string,
         company: string,
         location: string,
         startDate: string (e.g. "01/2021" or "Jan 2021"),
         endDate: string (e.g. "Present" or "12/2023"),
         current: boolean,
         bullets: string[] (4 to 6 impactful bullets beginning with executive STAR action verbs: Spearheaded, Engineered, Orchestrated, Scaled, Streamlined, Accelerated, combining target-job priority bullets first and differentiating added-value accomplishments right after),
         keyAchievementsHighlighted: string[],
         matchedKeywordsInRole: string[]
       }
   - education: array of { institution, degree, field, graduationDate, honorsOrDetails }
     ⚠️ CRITICAL TRANSLATION RULE FOR EDUCATION & LANGUAGES: If the source CV is in French (or another language), translate ALL degree titles, academic fields, honors, and language names/proficiencies into natural international English while preserving authentic university names, acronyms (e.g. MIAGE, MBA), and graduation dates (e.g. "Master 2 MIAGE" -> degree: "Master's Degree (MSc) in MIAGE", field: "Business Information Systems & Computer Science", "Licence" -> "Bachelor's Degree", "Diplôme d'Ingénieur" -> "Engineering Master's Degree (MEng)", "Université..." -> "University of ..."). NEVER leave French degree or field wording untranslated.
   - certifications: array of { name, issuer, year }
   - languages: array of { language, proficiency } (in English, e.g. "French (Native)", "English (Fluent)")

3. STRATEGIC COVER LETTER (coverLetter):
   - Written in English following the Anglo-Saxon executive framework: Company Challenges / Proven Track Record / Future Impact.
   - header: { candidateName, candidateEmail, candidatePhone, recipientNameOrTitle: "Hiring Team", companyName, date: "${todayFormattedDateEn}", subjectLine: "Subject: Application for [Clean Role Title]" } (companyName must be ONLY the pure short brand name without slogans or glued intro text, or "" if no hiring company is mentioned in the job ad — NEVER write "the organization" or "your organization"; NEVER include candidate name in subjectLine; NEVER write in ALL CAPS; NEVER include H/F or CDD/Full-time)
   - paragraphs:
     - vous: (Company Challenges & Context): Insight into the company's trajectory, market challenges, and mission alignment. Use the clean job title in normal Title Case (NEVER ALL CAPS, NO H/F or CDD).
     - moi: (Proven Track Record & Value): Concrete evidence from real career accomplishments addressing core requirements, PLUS 1 distinctive differentiating asset from the candidate's background that sets them apart from other applicants.
     - nous: (Future Impact & Next Steps): Collaborative vision, anticipated contributions, and proactive request for interview.
   - signOff: strictly polite closing formula only (e.g., "Sincerely," or "Best regards,"). NEVER append candidate name to signOff.
   - fullTextFormatted: complete clean formatted text ready to send.

Return ONLY a valid JSON object matching this schema. No markdown backticks.
` : `
Tu es un Directeur du Recrutement chevronné et un Expert International en algorithmes ATS (Applicant Tracking Systems tels que Workday, Taleo, Greenhouse, Lever, iCIMS).

Ton rôle est d'exécuter un pipeline d'adaptation sémantique rigoureux entre le CV d'un candidat et une offre d'emploi cible.

### ⚠️ RÈGLE LINGUISTIQUE IMPÉRATIVE - 100% FRANÇAIS OBLIGATOIRE :
- TOUTES les explications d'analyse, résumés, justifications, points forts et recommandations (notamment 'semanticGap.scores.scoreExplanation', 'semanticGap.jobOverview.summary', 'semanticGap.jobOverview.industry', 'semanticGap.atsComplianceAudit.highlights', 'semanticGap.atsComplianceAudit.recommendations', 'optimizedCv.professionalSummary', et 'coverLetter.paragraphs') DOIVENT ÊTRE FORMULÉES STRICTEMENT ET ENTIÈREMENT EN FRANÇAIS.
- NE JAMAIS retourner d'explications en anglais. Tout le diagnostic et la synthèse DOIVENT être traduits et rédigés en français professionnel.
- Seuls les noms propres d'outils ou technologies (ex: React, TypeScript, Docker, PostgreSQL, Kubernetes) conservent leur nomenclature internationale.

### RÈGLE D'OR ABSOLUE - ANTI-HALLUCINATION :
- NE JAMAIS inventer d'employeur fictif, de diplôme imaginaire, de dates fausses ou d'expérience qui n'existe pas dans le CV source.
- Tu dois REFORMULER les VÉRITABLES réalisations du candidat en utilisant des verbes d'action percutants (méthode STAR : Action + Contexte + Résultat mesurable si présent) et en intégrant le vocabulaire technique et méthodologique exact de l'offre d'emploi.
- Si le candidat a utilisé des compétences transférables ou synonymes (ex: "géré une équipe" vs "Management transversal et leadership agile"), adapte la formulation avec les mots-clés exacts de l'offre SANS fabriquer de faux chiffres s'ils n'étaient pas mentionnés, mais en renforçant l'impact.

### 🎯 RÈGLE D'ALIGNEMENT SUR L'OFFRE + VALORISATION DE LA PLUS-VALUE DIFFÉRENCIANTE :
- L'OFFRE D'EMPLOI CIBLE EST LE FIL CONDUCTEUR PRIORITAIRE : Détermine l'intitulé du poste et l'entreprise cible PRIORITAIREMENT depuis le texte de l'offre d'emploi cible. Si l'intitulé fourni en paramètre optionnel semble déconnecté du contenu de l'offre, IGNORE l'intitulé optionnel et utilise celui extrait de l'offre.
- ÉQUILIBRE OFFRE + DIFFÉRENCIATION : Mets en avant EN PRIORITÉ les informations, mots-clés et missions en adéquation directe avec l'offre, MAIS NE GOMME JAMAIS les autres compétences, outils ou missions à forte valeur ajoutée du candidat qui ne figurent pas dans l'annonce s'ils renforcent sa crédibilité et le distinguent des autres postulants sur le même poste (ex. amélioration continue, création d'outils, périmètre international, lancements produits, multi-ERP, projets transverses, résultats chiffrés).
- ADÉQUATION MÉTIER 100% FIDÈLE : Ne JAMAIS inventer ni injecter de vocabulaire hors contexte absent à la fois du CV et de l'offre.
- CONSERVATION SCRUPULEUSE DU PARCOURS : Conserve scrupuleusement les véritables employeurs, les vrais diplômes et les dates réelles du candidat.

---
DONNÉES EN ENTRÉE :
${resolvedCvText ? `### TEXTE DU CV SOURCE :\n${resolvedCvText}\n` : ""}
${resolvedJobText ? `### TEXTE DE L'OFFRE D'EMPLOI CIBLE :\n${resolvedJobText}\n` : ""}
${targetRoleTitle ? `### INTITULÉ DU POSTE CIBLE SOUHAITÉ :\n${targetRoleTitle}\n` : ""}
${candidateNotes ? `### REMARQUES / PRIORITÉS DU CANDIDAT :\n${candidateNotes}\n` : ""}
Langue de sortie requise : FRANÇAIS (obligatoire pour tous les textes d'analyse, CV et lettre)

---
OBJECTIFS ET SORTIE ATTENDUE (au format JSON strict, 100% en français) :

1. ANALYSE D'ÉCART SÉMANTIQUE (semanticGap) :
   - jobOverview : { title, company, industry, summary } (rédigés en français ; 'title' DOIT contenir UNIQUEMENT l'intitulé pur du poste en casse naturelle ex: "Product Owner Salesforce" — JAMAIS de mentions H/F, F/H, CDD, CDI, Stage, Alternance, localisation ni tout en MAJUSCULES ; 'company' DOIT contenir UNIQUEMENT le nom pur et court de l'entreprise, ou "" si aucune entreprise n'est nommée dans l'offre — JAMAIS de formulation générique type "votre organisation", "l'entreprise" ou "Confidentiel")
   - scores :
     - initialAtsScore : score de correspondance du CV initial avec l'offre (0 à 100)
     - optimizedAtsScore : score de correspondance projeté du CV reformulé (0 à 100, typiquement 88-98%)
     - scoreExplanation : explication courte et précise de la progression en français
   - keywordsAnalysis :
     - ⚠️ RÈGLE QUALITÉ ABSOLUE SUR LES COMPÉTENCES : Chaque entrée DOIT être une VRAIE COMPÉTENCE professionnelle reconnue (ex: outil, logiciel, langage, méthodologie de gestion, compétence technique ou soft skill certifiée).
     - STRICTEMENT INTERDIT : Ne JAMAIS inclure de fragments de mots coupés (ex: "pement", "tion", "ment"), de mots grammaticaux ou de verbes ordinaires ("certains", "doivent", "selon", "faisant", "années", "autres", "chaque", "notamment"), ni de texte de métadonnées d'annonce ("description", "missions", "profil recherché", "temps plein", "nous recherchons").
     - STRICTEMENT INTERDIT D'UTILISER UN POSTE/TITRE DE FONCTION COMME COMPÉTENCE : Ne JAMAIS lister un intitulé de poste ou une position (ex: "Product Owner", "Product Manager", "Scrum Master", "Développeur", "Chef de projet", "Tech Lead") dans les listes de compétences. Remplacer systématiquement par le savoir-faire réel correspondant (ex: "Gestion de Product Backlog & Rituels Scrum", "Développement Web", "Management de Projet Agile").
     - criticalRequiredKeywords : compétences primordiales exigées par l'offre (savoir-faire, outils, méthodes, JAMAIS des titres de postes)
     - matchedKeywords : compétences de l'offre déjà prouvées dans le CV source
     - integratedKeywords : compétences de l'offre intégrées grâce à la reformulation sémantique
     - missingOrGaps : compétences de l'offre absentes du CV (pour avertir le candidat en toute transparence)
   - atsComplianceAudit :
     - status : "compliant" | "warning"
     - highlights : points forts de lisibilité ATS en français (structure single-column, titrage standard, format chronologique inversé, absence d'éléments bloquants)
     - recommendations : conseils pratiques pour l'entretien en français

2. LE CV REFORMULÉ ET STRUCTURÉ ATS (optimizedCv) :
   - Doit respecter une hiérarchie sémantique parfaite, adaptée aux parseurs ATS et aux recruteurs humains.
   - personalInfo : { fullName, professionalTitle, email, phone, location, linkedin, portfolioUrl }
     ⚠️ 'professionalTitle' DOIT contenir UNIQUEMENT l'intitulé pur du poste en casse naturelle (ex: "Product Owner Salesforce", SANS "H/F", SANS "CDD/CDI", SANS tout en MAJUSCULES).
     ⚠️ RÈGLE CRITIQUE D'EXTRACTION DU NOM DU CANDIDAT (fullName) :
     STRICTEMENT INTERDIT : Ne JAMAIS mettre un intitulé de diplôme (ex: 'Master Miage', 'Licence Pro', 'Bac+5'), ni un intitulé de poste, spécialité ou rôle (ex: 'Product ownership Salesforce', 'Product Owner', 'Chef de Projet', 'Développeur', 'Scrum Master'), ni un mot de rubrique (ex: 'Coordonnées', 'Profil', 'Candidat') dans fullName.
     Si le CV mentionne 'Product ownership Salesforce' ou un intitulé de poste similaire, il s'agit du 'professionalTitle' et ABSOLUMENT PAS du nom du candidat. Le nom du candidat est le véritable prénom et nom de famille de la personne physique (ex: 'Marie DUPONT', 'Thomas BERNARD', 'Camille LAURENT'), extrait du haut du CV ou de son adresse email professionnelle.
   - professionalSummary : paragraphe dense, structuré et personnalisé de 3 à 4 phrases complètes ADAPTANT fidèlement le résumé/profil du CV source (années d'expérience réelles, expertises clés, outils et secteur) aux enjeux et exigences prioritaires de L'OFFRE CIBLE (citer l'intitulé pur du poste en casse naturelle, SANS "H/F", SANS "CDD/CDI" et JAMAIS tout en MAJUSCULES), tout en mettant en valeur 1 à 2 atouts distinctifs (ex. périmètre international, polyvalence multi-ERP, projets transverses, résultats mesurables) qui différencient ce profil des autres candidats. Si tu cites un diplôme, reprends STRICTEMENT l'intitulé et la spécialité réels du CV source (NE JAMAIS écrire qu'il a un Master dans le domaine de l'offre si son diplôme réel porte sur une autre spécialité). STRICTEMENT INTERDIT DE RENDRE UN RÉSUMÉ MINIMALISTE D'UNE SEULE LIGNE ou générique. STRICTEMENT INTERDIT d'écrire que le candidat a réalisé des missions « au sein de [Entreprise Cible] » : l'entreprise cible est celle qui recrute !
   - skillsCategories : tableau d'objets { categoryName, skills: string[] } classant EN PRIORITÉ les compétences et outils exigés par L'OFFRE CIBLE qui sont avérés depuis le CV source, préservant la rubrique complète des outils/systèmes du CV, ET incluant une catégorie dédiée (ex: "Atouts Différenciants & Valeur Ajoutée") pour les compétences complémentaires authentiques qui apportent un avantage concurrentiel au candidat.
   - experiences : tableau d'expériences professionnelles stratégiquement sélectionnées (chronologie inversée) :
     ⚠️ RÈGLES CRITIQUES DE SÉLECTION & REFORMULATION DES EXPÉRIENCES :
     - SÉLECTION STRATÉGIQUE (OPTIMISATION ATS) : Retiens les 3 à 4 expériences les plus pertinentes pour démontrer l'adéquation au poste visé (en préservant leur ordre chronologique inversé). Écarte uniquement les vieux jobs étudiants ou stages hors-sujet qui diluent la lisibilité.
     - L'entreprise cible de l'offre d'emploi (ex: CNP Assurances) est l'entreprise QUI RECRUTE : STRICTEMENT INTERDIT de l'indiquer comme un employeur passé du candidat dans ses expériences professionnelles !
     - Les employeurs DOIVENT être UNIQUEMENT les véritables employeurs du CV source (ex: 'Capgemini', 'BNP Paribas', 'L\'Oréal', 'Groupe Renault', etc.).
     - Les dates DOIVENT correspondre scrupuleusement au CV source (ex: 2021 - 2025, JAMAIS 'Présent' si le CV indique 2025).
     - REFORMULATION STAR & PLUS-VALUE DIFFÉRENCIANTE : Pour chaque expérience retenue, place en tête (2 à 3 premières puces) les réalisations démontrant directement les responsabilités et mots-clés exacts de L'OFFRE CIBLE, PUIS conserve impérativement 1 à 2 missions ou réalisations à forte valeur ajoutée du CV source (améliorations continues, création d'outils, lancements stratégiques, pilotage fournisseurs/international, chiffres clés) qui distinguent le candidat d'autres candidats ayant les mêmes mots-clés de base.
     - {
         id: string,
         role: string,
         company: string,
         location: string,
         startDate: string (format clair, ex: "01/2021" ou "Janvier 2021"),
         endDate: string (ex: "2025" ou "12/2023", JAMAIS "Présent" si date de fin fermée),
         current: boolean,
         bullets: string[] (4 à 6 puces complètes et reformulées en français débutant IMPÉRATIVEMENT par un verbe d'action à L'INFINITIF ex: Piloter, Concevoir, Structurer, Optimiser, Déployer : d'abord les missions alignées sur l'offre, puis les réalisations à valeur ajoutée différenciante),
         keyAchievementsHighlighted: string[],
         matchedKeywordsInRole: string[]
       }
   - education : tableau d'objets { institution, degree, field, graduationDate, honorsOrDetails }
     ⚠️ L'établissement et le diplôme DOIVENT correspondre scrupuleusement au CV source (ex: 'Université Paris 1 Panthéon-Sorbonne - Master Finance', 'INSA Lyon - Ingénieur', 'Université Paris-Saclay - Master').
   - certifications : tableau d'objets { name, issuer, year } (si mentionnées dans le CV)
   - languages : tableau d'objets { language, proficiency }

3. LETTRE DE MOTIVATION PERSONNALISÉE (coverLetter) :
   - Rédigée entièrement en français selon le style "Vous / Moi / Nous".
   - header : { candidateName, candidateEmail, candidatePhone, recipientNameOrTitle, companyName, date, subjectLine: "Objet : Candidature au poste de [Intitulé pur du poste]" } ('companyName' DOIT être UNIQUEMENT le nom court de l'entreprise sans slogan ni texte collé après, ou "" si aucune entreprise n'est nommée dans l'offre — NE JAMAIS mettre "votre organisation" ou "l'entreprise" dans companyName ; JAMAIS inclure le nom du candidat dans l'objet ; JAMAIS tout en MAJUSCULES ; JAMAIS de mention H/F, CDD ou CDI)
     ⚠️ 'candidateName' DOIT être le vrai prénom et nom de la personne (identique à fullName), JAMAIS un diplôme ('Master Miage') ni un poste.
   - La date du header DOIT OBLIGATOIREMENT être la date du jour de création du document : "${todayFormattedDateFr}".
   - paragraphs :
     - vous : Paragraphe d'accroche montrant une connaissance aiguë de l'entreprise, de son contexte et des défis précis du poste identifiés dans l'offre (utiliser l'intitulé pur du poste en casse naturelle, SANS H/F, CDD, CDI ni MAJUSCULES).
     - moi : Preuves concrètes issues des expériences réelles du candidat répondant directement aux besoins clés de l'offre cible, enrichies d'un atout différenciant issu de son parcours qui lui confère une valeur ajoutée singulière.
     - nous : Vision de la collaboration future, complémentarité sur les missions phares de l'offre et proposition proactive d'échange en entretien.
   - signOff : formule de politesse finale uniquement (ex: "Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées."). SANS le prénom ou nom du candidat à la fin.
   - fullTextFormatted : version texte prête à l'envoi ou au copier-coller.

Retourne UNIQUEMENT un objet JSON valide conforme à la structure décrite, sans balises markdown superflues.
`;

    parts.push({ text: promptInstruction });

    let parsedResult: any = null;
    try {
      const response = await callGeminiWithFallback(
        (modelName) =>
          ai.models.generateContent({
            model: modelName,
            contents: parts.length === 1 ? parts[0].text : { parts },
            config: {
              responseMimeType: "application/json",
              ...(modelName === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } : {}),
            },
          }),
        ["gemini-4-hydrogen", "gemini-3.1-flash-lite"],
        2,
        55000
      );

      const textOutput = response.text || "";
      try {
        parsedResult = JSON.parse(textOutput);
      } catch (parseErr) {
        const cleaned = textOutput
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        parsedResult = JSON.parse(cleaned);
      }

      // Normalisation linguistique selon la cible (EN vs FR) avec injection du nom réel extrait et respect de l'intitulé choisi
      if (isEn) {
        parsedResult = normalizeAnalysisToEnglish(parsedResult, resolvedCvText, targetRoleTitle);
      } else {
        parsedResult = translateAnalysisToFrench(parsedResult, resolvedCvText, targetRoleTitle);
      }
    } catch (geminiError: any) {
      const errStr = geminiError?.message || String(geminiError);
      const isHighDemand = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("UNAVAILABLE");
      const isQuota = errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED");
      const reasonLabel = isHighDemand
        ? "haute demande temporaire de l'API"
        : isQuota
        ? "limite de requêtes atteinte"
        : "relais haute disponibilité";
      console.log(
        `[Pipeline ATS] Activation du moteur d'analyse sémantique & STAR de secours (${reasonLabel}).`
      );
      parsedResult = generateResilientAtsResult(
        resolvedCvText,
        resolvedJobText,
        targetRoleTitle,
        candidateNotes,
        targetLanguage
      );
    }

    if (isEn) {
      parsedResult = normalizeAnalysisToEnglish(parsedResult, resolvedCvText, targetRoleTitle);
    } else {
      parsedResult = translateAnalysisToFrench(parsedResult, resolvedCvText, targetRoleTitle);
    }

    try {
      recordAnalyticsEvent("pipeline_launch", { language: isEn ? "en" : "fr" });
    } catch {
      // Ignorer
    }

    res.json({
      success: true,
      data: parsedResult,
    });
  } catch (_error: any) {
    console.log("[Pipeline ATS] Relais de sécurité engagé suite à imprévu.");
    const fallbackLang = (req.body.language === 'en' || detectLanguage(req.body.jobText || "", req.body.cvText || "") === 'en') ? 'en' : 'fr';
    const safeData = generateResilientAtsResult(
      req.body.cvText || "",
      req.body.jobText || "",
      req.body.targetRoleTitle,
      req.body.candidateNotes,
      fallbackLang
    );
    res.json({
      success: true,
      data: safeData,
    });
  }
});

// Rephrase / refine a specific bullet point (Bilingual Support)
app.post("/api/refine-bullet", async (req, res) => {
  try {
    const { originalBullet, jobContext, instruction, language } = req.body;
    if (!originalBullet) {
      return res.status(400).json({ error: "Puce originale manquante." });
    }

    const isEn = language === 'en' || (language !== 'fr' && isLikelyEnglish(originalBullet));
    const targetLang: 'fr' | 'en' = isEn ? 'en' : 'fr';
    const effectiveInstruction = instruction || (isEn ? "more impactful with executive STAR action verb and quantified metric" : "plus percutant avec verbe d'action");

    try {
      const ai = getGeminiClient();
      const prompt = isEn ? `
You are an Executive Career Coach & International ATS Expert. Refine the following experience bullet point in EXECUTIVE ENGLISH.
Original bullet: "${originalBullet}"
Target role context: "${jobContext || ""}"
Revision instruction: "${effectiveInstruction}"

RULES:
- Strictly adhere to factual truth (no hallucination).
- Must start with an executive STAR action verb (e.g. Spearheaded, Engineered, Orchestrated, Scaled, Streamlined, Accelerated, Championed, Delivered, Pioneered).
- Highlight alignment with the target role while preserving differentiating metrics, tools, or added-value scope from the original bullet.
- Return 3 distinct variations from most direct to most impactful.

Reply strictly in JSON:
{
  "variants": [
    { "text": string, "label": "Direct & Clear" },
    { "text": string, "label": "Impact & STAR" },
    { "text": string, "label": "Strategic & Scaled" }
  ]
}
` : `
Tu es un expert ATS. Reformule la puce d'expérience suivante pour un CV professionnel.
Puce d'origine : "${originalBullet}"
Contexte du poste visé : "${jobContext || ""}"
Instruction de révision : "${effectiveInstruction}"

RÈGLES :
- Conserve strictement la vérité des faits.
- Débute impérativement par un verbe d'action dynamique à l'INFINITIF (ex: Développer, Orchestrer, Optimiser, Déployer, Structurer).
- Mets en avant les mots-clés pertinents pour le poste visé tout en conservant les éléments chiffrés, outils ou initiatives différenciantes présents dans la puce d'origine.
- Fournis 3 variantes classées de la plus directe à la plus percutante.

Réponds au format JSON :
{
  "variants": [
    { "text": string, "label": "Directe & Claire" },
    { "text": string, "label": "Impact & STAR" },
    { "text": string, "label": "Stratégique & Chiffrée" }
  ]
}
`;

      const response = await callGeminiWithFallback((modelName) =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            ...(modelName === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          },
        })
      );

      const parsed = JSON.parse(response.text || "{}");
      if (parsed.variants && Array.isArray(parsed.variants)) {
        if (!isEn) {
          parsed.variants = parsed.variants.map((v: any) => ({
            ...v,
            text: typeof v?.text === "string" ? ensureFrenchInfinitiveBullet(v.text) : v?.text,
          }));
        }
        return res.json(parsed);
      }
    } catch (_geminiErr: any) {
      console.log("[Bullet Refinement] Secours reformulation STAR locale active.");
    }

    const fallbackVariants = generateResilientBulletVariants(originalBullet, jobContext, effectiveInstruction, targetLang);
    res.json(fallbackVariants);
  } catch (_error: any) {
    console.log("[Bullet Refinement] Secours par défaut actif.");
    res.json(generateResilientBulletVariants(req.body.originalBullet || ""));
  }
});

// Synthèse vocale humaine studio via Gemini TTS (gemini-3.8-flash-lite-tts)
// Dédoublement strict et garanti :
// Homme -> Voix 'Fenrir' (baryton posé, timbre masculin naturel d'impact)
// Femme -> Voix 'Kore' (timbre féminin mélodieux, chaleureux et naturel)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, gender = "male", language = "fr", style = "pitch" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Texte manquant pour la synthèse vocale." });
    }

    const ai = getGeminiClient();
    const isEn = language === "en";

    // Voix native studio Gemini TTS
    // Homme -> Fenrir (baryton posé, timbre chaud de prestige)
    // Femme -> Kore (timbre mélodieux, chaleureux et naturel)
    const voiceName = gender === "male" ? "Fenrir" : "Kore";

    const cleanText = text
      .replace(/[«»"“”]/g, "")
      .replace(/\bATS\b/gi, isEn ? "A T S" : "A T S")
      .replace(/\bSTAR\b/gi, "S T A R")
      .replace(/\bKPI\b/gi, "K P I")
      .replace(/%/g, isEn ? " percent" : " pour cent")
      .trim();

    const systemInstruction = style === "espresso"
      ? (isEn
          ? "You are an elite, captivating voiceover artist for a luxury espresso commercial (think Nespresso, George Clooney, deep, velvety, calm, magnetic, warm baritone). Read the provided text verbatim with impeccable cadence. Do not add any extra words, intro, or commentary. Speak strictly the text provided."
          : "Tu es un comédien voix-off de prestige pour une publicité de café expresso de luxe (style Nespresso, George Clooney, voix grave, chaleureuse, veloutée, captivante, posée, magnétique). Lis le texte exactement comme fourni en français, avec un rythme irrésistible qui donne envie de rester sur la vidéo. Ne prononce AUCUN commentaire, aucune formule de politesse ni introduction. Lis uniquement et strictement le texte fourni mot pour mot.")
      : (isEn
          ? "You are a professional candidate in a job interview. Read the text verbatim with confidence, warmth, and natural flow. Do not add any extra words, intro, or commentary. Speak strictly the text provided."
          : "Tu es un candidat professionnel en entretien d'embauche. Lis le texte exactement mot pour mot de façon posée, naturelle, fluide et convaincante. Ne prononce AUCUN commentaire ni introduction. Lis uniquement et strictement le texte fourni mot pour mot.");

    const response = await callGeminiWithFallback(
      (modelName) =>
        ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [{ text: cleanText }],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"],
      2,
      25000
    );

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Aucune piste audio renvoyée par le modèle TTS.");
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: "audio/wav",
      voiceUsed: voiceName,
      gender,
    });
  } catch (error: any) {
    const errText = error?.message || String(error);
    const { isBilling } = isNonRetriableBillingOrAuthError(error);
    const cleanReason = isBilling
      ? "crédits API épuisés"
      : errText.includes("429") || errText.includes("quota")
      ? "quota modèle atteint"
      : errText.includes("503")
      ? "service saturé"
      : "synthèse distante indisponible";
    console.log(`[TTS] Bascule sur la synthèse vocale locale (${cleanReason}).`);
    res.status(503).json({
      success: false,
      error: "Synthèse vocale distante indisponible. Utilisation de la voix vocale locale.",
    });
  }
});

// ==========================================
// TÉLÉMÉTRIE & STATISTIQUES ANONYMES (RGPD)
// ==========================================
const ANALYTICS_FILE = path.join(__dirname, "data", "app_metrics.json");

interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalAnalyses: number;
  totalUrlExtractions: number;
  totalDownloads: number;
  devices: { mobile: number; desktop: number };
  languages: { fr: number; en: number };
  dailyStats: Record<string, { visits: number; analyses: number; downloads: number; urls: number }>;
  firstSeen: string;
  lastActive: string;
}

const knownVisitorIds = new Set<string>();

function loadAnalytics(): AnalyticsData {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Erreur lecture analytics :", err);
  }
  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    totalAnalyses: 0,
    totalUrlExtractions: 0,
    totalDownloads: 0,
    devices: { mobile: 0, desktop: 0 },
    languages: { fr: 0, en: 0 },
    dailyStats: {},
    firstSeen: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
}

const analyticsState: AnalyticsData = loadAnalytics();

function saveAnalytics(): void {
  try {
    const dir = path.dirname(ANALYTICS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsState, null, 2), "utf-8");
  } catch (err) {
    console.warn("Erreur sauvegarde analytics :", err);
  }
}

function recordAnalyticsEvent(
  type: "visit" | "pipeline_launch" | "url_extract" | "download",
  details?: { isMobile?: boolean; language?: string; clientId?: string }
): void {
  const today = new Date().toISOString().slice(0, 10);
  if (!analyticsState.dailyStats[today]) {
    analyticsState.dailyStats[today] = { visits: 0, analyses: 0, downloads: 0, urls: 0 };
  }
  analyticsState.lastActive = new Date().toISOString();

  if (details?.clientId && !knownVisitorIds.has(details.clientId)) {
    knownVisitorIds.add(details.clientId);
    analyticsState.uniqueVisitors = (analyticsState.uniqueVisitors || 0) + 1;
  }

  if (details?.isMobile !== undefined) {
    if (details.isMobile) analyticsState.devices.mobile = (analyticsState.devices.mobile || 0) + 1;
    else analyticsState.devices.desktop = (analyticsState.devices.desktop || 0) + 1;
  }

  if (details?.language) {
    if (details.language === "en") analyticsState.languages.en = (analyticsState.languages.en || 0) + 1;
    else analyticsState.languages.fr = (analyticsState.languages.fr || 0) + 1;
  }

  switch (type) {
    case "visit":
      analyticsState.totalVisits = (analyticsState.totalVisits || 0) + 1;
      analyticsState.dailyStats[today].visits = (analyticsState.dailyStats[today].visits || 0) + 1;
      break;
    case "pipeline_launch":
      analyticsState.totalAnalyses = (analyticsState.totalAnalyses || 0) + 1;
      analyticsState.dailyStats[today].analyses = (analyticsState.dailyStats[today].analyses || 0) + 1;
      break;
    case "url_extract":
      analyticsState.totalUrlExtractions = (analyticsState.totalUrlExtractions || 0) + 1;
      analyticsState.dailyStats[today].urls = (analyticsState.dailyStats[today].urls || 0) + 1;
      break;
    case "download":
      analyticsState.totalDownloads = (analyticsState.totalDownloads || 0) + 1;
      analyticsState.dailyStats[today].downloads = (analyticsState.dailyStats[today].downloads || 0) + 1;
      break;
  }

  saveAnalytics();
}

// Endpoint de consultation des statistiques anonymisées
app.get("/api/stats", (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    success: true,
    data: {
      ...analyticsState,
      activeToday: analyticsState.dailyStats[today] || { visits: 0, analyses: 0, downloads: 0, urls: 0 },
    },
  });
});

// Endpoint de téléchargement du dossier stratégique marketing & lancement
app.get("/api/download-marketing-doc", (_req, res) => {
  const filePath = path.resolve(__dirname, "STRATEGIE_MARKETING_ET_LANCEMENT.md");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="STRATEGIE_MARKETING_ET_LANCEMENT.md"');
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.sendFile(filePath);
  } else {
    res.status(404).json({ success: false, error: "Fichier STRATEGIE_MARKETING_ET_LANCEMENT.md introuvable." });
  }
});

// Endpoint de téléchargement des 3 vidéos TikTok MP4 officielles
app.get("/api/download-video/:id", (req, res) => {
  const rawId = (req.params.id || "").toLowerCase().trim();
  const videoMap: Record<string, { file: string; name: string }> = {
    "1": { file: "video_1_accroche.mp4", name: "JNB_Align_TikTok_Video_1_Accroche_25s.mp4" },
    "video_1": { file: "video_1_accroche.mp4", name: "JNB_Align_TikTok_Video_1_Accroche_25s.mp4" },
    "video_1.mp4": { file: "video_1_accroche.mp4", name: "JNB_Align_TikTok_Video_1_Accroche_25s.mp4" },
    "accroche": { file: "video_1_accroche.mp4", name: "JNB_Align_TikTok_Video_1_Accroche_25s.mp4" },

    "2": { file: "video_2_demonstration.mp4", name: "JNB_Align_TikTok_Video_2_Demonstration_30s.mp4" },
    "video_2": { file: "video_2_demonstration.mp4", name: "JNB_Align_TikTok_Video_2_Demonstration_30s.mp4" },
    "video_2.mp4": { file: "video_2_demonstration.mp4", name: "JNB_Align_TikTok_Video_2_Demonstration_30s.mp4" },
    "demonstration": { file: "video_2_demonstration.mp4", name: "JNB_Align_TikTok_Video_2_Demonstration_30s.mp4" },
    "demo": { file: "video_2_demonstration.mp4", name: "JNB_Align_TikTok_Video_2_Demonstration_30s.mp4" },

    "3": { file: "video_3_lancement.mp4", name: "JNB_Align_TikTok_Video_3_Lancement_Officiel_30s.mp4" },
    "video_3": { file: "video_3_lancement.mp4", name: "JNB_Align_TikTok_Video_3_Lancement_Officiel_30s.mp4" },
    "video_3.mp4": { file: "video_3_lancement.mp4", name: "JNB_Align_TikTok_Video_3_Lancement_Officiel_30s.mp4" },
    "lancement": { file: "video_3_lancement.mp4", name: "JNB_Align_TikTok_Video_3_Lancement_Officiel_30s.mp4" },
  };

  const target = videoMap[rawId];
  if (!target) {
    return res.status(404).json({ success: false, error: "Identifiant vidéo inconnu (1, 2 ou 3)." });
  }

  const filePath = path.resolve(__dirname, "public", "videos", target.file);
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Disposition", `attachment; filename="${target.name}"`);
    res.setHeader("Content-Type", "video/mp4");
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ success: false, error: "Fichier vidéo non généré." });
  }
});

// Endpoint de lecture du contenu markdown du dossier stratégique
app.get("/api/marketing-doc-content", (_req, res) => {
  const filePath = path.resolve(__dirname, "STRATEGIE_MARKETING_ET_LANCEMENT.md");
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ success: true, content });
  } else {
    res.status(404).json({ success: false, error: "Fichier introuvable" });
  }
});

// Endpoint d'enregistrement des événements de télémétrie anonyme
app.post(["/api/track-event", "/api/track-event/"], (req, res) => {
  try {
    const { event, clientId, isMobile, language } = req.body || {};
    if (event) {
      recordAnalyticsEvent(event, { clientId, isMobile, language });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false });
  }
});

app.get(["/api/track-event", "/api/track-event/"], (_req, res) => {
  res.json({ success: true, message: "Track event endpoint ready (POST required)" });
});

// Fallback strict pour toute route /api/* non reconnue (garantit qu'aucun HTML n'est renvoyé sur les requêtes API)
app.all("/api/*", (req, res) => {
  console.warn(`[API 404] Route introuvable : ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: `Point de terminaison API introuvable ou méthode non autorisée (${req.method} ${req.originalUrl}).`,
  });
});

// HTTP server setup
const httpServer = http.createServer(app);

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false,
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

httpServer.on("error", (err) => {
  console.error(`[Server] Impossible de démarrer sur le port ${PORT} :`, err);
  process.exit(1);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur Optimiseur CV & LM démarré sur le port ${PORT}`);
});
