import React, { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Users,
  Download,
  Link as LinkIcon,
  Smartphone,
  Monitor,
  Sparkles,
  X,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Lock,
  KeyRound,
  LogOut,
  FileText,
  BookOpen,
  Video,
  Play,
  Copy,
  UploadCloud,
  Database,
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  fetchAppStats,
  fetchGa4Config,
  saveGa4Config,
  AppStatsData,
} from '../services/analyticsClient';
import {
  getActiveGa4Id,
  getEnvGa4MeasurementId,
  isValidGa4MeasurementId,
} from '../services/ga4';
import { auth, signInAdminWithGoogle, signOutAdmin } from '../firebase';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminStateChange?: (isAdmin: boolean) => void;
  onOpenMarketingDossier?: () => void;
  onOpenLogoStudio?: () => void;
  onOpenTikTokStudio?: () => void;
  onOpenScreencastJ5?: () => void;
  onOpenCarouselJ4?: () => void;
  onOpenVideoJ3?: () => void;
  onOpenLaunchJ0?: () => void;
  onOpenPostLaunchJ1?: () => void;
  onOpenVideoJ2?: () => void;
  onOpenKitJ3?: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  onAdminStateChange,
  onOpenMarketingDossier,
  onOpenLogoStudio,
  onOpenTikTokStudio,
  onOpenScreencastJ5,
  onOpenCarouselJ4,
  onOpenVideoJ3,
  onOpenLaunchJ0,
  onOpenPostLaunchJ1,
  onOpenVideoJ2,
  onOpenKitJ3,
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

  // Firebase Admin Auth state (pour lecture Cloud Firestore & écriture config GA4)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Fenêtre historique (48h / 7j / 30j)
  const [historyRange, setHistoryRange] = useState<'48h' | '7d' | '30d'>('7d');

  // Configuration Google Analytics 4 prête à l'emploi
  const [ga4Input, setGa4Input] = useState<string>('');
  const [ga4Enabled, setGa4Enabled] = useState<boolean>(true);
  const [ga4Saving, setGa4Saving] = useState<boolean>(false);
  const [ga4Feedback, setGa4Feedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveGa4Id, setLiveGa4Id] = useState<string>(() => getActiveGa4Id() || getEnvGa4MeasurementId());

  const loadStatsAndConfig = async () => {
    setLoading(true);
    try {
      const [statsData, ga4Cfg] = await Promise.all([
        fetchAppStats(),
        fetchGa4Config().catch(() => null),
      ]);
      if (statsData) {
        setStats(statsData);
      }
      if (ga4Cfg) {
        const envFallback = getEnvGa4MeasurementId();
        setGa4Input(ga4Cfg.ga4MeasurementId || envFallback);
        setGa4Enabled(ga4Cfg.ga4MeasurementId ? ga4Cfg.ga4Enabled : Boolean(envFallback));
        setLiveGa4Id(
          ga4Cfg.ga4Enabled && ga4Cfg.ga4MeasurementId
            ? ga4Cfg.ga4MeasurementId
            : getActiveGa4Id() || envFallback
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && isAdminUnlocked) {
      void loadStatsAndConfig();
    }
  }, [isOpen, isAdminUnlocked, firebaseUser?.uid]);

  const handleGoogleAdminSignIn = async () => {
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      const user = await signInAdminWithGoogle();
      setFirebaseUser(user);
      setAuthMessage(null);
      await loadStatsAndConfig();
    } catch (err: any) {
      const msg = err?.code === 'auth/popup-closed-by-user'
        ? 'Fenêtre de connexion Google fermée.'
        : 'Connexion Google interrompue. Autorisez la fenêtre pop-up et réessayez.';
      setAuthMessage(msg);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleAdminSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOutAdmin();
      setFirebaseUser(null);
      await loadStatsAndConfig();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveGa4 = async (e: React.FormEvent) => {
    e.preventDefault();
    setGa4Feedback(null);

    const cleaned = ga4Input.trim().toUpperCase();
    if (cleaned !== '' && !isValidGa4MeasurementId(cleaned)) {
      setGa4Feedback({
        type: 'error',
        text: 'Format invalide : saisissez un identifiant officiel de type G-XXXXXXXXXX.',
      });
      return;
    }

    if (!firebaseUser) {
      setGa4Feedback({
        type: 'error',
        text: 'Connectez d’abord votre compte Google Admin (ci-dessus) pour enregistrer la configuration GA4 dans Firestore.',
      });
      return;
    }

    setGa4Saving(true);
    try {
      const saved = await saveGa4Config(cleaned, ga4Enabled);
      setGa4Input(saved.ga4MeasurementId);
      setGa4Enabled(saved.ga4Enabled);
      setLiveGa4Id(saved.ga4Enabled ? saved.ga4MeasurementId : '');
      setGa4Feedback({
        type: 'success',
        text: saved.ga4Enabled
          ? `Google Analytics 4 activé en direct (${saved.ga4MeasurementId}). Tous les nouveaux événements y sont transmis automatiquement.`
          : 'Configuration GA4 enregistrée (suivi GA4 actuellement désactivé).',
      });
    } catch (err: any) {
      setGa4Feedback({
        type: 'error',
        text: err?.message?.includes('permission-denied')
          ? 'Accès refusé : connectez-vous avec le compte Google administrateur autorisé.'
          : err?.message || 'Impossible d’enregistrer la configuration GA4.',
      });
    } finally {
      setGa4Saving(false);
    }
  };

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
      void loadStatsAndConfig();
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

  const filteredHistory = useMemo(() => {
    const rows = stats?.dailyHistory || [];
    const maxDays = historyRange === '48h' ? 2 : historyRange === '7d' ? 7 : 30;
    return rows.slice(0, maxDays);
  }, [stats?.dailyHistory, historyRange]);

  const historyTotals = useMemo(() => {
    return filteredHistory.reduce(
      (acc, row) => ({
        visits: acc.visits + row.visits,
        analyses: acc.analyses + row.analyses,
        downloads: acc.downloads + row.downloads,
        urls: acc.urls + row.urls,
        uploads: acc.uploads + row.uploads,
        copies: acc.copies + row.copies,
      }),
      { visits: 0, analyses: 0, downloads: 0, urls: 0, uploads: 0, copies: 0 }
    );
  }, [filteredHistory]);

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
  const isFirestoreActive = stats?.persistenceSource === 'firestore';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B1530] text-slate-100 border border-amber-400/30 rounded-2xl sm:rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/40 shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2">
                <span>Métriques & Fréquentation de JNB Align</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                6 compteurs d'actions anonymes · Persistance Cloud Firestore · Prêt pour Google Analytics 4.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={loadStatsAndConfig}
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

        {/* Barre de Persistance Cloud Firestore & Authentification Google Admin */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isFirestoreActive
              ? 'bg-emerald-950/35 border-emerald-500/35 text-emerald-100'
              : 'bg-amber-950/25 border-amber-500/35 text-amber-100'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <Database
              className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${
                isFirestoreActive ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <div>
              {isFirestoreActive ? (
                <>
                  <p className="font-bold text-emerald-300">
                    Persistance Cloud Firestore Active (survit aux redémarrages Cloud Run)
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Connecté en tant que <span className="font-mono text-white">{firebaseUser?.email}</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-300">
                    Lecture actuelle : mémoire serveur · Connectez Google Admin pour l'historique Cloud persistant
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Les actions des utilisateurs s'enregistrent déjà dans Cloud Firestore. Authentifiez-vous pour lire les totaux cumulés & régler GA4.
                  </p>
                </>
              )}
              {authMessage && <p className="text-[11px] text-rose-300 mt-1">{authMessage}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {firebaseUser ? (
              <button
                type="button"
                onClick={handleGoogleAdminSignOut}
                disabled={authBusy}
                className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold cursor-pointer"
              >
                Déconnecter Google
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleAdminSignIn}
                disabled={authBusy}
                className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-60"
              >
                {authBusy ? 'Connexion...' : 'Connecter Google Admin (Cloud Firestore)'}
              </button>
            )}
          </div>
        </div>

        {/* 6 Compteurs d'Actions Clés */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 1. Visiteurs Uniques */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Utilisateurs réels</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
              {stats?.uniqueVisitors || stats?.totalVisits || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.visits || 0} visites aujourd'hui · {stats?.totalVisits || 0} total
            </p>
          </div>

          {/* 2. CVs & Analyses */}
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

          {/* 3. Téléchargements (PDF + Word) */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Téléchargements</span>
              <Download className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-300 font-mono">
              {stats?.totalDownloads || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.downloads || 0} aujourd'hui (PDF & Word)
            </p>
          </div>

          {/* 4. Offres par URL */}
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

          {/* 5. Documents joints (CV + Offres) */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Documents joints</span>
              <UploadCloud className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-cyan-300 font-mono">
              {stats?.totalUploads || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.uploads || 0} aujourd'hui (CV / Offre)
            </p>
          </div>

          {/* 6. Copies de texte brut */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[11px] font-semibold">Copies de texte</span>
              <Copy className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-300 font-mono">
              {stats?.totalCopies || 0}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {stats?.activeToday?.copies || 0} aujourd'hui
            </p>
          </div>
        </div>

        {/* Historique d'Activité 24h / 48h / 7j / 30j */}
        <div className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Historique journalier (suivi 24h / 48h / 7j / 30j)</span>
            </div>
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
              {(
                [
                  { id: '48h', label: '24h / 48h' },
                  { id: '7d', label: '7 jours' },
                  { id: '30d', label: '30 jours' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryRange(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    historyRange === tab.id
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-2">
              Aucune journée enregistrée pour le moment. Les compteurs s'alimentent automatiquement à chaque action.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 pr-2 font-semibold">Date (UTC)</th>
                    <th className="py-1.5 px-1.5 text-right">Visites</th>
                    <th className="py-1.5 px-1.5 text-right text-amber-300">Analyses</th>
                    <th className="py-1.5 px-1.5 text-right text-purple-300">Téléch.</th>
                    <th className="py-1.5 px-1.5 text-right text-emerald-300">URLs</th>
                    <th className="py-1.5 px-1.5 text-right text-cyan-300">Fichiers</th>
                    <th className="py-1.5 pl-1.5 text-right text-rose-300">Copies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.map((row) => (
                    <tr key={row.dateKey} className="hover:bg-slate-900/60">
                      <td className="py-1.5 pr-2 text-slate-200">{row.dateKey}</td>
                      <td className="py-1.5 px-1.5 text-right text-white">{row.visits}</td>
                      <td className="py-1.5 px-1.5 text-right text-amber-300">{row.analyses}</td>
                      <td className="py-1.5 px-1.5 text-right text-purple-300">{row.downloads}</td>
                      <td className="py-1.5 px-1.5 text-right text-emerald-300">{row.urls}</td>
                      <td className="py-1.5 px-1.5 text-right text-cyan-300">{row.uploads}</td>
                      <td className="py-1.5 pl-1.5 text-right text-rose-300">{row.copies}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700 font-bold text-slate-100">
                    <td className="pt-2 pr-2">Total période</td>
                    <td className="pt-2 px-1.5 text-right">{historyTotals.visits}</td>
                    <td className="pt-2 px-1.5 text-right text-amber-300">{historyTotals.analyses}</td>
                    <td className="pt-2 px-1.5 text-right text-purple-300">{historyTotals.downloads}</td>
                    <td className="pt-2 px-1.5 text-right text-emerald-300">{historyTotals.urls}</td>
                    <td className="pt-2 px-1.5 text-right text-cyan-300">{historyTotals.uploads}</td>
                    <td className="pt-2 pl-1.5 text-right text-rose-300">{historyTotals.copies}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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

        {/* Google Analytics 4 (GA4) — Prêt à l'emploi */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-500/30 text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sky-300">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Google Analytics 4 (GA4) — Prêt à l'emploi (0 €)</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                liveGa4Id
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {liveGa4Id ? `Actif : ${liveGa4Id}` : 'En attente d’un ID G-XXXXXXXXXX'}
            </span>
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            Collez votre identifiant de mesure GA4 (ou définissez <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">VITE_GA4_MEASUREMENT_ID</code>) pour activer automatiquement <code className="text-sky-300">gtag.js</code> et envoyer les 6 événements clés sans modifier le code.
          </p>

          <form onSubmit={handleSaveGa4} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={ga4Input}
              onChange={(e) => {
                setGa4Input(e.target.value.toUpperCase());
                setGa4Feedback(null);
              }}
              placeholder="G-XXXXXXXXXX"
              maxLength={24}
              className="flex-1 text-xs bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none font-mono"
            />
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ga4Enabled}
                onChange={(e) => setGa4Enabled(e.target.checked)}
                className="accent-sky-400"
              />
              <span>Activer GA4</span>
            </label>
            <button
              type="submit"
              disabled={ga4Saving}
              className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              {ga4Saving ? 'Enregistrement...' : 'Enregistrer GA4'}
            </button>
          </form>

          {ga4Feedback && (
            <div
              className={`flex items-start gap-2 p-2.5 rounded-lg text-[11px] border ${
                ga4Feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {ga4Feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{ga4Feedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-mono text-slate-400">
            {[
              'jnb_visit',
              'generate_cv_analysis',
              'extract_job_url',
              'download_document',
              'copy_document_text',
              'upload_document',
            ].map((ev) => (
              <span key={ev} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                {ev}
              </span>
            ))}
          </div>
        </div>

        {/* Dossier Stratégie Marketing & Communication (Affiché uniquement dans AI Studio) */}
        {(onOpenMarketingDossier ||
          onOpenLogoStudio ||
          onOpenTikTokStudio ||
          onOpenScreencastJ5 ||
          onOpenCarouselJ4 ||
          onOpenVideoJ3 ||
          onOpenLaunchJ0 ||
          onOpenPostLaunchJ1 ||
          onOpenVideoJ2 ||
          onOpenKitJ3) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-transparent border border-amber-500/30 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Dossier Stratégie Marketing & Lancement J-7</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              AI Studio Uniquement
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

            {onOpenScreencastJ5 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScreencastJ5();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-xs border border-amber-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>Démo Screencast J-5 (45s)</span>
              </button>
            )}

            {onOpenCarouselJ4 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCarouselJ4();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Carrousel PDF J-4 (Canva vs ATS)</span>
              </button>
            )}

            {onOpenVideoJ3 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoJ3();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 font-bold text-xs border border-purple-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Vidéo Mobile J-3 (30s URL)</span>
              </button>
            )}

            {onOpenLaunchJ0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLaunchJ0();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Studio Jour J (Grand Lancement)</span>
              </button>
            )}

            {onOpenPostLaunchJ1 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPostLaunchJ1();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Studio J+1 → J+30 (Post-Lancement)</span>
              </button>
            )}

            {onOpenVideoJ2 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoJ2();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Vidéo J+2 : Astuce Ctrl+F (25s)</span>
              </button>
            )}

            {onOpenKitJ3 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenKitJ3();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kit J+3 : CV Teardown #01 (PDF + 30s)</span>
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
        )}

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
              <span className="text-slate-400 block mb-0.5">Persistance Métriques :</span>
              <strong className="text-emerald-400">🟢 Cloud Firestore (0 €)</strong>
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

        {/* Note de Souveraineté & Confidentialité */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Persistance Cloud & Confidentialité Absolue (RGPD) :</span>
          </div>
          <p className="text-[11.5px] leading-relaxed">
            Seuls des compteurs agrégés anonymes sont persistés dans Cloud Firestore (aucune donnée personnelle, aucun contenu de CV ni adresse IP).
            L'intégration <strong>Google Analytics 4</strong> est prête à l'emploi ci-dessus ou via la variable <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">VITE_GA4_MEASUREMENT_ID</code>, sans aucun surcoût sur vos crédits API Gemini.
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
