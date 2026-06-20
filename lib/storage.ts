import { DEFAULT_SETTINGS, Settings } from './phases';

const KEY = 'kriya_settings';

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage not available
  }
}

export function applyDailyBpmIncrement(s: Settings): Settings {
  const today = new Date().toISOString().slice(0, 10);
  if (s.bpmLastUpdated !== today && s.bpmLastUpdated !== '') {
    const updated = { ...s, bpm: s.bpm + 1, bpmLastUpdated: today };
    saveSettings(updated);
    return updated;
  }
  if (s.bpmLastUpdated === '') {
    const updated = { ...s, bpmLastUpdated: today };
    saveSettings(updated);
    return updated;
  }
  return s;
}
