import { PipelineResult } from '../types/ats';

export interface SavedCandidatureSession {
  id: string;
  savedAt: string;
  roleTitle: string;
  companyName: string;
  candidateName: string;
  atsScore: number;
  initialAtsScore: number;
  cvText: string;
  jobText: string;
  targetRoleTitle: string;
  candidateNotes: string;
  result: PipelineResult;
}

const STORAGE_KEY = 'jnb_align_ats_candidatures_history_v1';
const LEGACY_STORAGE_KEY = 'eden_tech_ats_candidatures_history_v1';

export const getSavedSessions = (): SavedCandidatureSession[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read candidature history from localStorage:', err);
    return [];
  }
};

export const saveCandidatureSession = (
  session: Omit<SavedCandidatureSession, 'id' | 'savedAt'>
): SavedCandidatureSession => {
  try {
    const existing = getSavedSessions();
    const newSession: SavedCandidatureSession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      savedAt: new Date().toISOString(),
    };

    // Keep max 15 sessions in local storage to prevent quota overflow
    const updated = [newSession, ...existing.filter((s) => s.roleTitle !== session.roleTitle || s.companyName !== session.companyName)].slice(0, 15);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newSession;
  } catch (err) {
    console.error('Failed to save candidature session:', err);
    return {
      ...session,
      id: `session_${Date.now()}`,
      savedAt: new Date().toISOString(),
    };
  }
};

export const deleteSavedSession = (id: string): SavedCandidatureSession[] => {
  try {
    const existing = getSavedSessions();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete saved session:', err);
    return [];
  }
};

export const clearAllSavedSessions = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear saved sessions:', err);
  }
};
