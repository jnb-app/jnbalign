import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outDir = path.resolve(process.cwd(), 'public', 'captures_clean');

console.log('🎨 Création des cartes SVG épurées pour Mots-clés et Adéquation ATS...');

// =========================================================================
// 1. CARTE MOTS-CLÉS STRATÉGIQUES (1080x1920)
// =========================================================================
const motsClesSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#080D20"/>
      <stop offset="50%" stop-color="#0D1636"/>
      <stop offset="100%" stop-color="#080D20"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D1530"/>
      <stop offset="100%" stop-color="#090E24"/>
    </linearGradient>
  </defs>

  <!-- Arrière-plan global -->
  <rect width="1080" height="1920" fill="url(#bgGrad)"/>

  <!-- Badge Supérieur Étape 2 -->
  <g transform="translate(140, 200)">
    <rect width="800" height="54" rx="27" fill="#1E293B" stroke="#F6C94D" stroke-width="2"/>
    <text x="400" y="36" fill="#F6C94D" font-family="Liberation Sans, Montserrat, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" letter-spacing="2">ÉTAPE 2 · ANALYSE SÉMANTIQUE DES MOTS-CLÉS</text>
  </g>

  <!-- Titre de la section -->
  <text x="540" y="320" fill="#FFFFFF" font-family="Liberation Sans, Montserrat, sans-serif" font-size="52" font-weight="900" text-anchor="middle">MOTS-CLÉS REPÉRÉS DANS L'OFFRE</text>
  <text x="540" y="375" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="28" font-weight="500" text-anchor="middle">Compétences prioritaires exigées par le recruteur</text>

  <!-- Grande Carte Centrale Mots-Clés -->
  <g transform="translate(70, 420)">
    <rect width="940" height="690" rx="32" fill="url(#cardGrad)" stroke="#38BDF8" stroke-width="3" stroke-opacity="0.6"/>

    <!-- En-tête de carte -->
    <rect x="0" y="0" width="940" height="76" rx="32" fill="#0F1F40"/>
    <rect x="0" y="44" width="940" height="32" fill="#0F1F40"/>
    <text x="40" y="48" fill="#38BDF8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="26" font-weight="bold">✦ EXTRACTION DE LA GRILLE DE COMPÉTENCES</text>
    <rect x="740" y="18" width="160" height="40" rx="20" fill="#0284C7" stroke="#38BDF8" stroke-width="1.5"/>
    <text x="820" y="45" fill="#E0F2FE" font-family="Liberation Sans, Montserrat, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">100% CIBLÉ</text>

    <!-- Sous-bloc 1 : Mots-clés Critiques Requis -->
    <text x="40" y="125" fill="#F87171" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold" letter-spacing="1">MOTS-CLÉS CRITIQUES REQUIS (OFFRE CIBLE)</text>
    
    <!-- Tag 1 -->
    <g transform="translate(40, 145)">
      <rect width="410" height="58" rx="16" fill="#7F1D1D" stroke="#EF4444" stroke-width="2"/>
      <text x="20" y="38" fill="#FCA5A5" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">★ Gestion de Projet Agile &amp; Scrum</text>
    </g>

    <!-- Tag 2 -->
    <g transform="translate(470, 145)">
      <rect width="430" height="58" rx="16" fill="#7F1D1D" stroke="#EF4444" stroke-width="2"/>
      <text x="20" y="38" fill="#FCA5A5" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">★ Product Backlog &amp; Roadmaps</text>
    </g>

    <!-- Tag 3 -->
    <g transform="translate(40, 220)">
      <rect width="440" height="58" rx="16" fill="#7F1D1D" stroke="#EF4444" stroke-width="2"/>
      <text x="20" y="38" fill="#FCA5A5" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">★ User Stories &amp; Spécifications</text>
    </g>

    <!-- Tag 4 -->
    <g transform="translate(500, 220)">
      <rect width="400" height="58" rx="16" fill="#7F1D1D" stroke="#EF4444" stroke-width="2"/>
      <text x="20" y="38" fill="#FCA5A5" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">★ Priorisation par la Valeur</text>
    </g>

    <!-- Ligne de séparation -->
    <line x1="40" y1="310" x2="900" y2="310" stroke="#1E293B" stroke-width="2"/>

    <!-- Sous-bloc 2 : Compétences Intégrées dans le CV via STAR -->
    <text x="40" y="350" fill="#34D399" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold" letter-spacing="1">MOTS-CLÉS VALIDÉS &amp; VALORISÉS (MÉTHODE STAR)</text>

    <!-- Tag 5 -->
    <g transform="translate(40, 370)">
      <rect width="410" height="58" rx="16" fill="#064E3B" stroke="#10B981" stroke-width="2"/>
      <text x="20" y="38" fill="#6EE7B7" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">✓ Pilotage KPIs &amp; Métriques</text>
    </g>

    <!-- Tag 6 -->
    <g transform="translate(470, 370)">
      <rect width="430" height="58" rx="16" fill="#064E3B" stroke="#10B981" stroke-width="2"/>
      <text x="20" y="38" fill="#6EE7B7" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">✓ Coordination Multi-Équipes</text>
    </g>

    <!-- Tag 7 -->
    <g transform="translate(40, 445)">
      <rect width="360" height="58" rx="16" fill="#064E3B" stroke="#10B981" stroke-width="2"/>
      <text x="20" y="38" fill="#6EE7B7" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">✓ Amélioration Continue</text>
    </g>

    <!-- Tag 8 -->
    <g transform="translate(420, 445)">
      <rect width="480" height="58" rx="16" fill="#064E3B" stroke="#10B981" stroke-width="2"/>
      <text x="20" y="38" fill="#6EE7B7" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold">✓ Alignement Parties Prenantes</text>
    </g>

    <!-- Bandeau de synthèse bas de carte -->
    <g transform="translate(40, 540)">
      <rect width="860" height="105" rx="20" fill="#060C1B" stroke="#F6C94D" stroke-width="2"/>
      <text x="50" y="62" fill="#F6C94D" font-family="Liberation Sans, Montserrat, sans-serif" font-size="36" font-weight="bold">🎯</text>
      <text x="110" y="44" fill="#FDE047" font-family="Liberation Sans, Montserrat, sans-serif" font-size="24" font-weight="bold">DENSITÉ LEXICALE VALIDÉE : 94%</text>
      <text x="110" y="80" fill="#CBD5E1" font-family="Liberation Sans, Montserrat, sans-serif" font-size="20">Formulation naturelle intégrée dans les expériences sans rien inventer</text>
    </g>
  </g>
</svg>
`;

// =========================================================================
// 2. CARTE ADÉQUATION ATS (1080x1920)
// =========================================================================
const adequationAtsSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#080D20"/>
      <stop offset="50%" stop-color="#0D1636"/>
      <stop offset="100%" stop-color="#080D20"/>
    </linearGradient>
    <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0D1530"/>
      <stop offset="100%" stop-color="#090E24"/>
    </linearGradient>
    <linearGradient id="gaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#F6C94D"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
  </defs>

  <!-- Arrière-plan global -->
  <rect width="1080" height="1920" fill="url(#bgGrad2)"/>

  <!-- Badge Supérieur Étape 2 -->
  <g transform="translate(140, 200)">
    <rect width="800" height="54" rx="27" fill="#1E293B" stroke="#34D399" stroke-width="2"/>
    <text x="400" y="36" fill="#34D399" font-family="Liberation Sans, Montserrat, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" letter-spacing="2">ÉTAPE 2 · INDICE D'ADÉQUATION ATS OFFICIEL</text>
  </g>

  <!-- Titre de la section -->
  <text x="540" y="320" fill="#FFFFFF" font-family="Liberation Sans, Montserrat, sans-serif" font-size="52" font-weight="900" text-anchor="middle">BOUSSOLE DE COMPATIBILITÉ ATS</text>
  <text x="540" y="375" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="28" font-weight="500" text-anchor="middle">Franchissement garanti des filtres recruteurs automatiques</text>

  <!-- Grande Carte Centrale Jauge ATS -->
  <g transform="translate(70, 420)">
    <rect width="940" height="690" rx="32" fill="url(#cardGrad2)" stroke="#F6C94D" stroke-width="3" stroke-opacity="0.6"/>

    <!-- Anneau de la jauge circulaire -->
    <g transform="translate(470, 220)">
      <!-- Cercle de fond gris foncé -->
      <circle cx="0" cy="0" r="140" fill="none" stroke="#1E293B" stroke-width="24"/>
      <!-- Arc de progression coloré -->
      <circle cx="0" cy="0" r="140" fill="none" stroke="url(#gaugeGrad)" stroke-width="24"
              stroke-dasharray="880" stroke-dashoffset="70" stroke-linecap="round"
              transform="rotate(-90)"/>
      
      <!-- Chiffre géant au centre -->
      <text x="0" y="15" fill="#FFFFFF" font-family="Liberation Sans, Montserrat, sans-serif" font-size="96" font-weight="900" text-anchor="middle">92%</text>
      <text x="0" y="60" fill="#F6C94D" font-family="Liberation Sans, Montserrat, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" letter-spacing="1">SCORE ATS CALCULÉ</text>
    </g>

    <!-- Badge sous la jauge -->
    <g transform="translate(295, 385)">
      <rect width="350" height="48" rx="24" fill="#064E3B" stroke="#34D399" stroke-width="2"/>
      <text x="175" y="32" fill="#6EE7B7" font-family="Liberation Sans, Montserrat, sans-serif" font-size="22" font-weight="bold" text-anchor="middle">Adéquation Maximale (Top 5%)</text>
    </g>
    <text x="470" y="470" fill="#F6C94D" font-family="Liberation Sans, Montserrat, sans-serif" font-size="24" font-weight="bold" text-anchor="middle">+34 pts de gain vs description initiale</text>

    <!-- Scorecard 4 Piliers -->
    <g transform="translate(40, 500)">
      <!-- Pilier 1 : Mots-clés -->
      <g transform="translate(0, 0)">
        <rect width="200" height="95" rx="16" fill="#060C1B" stroke="#10B981" stroke-width="1.5"/>
        <text x="20" y="32" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="16" font-weight="bold">MOTS-CLÉS</text>
        <text x="20" y="68" fill="#34D399" font-family="Liberation Sans, Montserrat, sans-serif" font-size="32" font-weight="900">94%</text>
        <text x="20" y="86" fill="#10B981" font-family="Liberation Sans, Montserrat, sans-serif" font-size="14">Alignement total</text>
      </g>

      <!-- Pilier 2 : Verbes STAR -->
      <g transform="translate(220, 0)">
        <rect width="200" height="95" rx="16" fill="#060C1B" stroke="#F6C94D" stroke-width="1.5"/>
        <text x="20" y="32" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="16" font-weight="bold">VERBES STAR</text>
        <text x="20" y="68" fill="#F6C94D" font-family="Liberation Sans, Montserrat, sans-serif" font-size="32" font-weight="900">100%</text>
        <text x="20" y="86" fill="#FDE047" font-family="Liberation Sans, Montserrat, sans-serif" font-size="14">Actions concrètes</text>
      </g>

      <!-- Pilier 3 : Structure ATS -->
      <g transform="translate(440, 0)">
        <rect width="200" height="95" rx="16" fill="#060C1B" stroke="#38BDF8" stroke-width="1.5"/>
        <text x="20" y="32" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="16" font-weight="bold">STRUCTURE</text>
        <text x="20" y="68" fill="#38BDF8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="32" font-weight="900">A+</text>
        <text x="20" y="86" fill="#38BDF8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="14">Mono-colonne</text>
      </g>

      <!-- Pilier 4 : Chiffrage KPIs -->
      <g transform="translate(660, 0)">
        <rect width="200" height="95" rx="16" fill="#060C1B" stroke="#A855F7" stroke-width="1.5"/>
        <text x="20" y="32" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="16" font-weight="bold">CHIFFRAGE</text>
        <text x="20" y="68" fill="#C084FC" font-family="Liberation Sans, Montserrat, sans-serif" font-size="32" font-weight="900">92%</text>
        <text x="20" y="86" fill="#C084FC" font-family="Liberation Sans, Montserrat, sans-serif" font-size="14">Impacts quantifiés</text>
      </g>
    </g>

    <!-- Parseurs compatibles certifiés -->
    <g transform="translate(40, 615)">
      <rect width="860" height="50" rx="14" fill="#040711"/>
      <text x="430" y="32" fill="#94A3B8" font-family="Liberation Sans, Montserrat, sans-serif" font-size="18" text-anchor="middle">
        Parseurs certifiés : Workday · Taleo · Greenhouse · Lever · iCIMS
      </text>
    </g>
  </g>
</svg>
`;

fs.writeFileSync('/tmp/v_step2_mots_cles.svg', motsClesSvg);
fs.writeFileSync('/tmp/v_step2_adequation_ats.svg', adequationAtsSvg);

const motsClesJpg = path.join(outDir, 'v_step2_mots_cles.jpg');
const adequationAtsJpg = path.join(outDir, 'v_step2_adequation_ats.jpg');

console.log('Conversion SVG -> JPG 1080x1920 avec ffmpeg...');
execSync(`ffmpeg -y -i /tmp/v_step2_mots_cles.svg -vf "scale=1080:1920" -q:v 2 "${motsClesJpg}"`, { stdio: 'inherit' });
execSync(`ffmpeg -y -i /tmp/v_step2_adequation_ats.svg -vf "scale=1080:1920" -q:v 2 "${adequationAtsJpg}"`, { stdio: 'inherit' });

console.log('✅ Cartes créées avec succès !');
