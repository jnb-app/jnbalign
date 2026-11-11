# SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES (SFD)
## Application : JNB Align — Optimiseur de Candidature ATS & Lettre Stratégique
**Version :** 3.0.0 (Production-Ready — Post-Retours Testeurs & Architecture Tolérante aux Pannes)  
**Rôle :** Product Owner Certifié IA & Ingénieur Concepteur Applicatif  
**Date :** Novembre 2026  
**Statut :** Validé, Déployé & Conforme aux Normes Internationales ATS

---

## 1. VISION PRODUIT & CADRE STRATÉGIQUE

### 1.1 Baseline & Mission Fondatrice
> **« L'alignement parfait entre votre parcours et l'offre idéale. »**

**JNB Align** est une plateforme SaaS d'optimisation de candidatures professionnelles propulsée par intelligence artificielle et analyse sémantique avancée. Elle résout la problématique majeure du filtrage algorithmique opéré par les **parseurs ATS (*Applicant Tracking Systems*)** (Workday, Taleo, Greenhouse, Lever, iCIMS, BambooHR) par lesquels transitent plus de 75 % des candidatures sans jamais atteindre les yeux d'un recruteur humain.

La plateforme délivre un **dossier de candidature d'élite en 2 volets complémentaires** :
1. **Document 1 : Le CV Certifié ATS** — restructuré en monocolonne stricte avec verbes d'action STAR et mots-clés exacts de l'offre pour garantir un score de passage machine maximal (≥ 90 %).
2. **Document 2 : La Lettre Stratégique** — rédigée selon la trame d'or tripartite « Vous / Moi / Nous » (ou « Challenges / Track Record / Future Impact » en anglais) pour convaincre le manager et décrocher l'entretien.

### 1.2 La Charte d'Or : « Zéro Hallucination & Vérité du Parcours »
Contrairement aux générateurs d'IA génériques qui inventent des diplômes, des expériences fictives ou des compétences non maîtrisées :
* **Préservation absolue des faits réels :** Aucun fait, employeur, certification, date ou compétence non déclarée par le candidat n'est inventé.
* **Réfraction sémantique & Méthode STAR :** Les réalisations authentiques du candidat sont restructurées (Situation, Tâche, Action, Résultat chiffré) avec le vocabulaire et les exigences exactes de l'offre d'emploi cible.

### 1.3 Personas Cibles
1. **Cadres & Dirigeants (Senior / C-Level) :** Besoin de synthétiser des parcours denses avec des métriques de leadership, de ROI et de gouvernance.
2. **Profils Techniques (Tech, Data, Finance, Ingénierie) :** Nécessité d'aligner la pile d'outils, les acronymes et méthodologies sur les grilles ATS strictes.
3. **Candidats à l'International :** Basculement bilingue instantané (normes France/UE vs International Anglo-Saxon avec verbes d'action d'impact).
4. **Professionnels en Reconversion / Mobilité :** Mise en lumière des compétences transférables face aux critères formels d'une nouvelle offre.

---

## 2. ARCHITECTURE APPLICATIVE & FLUX UTILISATEUR

L'application repose sur une architecture à état réactif avec persistance locale continue et un parcours directive en 3 étapes :

```
+----------------------------------------------------------------------------------------------------+
|                                    EN-TÊTE UNIFIÉ JNB ALIGN                                        |
| [Logo Boussole]      [Étape 1: Import] -> [Étape 2: Boussole ATS] -> [Étape 3: Documents] [Thème/Act]|
+----------------------------------------------------------------------------------------------------+
         |                                                                   |
         v (Mode Découverte / Accueil)                                       v (Mode Studio Opérationnel)
+---------------------------------+                 +------------------------------------------------+
|        PORTAIL D'AVENIR         |                 |                  STUDIO ALIGN                  |
| - Manifeste Zéro Hallucination  |    "Accéder"    | 1. INGESTION MULTIMODALE & TRIPLE-CANAL        |
| - Démonstrateur Interactif STAR | --------------> |    - Fichier (PDF, Word, OCR scan)             |
| - Simulateur d'impact (+35 pts) |                 |    - Texte libre (Copier-coller)               |
| - Architecture du Prisme Sém.   |                 |    - Lien de l'offre (Extraction URL résiliente) |
| - Souveraineté & Zéro Rétention |                 |    - Sauvegarde continue anti-perte            |
+---------------------------------+                 |    - Barre d'action mobile thumb-zone          |
                                                    |                       |                        |
                                                    |                       v                        |
                                                    | 2. BOUSSOLE & ANALYSE SÉMANTIQUE D'ÉCART       |
                                                    |    - Jauge d'adéquation Avant / Après          |
                                                    |    - Mots-clés Matchés / Intégrés / Gaps       |
                                                    |    - Audit technique de conformité parseurs    |
                                                    |                       |                        |
                                                    |                       v                        |
                                                    | 3. DOCUMENTS STUDIO A4 & MULTI-CALIBRES        |
                                                    |    - Doc 1 : CV Certifié ATS (Méthode STAR)    |
                                                    |    - Doc 2 : Lettre Stratégique (Vous/Moi/Nous)|
                                                    |    - Calibre typographique (10pt/11.5pt/13pt)  |
                                                    |    - Affineur interactif STAR par puce         |
                                                    |    - Exports : PDF vectoriel, Word .docx, Txt  |
                                                    +------------------------------------------------+
```

---

## 3. SPÉCIFICATIONS FONCTIONNELLES PAR MODULE

---

### MODULE 1 : EN-TÊTE, THÈME & CONTRÔLE GLOBAL (`Header.tsx` & `App.tsx`)

#### SF-HDR-01 : Navigation et Visibilité Adaptative
* **Comportement Fonctionnel :**
  * **Logo Marque :** Identité visuelle à boussole dorée cliquable avec redirection fluide vers l'accueil ou le studio.
  * **Indicateur d'étapes :**
    * *Desktop :* 3 pilules cliquables montrant l'état d'avancement (actif en or, franchi avec coche verte émeraude, futur désactivé).
    * *Mobile :* Badge compact indiquant l'étape active sans encombrement.
  * **Actions prioritaires :**
    * **Bouton « Historique » :** Affiche le nombre de sessions sauvegardées et ouvre le tiroir d'historique local.
    * **Bouton « + Nouveau » :** Réinitialise le studio vers une candidature vierge avec confirmation in-app.
    * **Bouton « Exporter PDF » :** Bouton doré prioritaire accessible dès l'étape 2 et 3.
    * **Bouton « Imprimer » :** Impression A4 standard via styles print dédiés.
    * **Bascule Thème Sombre / Clair (☀️ / 🌙) :** Bascule instantanée entre la signature spatiale sombre (`#050A17`) et le mode clair exécutif (`#F8FAFC`). Persistance dans `localStorage`.

---

### MODULE 2 : INGESTION MULTIMODALE & TRIPLE-CANAL D'IMPORTATION (`ImportStep.tsx`)

#### SF-ING-01 : Ingestion du CV Candidat (Double-Canal)
* **Canal Fichier :** Glisser-déposer ou sélection de fichier.
  * *Formats supportés :* PDF (`.pdf`), Word (`.docx`, `.doc`), Texte brut (`.txt`, `.md`, `.rtf`), Images & Scans (`.png`, `.jpg`, `.jpeg`, `.webp`).
  * *Traitement haute performance :* Parseur PDF natif côté serveur en < 200 ms, extraction Word sans perte via `mammoth`, OCR multimodal via l'API Vision Gemini pour les scans.
* **Canal Texte :** Zone de texte libre pour copier-coller brut direct.

#### SF-ING-02 : Ingestion de l'Offre d'Emploi (Triple-Canal dont Extraction URL Résiliente)
* **Canal 1 — Fichier :** Ingestion de la fiche de poste en PDF ou Word.
* **Canal 2 — Texte :** Copier-coller libre du descriptif de l'offre.
* **Canal 3 — Lien de l'offre (URL) :**
  * L'utilisateur renseigne l'URL de l'offre (ex: Welcome to the Jungle, HelloWork, France Travail, Apec, Indeed, sites carrières d'entreprises).
  * Bouton « Coller depuis le presse-papier » pour saisie immédiate en 1 tap.
  * **Architecture tolérante aux pannes (`/api/extract-job-url`) :**
    * Décodage et assainissement de l'URL.
    * Requête serveur avec en-têtes de navigateur réalistes.
    * Nettoyage du DOM (suppression des scripts, styles, en-têtes, bandeaux cookies et menus parasites).
    * Extraction heuristique du corps de l'offre d'emploi.
    * Détection automatique de l'intitulé de poste, de l'entreprise recruteuse et de la langue principale (FR/EN).
    * **Protection contre les sites protégés / avec mur d'authentification :** Si l'accès est bloqué (ex: LinkedIn Jobs demandant une connexion ou Cloudflare fort), l'application ne plante jamais : elle affiche un encart pédagogique bienveillant expliquant la restriction du site et propose une bascule en 1 clic vers l'onglet Texte avec pré-remplissage du presse-papier.

#### SF-ING-03 : Anti-Perte au Rechargement & Sauvegarde Continue du Brouillon (Irritant Testeur A)
* **Objectif :** Empêcher toute perte de saisie lors d'un rafraîchissement involontaire (`F5`, swipe-to-refresh mobile, fermeture d'onglet).
* **Comportement Fonctionnel :**
  * Sauvegarde continue en arrière-plan dans `localStorage` (`draftStorage.ts`) : textes du CV et de l'offre, noms de fichiers, modes d'onglets actifs, titre de poste ciblé, notes, langue sélectionnée et résultats générés.
  * Badge d'état rassurant dans l'en-tête de l'étape d'import : *« Sauvegarde automatique active · Vos données ne seront pas effacées en rechargeant »*.
  * Restauration transparente à l'ouverture avec notification toast : *« Brouillon restauré automatiquement 💾 »*.
  * Durée de rétention de 7 jours avec nettoyage propre lors de l'action « Réinitialiser ».

#### SF-ING-04 : Ergonomie Mobile en Zone du Pouce (Thumb-Zone — Irritant Testeur B)
* **Objectif :** Éliminer le besoin de faire défiler de longues pages de texte sur smartphone pour lancer l'optimisation.
* **Comportement Fonctionnel :**
  * **Barre d'action mobile persistante (`fixed bottom-0 md:hidden`) :**
    * Si le CV et l'Offre sont renseignés : affichage d'un bouton plein format doré *« Optimiser ma Candidature (STAR) → »* activable d'un simple mouvement du pouce.
    * Si des éléments sont manquants : indicateur d'état dynamique (*« ✓ CV prêt · ⏳ Offre manquante »*).
  * Padding inférieur adaptatif (`pb-28 md:pb-8`) pour garantir qu'aucun élément de formulaire ne soit dissimulé sous la barre d'action.

#### SF-ING-05 : Sélecteur Linguistique et Norme ATS
* **Options :**
  1. **⚡ Auto (par défaut) :** Détection intelligente privilégiant le texte de l'offre d'emploi pour adapter la langue de sortie.
  2. **🇫🇷 Français :** Norme France/UE, verbes d'action STAR français (*Piloté, Conçu, Déployé, Optimisé*), trame Vous / Moi / Nous.
  3. **🇬🇧 English :** Norme International ATS, verbes d'action exécutifs anglo-saxons (*Spearheaded, Engineered, Orchestrated, Scaled*), structure internationale (*Challenges / Track Record / Future Impact*).

#### SF-ING-06 : Profils Types Pré-configurés (*Sample Presets*)
* Profils de démonstration en 1 clic pour tester l'outil sans fichier personnel :
  * *Tech Lead Cloud & DevOps* (Mode France).
  * *Global VP Marketing / Senior Product Lead* (Mode International EN).
  * *Directeur Administratif & Financier* (Mode Corporate).

---

### MODULE 3 : MOTEUR D'ALIGNEMENT SÉMANTIQUE & RÉSILIENCE MULTI-MODÈLES (`server.ts`)

#### SF-IA-01 : Orchestration et Schéma de Réfraction
* **Entrées :** CV source, Offre d'emploi, Rôle cible, Notes additionnelles, Langue cible.
* **Sortie :** Schéma JSON strict comprenant le diagnostic d'écart, le CV optimisé et la lettre stratégique.

#### SF-IA-02 : Chaîne de Failover Haute Disponibilité (*Zero-Downtime Fallback*)
Pour éliminer les blocages de quotas (`429 Quota Exceeded`) ou de saturation réseau (`503 High Demand`) :
1. Tentative sur **`gemini-3.8-flash`**.
2. En cas de 429/503 : bascule instantanée sur **`gemini-flash-latest`**.
3. En cas de non-réponse : bascule sur **`gemini-3.1-flash-lite`**.
4. En cas de surcharge : bascule sur **`gemini-4-argon`**.
5. **Filet de Sécurité Zéro Échec :** Si toutes les connexions externes échouent, le **Moteur Sémantique & STAR Local Résilient (`generateResilientAtsResult`)** prend le relais en mémoire pour générer la totalité des livrables sans jamais bloquer le candidat.

---

### MODULE 4 : BOUSSOLE ATS & ANALYSE D'ÉCART SÉMANTIQUE (`SemanticGapView.tsx`)

#### SF-BOU-01 : Diagnostic d'Adéquation en 2 Scores
* **Score Initial :** Pourcentage d'affinité du CV source avant optimisation (généralement 45% - 65%).
* **Score Optimisé :** Score projeté après alignement sémantique et verbes STAR (88% - 98%).
* **Jauge Radiale Duale :** Visualisation graphique avec badge de progression (+35 à +45 pts).

#### SF-BOU-02 : Cartographie Tripartite des Mots-Clés
* **Compétences Validées (Vert) :** Compétences du candidat correspondant aux exigences de l'offre.
* **Compétences Intégrées (Bleu) :** Termes clés de l'offre reformulés dans le CV sans altération des faits.
* **Compétences Manquantes / Gaps (Ambre) :** Exigences de l'offre absentes du profil du candidat (signalement éthique pour préparer l'entretien ou des exemples connexes).

#### SF-BOU-03 : Audit Technique des Parseurs ATS
* Validation automatique des critères stricts :
  * Structure monocolonne rigoureuse sans tableaux imbriqués ni zones de texte flottantes.
  * Titrages normalisés reconnus nativement par Workday, Taleo, Greenhouse, Lever.
  * Typographie standard et absence d'icônes non conventionnelles dans le flux de lecture machine.

---

### MODULE 5 : STUDIO DOCUMENTS A4 & PERSONNALISATION (`DocumentsStudioView.tsx`)

#### SF-DOC-01 : Clarification Pédagogique du Pack de Candidature (Irritant Testeur C - Partie 1)
* **Objectif :** Éliminer la confusion constatée chez les testeurs pensant avoir reçu deux CV différents.
* **Comportement Fonctionnel :**
  * **Bannière explicative en tête du Studio :**
    * *« Votre dossier complet comprend 2 documents stratégiques distincts : »*
    * **Document 1 : Le CV Certifié ATS** (monocolonne, verbes STAR pour franchir les robots).
    * **Document 2 : La Lettre Stratégique** (trame Vous / Moi / Nous pour convaincre le manager humain).
  * **Onglets explicites :**
    * **`Doc 1 : CV Certifié ATS`**
    * **`Doc 2 : Lettre Stratégique`**

#### SF-DOC-02 : Sélecteur de Typographie Multi-Calibres (Irritant Testeur C - Partie 2)
* **Objectif :** Répondre à la demande d'augmentation de la taille des textes tout en laissant le choix pour le respect du calibrage 1 ou 2 pages A4.
* **Comportement Fonctionnel :**
  * **3 Calibres typographiques accessibles en 1 clic :**
    * **A- 10pt (Standard) :** Idéal pour condenser un long parcours professionnel sans déborder sur une page supplémentaire.
    * **A 11.5pt (Confort — Défaut Recommandé) :** Taille agrandie offrant une lecture fluide et reposante sur écran mobile et desktop.
    * **A+ 13pt (Aéré) :** Lecture grand confort, idéale pour la relecture attentive ou les personnes préférant les grands caractères.
  * **Double accès ergonomique :**
    1. Sélecteur global dans la bannière de commande du Studio.
    2. Mini-sélecteur intégré dans la barre d'outils locale de chaque document (CV et Lettre).
  * Application dynamique sur l'en-tête, le résumé, les blocs d'expérience, les puces de réalisations, les formations et les paragraphes de la lettre.

#### SF-DOC-03 : Rendu WYSIWYG A4 Haute Définition
* Rendu fidèle aux proportions physiques de la feuille A4 (210 x 297 mm) avec marge standard, fond blanc immaculé et typographie sombre `#0f172a` à fort contraste.
* Visualisation fidèle entre l'affichage écran et le rendu d'impression / export PDF.

#### SF-DOC-04 : Atelier d'Affinage STAR par Puce (`BulletRefinerModal.tsx`)
* Au survol de chaque réalisation du CV, un bouton doré *« Affiner STAR »* permet d'ouvrir une modale d'ajustement.
* Proposition de 3 variantes stylistiques :
  1. *Directe & Claire* (Concision et efficacité opérationnelle).
  2. *Impact & STAR* (Action, contexte, KPI quantifié).
  3. *Stratégique & Chiffrée* (Leadership, ROI, passage à l'échelle).
* Remplacement in-situ immédiat dans le document sans rechargement.

#### SF-DOC-05 : Scanner X-Ray ATS & Mode Vision Robot
* **Mode Scanner X-Ray ATS :** Radiographie sémantique affichant exactement les entités extraites par les parseurs d'entreprise (Nom, Titre indexé, Coordonnées, Verbes d'action STAR validés).
* **Mode Vision Robot ATS :** Visualisation en texte brut structuré pour vérifier la lisibilité parfaite par les automates.

#### SF-DOC-06 : Lettre de Motivation Sécurisée & Datation Automatique
* Datation calée automatiquement sur la date du jour en format localisé (français ou anglais).
* Filtre anti-doublon de signature : assainissement des formules de politesse empêchant la duplication du nom du candidat.
* Édition textuelle directe possible sur chaque bloc (Vous, Moi, Nous).

---

### MODULE 6 : SUITE D'EXPORTATION MULTI-FORMATS & HISTORIQUE LOCAL

#### SF-EXP-01 : Exportation Multimodale
1. **Pack Complet Candidature (PDF Doré Prioritaire) :** Télécharge en un seul fichier PDF de haute qualité le CV Certifié ATS suivi de la Lettre Stratégique.
2. **Export PDF Individuel :** Télécharge uniquement le CV ou uniquement la Lettre.
3. **Export Microsoft Word (.docx) :** Fichiers `.docx` natifs éditables respectant la structure de titres monocolonne conforme ATS.
4. **Copier le Texte Brut :** Place l'intégralité du document en mémoire vive pour collage direct dans les formulaires de candidature en ligne (Workday, Taleo, Indeed).
5. **Impression Directe A4 :** Feuilles de style CSS `@media print` avec gestion des sauts de page propres (`page-break-inside: avoid`).

#### SF-EXP-02 : Historique Local Privé (Souveraineté & RGPD)
* Conservation des sessions précédentes exclusivement dans le navigateur (`localStorage`).
* Consultation, restauration en 1 clic ou suppression définitive à discrétion du candidat.
* Zéro stockage sur serveur distant, respect absolu de la vie privée.

---

### MODULE 7 : MODULES D'ACCOMPAGNEMENT & ENGAGEMENT CANDIDAT

#### SF-ACC-01 : Coach Pré-Entretien Oral (`PreInterviewCoach.tsx`)
* Formulation de 3 questions d'entretien clés directement extraites de l'analyse d'écart de l'offre.
* Suggestion d'arguments oraux STAR à formuler lors de l'entretien physique ou visio.
* Cases à cocher interactives pour structurer la préparation orale.

#### SF-ACC-02 : Checklist « Prêt à Postuler » (`ReadyToApplyChecklist.tsx`)
* Synthèse de validation en 5 points de contrôle avant soumission finale (Score ATS, Puces STAR, Adéquation Titre, Coordonnées, Trame de lettre).

#### SF-ACC-03 : Partage Solidaire Sans Friction (`ShareAppModal.tsx`)
* Partage de la plateforme auprès d'autres candidats en recherche d'emploi via LinkedIn, WhatsApp, Email ou l'API native de partage mobile.

---

## 4. EXIGENCES NON-FONCTIONNELLES (NFR)

| Critère | Exigence Spécifiée | Mesure & Validation |
| :--- | :--- | :--- |
| **Persistance Continue** | Zéro perte de données en cas de rechargement (`F5`), fermeture d'onglet ou swipe mobile | Stockage réactif dans `localStorage` (7 jours de rétention) |
| **Vitesse d'Ingestion** | Extraction document (PDF, Word, OCR) < 500 ms | < 200 ms pour PDF natif, extraction Word locale instantanée |
| **Extraction d'URL** | Récupération et nettoyage d'offre web < 2.5 s avec fallback gracieux | Validé sur portails d'emploi majeurs avec gestion anti-bot |
| **Temps de Pipeline** | Génération complète du pack (CV + LM + Boussole) < 15 s | Moyenne observée : 7 à 12 s |
| **Disponibilité & Résilience** | 99.9% de succès sans écran d'erreur | Chaîne de secours à 4 modèles Gemini + moteur STAR local |
| **Responsive & Tactile** | 100% opérationnel de 360 px (smartphone) à 4K (PC) | Barre d'action thumb-zone, cibles tactiles ≥ 44 px |
| **Accessibilité Visuelle** | Ratios de contraste conformes WCAG AA en thèmes Sombre et Clair | 3 calibres de typographie (10pt, 11.5pt, 13pt) commutables |
| **Souveraineté des Données** | Aucune base de données distante, aucune revente de coordonnées | Analyse en mémoire volatile, rétention purement locale |

---

## 5. MATRICE DE TRAÇABILITÉ DES RETOURS TESTEURS

| Irritant Remonté par les Testeurs | Origine du Problème | Solution Fonctionnelle Déployée | Statut |
| :--- | :--- | :--- | :--- |
| **« Perte des données lors de l'actualisation »** | L'état React était purement en mémoire vive. | Implémentation du service `draftStorage.ts` avec auto-save continu et restauration automatique au rechargement. | **Résolu** |
| **« Sur mobile, trop d'informations et perdu »** | Écrans de texte denses obligeant à scroller excessivement pour trouver le bouton de lancement. | Ajout de la barre d'action mobile persistante en zone du pouce (`fixed bottom-0 md:hidden`) pour déclenchement en 1 tap. | **Résolu** |
| **« J'ai deux CV optimisés pour le même profil »** | Confusion entre le CV et la Lettre de motivation dans les libellés d'onglets. | Renommage en `Doc 1 : CV Certifié ATS` et `Doc 2 : Lettre Stratégique` + Bannière pédagogique explicative. | **Résolu** |
| **« Augmenter la taille de la police des textes »** | Typographie initiale compacte (9.5-10pt) difficile à lire sur smartphone. | Sélecteur de typographie à 3 niveaux (10pt, 11.5pt Confort par défaut, 13pt Aéré) actif sur le CV et la Lettre. | **Résolu** |
| **« Rendu différent à l'écran et à l'export »** | Absence de standard visuel A4 unifié. | Rendu WYSIWYG A4 harmonisé avec styles `@media print` et exports vectoriels identiques. | **Résolu** |
| **« Besoin d'insérer un lien d'offre d'emploi »** | Tout le monde n'a pas le PDF ou le fichier texte de l'annonce. | Module d'extraction d'URL résilient avec décodage heuristique et protection anti-blocage. | **Résolu** |
| **« Erreur de modèle en cas de pic de charge (503/429) »** | Saturation ponctuelle des quotas de modèles d'IA distants. | Chaîne de failover automatique multi-modèles + Moteur d'analyse sémantique & STAR local autonome. | **Résolu** |

---

*Document de référence v3.0.0 — Validé pour mise en production et référence technique et produit.*
