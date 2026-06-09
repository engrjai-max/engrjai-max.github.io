// ============================================================
// ui.js — Toast, sheet controls, select-all, delete selected
// ============================================================

import {
  currentMode, selectedSet, punchItems,
  deleteOnlineItems, deleteOfflineItems,
  getOfflineItems, setPunchItems,
} from './database.js';
import { loadOnlineDataAndRender } from './auth.js';
import { renderAll, updateSelectAllUI } from './render.js';

// ── Toast ─────────────────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toastMsg');
  t.innerText    = msg;
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
  const { currentFilter } = await import('./database.js'); // lazy re-import for live value
  const filtered = currentFilter === 'all'
    ? punchItems
    : punchItems.filter(i => i.status === currentFilter);
  const allSelected = filtered.length && filtered.every(i => selectedSet.has(i.id));
  filtered.forEach(i => allSelected ? selectedSet.delete(i.id) : selectedSet.add(i.id));
  renderAll();
}

// ── Delete selected ───────────────────────────────────────
export async function deleteSelected() {
  const ids = Array.from(selectedSet);
  if (!ids.length) { alert('No items selected'); return; }
  if (!confirm(`Delete ${ids.length} item(s)?`)) return;

  if (currentMode === 'online') {
    await deleteOnlineItems(ids, punchItems);
    await loadOnlineDataAndRender();
  } else {
    await deleteOfflineItems(ids);
    const items = await getOfflineItems();
    setPunchItems(items);
    renderAll();
  }
  selectedSet.clear();
  renderAll();
}
