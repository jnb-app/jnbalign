export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolioUrl?: string;
}

export interface SkillCategory {
  categoryName: string;
  skills: string[];
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  bullets: string[];
  keyAchievementsHighlighted?: string[];
  matchedKeywordsInRole?: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  graduationDate: string;
  honorsOrDetails?: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  year?: string;
}

export interface LanguageItem {
  language: string;
  proficiency: string;
}

export interface OptimizedCv {
  personalInfo: PersonalInfo;
  professionalSummary: string;
  skillsCategories: SkillCategory[];
  experiences: ExperienceItem[];
  education: EducationItem[];
  certifications?: CertificationItem[];
  languages?: LanguageItem[];
  languageMode?: 'fr' | 'en';
}

export interface KeywordsAnalysis {
  criticalRequiredKeywords: string[];
  matchedKeywords: string[];
  integratedKeywords: string[];
  missingOrGaps: string[];
}

export interface AtsComplianceAudit {
  status: 'compliant' | 'warning';
  highlights: string[];
  recommendations: string[];
}

export interface SemanticGapAnalysis {
  jobOverview: {
    title: string;
    company: string;
    industry: string;
    summary: string;
  };
  scores: {
    initialAtsScore: number;
    optimizedAtsScore: number;
    scoreExplanation: string;
  };
  keywordsAnalysis: KeywordsAnalysis;
  atsComplianceAudit: AtsComplianceAudit;
  languageMode?: 'fr' | 'en';
}

export interface CoverLetterParagraphs {
  vous: string;
  moi: string;
  nous: string;
}

export interface CoverLetter {
  header: {
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    recipientNameOrTitle: string;
    companyName: string;
    date: string;
    subjectLine: string;
  };
  paragraphs: CoverLetterParagraphs;
  signOff: string;
  fullTextFormatted?: string;
  languageMode?: 'fr' | 'en';
}

export interface PipelineResult {
  semanticGap: SemanticGapAnalysis;
  optimizedCv: OptimizedCv;
  coverLetter: CoverLetter;
  languageMode?: 'fr' | 'en';
}

export interface SamplePreset {
  id: string;
  label: string;
  roleTarget: string;
  companyTarget: string;
  candidateName: string;
  cvText: string;
  jobText: string;
}
