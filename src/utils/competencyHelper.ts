/**
 * competencyHelper.ts
 * Référentiel universel des métiers, postes et fonctions (tous secteurs FR & EN)
 * + moteur morphologique de reconnaissance automatique des intitulés de postes composés
 * afin de convertir tout métier en véritable compétence opérationnelle dans l'entraîneur oral.
 */

export interface CompetencyOrRoleItem {
  raw: string;
  isJobTitle: boolean;
  canonicalSkill: string; // La compétence réelle associée
  roleContext?: string;   // Le poste ou fonction s'il s'agit d'un intitulé
}

interface RoleEntry {
  aliases: string[];
  frSkill: string;
  enSkill: string;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, "'")
    .replace(/\s+/g, ' ');
}

function stripRoleModifiers(raw: string): string {
  return raw
    .replace(/\(\s*(?:h\/f|f\/h|m\/f|x\/f\/h|f\/m\/x)\s*\)/gi, ' ')
    .replace(/\b(?:h\/f|f\/h|m\/f)\b/gi, ' ')
    .replace(
      /^(?:senior|sr\.?|junior|jr\.?|confirm[ée]e?|exp[ée]riment[ée]e?|expert[e]?|principal[e]?|staff|lead\s+senior|deputy|adjoint[e]?|stagiaire|alternant[e]?|apprenti[e]?|intern|trainee|freelance)\s+/i,
      ''
    )
    .replace(
      /\s+(?:senior|sr\.?|junior|jr\.?|confirm[ée]e?|exp[ée]riment[ée]e?|expert[e]?|principal[e]?|adjoint[e]?|stagiaire|alternant[e]?|intern|trainee|freelance|en\s+alternance|en\s+stage)$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Catalogue encyclopédique de tous les grands métiers et fonctions existants (FR & EN)
 * classés par grandes familles professionnelles.
 */
const ROLE_CATALOG: RoleEntry[] = [
  // =========================================================================
  // 1. DIRECTION GÉNÉRALE & C-SUITE
  // =========================================================================
  {
    aliases: ['ceo', 'pdg', 'dg', 'directeur general', 'directrice generale', 'chief executive officer', 'managing director', 'general manager', 'gerant', 'gerante', 'fondateur', 'fondatrice', 'co-fondateur', 'cofondateur', 'founder', 'co-founder'],
    frSkill: 'Direction Générale, Vision Stratégique & Gouvernance d\'Entreprise',
    enSkill: 'Executive Leadership, Corporate Strategy & P&L Governance',
  },
  {
    aliases: ['dga', 'directeur general adjoint', 'directrice generale adjointe', 'deputy general manager', 'vp', 'vice president', 'vice-president', 'vice presidente', 'secretaire general', 'secretaire generale'],
    frSkill: 'Pilotage Exécutif, Coordination Stratégique & Transformation',
    enSkill: 'Executive Operations, Cross-Functional Alignment & Governance',
  },
  {
    aliases: ['coo', 'chief operating officer', 'directeur des operations', 'directrice des operations', 'vp operations', 'head of operations', 'responsable des operations', 'operations director', 'operations manager'],
    frSkill: 'Pilotage des Opérations, Performance Opérationnelle & Passage à l\'Échelle',
    enSkill: 'Operational Excellence, Process Scaling & Cross-Team Execution',
  },
  {
    aliases: ['chief of staff', 'bras droit', 'directeur de cabinet', 'directrice de cabinet'],
    frSkill: 'Pilotage de Projets Stratégiques, Coordination Comex & Exécution',
    enSkill: 'Strategic Initiatives, Executive Alignment & Cross-Functional Execution',
  },
  {
    aliases: ['directeur de business unit', 'directrice de business unit', 'business unit director', 'business unit manager', 'directeur de centre de profit', 'general management'],
    frSkill: 'Gestion de Centre de Profit (P&L), Développement & Management',
    enSkill: 'P&L Ownership, Business Growth & Multi-Team Leadership',
  },

  // =========================================================================
  // 2. PRODUIT, AGILITÉ, PROJET & TRANSFORMATION
  // =========================================================================
  {
    aliases: ['product owner', 'po', 'proxy product owner', 'proxy po', 'product owner technique', 'technical product owner'],
    frSkill: 'Gestion de Product Backlog, Rédaction d\'User Stories & Rituels Scrum',
    enSkill: 'Product Backlog Management, User Story Writing & Scrum Rituals',
  },
  {
    aliases: ['product manager', 'pm', 'chef de produit digital', 'product lead', 'lead product', 'lead product manager'],
    frSkill: 'Stratégie Produit, Discovery Utilisateur & Priorisation de Roadmap',
    enSkill: 'Product Strategy, User Discovery & Roadmap Prioritization',
  },
  {
    aliases: ['cpo', 'chief product officer', 'head of product', 'vp product', 'directeur produit', 'directrice produit'],
    frSkill: 'Vision Produit Globale, Gouvernance Portfolio & Scaling Équipes',
    enSkill: 'Enterprise Product Vision, Portfolio Governance & Org Scaling',
  },
  {
    aliases: ['product ops', 'product operations', 'product operations manager'],
    frSkill: 'Structuration des Processus Produit, Tooling & Product Analytics',
    enSkill: 'Product Operations, Tooling Governance & Product Analytics',
  },
  {
    aliases: ['product marketing manager', 'pmm', 'product marketing'],
    frSkill: 'Positionnement Produit, Go-to-Market & Enablement Commercial',
    enSkill: 'Product Positioning, Go-to-Market Strategy & Sales Enablement',
  },
  {
    aliases: ['scrum master', 'sm'],
    frSkill: 'Facilitation Agile, Résolution d\'Obstacles & Amélioration Continue',
    enSkill: 'Agile Facilitation, Impediment Removal & Continuous Improvement',
  },
  {
    aliases: ['agile coach', 'coach agile', 'release train engineer', 'rte'],
    frSkill: 'Coaching Agile à l\'Échelle (SAFe/Scrum) & Transformation Organisationnelle',
    enSkill: 'Enterprise Agile Coaching (SAFe/Scrum) & Organizational Change',
  },
  {
    aliases: ['chef de projet', 'project manager', 'cheffe de projet', 'charge de projet', 'chargee de projet', 'project lead'],
    frSkill: 'Cadrage de Projet, Pilotage Planning/Budget & Gestion des Risques',
    enSkill: 'Project Scoping, Schedule & Budget Control & Risk Management',
  },
  {
    aliases: ['chef de projet digital', 'chef de projet web', 'digital project manager', 'chef de projet it', 'it project manager', 'chef de projet technique', 'technical project manager'],
    frSkill: 'Pilotage de Projets Numériques, Coordination Tech/Métier & Recette',
    enSkill: 'Digital/IT Project Delivery, Tech-Business Alignment & UAT',
  },
  {
    aliases: ['chef de projet amoa', 'chef de projet moa', 'consultant amoa', 'consultante amoa', 'amoa', 'moa', 'maitrise d\'ouvrage'],
    frSkill: 'Recueil des Besoins Métiers, Rédaction de SFD & Pilotage de Recette',
    enSkill: 'Business Requirements Gathering, Functional Specs & UAT Governance',
  },
  {
    aliases: ['program manager', 'programme manager', 'directeur de programme', 'directrice de programme', 'delivery manager', 'service delivery manager', 'sdm'],
    frSkill: 'Gouvernance Multi-Projets, Delivery & Alignement Parties Prenantes',
    enSkill: 'Program Governance, End-to-End Delivery & Stakeholder Alignment',
  },
  {
    aliases: ['pmo', 'project management officer'],
    frSkill: 'Gouvernance Portefeuille Projets, KPI Delivery & Standardisation Méthodes',
    enSkill: 'Portfolio Governance, Delivery KPIs & PMO Standards',
  },
  {
    aliases: ['business analyst', 'ba', 'analyste metier', 'analyste fonctionnel', 'analyste fonctionnelle', 'consultant fonctionnel', 'consultante fonctionnelle'],
    frSkill: 'Analyse des Processus Métier, Modélisation BPMN & Spécifications',
    enSkill: 'Business Process Analysis, BPMN Modeling & Requirements Engineering',
  },
  {
    aliases: ['change manager', 'responsable conduite du changement', 'consultant conduite du changement', 'consultant transformation'],
    frSkill: 'Conduite du Changement, Plans de Formation & Adoption Utilisateurs',
    enSkill: 'Change Management, Training Enablement & User Adoption',
  },
  {
    aliases: ['innovation manager', 'responsable innovation', 'directeur innovation', 'chief innovation officer'],
    frSkill: 'Veille Technologique, Idéation, Prototypage & Pilotage de POC',
    enSkill: 'Innovation Strategy, Rapid Prototyping & POC Incubation',
  },

  // =========================================================================
  // 3. IT, DÉVELOPPEMENT, ARCHITECTURE, CLOUD, DEVOPS & CYBERSÉCURITÉ
  // =========================================================================
  {
    aliases: ['cto', 'chief technology officer', 'directeur technique', 'directrice technique', 'vp engineering'],
    frSkill: 'Stratégie Technologique, Architecture SI & Management d\'Ingénierie',
    enSkill: 'Technology Strategy, Systems Architecture & Engineering Leadership',
  },
  {
    aliases: ['cio', 'dsi', 'chief information officer', 'directeur des systemes d\'information', 'directrice des systemes d\'information', 'responsable informatique', 'it director', 'it manager'],
    frSkill: 'Gouvernance des Systèmes d\'Information, Urbanisation SI & Budgets IT',
    enSkill: 'IT Governance, Enterprise Systems Strategy & IT Budget Ownership',
  },
  {
    aliases: ['tech lead', 'lead tech', 'lead developer', 'lead dev', 'staff engineer', 'principal engineer'],
    frSkill: 'Architecture Technique, Revue de Code & Mentorat d\'Équipe Dev',
    enSkill: 'Technical Architecture, Code Review & Engineering Mentorship',
  },
  {
    aliases: ['developpeur', 'developpeuse', 'developer', 'software engineer', 'ingenieur logiciel', 'ingenieur etudes et developpement', 'programmeur', 'programmeuse', 'coder'],
    frSkill: 'Conception Logicielle, Développement Propre & Tests Automatisés',
    enSkill: 'Software Design, Clean Coding & Automated Testing',
  },
  {
    aliases: ['developpeur full stack', 'full stack developer', 'fullstack developer', 'developpeur front end', 'frontend developer', 'developpeur back end', 'backend developer', 'developpeur web', 'web developer', 'developpeur mobile', 'mobile developer', 'ios developer', 'android developer'],
    frSkill: 'Développement Applicatif, Intégration APIs & Optimisation des Performances',
    enSkill: 'Application Engineering, API Integration & Performance Optimization',
  },
  {
    aliases: ['integrateur web', 'webmaster', 'integrateur html', 'ui developer'],
    frSkill: 'Intégration Web Responsive, Accessibilité (RGAA/WCAG) & Performance Front',
    enSkill: 'Responsive Web Integration, Accessibility Standards & Front-End Optimization',
  },
  {
    aliases: ['architecte', 'architect', 'architecte logiciel', 'software architect', 'architecte si', 'architecte technique', 'architecte solutions', 'solution architect', 'solutions architect', 'architecte entreprise', 'enterprise architect', 'urbaniste si'],
    frSkill: 'Architecture des Systèmes d\'Information, Urbanisation & Scalabilité',
    enSkill: 'Enterprise & Solution Architecture, Integration Patterns & Scalability',
  },
  {
    aliases: ['cloud architect', 'architecte cloud', 'cloud engineer', 'ingenieur cloud'],
    frSkill: 'Architecture Cloud (AWS/Azure/GCP), Sécurité & FinOps',
    enSkill: 'Cloud Architecture (AWS/Azure/GCP), Security & FinOps',
  },
  {
    aliases: ['devops', 'devops engineer', 'ingenieur devops', 'sre', 'site reliability engineer', 'platform engineer', 'ingenieur ci/cd', 'build engineer'],
    frSkill: 'Intégration & Déploiement Continu (CI/CD), IaC & Fiabilité Production',
    enSkill: 'CI/CD Automation, Infrastructure as Code & Production Reliability',
  },
  {
    aliases: ['administrateur systeme', 'administrateur systemes', 'sysadmin', 'system administrator', 'administrateur reseau', 'administrateur reseaux', 'network administrator', 'network engineer', 'ingenieur reseau', 'ingenieur systemes', 'ingenieur infrastructure'],
    frSkill: 'Administration Systèmes & Réseaux, Virtualisation & Haute Disponibilité',
    enSkill: 'Systems & Network Administration, Virtualization & High Availability',
  },
  {
    aliases: ['dba', 'database administrator', 'administrateur base de donnees', 'administrateur bases de donnees'],
    frSkill: 'Administration SGBD, Tuning SQL, Sauvegardes & Intégrité des Données',
    enSkill: 'Database Administration, SQL Tuning, Backup & Data Integrity',
  },
  {
    aliases: ['qa', 'qa engineer', 'ingenieur qa', 'testeur', 'testeuse', 'testeur qa', 'automaticien de tests', 'test automation engineer', 'qa lead', 'quality assurance engineer', 'charge de recette'],
    frSkill: 'Stratégie de Tests, Automatisation QA & Suivi des Anomalies',
    enSkill: 'QA Test Strategy, Test Automation & Defect Lifecycle Management',
  },
  {
    aliases: ['rssi', 'ciso', 'responsable securite si', 'ingenieur cybersecurite', 'cybersecurity engineer', 'security engineer', 'pentester', 'soc analyst', 'analyste soc', 'consultant cybersecurite', 'ethical hacker', 'security architect'],
    frSkill: 'Cybersécurité, Analyse des Risques, Audit de Vulnérabilités & Remédiation',
    enSkill: 'Cybersecurity Operations, Threat Analysis, Audits & Risk Remediation',
  },
  {
    aliases: ['support it', 'technicien support', 'technicien helpdesk', 'helpdesk technician', 'service desk analyst', 'it support specialist', 'technicien informatique', 'support n1', 'support n2', 'support n3'],
    frSkill: 'Diagnostic d\'Incidents IT, Gestion de Tickets (ITSM) & Support Utilisateurs',
    enSkill: 'IT Incident Troubleshooting, ITSM Ticketing & End-User Support',
  },
  {
    aliases: ['consultant erp', 'consultant sap', 'consultant salesforce', 'administrateur salesforce', 'salesforce administrator', 'integrateur erp', 'consultant crm'],
    frSkill: 'Paramétrage Progiciel (ERP/CRM), Reprise de Données & Accompagnement Métier',
    enSkill: 'ERP/CRM Configuration, Data Migration & Business Process Alignment',
  },

  // =========================================================================
  // 4. DATA, BUSINESS INTELLIGENCE & INTELLIGENCE ARTIFICIELLE
  // =========================================================================
  {
    aliases: ['cdo', 'chief data officer', 'head of data', 'directeur data', 'directrice data', 'data governance manager'],
    frSkill: 'Gouvernance des Données, Stratégie Data & Valorisation des Actifs',
    enSkill: 'Enterprise Data Governance, Data Strategy & Value Realization',
  },
  {
    aliases: ['data scientist', 'applied scientist', 'research scientist'],
    frSkill: 'Modélisation Statistique, Machine Learning & Évaluation de Modèles',
    enSkill: 'Statistical Modeling, Machine Learning & Predictive Analytics',
  },
  {
    aliases: ['data analyst', 'analyste data', 'analyste donnees', 'business intelligence analyst', 'bi analyst', 'product analyst', 'marketing analyst'],
    frSkill: 'Analyse Exploratoire (SQL/Python), KPI Métiers & Data Visualisation',
    enSkill: 'Data Analysis (SQL/Python), Business KPIs & BI Visualization',
  },
  {
    aliases: ['data engineer', 'ingenieur data', 'analytics engineer', 'bi developer', 'developpeur bi', 'consultant bi', 'etl developer'],
    frSkill: 'Pipelines ETL/ELT, Modélisation Data Warehouse & Qualité des Flux',
    enSkill: 'ETL/ELT Data Pipelines, Data Warehousing & Pipeline Reliability',
  },
  {
    aliases: ['machine learning engineer', 'ml engineer', 'ai engineer', 'ingenieur ia', 'mlops engineer', 'deep learning engineer', 'prompt engineer'],
    frSkill: 'Industrialisation de Modèles IA/ML, MLOps & Déploiement en Production',
    enSkill: 'ML/AI Engineering, MLOps Pipelines & Production Model Serving',
  },
  {
    aliases: ['data steward', 'dpo', 'data protection officer', 'delegue a la protection des donnees'],
    frSkill: 'Conformité RGPD, Gouvernance & Qualité des Référentiels de Données',
    enSkill: 'GDPR/Privacy Compliance, Data Stewardship & Metadata Governance',
  },
  {
    aliases: ['statisticien', 'statisticienne', 'statistician', 'econometre', 'econometrician'],
    frSkill: 'Modélisation Statistique, Échantillonnage & Analyse Économétrique',
    enSkill: 'Statistical Modeling, Sampling Design & Econometric Analysis',
  },

  // =========================================================================
  // 5. DESIGN, UX/UI, CRÉATION, AUDIOVISUEL & MÉDIAS
  // =========================================================================
  {
    aliases: ['ux designer', 'ui designer', 'ux/ui designer', 'ui/ux designer', 'product designer', 'interaction designer', 'webdesigner', 'web designer'],
    frSkill: 'Conception Centrée Utilisateur (UX/UI), Prototypage Figma & Design System',
    enSkill: 'User-Centered Design (UX/UI), Prototyping & Design Systems',
  },
  {
    aliases: ['ux researcher', 'user researcher', 'charge d\'etudes ux'],
    frSkill: 'Recherche Utilisateur, Tests d\'Utilisabilité & Synthèse d\'Insights',
    enSkill: 'User Research, Usability Testing & Behavioral Insights',
  },
  {
    aliases: ['directeur artistique', 'directrice artistique', 'art director', 'creative director', 'directeur de creation', 'directrice de creation'],
    frSkill: 'Direction Artistique, Identité de Marque & Supervision Créative',
    enSkill: 'Art Direction, Brand Identity & Creative Team Leadership',
  },
  {
    aliases: ['graphiste', 'graphic designer', 'infographiste', 'motion designer', 'illustrateur', 'illustratrice', 'illustrator', 'maquettiste'],
    frSkill: 'Création Graphique, Identité Visuelle & Maîtrise Suite Adobe',
    enSkill: 'Visual Design, Brand Assets Creation & Adobe Creative Suite',
  },
  {
    aliases: ['designer industriel', 'industrial designer', 'styliste', 'modeliste', 'architecte d\'interieur', 'interior designer', 'scenographe'],
    frSkill: 'Conception Produit/Espace, Modélisation 3D & Suivi de Prototype',
    enSkill: 'Industrial/Spatial Design, 3D Concepting & Prototype Execution',
  },
  {
    aliases: ['redacteur technique', 'redactrice technique', 'technical writer', 'copywriter', 'concepteur redacteur', 'conceptrice redactrice', 'redacteur web', 'content writer', 'journaliste', 'journalist', 'redacteur en chef'],
    frSkill: 'Rédaction Éditoriale & Technique, Storytelling & Structuration de Contenus',
    enSkill: 'Editorial & Technical Writing, Storytelling & Content Architecture',
  },
  {
    aliases: ['monteur video', 'monteuse video', 'video editor', 'realisateur', 'realisatrice', 'videaste', 'photographe', 'photographer', 'ingenieur du son', 'sound designer', 'cadreur'],
    frSkill: 'Production & Post-Production Audiovisuelle, Montage & Étalonnage',
    enSkill: 'Audio/Video Production, Editing & Post-Production Workflows',
  },
  {
    aliases: ['traducteur', 'traductrice', 'translator', 'interprete', 'interpreter', 'localisation specialist'],
    frSkill: 'Traduction Spécialisée, Localisation Multilingue & Contrôle Terminologique',
    enSkill: 'Specialized Translation, Localization & Linguistic Quality Assurance',
  },

  // =========================================================================
  // 6. MARKETING, COMMUNICATION, DIGITAL & E-COMMERCE
  // =========================================================================
  {
    aliases: ['cmo', 'chief marketing officer', 'directeur marketing', 'directrice marketing', 'vp marketing', 'head of marketing', 'marketing director', 'marketing manager', 'responsable marketing'],
    frSkill: 'Stratégie Marketing Omnicanale, Pilotage ROI & Positionnement de Marque',
    enSkill: 'Omnichannel Marketing Strategy, ROI Governance & Brand Positioning',
  },
  {
    aliases: ['brand manager', 'chef de marque', 'responsable de marque', 'chef de produit marketing', 'chef de marche', 'category manager'],
    frSkill: 'Gestion de Gamme/Marque, Lancements Produits & Analyse de Marché',
    enSkill: 'Brand & Category Management, Product Launches & Market Analytics',
  },
  {
    aliases: ['trade marketing manager', 'responsable trade marketing', 'charge de trade marketing'],
    frSkill: 'Activation Point de Vente, Opérations Promotionnelles & Sell-Out',
    enSkill: 'Trade Marketing Activation, Promotional Campaigns & Sell-Out Growth',
  },
  {
    aliases: ['growth hacker', 'growth manager', 'growth marketer', 'acquisition manager', 'traffic manager', 'performance marketing manager', 'media buyer'],
    frSkill: 'Acquisition Digitale Payante/Organique, A/B Testing & Optimisation CAC/LTV',
    enSkill: 'Performance Acquisition, Funnel Experimentation & CAC/LTV Optimization',
  },
  {
    aliases: ['seo manager', 'sea manager', 'consultant seo', 'consultant sea', 'seo specialist'],
    frSkill: 'Référencement Naturel/Payant (SEO/SEA), Audit Sémantique & Netlinking',
    enSkill: 'SEO/SEA Optimization, Technical Audits & Search Campaign Scaling',
  },
  {
    aliases: ['community manager', 'social media manager', 'content manager', 'brand content manager'],
    frSkill: 'Stratégie Social Media, Animation de Communautés & Production Éditoriale',
    enSkill: 'Social Media Strategy, Community Engagement & Content Calendars',
  },
  {
    aliases: ['crm manager', 'responsable crm', 'email marketing manager', 'marketing automation specialist'],
    frSkill: 'Segmentation Clients, Scénarios Marketing Automation & Rétention',
    enSkill: 'CRM Segmentation, Lifecycle Automation & Customer Retention',
  },
  {
    aliases: ['e-commerce manager', 'ecommerce manager', 'responsable e-commerce', 'responsable ecommerce', 'merchandiser', 'visual merchandiser'],
    frSkill: 'Pilotage E-Commerce, Merchandising Digital & Optimisation Taux de Conversion',
    enSkill: 'E-Commerce Operations, Digital Merchandising & Conversion Optimization',
  },
  {
    aliases: ['directeur de la communication', 'directrice de la communication', 'responsable communication', 'charge de communication', 'chargee de communication', 'communications manager', 'attache de presse', 'attachee de presse', 'pr manager', 'responsable relations publiques'],
    frSkill: 'Communication Corporate/Interne, Relations Presse & Pilotage de Campagnes',
    enSkill: 'Corporate & Internal Communications, PR & Campaign Execution',
  },
  {
    aliases: ['chef de projet evenementiel', 'event manager', 'responsable evenementiel', 'charge d\'evenementiel', 'event planner', 'event planning'],
    frSkill: 'Conception & Logistique Événementielle, Budget & Coordination Prestataires',
    enSkill: 'Event Production, Vendor Coordination & Budget Management',
  },

  // =========================================================================
  // 7. COMMERCIAL, VENTES, BUSINESS DEVELOPMENT & RELATION CLIENT
  // =========================================================================
  {
    aliases: ['directeur commercial', 'directrice commerciale', 'sales director', 'vp sales', 'chief revenue officer', 'cro', 'head of sales', 'chef des ventes', 'sales manager', 'responsable commercial'],
    frSkill: 'Stratégie Commerciale, Animation Force de Vente & Pilotage du Pipeline',
    enSkill: 'Sales Strategy, Team Coaching & Revenue Pipeline Governance',
  },
  {
    aliases: ['business developer', 'bizdev', 'charge d\'affaires', 'developpeur commercial', 'sdr', 'bdr', 'sales development representative', 'business development representative', 'business development'],
    frSkill: 'Prospection B2B/B2C, Qualification de Leads & Ouverture de Comptes',
    enSkill: 'Outbound Prospecting, Pipeline Generation & New Logo Acquisition',
  },
  {
    aliases: ['commercial', 'commerciale', 'commercial b2b', 'commercial b2c', 'commercial terrain', 'ingenieur commercial', 'ingenieur d\'affaires', 'technico-commercial', 'technico commercial', 'account executive', 'ae', 'sales executive', 'sales representative'],
    frSkill: 'Cycle de Vente Complexe, Négociation Commerciale & Closing',
    enSkill: 'Consultative Selling, Contract Negotiation & Deal Closing',
  },
  {
    aliases: ['account manager', 'am', 'key account manager', 'kam', 'responsable grands comptes', 'directeur de clientele', 'directrice de clientele', 'charge de compte'],
    frSkill: 'Développement de Portefeuille Clients (Upsell/Cross-Sell) & Négociation Grands Comptes',
    enSkill: 'Key Account Growth (Upsell/Cross-Sell) & Strategic Client Retention',
  },
  {
    aliases: ['customer success manager', 'csm', 'responsable succes client', 'customer success'],
    frSkill: 'Onboarding Client, Adoption Produit, Lutte contre le Churn & Renouvellements',
    enSkill: 'Client Onboarding, Product Adoption, Churn Prevention & Renewals',
  },
  {
    aliases: ['sales ops', 'sales operations', 'revops', 'revenue operations', 'sales operations manager'],
    frSkill: 'Pilotage CRM, Modélisation de Territoires/Quotas & Prévisions de Vente',
    enSkill: 'CRM Governance, Territory/Quota Design & Revenue Forecasting',
  },
  {
    aliases: ['conseiller clientele', 'conseillere clientele', 'charge de clientele', 'chargee de clientele', 'responsable service client', 'customer service manager', 'customer support', 'teleconseiller', 'teleconseillere', 'conseiller client', 'service client'],
    frSkill: 'Gestion des Réclamations, Relation Client Omnicanale & Satisfaction (CSAT/NPS)',
    enSkill: 'Customer Support Operations, Issue Resolution & CSAT/NPS Optimization',
  },
  {
    aliases: ['chef de secteur', 'responsable de secteur', 'area sales manager', 'conseiller de vente', 'vendeur', 'vendeuse', 'responsable de rayon', 'chef de rayon', 'responsable de magasin', 'store manager', 'boutique manager', 'directeur de magasin'],
    frSkill: 'Pilotage Point de Vente, Merchandising, Chiffre d\'Affaires & Management Équipe',
    enSkill: 'Retail Store Operations, Visual Merchandising, KPI Delivery & Team Coaching',
  },

  // =========================================================================
  // 8. FINANCE, COMPTABILITÉ, AUDIT, BANQUE & ASSURANCE
  // =========================================================================
  {
    aliases: ['cfo', 'chief financial officer', 'daf', 'directeur financier', 'directrice financiere', 'directeur administratif et financier', 'directrice administrative et financiere', 'vp finance', 'head of finance', 'finance director'],
    frSkill: 'Pilotage Financier Stratégique, Trésorerie, Financement & Relations Investisseurs',
    enSkill: 'Corporate Finance Strategy, Cash Governance & Executive Reporting',
  },
  {
    aliases: ['controleur de gestion', 'controleuse de gestion', 'financial controller', 'business controller', 'fp&a manager', 'fp&a analyst', 'responsable controle de gestion', 'controle de gestion'],
    frSkill: 'Élaboration Budgétaire, Clôtures Mensuelles, Analyse d\'Écarts & KPI P&L',
    enSkill: 'Budgeting & Forecasting, Monthly Close, Variance Analysis & P&L KPIs',
  },
  {
    aliases: ['analyste financier', 'financial analyst', 'investment analyst', 'm&a analyst', 'analyste m&a', 'private equity analyst', 'venture capital analyst', 'banquier d\'affaires', 'investment banker', 'corporate finance analyst'],
    frSkill: 'Modélisation Financière (DCF/LBO), Valorisation d\'Entreprises & Due Diligence',
    enSkill: 'Financial Modeling (DCF/LBO), Valuation & M&A Due Diligence',
  },
  {
    aliases: ['comptable', 'comptable general', 'comptable fournisseurs', 'comptable clients', 'chef comptable', 'responsable comptable', 'aide-comptable', 'aide comptable', 'expert-comptable', 'expert comptable', 'accountant', 'chief accountant', 'general accountant'],
    frSkill: 'Comptabilité Générale/Auxiliaire, Révision des Comptes & Liasses Fiscales',
    enSkill: 'General Ledger Accounting, Account Reconciliation & Statutory Reporting',
  },
  {
    aliases: ['auditeur', 'auditrice', 'auditeur interne', 'auditeur externe', 'auditeur financier', 'internal auditor', 'external auditor', 'commissaire aux comptes', 'cac'],
    frSkill: 'Audit Interne/Financier, Contrôle Interne (SOX/Loi Sapin II) & Cartographie Risques',
    enSkill: 'Financial & Internal Auditing, Internal Controls & Risk Assessment',
  },
  {
    aliases: ['tresorier', 'tresoriere', 'treasurer', 'cash manager', 'treasury manager', 'credit manager', 'charge de recouvrement', 'gestionnaire recouvrement'],
    frSkill: 'Gestion de Trésorerie, Prévisions de Cash-Flow, Risque Crédit & Recouvrement',
    enSkill: 'Treasury Management, Cash Flow Forecasting & Credit Risk Control',
  },
  {
    aliases: ['risk manager', 'gestionnaire des risques', 'analyste risques', 'risk analyst', 'compliance analyst', 'kyc analyst', 'aml analyst', 'fiscaliste', 'tax manager', 'tax specialist'],
    frSkill: 'Analyse & Maîtrise des Risques, Conformité Réglementaire (KYC/AML) & Fiscalité',
    enSkill: 'Enterprise Risk Management, Regulatory Compliance (KYC/AML) & Tax Advisory',
  },
  {
    aliases: ['actuaire', 'actuary', 'souscripteur', 'souscriptrice', 'underwriter', 'gestionnaire sinistres', 'claims handler', 'courtier', 'courtiere', 'broker', 'agent general d\'assurance'],
    frSkill: 'Tarification Actuarielle, Souscription de Risques & Gestion de Sinistres',
    enSkill: 'Actuarial Pricing, Risk Underwriting & Claims Management',
  },
  {
    aliases: ['conseiller bancaire', 'conseillere bancaire', 'charge d\'affaires entreprises', 'conseiller en gestion de patrimoine', 'cgp', 'gestionnaire de patrimoine', 'wealth manager', 'private banker', 'asset manager', 'portfolio manager', 'fund manager', 'gerant de portefeuille', 'trader'],
    frSkill: 'Conseil Patrimonial/Financier, Allocation d\'Actifs & Analyse de Solvabilité',
    enSkill: 'Wealth & Portfolio Management, Asset Allocation & Credit Analysis',
  },

  // =========================================================================
  // 9. RESSOURCES HUMAINES, RECRUTEMENT, PAIE & FORMATION
  // =========================================================================
  {
    aliases: ['drh', 'chro', 'chief human resources officer', 'directeur des ressources humaines', 'directrice des ressources humaines', 'head of people', 'vp people', 'people director'],
    frSkill: 'Stratégie RH, Transformation Culturelle, GEPP & Dialogue Social',
    enSkill: 'People Strategy, Organizational Design, Talent Retention & Labor Relations',
  },
  {
    aliases: ['hrbp', 'hr business partner', 'responsable rh', 'rrh', 'responsable ressources humaines', 'hr manager', 'charge rh', 'chargee rh', 'charge des ressources humaines', 'assistant rh', 'assistante rh', 'generaliste rh'],
    frSkill: 'Accompagnement Managers, Droit Social Opérationnel & Gestion des Talents',
    enSkill: 'HR Business Partnering, Employee Relations & Talent Management',
  },
  {
    aliases: ['charge de recrutement', 'chargee de recrutement', 'recruteur', 'recruteuse', 'recruiter', 'tech recruiter', 'it recruiter', 'talent acquisition', 'talent acquisition specialist', 'talent acquisition manager', 'chasseur de tetes', 'headhunter', 'sourcing specialist'],
    frSkill: 'Sourcing Avancé, Chasse Directe, Entretiens Structurés & Marque Employeur',
    enSkill: 'Full-Cycle Recruiting, Boolean Sourcing, Structured Interviewing & Employer Branding',
  },
  {
    aliases: ['gestionnaire de paie', 'responsable paie', 'payroll specialist', 'payroll manager', 'comp & ben', 'compensation and benefits', 'compensation & benefits manager'],
    frSkill: 'Établissement de la Paie, Déclarations Sociales (DSN) & Politique Rémunération',
    enSkill: 'Payroll Processing, Benefits Administration & Compensation Benchmarking',
  },
  {
    aliases: ['responsable formation', 'charge de formation', 'chargee de formation', 'learning and development', 'l&d manager', 'training manager', 'responsable relations sociales', 'office manager', 'chief happiness officer'],
    frSkill: 'Ingénierie de Formation, Plan de Développement des Compétences & QVT',
    enSkill: 'Learning & Development Programs, Skills Mapping & Workplace Operations',
  },

  // =========================================================================
  // 10. JURIDIQUE, CONFORMITÉ & SECTEUR PUBLIC
  // =========================================================================
  {
    aliases: ['directeur juridique', 'directrice juridique', 'general counsel', 'head of legal', 'chief legal officer', 'juriste', 'juriste d\'entreprise', 'legal counsel', 'corporate counsel', 'juriste contrats', 'juriste droit social', 'juriste droit des affaires', 'juriste ip'],
    frSkill: 'Rédaction & Négociation de Contrats, Droit des Affaires/Social & Conseil',
    enSkill: 'Contract Drafting & Negotiation, Corporate/Labor Law & Legal Advisory',
  },
  {
    aliases: ['avocat', 'avocate', 'lawyer', 'attorney', 'notaire', 'clerc de notaire', 'paralegal', 'assistant juridique', 'assistante juridique', 'huissier', 'magistrat'],
    frSkill: 'Analyse Juridique, Rédaction d\'Actes, Contentieux & Veille Réglementaire',
    enSkill: 'Legal Research, Regulatory Filing, Litigation Support & Case Management',
  },
  {
    aliases: ['contract manager', 'gestionnaire de contrats', 'compliance officer', 'responsable conformite', 'deontologue', 'charge d\'affaires reglementaires', 'regulatory affairs manager', 'charge d\'affaires publiques'],
    frSkill: 'Gestion Contractuelle & Claims, Conformité Réglementaire & Audit',
    enSkill: 'Contract Lifecycle Management, Claims Mitigation & Regulatory Compliance',
  },
  {
    aliases: ['acheteur public', 'attache territorial', 'administrateur civil', 'charge de mission', 'chargee de mission'],
    frSkill: 'Pilotage de Dossiers Institutionnels, Marchés Publics & Coordination Acteurs',
    enSkill: 'Public Procurement, Institutional Program Governance & Policy Execution',
  },

  // =========================================================================
  // 11. SUPPLY CHAIN, PLANIFICATION, LOGISTIQUE, ACHATS & TRANSPORT
  // =========================================================================
  {
    aliases: ['supply chain director', 'directeur supply chain', 'directrice supply chain', 'vp supply chain', 'head of supply chain', 'supply chain manager', 'responsable supply chain', 'supply chain', 'supply chain management'],
    frSkill: 'Pilotage des Flux Supply Chain Bout-en-Bout, Processus S&OP & Taux de Service (OTIF)',
    enSkill: 'End-to-End Supply Chain Governance, S&OP & Customer Service Level (OTIF)',
  },
  {
    aliases: ['supply chain planner', 'supply planner', 'supply planning', 'business execution planner'],
    frSkill: 'Planification des Approvisionnements, Arbitrage des Couvertures de Stocks & S&OP',
    enSkill: 'Replenishment Planning, Inventory Coverage Optimization & S&OP Alignment',
  },
  {
    aliases: ['demand planner', 'demand planning', 'previsionniste'],
    frSkill: 'Prévision des Ventes (Forecast Accuracy / MAPE), Revues S&OP & Sell-In/Sell-Out',
    enSkill: 'Demand Forecasting (MAPE / Forecast Accuracy) & S&OP Consensus Reviews',
  },
  {
    aliases: ['planificateur', 'planificatrice', 'planificateur de production', 'production planner', 'production planning', 'master planner', 'master planning', 'capacity planning', 'ordonnanceur', 'ordonnanceuse'],
    frSkill: 'Construction du PDP / MPS, Ordonnancement & Adéquation Charge/Capacité',
    enSkill: 'Master Production Scheduling (MPS), Capacity Balancing & Scenario Planning',
  },
  {
    aliases: ['approvisionneur', 'approvisionneuse', 'procurement specialist', 'replenishment specialist', 'gestionnaire de stocks', 'inventory manager', 'inventory controller', 'pilote de flux'],
    frSkill: 'Gestion des Approvisionnements, Projection des Stocks & Performance Fournisseurs (OTIF)',
    enSkill: 'Replenishment Execution, Inventory Control & Supplier OTIF Management',
  },
  {
    aliases: ['acheteur', 'acheteuse', 'buyer', 'procurement manager', 'sourcing manager', 'category buyer', 'responsable achats', 'directeur des achats', 'directrice des achats', 'chief procurement officer', 'acheteur industriel', 'acheteur it'],
    frSkill: 'Négociation Fournisseurs, Appels d\'Offres, Sourcing & Réduction des Coûts (TCO)',
    enSkill: 'Supplier Negotiation, Strategic Sourcing, RFPs & Cost Optimization (TCO)',
  },
  {
    aliases: ['responsable logistique', 'directeur logistique', 'logistics manager', 'logistics coordinator', 'coordinateur logistique', 'logistique', 'warehouse manager', 'responsable entrepot', 'chef d\'entrepot', 'chef d\'equipe logistique'],
    frSkill: 'Coordination Logistique & 3PL, Gestion d\'Entrepôt (WMS) & Productivité Flux',
    enSkill: '3PL Logistics Coordination, Warehouse Operations (WMS) & Flow Productivity',
  },
  {
    aliases: ['responsable transport', 'transport manager', 'affreteur', 'affreteuse', 'exploitant transport', 'dispatcheur', 'dispatcher', 'declarant en douane', 'responsable import export', 'gestionnaire import export', 'customs specialist'],
    frSkill: 'Affrètement & Planification Transport, Conformité Douanière & Incoterms',
    enSkill: 'Freight & Carrier Management, Customs Compliance & International Incoterms',
  },
  {
    aliases: ['gestionnaire adv', 'assistant adv', 'assistante adv', 'responsable adv', 'administration des ventes', 'order management specialist'],
    frSkill: 'Administration des Ventes (ADV), Suivi des Commandes, Facturation & Litiges',
    enSkill: 'Order-to-Cash Management, Invoicing Accuracy & Dispute Resolution',
  },
  {
    aliases: ['preparateur de commandes', 'cariste', 'magasinier', 'magasiniere', 'chauffeur', 'chauffeur poids lourd', 'conducteur routier', 'livreur'],
    frSkill: 'Préparation & Contrôle des Expéditions, Sécurité Entrepôt & Traçabilité Stocks',
    enSkill: 'Order Picking Accuracy, Warehouse Safety & Inventory Traceability',
  },

  // =========================================================================
  // 12. INDUSTRIE, INGÉNIERIE, PRODUCTION, MAINTENANCE, QUALITÉ & HSE
  // =========================================================================
  {
    aliases: ['ingenieur', 'ingenieure', 'engineer', 'ingenieur etudes', 'ingenieur r&d', 'r&d engineer', 'chercheur r&d'],
    frSkill: 'Ingénierie Technique, Conception de Solutions & Résolution de Problèmes Complexes',
    enSkill: 'Technical Engineering, Solution Design & Complex Problem Solving',
  },
  {
    aliases: ['directeur d\'usine', 'directrice d\'usine', 'plant manager', 'directeur industriel', 'directrice industrielle', 'responsable de production', 'production manager', 'chef d\'atelier', 'responsable fabrication'],
    frSkill: 'Pilotage Industriel (TRS/OEE), Management d\'Ateliers, Coûts & Délais Production',
    enSkill: 'Plant & Production Management (OEE), Shop-Floor Leadership & Throughput',
  },
  {
    aliases: ['ingenieur industriel', 'industrial engineer', 'ingenieur production', 'ingenieur methodes', 'ingenieur process', 'process engineer', 'ingenieur industrialisation', 'lean manager', 'ingenieur amelioration continue', 'continuous improvement engineer'],
    frSkill: 'Industrialisation, Méthodes, Lean Manufacturing / Six Sigma & Gains de Productivité',
    enSkill: 'Process Engineering, Lean Six Sigma & Continuous Productivity Improvement',
  },
  {
    aliases: ['responsable maintenance', 'maintenance manager', 'ingenieur maintenance', 'technicien de maintenance', 'technicien maintenance', 'electromecanicien', 'electrotechnicien', 'automaticien', 'roboticien', 'mecanicien industriel'],
    frSkill: 'Maintenance Préventive & Curative (GMAO), Fiabilisation Machines & Automatisme',
    enSkill: 'Preventive & Corrective Maintenance (CMMS), Asset Reliability & Automation',
  },
  {
    aliases: ['directeur qualite', 'responsable qualite', 'ingenieur qualite', 'quality manager', 'quality engineer', 'technicien qualite', 'auditeur qualite', 'controleur qualite', 'quality assurance manager'],
    frSkill: 'Système Management Qualité (ISO 9001), Audits, Plans d\'Actions (8D/CAPA) & Non-Conformités',
    enSkill: 'Quality Management Systems (ISO 9001), CAPA/8D Root-Cause & Audits',
  },
  {
    aliases: ['responsable qhse', 'responsable hse', 'responsable qse', 'ingenieur hse', 'ingenieur qhse', 'hse manager', 'ehs manager', 'preventeur securite', 'responsable environnement', 'responsable rse', 'sustainability manager', 'esg analyst'],
    frSkill: 'Prévention des Risques HSE (ISO 14001/45001), Conformité Sécurité & Stratégie RSE',
    enSkill: 'EHS Compliance (ISO 14001/45001), Workplace Safety & ESG/Sustainability Execution',
  },
  {
    aliases: ['ingenieur energie', 'energy engineer', 'ingenieur chimiste', 'chemical engineer', 'ingenieur materiaux', 'ingenieur aeronautique', 'ingenieur automobile', 'ingenieur electronique', 'embedded engineer', 'dessinateur industriel', 'projeteur cao'],
    frSkill: 'Conception CAO/Calcul, Qualification Technique & Normes Sectorielles',
    enSkill: 'CAD/Simulation Engineering, Technical Qualification & Industry Compliance',
  },
  {
    aliases: ['operateur de production', 'operatrice de production', 'soudeur', 'soudeuse', 'chaudronnier', 'tourneur fraiseur', 'usineur', 'regleur'],
    frSkill: 'Conduite d\'Équipements Industriels, Contrôle Qualité en Ligne & Respect Sécurité',
    enSkill: 'Production Line Operation, In-Process Quality Checks & Safety Compliance',
  },

  // =========================================================================
  // 13. BTP, CONSTRUCTION, ARCHITECTURE & IMMOBILIER
  // =========================================================================
  {
    aliases: ['architecte', 'architecte dplg', 'architecte hmonp', 'urbaniste', 'paysagiste', 'bim manager', 'coordinateur bim'],
    frSkill: 'Conception Architecturale, Maquette Numérique BIM & Maîtrise d\'Œuvre',
    enSkill: 'Architectural Design, BIM Coordination & Design-Build Supervision',
  },
  {
    aliases: ['conducteur de travaux', 'conductrice de travaux', 'chef de chantier', 'maitre d\'oeuvre', 'ingenieur travaux', 'site manager', 'construction manager'],
    frSkill: 'Pilotage de Chantiers, Coordination Corps d\'État, Planning & Sécurité BTP',
    enSkill: 'Construction Site Management, Subcontractor Coordination & Safety',
  },
  {
    aliases: ['ingenieur genie civil', 'civil engineer', 'ingenieur structure', 'structural engineer', 'ingenieur btp', 'ingenieur fluides', 'ingenieur cvc', 'economiste de la construction', 'ingenieur etudes de prix', 'dessinateur projeteur', 'geometre', 'topographe'],
    frSkill: 'Études Techniques BTP, Chiffrage / Métrés, Dimensionnement & Normes Constructives',
    enSkill: 'Civil/Structural Engineering, Cost Estimation (BOQ) & Building Codes',
  },
  {
    aliases: ['promoteur immobilier', 'directeur de programmes immobiliers', 'asset manager immobilier', 'real estate asset manager', 'property manager', 'facility manager', 'gestionnaire immobilier', 'gestionnaire locatif', 'syndic de copropriete'],
    frSkill: 'Gestion d\'Actifs Immobiliers (Asset/Property), Rentabilité Locative & Travaux',
    enSkill: 'Real Estate Asset & Property Management, Yield Optimization & Capex',
  },
  {
    aliases: ['agent immobilier', 'negociateur immobilier', 'conseiller immobilier', 'mandataire immobilier', 'real estate agent', 'diagnostiqueur immobilier'],
    frSkill: 'Prospection Foncière, Estimation, Négociation Immobilière & Suivi Notarial',
    enSkill: 'Property Valuation, Real Estate Brokerage & Transaction Closing',
  },

  // =========================================================================
  // 14. SANTÉ, MÉDICAL, PARAMÉDICAL, PHARMA & SOCIAL
  // =========================================================================
  {
    aliases: ['medecin', 'doctor', 'physician', 'chirurgien', 'surgeon', 'dentiste', 'chirurgien dentiste', 'veterinaire', 'pharmacien', 'pharmacienne', 'pharmacist', 'preparateur en pharmacie', 'sage femme', 'sage-femme'],
    frSkill: 'Diagnostic Clinique, Prise en Charge Thérapeutique & Protocoles Médicaux',
    enSkill: 'Clinical Assessment, Patient Care Protocols & Medical Governance',
  },
  {
    aliases: ['infirmier', 'infirmiere', 'ide', 'nurse', 'registered nurse', 'cadre de sante', 'aide soignant', 'aide-soignant', 'auxiliaire de puericulture', 'kinesitherapeute', 'physiotherapist', 'osteopathe', 'ergotherapeute', 'orthophoniste', 'psychologue', 'psychologist', 'dieteticien', 'dieteticienne'],
    frSkill: 'Soins Patients, Coordination Pluridisciplinaire & Traçabilité Dossier Médical',
    enSkill: 'Patient Care Delivery, Multidisciplinary Coordination & Clinical Documentation',
  },
  {
    aliases: ['attache de recherche clinique', 'arc', 'cra', 'clinical research associate', 'clinical trial manager', 'medical science liaison', 'msl', 'visiteur medical', 'delegue pharmaceutique', 'biologiste', 'technicien de laboratoire'],
    frSkill: 'Monitoring d\'Essais Cliniques (BPC/GCP), Pharmacovigilance & Relations Médicales',
    enSkill: 'Clinical Trial Monitoring (GCP), Pharmacovigilance & Scientific Engagement',
  },
  {
    aliases: ['assistant social', 'assistante sociale', 'social worker', 'educateur specialise', 'educatrice specialisee', 'moniteur educateur', 'animateur socioculturel', 'directeur ehpad'],
    frSkill: 'Accompagnement Socio-Éducatif, Montage de Dossiers & Coordination Réseau',
    enSkill: 'Social Case Management, Beneficiary Support & Institutional Coordination',
  },

  // =========================================================================
  // 15. ENSEIGNEMENT, RECHERCHE & CONSEIL
  // =========================================================================
  {
    aliases: ['professeur', 'professeure', 'enseignant', 'enseignante', 'teacher', 'professor', 'instituteur', 'institutrice', 'maitre de conferences', 'lecturer', 'formateur', 'formatrice', 'trainer', 'ingenieur pedagogique', 'instructional designer', 'cpe'],
    frSkill: 'Ingénierie Pédagogique, Animation de Formations & Évaluation des Acquis',
    enSkill: 'Curriculum Design, Training Facilitation & Learning Assessment',
  },
  {
    aliases: ['chercheur', 'chercheuse', 'researcher', 'doctorant', 'doctorante', 'phd candidate', 'post-doctorant', 'postdoc'],
    frSkill: 'Conduite de Projets de Recherche, Publications Scientifiques & Analyse Critique',
    enSkill: 'Scientific Research Execution, Peer-Reviewed Publishing & Experimentation',
  },
  {
    aliases: ['consultant', 'consultante', 'consultant strategie', 'strategy consultant', 'consultant management', 'management consultant', 'consultant organisation'],
    frSkill: 'Diagnostic Stratégique, Structuration de Recommandations & Conduite de Mission',
    enSkill: 'Strategic Diagnostics, Structured Problem Solving & Client Advisory',
  },
  {
    aliases: ['coach', 'coach professionnel', 'executive coach', 'coach carriere'],
    frSkill: 'Accompagnement Individuel/Collectif, Questionnement Structurant & Plans de Progrès',
    enSkill: 'Executive Coaching, Goal Framing & Leadership Development',
  },

  // =========================================================================
  // 16. HÔTELLERIE, RESTAURATION, TOURISME & AÉRIEN
  // =========================================================================
  {
    aliases: ['directeur d\'hotel', 'hotel manager', 'receptionniste', 'receptionist', 'concierge', 'gouvernant', 'gouvernante', 'maitre d\'hotel', 'chef de rang', 'serveur', 'serveuse', 'sommelier', 'barman', 'barmaid'],
    frSkill: 'Accueil Haut de Gamme, Excellence de Service, Revenue Management & Fidélisation',
    enSkill: 'Hospitality Excellence, Guest Relations, Yield Management & Service Quality',
  },
  {
    aliases: ['chef de cuisine', 'executive chef', 'sous-chef', 'cuisinier', 'cuisiniere', 'chef patissier', 'patissier', 'patissiere', 'boulanger', 'boulangere', 'traiteur', 'boucher', 'directeur de restaurant'],
    frSkill: 'Gestion de Brigade, Maîtrise Coûts Matières, Normes HACCP & Créativité Culinaire',
    enSkill: 'Kitchen Leadership, Food Cost Control, HACCP Compliance & Culinary Execution',
  },
  {
    aliases: ['agent de voyage', 'conseiller voyage', 'guide touristique', 'travel agent', 'steward', 'hotesse de l\'air', 'flight attendant', 'pilote de ligne', 'pilot', 'controleur aerien'],
    frSkill: 'Sécurité Opérationnelle, Gestion de Flux Passagers & Relation Client Internationale',
    enSkill: 'Operational Safety, Passenger/Travel Operations & International Client Service',
  },

  // =========================================================================
  // 17. ADMINISTRATION, SECRÉTARIAT, SERVICES GÉNÉRAUX & MANAGEMENT GÉNÉRAL
  // =========================================================================
  {
    aliases: ['assistant de direction', 'assistante de direction', 'executive assistant', 'ea', 'secretaire', 'secretaire medical', 'secretaire juridique', 'assistant administratif', 'assistante administrative', 'gestionnaire administratif', 'charge d\'accueil', 'hote d\'accueil', 'hotesse d\'accueil', 'responsable services generaux'],
    frSkill: 'Coordination d\'Agendas Exécutifs, Gestion Administrative & Organisation Logistique',
    enSkill: 'Executive Calendar Governance, Administrative Operations & Office Coordination',
  },
  {
    aliases: ['directeur', 'directrice', 'director', 'head of'],
    frSkill: 'Direction Stratégique, Arbitrage Budgétaire & Gouvernance d\'Équipes',
    enSkill: 'Strategic Leadership, Budget Governance & Cross-Team Management',
  },
  {
    aliases: ['responsable', 'manager', 'team lead', 'team leader', 'supervisor', 'superviseur', 'chef d\'equipe'],
    frSkill: 'Management d\'Équipe, Pilotage d\'Activité & Atteinte des Objectifs (KPI)',
    enSkill: 'People Management, Operational Execution & KPI Delivery',
  },
  {
    aliases: ['coordinateur', 'coordinatrice', 'coordinator'],
    frSkill: 'Coordination Transverse, Planification & Alignement des Parties Prenantes',
    enSkill: 'Cross-Functional Coordination, Scheduling & Stakeholder Alignment',
  },
  {
    aliases: ['stagiaire', 'alternant', 'alternante', 'apprenti', 'apprentie', 'intern', 'trainee'],
    frSkill: 'Contribution Opérationnelle, Montée en Compétences & Esprit d\'Initiative',
    enSkill: 'Operational Execution, Rapid Ramp-Up & Collaborative Contribution',
  },
];

// Construction automatique des dictionnaires FR, EN et du Set universel de détection
export const JOB_TITLE_TO_SKILLS_MAP: Record<string, string> = {};
export const JOB_TITLE_TO_SKILLS_MAP_EN: Record<string, string> = {};
export const KNOWN_JOB_TITLES_SET = new Set<string>();

for (const entry of ROLE_CATALOG) {
  for (const alias of entry.aliases) {
    const cleanAlias = normalizeKey(alias);
    const rawAlias = alias.trim().toLowerCase();
    JOB_TITLE_TO_SKILLS_MAP[cleanAlias] = entry.frSkill;
    JOB_TITLE_TO_SKILLS_MAP[rawAlias] = entry.frSkill;
    JOB_TITLE_TO_SKILLS_MAP_EN[cleanAlias] = entry.enSkill;
    JOB_TITLE_TO_SKILLS_MAP_EN[rawAlias] = entry.enSkill;
    KNOWN_JOB_TITLES_SET.add(cleanAlias);
    KNOWN_JOB_TITLES_SET.add(rawAlias);
  }
}

/**
 * Compétences pures / méthodologies / disciplines / outils qui ne doivent JAMAIS
 * être classés à tort comme des intitulés de postes par le moteur morphologique.
 */
const GENUINE_SKILLS_GUARD = new Set<string>([
  'gestion de projet',
  'management de projet',
  'project management',
  'product management',
  'change management',
  'risk management',
  'quality management',
  'time management',
  'stakeholder management',
  'data management',
  'knowledge management',
  'talent management',
  'performance management',
  'conflict management',
  'incident management',
  'release management',
  'asset management',
  'wealth management',
  'financial management',
  'budget management',
  'inventory management',
  'category management',
  'account management',
  'vendor management',
  'supplier management',
  'service management',
  'customer relationship management',
  'crm',
  'erp',
  'sirh',
  'hris',
  'wms',
  'tms',
  'mrp',
  'drp',
  's&op',
  'sop',
  'cpfr',
  'otif',
  'mape',
  'kpi',
  'kpis',
  'roi',
  'sla',
  'agile',
  'scrum',
  'kanban',
  'safe',
  'lean',
  'six sigma',
  'devops',
  'ci/cd',
  'tdd',
  'bdd',
  'ux design',
  'ui design',
  'graphic design',
  'web design',
  'data analysis',
  'data visualization',
  'data engineering',
  'software engineering',
  'machine learning',
  'deep learning',
  'generative ai',
  'artificial intelligence',
  'business intelligence',
  'assurance qualite',
  'quality assurance',
  'qa',
  'ux',
  'ui',
  'user acceptance testing',
  'uat',
  'api integration',
  'rest apis',
  'cloud computing',
  'cybersecurity',
  'digital marketing',
  'content marketing',
  'growth hacking',
  'seo',
  'sea',
  'financial modeling',
  'financial controlling',
  'financial reporting',
  'accounting',
  'auditing',
  'negotiation',
  'negociation',
  'communication',
  'leadership',
  'teamwork',
  'problem solving',
  'critical thinking',
  'adaptability',
  'autonomy',
  'excel',
  'advanced excel',
  'excel avance',
  'power bi',
  'tableau',
  'sql',
  'python',
  'sap',
  'sap apo',
  'sap s/4hana',
  'sap ecc',
  'azap',
  'futurmaster',
  'salesforce',
]);

// Archétypes morphologiques FR pour déduire automatiquement une compétence réelle depuis n'importe quel titre composé
const FR_ROLE_PREFIX_RULES: Array<{
  regex: RegExp;
  frTemplate: (domain: string) => string;
  enTemplate: (domain: string) => string;
}> = [
  {
    regex: /^(?:directeur|directrice|vp|vice[- ]?pr[ée]sident[e]?|head\s+of|chief)\s+(?:de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|of\s+)?(.+)$/i,
    frTemplate: (d) => `Direction Stratégique, Gouvernance & Pilotage (${d})`,
    enTemplate: (d) => `Strategic Leadership, Governance & Execution (${d})`,
  },
  {
    regex: /^(?:responsable|manager|superviseur|animateur|animatrice|pilote|chef\s+de\s+(?:service|d[ée]partement|p[ôo]le|[ée]quipe|atelier|chantier|rayon|secteur|magasin))\s+(?:de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|en\s+)?(.+)$/i,
    frTemplate: (d) => `Pilotage Opérationnel, Management & Performance (${d})`,
    enTemplate: (d) => `Operational Management, Team Leadership & KPIs (${d})`,
  },
  {
    regex: /^(?:chef\s+de\s+projet|cheffe\s+de\s+projet|coordinateur|coordinatrice)\s+(?:de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|en\s+)?(.+)$/i,
    frTemplate: (d) => `Cadrage de Projet, Coordination Transverse & Delivery (${d})`,
    enTemplate: (d) => `Project Scoping, Cross-Functional Coordination & Delivery (${d})`,
  },
  {
    regex: /^(?:charg[ée]e?|gestionnaire|administrateur|administratrice|assistant[e]?|attach[ée]e?|conseiller|conseill[èe]re|sp[ée]cialiste|r[ée]f[ée]rent[e]?)\s+(?:de\s+mission\s+|de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|en\s+)?(.+)$/i,
    frTemplate: (d) => `Gestion Opérationnelle, Suivi & Mise en Œuvre (${d})`,
    enTemplate: (d) => `Operational Execution, Coordination & Advisory (${d})`,
  },
  {
    regex: /^(?:ing[ée]nieur[e]?|architecte|d[ée]veloppeur|d[ée]veloppeuse|technicien|technicienne)\s+(?:en\s+|de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d')?(.+)$/i,
    frTemplate: (d) => `Conception Technique, Ingénierie & Déploiement (${d})`,
    enTemplate: (d) => `Technical Design, Engineering & Implementation (${d})`,
  },
  {
    regex: /^(?:analyste|auditeur|auditrice|contr[ôo]leur|contr[ôo]leuse|expert[e]?|consultant[e]?)\s+(?:en\s+|de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d')?(.+)$/i,
    frTemplate: (d) => `Analyse, Diagnostic, Audit & Conseil (${d})`,
    enTemplate: (d) => `Analytical Diagnostics, Auditing & Advisory (${d})`,
  },
  {
    regex: /^(?:planificateur|planificatrice|ordonnanceur|ordonnanceuse|approvisionneur|approvisionneuse|pr[ée]visionniste|acheteur|acheteuse)\s+(?:de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|en\s+)?(.+)$/i,
    frTemplate: (d) => `Planification, Optimisation des Flux & Arbitrages (${d})`,
    enTemplate: (d) => `Planning, Flow Optimization & Trade-Off Execution (${d})`,
  },
  {
    regex: /^(?:commercial[e]?|vendeur|vendeuse|n[ée]gociateur|n[ée]gociatrice|formateur|formatrice|chercheur|chercheuse|r[ée]dacteur|r[ée]dactrice|op[ée]rateur|op[ée]ratrice|conducteur|conductrice|agent|cadre|m[ée]decin|infirmier|infirmi[èe]re|juriste|comptable|tr[ée]sorier|tr[ée]sori[èe]re|magasinier|magasini[èe]re|pr[ée]parateur|pr[ée]paratrice)\s+(?:de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+|d'|en\s+)?(.+)$/i,
    frTemplate: (d) => `Exécution Métier Spécialisée & Maîtrise Opérationnelle (${d})`,
    enTemplate: (d) => `Specialized Operational Execution & Domain Mastery (${d})`,
  },
];

// Archétypes morphologiques EN pour tout poste ou discipline métier composé (ex: "Senior Revenue Analyst", "Cloud Security Architect")
const EN_ROLE_SUFFIX_RULES: Array<{
  regex: RegExp;
  frTemplate: (domain: string) => string;
  enTemplate: (domain: string) => string;
}> = [
  {
    regex: /^(.+?)\s+(?:director|head|vp|chief(?:\s+officer)?|officer)$/i,
    frTemplate: (d) => `Direction Stratégique, Gouvernance & Pilotage (${d})`,
    enTemplate: (d) => `Strategic Leadership, Governance & Execution (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:manager|lead|leader|supervisor|owner|master)$/i,
    frTemplate: (d) => `Pilotage Opérationnel, Management & Performance (${d})`,
    enTemplate: (d) => `Operational Management, Leadership & KPI Delivery (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:architect|engineer|developer|programmer|builder)$/i,
    frTemplate: (d) => `Conception Technique, Architecture & Ingénierie (${d})`,
    enTemplate: (d) => `Technical Architecture, Engineering & Delivery (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:analyst|scientist|researcher|economist|actuary|statistician)$/i,
    frTemplate: (d) => `Analyse Quantitative, Modélisation & Insights (${d})`,
    enTemplate: (d) => `Quantitative Analysis, Modeling & Actionable Insights (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:auditor|controller|accountant|treasurer|underwriter|broker)$/i,
    frTemplate: (d) => `Contrôle, Audit, Conformité & Pilotage Financier (${d})`,
    enTemplate: (d) => `Financial Control, Auditing & Risk Governance (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:consultant|advisor|strategist|partner|specialist|expert|practitioner)$/i,
    frTemplate: (d) => `Conseil Expert, Diagnostic & Mise en Œuvre (${d})`,
    enTemplate: (d) => `Expert Advisory, Diagnostics & Execution (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:coordinator|administrator|executive|representative|associate|assistant|recruiter)$/i,
    frTemplate: (d) => `Coordination Transverse & Gestion Opérationnelle (${d})`,
    enTemplate: (d) => `Cross-Functional Coordination & Operational Execution (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:planner|planning|buyer|purchaser|scheduler|merchandiser)$/i,
    frTemplate: (d) => `Planification, Prévisions & Optimisation (${d})`,
    enTemplate: (d) => `Planning, Forecasting & Resource Optimization (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:designer|illustrator|writer|editor|producer)$/i,
    frTemplate: (d) => `Conception Créative, Prototypage & Production (${d})`,
    enTemplate: (d) => `Creative Design, Prototyping & Content Production (${d})`,
  },
  {
    regex: /^(.+?)\s+(?:technician|operator|mechanic|electrician|driver|worker|nurse|therapist|doctor|physician|counsel|lawyer)$/i,
    frTemplate: (d) => `Exécution Spécialisée, Maintenance & Sécurité (${d})`,
    enTemplate: (d) => `Specialized Execution, Reliability & Compliance (${d})`,
  },
];

// Archétypes "Chief ... Officer" (C-Suite arbitraires)
const CHIEF_OFFICER_REGEX = /^chief\s+(.+?)\s+officer$/i;

function formatDomainLabel(domain: string): string {
  return domain
    .trim()
    .replace(/\b(?:h\/f|f\/h|m\/f)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:,\s]+|[-–—:,\s]+$/g, '')
    .replace(/(^|\s|[-'/])(\p{L})/gu, (_, sep: string, ch: string) => `${sep}${ch.toUpperCase()}`);
}

function classifyDynamicRole(rawTerm: string, isEn: boolean): string | null {
  const stripped = stripRoleModifiers(rawTerm);
  const clean = normalizeKey(stripped);
  if (!clean || GENUINE_SKILLS_GUARD.has(clean)) return null;

  // Chief ... Officer
  const chiefMatch = stripped.match(CHIEF_OFFICER_REGEX);
  if (chiefMatch && chiefMatch[1]) {
    const dom = formatDomainLabel(chiefMatch[1]);
    return isEn
      ? `Executive Leadership & Enterprise Strategy (${dom})`
      : `Direction Stratégique & Gouvernance (${dom})`;
  }

  // Règles FR (préfixes)
  for (const rule of FR_ROLE_PREFIX_RULES) {
    const m = stripped.match(rule.regex);
    if (m && m[1] && m[1].trim().length >= 2) {
      const domainNorm = normalizeKey(m[1]);
      if (domainNorm && m[1].trim().split(/\s+/).length <= 6) {
        const dom = formatDomainLabel(m[1]);
        return isEn ? rule.enTemplate(dom) : rule.frTemplate(dom);
      }
    }
  }

  // Règles EN (suffixes)
  for (const rule of EN_ROLE_SUFFIX_RULES) {
    const m = stripped.match(rule.regex);
    if (m && m[1] && m[1].trim().length >= 2) {
      const domainNorm = normalizeKey(m[1]);
      // Eviter de capturer des locutions verbales génériques
      if (domainNorm && m[1].trim().split(/\s+/).length <= 5) {
        const dom = formatDomainLabel(m[1]);
        return isEn ? rule.enTemplate(dom) : rule.frTemplate(dom);
      }
    }
  }

  return null;
}

// Traduction rapide FR -> EN des compétences canoniques pour affichage/coach cohérent en offre anglaise
const SKILL_FR_TO_EN_MAP: Record<string, string> = {
  'intégration & apis': 'API Integration',
  'apis rest': 'REST APIs',
  'bus d\'échange & flux (esb)': 'Enterprise Service Bus (ESB)',
  'flux de données & etl': 'Data Pipelines & ETL',
  'cybersécurité': 'Cybersecurity',
  'ia générative': 'Generative AI',
  'analyse de données': 'Data Analysis',
  'visualisation de données': 'Data Visualization',
  'produits & solutions data': 'Data Products & Solutions',
  'gestion & qualité des données': 'Data Management & Quality',
  'intelligence artificielle (ia)': 'Artificial Intelligence (AI)',
  'assurance qualité (qa)': 'Quality Assurance (QA)',
  'excel avancé': 'Advanced Excel',
  'architecture fonctionnelle': 'Functional Architecture',
  'architecture applicative': 'Application Architecture',
  'architecture des systèmes d\'information': 'Information Systems Architecture',
  'urbanisation du si': 'IT Landscape Urbanization',
  'cartographie applicative & flux': 'Application & Data Flow Mapping',
  'spécifications fonctionnelles (sfd)': 'Functional Specifications',
  'modélisation de données & processus': 'Data & Process Modeling',
  'modélisation bpmn': 'BPMN Process Modeling',
  'modélisation uml': 'UML Modeling',
  'modélisation mcd/mld': 'Data Modeling (ERD)',
  'recueil des besoins métiers': 'Business Requirements Gathering',
  'cadrage fonctionnel & métier': 'Functional Scoping & Framing',
  'analyse d\'impact fonctionnel': 'Functional Impact Analysis',
  'gouvernance si & données': 'IT & Data Governance',
  'automatisation de workflows': 'Workflow Automation',
  'amoa & maîtrise d\'ouvrage': 'Business Analysis (AMOA)',
  'maîtrise d\'ouvrage (moa)': 'Business Ownership (MOA)',
  'gestion de projet': 'Project Management',
  'management de projet': 'Project Management',
  'méthodologie agile': 'Agile Methodology',
  'framework safe': 'SAFe Framework',
  'gestion de product backlog': 'Product Backlog Management',
  'backlog refinement & cadrage': 'Backlog Refinement',
  'rédaction d\'user stories': 'User Story Writing',
  'recette fonctionnelle (uat)': 'User Acceptance Testing (UAT)',
  'tests & validation fonctionnelle': 'Functional Testing & Validation',
  'pilotage de roadmap produit': 'Product Roadmap Management',
  'animation des sprints & rituels': 'Sprint & Scrum Ceremonies',
  'gestion des releases': 'Release Management',
  'priorisation de la valeur métier': 'Business Value Prioritization',
  'expérience utilisateur (ux)': 'User Experience (UX)',
  'conception d\'interfaces (ui)': 'User Interface Design (UI)',
  'wireframes & prototypage': 'Wireframing & Prototyping',
  'cycle en v': 'Waterfall / V-Model',
  'pilotage tma & support n2/n3': 'Application Maintenance & L2/L3 Support',
  'conduite du changement': 'Change Management',
  'gestion des risques': 'Risk Management',
  'cahier des charges': 'Business Requirements Specification',
  'pilotage des kpi': 'KPI Tracking & Analytics',
  'reporting & tableaux de bord': 'Reporting & Dashboards',
  'vente b2b': 'B2B Sales',
  'prospection commerciale': 'Sales Prospecting',
  'négociation commerciale': 'Commercial Negotiation',
  'négociation': 'Negotiation',
  'marketing digital': 'Digital Marketing',
  'seo (référencement)': 'SEO',
  'gestion de la relation client': 'Customer Relationship Management',
  'relation client': 'Client Relations',
  'satisfaction client': 'Customer Satisfaction',
  'contrôle de gestion': 'Financial Controlling',
  'audit & contrôle': 'Audit & Internal Control',
  'comptabilité': 'Accounting',
  'clôture comptable': 'Financial Close',
  'pilotage p&l': 'P&L Management',
  'gestion budgétaire': 'Budget Management',
  'modélisation financière': 'Financial Modeling',
  'normes ifrs': 'IFRS Standards',
  'fiscalité': 'Taxation',
  'conformité rgpd': 'GDPR Compliance',
  'compliance & conformité': 'Regulatory Compliance',
  'droit du travail': 'Labor Law',
  'recrutement & sourcing': 'Recruitment & Sourcing',
  'sirh': 'HRIS',
  'gestion de la paie': 'Payroll Management',
  'relations sociales': 'Employee Relations',
  'logistique': 'Logistics',
  'gestion des achats': 'Procurement & Purchasing',
  'gestion des stocks': 'Inventory Management',
  'amélioration continue': 'Continuous Improvement',
  'management d\'équipe': 'Team Leadership',
  'esprit d\'analyse': 'Analytical Thinking',
  'esprit de synthèse': 'Strategic Synthesis',
  'rigueur & précision': 'Attention to Detail & Rigor',
  'autonomie': 'Autonomy & Ownership',
  'résolution de problèmes': 'Problem Solving',
  'gestion des priorités': 'Prioritization',
  'communication transverse': 'Cross-Functional Communication',
  'travail en équipe': 'Team Collaboration',
  'sens du relationnel': 'Interpersonal Skills',
  'capacité d\'adaptation': 'Adaptability',
  'force de proposition': 'Proactive Initiative',
  'prise de décision': 'Decision Making',
  'sens de l\'organisation': 'Organizational Skills',
  'gestion de projet & delivery': 'Project & Delivery Management',
  'résolution de problèmes complexes': 'Complex Problem Solving',
  'communication d\'impact': 'Impactful Communication',
  'leadership & conduite du changement': 'Cross-Functional Leadership & Change Management',
  'processus s&op': 'S&OP Process',
  'prévision des ventes': 'Sales Forecasting',
  'approvisionnement': 'Procurement & Replenishment',
  'taux de service': 'Service Level Management (OTIF)',
  'gestion des ruptures': 'Stockout Prevention',
  'gestion fournisseurs': 'Supplier Management',
  'performance otif': 'OTIF Performance',
  'planification collaborative (cpfr)': 'Collaborative Planning (CPFR)',
  'pilotage sell-in / sell-out': 'Sell-In / Sell-Out Forecasting',
  'plan directeur de production': 'Master Production Schedule (MPS)',
  'adéquation charge / capacité': 'Capacity vs. Load Balancing',
  'lean manufacturing': 'Lean Manufacturing',
  'six sigma': 'Six Sigma',
  'normes iso 9001': 'ISO 9001 Quality Standards',
  'normes haccp': 'HACCP Food Safety',
  'maquette bim': 'BIM Modeling',
  'droit des affaires': 'Corporate Law',
  'droit social': 'Employment & Labor Law',
  'gestion de trésorerie': 'Treasury & Cash Management',
};

export function localizeSkillForLanguage(term: string, isEn: boolean): string {
  if (!term || typeof term !== 'string') return '';
  const trimmed = term.trim();
  if (!isEn) return trimmed;
  const lower = trimmed.toLowerCase();
  if (SKILL_FR_TO_EN_MAP[lower]) return SKILL_FR_TO_EN_MAP[lower];
  const norm = normalizeKey(trimmed);
  for (const [frKey, enVal] of Object.entries(SKILL_FR_TO_EN_MAP)) {
    if (normalizeKey(frKey) === norm) {
      return enVal;
    }
  }
  return trimmed;
}

/**
 * Vérifie si une chaîne correspond à un poste / fonction / métier plutôt qu'à une compétence atomique.
 * Fonctionne à la fois sur le catalogue exhaustif et par analyse morphologique universelle.
 */
export function isJobTitle(term: string): boolean {
  if (!term || typeof term !== 'string') return false;
  const cleanRaw = normalizeKey(term);
  if (!cleanRaw || GENUINE_SKILLS_GUARD.has(cleanRaw)) return false;

  const stripped = normalizeKey(stripRoleModifiers(term));
  if (!stripped || GENUINE_SKILLS_GUARD.has(stripped)) return false;

  if (KNOWN_JOB_TITLES_SET.has(cleanRaw) || KNOWN_JOB_TITLES_SET.has(stripped)) {
    return true;
  }

  if (classifyDynamicRole(term, false) !== null) {
    return true;
  }

  for (const jobKey of KNOWN_JOB_TITLES_SET) {
    if (jobKey.length < 4) continue;
    if (stripped.startsWith(jobKey + ' ') || stripped.endsWith(' ' + jobKey)) {
      return true;
    }
  }

  return false;
}

/**
 * Transforme un terme brut en véritable compétence s'il s'agit d'un poste / métier,
 * ou conserve/localise la compétence selon la langue cible.
 */
export function normalizeToTrueSkill(
  term: string,
  fallback = 'Gestion de Projet & Delivery',
  isEn = false
): { skill: string; wasJobTitle: boolean; originalJobTitle?: string } {
  const effectiveFallback = isEn && fallback === 'Gestion de Projet & Delivery'
    ? 'Project & Delivery Management'
    : fallback;

  if (!term || typeof term !== 'string') {
    return { skill: effectiveFallback, wasJobTitle: false };
  }

  const trimmed = term.trim();
  const cleanRaw = normalizeKey(trimmed);
  const cleanStripped = normalizeKey(stripRoleModifiers(trimmed));

  // Protéger explicitement les vraies compétences avant toute détection métier
  if (GENUINE_SKILLS_GUARD.has(cleanRaw) || GENUINE_SKILLS_GUARD.has(cleanStripped)) {
    return {
      skill: localizeSkillForLanguage(trimmed, isEn),
      wasJobTitle: false,
    };
  }

  const titleMap = isEn ? JOB_TITLE_TO_SKILLS_MAP_EN : JOB_TITLE_TO_SKILLS_MAP;

  // 1. Correspondance directe exacte (brute ou sans séniorité/H-F)
  if (titleMap[cleanRaw]) {
    return {
      skill: titleMap[cleanRaw],
      wasJobTitle: true,
      originalJobTitle: trimmed,
    };
  }
  if (titleMap[cleanStripped]) {
    return {
      skill: titleMap[cleanStripped],
      wasJobTitle: true,
      originalJobTitle: trimmed,
    };
  }

  // 2. Analyse morphologique dynamique pour tout intitulé composé / inédit (ex: "Senior Cloud Security Architect", "Responsable Qualité Agroalimentaire")
  // Prioritaire avant le matching partiel générique pour conserver la richesse du domaine spécifique !
  const dynamicSkill = classifyDynamicRole(trimmed, isEn);
  if (dynamicSkill) {
    return {
      skill: dynamicSkill,
      wasJobTitle: true,
      originalJobTitle: trimmed,
    };
  }

  // 3. Correspondance partielle sur les rôles connus les plus longs (du plus spécifique au plus général)
  const sortedKeys = Object.keys(titleMap).sort((a, b) => b.length - a.length);
  for (const jobKey of sortedKeys) {
    if (jobKey.length < 4) continue; // éviter les sigles courts (po, pm, ba, ea) en matching partiel
    if (
      cleanStripped === jobKey ||
      cleanStripped.startsWith(jobKey + ' ') ||
      cleanStripped.endsWith(' ' + jobKey)
    ) {
      return {
        skill: titleMap[jobKey],
        wasJobTitle: true,
        originalJobTitle: trimmed,
      };
    }
  }

  return {
    skill: localizeSkillForLanguage(trimmed, isEn),
    wasJobTitle: false,
  };
}
