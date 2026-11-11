export interface AppStatsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalAnalyses: number;
  totalUrlExtractions: number;
  totalDownloads: number;
  devices: { mobile: number; desktop: number };
  languages: { fr: number; en: number };
  activeToday: { visits: number; analyses: number; downloads: number; urls: number };
  firstSeen: string;
  lastActive: string;
}

const CLIENT_ID_KEY = 'jnb_anon_client_id_v1';

export function getAnonymousClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon_guest';
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

export async function trackAppEvent(
  event: 'visit' | 'pipeline_launch' | 'url_extract' | 'download',
  details?: { language?: string }
): Promise<void> {
  try {
    const clientId = getAnonymousClientId();
    const isMobile = isMobileDevice();

    await fetch('/api/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        clientId,
        isMobile,
        language: details?.language,
      }),
    });
  } catch {
    // Échec silencieux
  }
}

export async function fetchAppStats(): Promise<AppStatsData | null> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}
