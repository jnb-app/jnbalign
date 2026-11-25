import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  limit,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { initGa4, isValidGa4MeasurementId, trackGa4Event } from './ga4';

export type TrackableEventType =
  | 'visit'
  | 'pipeline_launch'
  | 'url_extract'
  | 'download'
  | 'copy_text'
  | 'file_upload';

export interface DailyMetricPoint {
  dateKey: string;
  visits: number;
  analyses: number;
  urls: number;
  downloads: number;
  copies: number;
  uploads: number;
}

export interface AppStatsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalAnalyses: number;
  totalUrlExtractions: number;
  totalDownloads: number;
  totalCopies: number;
  totalUploads: number;
  devices: { mobile: number; desktop: number };
  languages: { fr: number; en: number };
  activeToday: {
    visits: number;
    analyses: number;
    downloads: number;
    urls: number;
    copies: number;
    uploads: number;
  };
  dailyHistory?: DailyMetricPoint[];
  persistenceSource?: 'firestore' | 'server';
  firstSeen: string;
  lastActive: string;
}

export interface Ga4RuntimeConfig {
  ga4MeasurementId: string;
  ga4Enabled: boolean;
}

const CLIENT_ID_KEY = 'jnb_anon_client_id_v1';
const VISITOR_REGISTERED_KEY = 'jnb_firestore_visitor_registered_v1';
const VALID_VISITOR_ID_RE = /^usr_[a-zA-Z0-9_-]{2,60}$/;

function getUtcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAnonymousClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY) || '';
    if (!VALID_VISITOR_ID_RE.test(id)) {
      const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').substring(0, 8);
      const ts = Date.now().toString(36).replace(/[^a-z0-9]/g, '');
      id = `usr_${rand}${ts}`.slice(0, 40);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return `usr_guest_${Date.now().toString(36)}`.slice(0, 40);
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

function normalizeLang(lang?: string): 'fr' | 'en' {
  return lang === 'en' ? 'en' : 'fr';
}

async function persistEventToFirestore(
  event: TrackableEventType,
  clientId: string,
  isMobile: boolean,
  lang: 'fr' | 'en'
): Promise<void> {
  const today = getUtcDateKey();
  const dailyRef = doc(db, 'analytics_daily', today);

  // Respect strict du schéma firebase-blueprint.json (toutes les 12 clés présentes pour create + merge)
  const payload = {
    dateKey: today,
    visits: increment(event === 'visit' ? 1 : 0),
    analyses: increment(event === 'pipeline_launch' ? 1 : 0),
    urls: increment(event === 'url_extract' ? 1 : 0),
    downloads: increment(event === 'download' ? 1 : 0),
    copies: increment(event === 'copy_text' ? 1 : 0),
    uploads: increment(event === 'file_upload' ? 1 : 0),
    mobileEvents: increment(isMobile ? 1 : 0),
    desktopEvents: increment(isMobile ? 0 : 1),
    langFr: increment(lang === 'fr' ? 1 : 0),
    langEn: increment(lang === 'en' ? 1 : 0),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(dailyRef, payload, { merge: true });
  } catch (err) {
    // Log discret sans bloquer l'expérience candidat
    console.warn('[Firestore Analytics] Échec écriture journalière :', err instanceof Error ? err.message : err);
  }

  // Enregistrement unique du navigateur anonyme (1 seule fois par client pour le compteur Utilisateurs Réels)
  if (event === 'visit' && VALID_VISITOR_ID_RE.test(clientId)) {
    try {
      const alreadyRegistered =
        typeof localStorage !== 'undefined' && localStorage.getItem(VISITOR_REGISTERED_KEY) === clientId;
      if (!alreadyRegistered) {
        const visitorRef = doc(db, 'analytics_visitors', clientId);
        await setDoc(visitorRef, {
          visitorId: clientId,
          firstDateKey: today,
          isMobile,
          language: lang,
          createdAt: serverTimestamp(),
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(VISITOR_REGISTERED_KEY, clientId);
        }
      }
    } catch {
      // Si le document existe déjà (règle update: false), marquer comme enregistré localement
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(VISITOR_REGISTERED_KEY, clientId);
        }
      } catch {
        // Ignore
      }
    }
  }
}

function forwardEventToGa4(
  event: TrackableEventType,
  isMobile: boolean,
  lang: 'fr' | 'en',
  detail?: string
): void {
  const ga4Map: Record<TrackableEventType, string> = {
    visit: 'jnb_visit',
    pipeline_launch: 'generate_cv_analysis',
    url_extract: 'extract_job_url',
    download: 'download_document',
    copy_text: 'copy_document_text',
    file_upload: 'upload_document',
  };
  trackGa4Event(ga4Map[event], {
    device_type: isMobile ? 'mobile' : 'desktop',
    language_mode: lang,
    ...(detail ? { action_detail: detail.slice(0, 40) } : {}),
  });
}

export async function trackAppEvent(
  event: TrackableEventType,
  details?: { language?: string; detail?: string; skipServer?: boolean }
): Promise<void> {
  try {
    const clientId = getAnonymousClientId();
    const isMobile = isMobileDevice();
    const lang = normalizeLang(details?.language);

    // 1. Forward vers Google Analytics 4 si actif
    forwardEventToGa4(event, isMobile, lang, details?.detail);

    // 2. Persistance Cloud Firestore (survit aux redémarrages Cloud Run)
    const firestorePromise = persistEventToFirestore(event, clientId, isMobile, lang);

    // 3. Relais serveur local (secours temps réel)
    const serverPromise = details?.skipServer
      ? Promise.resolve()
      : fetch('/api/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event,
            clientId,
            isMobile,
            language: lang,
            detail: details?.detail,
          }),
        }).catch(() => undefined);

    await Promise.allSettled([firestorePromise, serverPromise]);
  } catch {
    // Échec silencieux pour ne jamais perturber l'utilisateur
  }
}

export async function fetchServerStats(): Promise<AppStatsData | null> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;
    return {
      ...data.data,
      totalCopies: data.data.totalCopies || 0,
      totalUploads: data.data.totalUploads || 0,
      activeToday: {
        visits: data.data.activeToday?.visits || 0,
        analyses: data.data.activeToday?.analyses || 0,
        downloads: data.data.activeToday?.downloads || 0,
        urls: data.data.activeToday?.urls || 0,
        copies: data.data.activeToday?.copies || 0,
        uploads: data.data.activeToday?.uploads || 0,
      },
      persistenceSource: 'server',
    };
  } catch {
    return null;
  }
}

export async function fetchPersistentFirestoreStats(): Promise<AppStatsData> {
  if (!auth.currentUser) {
    throw new Error('Authentification Google Admin requise pour lire les statistiques persistantes.');
  }

  const dailyPath = 'analytics_daily';
  const visitorsPath = 'analytics_visitors';
  const today = getUtcDateKey();

  let dailyDocs;
  try {
    const q = query(collection(db, dailyPath), orderBy('dateKey', 'desc'), limit(90));
    dailyDocs = await getDocs(q);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, dailyPath);
  }

  let uniqueVisitors = 0;
  try {
    const countSnap = await getCountFromServer(collection(db, visitorsPath));
    uniqueVisitors = countSnap.data().count;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, visitorsPath);
  }

  let totalVisits = 0;
  let totalAnalyses = 0;
  let totalUrlExtractions = 0;
  let totalDownloads = 0;
  let totalCopies = 0;
  let totalUploads = 0;
  let mobileEvents = 0;
  let desktopEvents = 0;
  let langFr = 0;
  let langEn = 0;
  let firstSeen = new Date().toISOString();
  let lastActive = new Date().toISOString();

  const dailyHistory: DailyMetricPoint[] = [];
  let activeToday = { visits: 0, analyses: 0, downloads: 0, urls: 0, copies: 0, uploads: 0 };

  dailyDocs.forEach((snap) => {
    const d = snap.data();
    const dateKey = String(d.dateKey || snap.id);
    const visits = Number(d.visits) || 0;
    const analyses = Number(d.analyses) || 0;
    const urls = Number(d.urls) || 0;
    const downloads = Number(d.downloads) || 0;
    const copies = Number(d.copies) || 0;
    const uploads = Number(d.uploads) || 0;

    totalVisits += visits;
    totalAnalyses += analyses;
    totalUrlExtractions += urls;
    totalDownloads += downloads;
    totalCopies += copies;
    totalUploads += uploads;
    mobileEvents += Number(d.mobileEvents) || 0;
    desktopEvents += Number(d.desktopEvents) || 0;
    langFr += Number(d.langFr) || 0;
    langEn += Number(d.langEn) || 0;

    dailyHistory.push({ dateKey, visits, analyses, urls, downloads, copies, uploads });

    if (dateKey === today) {
      activeToday = { visits, analyses, downloads, urls, copies, uploads };
    }
  });

  if (dailyHistory.length > 0) {
    lastActive = dailyHistory[0].dateKey;
    firstSeen = dailyHistory[dailyHistory.length - 1].dateKey;
  }

  return {
    totalVisits,
    uniqueVisitors: Math.max(uniqueVisitors, totalVisits > 0 ? 1 : 0),
    totalAnalyses,
    totalUrlExtractions,
    totalDownloads,
    totalCopies,
    totalUploads,
    devices: { mobile: mobileEvents, desktop: desktopEvents },
    languages: { fr: langFr, en: langEn },
    activeToday,
    dailyHistory,
    persistenceSource: 'firestore',
    firstSeen,
    lastActive,
  };
}

export async function fetchAppStats(): Promise<AppStatsData | null> {
  if (auth.currentUser) {
    try {
      return await fetchPersistentFirestoreStats();
    } catch {
      // Bascule transparente si l'utilisateur connecté n'est pas l'administrateur vérifié
    }
  }
  return fetchServerStats();
}

export async function fetchGa4Config(): Promise<Ga4RuntimeConfig> {
  const path = 'app_config/analytics';
  try {
    const snap = await getDoc(doc(db, 'app_config', 'analytics'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        ga4MeasurementId: typeof data.ga4MeasurementId === 'string' ? data.ga4MeasurementId : '',
        ga4Enabled: Boolean(data.ga4Enabled),
      };
    }
    return { ga4MeasurementId: '', ga4Enabled: false };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveGa4Config(
  measurementId: string,
  enabled: boolean
): Promise<Ga4RuntimeConfig> {
  const cleanId = measurementId.trim().toUpperCase();
  if (cleanId.length > 24 || (cleanId !== '' && !isValidGa4MeasurementId(cleanId))) {
    throw new Error('Format invalide. Utilisez un identifiant GA4 officiel de type G-XXXXXXXXXX.');
  }

  const effectiveEnabled = enabled && cleanId !== '';
  const path = 'app_config/analytics';
  try {
    await setDoc(doc(db, 'app_config', 'analytics'), {
      ga4MeasurementId: cleanId,
      ga4Enabled: effectiveEnabled,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  if (effectiveEnabled && cleanId) {
    initGa4(cleanId);
  }

  return { ga4MeasurementId: cleanId, ga4Enabled: effectiveEnabled };
}
