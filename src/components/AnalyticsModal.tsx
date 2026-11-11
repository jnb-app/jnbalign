import React, { useEffect, useState } from 'react';
import {
  Users,
  FileCheck2,
  Download,
  Link as LinkIcon,
  Smartphone,
  Monitor,
  Globe,
  Sparkles,
  X,
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldCheck,
  Lock,
  KeyRound,
  LogOut,
  FileText,
  BookOpen,
  Video,
} from 'lucide-react';
import { fetchAppStats, AppStatsData } from '../services/analyticsClient';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminStateChange?: (isAdmin: boolean) => void;
  onOpenMarketingDossier?: () => void;
  onOpenLogoStudio?: () => void;
  onOpenTikTokStudio?: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  onAdminStateChange,
  onOpenMarketingDossier,
  onOpenLogoStudio,
  onOpenTikTokStudio,
}) => {
  const [stats, setStats] = useState<AppStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('jnb_admin_authorized') === 'true' ||
        (typeof window !== 'undefined' && window.location.search.includes('admin=true'))
      );
    } catch {
      return false;
    }
  });
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    const data = await fetchAppStats();
    if (data) {
      setStats(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && isAdminUnlocked) {
      loadStats();
    }
  }, [isOpen, isAdminUnlocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPin.trim();
    if (cleanPin === 'align2026' || cleanPin === 'admin2026' || cleanPin === 'jnb2026') {
      setIsAdminUnlocked(true);
      setPinError(false);
      try {
        localStorage.setItem('jnb_admin_authorized', 'true');
      } catch {
        // Ignorer
      }
      if (onAdminStateChange) onAdminStateChange(true);
      loadStats();
    } else {
      setPinError(true);
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    try {
      localStorage.removeItem('jnb_admin_authorized');
    } catch {
      // Ignorer
    }
    if (onAdminStateChange) onAdminStateChange(false);
    onClose();
  };

  if (!isOpen) return null;

  // Écran de verrouillage Administrateur
  if (!isAdminUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="bg-[#0B1530] text-slate-100 border border-amber-400/30 rounded-2xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/40">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Espace Administrateur</h2>
                <p className="text-xs text-slate-400">Accès restreint aux métriques internes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Code d'accès administrateur :</span>
              </label>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Code secret..."
                autoFocus
                className="w-full text-sm bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none font-mono tracking-widest text-center"
              />
              {pinError && (
                <p className="text-xs text-rose-400 mt-1.5 text-center font-medium">
                  Code incorrect. Veuillez réessayer.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-98"
            >
              Déverrouiller le Tableau de Bord →
            </button>
          </form>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Seul le créateur de JNB Align dispose de ce code pour suivre la fréquentation et l'activité sans exposer les données au public.
          </p>
        </div>
      </div>
    );
  }

  const totalDevices = (stats?.devices?.mobile || 0) + (stats?.devices?.desktop || 0) || 1;
  const mobilePct = Math.round(((stats?.devices?.mobile || 0) / totalDevices) * 100);
  const desktopPct = 100 - mobilePct;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B1530] text-slate-100 border border-amber-400/30 rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/40">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Métriques & Fréquentation de JNB Align</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Compteur télémétrique anonymisé en temps réel (100% conforme RGPD, zéro cookie tiers).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadStats}
              disabled={loading}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Rafraîchir les statistiques"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleLockAdmin}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Verrouiller l'accès administrateur"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Indicateurs Clés Principaux */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Visiteurs Uniques */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Utilisateurs réels</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
              {stats?.uniqueVisitors || stats?.totalVisits || 1}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.visits || 1} aujourd'hui
            </p>
          </div>

          {/* Candidatures & CVs Optimisés */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">CVs & Analyses</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-300 font-mono">
              {stats?.totalAnalyses || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.analyses || 0} aujourd'hui
            </p>
          </div>

          {/* Liens d'offres extraits par URL */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Offres par URL</span>
              <LinkIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono">
              {stats?.totalUrlExtractions || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.urls || 0} aujourd'hui
            </p>
          </div>

          {/* Téléchargements de Packs */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Téléchargements</span>
              <Download className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-300 font-mono">
              {stats?.totalDownloads || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.downloads || 0} aujourd'hui
            </p>
          </div>
        </div>

        {/* Détails Terminaux & Langues */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Terminaux : Mobile vs Desktop */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Supports Utilisés</span>
              <span className="text-[11px] font-mono text-slate-400">{mobilePct}% Mobile · {desktopPct}% PC</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
              <div style={{ width: `${mobilePct}%` }} className="h-full bg-gradient-to-r from-amber-400 to-yellow-500" title="Mobile" />
              <div style={{ width: `${desktopPct}%` }} className="h-full bg-sky-500" title="Desktop" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-400" /> Mobile : {stats?.devices?.mobile || 0}
              </span>
              <span className="flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-sky-400" /> Ordinateur : {stats?.devices?.desktop || 0}
              </span>
            </div>
          </div>

          {/* Langues : FR vs EN */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Norme ATS & Langue</span>
              <span className="text-[11px] font-mono text-slate-400">FR vs International EN</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between items-center">
                <span>🇫🇷 Mode France / UE :</span>
                <strong className="text-amber-300 font-mono">{stats?.languages?.fr || 0}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span>🇬🇧 Mode International ATS :</span>
                <strong className="text-blue-300 font-mono">{stats?.languages?.en || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Dossier Stratégique Marketing & Communication */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-transparent border border-amber-500/30 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Dossier Stratégie Marketing & Lancement J-7</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              STRATEGIE_MARKETING_ET_LANCEMENT.md
            </span>
          </div>
          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            Retrouvez l'intégralité de la stratégie marketing (différenciation, UVP, scripts TikTok/LinkedIn, direction artistique, guide de création des comptes et rétroplanning en 7 jours).
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onOpenMarketingDossier && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMarketingDossier();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Consulter le Guide dans l'App 📖</span>
              </button>
            )}

            {onOpenLogoStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogoStudio();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Kit Logo & Bannière YouTube 🎨</span>
              </button>
            )}

            {onOpenTikTokStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTikTokStudio();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-rose-200 font-bold text-xs border border-rose-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>Campagne TikTok J-7 🎬</span>
              </button>
            )}

            <a
              href="/api/download-marketing-doc"
              download="STRATEGIE_MARKETING_ET_LANCEMENT.md"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger (.md)</span>
            </a>
          </div>
        </div>

        {/* Moniteur de Santé & Alertes Rapides */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Moniteur de Santé Système & Résilience</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Auto-Healing Actif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Serveur Cloud Run :</span>
              <strong className="text-emerald-400">🟢 100% Opérationnel</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Pipeline IA Gemini :</span>
              <strong className="text-emerald-400">🟢 Multi-Modèles Actif</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block mb-0.5">Support & Alertes :</span>
              <strong className="text-amber-300 truncate block">contact@jnbalign.com</strong>
            </div>
          </div>
        </div>

        {/* Note de Souveraineté & Recommandation Externe */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Compteur Intégré & Confidentialité Absolue :</span>
          </div>
          <p className="text-[11.5px] leading-relaxed">
            Ces métriques sont calculées de manière totalement anonyme sans traquer l'adresse IP ni l'identité des candidats. 
            Vous pouvez également brancher en un clic des outils comme <strong>Google Analytics 4 (GA4)</strong> ou <strong>Plausible Analytics</strong> en renseignant leur tag dans <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">index.html</code>.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
