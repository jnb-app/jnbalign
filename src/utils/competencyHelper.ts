/**
 * competencyHelper.ts
 * Utilitaires stricts de distinction entre Compétences (Savoir-faire, Méthodes, Outils)
 * et Postes / Positions / Titres de fonctions.
 */

export interface CompetencyOrRoleItem {
  raw: string;
  isJobTitle: boolean;
  canonicalSkill: string; // La compétence réelle associée
  roleContext?: string;   // Le poste ou fonction s'il s'agit d'un intitulé
}

// Dictionnaire de conversion des intitulés de postes vers leurs vraies compétences sous-jacentes
export const JOB_TITLE_TO_SKILLS_MAP: Record<string, string> = {
  // Product & Agile roles
  'product owner': 'Gestion de Product Backlog & Rituels Scrum',
  'po': 'Gestion de Product Backlog & Rituels Scrum',
  'product manager': 'Product Management & Stratégie Produit',
  'pm': 'Product Management & Stratégie Produit',
  'head of product': 'Vision & Gouvernance Produit',
  'scrum master': 'Facilitation Agile & Amélioration Continue',
  'agile coach': 'Coaching Agile & Transformation Organisationnelle',
  'lead product': 'Pilotage de Roadmap & Priorisation Stratégique',
  'chief product officer': 'Stratégie Produit Globale',
  'cpo': 'Stratégie Produit Globale',

  // Tech & Engineering roles
  'tech lead': 'Architecture Technique & Lead Technique',
  'lead tech': 'Architecture Technique & Lead Technique',
  'lead developer': 'Revue de Code & Standards d\'Ingénierie',
  'lead dev': 'Revue de Code & Standards d\'Ingénierie',
  'developpeur': 'Développement & Génie Logiciel',
  'développeur': 'Développement & Génie Logiciel',
  'developer': 'Développement & Génie Logiciel',
  'software engineer': 'Conception & Architecture Logicielle',
  'ingenieur': 'Ingénierie & Résolution de Problèmes Complexes',
  'ingénieur': 'Ingénierie & Résolution de Problèmes Complexes',
  'architecte': 'Architecture des Systèmes d\'Information',
  'devops engineer': 'Intégration Continue & Déploiement (CI/CD)',
  'data scientist': 'Modélisation Statistique & Machine Learning',
  'data engineer': 'Pipelines de Données & ETL',
  'data analyst': 'Analyse de Données & Data Visualisation',
  'qa engineer': 'Assurance Qualité & Tests Automatisés',
  'cto': 'Direction Technique & Stratégie IT',
  'chief technology officer': 'Direction Technique & Stratégie IT',

  // Management & Business roles
  'chef de projet': 'Gestion de Projet & Cadrage Opérationnel',
  'project manager': 'Pilotage de Projet & Suivi Budgétaire',
  'directeur': 'Direction Stratégique & Gouvernance',
  'directrice': 'Direction Stratégique & Gouvernance',
  'manager': 'Management d\'Équipe & Animation',
  'consultant': 'Conseil Stratégique & Diagnostic',
  'consultante': 'Conseil Stratégique & Diagnostic',
  'business analyst': 'Analyse des Processus Métier & Recueil de Besoins',
  'responsable': 'Pilotage d\'Activité & Management des Opérations',
  'coordinateur': 'Coordination Transverse & Gestion des Parties Prenantes',
  'coordinatrice': 'Coordination Transverse & Gestion des Parties Prenantes',
  'commercial': 'Développement Commercial & Négociation',
  'account manager': 'Gestion de Compte & Fidélisation Client',
  'community manager': 'Animation de Communauté & Stratégie Social Media',
  'charge de recrutement': 'Sourcing & Conduite d\'Entretiens',
  'chargé de recrutement': 'Sourcing & Conduite d\'Entretiens',
};

// Ensemble des termes désignant strictement un poste / fonction et non une compétence
export const KNOWN_JOB_TITLES_SET = new Set([
  'product owner', 'po', 'product manager', 'pm', 'head of product', 'cpo', 'chief product officer',
  'scrum master', 'agile coach', 'tech lead', 'lead tech', 'lead developer', 'lead dev',
  'developpeur', 'développeur', 'developer', 'software engineer', 'ingenieur', 'ingénieur',
  'architecte', 'architect', 'devops engineer', 'data scientist', 'data engineer', 'data analyst',
  'qa engineer', 'cto', 'chief technology officer', 'cio', 'dsi', 'chef de projet', 'project manager',
  'directeur', 'directrice', 'manager', 'consultant', 'consultante', 'business analyst',
  'responsable', 'coordinateur', 'coordinatrice', 'commercial', 'account manager',
  'stagiaire', 'alternant', 'alternante', 'charge de mission', 'chargé de mission',
  'charge de projet', 'chargé de projet', 'charge de recrutement', 'chargé de recrutement',
  'rh', 'drh', 'recruteur', 'recruteuse', 'head of'
]);

/**
 * Vérifie si une chaîne correspond à un poste / position plutôt qu'à une compétence
 */
export function isJobTitle(term: string): boolean {
  if (!term || typeof term !== 'string') return false;
  const clean = term.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (KNOWN_JOB_TITLES_SET.has(clean)) return true;

  // Patterns typiques de postes : "chef de...", "responsable...", "directeur de...", "lead..."
  if (/^(chef|responsable|directeur|directrice|lead|head of|consultant|consultante|ingenieur|ingénieur|developpeur|développeur)\b/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Transforme un terme brut en véritable compétence s'il s'agit d'un poste,
 * ou conserve la compétence telle quelle.
 */
export function normalizeToTrueSkill(term: string, fallback = 'Gestion de Projet & Delivery'): { skill: string; wasJobTitle: boolean; originalJobTitle?: string } {
  if (!term || typeof term !== 'string') {
    return { skill: fallback, wasJobTitle: false };
  }

  const clean = term.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (JOB_TITLE_TO_SKILLS_MAP[clean]) {
    return {
      skill: JOB_TITLE_TO_SKILLS_MAP[clean],
      wasJobTitle: true,
      originalJobTitle: term.trim()
    };
  }

  // Si ça commence par un rôle connu
  for (const [jobKey, skillVal] of Object.entries(JOB_TITLE_TO_SKILLS_MAP)) {
    if (clean === jobKey || clean.startsWith(jobKey + ' ') || clean.endsWith(' ' + jobKey)) {
      return {
        skill: skillVal,
        wasJobTitle: true,
        originalJobTitle: term.trim()
      };
    }
  }

  if (isJobTitle(term)) {
    return {
      skill: 'Pilotage & Responsabilités liées au poste de ' + term.trim(),
      wasJobTitle: true,
      originalJobTitle: term.trim()
    };
  }

  return {
    skill: term.trim(),
    wasJobTitle: false
  };
}
