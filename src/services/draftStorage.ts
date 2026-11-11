import { PipelineResult } from '../types/ats';

export interface AppDraftState {
  cvText: string;
  cvFileName: string | null;
  cvTab: 'upload' | 'text';
  jobText: string;
  jobFileName: string | null;
  jobTab: 'upload' | 'text' | 'url';
  targetRoleTitle: string;
  candidateNotes: string;
  targetLanguage: 'auto' | 'fr' | 'en';
  currentStep: number;
  result: PipelineResult | null;
  activeView: 'portail' | 'studio';
  savedAt: number;
}

const DRAFT_STORAGE_KEY = 'jnb_align_active_draft_v1';

export function saveActiveDraft(draft: Omit<AppDraftState, 'savedAt'>): void {
  try {
    const hasData = Boolean(
      (draft.cvText && draft.cvText.trim().length > 0) ||
      (draft.jobText && draft.jobText.trim().length > 0) ||
      draft.result ||
      (draft.targetRoleTitle && draft.targetRoleTitle.trim().length > 0)
    );
    if (!hasData) return;

    const payload: AppDraftState = {
      ...draft,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Impossible de sauvegarder le brouillon local :', err);
  }
}

export function loadActiveDraft(): AppDraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: AppDraftState = JSON.parse(raw);
    // Expiration après 7 jours
    if (parsed.savedAt && Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
      clearActiveDraft();
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('Impossible de charger le brouillon local :', err);
    return null;
  }
}

export function clearActiveDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.warn('Impossible de supprimer le brouillon local :', err);
  }
}
