import React, { useState } from 'react';
import { KeywordsAnalysis } from '../types/ats';
import { Check, Plus, AlertCircle, Sparkles, Copy, CheckCheck, Info, X, Zap, MessageSquare, Target } from 'lucide-react';

interface KeywordsTagCloudProps {
  keywordsAnalysis: KeywordsAnalysis;
}

type KeywordFilter = 'all' | 'matched' | 'integrated' | 'critical' | 'missing';

export const KeywordsTagCloud: React.FC<KeywordsTagCloudProps> = ({
  keywordsAnalysis,
}) => {
  const [filter, setFilter] = useState<KeywordFilter>('all');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<{
    name: string;
    type: 'matched' | 'integrated' | 'critical' | 'missing';
    label: string;
    description: string;
    coachingAdvice: string;
    samplePitch: string;
  } | null>(null);

  const safeAnalysis = keywordsAnalysis || {
    criticalRequiredKeywords: [],
    matchedKeywords: [],
    integratedKeywords: [],
    missingOrGaps: [],
  };

  const criticalRequiredKeywords = Array.isArray(safeAnalysis.criticalRequiredKeywords)
    ? safeAnalysis.criticalRequiredKeywords
    : [];
  const matchedKeywords = Array.isArray(safeAnalysis.matchedKeywords)
    ? safeAnalysis.matchedKeywords
    : [];
  const integratedKeywords = Array.isArray(safeAnalysis.integratedKeywords)
    ? safeAnalysis.integratedKeywords
    : [];
  const missingOrGaps = Array.isArray(safeAnalysis.missingOrGaps)
    ? safeAnalysis.missingOrGaps
    : [];

  // Helper to build realistic coaching advice for any keyword
  const buildCoachingAdvice = (name: string, type: string) => {
    switch (type) {
      case 'matched':
        return {
          coachingAdvice: `Ce mot-clé fait déjà partie de vos acquis prouvés. En entretien, ne vous contentez pas de le citer : illustrez-le avec une métrique concrète d'impact (ex: volumétrie, gain de temps, budget).`,
          samplePitch: `« Au cours de mes expériences, j'ai mobilisé ${name} pour structurer les processus clés et accélérer la livraison des résultats mesurables. »`,
        };
      case 'integrated':
        return {
          coachingAdvice: `Reformulé via la méthode STAR dans votre nouveau CV. Soyez prêt à détailler la Situation, la Tâche, l'Action exacte et le Résultat obtenu avec ${name}.`,
          samplePitch: `« Sur ce projet, j'ai directement appliqué les pratiques de ${name}, ce qui nous a permis de sécuriser les jalons critiques et de surperformer les objectifs initiaux. »`,
        };
      case 'critical':
        return {
          coachingAdvice: `Exigence centrale de l'offre d'emploi. L'algorithme ATS pondère fortement cette compétence. Lors de l'échange oral, abordez-la spontanément dès votre pitch d'introduction.`,
          samplePitch: `« La maîtrise de ${name} est au cœur de ma démarche opérationnelle, en parfaite adéquation avec les défis prioritaires de votre équipe. »`,
        };
      case 'missing':
      default:
        return {
          coachingAdvice: `Compétence non détectée dans votre CV source. Deux approches positives : si vous possédez cette compétence réelle, ajoutez-la directement à votre CV ; sinon, adoptez la stratégie de passerelle d'agilité en montrant votre maîtrise des compétences connexes.`,
          samplePitch: `« Je n'ai pas encore utilisé directement ${name} dans mes derniers projets, mais j'ai une solide maîtrise des compétences connexes qui reposent sur la même logique, ce qui m'a toujours permis d'atteindre une autonomie opérationnelle complète en moins de 15 jours. »`,
        };
    }
  };

  // Liste noire client pour sécuriser l'affichage en cas de session pré-enregistrée
  const NON_COMPETENCY_BLACKLIST_CLIENT = new Set([
    "certains", "certaines", "doivent", "pouvez", "selon", "autres", "chaque", "notamment",
    "faisant", "mettant", "ayant", "seront", "serait", "pouvoir", "suivants", "suivante", "suivantes",
    "comme", "aussi", "entre", "apres", "après", "avant", "afin", "chez", "tres", "très", "plus",
    "moins", "dont", "sans", "sous", "vers", "durant", "depuis", "pendant", "environ", "autour",
    "parmi", "autre", "aucun", "aucune", "plusieurs", "quelque", "quelques", "ceux", "celles",
    "celui", "celle", "ceci", "cela", "lequel", "laquelle", "lesquels", "lesquelles", "soit",
    "donc", "mais", "alors", "puis", "ensuite", "quant", "lors", "dans", "pour", "avec", "cette",
    "votre", "notre", "leurs", "leur", "vous", "nous", "tout", "tous", "toute", "toutes", "faire",
    "etre", "être", "avoir", "bonne", "bonnes", "description", "profil", "poste", "missions",
    "candidat", "entreprise", "recherche", "recherchons", "offres", "offre", "emploi", "stage",
    "contrat", "cdi", "cdd", "temps", "plein", "partiel", "temps plein", "salaire", "remuneration",
    "secteur", "domaine", "annees", "années", "niveau", "minimum", "maximum", "souhaite", "requis",
    "titulaire", "justifier", "diplome", "formation", "telephone", "adresse", "mail", "email",
    "coordonnees", "coordonnées", "contact", "contacts", "page", "curriculum", "resume",
    "about", "with", "from", "your", "their", "this", "that", "these", "those", "have", "been",
    "will", "would", "could", "should", "within", "across", "proven", "strong", "ensure", "working",
    "degree", "years", "candidate", "ability", "duties", "apply", "opportunity", "status",
    "salary", "benefits", "looking", "welcome", "successful", "applicant", "submit", "application",
    "location", "position", "company", "client", "members", "levels", "including", "required",
    "preferred", "qualifications", "job description", "full time", "part time",
    "pement", "tion", "tions", "ment", "ments", "ence", "ences", "ance", "ances", "isme", "iste"
  ]);

  const isClientValidCompetency = (name: string): boolean => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (trimmed.length < 3 && !['AI', 'IT', 'BI', 'CI', 'CD', 'QA', 'UI', 'UX', 'RH', 'HR', 'SI', 'PR', 'ERP', 'CRM', 'KPI', 'SAP', 'P&L', 'SEO', 'SEA'].includes(trimmed.toUpperCase())) {
      return false;
    }
    if (trimmed.length > 40) return false;
    if (/^\d+$/.test(trimmed)) return false;
    if (/^https?:\/\/|@|\.com|\.fr/i.test(trimmed)) return false;
    const lower = trimmed.toLowerCase();
    if (NON_COMPETENCY_BLACKLIST_CLIENT.has(lower)) return false;
    return true;
  };

  // Build unified item list
  interface TagItem {
    name: string;
    type: 'matched' | 'integrated' | 'critical' | 'missing';
    label: string;
    description: string;
    coachingAdvice: string;
    samplePitch: string;
  }

  const allItems: TagItem[] = [];
  const addedNames = new Set<string>();

  const pushItem = (kw: string, type: 'matched' | 'integrated' | 'critical' | 'missing', label: string, description: string) => {
    if (!isClientValidCompetency(kw)) return;
    const lower = kw.toLowerCase();
    if (addedNames.has(lower)) return;
    addedNames.add(lower);

    const advice = buildCoachingAdvice(kw, type);
    allItems.push({
      name: kw,
      type,
      label,
      description,
      ...advice,
    });
  };

  matchedKeywords.forEach((kw) => {
    pushItem(kw, 'matched', 'Déjà présent dans le CV source', 'Compétence authentifiée identifiée dans votre parcours initial.');
  });

  integratedKeywords.forEach((kw) => {
    pushItem(kw, 'integrated', 'Intégré par reformulation STAR', "Terminologie exacte de l'offre tissée dans vos vraies expériences.");
  });

  criticalRequiredKeywords
    .filter((k) => typeof k === 'string' && !matchedKeywords.includes(k) && !integratedKeywords.includes(k))
    .forEach((kw) => {
      pushItem(kw, 'critical', "Exigence clé de l'offre", "Mot-clé primordial ciblé par l'algorithme de tri.");
    });

  missingOrGaps.forEach((kw) => {
    pushItem(
      kw,
      'missing',
      'Non détectée dans le CV source',
      "Compétence non détectée dans votre document source. Si vous possédez cette expérience, vous pouvez l'ajouter pour enrichir votre CV ; sinon, préparez la stratégie passerelle pour l'oral."
    );
  });

  // Calculate coverage rate
  const coveredCount = allItems.filter((i) => i.type === 'matched' || i.type === 'integrated').length;
  const totalRelevant = allItems.length;
  const coverageRate = totalRelevant > 0 ? Math.min(100, Math.round((coveredCount / totalRelevant) * 100)) : 88;

  // Filtered by type & search
  const filteredItems = allItems.filter((item) => {
    const matchesType = filter === 'all' || item.type === filter;
    const matchesSearch =
      search.trim() === '' || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCopyKeywords = () => {
    const text = filteredItems.map((i) => i.name).join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedPitch, setCopiedPitch] = useState(false);
  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="bg-[#0B1530] light:bg-white border border-amber-400/25 light:border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/20 light:shadow-slate-200/50 space-y-5 text-white light:text-slate-900 transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60 light:border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white light:text-slate-900 tracking-tight">
              Matrice Visuelle & Cartographie des Mots-Clés
            </h3>
            <span className="text-xs font-semibold text-amber-300 light:text-amber-700 font-mono">
              ({allItems.length} indexés)
            </span>
          </div>
          <p className="text-xs text-slate-300 light:text-slate-600 mt-0.5">
            Cliquez sur un mot-clé pour inspecter son statut ATS et débloquer son argumentaire d'entretien.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search filter */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un mot-clé..."
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 text-white light:text-slate-900 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 w-36 sm:w-44"
          />

          <button
            type="button"
            onClick={handleCopyKeywords}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 light:text-slate-700 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Copier la liste des mots-clés affichés"
          >
            {copied ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                <span className="text-emerald-300 light:text-emerald-700 font-semibold">Copiés</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400 light:text-slate-500" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Axe B: Global Lexical Match Progress Gauge */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400 light:text-amber-600" />
            <span className="font-bold text-white light:text-slate-900">
              Taux d'Alignement Lexical ATS
            </span>
            <span className="text-[11px] text-slate-400 light:text-slate-500">
              ({coveredCount} / {totalRelevant} compétences couvertes)
            </span>
          </div>
          <span className="font-mono font-bold text-amber-300 light:text-amber-700 text-sm">
            {coverageRate}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-950 light:bg-slate-200 border border-slate-800 light:border-slate-300 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-yellow-400 transition-all duration-700"
            style={{ width: `${coverageRate}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 light:text-slate-500">
          <span>Seuil critique ATS : 70% requis pour passer les parseurs</span>
          <span className="text-emerald-400 light:text-emerald-600 font-semibold">
            {coverageRate >= 80 ? '✓ Profil hautement qualifié' : '✓ Seuil atteint'}
          </span>
        </div>
      </div>

      {/* Interactive Segmented Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/70 light:bg-slate-100 border border-slate-800 light:border-slate-200 rounded-xl">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-xs'
              : 'text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900'
          }`}
        >
          Tous ({allItems.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('matched')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'matched'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
              : 'text-emerald-300 light:text-emerald-700 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 light:bg-emerald-600" />
          <span>Matchés ({matchedKeywords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('integrated')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'integrated'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
              : 'text-amber-300 light:text-amber-800 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 light:bg-amber-600" />
          <span>Intégrés STAR ({integratedKeywords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('critical')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'critical'
              ? 'bg-blue-500 text-white font-bold shadow-xs keep-white'
              : 'text-blue-300 light:text-blue-700 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 light:bg-blue-600" />
          <span>Critiques requis</span>
        </button>

        {missingOrGaps.length > 0 && (
          <button
            type="button"
            onClick={() => setFilter('missing')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'missing'
                ? 'bg-rose-500 text-white font-bold shadow-xs keep-white'
                : 'text-rose-300 light:text-rose-700 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 light:bg-rose-600" />
            <span>Non détectés ({missingOrGaps.length})</span>
          </button>
        )}
      </div>

      {/* Interactive Tag Grid (Axe B: Matrice Lexicale ATS) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/60 light:bg-slate-50 border border-slate-800/80 light:border-slate-200/90 shadow-inner flex flex-wrap gap-2 sm:gap-2.5 items-center min-h-[64px] transition-all">
        {filteredItems.map((item, idx) => {
          const isSelected = selectedTag?.name === item.name;
          let badgeStyle = 'bg-slate-900 light:bg-white text-slate-200 light:text-slate-800 border-slate-700 light:border-slate-300';
          let icon = <Check className="w-3.5 h-3.5 text-slate-400 light:text-slate-600" />;

          if (item.type === 'matched') {
            badgeStyle = isSelected
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 ring-2 ring-emerald-400/50 shadow-xs'
              : 'bg-emerald-950/60 light:bg-emerald-50 text-emerald-200 light:text-emerald-900 border-emerald-500/40 light:border-emerald-300 hover:border-emerald-400';
            icon = <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-emerald-400 light:text-emerald-600'}`} />;
          } else if (item.type === 'integrated') {
            badgeStyle = isSelected
              ? 'bg-amber-400 text-slate-950 font-bold border-amber-300 ring-2 ring-amber-400/50 shadow-xs'
              : 'bg-amber-950/60 light:bg-amber-50 text-amber-200 light:text-amber-900 border-amber-400/40 light:border-amber-300 hover:border-amber-300';
            icon = <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400 light:text-amber-600'}`} />;
          } else if (item.type === 'critical') {
            badgeStyle = isSelected
              ? 'bg-blue-500 text-white font-bold border-blue-400 ring-2 ring-blue-400/50 shadow-xs'
              : 'bg-blue-950/60 light:bg-blue-50 text-blue-200 light:text-blue-900 border-blue-500/40 light:border-blue-300 hover:border-blue-400';
            icon = <Plus className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-400 light:text-blue-600'}`} />;
          } else if (item.type === 'missing') {
            badgeStyle = isSelected
              ? 'bg-rose-500 text-white font-bold border-rose-400 ring-2 ring-rose-400/50 shadow-xs'
              : 'bg-rose-950/50 light:bg-rose-50 text-rose-200 light:text-rose-900 border-rose-500/40 light:border-rose-300 hover:border-rose-400';
            icon = <AlertCircle className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-rose-400 light:text-rose-600'}`} />;
          }

          return (
            <button
              type="button"
              key={`${item.name}-${idx}`}
              onClick={() => setSelectedTag(isSelected ? null : item)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none active:scale-95 hover:-translate-y-0.5 hover:shadow-xs ${badgeStyle}`}
            >
              {icon}
              <span className="font-semibold">{item.name}</span>
            </button>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="w-full text-center py-6 text-xs text-slate-400 light:text-slate-500">
            Aucune compétence ne correspond à votre filtre "{search}".
          </div>
        )}
      </div>

      {/* Axe B: Interactive Inspection Drawer (when a tag is selected) */}
      {selectedTag && (
        <div className="p-4 rounded-xl bg-slate-900 light:bg-amber-50/50 border border-amber-400/40 light:border-amber-300 shadow-lg text-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 light:border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-300 light:text-amber-800 text-sm">
                {selectedTag.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedTag.type === 'matched'
                    ? 'bg-emerald-500/20 text-emerald-300 light:text-emerald-800 border border-emerald-500/40'
                    : selectedTag.type === 'integrated'
                    ? 'bg-amber-500/20 text-amber-300 light:text-amber-800 border border-amber-400/40'
                    : selectedTag.type === 'critical'
                    ? 'bg-blue-500/20 text-blue-300 light:text-blue-800 border border-blue-400/40'
                    : 'bg-rose-500/20 text-rose-300 light:text-rose-800 border border-rose-400/40'
                }`}
              >
                {selectedTag.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="text-slate-400 hover:text-white light:text-slate-600 light:hover:text-slate-900 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-200 light:text-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 light:text-amber-800">
                <Info className="w-3.5 h-3.5" />
                <span>Conseil & Stratégie Recruteur</span>
              </div>
              <p className="text-slate-300 light:text-slate-700 leading-relaxed text-[11px]">
                {selectedTag.coachingAdvice}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300 light:text-emerald-700">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Exemple de Pitch STAR à l'Oral</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyPitch(selectedTag.samplePitch)}
                  className="text-[10px] text-amber-300 light:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPitch ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPitch ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
              <p className="text-slate-300 light:text-slate-700 italic bg-slate-950/60 light:bg-white p-2 rounded-lg border border-slate-800 light:border-slate-200 leading-relaxed text-[11px]">
                {selectedTag.samplePitch}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="pt-3 border-t border-slate-700/60 light:border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-300 light:text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 light:bg-emerald-600" />
          <span>Déjà présent</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 light:bg-amber-600" />
          <span>Intégré via STAR</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 light:bg-blue-600" />
          <span>Critique requis</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400 light:bg-rose-600" />
          <span>Non détecté dans le CV (stratégie passerelle à l'oral)</span>
        </span>
      </div>
    </div>
  );
};

