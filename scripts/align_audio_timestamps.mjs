import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key available");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const VIDEOS = [
  {
    id: 'video_1',
    file: 'public/audio/video_1_accroche_v7.mp3',
    transcript: "Ton CV est-il vraiment adapté à l'offre que tu vises ? JNB Align t'aide à l'optimiser gratuitement, sans inventer ton parcours. Dépose ton CV et l'offre ciblée. L'analyse repère les mots-clés et valorise tes compétences. Résultat : ton CV optimisé et ta lettre stratégique. Essaie maintenant : lien en bio sur jnbalign point com !"
  },
  {
    id: 'video_2',
    file: 'public/audio/video_2_demo_v7.mp3',
    transcript: "Voici comment optimiser ton CV en quelques étapes. Dépose ton CV et l'offre ciblée. JNB Align analyse les mots-clés et l'adéquation ATS. Regarde la méthode STAR : une mission générique devient une réalisation concrète. Même expérience, meilleure présentation, aucun fait inventé. Tu obtiens ton CV optimisé et ta lettre stratégique. Deux documents pour une candidature mieux préparée. Essaie gratuitement : lien en bio !"
  },
  {
    id: 'video_3',
    file: 'public/audio/video_3_lancement_v7.mp3',
    transcript: "C'est officiel ! JNB Align est lancé. Le copilote pour adapter ton CV à chaque offre, sans travestir ton parcours. Le principe est simple : deux éléments en entrée, ton CV et l'offre visée. Et deux documents en sortie, ton CV optimisé et ta lettre personnalisée prêts à l'envoi. Deux documents, une candidature mieux préparée. Découvre JNB Align : essaie gratuitement sur jnbalign point com, lien en bio !"
  }
];

async function align() {
  for (const v of VIDEOS) {
    console.log(`\nAnalyzing ${v.id}...`);
    const audioBytes = fs.readFileSync(v.file);
    const base64Audio = audioBytes.toString('base64');

    const prompt = `Voici l'enregistrement audio et sa transcription exacte :
"${v.transcript}"

Analyse l'audio et donne-moi avec une précision chirurgicale (au dixième de seconde) l'horodatage précis (start_time et end_time en secondes) pour chaque phrase/proposition prononcée par la voix off.
Réponds UNIQUEMENT sous forme d'un tableau JSON au format :
[
  {
    "start": 0.0,
    "end": 2.5,
    "spoken_text": "...",
    "topic": "...",
    "best_visual": "image/card name",
    "on_screen_text": "..."
  }
]`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/mp3',
                  data: base64Audio
                }
              },
              { text: prompt }
            ]
          }
        ]
      });

      const text = response.text || '';
      console.log(`Result for ${v.id}:`);
      console.log(text);
      fs.writeFileSync(`scripts/timing_${v.id}.json`, text);
    } catch (e) {
      console.error(`Error for ${v.id}:`, e);
    }
  }
}

align();
