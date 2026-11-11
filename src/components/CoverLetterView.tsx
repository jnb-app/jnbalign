import React, { useState } from 'react';
import { CoverLetter } from '../types/ats';
import { Printer, Copy, Check, Edit3, ArrowLeft, Eye, Sparkles, Download, FileText } from 'lucide-react';
import { sanitizeClosingFormula, sanitizeCoverLetter, cleanRecipientTitle } from '../utils/coverLetterSanitizer';
import { downloadCoverLetterPdf } from '../utils/pdfGenerator';
import { downloadCoverLetterDocx } from '../utils/docxGenerator';
import { isEnglishText } from '../utils/languageDetector';

interface CoverLetterViewProps {
  coverLetter: CoverLetter;
  onChangeCoverLetter: (updated: CoverLetter) => void;
  onPrint: () => void;
  onBackToResume: () => void;
  fontSize?: 'standard' | 'comfort' | 'large';
  onChangeFontSize?: (size: 'standard' | 'comfort' | 'large') => void;
}

export const CoverLetterView: React.FC<CoverLetterViewProps> = ({
  coverLetter: rawCoverLetter,
  onChangeCoverLetter,
  onPrint,
  onBackToResume,
  fontSize = 'comfort',
  onChangeFontSize,
}) => {
  // Garantir l'absence de doublons ou de nom accolé
  const coverLetter = sanitizeCoverLetter(rawCoverLetter);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);

  // Échelle de typographie adaptative pour la lettre de motivation (Confort 11.5pt par défaut)
  const letterFontStyles = {
    standard: {
      body: 'text-xs sm:text-sm print:text-[10pt] leading-relaxed',
      salutation: 'font-semibold text-slate-900 mb-2 print:mb-1.5 text-xs sm:text-sm',
      subject: 'font-bold text-xs sm:text-sm text-slate-950 uppercase tracking-wide',
      sender: 'text-lg font-bold text-slate-950 uppercase tracking-tight',
      meta: 'text-xs text-slate-600',
    },
    comfort: {
      body: 'text-sm sm:text-[15.5px] print:text-[11.5pt] leading-relaxed',
      salutation: 'font-semibold text-slate-900 mb-2.5 print:mb-1.5 text-sm sm:text-[15.5px]',
      subject: 'font-bold text-sm sm:text-base text-slate-950 uppercase tracking-wide',
      sender: 'text-xl font-bold text-slate-950 uppercase tracking-tight',
      meta: 'text-xs sm:text-sm text-slate-600',
    },
    large: {
      body: 'text-base sm:text-lg print:text-[13pt] leading-loose',
      salutation: 'font-semibold text-slate-900 mb-3 print:mb-2 text-base sm:text-lg',
      subject: 'font-bold text-base sm:text-lg text-slate-950 uppercase tracking-wide',
      sender: 'text-2xl font-bold text-slate-950 uppercase tracking-tight',
      meta: 'text-sm text-slate-600',
    },
  }[fontSize || 'comfort'];

  const isEn =
    coverLetter.languageMode === 'en' ||
    isEnglishText(coverLetter.paragraphs?.vous || '') ||
    isEnglishText(coverLetter.header?.subjectLine || '') ||
    (coverLetter.signOff ? isEnglishText(coverLetter.signOff) : false);

  const updateParagraph = (key: 'vous' | 'moi' | 'nous', value: string) => {
    onChangeCoverLetter({
      ...coverLetter,
      paragraphs: {
        ...coverLetter.paragraphs,
        [key]: value,
      },
    });
  };

  const updateHeader = (field: keyof typeof coverLetter.header, value: string) => {
    onChangeCoverLetter({
      ...coverLetter,
      header: {
        ...coverLetter.header,
        [field]: value,
      },
    });
  };

  const cleanSignOff = (text?: string, candidateName?: string): string => {
    return sanitizeClosingFormula(text, candidateName || coverLetter.header?.candidateName);
  };

  const updateSignOff = (val: string) => {
    onChangeCoverLetter({
      ...coverLetter,
      signOff: val,
    });
  };

  const todayFormatted = isEn
    ? new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const effectiveDate = (!coverLetter.header?.date || coverLetter.header.date === '22 mai 2024' || coverLetter.header.date.includes('22 mai 2024') || coverLetter.header.date === 'May 22, 2024')
    ? todayFormatted
    : coverLetter.header.date;

  const getFullFormattedText = () => {
    const { header, paragraphs, signOff } = coverLetter;
    const sanitizedSignOff = cleanSignOff(signOff, header.candidateName);
    const cleanRecipient = cleanRecipientTitle(header.recipientNameOrTitle);
    let out = `${header.candidateName}\n${header.candidateEmail} | ${header.candidatePhone}\n\n`;
    out += isEn
      ? `Attention: ${cleanRecipient}\n${header.companyName}\nDate: ${effectiveDate}\n\n`
      : `À l'attention de : ${cleanRecipient}\n${header.companyName}\nDate : ${effectiveDate}\n\n`;
    
    let subjectText = header.subjectLine;
    if (isEn && !subjectText.toLowerCase().startsWith('subject') && !subjectText.toLowerCase().startsWith('re:')) {
      subjectText = `Subject: ${subjectText}`;
    } else if (!isEn && !subjectText.toLowerCase().startsWith('objet')) {
      subjectText = `Objet : ${subjectText}`;
    }
    out += `${subjectText}\n\n`;
    out += isEn ? `Dear Hiring Team,\n\n` : `Madame, Monsieur,\n\n`;
    out += `${paragraphs.vous}\n\n`;
    out += `${paragraphs.moi}\n\n`;
    out += `${paragraphs.nous}\n\n`;
    out += `${sanitizedSignOff}\n\n${header.candidateName}`;
    return out;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullFormattedText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Control Bar (Unified Dark Luxury Navy & Gold / Clean Executive Light) */}
      <div className="bg-[#0B1530] light:bg-white border border-amber-400/20 light:border-slate-200 rounded-xl p-3.5 shadow-xl light:shadow-slate-200/50 flex flex-wrap items-center justify-between gap-3 no-print text-white light:text-slate-900 transition-colors">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToResume}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">{isEn ? 'Back to ATS Resume' : 'Revenir au CV ATS'}</span>
            <span className="xs:hidden">{isEn ? 'Back' : 'CV ATS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isEditing
                ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300'
            }`}
          >
            {isEditing ? <Eye className="w-3.5 h-3.5 shrink-0" /> : <Edit3 className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden sm:inline">{isEditing ? (isEn ? 'Preview mode' : 'Mode lecture') : (isEn ? 'Edit text' : 'Modifier le texte')}</span>
            <span className="sm:hidden">{isEditing ? 'Lecture' : 'Modifier'}</span>
          </button>

          {/* Quick Word & PDF Export Buttons */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 light:border-slate-300 pl-2">
            <button
              type="button"
              onClick={() => downloadCoverLetterDocx(coverLetter)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-sky-300 light:text-sky-700 hover:text-white light:hover:text-sky-900 bg-sky-950/50 light:bg-sky-50 hover:bg-sky-900/60 light:hover:bg-sky-100 border border-sky-500/40 light:border-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exporter au format Word .docx éditable"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400 light:text-sky-600 shrink-0" />
              <span className="hidden sm:inline">Word (.docx)</span>
              <span className="sm:hidden">Word</span>
            </button>

            <button
              type="button"
              onClick={() => {
                downloadCoverLetterPdf(coverLetter);
                setDownloadedPdf(true);
                setTimeout(() => setDownloadedPdf(false), 2500);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 light:text-amber-800 hover:text-white light:hover:text-amber-900 bg-amber-950/40 light:bg-amber-50 hover:bg-amber-900/50 light:hover:bg-amber-100 border border-amber-400/40 light:border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Télécharger la lettre en PDF haute définition"
            >
              {downloadedPdf ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Généré !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-400 light:text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 bg-slate-900/60 light:bg-slate-100 hover:bg-slate-800 light:hover:bg-slate-200 border border-slate-700/80 light:border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copier le texte brut formaté"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="hidden md:inline">Copier</span>
                </>
              )}
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
        </div>

        {/* Right: Trame Vous / Moi / Nous ou Anglo-Saxon Framework */}
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-amber-300 light:text-amber-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600 shrink-0" />
            <span>{isEn ? 'Strategic Framework:' : "Trame d'Or Stratégique :"}</span>
          </span>
          <span className="text-[11px] font-mono text-amber-200 light:text-amber-800 bg-amber-400/10 light:bg-amber-100 border border-amber-400/30 light:border-amber-300 px-2.5 py-1 rounded-md font-semibold">
            {isEn ? (
              <>
                <span className="hidden md:inline">Company Challenges · Track Record · Future Impact</span>
                <span className="md:hidden">Framework: You · Me · Us</span>
              </>
            ) : (
              'Vous · Moi · Nous'
            )}
          </span>
        </div>
      </div>

      {/* Cover Letter Document Canvas - Feuille A4 Premium */}
      <article className="print-page cover-letter-sheet bg-white border border-slate-300/80 rounded-xl sm:rounded-2xl p-4 sm:p-8 md:p-12 shadow-2xl shadow-black/40 light:shadow-[0_8px_30px_rgba(15,23,42,0.08)] text-[#0f172a] leading-relaxed font-sans max-w-[850px] mx-auto ring-1 ring-slate-900/5 print:border-none print:shadow-none print:ring-0 print:p-0 print:m-0 print:max-w-none print:rounded-none">
        {/* Header Section */}
        <header className="mb-6 print:mb-4 border-b border-slate-200 pb-5 print:pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            {/* Candidate Info */}
            <div>
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={coverLetter.header.candidateName}
                    onChange={(e) => updateHeader('candidateName', e.target.value)}
                    className="font-bold text-base border border-slate-300 rounded px-2 py-1 text-slate-900 w-full"
                    placeholder="Votre nom complet"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coverLetter.header.candidateEmail}
                      onChange={(e) => updateHeader('candidateEmail', e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-800"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={coverLetter.header.candidatePhone}
                      onChange={(e) => updateHeader('candidatePhone', e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-800"
                      placeholder="Téléphone"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-lg font-bold text-slate-950 uppercase tracking-tight">
                    {coverLetter.header.candidateName}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <span>{coverLetter.header.candidateEmail}</span>
                    <span aria-hidden="true">·</span>
                    <span>{coverLetter.header.candidatePhone}</span>
                  </div>
                </>
              )}
            </div>

            {/* Recipient & Date */}
            <div className="text-left sm:text-right text-xs text-slate-700">
              {isEditing ? (
                <div className="space-y-1 sm:text-right">
                  <input
                    type="text"
                    value={coverLetter.header.recipientNameOrTitle}
                    onChange={(e) => updateHeader('recipientNameOrTitle', e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 w-full text-left sm:text-right text-slate-800"
                    placeholder="Destinataire (ex: Équipe Recrutement)"
                  />
                  <input
                    type="text"
                    value={coverLetter.header.companyName}
                    onChange={(e) => updateHeader('companyName', e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 w-full text-left sm:text-right text-slate-800"
                    placeholder="Entreprise"
                  />
                  <input
                    type="text"
                    value={coverLetter.header.date === '22 mai 2024' ? effectiveDate : (coverLetter.header.date || effectiveDate)}
                    onChange={(e) => updateHeader('date', e.target.value)}
                    className="text-xs border border-slate-300 rounded px-2 py-1 text-left sm:text-right text-slate-800"
                    placeholder="Date"
                  />
                </div>
              ) : (
                <>
                  <div className="font-semibold text-slate-900 max-w-xs sm:ml-auto break-words">
                    {isEn ? 'Attention: ' : "À l'attention de : "}{cleanRecipientTitle(coverLetter.header.recipientNameOrTitle)}
                  </div>
                  {coverLetter.header.companyName ? (
                    <div className="text-slate-700 font-medium">{coverLetter.header.companyName}</div>
                  ) : null}
                  <div className="text-slate-500 mt-1 font-mono text-[11px]">
                    {effectiveDate.startsWith('Date') ? effectiveDate : (isEn ? `Date: ${effectiveDate}` : `Date : ${effectiveDate}`)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            {isEditing ? (
              <input
                type="text"
                value={coverLetter.header.subjectLine}
                onChange={(e) => updateHeader('subjectLine', e.target.value)}
                className={`w-full font-bold ${letterFontStyles.subject} text-slate-900 border border-slate-300 rounded px-2 py-1`}
              />
            ) : (
              <div className={letterFontStyles.subject}>
                {coverLetter.header.subjectLine}
              </div>
            )}
          </div>
        </header>

        {/* Body (Vous / Moi / Nous ou Challenges / Track Record / Future Impact) */}
        <div className={`space-y-5 print:space-y-3.5 ${letterFontStyles.body} text-slate-800 text-justify`}>
          <p className={letterFontStyles.salutation}>
            {isEn ? 'Dear Hiring Team,' : 'Madame, Monsieur,'}
          </p>

          {/* Paragraphe 1 : Le "VOUS" / Company Challenges */}
          <section className="relative group">
            <div className="no-print text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1.5">
              <span>
                {isEn
                  ? "1. Company Challenges · Strategic Context & Mission Alignment"
                  : "1. Le « Vous » · Compréhension des enjeux de l'entreprise"}
              </span>
            </div>
            {isEditing ? (
              <textarea
                value={coverLetter.paragraphs.vous}
                onChange={(e) => updateParagraph('vous', e.target.value)}
                rows={4}
                className={`w-full ${letterFontStyles.body} border border-slate-300 rounded-lg p-2.5 font-sans focus:outline-none focus:ring-1 focus:ring-amber-500`}
              />
            ) : (
              <p className="leading-relaxed">{coverLetter.paragraphs.vous}</p>
            )}
          </section>

          {/* Paragraphe 2 : Le "MOI" / Proven Track Record */}
          <section className="relative group">
            <div className="no-print text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1.5">
              <span>
                {isEn
                  ? "2. Proven Track Record · Quantified Executive Achievements"
                  : "2. Le « Moi » · Preuves concrètes issues de votre parcours réel"}
              </span>
            </div>
            {isEditing ? (
              <textarea
                value={coverLetter.paragraphs.moi}
                onChange={(e) => updateParagraph('moi', e.target.value)}
                rows={5}
                className={`w-full ${letterFontStyles.body} border border-slate-300 rounded-lg p-2.5 font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500`}
              />
            ) : (
              <p className="leading-relaxed">{coverLetter.paragraphs.moi}</p>
            )}
          </section>

          {/* Paragraphe 3 : Le "NOUS" / Future Impact */}
          <section className="relative group">
            <div className="no-print text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
              <span>
                {isEn
                  ? "3. Future Impact · Collaborative Value & Interview Invitation"
                  : "3. Le « Nous » · Vision de collaboration & invitation à l'entretien"}
              </span>
            </div>
            {isEditing ? (
              <textarea
                value={coverLetter.paragraphs.nous}
                onChange={(e) => updateParagraph('nous', e.target.value)}
                rows={4}
                className={`w-full ${letterFontStyles.body} border border-slate-300 rounded-lg p-2.5 font-sans focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            ) : (
              <p className="leading-relaxed">{coverLetter.paragraphs.nous}</p>
            )}
          </section>

          {/* Closing & Signature */}
          <div className="pt-4 print:pt-2 space-y-3 print:space-y-2">
            {isEditing ? (
              <input
                type="text"
                value={coverLetter.signOff ? cleanSignOff(coverLetter.signOff, coverLetter.header.candidateName) : ''}
                onChange={(e) => updateSignOff(e.target.value)}
                placeholder={isEn ? 'Sincerely,' : "Je vous prie d'agréer..."}
                className={`w-full ${letterFontStyles.body} border border-slate-300 rounded-md p-1.5 text-slate-800`}
              />
            ) : (
              <p className="leading-relaxed">
                {coverLetter.signOff
                  ? cleanSignOff(coverLetter.signOff, coverLetter.header.candidateName)
                  : (isEn ? 'Sincerely,' : "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.")}
              </p>
            )}

            <div className={`pt-2 print:pt-1 font-bold text-slate-950 ${letterFontStyles.salutation}`}>
              {coverLetter.header.candidateName}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
