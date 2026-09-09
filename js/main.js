// ============================================================
// main.js — App entry point: event listeners & filter chips
// ============================================================

import { state, setCurrentFilter } from './state.js?v=8';
import { loginOnline, logout, startOfflineMode, restorePersistedSession } from './auth.js?v=8';
import { openAdd, closeAdd, openExportSheet, closeExport, closePreviewModal, selectAllToggle, deleteSelected, openEditSheet, closeEdit, saveEdit, confirmMassDelete, closeMassDelete, openAuditLog, closeAuditLog } from './ui.js?v=8';
import { createNewItem } from './items.js?v=8';
import { previewPDF, downloadPDF } from './pdf.js?v=8';
import { downloadDOCX } from './docx-export.js?v=8';
import { renderAll } from './render.js?v=8';

restorePersistedSession();

// ── Auth ──────────────────────────────────────────────────
document.getElementById('online-login-btn').onclick = async () => {
  const pwd = document.getElementById('login-password').value;
  const name = document.getElementById('login-name').value;
  await loginOnline(pwd, name); // errors shown in gate-err by loginOnline
};

document.getElementById('offline-mode-btn').onclick = () => startOfflineMode(document.getElementById('login-name').value);
document.getElementById('logoutBtn').onclick         = () => logout();
document.getElementById('auditLogBtn').onclick       = openAuditLog;
document.getElementById('audit-backdrop').addEventListener('click', closeAuditLog);
document.getElementById('closeAuditBtn').onclick = closeAuditLog;

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

// ── DOCX export ───────────────────────────────────────────
document.getElementById('exportDocxBtn').onclick = downloadDOCX;

// ── Bulk actions ──────────────────────────────────────────
document.getElementById('selectAllBtn').onclick      = selectAllToggle;
document.getElementById('editSelectedBtn').onclick   = openEditSheet;
document.getElementById('deleteSelectedBtn').onclick = deleteSelected;
document.getElementById('confirmMassDeleteBtn').onclick = confirmMassDelete;
document.getElementById('mass-delete-backdrop').addEventListener('click', closeMassDelete);

// ── Edit sheet ────────────────────────────────────────────
document.getElementById('saveEditBtn').onclick = saveEdit;

// ── Sheet backdrop dismiss ────────────────────────────────
document.getElementById('exp-backdrop').addEventListener('click', closeExport);
document.getElementById('add-backdrop').addEventListener('click', closeAdd);
document.getElementById('edit-backdrop').addEventListener('click', closeEdit);

// ── Filter chips ──────────────────────────────────────────
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.classList.toggle('active', chip.dataset.filter === state.currentFilter);
  chip.addEventListener('click', () => {
    setCurrentFilter(chip.dataset.filter);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.selectedSet.clear();
    renderAll();
  });
});
