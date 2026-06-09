// ============================================================
// ui.js — Toast, sheet controls, select-all, delete selected
// ============================================================

import { state } from './state.js';
import { deleteOnlineItems, deleteOfflineItems, getOfflineItems } from './database.js';
import { loadOnlineDataAndRender } from './auth.js';
import { renderAll, updateSelectAllUI } from './render.js';

// ── Toast ─────────────────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toastMsg');
  t.innerText     = msg;
  t.style.opacity = '1';
  setTimeout(() => (t.style.opacity = '0'), 2500);
}

// ── Add Sheet ─────────────────────────────────────────────
export function openAdd() {
  document.getElementById('add-backdrop').classList.add('open');
  document.getElementById('add-sheet').classList.add('open');
}

export function closeAdd() {
  document.getElementById('add-backdrop').classList.remove('open');
  document.getElementById('add-sheet').classList.remove('open');
  document.getElementById('f-photo-in').value = '';
  document.getElementById('photo-in-preview').innerHTML = '';
}

// ── Export Sheet ──────────────────────────────────────────
export function openExportSheet() {
  document.getElementById('exp-backdrop').classList.add('open');
  document.getElementById('exp-sheet').classList.add('open');
  document.getElementById('exp-date').valueAsDate = new Date();
}

export function closeExport() {
  document.getElementById('exp-backdrop').classList.remove('open');
  document.getElementById('exp-sheet').classList.remove('open');
}

// ── Preview Modal ─────────────────────────────────────────
export function closePreviewModal() {
  document.getElementById('preview-modal').classList.remove('open');
}

// ── Select-all toggle ─────────────────────────────────────
export function selectAllToggle() {
  const { punchItems, currentFilter, selectedSet } = state;
  const filtered = currentFilter === 'all'
    ? punchItems
    : punchItems.filter(i => i.status === currentFilter);
  const allSelected = filtered.length && filtered.every(i => selectedSet.has(i.id));
  filtered.forEach(i => allSelected ? selectedSet.delete(i.id) : selectedSet.add(i.id));
  renderAll();
}

// ── Delete selected ───────────────────────────────────────
export async function deleteSelected() {
  const ids = Array.from(state.selectedSet);
  if (!ids.length) { alert('No items selected'); return; }
  if (!confirm(`Delete ${ids.length} item(s)?`)) return;

  if (state.currentMode === 'online') {
    await deleteOnlineItems(ids, state.punchItems);
    await loadOnlineDataAndRender();
  } else {
    await deleteOfflineItems(ids);
    state.punchItems = await getOfflineItems();
    renderAll();
  }
  state.selectedSet.clear();
  renderAll();
}
