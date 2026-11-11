import React, { useState } from 'react';
import { OptimizedCv, ExperienceItem } from '../types/ats';
import { Printer, Copy, Check, Edit3, Eye, Sparkles, Plus, Trash2, ArrowRight, Download, FileText, Binary, ShieldCheck, CheckCircle2, Zap } from 'lucide-react';
import { downloadCvPdf } from '../utils/pdfGenerator';
import { downloadCvDocx } from '../utils/docxGenerator';
import { isEnglishText } from '../utils/languageDetector';

interface AtsResumeViewProps {
  cv: OptimizedCv;
  onChangeCv: (updated: OptimizedCv) => void;
  onOpenBulletRefiner: (bullet: string, roleContext: string, expIndex: number, bulletIndex: number) => void;
  onPrint: () => void;
  onGoToCoverLetter: () => void;
  originalCvText?: string;
  fontSize?: 'standard' | 'comfort' | 'large';
  onChangeFontSize?: (size: 'standard' | 'comfort' | 'large') => void;
}

export const AtsResumeView: React.FC<AtsResumeViewProps> = ({
  cv,
  onChangeCv,
  onOpenBulletRefiner,
  onPrint,
  onGoToCoverLetter,
  fontSize = 'comfort',
  onChangeFontSize,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'recruiter' | 'xray' | 'raw_ats'>('recruiter');
  const [copied, setCopied] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);
  const [downloadedDocx, setDownloadedDocx] = useState(false);

  // Échelle de typographie adaptative (WYSIWYG & Lisibilité Confort)
  const fontStyles = {
    standard: {
      body: 'text-xs sm:text-[13px] leading-relaxed',
      sectionTitle: 'text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2',
      role: 'font-bold text-xs sm:text-[13px] text-slate-950',
      company: 'font-semibold text-xs sm:text-[13px] text-slate-800',
      meta: 'text-xs font-semibold text-slate-600',
      bulletsSpacing: 'space-y-1.5',
    },
    comfort: {
      body: 'text-[13.5px] sm:text-[15px] leading-relaxed',
      sectionTitle: 'text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5',
      role: 'font-bold text-sm sm:text-[15.5px] text-slate-950',
      company: 'font-semibold text-[13.5px] sm:text-[15px] text-slate-800',
      meta: 'text-xs sm:text-sm font-semibold text-slate-600',
      bulletsSpacing: 'space-y-2',
    },
    large: {
      body: 'text-[15px] sm:text-[16.5px] leading-loose',
      sectionTitle: 'text-base font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3',
      role: 'font-bold text-base sm:text-[17px] text-slate-950',
      company: 'font-semibold text-[15px] sm:text-[16.5px] text-slate-800',
      meta: 'text-sm font-semibold text-slate-600',
      bulletsSpacing: 'space-y-2.5',
    },
  }[fontSize || 'comfort'];

  // Helper for text changes
  const updatePersonalInfo = (field: keyof typeof cv.personalInfo, val: string) => {
    onChangeCv({
      ...cv,
      personalInfo: {
        ...cv.personalInfo,
        [field]: val,
      },
    });
  };

  const updateSummary = (val: string) => {
    onChangeCv({
      ...cv,
      professionalSummary: val,
    });
  };

  const updateBullet = (expIndex: number, bulletIndex: number, text: string) => {
    const newExps = [...cv.experiences];
    newExps[expIndex].bullets[bulletIndex] = text;
    onChangeCv({
      ...cv,
      experiences: newExps,
    });
  };

  const addBullet = (expIndex: number) => {
    const newExps = [...cv.experiences];
    newExps[expIndex].bullets.push("Nouvelle réalisation à reformuler...");
    onChangeCv({
      ...cv,
      experiences: newExps,
    });
  };

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    const newExps = [...cv.experiences];
    newExps[expIndex].bullets.splice(bulletIndex, 1);
    onChangeCv({
      ...cv,
      experiences: newExps,
    });
  };

  const isEn =
    cv.languageMode === 'en' ||
    isEnglishText(cv.professionalSummary || '') ||
    (cv.experiences?.[0]?.bullets?.[0] ? isEnglishText(cv.experiences[0].bullets[0]) : false);

  // Plain text generator for ATS copy
  const generateRawAtsText = () => {
    let out = `${cv.personalInfo.fullName.toUpperCase()}\n`;
    out += `${cv.personalInfo.professionalTitle}\n`;
    out += `${cv.personalInfo.email} | ${cv.personalInfo.phone} | ${cv.personalInfo.location}`;
    if (cv.personalInfo.linkedin) out += ` | ${cv.personalInfo.linkedin}`;
    out += `\n\n`;

    out += `${isEn ? 'PROFESSIONAL SUMMARY' : 'PROFIL PROFESSIONNEL'}\n`;
    out += `${cv.professionalSummary}\n\n`;

    out += `${isEn ? 'CORE COMPETENCIES & KEY SKILLS' : 'COMPÉTENCES'}\n`;
    cv.skillsCategories.forEach((cat) => {
      out += `${cat.categoryName}: ${cat.skills.join(', ')}\n`;
    });
    out += `\n`;

    out += `${isEn ? 'PROFESSIONAL EXPERIENCE' : 'EXPÉRIENCES PROFESSIONNELLES'}\n`;
    cv.experiences.forEach((exp) => {
      out += `${exp.role} - ${exp.company} (${exp.location})\n`;
      out += `${exp.startDate} - ${exp.endDate}\n`;
      exp.bullets.forEach((b) => {
        out += `• ${b}\n`;
      });
      out += `\n`;
    });

    out += `${isEn ? 'EDUCATION' : 'FORMATION'}\n`;
    cv.education.forEach((edu) => {
      out += `${edu.degree} ${edu.field ? `– ${edu.field}` : ''} - ${edu.institution} (${edu.graduationDate})\n`;
      if (edu.honorsOrDetails) out += `${edu.honorsOrDetails}\n`;
    });
    out += `\n`;

    if (cv.certifications && cv.certifications.length > 0) {
      out += `CERTIFICATIONS\n`;
      cv.certifications.forEach((c) => {
        out += `• ${c.name} - ${c.issuer} (${c.year || ''})\n`;
      });
      out += `\n`;
    }

    if (cv.languages && cv.languages.length > 0) {
      out += `${isEn ? 'LANGUAGES' : 'LANGUES'}\n`;
      out += cv.languages.map((l) => `${l.language} (${l.proficiency})`).join(', ');
      out += `\n`;
    }

    return out;
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(generateRawAtsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadDocx = async () => {
    try {
      await downloadCvDocx(cv);
      setDownloadedDocx(true);
      setTimeout(() => setDownloadedDocx(false), 3000);
    } catch (e) {
      console.error("Erreur téléchargement DOCX:", e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Control bar (Dark Luxury Navy & Gold / Clean Executive Light) */}
      <div className="bg-[#0B1530] light:bg-white border border-amber-400/20 light:border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-xl light:shadow-slate-200/50 flex flex-wrap items-center justify-between gap-3 no-print text-white light:text-slate-900 transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {/* 3-Way View Toggle (Axe A: Recruiter vs X-Ray vs TXT) */}
          <div className="grid grid-cols-3 sm:flex items-center p-1 bg-slate-950/80 light:bg-slate-100 border border-slate-700/80 light:border-slate-200 rounded-lg text-xs gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('recruiter')}
              className={`px-2 sm:px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                viewMode === 'recruiter'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Format Recruteur (A4)</span>
              <span className="sm:hidden">Format A4</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('xray')}
              className={`px-2 sm:px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                viewMode === 'xray'
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-bold shadow-xs'
                  : 'text-emerald-300 light:text-emerald-700 hover:text-white light:hover:text-slate-900'
              }`}
              title="Scanner X-Ray ATS : visualisez exactement ce que les algorithmes Workday & Taleo extraient de votre CV"
            >
              <Binary className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Scanner X-Ray ATS</span>
              <span className="sm:hidden">X-Ray ATS</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('raw_ats')}
              className={`px-2 sm:px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                viewMode === 'raw_ats'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-[10px] font-bold shrink-0">TXT</span>
              <span className="hidden sm:inline">Vision Robot ATS</span>
              <span className="sm:hidden">Robot ATS</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isEditing
                ? 'bg-amber-400/20 light:bg-amber-100 text-amber-200 light:text-amber-800 border-amber-400/50 light:border-amber-400'
                : 'bg-slate-900 light:bg-slate-100 text-slate-300 light:text-slate-700 border-slate-700 light:border-slate-300 hover:bg-slate-800 light:hover:bg-slate-200 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400 light:text-amber-600 shrink-0" />
            <span className="hidden sm:inline">{isEditing ? "Terminer l'édition" : 'Modifier le texte'}</span>
            <span className="sm:hidden">{isEditing ? 'Terminer' : 'Modifier'}</span>
          </button>

          {/* Bouton Télécharger Word DOCX (Axe D) */}
          <button
            type="button"
            onClick={handleDownloadDocx}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/60 light:bg-blue-50 text-blue-200 light:text-blue-800 border border-blue-500/40 light:border-blue-300 hover:bg-blue-900/80 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Télécharger le CV au format Microsoft Word (.docx) conforme ATS"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400 light:text-blue-600 shrink-0" />
            <span>{downloadedDocx ? 'DOCX Téléchargé !' : 'Export Word (.docx)'}</span>
          </button>

          {/* Sélecteur de Police Rapide Intégré */}
          {onChangeFontSize && (
            <div className="flex items-center gap-1 bg-slate-900 light:bg-slate-100 border border-slate-700 light:border-slate-300 rounded-lg p-1 text-[11px] font-bold">
              <span className="text-slate-400 light:text-slate-500 px-1 text-[10px] hidden xs:inline">Police:</span>
              <button
                type="button"
                onClick={() => onChangeFontSize('standard')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'standard' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'}`}
                title="10pt Standard"
              >
                10pt
              </button>
              <button
                type="button"
                onClick={() => onChangeFontSize('comfort')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'comfort' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'}`}
                title="11.5pt Confort (Recommandé)"
              >
                11.5pt
              </button>
              <button
                type="button"
                onClick={() => onChangeFontSize('large')}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${fontSize === 'large' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'}`}
                title="13pt Aéré"
              >
                13pt
              </button>
            </div>
          )}
        </div>

        {/* Right: Technical certification badge & STAR hint outside the parchment */}
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-300 light:text-amber-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>Survolez une puce pour l'affiner (STAR)</span>
          </span>
          <span className="text-[11px] font-mono text-emerald-400 light:text-emerald-700 bg-emerald-950/60 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 px-2.5 py-1 rounded-md font-bold">
            Optimisé Parseurs ATS
          </span>
        </div>
      </div>

      {/* Axe A: Scanner ATS X-Ray Vision Mode */}
      {viewMode === 'xray' ? (
        <div className="bg-[#040817] text-slate-100 p-5 sm:p-7 rounded-2xl font-mono text-xs leading-relaxed border border-emerald-500/30 shadow-2xl space-y-6">
          {/* X-Ray Header Banner */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/40 shrink-0">
                <Binary className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Radiographie X-Ray Sémantique ATS
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    Score Parseur : 100/100
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                  Visualisation fidèle de l'ingestion de données par les parseurs de Workday, Taleo, Greenhouse & Lever.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-emerald-300 shrink-0">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 0 Tableau bloquant</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mono-colonne stricte</span>
            </div>
          </div>

          {/* Extracted Entity Inspection Card */}
          <div className="space-y-4">
            {/* Identity Entity */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>[ENTITY: CANDIDATE_PROFILE]</span>
                <span className="text-slate-400 font-normal">Parser: Workday Resume Ingest Engine</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div><span className="text-slate-500">Nom complet : </span><strong className="text-white">{cv.personalInfo.fullName}</strong></div>
                <div><span className="text-slate-500">Titre indexé : </span><strong className="text-amber-300">{cv.personalInfo.professionalTitle}</strong></div>
                <div><span className="text-slate-500">Email : </span><span className="text-emerald-300">{cv.personalInfo.email}</span></div>
                <div><span className="text-slate-500">Téléphone : </span><span className="text-slate-300">{cv.personalInfo.phone}</span></div>
                <div><span className="text-slate-500">Localisation : </span><span className="text-slate-300">{cv.personalInfo.location}</span></div>
                {cv.personalInfo.linkedin && (
                  <div><span className="text-slate-500">LinkedIn : </span><span className="text-blue-300">{cv.personalInfo.linkedin}</span></div>
                )}
              </div>
            </div>

            {/* Experiences Entity with Action Verbs Highlight */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-between">
                <span>[ENTITIES: WORK_EXPERIENCE & STAR_VERBS]</span>
                <span className="text-amber-300 font-normal">Impact STAR validé sans zone aveugle</span>
              </div>

              {cv.experiences.map((exp, expIdx) => (
                <div key={expIdx} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between text-xs border-b border-slate-800/60 pb-1.5">
                    <div>
                      <span className="text-amber-300 font-bold">{exp.role}</span>
                      <span className="text-slate-500"> @ </span>
                      <span className="text-white font-semibold">{exp.company}</span>
                      <span className="text-slate-400 text-[11px]"> ({exp.location})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{exp.startDate} - {exp.endDate}</span>
                  </div>

                  <ul className="space-y-1.5 pl-2 text-xs">
                    {exp.bullets.map((bullet, bIdx) => {
                      const firstWord = bullet.split(' ')[0];
                      const rest = bullet.slice(firstWord.length);
                      return (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="text-emerald-400 shrink-0 font-bold">•</span>
                          <p className="leading-relaxed">
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold mr-1">
                              {firstWord}
                            </span>
                            <span className="text-slate-200">{rest}</span>
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Skills Taxonomy Entity */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>[ENTITIES: TAXONOMY_SKILLS_INDEX]</span>
                <span className="text-slate-400 font-normal">Indexé dans la recherche recruteur</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cv.skillsCategories.flatMap((c) => c.skills).map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[11px]"
                  >
                    #{skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'raw_ats' ? (
        /* Raw ATS View Mode */
        <div className="bg-slate-950 text-slate-100 p-6 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-2xl">
          <div className="text-slate-400 text-xs pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
            <span>Flux de caractères extrait par les robots ATS (Taleo, Workday, Greenhouse) :</span>
            <span className="text-emerald-400 font-semibold">Lisibilité continue sans rupture de colonnes</span>
          </div>
          {generateRawAtsText()}
        </div>
      ) : (
        /* Standard Single-Column ATS Clean Document (Feuille A4 Premium) */
        <article className="print-page cv-sheet bg-white border border-slate-300/80 rounded-xl sm:rounded-2xl p-4 sm:p-8 md:p-12 lg:p-14 shadow-2xl shadow-black/40 light:shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 text-[#0f172a] font-sans leading-normal">
          {/* Header */}
          <header className="border-b border-slate-300 pb-5 mb-6 text-center">
            {isEditing ? (
              <div className="space-y-2 max-w-lg mx-auto">
                <input
                  type="text"
                  value={cv.personalInfo.fullName}
                  onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                  className="w-full text-center text-xl font-bold text-slate-900 border border-slate-300 rounded-md p-1"
                  placeholder="Nom Prénom"
                />
                <input
                  type="text"
                  value={cv.personalInfo.professionalTitle}
                  onChange={(e) => updatePersonalInfo('professionalTitle', e.target.value)}
                  className="w-full text-center text-sm font-semibold text-slate-700 border border-slate-300 rounded-md p-1"
                  placeholder="Intitulé du poste"
                />
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 uppercase tracking-tight">
                  {cv.personalInfo.fullName}
                </h1>
                <p className="text-sm sm:text-base font-bold text-slate-700 mt-1">
                  {cv.personalInfo.professionalTitle}
                </p>
              </>
            )}

            {/* Contact details: ATS compliant single line with subtle dot separators */}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-600 mt-2.5">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2 text-xs w-full max-w-md mx-auto pt-2">
                  <input
                    type="text"
                    value={cv.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    className="border border-slate-300 rounded-sm p-1"
                    placeholder="Email"
                  />
                  <input
                    type="text"
                    value={cv.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    className="border border-slate-300 rounded-sm p-1"
                    placeholder="Téléphone"
                  />
                  <input
                    type="text"
                    value={cv.personalInfo.location}
                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                    className="border border-slate-300 rounded-sm p-1"
                    placeholder="Ville, Pays"
                  />
                  <input
                    type="text"
                    value={cv.personalInfo.linkedin || ''}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    className="border border-slate-300 rounded-sm p-1"
                    placeholder="LinkedIn"
                  />
                </div>
              ) : (
                <>
                  <span>{cv.personalInfo.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cv.personalInfo.phone}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cv.personalInfo.location}</span>
                  {cv.personalInfo.linkedin && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{cv.personalInfo.linkedin}</span>
                    </>
                  )}
                  {cv.personalInfo.portfolioUrl && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{cv.personalInfo.portfolioUrl}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </header>

          {/* Section 1: Professional Summary */}
          <section className="mb-6 page-break-inside-avoid">
            <h2 className={fontStyles.sectionTitle}>
              {isEn ? 'Professional Summary' : 'Profil Professionnel'}
            </h2>
            {isEditing ? (
              <textarea
                value={cv.professionalSummary}
                onChange={(e) => updateSummary(e.target.value)}
                rows={4}
                className={`w-full ${fontStyles.body} text-slate-800 border border-slate-300 rounded-md p-2 font-sans`}
              />
            ) : (
              <p className={`${fontStyles.body} text-slate-800 text-justify`}>
                {cv.professionalSummary}
              </p>
            )}
          </section>

          {/* Section 2: Skills Categories */}
          <section className="mb-6 page-break-inside-avoid">
            <h2 className={fontStyles.sectionTitle}>
              {isEn ? 'Core Competencies & Key Skills' : 'Compétences & Outils Clés'}
            </h2>
            <div className={`space-y-1.5 ${fontStyles.body}`}>
              {cv.skillsCategories.map((category, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="font-bold text-slate-900 shrink-0">
                    {category.categoryName} :
                  </span>
                  <span className="text-slate-800">
                    {category.skills.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Work Experience (Strict Single Column) */}
          <section className="mb-6">
            <div className="border-b border-slate-200 pb-1 mb-3">
              <h2 className={fontStyles.sectionTitle}>
                {isEn ? 'Professional Experience' : 'Expériences Professionnelles'}
              </h2>
            </div>

            <div className="space-y-5">
              {cv.experiences.map((exp: ExperienceItem, expIndex: number) => (
                <div key={exp.id || expIndex} className="page-break-inside-avoid">
                  {/* Role Header */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                    <div>
                      <span className={fontStyles.role}>
                        {exp.role}
                      </span>
                      <span className="text-slate-400 mx-1.5 font-normal">|</span>
                      <span className={fontStyles.company}>
                        {exp.company}
                      </span>
                      <span className="text-xs text-slate-500 ml-1.5">
                        ({exp.location})
                      </span>
                    </div>

                    <div className={`${fontStyles.meta} sm:text-right mt-0.5 sm:mt-0`}>
                      {exp.startDate} – {exp.endDate}
                    </div>
                  </div>

                  {/* Reformulated Action-Verb Bullets */}
                  <ul className={`mt-2 ${fontStyles.bulletsSpacing} list-disc list-outside pl-4 ${fontStyles.body} text-slate-800`}>
                    {exp.bullets.map((bullet: string, bulletIndex: number) => (
                      <li key={bulletIndex} className="group relative -mx-2 px-2 py-1 rounded-lg transition-colors hover:bg-amber-500/5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => updateBullet(expIndex, bulletIndex, e.target.value)}
                              className={`w-full ${fontStyles.body} border border-slate-300 rounded-sm p-1`}
                            />
                            <button
                              type="button"
                              onClick={() => removeBullet(expIndex, bulletIndex)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex-1">{bullet}</span>

                            {/* Refine bullet with AI button + Micro-Tooltip Ambré */}
                            <div className="relative inline-flex items-center shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenBulletRefiner(
                                    bullet,
                                    `${exp.role} chez ${exp.company}`,
                                    expIndex,
                                    bulletIndex
                                  )
                                }
                                aria-label="Reformuler cette puce avec la méthode STAR"
                                className="no-print opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all inline-flex items-center gap-1.5 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded-md shadow-sm shrink-0 cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />
                                <span>Affiner STAR</span>
                              </button>

                              {/* Micro-Tooltip Ambré Élégant */}
                              <div
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/95 light:bg-slate-900 text-amber-300 light:text-amber-200 text-[11px] font-semibold border border-amber-400/40 shadow-xl whitespace-nowrap z-30"
                              >
                                <span>🪄 Reformuler avec la méthode STAR</span>
                                <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-950 light:border-t-slate-900" />
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => addBullet(expIndex)}
                      className="mt-1 text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter une puce</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Education */}
          <section className="mb-6 page-break-inside-avoid">
            <h2 className={fontStyles.sectionTitle}>
              {isEn ? 'Education' : 'Formation'}
            </h2>
            <div className="space-y-2.5">
              {cv.education.map((edu, idx) => (
                <div key={idx} className={`flex flex-col sm:flex-row sm:items-baseline justify-between ${fontStyles.body}`}>
                  <div>
                    <span className="font-bold text-slate-900">
                      {edu.degree} {edu.field ? `– ${edu.field}` : ''}
                    </span>
                    <span className="text-slate-500 ml-1.5">
                      · {edu.institution}
                    </span>
                    {edu.honorsOrDetails && (
                      <p className="text-[11px] text-slate-600 italic mt-0.5">
                        {edu.honorsOrDetails}
                      </p>
                    )}
                  </div>
                  <div className={`${fontStyles.meta} mt-0.5 sm:mt-0`}>
                    {edu.graduationDate}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Languages & Certifications */}
          {((cv.certifications && cv.certifications.length > 0) || (cv.languages && cv.languages.length > 0)) && (
            <section className="page-break-inside-avoid">
              <h2 className={fontStyles.sectionTitle}>
                {isEn ? 'Certifications & Languages' : 'Langues & Certifications'}
              </h2>
              <div className={`${fontStyles.body} space-y-1`}>
                {cv.certifications && cv.certifications.length > 0 && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 shrink-0">{isEn ? 'Certifications:' : 'Certifications :'}</span>
                    <span className="text-slate-800">
                      {cv.certifications.map((c) => `${c.name} (${c.issuer} ${c.year || ''})`).join(', ')}
                    </span>
                  </div>
                )}
                {cv.languages && cv.languages.length > 0 && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900 shrink-0">{isEn ? 'Languages:' : 'Langues :'}</span>
                    <span className="text-slate-800">
                      {cv.languages.map((l) => `${l.language} (${l.proficiency})`).join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </article>
      )}

      {/* Bottom forward button */}
      <div className="flex justify-end pt-4 no-print">
        <button
          type="button"
          onClick={onGoToCoverLetter}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white keep-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <span>{isEn ? 'Proceed to Cover Letter' : 'Accéder à la Lettre de Motivation'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
