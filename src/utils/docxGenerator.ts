import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { OptimizedCv, CoverLetter } from '../types/ats';

/**
 * Generates an ATS-compliant single-column Word (.docx) document from an OptimizedCv.
 * Uses standard fonts (Calibri/Arial), zero blocking tables, and clear semantic headings.
 */
export async function generateCvDocxBlob(cv: OptimizedCv): Promise<Blob> {
  const isEn = cv.languageMode === 'en';

  const children: Paragraph[] = [
    // Candidate Name
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: (cv.personalInfo.fullName || 'Candidat').toUpperCase(),
          bold: true,
          size: 32, // 16pt
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    }),

    // Professional Title
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: cv.personalInfo.professionalTitle || '',
          bold: true,
          size: 24, // 12pt
          color: '334155',
          font: 'Arial',
        }),
      ],
    }),

    // Contact line
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      border: {
        bottom: {
          color: 'CBD5E1',
          space: 8,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: [
            cv.personalInfo.email,
            cv.personalInfo.phone,
            cv.personalInfo.location,
            cv.personalInfo.linkedin,
          ]
            .filter(Boolean)
            .join('  |  '),
          size: 20, // 10pt
          color: '475569',
          font: 'Arial',
        }),
      ],
    }),

    // Section: Summary
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: {
        bottom: {
          color: 'CBD5E1',
          space: 4,
          style: BorderStyle.SINGLE,
          size: 4,
        },
      },
      children: [
        new TextRun({
          text: (isEn ? 'PROFESSIONAL SUMMARY' : 'PROFIL PROFESSIONNEL').toUpperCase(),
          bold: true,
          size: 22,
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: cv.professionalSummary || '',
          size: 20,
          color: '1E293B',
          font: 'Arial',
        }),
      ],
    }),

    // Section: Core Competencies
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
      border: {
        bottom: {
          color: 'CBD5E1',
          space: 4,
          style: BorderStyle.SINGLE,
          size: 4,
        },
      },
      children: [
        new TextRun({
          text: (isEn ? 'CORE COMPETENCIES & EXPERTISE' : 'COMPÉTENCES & EXPERTISE').toUpperCase(),
          bold: true,
          size: 22,
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    }),
  ];

  // Skills
  (cv.skillsCategories || []).forEach((cat) => {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${cat.categoryName} : `,
            bold: true,
            size: 20,
            color: '0F172A',
            font: 'Arial',
          }),
          new TextRun({
            text: (cat.skills || []).join(', '),
            size: 20,
            color: '334155',
            font: 'Arial',
          }),
        ],
      })
    );
  });

  // Section: Experience
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 260, after: 120 },
      border: {
        bottom: {
          color: 'CBD5E1',
          space: 4,
          style: BorderStyle.SINGLE,
          size: 4,
        },
      },
      children: [
        new TextRun({
          text: (isEn ? 'PROFESSIONAL EXPERIENCE' : 'EXPÉRIENCES PROFESSIONNELLES').toUpperCase(),
          bold: true,
          size: 22,
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    })
  );

  (cv.experiences || []).forEach((exp) => {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: exp.role,
            bold: true,
            size: 21,
            color: '0F172A',
            font: 'Arial',
          }),
          new TextRun({
            text: `  |  ${exp.company} (${exp.location || 'France'})`,
            bold: true,
            size: 20,
            color: '334155',
            font: 'Arial',
          }),
          new TextRun({
            text: `  [${exp.startDate} - ${exp.endDate}]`,
            size: 19,
            color: '64748B',
            font: 'Arial',
          }),
        ],
      })
    );

    (exp.bullets || []).forEach((bullet) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: bullet,
              size: 20,
              color: '1E293B',
              font: 'Arial',
            }),
          ],
        })
      );
    });
  });

  // Section: Education
  if (cv.education && cv.education.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
        children: [
          new TextRun({
            text: (isEn ? 'EDUCATION' : 'FORMATION').toUpperCase(),
            bold: true,
            size: 22,
            color: '0F172A',
            font: 'Arial',
          }),
        ],
      })
    );

    cv.education.forEach((edu) => {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${edu.degree}${edu.field ? ` - ${edu.field}` : ''}`,
              bold: true,
              size: 20,
              color: '0F172A',
              font: 'Arial',
            }),
            new TextRun({
              text: `  |  ${edu.institution} (${edu.graduationDate || ''})`,
              size: 19,
              color: '475569',
              font: 'Arial',
            }),
          ],
        })
      );
    });
  }

  // Section: Certifications
  if (cv.certifications && cv.certifications.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
        children: [
          new TextRun({
            text: 'CERTIFICATIONS',
            bold: true,
            size: 22,
            color: '0F172A',
            font: 'Arial',
          }),
        ],
      })
    );

    cv.certifications.forEach((c) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${c.name} - ${c.issuer} (${c.year || ''})`,
              size: 20,
              color: '1E293B',
              font: 'Arial',
            }),
          ],
        })
      );
    });
  }

  // Section: Languages
  if (cv.languages && cv.languages.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        border: {
          bottom: {
            color: 'CBD5E1',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
        children: [
          new TextRun({
            text: (isEn ? 'LANGUAGES' : 'LANGUES').toUpperCase(),
            bold: true,
            size: 22,
            color: '0F172A',
            font: 'Arial',
          }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: cv.languages.map((l) => `${l.language} (${l.proficiency})`).join('  ·  '),
            size: 20,
            color: '1E293B',
            font: 'Arial',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1100,
              right: 1100,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads the ATS CV as a .docx Word document directly in the user's browser.
 */
export async function downloadCvDocx(cv: OptimizedCv, filename?: string): Promise<void> {
  const blob = await generateCvDocxBlob(cv);
  const candidateName = cv.personalInfo.fullName
    ? cv.personalInfo.fullName.replace(/\s+/g, '_')
    : 'Candidat';
  const finalName = filename || `CV_${candidateName}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an ATS-compliant Word (.docx) document for the Cover Letter.
 */
export async function generateCoverLetterDocxBlob(coverLetter: CoverLetter): Promise<Blob> {
  const isEn = coverLetter.languageMode === 'en';
  const { header, paragraphs, signOff } = coverLetter;

  const children: Paragraph[] = [
    // Candidate Name
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: header.candidateName || 'Candidat',
          bold: true,
          size: 24,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${header.candidateEmail || ''}  |  ${header.candidatePhone || ''}`,
          size: 20,
          color: '475569',
          font: 'Arial',
        }),
      ],
    }),

    // Recipient & Date
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: isEn ? `Attention: ${header.recipientNameOrTitle}` : `À l'attention de : ${header.recipientNameOrTitle}`,
          bold: true,
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: header.companyName || '',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: header.date || new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR'),
          size: 20,
          color: '475569',
          font: 'Arial',
        }),
      ],
    }),

    // Subject line
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: isEn ? `Subject: ${header.subjectLine}` : `Objet : ${header.subjectLine}`,
          bold: true,
          size: 21,
          color: '0F172A',
          font: 'Arial',
        }),
      ],
    }),

    // Salutation
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: isEn ? 'Dear Hiring Team,' : 'Madame, Monsieur,',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),

    // VOUS
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: paragraphs.vous || '',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),

    // MOI
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: paragraphs.moi || '',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),

    // NOUS
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: paragraphs.nous || '',
          size: 20,
          font: 'Arial',
        }),
      ],
    }),

    // Sign-off
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: signOff || (isEn ? 'Sincerely,' : "Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées."),
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: header.candidateName || '',
          bold: true,
          size: 21,
          font: 'Arial',
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1100,
              right: 1100,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads the Cover Letter as a .docx Word document directly in the user's browser.
 */
export async function downloadCoverLetterDocx(coverLetter: CoverLetter, filename?: string): Promise<void> {
  const blob = await generateCoverLetterDocxBlob(coverLetter);
  const candidateName = coverLetter.header?.candidateName
    ? coverLetter.header.candidateName.replace(/\s+/g, '_')
    : 'Candidat';
  const finalName = filename || `Lettre_Motivation_${candidateName}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
