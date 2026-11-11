import { OptimizedCv, CoverLetter } from '../types/ats';
import { downloadCvPdf, downloadCoverLetterPdf } from './pdfGenerator';
import { sanitizeClosingFormula, cleanRecipientTitle, cleanCompanyName } from './coverLetterSanitizer';

/**
 * Lance l'impression du document actif (CV ou Lettre de motivation).
 * Conçu spécialement pour fonctionner de manière résiliente :
 * - Si le navigateur est dans une iframe ou sandbox qui bloque window.print(),
 *   il bascule automatiquement et de manière transparente sur l'export PDF haute définition
 *   tout en informant le candidat.
 */
export function printDocument(
  activeDocument: 'cv' | 'coverLetter',
  cv: OptimizedCv,
  coverLetter: CoverLetter
): { success: boolean; fallbackTriggered?: boolean } {
  try {
    // 1. Essayer d'imprimer via un iframe dédié contenant uniquement le document sans la barre noire de navigation
    const existingFrame = document.getElementById('ats-print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'ats-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      // Fallback direct sur window.print()
      window.print();
      return { success: true };
    }

    let documentHtml = '';
    const cleanSignOff = sanitizeClosingFormula(coverLetter.signOff, coverLetter.header.candidateName);

    if (activeDocument === 'cv') {
      documentHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.45; padding: 0; width: 100%; box-sizing: border-box;">
          <h1 style="font-size: 22px; font-weight: 800; color: #0b1530; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: -0.01em;">
            ${cv.personalInfo.fullName}
          </h1>
          <div style="font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 5px;">
            ${cv.personalInfo.professionalTitle}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 10px; line-height: 1.35;">
            ${[cv.personalInfo.email, cv.personalInfo.phone, cv.personalInfo.location, cv.personalInfo.linkedin, cv.personalInfo.portfolioUrl].filter(Boolean).join('  •  ')}
          </div>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin-bottom: 14px;" />

          ${cv.professionalSummary ? `
            <div style="margin-bottom: 14px; page-break-inside: avoid;">
              <h2 style="font-size: 12px; font-weight: 700; color: #0b1530; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">
                Profil Professionnel
              </h2>
              <p style="font-size: 11px; color: #334155; margin: 0; text-align: justify; line-height: 1.45;">
                ${cv.professionalSummary}
              </p>
            </div>
          ` : ''}

          <div style="margin-bottom: 14px;">
            <h2 style="font-size: 12px; font-weight: 700; color: #0b1530; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; page-break-inside: avoid; page-break-after: avoid;">
              Expériences Professionnelles
            </h2>
            ${cv.experiences.map((exp) => `
              <div style="margin-bottom: 12px; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <strong style="font-size: 12px; color: #0f172a;">${exp.role}</strong>
                  <span style="font-size: 11px; color: #64748b;">${exp.startDate} – ${exp.endDate}</span>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #b45309; margin-bottom: 5px;">
                  ${exp.company} ${exp.location ? `<span style="color: #64748b; font-weight: normal;">| ${exp.location}</span>` : ''}
                </div>
                <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155; line-height: 1.4;">
                  ${exp.bullets.map((b) => `<li style="margin-bottom: 3.5px;">${b.replace(/^[-•*]\s*/, '')}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>

          <div style="margin-bottom: 14px;">
            <h2 style="font-size: 12px; font-weight: 700; color: #0b1530; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; page-break-inside: avoid; page-break-after: avoid;">
              Formation
            </h2>
            ${cv.education.map((edu) => `
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; page-break-inside: avoid;">
                <div>
                  <strong style="font-size: 11.5px; color: #0f172a;">${edu.degree}${edu.field ? ` – ${edu.field}` : ''}</strong>
                  <div style="font-size: 10.5px; color: #475569;">${edu.institution}</div>
                  ${edu.honorsOrDetails ? `<div style="font-size: 10px; color: #64748b; font-style: italic;">${edu.honorsOrDetails}</div>` : ''}
                </div>
                <span style="font-size: 10.5px; color: #64748b;">${edu.graduationDate}</span>
              </div>
            `).join('')}
          </div>

          <div style="margin-bottom: 14px;">
            <h2 style="font-size: 12px; font-weight: 700; color: #0b1530; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; page-break-inside: avoid; page-break-after: avoid;">
              Compétences Clés & Outils
            </h2>
            ${cv.skillsCategories.map((c) => `
              <div style="font-size: 10.5px; margin-bottom: 4px; line-height: 1.4; page-break-inside: avoid;">
                <strong style="color: #0f172a;">${c.categoryName || 'Compétences'} :</strong> <span style="color: #334155;">${c.skills.join(', ')}</span>
              </div>
            `).join('')}
          </div>

          ${(cv.languages?.length || cv.certifications?.length) ? `
            <div style="margin-bottom: 10px;">
              <h2 style="font-size: 12px; font-weight: 700; color: #0b1530; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; page-break-inside: avoid; page-break-after: avoid;">
                Langues & Certifications
              </h2>
              ${cv.languages?.length ? `
                <div style="font-size: 10.5px; margin-bottom: 4px; line-height: 1.4; page-break-inside: avoid;">
                  <strong style="color: #0f172a;">Langues :</strong> <span style="color: #334155;">${cv.languages.map((l) => `${l.language} (${l.proficiency})`).join('  •  ')}</span>
                </div>
              ` : ''}
              ${cv.certifications?.length ? `
                <div style="font-size: 10.5px; margin-bottom: 4px; line-height: 1.4; page-break-inside: avoid;">
                  <strong style="color: #0f172a;">Certifications :</strong> <span style="color: #334155;">${cv.certifications.map((c) => `${c.name}${c.issuer ? ` – ${c.issuer}` : ''}${c.year ? ` (${c.year})` : ''}`).join('  •  ')}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      const cleanRecipient = cleanRecipientTitle(coverLetter.header.recipientNameOrTitle);
      const cleanSubject = coverLetter.header.subjectLine.startsWith('Objet')
        ? coverLetter.header.subjectLine
        : `Objet : ${coverLetter.header.subjectLine}`;

      const todayFormatted = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const letterDate = (!coverLetter.header?.date || coverLetter.header.date === '22 mai 2024' || coverLetter.header.date.includes('22 mai 2024'))
        ? todayFormatted
        : coverLetter.header.date;

      documentHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.45; padding: 0; width: 100%; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 20px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14px; font-weight: 800; color: #0b1530; text-transform: uppercase; letter-spacing: -0.01em;">${coverLetter.header.candidateName}</div>
              <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">${[coverLetter.header.candidateEmail, coverLetter.header.candidatePhone].filter(Boolean).join('  •  ')}</div>
            </div>
            <div style="max-width: 48%; text-align: right; font-size: 10.5px; color: #334155; word-break: break-word;">
              <div style="font-weight: 700; color: #0b1530;">À l'attention de : ${cleanRecipient}</div>
              ${cleanCompanyName(coverLetter.header.companyName) ? `<div style="font-weight: 600; color: #b45309; margin-top: 1px;">${cleanCompanyName(coverLetter.header.companyName)}</div>` : ''}
              <div style="color: #64748b; font-style: italic; margin-top: 1px;">Date : ${letterDate}</div>
            </div>
          </div>

          <div style="font-size: 11.5px; font-weight: 700; color: #0b1530; margin-bottom: 14px; padding-bottom: 4px; border-bottom: 1px solid #cbd5e1;">
            ${cleanSubject}
          </div>

          <p style="font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">Madame, Monsieur,</p>

          <p style="font-size: 10.5px; color: #334155; text-align: justify; margin-bottom: 10px; line-height: 1.45;">
            ${coverLetter.paragraphs.vous}
          </p>
          <p style="font-size: 10.5px; color: #334155; text-align: justify; margin-bottom: 10px; line-height: 1.45;">
            ${coverLetter.paragraphs.moi}
          </p>
          <p style="font-size: 10.5px; color: #334155; text-align: justify; margin-bottom: 12px; line-height: 1.45;">
            ${coverLetter.paragraphs.nous}
          </p>

          <p style="font-size: 10.5px; color: #334155; margin-bottom: 12px; line-height: 1.45;">
            ${cleanSignOff}
          </p>

          <div style="font-size: 12px; font-weight: 700; color: #0b1530; margin-top: 10px;">
            ${coverLetter.header.candidateName}
          </div>
        </div>
      `;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeDocument === 'cv' ? 'CV Optimisé ATS' : 'Lettre de Motivation'}</title>
          <style>
            @page { size: A4; margin: 12mm 16mm; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #fff; width: 100%; }
          </style>
        </head>
        <body>
          ${documentHtml}
        </body>
      </html>
    `);
    doc.close();

    // Attendre le rendu puis lancer l'impression
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Impression bloquée par le navigateur/sandbox :', err);
        // Fallback transparent : télécharger le PDF haute définition
        if (activeDocument === 'cv') {
          downloadCvPdf(cv);
        } else {
          downloadCoverLetterPdf(coverLetter);
        }
      }
    }, 250);

    return { success: true };
  } catch (error) {
    console.warn('Erreur print iframe, bascule automatique sur export PDF :', error);
    // En cas de blocage d'iframe sandbox, télécharger le PDF directement
    if (activeDocument === 'cv') {
      downloadCvPdf(cv);
    } else {
      downloadCoverLetterPdf(coverLetter);
    }
    return { success: false, fallbackTriggered: true };
  }
}
