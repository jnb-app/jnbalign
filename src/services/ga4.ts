/**
 * Intégration prête à l'emploi Google Analytics 4 (GA4) — 100% gratuite.
 * Supporte à la fois :
 * 1. Variable d'environnement VITE_GA4_MEASUREMENT_ID (build-time)
 * 2. Configuration persistante Firestore (app_config/analytics) modifiable depuis l'Espace Admin sans redéploiement.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const GA4_ID_REGEX = /^G-[A-Z0-9]{6,16}$/;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __jnbGa4ActiveId?: string;
  }
}

export function isValidGa4MeasurementId(id: string): boolean {
  return GA4_ID_REGEX.test(id.trim().toUpperCase());
}

export function getEnvGa4MeasurementId(): string {
  try {
    const raw = (import.meta.env?.VITE_GA4_MEASUREMENT_ID as string | undefined) || '';
    const cleaned = raw.trim().toUpperCase();
    return isValidGa4MeasurementId(cleaned) ? cleaned : '';
  } catch {
    return '';
  }
}

export function getActiveGa4Id(): string {
  if (typeof window === 'undefined') return '';
  return window.__jnbGa4ActiveId || '';
}

export function initGa4(measurementId: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const cleanId = measurementId.trim().toUpperCase();
  if (!isValidGa4MeasurementId(cleanId)) return false;

  if (window.__jnbGa4ActiveId === cleanId && typeof window.gtag === 'function') {
    return true;
  }

  // Injecter le script gtag.js officiel une seule fois pour cet identifiant
  const scriptId = `jnb-ga4-script-${cleanId}`;
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  window.gtag('js', new Date());
  window.gtag('config', cleanId, {
    anonymize_ip: true,
    send_page_view: true,
    transport_type: 'beacon',
  });
  window.__jnbGa4ActiveId = cleanId;
  return true;
}

export async function loadAndInitGa4FromConfig(): Promise<string> {
  // 1. Priorité à la configuration dynamique Firestore (modifiable en 1 clic dans l'Admin)
  try {
    const snap = await getDoc(doc(db, 'app_config', 'analytics'));
    if (snap.exists()) {
      const data = snap.data();
      const id = typeof data?.ga4MeasurementId === 'string' ? data.ga4MeasurementId.trim().toUpperCase() : '';
      const enabled = data?.ga4Enabled === true;
      if (enabled && isValidGa4MeasurementId(id)) {
        initGa4(id);
        return id;
      }
      // Si désactivé explicitement dans l'Admin, ne pas forcer l'env
      if (data?.ga4Enabled === false) {
        return '';
      }
    }
  } catch {
    // Fallback silencieux sur la variable d'environnement si hors-ligne
  }

  // 2. Fallback sur VITE_GA4_MEASUREMENT_ID si renseigné
  const envId = getEnvGa4MeasurementId();
  if (envId) {
    initGa4(envId);
    return envId;
  }

  return '';
}

export function trackGa4Event(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !window.__jnbGa4ActiveId) {
    return;
  }
  try {
    window.gtag('event', eventName, params || {});
  } catch {
    // Échec silencieux
  }
}
