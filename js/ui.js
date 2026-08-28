// ============================================================
// ui.js — Toast, sheet controls, select-all, delete selected
// ============================================================

import { state, getLastInspectionDate, todayISO } from './state.js?v=3';
import { deleteOnlineItems, deleteOfflineItems, getOfflineItems, updateOnlineItem, updateOfflineItem } from './database.js?v=3';
import { loadOnlineDataAndRender } from './auth.js?v=3';
import { renderAll, updateSelectAllUI, refreshData } from './render.js?v=3';

// ── Toast ─────────────────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toastMsg');
  t.innerText     = msg;
  t.style.opacity = '1';
  setTimeout(() => (t.style.opacity = '0'), 2500);
}

// ── Add Sheet ─────────────────────────────────────────────
export function openAdd() {
  document.getElementById('f-date').value = getLastInspectionDate() || todayISO();
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
    document.getElementById('e-desc').value  = item.desc || '';
    document.getElementById('e-loc').value   = item.location || '';
    document.getElementById('e-date').value  = (item.inspectionDate || '').slice(0, 10);
    document.getElementById('e-notes').value = item.remarks || '';

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
  const id   = state.editingId;
  if (!id) return;

  const desc = document.getElementById('e-desc').value.trim();
  const loc  = document.getElementById('e-loc').value.trim();
  const date = document.getElementById('e-date').value;
  const notes = document.getElementById('e-notes').value.trim();

  if (!desc || !loc || !date) {
    alert('Description, location and inspection date are required.');
    return;
  }

  const btn = document.getElementById('saveEditBtn');
  btn.disabled  = true;
  btn.innerText = 'Saving…';

  try {
    if (state.currentMode === 'online') {
      await updateOnlineItem(id, { description: desc, location: loc, inspection_date: date, remarks: notes });
    } else {
      await updateOfflineItem(id, { desc, location: loc, inspectionDate: date, remarks: notes });
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
