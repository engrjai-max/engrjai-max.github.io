// ============================================================
// state.js — Centralised mutable app state (single source of truth)
// All modules read and write through this object so live values
// are always visible across the module graph.
// ============================================================

export const state = {
  currentMode:     'offline', // 'online' | 'offline'
  punchItems:      [],
  selectedSet:     new Set(),
  currentFilter:   restoreFilter(),
  realtimeChannel: null,
  editingId:       null, // id of the item currently open in the Edit sheet
  actorName:       '',
  sessionId:       crypto.randomUUID(),
};

export function setActorName(name) {
  const cleaned = String(name || '').trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 120) throw new Error('Enter your full name before continuing.');
  state.actorName = cleaned;
  try { localStorage.setItem('tsdci_actor_name', cleaned); } catch (_) { /* storage may be unavailable */ }
}

export function restoreActorName() {
  try { return localStorage.getItem('tsdci_actor_name') || ''; } catch (_) { return ''; }
}

const FILTER_KEY = 'tsdci_current_filter';
const VALID_FILTERS = new Set(['all', 'OPEN', 'IN PROGRESS', 'FOR VERIFICATION', 'CLOSED', 'VOIDED']);

export function restoreFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    return VALID_FILTERS.has(saved) ? saved : 'all';
  } catch (_) {
    return 'all';
  }
}

export function setCurrentFilter(filter) {
  state.currentFilter = VALID_FILTERS.has(filter) ? filter : 'all';
  try { localStorage.setItem(FILTER_KEY, state.currentFilter); } catch (_) { /* storage may be unavailable */ }
}

const MODE_KEY = 'tsdci_last_mode';

export function rememberMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode); } catch (_) { /* storage may be unavailable */ }
}

export function restoreMode() {
  try { return localStorage.getItem(MODE_KEY) || ''; } catch (_) { return ''; }
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
