import os
import subprocess
from gtts import gTTS

print("🎙️ Génération des 3 pistes vocales studio dynamiques selon le brief V3...")

scripts = [
    {
        "id": "video_1_accroche", # Démo / Tutoriel (actuelle Vidéo 1 dans le brief)
        "filename": "public/audio/video_1_demo_tuto.mp3",
        "text": "Arrête d'envoyer le même CV partout. Regarde comment l'aligner en 30 secondes chrono. Dépose ton CV et l'offre ciblée dans JNB Align. L'analyse repère les points clés et valorise tes réussites avec la méthode STAR. Tes deux documents sont prêts : un CV optimisé et une lettre stratégique. Lien en bio pour tester ton score gratuitement !",
        "tempo": 1.12,
        "target_dur": 23.5
    },
    {
        "id": "video_2_branding", # Annonce / Bénéfice candidat (actuelle Vidéo 2 dans le brief)
        "filename": "public/audio/video_2_benefice.mp3",
        "text": "Tu n'obtiens aucun entretien ? C'est sûrement que ton CV ne passe pas les filtres ATS. Avec JNB Align, chaque ligne de ton CV s'adapte à l'offre ciblée. La méthode STAR transforme tes expériences en résultats concrets et chiffrés. Repars avec un CV et une lettre stratégiques. Fais le test sur ton CV, lien en bio !",
        "tempo": 1.10,
        "target_dur": 21.0
    },
    {
        "id": "video_3_hook_loop", # Hook fort & Looping TikTok (actuelle Vidéo 3 dans le brief)
        "filename": "public/audio/video_3_looping.mp3",
        "text": "Ton CV est-il vraiment adapté à l'offre ? Dépose ton CV et l'offre visée dans JNB Align. En quelques secondes, le copilote surligne les compétences clés et booste ton score. Tu obtiens deux documents sur-mesure prêts pour décrocher l'entretien. Et voilà pourquoi...",
        "tempo": 1.10,
        "target_dur": 18.5
    }
]

for s in scripts:
    raw_file = f"/tmp/{s['id']}_raw.mp3"
    tts = gTTS(text=s["text"], lang="fr", tld="fr")
    tts.save(raw_file)
    
    out_file = s["filename"]
    # Broadcast audio mastering: tempo boost, highpass filter, vocal presence boost, studio compressor
    cmd = [
        "ffmpeg", "-y", "-i", raw_file,
        "-af", f"atempo={s['tempo']},highpass=f=80,equalizer=f=3000:width_type=q:width=1.5:g=3.5,acompressor=threshold=-16dB:ratio=3.5:attack=5:release=50",
        "-c:a", "libmp3lame", "-b:a", "192k",
        out_file
    ]
    subprocess.run(cmd, check=True)
    
    # Check duration
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", out_file
    ], capture_output=True, text=True, check=True)
    dur = float(probe.stdout.strip())
    print(f"✅ {s['id']} généré -> {out_file} (durée: {dur:.2f}s, cible: {s['target_dur']}s)")

print("🎉 Toutes les voix V3 calibrées sont prêtes !")
