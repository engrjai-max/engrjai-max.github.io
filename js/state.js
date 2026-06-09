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
};
