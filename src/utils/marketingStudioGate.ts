/**
 * Garde d'environnement : les studios marketing (vidéos, carrousels, kits J-7 à J+30)
 * restent strictement réservés à AI Studio et au développement local.
 * En production (ex. jnbalign.com), cette fonction retourne false afin qu'aucun module
 * marketing ne soit téléchargé, affiché ni exécuté côté utilisateur ou administrateur.
 */
export function isAiStudioMarketingEnvironment(): boolean {
  try {
    const forceFlag = (import.meta.env?.VITE_ENABLE_MARKETING_STUDIO as string | undefined) || '';
    if (forceFlag.toLowerCase() === 'true') return true;
    if (forceFlag.toLowerCase() === 'false') return false;

    if (typeof window === 'undefined') {
      return Boolean(import.meta.env?.DEV);
    }

    const host = (window.location.hostname || '').toLowerCase();

    // Production publique : jamais activé
    if (host === 'jnbalign.com' || host.endsWith('.jnbalign.com')) {
      return false;
    }

    // Développement local
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return true;
    }

    // Prévisualisations AI Studio uniquement (ais-dev-*.run.app / ais-pre-*.run.app / aistudio / usercontent)
    if (
      /^ais-(dev|pre)-.+\.run\.app$/i.test(host) ||
      host.endsWith('.aistudio.google.com') ||
      host.endsWith('.usercontent.goog')
    ) {
      return true;
    }

    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}
