// ============================================================
// main.js — App entry point: event listeners & filter chips
// ============================================================

import { loginOnline, logout, startOfflineMode } from './auth.js';
import { selectedSet, currentFilter, setCurrentFilter, punchItems } from './database.js';
import { renderAll } from './render.js';
import { openAdd, closeAdd, openExportSheet, closeExport, closePreviewModal, showToast, selectAllToggle, deleteSelected } from './ui.js';
import { createNewItem } from './items.js';
import { previewPDF, downloadPDF } from './pdf.js';

// ── Auth ──────────────────────────────────────────────────
document.getElementById('online-login-btn').onclick = async () => {
  const pwd = document.getElementById('login-password').value;
  try {
    await loginOnline(pwd);
  } catch (e) {
    document.getElementById('gate-err').innerText = e.message;
  }
};
document.getElementById('offline-mode-btn').onclick = () => startOfflineMode();
document.getElementById('logoutBtn').onclick         = () => logout();

// ── Add item ──────────────────────────────────────────────
document.getElementById('addFab').onclick     = openAdd;
document.getElementById('addItemBtn').onclick = createNewItem;

// Photo preview in add sheet
document.getElementById('f-photo-in').addEventListener('change', e => {
  const preview = document.getElementById('photo-in-preview');
  if (e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = ev =>
      (preview.innerHTML = `<img src="${ev.target.result}" style="max-width:80px;border-radius:6px;margin-top:4px">`);
    reader.readAsDataURL(e.target.files[0]);
  } else {
    preview.innerHTML = '';
  }
});

// ── PDF export ────────────────────────────────────────────
document.getElementById('exportPdfBtn').onclick    = openExportSheet;
document.getElementById('previewPdfBtn').onclick   = previewPDF;
document.getElementById('downloadPdfBtn').onclick  = downloadPDF;
document.getElementById('closePreviewBtn').onclick = closePreviewModal;

// ── Bulk actions ──────────────────────────────────────────
document.getElementById('selectAllBtn').onclick     = selectAllToggle;
document.getElementById('deleteSelectedBtn').onclick = deleteSelected;

// ── Sheet backdrop dismiss ────────────────────────────────
document.getElementById('exp-backdrop').addEventListener('click', closeExport);
document.getElementById('add-backdrop').addEventListener('click', closeAdd);

// ── Filter chips ──────────────────────────────────────────
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    setCurrentFilter(chip.dataset.filter);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedSet.clear();
    // refreshData is imported lazily to avoid circular dep
    import('./render.js').then(m => m.refreshData());
  });
});
