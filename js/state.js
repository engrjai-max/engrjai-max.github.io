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
};

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
