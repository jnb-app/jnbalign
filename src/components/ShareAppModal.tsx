import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Linkedin, Mail, Heart, Sparkles } from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (title: string, message?: string) => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose, onToast }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.origin;
  const shareMessage = `J'ai testé JNB Align pour optimiser mon CV aux filtres ATS et préparer mes entretiens. C'est 100% gratuit, sans inscription et sans pub : ${appUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedLink(true);
      onToast('Lien copié !', 'Vous pouvez maintenant le coller et le partager avec un proche.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Fallback
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JNB Align - Optimiseur de CV ATS & Lettres de motivation',
          text: 'Découvrez cet outil 100% gratuit d\'optimisation de CV aux normes des recruteurs.',
          url: appUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(shareMessage);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(appUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const handleShareMail = () => {
    const subject = encodeURIComponent('Un outil gratuit génial pour optimiser ton CV aux filtres ATS');
    const body = encodeURIComponent(`Hello,\n\nJe voulais te partager JNB Align, un outil gratuit qui aide à adapter son CV et sa lettre de motivation aux critères précis des recruteurs sans rien inventer :\n\n${appUrl}\n\nJ'espère que ça pourra t'aider !`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="bg-[#0B1530] light:bg-white border border-amber-400/40 light:border-slate-200 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-white light:text-slate-900 space-y-4 sm:space-y-5 text-left relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 light:border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Heart className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Partager solidairement JNB Align
              </h3>
              <p className="text-xs text-amber-300 light:text-amber-700 font-medium">
                100% Gratuit · Sans Inscription · Zéro Publicité
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
          Vous connaissez quelqu'un en recherche d'emploi ou en transition de carrière ? Offrez-lui le même avantage stratégique sans débourser un centime.
        </p>

        {/* Action channels */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 light:text-emerald-800 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleShareLinkedIn}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 light:text-blue-800 border border-blue-500/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <Linkedin className="w-4 h-4 text-blue-400" />
            <span>LinkedIn</span>
          </button>

          <button
            type="button"
            onClick={handleShareMail}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 light:text-slate-800 light:bg-slate-100 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <Mail className="w-4 h-4 text-amber-400" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={handleShareNative}
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 light:text-amber-800 border border-amber-400/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Partage Direct</span>
          </button>
        </div>

        {/* Copy link input box */}
        <div className="p-3 bg-slate-950/70 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl flex items-center justify-between gap-2">
          <input
            type="text"
            readOnly
            value={appUrl}
            className="bg-transparent text-xs text-slate-300 light:text-slate-700 font-mono focus:outline-none w-full truncate"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copié !' : 'Copier'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
