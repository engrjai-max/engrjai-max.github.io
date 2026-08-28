// ============================================================
// ui.js — Toast, sheet controls, select-all, delete selected
// ============================================================

import { state, getLastInspectionDate, todayISO } from './state.js?v=5';
import { deleteOnlineItems, deleteOfflineItems, getOfflineItems, updateOnlineItem, updateOfflineItem } from './database.js?v=5';
import { loadOnlineDataAndRender } from './auth.js?v=5';
import { renderAll, updateSelectAllUI, refreshData } from './render.js?v=5';

// Safe DOM helpers — never throw if an element is missing (e.g. stale cached HTML)
function $(id) { return document.getElementById(id); }
function setVal(id, val) { const el = $(id); if (el) el.value = val; }

// ── Toast ─────────────────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toastMsg');
  t.innerText     = msg;
  t.style.opacity = '1';
  setTimeout(() => (t.style.opacity = '0'), 2500);
}

// ── Add Sheet ─────────────────────────────────────────────
export function openAdd() {
  setVal('f-date', getLastInspectionDate() || todayISO());
  document.getElementById('add-backdrop').classList.add('open');
  document.getElementById('add-sheet').classList.add('open');
}

export function closeAdd() {
  document.getElementById('add-backdrop').classList.remove('open');
  document.getElementById('add-sheet').classList.remove('open');
  document.getElementById('f-photo-in').value = '';
  document.getElementById('photo-in-preview').innerHTML = '';
}

// ── Edit Sheet ────────────────────────────────────────────
export function openEditSheet() {
  try {
    const ids = Array.from(state.selectedSet);
    if (ids.length !== 1) {
      alert(ids.length === 0 ? 'Select an item to edit.' : 'Select only one item to edit at a time.');
      return;
    }
    const item = state.punchItems.find(i => String(i.id) === String(ids[0]));
    if (!item) {
      alert('Could not find the selected item. Try refreshing and selecting again.');
      return;
    }

    state.editingId = item.id;
    setVal('e-desc',  item.desc || '');
    setVal('e-loc',   item.location || '');
    setVal('e-date',  (item.inspectionDate || '').slice(0, 10));
    setVal('e-notes', item.remarks || '');

    if (!$('e-date')) {
      console.warn('e-date field not found — the deployed index.html may be out of date. Hard-refresh the page.');
    }

    document.getElementById('edit-backdrop').classList.add('open');
    document.getElementById('edit-sheet').classList.add('open');
  } catch (e) {
    console.error('openEditSheet failed:', e);
    alert('❌ Edit failed to open: ' + e.message);
  }
}

export function closeEdit() {
  state.editingId = null;
  document.getElementById('edit-backdrop').classList.remove('open');
  document.getElementById('edit-sheet').classList.remove('open');
}

export async function saveEdit() {
  const id = state.editingId;
  if (!id) return;

  const desc    = ($('e-desc')?.value || '').trim();
  const loc     = ($('e-loc')?.value || '').trim();
  const dateEl  = $('e-date');
  const date    = dateEl ? dateEl.value : '';
  const notes   = ($('e-notes')?.value || '').trim();

  if (!desc || !loc || (dateEl && !date)) {
    alert('Description, location and inspection date are required.');
    return;
  }

  const btn = document.getElementById('saveEditBtn');
  btn.disabled  = true;
  btn.innerText = 'Saving…';

  try {
    const updates = { desc, location: loc, remarks: notes };
    if (dateEl) updates.inspectionDate = date; // only touch date if the field actually exists on this page

    if (state.currentMode === 'online') {
      const onlineUpdates = { description: desc, location: loc, remarks: notes };
      if (dateEl) onlineUpdates.inspection_date = date;
      await updateOnlineItem(id, onlineUpdates);
    } else {
      await updateOfflineItem(id, updates);
    }
    closeEdit();
    state.selectedSet.clear();
    await refreshData();
    showToast('✓ Item updated');
  } catch (e) {
    alert('❌ Error: ' + e.message);
  } finally {
    btn.disabled  = false;
    btn.innerText = 'Save Changes';
  }
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
