import React, { useState } from 'react';
import {
  Download,
  X,
  Sparkles,
  Check,
  Smartphone,
  Eye,
  Layers,
  Copy,
  ShieldCheck,
  Instagram,
  Linkedin,
  Monitor,
  Tv,
  Compass,
  Star,
  Link as LinkIcon,
  Lock,
} from 'lucide-react';

export const INSTAGRAM_HIGHLIGHTS = [
  {
    id: 'boussole',
    icon: Compass,
    title: 'La Boussole',
    shortLabel: 'Boussole',
    tagline: 'Comment fonctionne le score ATS',
    description: "Explication de l'indice d'adéquation sémantique, du ciblage des mots-clés et du calibrage machine.",
    svgPath: '/instagram-highlight-boussole.svg',
    filename: 'instagram-highlight-boussole-1080x1080.png',
  },
  {
    id: 'star',
    icon: Star,
    title: 'Méthode STAR',
    shortLabel: 'STAR',
    tagline: 'Exemples de verbes d\'action',
    description: "Structure Situation, Tâche, Action, Résultat : chiffrer l'impact pour séduire les recruteurs.",
    svgPath: '/instagram-highlight-star.svg',
    filename: 'instagram-highlight-star-1080x1080.png',
  },
  {
    id: 'tuto-url',
    icon: LinkIcon,
    title: 'Tuto URL',
    shortLabel: 'Tuto URL',
    tagline: 'Démo 15s d\'un lien d\'offre',
    description: "Démonstration chrono : coller une URL d'offre (LinkedIn, WTTJ, Indeed) et laisser faire l'algorithme.",
    svgPath: '/instagram-highlight-tuto-url.svg',
    filename: 'instagram-highlight-tuto-url-1080x1080.png',
  },
  {
    id: 'securite-rgpd',
    icon: Lock,
    title: 'Sécurité & RGPD',
    shortLabel: 'Sécurité',
    tagline: 'Données privées préservées',
    description: "Traitement confidentiel en mémoire vive, aucune revente de coordonnées et souveraineté absolue.",
    svgPath: '/instagram-highlight-securite-rgpd.svg',
    filename: 'instagram-highlight-securite-rgpd-1080x1080.png',
  },
];

interface LogoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAsset?: 'avatar' | 'banner' | 'instagram';
}

export const LogoStudioModal: React.FC<LogoStudioModalProps> = ({
  isOpen,
  onClose,
  defaultAsset = 'banner',
}) => {
  const [activeAsset, setActiveAsset] = useState<'avatar' | 'banner' | 'instagram'>(defaultAsset);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewMode, setPreviewMode] = useState<'circle' | 'square'>('circle');
  const [bannerPreviewMode, setBannerPreviewMode] = useState<'full' | 'safe'>('safe');
  const [selectedHighlightId, setSelectedHighlightId] = useState<string>('boussole');

  if (!isOpen) return null;

  // Téléchargement PNG haute résolution via HTML5 Canvas
  const handleDownloadPngFile = async (svgPath: string, filename: string, width = 1080, height = 1080) => {
    setDownloadingPng(true);
    try {
      const response = await fetch(svgPath);
      const svgText = await response.text();

      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const pngUrl = canvas.toDataURL('image/png');

          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = filename;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobURL);
        setDownloadingPng(false);
      };
      img.onerror = () => {
        setDownloadingPng(false);
      };
      img.src = blobURL;
    } catch (err) {
      console.error('Error generating PNG:', err);
      setDownloadingPng(false);
    }
  };

  const handleDownloadPng = async (assetType: 'avatar' | 'banner' | 'instagram') => {
    if (assetType === 'instagram') {
      const h = INSTAGRAM_HIGHLIGHTS.find((i) => i.id === selectedHighlightId) || INSTAGRAM_HIGHLIGHTS[0];
      await handleDownloadPngFile(h.svgPath, h.filename, 1080, 1080);
      return;
    }
    const svgPath = assetType === 'banner' ? '/jnb-align-youtube-banner.svg' : '/jnb-align-logo.svg';
    const width = assetType === 'banner' ? 2560 : 1080;
    const height = assetType === 'banner' ? 1440 : 1080;
    const filename =
      assetType === 'banner'
        ? 'jnb-align-youtube-banner-2560x1440.png'
        : 'jnb-align-logo-avatar-1080x1080.png';
    await handleDownloadPngFile(svgPath, filename, width, height);
  };

  const handleDownloadSvg = (assetType: 'avatar' | 'banner' | 'instagram') => {
    if (assetType === 'instagram') {
      const h = INSTAGRAM_HIGHLIGHTS.find((i) => i.id === selectedHighlightId) || INSTAGRAM_HIGHLIGHTS[0];
      const link = document.createElement('a');
      link.href = h.svgPath;
      link.download = `${h.id}-highlight.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const link = document.createElement('a');
    link.href = assetType === 'banner' ? '/jnb-align-youtube-banner.svg' : '/jnb-align-logo.svg';
    link.download = assetType === 'banner' ? 'jnb-align-youtube-banner.svg' : 'jnb-align-logo-vector.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllHighlights = async () => {
    for (const h of INSTAGRAM_HIGHLIGHTS) {
      await handleDownloadPngFile(h.svgPath, h.filename, 1080, 1080);
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  const handleCopySvgUrl = (assetType: 'avatar' | 'banner' | 'instagram') => {
    let path = '/jnb-align-logo.svg';
    if (assetType === 'banner') path = '/jnb-align-youtube-banner.svg';
    else if (assetType === 'instagram') {
      const h = INSTAGRAM_HIGHLIGHTS.find((i) => i.id === selectedHighlightId) || INSTAGRAM_HIGHLIGHTS[0];
      path = h.svgPath;
    }
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-kit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0A1024] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 light:text-slate-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 light:border-slate-200 bg-slate-900/50 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 light:bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-700 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="brand-kit-title" className="text-base sm:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2">
                Kit Graphique Officiel : Logo & Bannière
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-500/20">
                  Haute Résolution
                </span>
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Assets prêts à l'emploi pour YouTube, TikTok, Instagram & LinkedIn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Bannière YouTube vs Photo de Profil Avatar vs Pastilles Instagram */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-slate-800/60 light:border-slate-200 bg-slate-950/40 light:bg-slate-100/50 shrink-0 text-xs sm:text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveAsset('banner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeAsset === 'banner'
                ? 'border-amber-400 text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-white shadow-xs'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>Bannière YouTube (2560 × 1440)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAsset('avatar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeAsset === 'avatar'
                ? 'border-amber-400 text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-white shadow-xs'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-400" />
            <span>Logo Avatar (1080 × 1080)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAsset('instagram')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeAsset === 'instagram'
                ? 'border-amber-400 text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-white shadow-xs'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Instagram className="w-4 h-4 text-pink-400" />
            <span>Stories à la une Instagram (4 Pastilles)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: BANNIÈRE YOUTUBE */}
          {activeAsset === 'banner' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Preview Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 light:bg-slate-100 p-3 rounded-xl border border-slate-800 light:border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-300 light:text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Zone de Sécurité YouTube (Safe Area) garantie :</strong> Votre logo et votre slogan restent 100% lisibles sur smartphone, tablette et PC !
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBannerPreviewMode('safe')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      bannerPreviewMode === 'safe'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 light:bg-white text-slate-300 light:text-slate-700'
                    }`}
                  >
                    Vue Mobile & PC (Safe Area)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerPreviewMode('full')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                      bannerPreviewMode === 'full'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 light:bg-white text-slate-300 light:text-slate-700'
                    }`}
                  >
                    Vue Complète (16:9 TV)
                  </button>
                </div>
              </div>

              {/* Banner Visual Display */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-2xl bg-black flex items-center justify-center">
                {bannerPreviewMode === 'safe' ? (
                  // Cropped view simulating desktop/mobile banner container (2560 x ~424 px ratio)
                  <div className="w-full aspect-[2560/480] relative overflow-hidden flex items-center justify-center">
                    <img
                      src="/jnb-align-youtube-banner.svg"
                      alt="Bannière YouTube JNB Align"
                      className="w-full h-auto object-cover scale-[1.05]"
                      style={{
                        transformOrigin: 'center center',
                      }}
                    />
                    <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-black/70 text-amber-300 text-[10px] font-mono border border-amber-400/30">
                      Rendu sur Écran Ordinateur & Mobile
                    </div>
                  </div>
                ) : (
                  // Full 16:9 canvas view
                  <div className="w-full aspect-[16/9] relative overflow-hidden flex items-center justify-center">
                    <img
                      src="/jnb-align-youtube-banner.svg"
                      alt="Bannière YouTube JNB Align Plein Format"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-black/70 text-cyan-300 text-[10px] font-mono border border-cyan-400/30">
                      Rendu Plein Écran (2560 × 1440 px)
                    </div>
                  </div>
                )}
              </div>

              {/* Specs & Guidance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <strong className="text-amber-300 light:text-amber-800 block">Dimensions Exactes :</strong>
                  <p className="text-slate-400 light:text-slate-600">
                    <strong>2560 × 1440 px</strong> (ratio 16:9 recommandé par YouTube pour une netteté 4K).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <strong className="text-cyan-400 block">Zone Centrale Optimisée :</strong>
                  <p className="text-slate-400 light:text-slate-600">
                    Fond bleu nuit (`#060B18`), halo doré, boussole prismatique et slogan officiel au centre.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <strong className="text-emerald-400 block">Poids & Format :</strong>
                  <p className="text-slate-400 light:text-slate-600">
                    Fichier PNG haute fidélité &lt; 2 Mo (parfaitement conforme au plafond de 6 Mo de YouTube).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGO AVATAR */}
          {activeAsset === 'avatar' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4 bg-slate-950/60 light:bg-slate-100/70 rounded-2xl border border-slate-800 light:border-slate-200 p-6">
                <div className="relative group shrink-0">
                  <div
                    className={`w-56 h-56 sm:w-64 sm:h-64 transition-all duration-300 shadow-2xl flex items-center justify-center overflow-hidden border-2 border-amber-400/40 relative ${
                      previewMode === 'circle' ? 'rounded-full' : 'rounded-3xl'
                    }`}
                  >
                    <img
                      src="/jnb-align-logo.svg"
                      alt="Logo officiel JNB Align"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-slate-950 text-[11px] font-extrabold rounded-full shadow-md whitespace-nowrap">
                    {previewMode === 'circle' ? 'Vue Avatar (TikTok / Instagram / YouTube)' : 'Vue Carrée (App Icon / Web)'}
                  </div>
                </div>

                <div className="space-y-4 max-w-xs text-left">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 light:text-slate-500 uppercase tracking-wider block mb-2">
                      Format de prévisualisation :
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('circle')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          previewMode === 'circle'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-900 light:bg-white text-slate-300 light:text-slate-700 border border-slate-800 light:border-slate-300'
                        }`}
                      >
                        <span>⚪ Circulaire</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('square')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          previewMode === 'square'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-900 light:bg-white text-slate-300 light:text-slate-700 border border-slate-800 light:border-slate-300'
                        }`}
                      >
                        <span>🔲 Carré</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 light:text-slate-600 bg-slate-900/60 light:bg-white p-3.5 rounded-xl border border-slate-800 light:border-slate-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>100% Centré</strong> pour le rognage des réseaux</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span><strong>Bleu Spatial & Or</strong> haute visibilité mobile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Résolution : <strong>1080 x 1080 px</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white light:text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span>TikTok</span>
                  </div>
                  <p className="text-slate-400 light:text-slate-600">Avatar circulaire (200x200 min). Format PNG 1080p ultra-net.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white light:text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                    <span>Instagram</span>
                  </div>
                  <p className="text-slate-400 light:text-slate-600">Photo de profil (320x320 px). Découpage en cercle automatique.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white light:text-slate-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>LinkedIn</span>
                  </div>
                  <p className="text-slate-400 light:text-slate-600">Logo de Page Entreprise (300x300 px) & Avatar profil (400x400 px).</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASTILLES INSTAGRAM STORIES À LA UNE */}
          {activeAsset === 'instagram' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Banner Notice */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-950/40 via-[#0C1A3F] to-amber-950/40 light:from-pink-50 light:via-blue-50 light:to-amber-50 border border-pink-500/30 light:border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-white light:text-slate-900">
                      4 Pastilles Officielles pour vos Stories à la Une Instagram
                    </span>
                    <p className="text-slate-300 light:text-slate-600 text-[11px] mt-0.5">
                      Conçues pour habiller votre profil sous la bio : fond noir nuit (#050A17) et or 24K, 1080×1080 px sans pixellisation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAllHighlights}
                  disabled={downloadingPng}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tout Télécharger (Pack 4 PNG)</span>
                </button>
              </div>

              {/* Realistic Instagram Profile Mockup */}
              <div className="p-5 rounded-2xl bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-4 max-w-xl mx-auto shadow-xl">
                <div className="text-[10px] font-mono text-slate-400 light:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Aperçu sur l'application Instagram</span>
                  <span className="text-pink-400 font-semibold">@jnbalign</span>
                </div>

                {/* Profile Header Row */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600">
                      <div className="w-full h-full rounded-full bg-[#050A17] overflow-hidden p-1 flex items-center justify-center">
                        <img src="/jnb-align-logo.svg" alt="Avatar JNB Align" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-0.5 text-left">
                    <div className="font-bold text-white light:text-slate-900 text-sm">JNB Align | Optimiseur CV ATS</div>
                    <div className="text-xs text-slate-400 light:text-slate-500 font-normal leading-snug">
                      Passez les filtres ATS sans jamais travestir votre parcours 🧭<br />
                      CV & Lettre synchronisés en 3 min ⚡
                    </div>
                    <div className="text-xs text-blue-400 hover:underline font-medium">jnbalign.com</div>
                  </div>
                </div>

                {/* The 4 Instagram Highlights Circles Row */}
                <div className="pt-2 border-t border-slate-900 light:border-slate-200">
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                    {INSTAGRAM_HIGHLIGHTS.map((h) => {
                      const isSelected = selectedHighlightId === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setSelectedHighlightId(h.id)}
                          className="flex flex-col items-center gap-1.5 group cursor-pointer"
                        >
                          <div
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 transition-all ${
                              isSelected
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105'
                                : 'bg-slate-800 hover:bg-amber-400/50'
                            }`}
                          >
                            <div className="w-full h-full rounded-full bg-[#050A17] p-1 overflow-hidden flex items-center justify-center">
                              <img src={h.svgPath} alt={h.title} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <span
                            className={`text-[11px] truncate max-w-full font-medium transition-colors ${
                              isSelected
                                ? 'text-amber-300 light:text-amber-800 font-bold'
                                : 'text-slate-300 light:text-slate-700'
                            }`}
                          >
                            {h.shortLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4 Cards Grid to Download Each Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INSTAGRAM_HIGHLIGHTS.map((h) => {
                  const isSelected = selectedHighlightId === h.id;
                  const Icon = h.icon;
                  return (
                    <div
                      key={h.id}
                      onClick={() => setSelectedHighlightId(h.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                        isSelected
                          ? 'bg-[#0E1A3C] light:bg-amber-50/60 border-amber-400 light:border-amber-400 shadow-md'
                          : 'bg-slate-900/60 light:bg-slate-50 border-slate-800 light:border-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#050A17] border border-amber-400/40 p-1 shrink-0 shadow-md">
                          <img src={h.svgPath} alt={h.title} className="w-full h-full object-contain" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <h4 className="font-bold text-white light:text-slate-900 text-sm truncate">{h.title}</h4>
                          </div>
                          <div className="text-xs font-semibold text-amber-300 light:text-amber-800">{h.tagline}</div>
                          <p className="text-[11px] text-slate-400 light:text-slate-600 leading-snug">{h.description}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 light:border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">1080 × 1080 px</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = h.svgPath;
                              link.download = `${h.id}-highlight.svg`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 light:bg-slate-200 text-slate-200 light:text-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            SVG
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPngFile(h.svgPath, h.filename, 1080, 1080);
                            }}
                            disabled={downloadingPng}
                            className="px-3 py-1 text-[11px] font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>PNG HD</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instructions on Instagram Installation */}
              <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-100 border border-slate-800 light:border-slate-200 text-xs space-y-2 text-left">
                <span className="font-bold text-amber-300 light:text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Guide d'installation sur Instagram (en 30 secondes) :
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 light:text-slate-700 text-[11.5px] leading-relaxed pl-1">
                  <li>Téléchargez les 4 fichiers PNG sur votre smartphone (ou envoyez-les via AirDrop/WhatsApp).</li>
                  <li>Sur votre profil Instagram, appuyez sur le bouton <strong>« + Nouveau »</strong> sous votre bio (ou maintenez le doigt sur une story existante &gt; <em>Modifier la story à la une</em>).</li>
                  <li>Sélectionnez vos stories, puis appuyez sur <strong>« Modifier la photo de couverture »</strong> et choisissez la pastille correspondante !</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800/80 light:border-slate-200 bg-slate-900/70 light:bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleCopySvgUrl(activeAsset)}
            className="text-xs text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Lien copié dans le presse-papier !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copier l'URL directe du fichier</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleDownloadSvg(activeAsset)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 light:bg-slate-200 light:hover:bg-slate-300 text-white light:text-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700 light:border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger SVG</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadPng(activeAsset)}
              disabled={downloadingPng}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {downloadingPng
                  ? 'Génération HD...'
                  : activeAsset === 'banner'
                  ? 'Télécharger Bannière PNG (2560 × 1440)'
                  : activeAsset === 'instagram'
                  ? 'Télécharger Pastille Active PNG'
                  : 'Télécharger Avatar PNG (1080 × 1080)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
