import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Video,
  Award,
  Layers,
  Share2,
  Heart,
  MessageCircle,
  Bookmark,
  Music,
  Sliders,
  Zap,
  Download,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Calendar,
  FileCheck,
  Film,
} from 'lucide-react';
import { teaserAudio } from '../utils/teaserAudioEngine';

interface TikTokVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type VideoTabId = 'video1' | 'video2' | 'video3' | 'video_com';
export type ViewMode = 'mp4' | 'simulator';

export interface SceneItem {
  id: number;
  timecode: string;
  start: number;
  end: number;
  duration: number;
  title: string;
  onScreenText: string;
  canvaNote: string;
  script: string;
  subtitle: string;
  highlightWords: string[];
  clipSrc?: string;
  captureSrc?: string;
}

export interface VideoProject {
  id: VideoTabId;
  numericId: string;
  badge: string;
  title: string;
  tagline: string;
  duration: number; // in seconds
  mp4File: string;
  audioFile: string;
  objective: string;
  strategy: string;
  caption: string;
  hashtags: string;
  scenes: SceneItem[];
}

export const OFFICIAL_VIDEOS: VideoProject[] = [
  {
    id: 'video1',
    numericId: '1',
    badge: 'Vidéo 1 • Accroche (25s) [Note visée : 9,8/10]',
    title: 'Ton CV est-il vraiment adapté à l’offre que tu vises ?',
    tagline: 'Coordination absolue : question en 1s, logo sobre, zoom 88%, 2 livrables et CTA 5s',
    duration: 25,
    mp4File: '/videos/video_1.mp4',
    audioFile: '/audio/video_1_accroche_v7.mp3',
    objective: "Capter l'attention immédiate des candidats actifs avec une question géante lisible en 1 seconde et transformer en visites sur jnbalign.com.",
    strategy:
      "Coordination Voix-Image-Texte V10 : Question géante (0-2.8s) ➔ Vidéo de l’appli en action (2.8-5.5s) ➔ Dépôt CV/Offre (5.5-9.2s) ➔ Mots-clés repérés dans l'offre (9.2-10.9s) ➔ Valorisation ATS 92% (10.9-12.5s) ➔ 2 Livrables (12.5-16.0s) ➔ Logo officiel JNB Align dès la mention « Essaie maintenant » et outro 9s avec jnbalign.com en or 76px (16.0-25.0s).",
    caption:
      "Ton CV est-il vraiment adapté à l'offre que tu vises ? 🎯\n\nDécouvre JNB Align : dépose ton CV et l'annonce cible en quelques secondes.\nL'analyse repère les compétences clés et valorise ton parcours en toute fidélité.\n\nRésultat : un score de compatibilité en hausse, ton CV ajusté et ta lettre personnalisée, prêts à l'envoi !\n\n👉 Essaie maintenant – lien en bio 🔗 (jnbalign.com)",
    hashtags: '#JNBAlign #ConseilCV #RechercheEmploi #AstuceEmploi #OptimisationCV #Candidature #Recrutement #CVParfait',
    scenes: [
      {
        id: 0,
        timecode: '00:00–00:02.8',
        start: 0,
        end: 2.8,
        duration: 2.8,
        title: 'Accroche Géante Lisible en 1 Seconde',
        onScreenText: 'QUESTION CANDIDAT · Ton CV est-il vraiment adapté à l’offre que tu vises ?',
        canvaNote: 'Carte plein écran marine profond avec typographie géante 80px blanche et dorée',
        script: 'Ton CV est-il vraiment adapté à l’offre que tu vises ?',
        subtitle: 'Ton CV est-il vraiment adapté\nà l’offre que tu vises ?',
        highlightWords: ['vraiment adapté', 'que tu vises'],
        captureSrc: '/captures_clean/v1_hook_question_geante.jpg',
      },
      {
        id: 1,
        timecode: '00:02.8–00:05.5',
        start: 2.8,
        end: 5.5,
        duration: 2.7,
        title: 'Démonstration App en Action · JNB Align Gratuit',
        onScreenText: 'SOLUTION JNB ALIGN · Adapte ton CV gratuitement sans inventer',
        canvaNote: 'Vidéo de l’appli en cours d’utilisation sans barres de navigation',
        script: 'JNB Align t’aide à l’optimiser gratuitement, sans inventer ton parcours.',
        subtitle: 'JNB Align t’aide à l’optimiser\ngratuitement, sans rien inventer.',
        highlightWords: ['JNB Align', 'gratuitement'],
        clipSrc: '/clips/v1_app_demo.mp4',
        captureSrc: '/captures_clean/01_accueil_clean.jpg',
      },
      {
        id: 2,
        timecode: '00:05.5–00:09.2',
        start: 5.5,
        end: 9.2,
        duration: 3.7,
        title: 'Étape 1 · Dépôt Simultané CV & Offre',
        onScreenText: 'ÉTAPE 1 · Dépose ton CV et l’offre d’emploi ciblée',
        canvaNote: 'Gros plan lisible sur les deux zones de sélection sans barres Chrome/Android',
        script: 'Dépose ton CV et l’offre ciblée.',
        subtitle: 'Dépose ton CV\net l’offre ciblée.',
        highlightWords: ['Dépose ton CV', 'l’offre ciblée'],
        captureSrc: '/captures_clean/02_import_clean.jpg',
      },
      {
        id: 3,
        timecode: '00:09.2–00:10.9',
        start: 9.2,
        end: 10.9,
        duration: 1.7,
        title: 'Étape 2A · Mots-clés Repérés dans l’Offre',
        onScreenText: 'ÉTAPE 2 · MOTS-CLÉS DU RECRUTEUR · Compétences prioritaires ciblées',
        canvaNote: 'Zoom direct sur la partie de l’écran contenant les mots-clés stratégiques et tags de compétences',
        script: 'L’analyse repère les mots-clés',
        subtitle: 'L’analyse repère les mots-clés',
        highlightWords: ['mots-clés'],
        captureSrc: '/captures_clean/v_step2_mots_cles.jpg',
      },
      {
        id: 4,
        timecode: '00:10.9–00:12.5',
        start: 10.9,
        end: 12.5,
        duration: 1.6,
        title: 'Étape 2B · Valorisation ATS (92%) & Piliers',
        onScreenText: 'ÉTAPE 2 · VALORISATION ATS (92%) · Score et critères d’éligibilité',
        canvaNote: 'Boussole ATS montrant le score de 92% et les 4 piliers de validation algorithmique',
        script: 'et valorise tes compétences.',
        subtitle: 'et valorise tes compétences.',
        highlightWords: ['valorise tes compétences'],
        captureSrc: '/captures_clean/v_step2_adequation_ats.jpg',
      },
      {
        id: 5,
        timecode: '00:12.5–00:16.0',
        start: 12.5,
        end: 16.0,
        duration: 3.5,
        title: 'Résultat · Deux Livrables Distincts Prêts (Vue Dézoomée & Épurée)',
        onScreenText: 'RÉSULTAT · Deux livrables concrets prêts à l’envoi',
        canvaNote: 'Écran de téléchargement dézoomé à 88% sans surcharge, élément parasite masquant supprimé, interface aérée et lisible',
        script: 'Résultat : ton CV optimisé et ta lettre stratégique.',
        subtitle: 'Résultat : ton CV optimisé\net ta lettre stratégique.',
        highlightWords: ['CV optimisé', 'lettre stratégique'],
        captureSrc: '/captures_clean/09_export_clean.jpg',
      },
      {
        id: 6,
        timecode: '00:16.0–00:25.0',
        start: 16.0,
        end: 25.0,
        duration: 9.0,
        title: 'Logo Officiel & Appel à l’Action · jnbalign.com',
        onScreenText: 'ESSAIE MAINTENANT · jnbalign.com · LIEN EN BIO',
        canvaNote: 'Apparition du logo officiel dès la phrase « Essaie maintenant », maintenu 9s avec URL dorée et CTA',
        script: 'Essaie maintenant : lien en bio sur jnbalign.com !',
        subtitle: 'Essaie maintenant :\nlien en bio sur jnbalign.com !',
        highlightWords: ['Essaie maintenant', 'lien en bio', 'jnbalign.com'],
        captureSrc: '/jnb-align-logo.png',
      },
    ],
  },
  {
    id: 'video2',
    numericId: '2',
    badge: 'Vidéo 2 • Démonstration (30s) [Note visée : 9,8/10]',
    title: 'Voici comment optimiser ton CV en quelques étapes',
    tagline: 'Coordination absolue : STAR en 2 écrans successifs (Avant puis Après), 0 fait inventé et CTA 5.2s',
    duration: 30,
    mp4File: '/videos/video_2.mp4',
    audioFile: '/audio/video_2_demo_v7.mp3',
    objective: "Expliquer le parcours utilisateur, prouver la valeur avec un Avant/Après STAR en deux écrans successifs parfaitement lisibles et déclencher l'action.",
    strategy:
      "Coordination Voix-Image-Texte V10 : Démarrage direct avec la vidéo de l’appli en action (0-3.2s) ➔ Écran de dépôt CV/Offre (3.2-5.8s) ➔ Mots-clés repérés et grille de compétences (5.8-7.6s) ➔ Adéquation ATS 92% avec boussole et 4 piliers (7.6-9.2s) ➔ STAR Plan 1 Avant synchronisé sur « mission générique » (9.2-13.2s) ➔ STAR Plan 2 Après synchronisé sur « sans rien inventer » (13.2-17.2s) ➔ 2 Livrables dézoomés sans parasite (17.2-20.8s) ➔ Candidature prête dézoomée (20.8-23.15s) ➔ Écran final officiel Logo, URL & CTA dès « Essaie gratuitement » (23.15-30.0s).",
    caption:
      "Voici comment optimiser ton CV en quelques étapes avec JNB Align ! ✨\n\n1️⃣ Dépose ton CV et l'annonce cible en quelques secondes.\n2️⃣ L'outil analyse les compétences requises et valorise tes expériences réelles.\n3️⃣ Méthode STAR : une mission générique devient une réalisation concrète et valorisée, sans rien inventer !\n4️⃣ Repars avec tes deux documents prêts à l'envoi : ton CV optimisé et ta lettre stratégique.\n\n👉 Deux documents. Une candidature mieux préparée. Gratuitement sur jnbalign.com – lien en bio 🔗",
    hashtags: '#MethodSTAR #RechercheEmploi #ConseilsCV #JNBAlign #EntretienDembauche #Candidature #Recrutement #CVATS',
    scenes: [
      {
        id: 0,
        timecode: '00:00–00:03.2',
        start: 0,
        end: 3.2,
        duration: 3.2,
        title: 'Démonstration Directe · Application en Action',
        onScreenText: 'DÉMONSTRATION · Voici comment optimiser ton CV en quelques étapes',
        canvaNote: 'Démarrage direct avec la vidéo de l’application en cours d’utilisation',
        script: 'Voici comment optimiser ton CV en quelques étapes.',
        subtitle: 'Voici comment optimiser ton CV\nen quelques étapes.',
        highlightWords: ['optimiser ton CV', 'quelques étapes'],
        clipSrc: '/clips/v2_app_intro.mp4',
        captureSrc: '/captures_clean/01_accueil_clean.jpg',
      },
      {
        id: 1,
        timecode: '00:03.2–00:05.8',
        start: 3.2,
        end: 5.8,
        duration: 2.6,
        title: 'Étape 1 · Dépôt CV & Offre Dézoomé',
        onScreenText: 'ÉTAPE 1 · Dépose ton CV et l’offre en quelques secondes',
        canvaNote: 'Même écran d’importation mais dézoomé pour embrasser l’interface complète',
        script: 'Dépose ton CV et l’offre ciblée.',
        subtitle: 'Dépose ton CV\net l’offre d’emploi ciblée.',
        highlightWords: ['Dépose ton CV', 'l’offre ciblée'],
        captureSrc: '/captures_clean/02_import_clean.jpg',
      },
      {
        id: 2,
        timecode: '00:05.8–00:07.6',
        start: 5.8,
        end: 7.6,
        duration: 1.8,
        title: 'Étape 2A · Mots-clés Analysés & Grille',
        onScreenText: 'ÉTAPE 2 · MOTS-CLÉS DU RECRUTEUR · Analyse des compétences requises',
        canvaNote: 'Affichage prioritaire de la partie de l’écran avec la grille des mots-clés stratégiques',
        script: 'JNB Align analyse les mots-clés',
        subtitle: 'JNB Align analyse les mots-clés',
        highlightWords: ['mots-clés'],
        captureSrc: '/captures_clean/v_step2_mots_cles.jpg',
      },
      {
        id: 3,
        timecode: '00:07.6–00:09.2',
        start: 7.6,
        end: 9.2,
        duration: 1.6,
        title: 'Étape 2B · Adéquation ATS Maximale (92%)',
        onScreenText: 'ÉTAPE 2 · ADÉQUATION ATS (92%) · Boussole de compatibilité recruteur',
        canvaNote: 'Affichage de la jauge d’adéquation ATS 92% et de la scorecard des 4 piliers d’éligibilité',
        script: 'et l’adéquation ATS.',
        subtitle: 'et l’adéquation ATS.',
        highlightWords: ['adéquation ATS'],
        captureSrc: '/captures_clean/v_step2_adequation_ats.jpg',
      },
      {
        id: 4,
        timecode: '00:09.2–00:13.2',
        start: 9.2,
        end: 13.2,
        duration: 4.0,
        title: 'Méthode STAR · Plan 1 Avant (Mission Générique)',
        onScreenText: 'MÉTHODE STAR · PLAN 1 AVANT · Mission générique et vague',
        canvaNote: 'Écran dédié grand format montrant le texte d’origine flou et non chiffré',
        script: 'Regarde la méthode STAR : une mission générique devient une réalisation concrète,',
        subtitle: 'Regarde la méthode STAR :\nune mission générique...',
        highlightWords: ['méthode STAR', 'mission générique'],
        captureSrc: '/captures_clean/v2_star_plan1_avant.jpg',
      },
      {
        id: 5,
        timecode: '00:13.2–00:17.2',
        start: 13.2,
        end: 17.2,
        duration: 4.0,
        title: 'Méthode STAR · Plan 2 Après (Faits Réels Préservés)',
        onScreenText: 'MÉTHODE STAR · PLAN 2 APRÈS · Reformulation concrète sans rien inventer',
        canvaNote: 'Écran dédié avec badge officiel EXEMPLE ILLUSTRATIF et promesse déontologique',
        script: 'Même expérience, meilleure présentation, aucun fait inventé.',
        subtitle: 'Même expérience. Meilleure présentation.\nAucun fait inventé.',
        highlightWords: ['Meilleure présentation', 'Aucun fait inventé'],
        captureSrc: '/captures_clean/v2_star_plan2_apres.jpg',
      },
      {
        id: 6,
        timecode: '00:17.2–00:20.8',
        start: 17.2,
        end: 20.8,
        duration: 3.6,
        title: 'Étape 3 · Les Deux Livrables Distincts Prêts (Vue Dézoomée & Épurée)',
        onScreenText: 'ÉTAPE 3 · Tu obtiens ton CV optimisé et ta lettre stratégique',
        canvaNote: 'Écran de téléchargement dézoomé à 88% sans surcharge, élément parasite masquant supprimé, interface aérée',
        script: 'Tu obtiens ton CV optimisé et ta lettre stratégique.',
        subtitle: 'Tu obtiens ton CV optimisé\net ta lettre stratégique.',
        highlightWords: ['CV optimisé', 'lettre stratégique'],
        captureSrc: '/captures_clean/09_export_clean.jpg',
      },
      {
        id: 7,
        timecode: '00:20.8–00:23.15',
        start: 20.8,
        end: 23.15,
        duration: 2.35,
        title: 'Candidature Mieux Préparée & Prête (Vue Dézoomée)',
        onScreenText: 'CANDIDATURE PRÊTE · Deux documents pour une candidature réussie',
        canvaNote: 'Écran dézoomé et épuré de toute notification, centré sur le statut de validation du dossier',
        script: 'Deux documents pour une candidature mieux préparée.',
        subtitle: 'Deux documents concrets.\nUne candidature mieux préparée.',
        highlightWords: ['Deux documents', 'mieux préparée'],
        captureSrc: '/captures_clean/10_prete_clean.jpg',
      },
      {
        id: 8,
        timecode: '00:23.15–00:30.0',
        start: 23.15,
        end: 30.0,
        duration: 6.85,
        title: 'Logo Officiel & Appel à l’Action : jnbalign.com & Bio',
        onScreenText: 'VALORISATION DU PARCOURS · jnbalign.com · LIEN EN BIO',
        canvaNote: 'Apparition instantanée du grand logo officiel, de l’URL dorée 76px et du CTA dès la mention vocale "Essaie gratuitement..." (23.15s)',
        script: 'Essaie gratuitement : lien en bio !',
        subtitle: 'Essaie gratuitement :\nlien en bio !',
        highlightWords: ['jnbalign.com', 'Essaie gratuitement', 'lien en bio'],
        captureSrc: '/jnb-align-logo.png',
      },
    ],
  },
  {
    id: 'video3',
    numericId: '3',
    badge: 'Vidéo 3 • Lancement Officiel (30s) [Note visée : 9,8/10]',
    title: 'C’est officiel : JNB Align est lancé !',
    tagline: 'Coordination absolue : schéma Entrée/Sortie géant dédié, 2 livrables et CTA 5s',
    duration: 30,
    mp4File: '/videos/video_3.mp4',
    audioFile: '/audio/video_3_lancement_v7.mp3',
    objective: "Inaugurer la marque avec énergie, clarifier la logique Entrée/Sortie par un schéma dédié grand format et mobiliser les candidats.",
    strategy:
      "Coordination Voix-Image-Texte V10 : Logo pulse officiel (0-3.2s) ➔ Vidéo de l’appli en cours d’utilisation sur la mention copilote (3.2-7.2s) ➔ Dépôt CV/Offre en entrée (7.2-12.0s) ➔ Schéma géant Entrée ➔ Analyse ➔ Sortie (12.0-17.2s) ➔ 2 documents concrets (17.2-20.5s) ➔ Écran prestige final Logo + jnbalign.com + CTA dès « Découvre JNB Align » (20.5-30.0s).",
    caption:
      "C'est officiel : JNB Align est lancé ! 🚀\n\nLe nouvel outil pour adapter ton CV à chaque offre d'emploi sans dénaturer ton parcours ! Le principe est simple :\n\n📥 En entrée : dépose ton CV et l'offre visée.\n⚙️ Au cœur : l'analyse JNB Align rapproche les compétences clés.\n📤 En sortie : reçois deux documents personnalisés prêts à l'envoi (CV adapté + Lettre de motivation).\n\n👉 Essaie gratuitement sur jnbalign.com – lien en bio 🔗",
    hashtags: '#JNBAlign #LancementOfficiel #CopiloteEmploi #TechRH #CVATS #MethodSTAR #RechercheEmploi #Candidature',
    scenes: [
      {
        id: 0,
        timecode: '00:00–00:03.2',
        start: 0,
        end: 3.2,
        duration: 3.2,
        title: 'Logo Pulse Dynamique & Annonce Événement',
        onScreenText: 'ANNONCE OFFICIELLE · JNB ALIGN EST LANCÉ !',
        canvaNote: 'Apparition rythmée du logo JNB Align avec badge doré officiel',
        script: 'C’est officiel ! JNB Align est lancé.',
        subtitle: 'C’est officiel !\nJNB Align est lancé.',
        highlightWords: ['officiel', 'JNB Align est lancé'],
        captureSrc: '/jnb-align-logo.png',
      },
      {
        id: 1,
        timecode: '00:03.2–00:07.2',
        start: 3.2,
        end: 7.2,
        duration: 4.0,
        title: 'Le Copilote en Action · Démonstration Application',
        onScreenText: 'PROMESSE CANDIDAT · Adapter son CV sans travestir son parcours',
        canvaNote: 'Vidéo réelle d’utilisation de l’application illustrant le copilote en action',
        script: 'Le copilote pour adapter ton CV à chaque offre, sans travestir ton parcours.',
        subtitle: 'Le copilote pour adapter ton CV\nsans travestir ton parcours.',
        highlightWords: ['adapter ton CV', 'sans travestir'],
        clipSrc: '/clips/v3_app_copilote.mp4',
        captureSrc: '/captures_clean/v1_accueil_punchin.jpg',
      },
      {
        id: 2,
        timecode: '00:07.2–00:12.0',
        start: 7.2,
        end: 12.0,
        duration: 4.8,
        title: 'En Entrée : CV et Offre Visée',
        onScreenText: 'EN ENTRÉE · Dépose ton CV et l’offre d’emploi ciblée',
        canvaNote: 'Capture montrant le dépôt simultané des 2 éléments d’entrée',
        script: 'Le principe est simple : deux éléments en entrée, ton CV et l’offre visée.',
        subtitle: 'Deux éléments en entrée :\nton CV et l’offre visée.',
        highlightWords: ['Deux éléments en entrée', 'ton CV', 'l’offre visée'],
        captureSrc: '/captures_clean/02_import_clean.jpg',
      },
      {
        id: 3,
        timecode: '00:12.0–00:17.2',
        start: 12.0,
        end: 17.2,
        duration: 5.2,
        title: 'Schéma Géant Dédié : Entrée -> Analyse -> Sortie',
        onScreenText: 'SCHÉMA ENTRÉE ➔ ANALYSE ➔ SORTIE (CV + LETTRE)',
        canvaNote: 'Carte visuelle grand format explicative montrant le flux complet Entrée vers Sortie',
        script: 'Et deux documents en sortie, ton CV optimisé et ta lettre personnalisée prêts à l’envoi.',
        subtitle: 'Deux documents en sortie :\nton CV et ta lettre personnalisée.',
        highlightWords: ['Deux documents en sortie', 'CV optimisé', 'lettre personnalisée'],
        captureSrc: '/captures_clean/v3_schema_entree_sortie_geante.jpg',
      },
      {
        id: 4,
        timecode: '00:17.2–00:20.5',
        start: 17.2,
        end: 20.5,
        duration: 3.3,
        title: 'Deux Livrables Concrets Prêts à l’Envoi',
        onScreenText: 'LIVRABLES · Deux documents concrets valorisant tes compétences',
        canvaNote: 'Zoom sur les boutons d’export rapide PDF et Word sans barre URL',
        script: 'Deux documents, une candidature mieux préparée.',
        subtitle: 'Deux documents concrets.\nUne candidature mieux préparée.',
        highlightWords: ['Deux documents concrets', 'mieux préparée'],
        captureSrc: '/captures_clean/09_export_clean.jpg',
      },
      {
        id: 5,
        timecode: '00:20.5–00:30.0',
        start: 20.5,
        end: 30.0,
        duration: 9.5,
        title: 'Outro Prestige & Appel à l’Action : Logo JNB Align, jnbalign.com & Bio',
        onScreenText: 'LANCEMENT OFFICIEL · jnbalign.com · LIEN EN BIO',
        canvaNote: 'Apparition instantanée du grand logo officiel JNB Align, de l’URL jnbalign.com (76px or) et du CTA dès la mention vocale "Découvre JNB Align" (20.5s à 30.0s)',
        script: 'Découvre JNB Align : essaie gratuitement sur jnbalign point com, lien en bio !',
        subtitle: 'Découvre JNB Align :\nessaie gratuitement sur jnbalign.com !',
        highlightWords: ['Découvre JNB Align', 'jnbalign.com', 'lien en bio'],
        captureSrc: '/jnb-align-logo.png',
      },
    ],
  },
  {
    id: 'video_com',
    numericId: '4',
    badge: 'Vidéo Com • Tous Réseaux (30s) [WhatsApp, TikTok, Insta]',
    title: 'Ne laisse plus ton CV décider de ton avenir · Campagne Réseaux',
    tagline: 'Tableau 1 (Rejet ATS) ➔ Tableau 2 (Recruteuse & Piliers JNB Align) ➔ Outro CTA',
    duration: 30,
    mp4File: '/videos/video_com_multireseaux.mp4',
    audioFile: '/audio/video_com_recruteuse.mp3',
    objective: "Diffuser le message d'impact sur WhatsApp, TikTok, Instagram et LinkedIn : sensibiliser sur les rejets ATS silencieux et démontrer les 4 piliers de solution offerts par JNB Align.",
    strategy:
      "Script narratif officiel : Tableau 1 Candidat dépité avec notification de rejet ATS sur fond sonore triste (0-3.5s) ➔ Tableau 2 Recruteuse marchant au milieu des CV rejetés (« Ton CV est peut-être la raison... ») (3.5-7.3s) ➔ Logo Tech Avatar (« Mais avec JNB Align : ») (7.3-9.6s) ➔ Pilier 1 Optimisez votre CV pour les ATS (9.6-12.8s) ➔ Pilier 2 Valorisez compétences et expériences réelles (12.8-16.1s) ➔ Pilier 3 Lettre de motivation stratégique (16.1-19.6s) ➔ Pilier 4 Téléchargez gratuitement (19.6-22.5s) ➔ Recruteuse / Conscience (« Ne laisse plus ton CV décider de ton avenir ») (22.5-25.5s) ➔ Outro de marque « Teste JNB Align gratuitement dès maintenant » sur jnbalign.com (25.5-30s).",
    caption:
      "Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien... 🎯\n\nDes centaines de candidatures solides sont éliminées chaque jour par les filtres ATS sans jamais être lues par un recruteur humain.\n\nMais avec JNB Align :\n✅ Optimisez votre CV pour les ATS\n✅ Valorisez vos compétences et vos expériences réelles (Méthode STAR)\n✅ Créez une lettre de motivation stratégique\n✅ Téléchargez vos documents gratuitement\n\nNe laisse plus ton CV décider de ton avenir. Teste JNB Align dès maintenant !\n👉 Lien en bio : jnbalign.com (Accessible sur mobile, WhatsApp et ordinateur)",
    hashtags: '#JNBAlign #RechercheEmploi #OptimisationCV #ConseilRecrutement #CVATS #MethodSTAR #Candidature #RecrutementRH #Emploi',
    scenes: [
      {
        id: 0,
        timecode: '00:00–00:03.5',
        start: 0,
        end: 3.5,
        duration: 3.5,
        title: 'Tableau 1 · Rejet ATS Silencieux & Ambiance Défaitiste',
        onScreenText: 'TABLEAU 1 · UN PROFIL DE QUALITÉ REJETÉ PAR LES ROBOTS',
        canvaNote: 'Candidat dépité devant son écran d’ordinateur avec alerte de rejet automatique ATS sur musique de piano triste',
        script: 'Candidature rejetée par les algorithmes ATS...',
        subtitle: 'Un profil de qualité...\npourtant rejeté par les robots.',
        highlightWords: ['profil de qualité', 'rejeté par les robots'],
        captureSrc: '/assets_com/tableau1_candidat_rejete.jpg',
      },
      {
        id: 1,
        timecode: '00:03.5–00:07.3',
        start: 3.5,
        end: 7.3,
        duration: 3.8,
        title: 'Tableau 2 · La Recruteuse & Le Constat Sans Filtre',
        onScreenText: 'TABLEAU 2 · LA VÉRITÉ DES RECRUTEURS',
        canvaNote: 'Recruteuse marchant au milieu des CV rejetés et candidats désespérés, parlant face caméra',
        script: 'Ton CV est peut-être la raison pour laquelle tu ne décroches pas d’entretien.',
        subtitle: 'Ton CV est peut-être la raison\npour laquelle tu ne décroches pas d’entretien.',
        highlightWords: ['raison', 'tu ne décroches pas d’entretien'],
        captureSrc: '/assets_com/tableau2_recruteuse.jpg',
      },
      {
        id: 2,
        timecode: '00:07.3–00:09.6',
        start: 7.3,
        end: 9.6,
        duration: 2.3,
        title: 'La Solution · Mais avec JNB Align',
        onScreenText: 'LA SOLUTION · MAIS AVEC JNB ALIGN',
        canvaNote: 'Apparition du nouvel avatar tech officiel JNB Align Precision Engine avec transition sonore',
        script: 'Mais avec JNB Align :',
        subtitle: 'Mais avec JNB Align :',
        highlightWords: ['JNB Align'],
        captureSrc: '/assets_com/jnb_align_avatar.png',
      },
      {
        id: 3,
        timecode: '00:09.6–00:12.8',
        start: 9.6,
        end: 12.8,
        duration: 3.2,
        title: 'Pilier 1 · Optimisez votre CV pour les ATS',
        onScreenText: 'PILIER 1 · OPTIMISATION ATS (SCORE 92%)',
        canvaNote: 'Interface de la boussole ATS montrant le score de 92% et la conformité aux parseurs',
        script: 'Optimisez votre CV pour les ATS.',
        subtitle: 'Optimisez votre CV pour les ATS.',
        highlightWords: ['Optimisez votre CV', 'ATS'],
        captureSrc: '/captures_clean/v_step2_adequation_ats.jpg',
      },
      {
        id: 4,
        timecode: '00:12.8–00:16.1',
        start: 12.8,
        end: 16.1,
        duration: 3.3,
        title: 'Pilier 2 · Valorisez vos compétences et expériences',
        onScreenText: 'PILIER 2 · VALORISATION RÉELLE · MÉTHODE STAR',
        canvaNote: 'Écran de reformulation STAR concrète sans aucun fait inventé',
        script: 'Valorisez vos compétences et vos expériences.',
        subtitle: 'Valorisez vos compétences\net vos expériences.',
        highlightWords: ['Valorisez vos compétences', 'expériences'],
        captureSrc: '/captures_clean/v2_star_plan2_apres.jpg',
      },
      {
        id: 5,
        timecode: '00:16.1–00:19.6',
        start: 16.1,
        end: 19.6,
        duration: 3.5,
        title: 'Pilier 3 · Créez une lettre de motivation stratégique',
        onScreenText: 'PILIER 3 · LETTRE DE MOTIVATION STRATÉGIQUE',
        canvaNote: 'Aperçu dézoomé de la lettre stratégique structurée Vous / Moi / Nous',
        script: 'Créez une lettre de motivation stratégique.',
        subtitle: 'Créez une lettre de motivation\nstratégique.',
        highlightWords: ['lettre de motivation stratégique'],
        captureSrc: '/captures_clean/08_lettre_clean.jpg',
      },
      {
        id: 6,
        timecode: '00:19.6–00:22.5',
        start: 19.6,
        end: 22.5,
        duration: 2.9,
        title: 'Pilier 4 · Téléchargez vos documents gratuitement',
        onScreenText: 'PILIER 4 · DOCUMENTS PRÊTS EN PDF & WORD',
        canvaNote: 'Écran dézoomé et épuré avec les boutons de téléchargement immédiats PDF et Word',
        script: 'Téléchargez vos documents gratuitement.',
        subtitle: 'Téléchargez vos documents\ngratuitement.',
        highlightWords: ['Téléchargez vos documents gratuitement'],
        captureSrc: '/captures_clean/09_export_clean.jpg',
      },
      {
        id: 7,
        timecode: '00:22.5–00:25.5',
        start: 22.5,
        end: 25.5,
        duration: 3.0,
        title: 'Choc de Conscience · Reprends le Contrôle',
        onScreenText: 'REPRENDS LE CONTRÔLE DE TON AVENIR',
        canvaNote: 'Retour gros plan sur la recruteuse martelant la vérité au candidat',
        script: 'Ne laisse plus ton CV décider de ton avenir.',
        subtitle: 'Ne laisse plus ton CV\ndécider de ton avenir.',
        highlightWords: ['décider de ton avenir'],
        captureSrc: '/assets_com/tableau2_recruteuse.jpg',
      },
      {
        id: 8,
        timecode: '00:25.5–00:30.0',
        start: 25.5,
        end: 30.0,
        duration: 4.5,
        title: 'Appel à l’Action · Teste JNB Align Gratuitement',
        onScreenText: 'TESTE JNB ALIGN GRATUITEMENT DÈS MAINTENANT · jnbalign.com',
        canvaNote: 'Écran final de marque avec logo tech avatar, URL dorée géante 76px jnbalign.com et lien en bio',
        script: 'Teste JNB Align gratuitement dès maintenant.',
        subtitle: 'Teste JNB Align gratuitement\ndès maintenant.',
        highlightWords: ['Teste JNB Align', 'gratuitement dès maintenant', 'jnbalign.com'],
        captureSrc: '/assets_com/jnb_align_avatar.png',
      },
    ],
  },
];

export const TikTokVideoModal: React.FC<TikTokVideoModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<VideoTabId>('video1');
  const [viewMode, setViewMode] = useState<ViewMode>('mp4');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [activeRightTab, setActiveRightTab] = useState<'storyboard' | 'caption' | 'audit' | 'guide' | 'checklist'>('storyboard');

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const currentProject = OFFICIAL_VIDEOS.find((v) => v.id === activeTab) || OFFICIAL_VIDEOS[0];
  const totalDuration = currentProject.duration;

  // Recharger l'audio officiel et la vidéo quand on change d'onglet
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    teaserAudio.stopTrack();

    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    const audio = new Audio(currentProject.audioFile);
    audio.preload = 'auto';
    voiceAudioRef.current = audio;

    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.currentTime = 0;
    }

    return () => {
      audio.pause();
      voiceAudioRef.current = null;
    };
  }, [activeTab]);

  // Détermination de la scène active pour le simulateur
  const currentSceneIndex = currentProject.scenes.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );
  const activeScene =
    currentProject.scenes[currentSceneIndex >= 0 ? currentSceneIndex : currentProject.scenes.length - 1];

  // Boucle de mise à jour temporelle
  useEffect(() => {
    if (isPlaying) {
      const updateTimer = (timestamp: number) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;

        setCurrentTime((prev) => {
          // Si on est en mode MP4 natif, la vidéo est la source de vérité
          if (viewMode === 'mp4' && videoPlayerRef.current && !videoPlayerRef.current.paused) {
            const vidSec = videoPlayerRef.current.currentTime;
            if (vidSec >= totalDuration) {
              setIsPlaying(false);
              return totalDuration;
            }
            return vidSec;
          }

          // Si on est en mode simulateur, l'audio vocal est la source de vérité
          if (viewMode === 'simulator' && voiceAudioRef.current && !voiceAudioRef.current.paused && !voiceAudioRef.current.ended) {
            const audioSec = voiceAudioRef.current.currentTime;
            if (audioSec >= totalDuration) {
              setIsPlaying(false);
              teaserAudio.stopTrack();
              return totalDuration;
            }
            return audioSec;
          }

          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            if (voiceAudioRef.current) voiceAudioRef.current.pause();
            if (videoPlayerRef.current) videoPlayerRef.current.pause();
            teaserAudio.stopTrack();
            return totalDuration;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(updateTimer);
      };

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      lastTimestampRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration, viewMode]);

  // Lecture / Pause synchronisée
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (viewMode === 'mp4' && videoPlayerRef.current) {
        videoPlayerRef.current.pause();
      }
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
      teaserAudio.stopTrack();
    } else {
      let startTime = currentTime;
      if (startTime >= totalDuration - 0.2) {
        startTime = 0;
        setCurrentTime(0);
      }

      setIsPlaying(true);

      if (viewMode === 'mp4' && videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = startTime;
        videoPlayerRef.current.play().catch(() => {});
      } else {
        // Mode simulateur
        if (!isVoiceMuted && voiceAudioRef.current) {
          voiceAudioRef.current.currentTime = startTime;
          voiceAudioRef.current.play().catch(() => {});
        }
        if (!isMusicMuted) {
          teaserAudio.playTrack(startTime);
        }
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    teaserAudio.stopTrack();
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.currentTime = 0;
    }
  };

  const handleSeek = (targetSec: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetSec));
    setCurrentTime(clamped);

    if (viewMode === 'mp4' && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = clamped;
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = clamped;
    }

    if (isPlaying) {
      if (viewMode === 'mp4' && videoPlayerRef.current) {
        videoPlayerRef.current.play().catch(() => {});
      } else {
        if (!isMusicMuted) teaserAudio.playTrack(clamped);
        if (!isVoiceMuted && voiceAudioRef.current) {
          voiceAudioRef.current.play().catch(() => {});
        }
      }
    }
  };

  const handleToggleVoice = () => {
    const newMuted = !isVoiceMuted;
    setIsVoiceMuted(newMuted);
    if (voiceAudioRef.current) {
      if (newMuted) {
        voiceAudioRef.current.pause();
      } else if (isPlaying) {
        voiceAudioRef.current.currentTime = currentTime;
        voiceAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleToggleMusic = () => {
    const newMuted = !isMusicMuted;
    setIsMusicMuted(newMuted);
    teaserAudio.setMuted(newMuted);
    if (!newMuted && isPlaying) {
      teaserAudio.playTrack(currentTime);
    }
  };

  const handleCopyCaption = () => {
    const fullText = `${currentProject.caption}\n\n${currentProject.hashtags}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2200);
  };

  const handleCopyScript = () => {
    const scriptText = currentProject.scenes
      .filter((s) => s.script)
      .map((s) => `[${s.timecode}] ${s.script}`)
      .join('\n\n');
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in font-sans">
      <div className="relative w-full max-w-6xl bg-[#080D20] text-slate-100 rounded-3xl border border-amber-400/40 shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* TOP BAR / BRAND HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#0C152E]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/40 p-1.5 flex items-center justify-center shadow-inner">
              <img src="/jnb-align-logo.svg" alt="JNB Align" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase font-editorial">
                  Studio Vidéos TikTok JNB Align
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest font-mono">
                  Campagne J-7
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Canva & CapCut Certifié
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Directeur de la communication • 3 Vidéos Officielles 9:16 (1080×1920) avec captures réelles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              teaserAudio.stopTrack();
              if (voiceAudioRef.current) voiceAudioRef.current.pause();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer le studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 VIDEO TABS SELECTOR */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#060917] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {OFFICIAL_VIDEOS.map((vid) => {
              const isSelected = vid.id === activeTab;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveTab(vid.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-102'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Film className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{vid.badge}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-black/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {vid.duration}s
                  </span>
                </button>
              );
            })}
          </div>

          {/* MODE TOGGLE: MP4 NATIVE VS INTERACTIVE SIMULATOR */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setViewMode('mp4');
                setIsPlaying(false);
                teaserAudio.stopTrack();
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'mp4'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vidéo MP4 1080p</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('simulator');
                setIsPlaying(false);
                if (videoPlayerRef.current) videoPlayerRef.current.pause();
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'simulator'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Simulateur Canva</span>
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (5 Cols Player / 7 Cols Storyboard & Guide) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: 9:16 VERTICAL VIDEO PLAYER (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-3">
            {/* PHONE BEZEL MOCKUP */}
            <div className="relative w-full max-w-[290px] aspect-[9/16] rounded-[38px] bg-black p-2.5 shadow-2xl shadow-black/80 ring-1 ring-slate-800 border-2 border-slate-700/60 overflow-hidden">
              {/* Phone Dynamic Island / Speaker Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/90 rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 mr-2" />
                <div className="w-8 h-1 rounded-full bg-slate-800" />
              </div>

              {/* VIDEO SCREEN INNER */}
              <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[#080D20] flex flex-col items-center justify-center select-none text-center">
                {/* 1. NATIVE MP4 VIDEO MODE */}
                {viewMode === 'mp4' ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoPlayerRef}
                      src={currentProject.mp4File}
                      playsInline
                      className="w-full h-full object-cover"
                      onEnded={() => setIsPlaying(false)}
                      onClick={handleTogglePlay}
                    />

                    {!isPlaying && (
                      <div
                        onClick={handleTogglePlay}
                        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/35"
                      >
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-500/40 transform hover:scale-110 active:scale-95 transition-transform">
                          <Play className="w-8 h-8 fill-current ml-1" />
                        </div>
                        <span className="text-xs font-bold text-white mt-3 bg-black/70 px-3 py-1 rounded-full border border-amber-400/30">
                          Lire la vidéo MP4 1080p
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. CANVA SIMULATOR MODE WITH REAL RECORDING CLIPS & INTERFACE */
                  <div className="relative w-full h-full flex flex-col items-center justify-between p-3 overflow-hidden">
                    {/* Background Visual Layer */}
                    <div className="absolute inset-0 z-0">
                      {activeScene.clipSrc ? (
                        <video
                          key={activeScene.clipSrc}
                          src={activeScene.clipSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover opacity-90 scale-102 transition-transform duration-700"
                        />
                      ) : activeScene.captureSrc ? (
                        <img
                          src={activeScene.captureSrc}
                          alt="Capture"
                          className="w-full h-full object-cover opacity-90"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#080D20] via-[#102C63] to-[#080D20] flex items-center justify-center">
                          <div className="w-28 h-28 rounded-full bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center animate-pulse">
                            <img src="/jnb-align-logo.svg" alt="Logo" className="w-20 h-20 object-contain" />
                          </div>
                        </div>
                      )}
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/70 pointer-events-none" />
                    </div>

                    {/* Top Branding Header */}
                    <div className="relative z-10 w-full pt-4 flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/30">
                        <img src="/jnb-align-logo.svg" alt="Logo" className="w-4 h-4 object-contain" />
                        <span className="text-[10px] font-black tracking-wider text-white">JNB ALIGN</span>
                      </div>
                      <span className="text-[9.5px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40">
                        {currentProject.badge}
                      </span>
                    </div>

                    {/* Dynamic Text Banner (Canva Style Montserrat) */}
                    <div className="relative z-10 my-auto px-2 max-w-[94%]">
                      <div className="inline-block bg-black/85 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-amber-400/50 shadow-xl shadow-black/80">
                        <p className="text-xs sm:text-sm font-black text-white leading-tight drop-shadow-md">
                          {activeScene.onScreenText}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Dynamic Subtitle - Rehaussé de >15% hors de la TikTok Safe Zone */}
                    <div className="relative z-10 w-full pb-14 text-left px-1">
                      <div className="bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-400/50 shadow-md">
                        <p className="text-[10.5px] font-bold text-white leading-snug">
                          {activeScene.subtitle}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-300 mt-1 px-1 font-mono">
                        <span className="text-amber-300 font-bold">👉 jnbalign.com</span>
                        <span className="text-emerald-400 font-bold">100% GRATUIT</span>
                      </div>
                    </div>

                    {/* TikTok Action Icons on Right Side */}
                    <div className="absolute right-2 bottom-14 z-20 flex flex-col items-center gap-3 text-white/90">
                      <div className="w-8 h-8 rounded-full border border-white/60 p-0.5 bg-black overflow-hidden shadow">
                        <img src="/jnb-align-logo.svg" alt="Avatar" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col items-center">
                        <Heart className="w-5 h-5 text-white drop-shadow" />
                        <span className="text-[9px] font-bold">14.8K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <MessageCircle className="w-5 h-5 text-white drop-shadow" />
                        <span className="text-[9px] font-bold">428</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Bookmark className="w-5 h-5 text-white drop-shadow" />
                        <span className="text-[9px] font-bold">3.2K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Share2 className="w-5 h-5 text-white drop-shadow" />
                        <span className="text-[9px] font-bold">2.4K</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-amber-400/60 p-1 flex items-center justify-center animate-spin" style={{ animationDuration: '4s' }}>
                        <Music className="w-3.5 h-3.5 text-amber-300" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PLAYER CONTROLS & TIMELINE */}
            <div className="w-full max-w-[290px] p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              {/* Progress Scrub Bar */}
              <div className="space-y-1">
                <div
                  className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    handleSeek(pos * totalDuration);
                  }}
                  title="Cliquer pour naviguer dans la vidéo"
                >
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 transition-all duration-75"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-amber-300 font-bold truncate max-w-[170px]">
                    {activeScene.title}
                  </span>
                  <span>
                    {currentTime.toFixed(1)}s / {totalDuration}s
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-98 transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Lire la Vidéo'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Recommencer depuis le début"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Voix Off Toggle */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                    !isVoiceMuted
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={!isVoiceMuted ? 'Voix off active' : 'Voix coupée'}
                >
                  {!isVoiceMuted ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
                </button>

                {/* Musique Beat Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMusic}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                    !isMusicMuted
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title={!isMusicMuted ? 'Beat 122 BPM actif' : 'Beat coupé'}
                >
                  <Music className={`w-4 h-4 ${!isMusicMuted ? 'text-pink-400' : 'text-slate-500'}`} />
                </button>
              </div>

              {/* DIRECT DOWNLOAD BUTTONS */}
              <div className="pt-1 flex flex-col gap-1.5">
                <a
                  href={`/api/download-video/${currentProject.numericId}`}
                  download
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                  title="Vidéo MP4 1080x1920 complète avec Voix Off Studio + Musique Teaser Mixée sur toute la durée"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Télécharger la Vidéo MP4 (1080p • Voix + Musique)</span>
                </a>

                <a
                  href={currentProject.audioFile}
                  download
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  title="Piste vocale studio seule ('Fenrir') au format MP3"
                >
                  <Download className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Télécharger la Voix Off Studio (MP3)</span>
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STORYBOARD, GUIDE CANVA, CAPTION, AUDIT & CHECKLIST (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 text-left">
            {/* SUB-TABS SELECTOR */}
            <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveRightTab('storyboard')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'storyboard'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Découpage Seconde par Seconde</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('caption')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'caption'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Légende & Hashtags</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('audit')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'audit'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Recommandations Audit (Nouveau)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('guide')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'guide'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Guide Canva & CapCut</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('checklist')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeRightTab === 'checklist'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Checklist Qualité</span>
              </button>
            </div>

            {/* TAB CONTENT 1: STORYBOARD SECONDE PAR SECONDE */}
            {activeRightTab === 'storyboard' && (
              <div className="space-y-3">
                {/* Header card of active video */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C1A3F] to-[#070E24] border border-amber-400/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-widest font-mono">
                      {currentProject.badge} • Durée : {currentProject.duration} secondes
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      {copiedScript ? '✓ Script Copié' : 'Copier Script Voix Off'}
                    </button>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {currentProject.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Objectif :</strong> {currentProject.objective}
                  </p>
                </div>

                {/* Scene rows */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {currentProject.scenes.map((scene, idx) => {
                    const isCurrent = activeScene.id === scene.id;
                    return (
                      <div
                        key={scene.id}
                        onClick={() => handleSeek(scene.start)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-400/10 border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                                isCurrent ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              0{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {scene.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300 font-semibold">
                            {scene.timecode} ({scene.duration}s)
                          </span>
                        </div>

                        <div className="pl-7 space-y-1 text-xs">
                          <div className="text-slate-200">
                            <span className="text-slate-400 font-semibold">Texte écran : </span>
                            <strong className="text-amber-300">« {scene.onScreenText} »</strong>
                          </div>

                          {scene.script && (
                            <p className="text-slate-300 italic leading-relaxed">
                              <span className="text-slate-400 not-italic">Voix off : </span>
                              « {scene.script} »
                            </p>
                          )}

                          <div className="text-[10.5px] text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9.5px]">
                              Canva : {scene.canvaNote}
                            </span>
                            {scene.clipSrc && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9.5px]">
                                Clip vidéo réel extrait
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: PUBLICATION CAPTION & HASHTAGS */}
            {activeRightTab === 'caption' && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                    <span>Légende Optimisée TikTok (Recommandée J-7)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCaption ? 'Copié !' : 'Copier la Légende & Hashtags'}</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-sans whitespace-pre-line leading-relaxed">
                  {currentProject.caption}
                  {'\n\n'}
                  <span className="text-amber-400 font-mono text-xs font-semibold">
                    {currentProject.hashtags}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Conseil Algorithme TikTok :</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-relaxed">
                    Épinglez la vidéo de lancement officiel (Vidéo 3) tout en haut de votre profil dès le Jour J. Répondez aux 10 premiers commentaires dans les 30 minutes suivant la publication pour doper la diffusion algorithmique.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUDIT TECHNIQUE & ÉDITORIAL V7 */}
            {activeRightTab === 'audit' && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Dossier de Corrections Techniques V7 Appliqué (100 % Conforme)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    Note visée : 9,8/10
                  </span>
                </div>

                <div className="space-y-3 text-slate-300 leading-relaxed max-h-[380px] overflow-y-auto pr-1">
                  {/* Ligne Directrice */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-blue-500/10 to-transparent border border-emerald-500/30">
                    <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest block mb-1">
                      Conformité Totale au Dossier Monteur Vidéo V7
                    </span>
                    <div className="flex items-center gap-2 font-bold text-white text-xs">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950">Accroche Directe &lt; 2s</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500 text-white">Démonstration & Preuve STAR</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950">Outro Stabilisée 4.5–5.5s</span>
                    </div>
                  </div>

                  {/* Priorités de Production V7 */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                    <strong className="text-white block text-xs">Corrections spécifiques par vidéo :</strong>
                    <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-300">
                      <li>
                        <strong className="text-amber-400">Vidéo 1 (Accroche 25s) :</strong> Carte question géante lisible en 1 seconde (« Ton CV est-il vraiment adapté à l'offre que tu vises ? »), identification sobre de la marque (2.5–5.5s), captures épurées sans barre URL (largeur utile 88%), 2 documents finaux bien distincts, outro stabilisée 4,5s avec jnbalign.com en or 76px.
                      </li>
                      <li>
                        <strong className="text-emerald-400">Vidéo 2 (Démonstration 30s) :</strong> Démarrage direct démarche produit (« Voici comment optimiser ton CV en quelques étapes »), suppression des chiffres non sourcés, décomposition STAR en deux écrans successifs (Plan 1 Avant flou puis Plan 2 Après reformulé avec label certifié « Exemple illustratif • Faits réels préservés » et la promesse « Même expérience. Meilleure présentation. Aucun fait inventé »), outro stabilisée 5,5s.
                      </li>
                      <li>
                        <strong className="text-sky-400">Vidéo 3 (Lancement 30s) :</strong> Logo pulse ultra-rapide (1,5s max) + annonce événementielle immédiate avec promesse candidat, suppression de la liste monotone de fonctionnalités, carte schéma géant dédié ENTRÉE (CV + Offre) ➔ ANALYSE ➔ SORTIE (CV + Lettre) différenciée de la vidéo 2, outro stabilisée 5,5s avec URL jnbalign.com.
                      </li>
                    </ul>
                  </div>

                  {/* Tableau des Formulations Vigilantes */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <strong className="text-amber-300 block text-xs">Vigilance sur les Promesses & Formulations RH (Vérification Stricte) :</strong>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10.5px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-left">
                            <th className="pb-1 pr-2">Formulation à risque</th>
                            <th className="pb-1 text-emerald-400">Formulation adoptée (Conforme V7)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          <tr>
                            <td className="py-1 pr-2 text-rose-300 line-through">« 100 % compatible ATS »</td>
                            <td className="py-1 text-emerald-300">« Conçu pour améliorer la compatibilité avec les critères ATS »</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-rose-300 line-through">« Chiffres arbitraires (+45%, 3500 leads) »</td>
                            <td className="py-1 text-emerald-300">« EXEMPLE ILLUSTRATIF : Même expérience, meilleure présentation, aucun fait inventé »</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-rose-300 line-through">« Zéro hallucination garantie »</td>
                            <td className="py-1 text-emerald-300">« Vos expériences réelles sont préservées en toute fidélité »</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-rose-300 line-through">« Score passage ATS 96% certifié »</td>
                            <td className="py-1 text-emerald-300">« Score d'analyse indicatif » sans revendication de certification</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommandations Transversales */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <strong className="text-white block text-xs">Habillage, Audio & Safe Zones TikTok :</strong>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                      <li>
                        <strong>Zéro Clipping Audio :</strong> Chaîne de mastering broadcast avec True Peak Limiter (alimiter à -1.5 dBFS) éliminant 100% des saturations et distorsions.
                      </li>
                      <li>
                        <strong>Safe Zones TikTok 9:16 :</strong> 150 px haut, 270 px bas et 120 px droite rigoureusement préservés.
                      </li>
                      <li>
                        <strong>Sous-titres :</strong> Centrés à mi-hauteur, max 2 lignes, synchronisés mot par mot sans émojis cassés.
                      </li>
                    </ul>
                  </div>

                  {/* Ordre de Diffusion Recommandé */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <strong className="text-white block text-xs">Ordre de diffusion recommandé :</strong>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] pt-1">
                      <div className="p-1.5 rounded bg-slate-900 border border-amber-400/30">
                        <span className="font-bold text-amber-300 block">J-7</span>
                        <span className="text-white">Vidéo 1 · Accroche</span>
                        <span className="text-[9.5px] text-slate-400 block">Faire émerger le problème</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900 border border-emerald-400/30">
                        <span className="font-bold text-emerald-300 block">J-5</span>
                        <span className="text-white">Vidéo 2 · Démo</span>
                        <span className="text-[9.5px] text-slate-400 block">Expliquer concrètement</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900 border border-blue-400/30">
                        <span className="font-bold text-blue-300 block">J-3 à J0</span>
                        <span className="text-white">Vidéo 3 · Lancement</span>
                        <span className="text-[9.5px] text-slate-400 block">Annoncer et convertir</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: GUIDE DE MONTAGE CANVA & CAPCUT */}
            {activeRightTab === 'guide' && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Guide de Montage Officiel Canva & CapCut</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Format 9:16 • 1080×1920
                  </span>
                </div>

                <div className="space-y-2.5 text-slate-300 leading-relaxed max-h-[360px] overflow-y-auto pr-1">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <strong className="text-amber-300 block mb-1">1. Format & Palette de Marque</strong>
                    <p className="text-[11.5px]">
                      Créer un projet Canva « Vidéo mobile 1080 × 1920 px (30 FPS) ». Appliquer les codes couleurs :
                      <span className="text-amber-300 font-mono ml-1">#080D20 (Bleu nuit)</span>,{' '}
                      <span className="text-blue-400 font-mono">#102C63 (Bleu profond)</span>,{' '}
                      <span className="text-sky-400 font-mono">#167DE5 (Bleu électrique)</span>,{' '}
                      <span className="text-amber-400 font-mono">#F6C94D (Or signature)</span>,{' '}
                      <span className="text-emerald-400 font-mono">#37CDA3 (Vert validation)</span>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <strong className="text-amber-300 block mb-1">2. Ordre de Montage Recommandé</strong>
                    <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-300">
                      <li>Créer une page Canva par séquence en respectant scrupuleusement les timecodes.</li>
                      <li>
                        <strong>Ajouter d’abord la voix off</strong> téléchargée ci-contre, puis caler les découpes d’images et de captures exactement sur le texte.
                      </li>
                      <li>Intégrer les captures réelles dans un cadre smartphone vertical sans les déformer.</li>
                      <li>Ajouter les sous-titres : police <strong>Montserrat</strong> blanc avec mots-clés dorés.</li>
                      <li>Terminer chaque projet par l'écran final identique : Logo officiel + 100% Gratuit + <code>jnbalign.com</code>.</li>
                    </ol>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <strong className="text-amber-300 block mb-1">3. Calibrage Audio & Mixage</strong>
                    <p className="text-[11.5px]">
                      Placer la voix off au premier plan (prioritaire, volume à 100% / -4 dB). Baisser la musique instrumentale dynamique sous la voix à <strong>10–18 %</strong>, puis la faire remonter en fondu sur les 3 dernières secondes de chaque vidéo pour dynamiser l'appel à l'action.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: CHECKLIST CONTRÔLE QUALITÉ */}
            {activeRightTab === 'checklist' && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Checklist Contrôle Qualité & Éthique RH</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                    Conforme Directive Lancement
                  </span>
                </div>

                <div className="space-y-2 text-slate-300 leading-relaxed max-h-[360px] overflow-y-auto pr-1">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11.5px]">Protection des données personnelles :</strong>
                      <span className="text-[11px] text-slate-400">
                        Tous les noms, adresses, emails et téléphones personnels visibles sur les CV réels sont anonymisés ou floutés.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11.5px]">Transparence sur les scores ATS :</strong>
                      <span className="text-[11px] text-slate-400">
                        Le score de 92% ou 96% est toujours présenté comme un résultat d'exemple pour ce test précis, jamais comme une garantie absolue d'embauche.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11.5px]">Zone de sécurité TikTok :</strong>
                      <span className="text-[11px] text-slate-400">
                        Les textes et l'adresse <code>jnbalign.com</code> sont centrés pour éviter d'être masqués par les boutons TikTok (like, com, partage à droite) et la description en bas.
                      </span>
                    </div>
                  </div>

                  {/* V3 Brief Post-Production Points */}
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-300 block text-[11.5px]">Safe Zones TikTok & Sous-titres Karaoké Mi-Hauteur :</strong>
                      <span className="text-[11px] text-slate-300">
                        Top 150 px, Bottom 270 px et Marge droite 120 px 100% vides. Sous-titres positionnés au centre de l'écran (y=1000 px, 48% depuis le bas), 2 à 4 mots max par bloc, animation dynamique karaoké et orthographe stricte <strong>« JNB Align »</strong>.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-300 block text-[11.5px]">Vidéo 1 Démo (23s) · Bug API Coupé & Zooms 135% :</strong>
                      <span className="text-[11px] text-slate-300">
                        Notification rouge d'erreur API supprimée au montage. Hook percutant à 0:00 (« Ton CV se fait recaler en 5 secondes ? Fais ça. »), chargement accéléré à 250%, zooms dynamiques (135%) sur le dépôt et les 2 livrables, CTA avec flèche vers la bio.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-300 block text-[11.5px]">Vidéo 2 Bénéfice (21.5s) · Accroche Douleur & STAR Avant/Après :</strong>
                      <span className="text-[11px] text-slate-300">
                        Logo institutionnel retiré en ouverture : démarrage direct sur « Marre de postuler dans le vide ? ». Explication des filtres ATS, fiche comparative concrète STAR Avant / Après chiffrée (Score 92%), vignette logo sobre &lt; 1s.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-teal-500/10 border border-teal-500/30">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-teal-300 block text-[11.5px]">Vidéo 3 Looping (18s) · Vert Fluo (#22C55E) & Boucle Infinie :</strong>
                      <span className="text-[11px] text-slate-300">
                        Zéro écran noir ni rupture de rythme : départ direct sur la question-problème. Encadré vert fluo (#22C55E) sur le score 92%, boucle infinie TikTok parfaite avec la chute « …et voilà pourquoi… » se rebouclant naturellement sur l'accroche.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/30">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-300 block text-[11.5px]">Sound Design & Mixage Broadcast :</strong>
                      <span className="text-[11px] text-slate-300">
                        Voix studio calibrée à -3 dB (présence 3 kHz), musique instrumentale duckée à -22 dB, SFX discrets (pop au clic, whoosh rapide aux transitions, carillon ding sur le score).
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block text-[11.5px]">Fichiers MP4 1080p Prêts au Téléchargement :</strong>
                      <span className="text-[11px] text-slate-400">
                        Téléchargements complets disponibles : Vidéo 1 (23s), Vidéo 2 (21.5s), Vidéo 3 (18s). Tous les fichiers incluent l'image recadrée, la voix off studio et la bande-son masterisée.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
