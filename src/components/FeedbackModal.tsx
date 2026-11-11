import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Copy,
  Check,
  Mail,
  ExternalLink,
  ShieldCheck,
  Bug,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState<'bug' | 'question' | 'suggestion'>('bug');
  const [userMessage, setUserMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  if (!isOpen) return null;

  const supportEmail = 'contact@jnbalign.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getSubject = () => {
    switch (category) {
      case 'bug':
        return '[JNB Align] Signalement de problème technique';
      case 'question':
        return '[JNB Align] Question sur mon CV ou analyse ATS';
      case 'suggestion':
        return "[JNB Align] Suggestion d'amélioration ou retour";
      default:
        return '[JNB Align] Contact & Support';
    }
  };

  const getBody = () => {
    const fromLine = userEmail ? `De : ${userEmail}\n\n` : '';
    const msg = userMessage ? userMessage : '(Décrivez votre retour ou votre problème ici...)';
    return `${fromLine}Bonjour l'équipe JNB Align,\n\n${msg}\n\nCordialement.`;
  };

  const openGmailWeb = () => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${supportEmail}&su=${encodeURIComponent(
      getSubject()
    )}&body=${encodeURIComponent(getBody())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openDefaultMail = () => {
    const url = `mailto:${supportEmail}?subject=${encodeURIComponent(
      getSubject()
    )}&body=${encodeURIComponent(getBody())}`;
    window.location.href = url;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-lg bg-[#0A1024] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 light:bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-700 shadow-inner">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-title" className="text-base sm:text-lg font-bold text-white light:text-slate-900">
                Support, Aide & Retours
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                L'équipe JNB Align est à votre écoute
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

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Email Address Card with Copy Action */}
          <div className="p-4 rounded-xl bg-slate-900/80 light:bg-slate-100 border border-slate-800 light:border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 light:text-slate-500 block">Adresse de contact officielle :</span>
                <span className="font-mono font-bold text-amber-300 light:text-amber-800 text-sm select-all">
                  {supportEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 light:bg-white light:hover:bg-slate-200 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier l'email</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 light:text-slate-700 block">
              Objet de votre message :
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('bug')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  category === 'bug'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 light:text-rose-800 font-bold'
                    : 'bg-slate-900/40 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600'
                }`}
              >
                <Bug className="w-4 h-4 text-rose-400" />
                <span>Problème</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('question')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  category === 'question'
                    ? 'bg-blue-500/15 border-blue-500 text-blue-300 light:text-blue-800 font-bold'
                    : 'bg-slate-900/40 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Question</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('suggestion')}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  category === 'suggestion'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 light:text-amber-800 font-bold'
                    : 'bg-slate-900/40 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 light:text-slate-600'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Suggestion</span>
              </button>
            </div>
          </div>

          {/* User message input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 light:text-slate-700 block">
              Votre message (facultatif avant d'envoyer) :
            </label>
            <textarea
              rows={3}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Expliquez brièvement votre retour ou le problème rencontré..."
              className="w-full text-xs p-3 rounded-xl bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 text-slate-200 light:text-slate-800 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Action Buttons to open mail client without iframe conflict */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={openGmailWeb}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ouvrir dans Gmail (Nouvel Onglet Sécurisé)</span>
            </button>

            <button
              type="button"
              onClick={openDefaultMail}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 light:bg-slate-100 light:hover:bg-slate-200 text-slate-300 light:text-slate-700 border border-slate-800 light:border-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Ouvrir mon logiciel de messagerie par défaut (Outlook, Apple Mail...)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800/80 light:border-slate-200 bg-slate-900/40 light:bg-slate-50 text-[11px] text-slate-400 light:text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Nous répondons sous 24h ouvrées à tous les messages.</span>
        </div>
      </div>
    </div>
  );
};
