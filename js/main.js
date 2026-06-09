// ============================================================
// main.js — App entry point: event listeners & filter chips
// ============================================================

import { state } from './state.js';
import { loginOnline, logout, startOfflineMode } from './auth.js';
import { openAdd, closeAdd, openExportSheet, closeExport, closePreviewModal, showToast, selectAllToggle, deleteSelected } from './ui.js';
import { createNewItem } from './items.js';
import { previewPDF, downloadPDF } from './pdf.js';
import { refreshData } from './render.js';

// ── Auth ──────────────────────────────────────────────────
document.getElementById('online-login-btn').onclick = async () => {
  const pwd = document.getElementById('login-password').value;
  await loginOnline(pwd); // errors shown in gate-err by loginOnline
};

document.getElementById('offline-mode-btn').onclick = () => startOfflineMode();
document.getElementById('logoutBtn').onclick         = () => logout();

// ── Add item ──────────────────────────────────────────────
document.getElementById('addFab').onclick     = openAdd;
document.getElementById('addItemBtn').onclick = createNewItem;

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
document.getElementById('selectAllBtn').onclick      = selectAllToggle;
document.getElementById('deleteSelectedBtn').onclick = deleteSelected;

// ── Sheet backdrop dismiss ────────────────────────────────
document.getElementById('exp-backdrop').addEventListener('click', closeExport);
document.getElementById('add-backdrop').addEventListener('click', closeAdd);

// ── Filter chips ──────────────────────────────────────────
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    state.currentFilter = chip.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedSet.clear();
    refreshData();
  });
});
