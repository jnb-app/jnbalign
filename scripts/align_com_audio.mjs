import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

async function main() {
  const audioBytes = fs.readFileSync('public/audio/video_com_recruteuse.mp3');
  const base64Audio = audioBytes.toString('base64');

  const prompt = `Voici un enregistrement vocal en français pour une vidéo publicitaire.
Voici le texte prononcé :
"Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien. Mais avec JNB Align : Optimisez votre CV pour les ATS. Valorisez vos compétences et vos expériences. Créez une lettre de motivation stratégique. Téléchargez vos documents gratuitement. Ne laisse plus ton CV décider de ton avenir. Teste JNB Align gratuitement dès maintenant."

Donne-moi avec une précision absolue au dixième de seconde (start et end en secondes) le découpage pour chacune de ces phrases dans l'audio :
1. "Ton CV est peut-être la raison pour laquelle tu ne décroches pas d'entretien."
2. "Mais avec JNB Align :"
3. "Optimisez votre CV pour les ATS."
4. "Valorisez vos compétences et vos expériences."
5. "Créez une lettre de motivation stratégique."
6. "Téléchargez vos documents gratuitement."
7. "Ne laisse plus ton CV décider de ton avenir."
8. "Teste JNB Align gratuitement dès maintenant."

Réponds UNIQUEMENT sous forme d'un tableau JSON valide d'objets avec :
[
  { "id": 1, "text": "...", "start": 0.0, "end": 0.0 },
  ...
]`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Audio,
              mimeType: 'audio/mp3',
            },
          },
        ],
      },
    ],
  });

  console.log(response.text);
}

main().catch(console.error);
