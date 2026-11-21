import { jsPDF } from 'jspdf';
import { OptimizedCv, CoverLetter } from '../types/ats';
import { sanitizeClosingFormula, cleanRecipientTitle, cleanCompanyName } from './coverLetterSanitizer';
import { isEnglishText } from './languageDetector';

/**
 * Normalise tout texte vers un encodage sûr pour Helvetica / WinAnsi (jsPDF)
 * afin d'éviter les glyphes corrompus (ex: "→" rendu en "!'", "œ", espaces insécables, puces creuses)
 * et corriger les micro-défauts de ponctuation résiduels.
 */
export function sanitizePdfText(text?: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u2192\u2794\u21D2\u27A2\u27A4\u25BA\u25B8]/g, '-')
    .replace(/[\u25CF\u25CB\u25E6\u25AA\u25AB\u2713\u2714]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u0153/g, 'oe')
    .replace(/\u0152/g, 'Oe')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/,{2,}/g, ',')
    .replace(/([,;])\./g, '.')
    .replace(/(?<!\.)\.\.(?!\.)/g, '.')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Helper de découpage et de rendu sécurisé pour les lignes libellées (Compétences, Langues, Certifications).
 * Garantit une police lisible (>= 9.5pt) et un affichage net sans débordement.
 */
function renderWrappedLabeledLine(
  doc: jsPDF,
  label: string,
  text: string,
  marginX: number,
  currentY: number,
  contentWidth: number,
  checkPageBreak: (needed: number) => void,
  bodyFontSize: number = 9.5,
  lineHeight: number = 4.5,
  afterGap: number = 0.85
): number {
  const safeLabel = sanitizePdfText(label);
  const safeText = sanitizePdfText(text);
  if (!safeText) return currentY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(bodyFontSize);
  const labelWidth = doc.getTextWidth(safeLabel);
  // Espace visuel explicite après « : » car sanitizePdfText().trim() retire l'espace final
  const labelGap = 1.6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodyFontSize);

  const shouldBreakLabel = labelWidth + labelGap > contentWidth * 0.58;

  if (shouldBreakLabel) {
    checkPageBreak(lineHeight * 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(safeLabel, marginX, currentY);
    currentY += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(safeText, contentWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, marginX, currentY);
      currentY += lineHeight;
    }
  } else {
    const firstLineWidth = contentWidth - labelWidth - labelGap - 0.5;
    const words = safeText.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    let isFirst = true;

    for (const w of words) {
      const candidate = currentLine ? `${currentLine} ${w}` : w;
      const maxW = isFirst ? firstLineWidth : contentWidth;
      if (doc.getTextWidth(candidate) <= maxW) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          isFirst = false;
        } else if (isFirst && doc.getTextWidth(w) <= contentWidth) {
          lines.push('');
          isFirst = false;
        }
        if (doc.getTextWidth(w) > (isFirst ? firstLineWidth : contentWidth)) {
          const splitParts = doc.splitTextToSize(w, isFirst ? firstLineWidth : contentWidth);
          for (let p = 0; p < splitParts.length - 1; p++) {
            lines.push(splitParts[p]);
            isFirst = false;
          }
          currentLine = splitParts[splitParts.length - 1];
        } else {
          currentLine = w;
        }
      }
    }
    if (currentLine) lines.push(currentLine);

    checkPageBreak(Math.min(lines.length * lineHeight + 0.8, 14));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text(safeLabel, marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.setTextColor(51, 65, 85);

    if (lines.length > 0 && lines[0]) {
      doc.text(lines[0], marginX + labelWidth + labelGap, currentY);
    }
    for (let i = 1; i < lines.length; i++) {
      currentY += lineHeight;
      checkPageBreak(lineHeight);
      doc.text(lines[i], marginX, currentY);
    }
    currentY += lineHeight;
  }

  return currentY + afterGap;
}

/**
 * Formate une certification sans répéter l'émetteur s'il figure déjà dans l'intitulé
 * (ex: évite "Certification PIX - PIX").
 */
function formatCertificationDisplay(name?: string, issuer?: string, year?: string): string {
  const cleanName = sanitizePdfText(name || '');
  const cleanIssuer = sanitizePdfText(issuer || '');
  const cleanYear = sanitizePdfText(year || '');
  if (!cleanName) return '';

  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const showIssuer =
    Boolean(cleanIssuer) &&
    norm(cleanIssuer).length > 1 &&
    !norm(cleanName).includes(norm(cleanIssuer));

  return `${cleanName}${showIssuer ? ` - ${cleanIssuer}` : ''}${cleanYear ? ` (${cleanYear})` : ''}`;
}

/**
 * Détermine le gabarit de pagination optimal (1 page Junior/Étudiant/Reconversion vs 2 pages Senior/Cadre)
 * en s'appuyant sur layoutProfile fourni par le pipeline IA ou sur une heuristique sûre pour les anciens brouillons.
 */
function resolveTargetPageMode(cv: OptimizedCv): 1 | 2 {
  if (cv.layoutProfile?.targetPages === 1 || cv.layoutProfile?.targetPages === 2) {
    return cv.layoutProfile.targetPages;
  }
  const exps = Array.isArray(cv.experiences) ? cv.experiences : [];
  if (exps.length <= 2) return 1;
  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  exps.forEach((e) => {
    const sm = String(e.startDate || '').match(/\b(19\d{2}|20\d{2})\b/);
    const em = String(e.endDate || '').match(/\b(19\d{2}|20\d{2})\b/);
    if (sm) years.push(Number(sm[1]));
    if (em) years.push(Number(em[1]));
    else if (e.current || /pr[ée]sent|current|aujourd/i.test(String(e.endDate || ''))) years.push(currentYear);
  });
  if (years.length >= 2) {
    const span = Math.max(...years) - Math.min(...years);
    if (span >= 5) return 2;
    return 1;
  }
  return exps.length >= 4 ? 2 : 1;
}

interface CvPdfLayoutPreset {
  bodySize: number;
  metaSize: number;
  roleSize: number;
  sectionSize: number;
  nameSize: number;
  titleSize: number;
  nameStep: number;
  titleStep: number;
  contactStep: number;
  headerRuleGap: number;
  sectionTitleAfter: number;
  lineH: number;
  bulletGap: number;
  expGap: number;
  sectionGap: number;
  labeledGap: number;
  eduGap: number;
  marginX: number;
  topMargin: number;
  bottomMargin: number;
  sectionBreakGuard: number;
  expBreakGuard: number;
  eduBreakGuard: number;
}

// Tous les paliers respectent STRICTEMENT le plancher de lisibilité >= 9 pt (jamais sous 9 pt)
const ONE_PAGE_PRESETS: CvPdfLayoutPreset[] = [
  // Palier 1A : Confort optimal 9,5 pt
  {
    bodySize: 9.5,
    metaSize: 9.0,
    roleSize: 10.0,
    sectionSize: 10.5,
    nameSize: 16.5,
    titleSize: 11.0,
    nameStep: 6.0,
    titleStep: 4.8,
    contactStep: 4.0,
    headerRuleGap: 4.8,
    sectionTitleAfter: 4.3,
    lineH: 4.2,
    bulletGap: 0.8,
    expGap: 2.2,
    sectionGap: 2.4,
    labeledGap: 0.75,
    eduGap: 1.5,
    marginX: 14,
    topMargin: 13,
    bottomMargin: 11.5,
    sectionBreakGuard: 13,
    expBreakGuard: 17,
    eduBreakGuard: 10,
  },
  // Palier 1B : Espacements ajustés, police TOUJOURS 9,5 pt (évite les débordements de 2-4 lignes)
  {
    bodySize: 9.5,
    metaSize: 9.0,
    roleSize: 9.8,
    sectionSize: 10.0,
    nameSize: 15.5,
    titleSize: 10.5,
    nameStep: 5.5,
    titleStep: 4.4,
    contactStep: 3.8,
    headerRuleGap: 4.1,
    sectionTitleAfter: 3.8,
    lineH: 3.9,
    bulletGap: 0.45,
    expGap: 1.5,
    sectionGap: 1.75,
    labeledGap: 0.5,
    eduGap: 1.0,
    marginX: 12.5,
    topMargin: 10.5,
    bottomMargin: 9.5,
    sectionBreakGuard: 11,
    expBreakGuard: 15,
    eduBreakGuard: 9,
  },
  // Palier 1C : Plancher typographique strict 9,0 pt (profil junior riche à 4+ expériences)
  {
    bodySize: 9.0,
    metaSize: 9.0,
    roleSize: 9.5,
    sectionSize: 9.8,
    nameSize: 15.0,
    titleSize: 10.0,
    nameStep: 5.2,
    titleStep: 4.2,
    contactStep: 3.7,
    headerRuleGap: 3.8,
    sectionTitleAfter: 3.5,
    lineH: 3.68,
    bulletGap: 0.35,
    expGap: 1.25,
    sectionGap: 1.45,
    labeledGap: 0.4,
    eduGap: 0.85,
    marginX: 11.5,
    topMargin: 9.5,
    bottomMargin: 8.5,
    sectionBreakGuard: 10,
    expBreakGuard: 14,
    eduBreakGuard: 8.5,
  },
];

const TWO_PAGE_PRESETS: CvPdfLayoutPreset[] = [
  // Palier 2A : Confort exécutif 10 pt
  {
    bodySize: 10.0,
    metaSize: 9.0,
    roleSize: 10.5,
    sectionSize: 11.0,
    nameSize: 18.0,
    titleSize: 11.5,
    nameStep: 6.8,
    titleStep: 5.5,
    contactStep: 4.2,
    headerRuleGap: 6.0,
    sectionTitleAfter: 5.1,
    lineH: 4.7,
    bulletGap: 1.25,
    expGap: 3.4,
    sectionGap: 3.8,
    labeledGap: 0.9,
    eduGap: 2.3,
    marginX: 16,
    topMargin: 15.5,
    bottomMargin: 15,
    sectionBreakGuard: 18,
    expBreakGuard: 21,
    eduBreakGuard: 13,
  },
  // Palier 2B : Anti-débordement en Page 3 pour seniors très denses (police 9,5 pt)
  {
    bodySize: 9.5,
    metaSize: 9.0,
    roleSize: 10.0,
    sectionSize: 10.5,
    nameSize: 16.5,
    titleSize: 11.0,
    nameStep: 6.0,
    titleStep: 4.8,
    contactStep: 4.0,
    headerRuleGap: 4.8,
    sectionTitleAfter: 4.3,
    lineH: 4.2,
    bulletGap: 0.8,
    expGap: 2.2,
    sectionGap: 2.5,
    labeledGap: 0.7,
    eduGap: 1.5,
    marginX: 13.5,
    topMargin: 12,
    bottomMargin: 12,
    sectionBreakGuard: 14,
    expBreakGuard: 18,
    eduBreakGuard: 11,
  },
];

function renderCvDocumentWithPreset(cv: OptimizedCv, preset: CvPdfLayoutPreset, isEn: boolean): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const {
    bodySize,
    metaSize,
    roleSize,
    sectionSize,
    nameSize,
    titleSize,
    nameStep,
    titleStep,
    contactStep,
    headerRuleGap,
    sectionTitleAfter,
    lineH,
    bulletGap,
    expGap,
    sectionGap,
    labeledGap,
    eduGap,
    marginX,
    topMargin,
    bottomMargin,
    sectionBreakGuard,
    expBreakGuard,
    eduBreakGuard,
  } = preset;

  const bottomLimit = pageHeight - bottomMargin;
  const contentWidth = pageWidth - marginX * 2;
  let y = topMargin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > bottomLimit) {
      doc.addPage();
      y = topMargin;
    }
  };

  // --- EN-TÊTE DU CANDIDAT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nameSize);
  doc.setTextColor(11, 21, 48); // #0B1530 Deep Navy
  const fullName = sanitizePdfText(cv.personalInfo.fullName || 'CANDIDAT').toUpperCase();
  const nameLines = doc.splitTextToSize(fullName, contentWidth);
  nameLines.forEach((nLine: string) => {
    doc.text(nLine, marginX, y);
    y += nameStep;
  });

  // Titre professionnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleSize);
  doc.setTextColor(180, 83, 9); // Amber-700
  const titleText = sanitizePdfText(cv.personalInfo.professionalTitle || 'Expert Métier');
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  titleLines.forEach((tLine: string) => {
    doc.text(tLine, marginX, y);
    y += titleStep;
  });

  // Coordonnées & Liens (>= 9pt)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(metaSize);
  doc.setTextColor(71, 85, 105); // Slate-600
  const contacts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.portfolioUrl,
  ]
    .map((c) => sanitizePdfText(c))
    .filter(Boolean);
  const contactText = contacts.join('  •  ');
  const contactLines = doc.splitTextToSize(contactText, contentWidth);
  contactLines.forEach((cline: string) => {
    doc.text(cline, marginX, y);
    y += contactStep;
  });
  y += 1.0;

  // Ligne de séparation
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += headerRuleGap;

  // Helper pour afficher un titre de section ATS standard (protection anti-orphelin)
  const renderSectionTitle = (title: string) => {
    checkPageBreak(sectionBreakGuard);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionSize);
    doc.setTextColor(11, 21, 48); // Deep Navy
    doc.text(sanitizePdfText(title).toUpperCase(), marginX, y);
    y += 1.5;
    doc.setDrawColor(217, 119, 6); // Amber-600
    doc.setLineWidth(0.5);
    doc.line(marginX, y, marginX + 35, y);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.2);
    doc.line(marginX + 35, y, pageWidth - marginX, y);
    y += sectionTitleAfter;
  };

  // --- 1. PROFIL PROFESSIONNEL / PROFESSIONAL SUMMARY (PAGE 1 — DÉCISIF) ---
  if (cv.professionalSummary && cv.professionalSummary.trim()) {
    renderSectionTitle(isEn ? 'Professional Summary' : 'Profil Professionnel');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodySize);
    doc.setTextColor(51, 65, 85); // Slate-700
    const summaryLines = doc.splitTextToSize(sanitizePdfText(cv.professionalSummary), contentWidth);
    summaryLines.forEach((sLine: string) => {
      checkPageBreak(lineH + 0.4);
      doc.text(sLine, marginX, y);
      y += lineH;
    });
    y += sectionGap;
  }

  // --- 2. COMPÉTENCES CLÉS & TECHNOLOGIES (PAGE 1 — DÉCISIF ATS) ---
  if (Array.isArray(cv.skillsCategories) && cv.skillsCategories.length > 0) {
    renderSectionTitle(isEn ? 'Core Competencies & Key Skills' : 'Compétences & Technologies');

    cv.skillsCategories.forEach((cat) => {
      const catLabel = isEn
        ? `${cat.categoryName || 'Skills'}:`
        : `${cat.categoryName || 'Compétences'} :`;
      const skillsStr = Array.isArray(cat.skills) ? cat.skills.join(', ') : '';
      y = renderWrappedLabeledLine(
        doc,
        catLabel,
        skillsStr,
        marginX,
        y,
        contentWidth,
        checkPageBreak,
        bodySize,
        lineH,
        labeledGap
      );
    });
    y += sectionGap;
  }

  // --- 3. EXPÉRIENCES PROFESSIONNELLES (RÉCENTES DÉCISIVES EN PAGE 1, ANCIENNES EN PAGE 2) ---
  if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
    renderSectionTitle(isEn ? 'Professional Experience' : 'Expériences Professionnelles');

    cv.experiences.forEach((exp) => {
      // Garde-fou pour conserver le titre du poste avec sa société et au moins sa première puce
      checkPageBreak(expBreakGuard);

      const roleStr = sanitizePdfText(exp.role || (isEn ? 'Role' : 'Poste'));
      const sDate = sanitizePdfText(exp.startDate || '');
      const eDate = sanitizePdfText(exp.endDate || '');
      const dateStr =
        sDate && eDate && sDate !== eDate
          ? `${sDate} - ${eDate}`
          : sDate && exp.current
          ? `${sDate} - ${isEn ? 'Present' : 'Présent'}`
          : sDate || eDate || '';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaSize);
      doc.setTextColor(100, 116, 139); // Slate-500
      const dateWidth = doc.getTextWidth(dateStr);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(roleSize);
      doc.setTextColor(15, 23, 42); // Slate-900
      const maxRoleWidth = contentWidth - dateWidth - 4;
      const roleLines = doc.splitTextToSize(roleStr, maxRoleWidth);
      doc.text(roleLines[0], marginX, y);

      // Date alignée à droite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaSize);
      doc.setTextColor(100, 116, 139);
      doc.text(dateStr, pageWidth - marginX - dateWidth, y);

      if (roleLines.length > 1) {
        for (let i = 1; i < roleLines.length; i++) {
          y += lineH;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(roleSize);
          doc.setTextColor(15, 23, 42);
          doc.text(roleLines[i], marginX, y);
        }
      }
      y += lineH + 0.1;

      // Ligne 2 : Entreprise & Localisation (>= 9pt)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(metaSize);
      doc.setTextColor(180, 83, 9); // Amber-700
      const companyText = sanitizePdfText(exp.company || '');
      const cleanExpLoc = sanitizePdfText(exp.location || '');

      if (cleanExpLoc) {
        const compWidth = doc.getTextWidth(companyText);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(metaSize);
        doc.setTextColor(100, 116, 139);
        const locText = `  |  ${cleanExpLoc}`;
        const locWidth = doc.getTextWidth(locText);

        if (compWidth + locWidth <= contentWidth) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(metaSize);
          doc.setTextColor(180, 83, 9);
          doc.text(companyText, marginX, y);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(locText, marginX + compWidth, y);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(metaSize);
          doc.setTextColor(180, 83, 9);
          const compLines = doc.splitTextToSize(companyText, contentWidth);
          compLines.forEach((cLine: string) => {
            doc.text(cLine, marginX, y);
            y += lineH;
          });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(cleanExpLoc, marginX, y);
        }
      } else {
        const compLines = doc.splitTextToSize(companyText, contentWidth);
        compLines.forEach((cLine: string) => {
          doc.text(cLine, marginX, y);
          y += lineH;
        });
      }
      y += lineH + 0.1;

      // Puces de réalisations STAR (>= 9pt / 9.5pt / 10pt)
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach((bullet) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(bodySize);
          doc.setTextColor(51, 65, 85);

          const cleanBulletText = sanitizePdfText(
            bullet.replace(/^(?:[-•*→➔⇒➢➤●▪▫✓✔]+|[o○◦](?=\s+[A-ZÀ-Ÿ0-9]))\s*/, '').trim()
          );
          if (!cleanBulletText) return;
          const bulletLines = doc.splitTextToSize(cleanBulletText, contentWidth - 5.5);

          checkPageBreak(bulletLines.length * lineH + 0.5);

          doc.setTextColor(180, 83, 9);
          doc.text('•', marginX + 0.8, y);

          doc.setTextColor(51, 65, 85);
          for (let bIdx = 0; bIdx < bulletLines.length; bIdx++) {
            checkPageBreak(lineH + 0.4);
            doc.text(bulletLines[bIdx], marginX + 4.3, y);
            if (bIdx < bulletLines.length - 1) {
              y += lineH;
            }
          }
          y += lineH + bulletGap;
        });
      }
      y += expGap;
    });
  }

  // --- 4. FORMATION / EDUCATION (ÉTABLISSEMENT + LIEU/MENTION SUR 1 LIGNE COMPACTE) ---
  if (Array.isArray(cv.education) && cv.education.length > 0) {
    renderSectionTitle(isEn ? 'Education' : 'Formation');

    cv.education.forEach((edu) => {
      checkPageBreak(eduBreakGuard);

      const degStr = sanitizePdfText([edu.degree, edu.field].filter(Boolean).join(' - ') || (isEn ? 'Degree' : 'Diplôme'));
      const gradStr = sanitizePdfText(edu.graduationDate || '');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaSize);
      doc.setTextColor(100, 116, 139);
      const gradWidth = gradStr ? doc.getTextWidth(gradStr) : 0;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodySize);
      doc.setTextColor(15, 23, 42);
      const maxDegWidth = gradWidth > 0 ? contentWidth - gradWidth - 4 : contentWidth;
      const degLines = doc.splitTextToSize(degStr, maxDegWidth);
      doc.text(degLines[0], marginX, y);

      if (gradStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(metaSize);
        doc.setTextColor(100, 116, 139);
        doc.text(gradStr, pageWidth - marginX - gradWidth, y);
      }

      if (degLines.length > 1) {
        for (let i = 1; i < degLines.length; i++) {
          y += lineH;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(bodySize);
          doc.setTextColor(15, 23, 42);
          doc.text(degLines[i], marginX, y);
        }
      }
      y += lineH - 0.1;

      const cleanInst = sanitizePdfText(edu.institution || '');
      const cleanHonors = sanitizePdfText(edu.honorsOrDetails || '');
      const combinedSubLine = [cleanInst, cleanHonors].filter(Boolean).join('  |  ');

      if (combinedSubLine) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(metaSize);
        doc.setTextColor(71, 85, 105);
        const subLines = doc.splitTextToSize(combinedSubLine, contentWidth);
        subLines.forEach((sLine: string) => {
          checkPageBreak(lineH);
          doc.text(sLine, marginX, y);
          y += lineH - 0.25;
        });
      }

      y += eduGap;
    });
    y += Math.max(0.5, sectionGap - eduGap);
  }

  // --- 5. LANGUES & CERTIFICATIONS (SECONDAIRE — BAS DE PAGE 1 OU PAGE 2) ---
  if ((cv.languages && cv.languages.length > 0) || (cv.certifications && cv.certifications.length > 0)) {
    renderSectionTitle(isEn ? 'Certifications & Languages' : 'Langues & Certifications');

    if (cv.languages && cv.languages.length > 0) {
      const langStr = cv.languages.map((l) => `${l.language} (${l.proficiency})`).join('  •  ');
      y = renderWrappedLabeledLine(
        doc,
        isEn ? 'Languages:' : 'Langues :',
        langStr,
        marginX,
        y,
        contentWidth,
        checkPageBreak,
        bodySize,
        lineH,
        labeledGap
      );
    }

    if (cv.certifications && cv.certifications.length > 0) {
      const certStr = cv.certifications
        .map((c) => formatCertificationDisplay(c.name, c.issuer, c.year))
        .filter(Boolean)
        .join('  •  ');
      if (certStr) {
        y = renderWrappedLabeledLine(
          doc,
          isEn ? 'Certifications:' : 'Certifications :',
          certStr,
          marginX,
          y,
          contentWidth,
          checkPageBreak,
          bodySize,
          lineH,
          labeledGap
        );
      }
    }
  }

  // Numérotation discrète uniquement sur les CV multi-pages (un CV 1 page reste épuré)
  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      const pageText = `Page ${i} / ${totalPages}`;
      const textWidth = doc.getTextWidth(pageText);
      doc.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 7.5);
    }
  }

  return doc;
}

/**
 * Construit le document jsPDF du CV en appliquant un calibrage adaptatif multi-passes :
 * - Profils juniors/étudiants/reconversion (cible 1 page) : teste 9,5 pt confortable → 9,5 pt ajusté → 9,0 pt strict
 *   afin de tenir sur 1 page exacte sans jamais descendre sous le plancher de 9 pt.
 * - Profils seniors/cadres (cible 2 pages) : confort 10 pt, avec repli 9,5 pt si risque de débordement en Page 3.
 */
export function buildCvPdfDocument(cv: OptimizedCv): { doc: jsPDF; isEn: boolean } {
  const targetPages = resolveTargetPageMode(cv);
  const isEn =
    cv.languageMode === 'en' ||
    isEnglishText(cv.professionalSummary || '') ||
    (cv.experiences?.[0]?.bullets?.[0] ? isEnglishText(cv.experiences[0].bullets[0]) : false);

  const presets = targetPages === 1 ? ONE_PAGE_PRESETS : TWO_PAGE_PRESETS;
  let chosenDoc = renderCvDocumentWithPreset(cv, presets[0], isEn);

  for (let i = 1; i < presets.length; i++) {
    if (chosenDoc.getNumberOfPages() <= targetPages) {
      break;
    }
    chosenDoc = renderCvDocumentWithPreset(cv, presets[i], isEn);
  }

  return { doc: chosenDoc, isEn };
}

/**
 * Génère et télécharge un fichier PDF haute définition certifié ATS pour le CV.
 * Strictement conforme aux spécifications mono-colonne pour Workday, Taleo, Greenhouse & Lever.
 */
export function downloadCvPdf(cv: OptimizedCv): void {
  const { doc, isEn } = buildCvPdfDocument(cv);
  const cleanFileName = isEn
    ? `Resume_${(cv.personalInfo.fullName || 'Candidate').replace(/[^\w\d]/g, '_')}.pdf`
    : `CV_${(cv.personalInfo.fullName || 'Candidat').replace(/[^\w\d]/g, '_')}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Génère et télécharge un fichier PDF haute définition pour la Lettre de motivation.
 * Met en page la structure Vous / Moi / Nous avec formule de politesse épurée et signature.
 */
export function downloadCoverLetterPdf(coverLetter: CoverLetter): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170 mm
  let y = 22;

  const isEn =
    coverLetter.languageMode === 'en' ||
    isEnglishText(coverLetter.paragraphs?.vous || '') ||
    isEnglishText(coverLetter.header?.subjectLine || '') ||
    (coverLetter.signOff ? isEnglishText(coverLetter.signOff) : false);

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

  const header = coverLetter.header || {
    candidateName: isEn ? 'Candidate' : 'Candidat',
    candidateEmail: '',
    candidatePhone: '',
    recipientNameOrTitle: isEn ? 'Hiring Team' : 'Équipe Recrutement',
    companyName: isEn ? 'Company' : 'Entreprise',
    date: todayFormatted,
    subjectLine: isEn ? 'Application' : 'Candidature',
  };

  // --- BLOC ÉMETTEUR (CANDIDAT) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(11, 21, 48); // Deep Navy
  const safeCandName = sanitizePdfText(header.candidateName || (isEn ? 'Candidate' : 'Candidat'));
  doc.text(safeCandName, marginX, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (header.candidateEmail || header.candidatePhone) {
    const contactLine = [sanitizePdfText(header.candidateEmail), sanitizePdfText(header.candidatePhone)].filter(Boolean).join('  |  ');
    doc.text(contactLine, marginX, y);
    y += 5;
  }

  y += 4;

  // --- BLOC DESTINATAIRE (À DROITE) ---
  const destX = 110;
  const destMaxWidth = pageWidth - marginX - destX; // 210 - 20 - 110 = 80 mm
  let destY = y;
  const cleanRecipient = sanitizePdfText(cleanRecipientTitle(header.recipientNameOrTitle));
  const recipientLabel = isEn ? `Attention: ${cleanRecipient}` : `À l'attention de : ${cleanRecipient}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const splitRecipient = doc.splitTextToSize(recipientLabel, destMaxWidth);
  doc.text(splitRecipient, destX, destY);
  destY += splitRecipient.length * 4.2;

  const safeCompany = sanitizePdfText(cleanCompanyName(header.companyName));
  if (safeCompany) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitCompany = doc.splitTextToSize(safeCompany, destMaxWidth);
    doc.text(splitCompany, destX, destY);
    destY += splitCompany.length * 4.2;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const displayDate = sanitizePdfText(
    (!header.date || header.date === '22 mai 2024' || header.date.includes('22 mai 2024') || header.date === 'May 22, 2024')
      ? todayFormatted
      : header.date
  );
  doc.text(isEn ? `Date: ${displayDate}` : `Date : ${displayDate}`, destX, destY);
  destY += 7;

  y = Math.max(y + 12, destY);

  // --- OBJET / SUBJECT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Amber-700
  let subjectText = sanitizePdfText(header.subjectLine);
  if (isEn) {
    if (!subjectText.toLowerCase().startsWith('subject') && !subjectText.toLowerCase().startsWith('re:')) {
      subjectText = `Subject: ${subjectText}`;
    }
  } else {
    if (!subjectText.toLowerCase().startsWith('objet')) {
      subjectText = `Objet : ${subjectText}`;
    }
  }
  const subjectLines = doc.splitTextToSize(subjectText, contentWidth);
  doc.text(subjectLines, marginX, y);
  y += subjectLines.length * 5 + 6;

  // --- FORMULE D'APPEL / SALUTATION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(isEn ? 'Dear Hiring Team,' : 'Madame, Monsieur,', marginX, y);
  y += 7;

  // --- PARAGRAPHES (VOUS / MOI / NOUS ou CHALLENGES / TRACK RECORD / FUTURE IMPACT) ---
  const paragraphs = [
    coverLetter.paragraphs?.vous || '',
    coverLetter.paragraphs?.moi || '',
    coverLetter.paragraphs?.nous || '',
  ]
    .map((p) => sanitizePdfText(p))
    .filter(Boolean);

  // Calcul dynamique de l'espace pour garantir la tenue sur une page A4 stricte (max 270mm)
  const totalChars = paragraphs.join(' ').length;
  const pFontSize = totalChars > 1600 ? 9 : 9.5;
  const pLineHeight = totalChars > 1600 ? 4.1 : 4.4;
  const pGap = totalChars > 1600 ? 4 : 5;

  paragraphs.forEach((p) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(pFontSize);
    doc.setTextColor(51, 65, 85);
    const pLines = doc.splitTextToSize(p, contentWidth);
    doc.text(pLines, marginX, y);
    y += pLines.length * pLineHeight + pGap;
  });

  // --- FORMULE DE POLITESSE STRICTEMENT ÉPURÉE SANS NOM DU CANDIDAT ---
  const cleanSignOffText = sanitizePdfText(sanitizeClosingFormula(coverLetter.signOff, header.candidateName));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(pFontSize);
  doc.setTextColor(51, 65, 85);
  const signOffLines = doc.splitTextToSize(cleanSignOffText, contentWidth);
  doc.text(signOffLines, marginX, y);
  y += signOffLines.length * pLineHeight + 6;

  // --- SIGNATURE (NOM SEUL) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 21, 48); // Deep Navy
  doc.text(safeCandName, marginX, y);

  // Numérotation des pages au bas de chaque page (strictement et uniquement le numéro de la page)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    const pageText = `Page ${i} / ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, (pageWidth - textWidth) / 2, pageHeight - 9);
  }

  // Sauvegarde / Téléchargement immédiat
  const cleanFileName = isEn
    ? `Cover_Letter_${(header.candidateName || 'Candidate').replace(/[^\w\d]/g, '_')}.pdf`
    : `Lettre_Motivation_${(header.candidateName || 'Candidat').replace(/[^\w\d]/g, '_')}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Télécharge les 2 fichiers PDF en un clic (CV ATS + Lettre de motivation).
 */
export function downloadBothPdfs(cv: OptimizedCv, coverLetter: CoverLetter): void {
  downloadCvPdf(cv);
  setTimeout(() => {
    downloadCoverLetterPdf(coverLetter);
  }, 450);
}

/**
 * Exporte le Pack Candidature Complet en un clic.
 */
export function downloadApplicationPackPdf(cv: OptimizedCv, coverLetter: CoverLetter): void {
  downloadBothPdfs(cv, coverLetter);
}
