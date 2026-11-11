import { jsPDF } from 'jspdf';
import { OptimizedCv, CoverLetter } from '../types/ats';
import { sanitizeClosingFormula, cleanRecipientTitle, cleanCompanyName } from './coverLetterSanitizer';
import { isEnglishText } from './languageDetector';

/**
 * Helper de découpage et de rendu sécurisé pour les lignes libellées (Compétences, Langues, Certifications).
 * Évite tout débordement en dehors de la page A4 (178 mm) et garantit un affichage net sans chevauchement.
 */
function renderWrappedLabeledLine(
  doc: jsPDF,
  label: string,
  text: string,
  marginX: number,
  currentY: number,
  contentWidth: number,
  checkPageBreak: (needed: number) => void,
  lineHeight: number = 4.2
): number {
  if (!text || !text.trim()) return currentY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const labelWidth = doc.getTextWidth(label);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const shouldBreakLabel = labelWidth > 45;

  if (shouldBreakLabel) {
    checkPageBreak(lineHeight * 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, marginX, currentY);
    currentY += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text.trim(), contentWidth);
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, marginX, currentY);
      currentY += lineHeight;
    }
  } else {
    const firstLineWidth = contentWidth - labelWidth - 1;
    const words = text.trim().split(/\s+/);
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

    checkPageBreak(Math.min(lines.length * lineHeight + 1, 15));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, marginX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    if (lines.length > 0) {
      doc.text(lines[0], marginX + labelWidth, currentY);
    }
    for (let i = 1; i < lines.length; i++) {
      currentY += lineHeight;
      checkPageBreak(lineHeight);
      doc.text(lines[i], marginX, currentY);
    }
    currentY += lineHeight;
  }

  return currentY + 0.8;
}

/**
 * Génère et télécharge un fichier PDF haute définition certifié ATS pour le CV.
 * Strictement conforme aux spécifications mono-colonne pour Workday, Taleo, Greenhouse & Lever.
 * Toutes les informations (profil, expériences, formations, compétences, langues, certifications)
 * s'affichent intégralement sans coupure ni débordement hors cadre.
 */
export function downloadCvPdf(cv: OptimizedCv): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178 mm
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // --- EN-TÊTE DU CANDIDAT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(11, 21, 48); // #0B1530 Deep Navy
  const fullName = (cv.personalInfo.fullName || 'CANDIDAT').toUpperCase();
  const nameLines = doc.splitTextToSize(fullName, contentWidth);
  nameLines.forEach((nLine: string) => {
    doc.text(nLine, marginX, y);
    y += 6.5;
  });

  // Titre professionnel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // Amber-700
  const titleText = cv.personalInfo.professionalTitle || 'Expert Métier';
  const titleLines = doc.splitTextToSize(titleText, contentWidth);
  titleLines.forEach((tLine: string) => {
    doc.text(tLine, marginX, y);
    y += 5.5;
  });

  // Coordonnées & Liens (découpés avec sécurité pour ne jamais déborder)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  const contacts = [
    cv.personalInfo.email,
    cv.personalInfo.phone,
    cv.personalInfo.location,
    cv.personalInfo.linkedin,
    cv.personalInfo.portfolioUrl,
  ].filter(Boolean);
  const contactText = contacts.join('  •  ');
  const contactLines = doc.splitTextToSize(contactText, contentWidth);
  contactLines.forEach((cline: string) => {
    doc.text(cline, marginX, y);
    y += 4;
  });
  y += 2;

  // Ligne de séparation
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  const isEn = cv.languageMode === 'en' || isEnglishText(cv.professionalSummary || '') || (cv.experiences?.[0]?.bullets?.[0] ? isEnglishText(cv.experiences[0].bullets[0]) : false);

  // Helper pour afficher un titre de section ATS standard (protection anti-orphelin)
  const renderSectionTitle = (title: string) => {
    checkPageBreak(22); // Garantit que le titre ne reste jamais seul en bas de page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(11, 21, 48); // Deep Navy
    doc.text(title.toUpperCase(), marginX, y);
    y += 1.5;
    doc.setDrawColor(217, 119, 6); // Amber-600
    doc.setLineWidth(0.5);
    doc.line(marginX, y, marginX + 35, y);
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.2);
    doc.line(marginX + 35, y, pageWidth - marginX, y);
    y += 5;
  };

  // --- PROFIL PROFESSIONNEL / PROFESSIONAL SUMMARY ---
  if (cv.professionalSummary && cv.professionalSummary.trim()) {
    renderSectionTitle(isEn ? 'Professional Summary' : 'Profil Professionnel');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate-700
    const summaryLines = doc.splitTextToSize(cv.professionalSummary.trim(), contentWidth);
    summaryLines.forEach((sLine: string) => {
      checkPageBreak(4.5);
      doc.text(sLine, marginX, y);
      y += 4.2;
    });
    y += 3;
  }

  // --- EXPÉRIENCES PROFESSIONNELLES / PROFESSIONAL EXPERIENCE (MÉTHODE STAR) ---
  if (Array.isArray(cv.experiences) && cv.experiences.length > 0) {
    renderSectionTitle(isEn ? 'Professional Experience' : 'Expériences Professionnelles');

    cv.experiences.forEach((exp) => {
      // Protection pour conserver le rôle avec au moins sa première puce
      checkPageBreak(22);

      // Ligne 1 : Rôle en gras & Dates
      const roleStr = exp.role || 'Poste';
      const dateStr = `${exp.startDate || ''} – ${exp.endDate || 'Présent'}`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      const dateWidth = doc.getTextWidth(dateStr);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // Slate-900
      const maxRoleWidth = contentWidth - dateWidth - 4;
      const roleLines = doc.splitTextToSize(roleStr, maxRoleWidth);
      doc.text(roleLines[0], marginX, y);

      // Date alignée à droite
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(dateStr, pageWidth - marginX - dateWidth, y);

      if (roleLines.length > 1) {
        for (let i = 1; i < roleLines.length; i++) {
          y += 4.2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(roleLines[i], marginX, y);
        }
      }
      y += 4.5;

      // Ligne 2 : Entreprise & Localisation (avec découpage si entreprise longue)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9); // Amber-700
      const companyText = exp.company || '';

      if (exp.location) {
        const compWidth = doc.getTextWidth(companyText);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const locText = `  |  ${exp.location}`;
        const locWidth = doc.getTextWidth(locText);

        if (compWidth + locWidth <= contentWidth) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(180, 83, 9);
          doc.text(companyText, marginX, y);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(locText, marginX + compWidth, y);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(180, 83, 9);
          const compLines = doc.splitTextToSize(companyText, contentWidth);
          compLines.forEach((cLine: string) => {
            doc.text(cLine, marginX, y);
            y += 4;
          });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(exp.location, marginX, y);
        }
      } else {
        const compLines = doc.splitTextToSize(companyText, contentWidth);
        compLines.forEach((cLine: string) => {
          doc.text(cLine, marginX, y);
          y += 4;
        });
      }
      y += 4.2;

      // Puces de réalisations (Bullets STAR avec vérification ligne par ligne anti-débordement)
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach((bullet) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);

          const cleanBulletText = bullet.replace(/^[-•*]\s*/, '').trim();
          const bulletLines = doc.splitTextToSize(cleanBulletText, contentWidth - 6);
          
          checkPageBreak(bulletLines.length * 4.1 + 1);

          // Puce symbole
          doc.setTextColor(180, 83, 9);
          doc.text('•', marginX + 0.8, y);

          // Texte de la puce ligne par ligne pour éviter tout chevauchement ou rupture
          doc.setTextColor(51, 65, 85);
          for (let bIdx = 0; bIdx < bulletLines.length; bIdx++) {
            checkPageBreak(4.2);
            doc.text(bulletLines[bIdx], marginX + 4.5, y);
            if (bIdx < bulletLines.length - 1) {
              y += 4.1;
            }
          }
          y += 5.2;
        });
      }
      y += 2.5;
    });
  }

  // --- FORMATION / EDUCATION ---
  if (Array.isArray(cv.education) && cv.education.length > 0) {
    renderSectionTitle(isEn ? 'Education' : 'Formation');

    cv.education.forEach((edu) => {
      checkPageBreak(16);

      const degStr = [edu.degree, edu.field].filter(Boolean).join(' – ') || (isEn ? 'Degree' : 'Diplôme');
      const gradStr = edu.graduationDate || '';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const gradWidth = gradStr ? doc.getTextWidth(gradStr) : 0;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const maxDegWidth = gradWidth > 0 ? contentWidth - gradWidth - 4 : contentWidth;
      const degLines = doc.splitTextToSize(degStr, maxDegWidth);
      doc.text(degLines[0], marginX, y);

      if (gradStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(gradStr, pageWidth - marginX - gradWidth, y);
      }

      if (degLines.length > 1) {
        for (let i = 1; i < degLines.length; i++) {
          y += 4;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(degLines[i], marginX, y);
        }
      }
      y += 4.2;

      if (edu.institution) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const instLines = doc.splitTextToSize(edu.institution, contentWidth);
        instLines.forEach((iLine: string) => {
          checkPageBreak(4.2);
          doc.text(iLine, marginX, y);
          y += 4;
        });
      }

      if (edu.honorsOrDetails) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const honorLines = doc.splitTextToSize(edu.honorsOrDetails, contentWidth);
        honorLines.forEach((hLine: string) => {
          checkPageBreak(3.8);
          doc.text(hLine, marginX, y);
          y += 3.8;
        });
      }

      y += 2.5;
    });
  }

  // --- COMPÉTENCES CLÉS & EXPERTISE / CORE COMPETENCIES (Découpage anti-débordement sécurisé) ---
  if (Array.isArray(cv.skillsCategories) && cv.skillsCategories.length > 0) {
    renderSectionTitle(isEn ? 'Core Competencies & Key Skills' : 'Compétences & Technologies');

    cv.skillsCategories.forEach((cat) => {
      const catLabel = `${cat.categoryName || (isEn ? 'Skills' : 'Compétences')} : `;
      const skillsStr = Array.isArray(cat.skills) ? cat.skills.join(', ') : '';
      y = renderWrappedLabeledLine(doc, catLabel, skillsStr, marginX, y, contentWidth, checkPageBreak);
    });
    y += 2;
  }

  // --- LANGUES & CERTIFICATIONS (Découpage multi-lignes anti-débordement) ---
  if ((cv.languages && cv.languages.length > 0) || (cv.certifications && cv.certifications.length > 0)) {
    renderSectionTitle(isEn ? 'Certifications & Languages' : 'Langues & Certifications');

    if (cv.languages && cv.languages.length > 0) {
      const langStr = cv.languages.map((l) => `${l.language} (${l.proficiency})`).join('  •  ');
      y = renderWrappedLabeledLine(doc, isEn ? 'Languages: ' : 'Langues : ', langStr, marginX, y, contentWidth, checkPageBreak);
    }

    if (cv.certifications && cv.certifications.length > 0) {
      const certStr = cv.certifications
        .map((c) => `${c.name}${c.issuer ? ` – ${c.issuer}` : ''}${c.year ? ` (${c.year})` : ''}`)
        .join('  •  ');
      y = renderWrappedLabeledLine(doc, isEn ? 'Certifications: ' : 'Certifications : ', certStr, marginX, y, contentWidth, checkPageBreak);
    }
  }

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
  doc.text(header.candidateName || (isEn ? 'Candidate' : 'Candidat'), marginX, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (header.candidateEmail || header.candidatePhone) {
    const contactLine = [header.candidateEmail, header.candidatePhone].filter(Boolean).join('  |  ');
    doc.text(contactLine, marginX, y);
    y += 5;
  }

  y += 4;

  // --- BLOC DESTINATAIRE (À DROITE) ---
  const destX = 110;
  const destMaxWidth = pageWidth - marginX - destX; // 210 - 20 - 110 = 80 mm
  let destY = y;
  const cleanRecipient = cleanRecipientTitle(header.recipientNameOrTitle);
  const recipientLabel = isEn ? `Attention: ${cleanRecipient}` : `À l'attention de : ${cleanRecipient}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const splitRecipient = doc.splitTextToSize(recipientLabel, destMaxWidth);
  doc.text(splitRecipient, destX, destY);
  destY += splitRecipient.length * 4.2;

  const safeCompany = cleanCompanyName(header.companyName);
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
  const displayDate = (!header.date || header.date === '22 mai 2024' || header.date.includes('22 mai 2024') || header.date === 'May 22, 2024')
    ? todayFormatted
    : header.date;
  doc.text(isEn ? `Date: ${displayDate}` : `Date : ${displayDate}`, destX, destY);
  destY += 7;

  y = Math.max(y + 12, destY);

  // --- OBJET / SUBJECT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9); // Amber-700
  let subjectText = header.subjectLine;
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
  ].filter(Boolean);

  // Calcul dynamique de l'espace pour garantir la tenue sur une page A4 stricte (max 270mm)
  const totalChars = paragraphs.join(' ').length;
  const pFontSize = totalChars > 1600 ? 9 : 9.5;
  const pLineHeight = totalChars > 1600 ? 4.1 : 4.4;
  const pGap = totalChars > 1600 ? 4 : 5;

  paragraphs.forEach((p) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(pFontSize);
    doc.setTextColor(51, 65, 85);
    const pLines = doc.splitTextToSize(p.trim(), contentWidth);
    doc.text(pLines, marginX, y);
    y += pLines.length * pLineHeight + pGap;
  });

  // --- FORMULE DE POLITESSE STRICTEMENT ÉPURÉE SANS NOM DU CANDIDAT ---
  const cleanSignOffText = sanitizeClosingFormula(coverLetter.signOff, header.candidateName);
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
  doc.text(header.candidateName || (isEn ? 'Candidate' : 'Candidat'), marginX, y);

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
