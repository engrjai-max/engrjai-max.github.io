// ============================================================
// state.js — Centralised mutable app state (single source of truth)
// All modules read and write through this object so live values
// are always visible across the module graph.
// ============================================================

export const state = {
  currentMode:     'offline', // 'online' | 'offline'
  punchItems:      [],
  selectedSet:     new Set(),
  currentFilter:   'all',
  realtimeChannel: null,
  editingId:       null, // id of the item currently open in the Edit sheet
  actorName:       '',
  sessionId:       crypto.randomUUID(),
};

export function setActorName(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 120) throw new Error('Enter your full name before continuing.');
  state.actorName = cleaned;
  try { sessionStorage.setItem('tsdci_actor_name', cleaned); } catch (_) { /* session-only is intentional */ }
}

export function restoreActorName() {
  try { return sessionStorage.getItem('tsdci_actor_name') || ''; } catch (_) { return ''; }
}

// ── Remembered "last inspection date" (for pre-filling new items) ──
const LAST_DATE_KEY = 'tsdci_last_inspection_date';

export function getLastInspectionDate() {
  try {
    return localStorage.getItem(LAST_DATE_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function rememberInspectionDate(dateStr) {
  try {
    localStorage.setItem(LAST_DATE_KEY, dateStr);
  } catch (e) { /* ignore storage errors (e.g. private browsing) */ }
}

export function todayISO() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
