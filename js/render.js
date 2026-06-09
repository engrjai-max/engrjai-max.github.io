// ============================================================
// render.js — DOM rendering: list, stats, dynamic events
// ============================================================

import {
  punchItems, selectedSet, currentFilter, currentMode,
  setSyncStatus, updateOnlineItem, updateOfflineItem,
  uploadImage,
} from './database.js';
import { getOfflineItems, setPunchItems } from './database.js';
import { loadOnlineDataAndRender } from './auth.js';
import { showToast } from './ui.js';

// ── Utilities ─────────────────────────────────────────────
export function formatDate(ts) {
  return ts ? new Date(ts).toLocaleDateString('en-PH') : '—';
}

export function escapeHtml(str) {
  return String(str || '').replace(/[&<>]/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]
  );
}

export async function refreshData() {
  if (currentMode === 'online') {
    await loadOnlineDataAndRender();
  } else {
    const items = await getOfflineItems();
    setPunchItems(items);
    renderAll();
  }
}

// ── Main render ───────────────────────────────────────────
export function renderAll() {
  const openCount = punchItems.filter(i => i.status !== 'CLOSED' && i.status !== 'VOIDED').length;
  const highCount = punchItems.filter(i => i.priority === 'H').length;
  const progCount = punchItems.filter(i => i.status === 'IN PROGRESS').length;
  const doneCount = punchItems.filter(i => i.status === 'CLOSED').length;

  document.getElementById('cnt-open').innerText = openCount;
  document.getElementById('cnt-high').innerText = highCount;
  document.getElementById('cnt-prog').innerText = progCount;
  document.getElementById('cnt-done').innerText = doneCount;

  const filtered = currentFilter === 'all'
    ? punchItems
    : punchItems.filter(i => i.status === currentFilter);

  const container = document.getElementById('list');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">📋 No items</div>';
    updateSelectAllUI();
    return;
  }

  container.innerHTML = '';
  filtered.forEach(item => {
    const isChecked   = selectedSet.has(item.id);
    const statusClass = {
      OPEN: 'badge-open',
      'IN PROGRESS': 'badge-progress',
      CLOSED: 'badge-closed',
      VOIDED: 'badge-void',
      'FOR VERIFICATION': 'badge-progress',
    }[item.status] || 'badge-open';
    const priClass = { H: 'badge-critical', M: 'badge-medium', L: 'badge-low' }[item.priority] || 'badge-medium';
    const priLabel = { H: 'HIGH', M: 'MEDIUM', L: 'LOW' }[item.priority];

    const inspThumb = item.inspectionPhoto
      ? `<img src="${item.inspectionPhoto}" class="photo-thumb" onclick="window.open('${item.inspectionPhoto}')">`
      : `<div class="photo-thumb" style="background:var(--surface2);display:flex;align-items:center;justify-content:center">📷</div>`;

    const closeThumb = item.closeoutPhoto
      ? `<img src="${item.closeoutPhoto}" class="photo-thumb" onclick="window.open('${item.closeoutPhoto}')">`
      : `<div class="photo-thumb" style="background:var(--surface2);display:flex;align-items:center;justify-content:center">🔒</div>`;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="item-row">
        <div class="item-check"><input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}></div>
        <div class="item-details">
          <div class="item-desc">${escapeHtml(item.desc)}</div>
          <div class="item-meta">
            <span class="badge badge-gray">📍 ${escapeHtml(item.location)}</span>
            <span class="badge ${priClass}">⚠️ ${priLabel}</span>
            <span class="badge ${statusClass}">${item.status}</span>
            <span class="date-info">📅 ${formatDate(item.createdAt)}${item.closedAt ? ' | ✅ ' + formatDate(item.closedAt) : ''}</span>
          </div>
          ${item.remarks ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">📝 ${escapeHtml(item.remarks)}</div>` : ''}
        </div>
        <div class="status-pri-select">
          <select class="small-select" data-id="${item.id}" data-field="priority">
            <option value="H" ${item.priority === 'H' ? 'selected' : ''}>🔴 High</option>
            <option value="M" ${item.priority === 'M' ? 'selected' : ''}>🟡 Medium</option>
            <option value="L" ${item.priority === 'L' ? 'selected' : ''}>🟢 Low</option>
          </select>
          <select class="small-select" data-id="${item.id}" data-field="status">
            <option value="OPEN"             ${item.status === 'OPEN'             ? 'selected' : ''}>OPEN</option>
            <option value="IN PROGRESS"      ${item.status === 'IN PROGRESS'      ? 'selected' : ''}>IN PROGRESS</option>
            <option value="FOR VERIFICATION" ${item.status === 'FOR VERIFICATION' ? 'selected' : ''}>FOR VERIFICATION</option>
            <option value="CLOSED"           ${item.status === 'CLOSED'           ? 'selected' : ''}>CLOSED</option>
            <option value="VOIDED"           ${item.status === 'VOIDED'           ? 'selected' : ''}>VOIDED</option>
          </select>
        </div>
      </div>
      <div class="photo-strip">
        <div>📸 Insp:</div>${inspThumb}
        <div>🔒 Close-out:</div>${closeThumb}
        <button class="upload-btn-small" data-id="${item.id}" data-action="closeout">Upload Close-out</button>
        <button class="upload-btn-small" data-id="${item.id}" data-action="remarks">Edit Remarks</button>
      </div>`;
    container.appendChild(div);
  });

  attachDynamicEvents();
  updateSelectAllUI();
}

// ── Dynamic event attachment ──────────────────────────────
function attachDynamicEvents() {
  // Checkbox selection
  document.querySelectorAll('.item-check input').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.checked ? selectedSet.add(cb.dataset.id) : selectedSet.delete(cb.dataset.id);
      updateSelectAllUI();
    });
  });

  // Priority change
  document.querySelectorAll('.small-select[data-field="priority"]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { id } = sel.dataset;
      if (currentMode === 'online') await updateOnlineItem(id, { priority: sel.value });
      else                          await updateOfflineItem(id, { priority: sel.value });
      refreshData();
    });
  });

  // Status change
  document.querySelectorAll('.small-select[data-field="status"]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { id } = sel.dataset;
      const newStatus = sel.value;
      const item = punchItems.find(i => i.id === id);
      if (newStatus === 'CLOSED' && !item.closeoutPhoto) {
        alert('❌ Close-out photo required.');
        refreshData();
        return;
      }
      const updates = { status: newStatus };
      if (newStatus === 'CLOSED' && item.status !== 'CLOSED') {
        const remark = prompt('Closing remarks:', item.remarks || '');
        if (remark !== null) updates.remarks = remark;
        updates.closed_at = Date.now();
      }
      if (currentMode === 'online') await updateOnlineItem(id, updates);
      else                          await updateOfflineItem(id, updates);
      refreshData();
    });
  });

  // Close-out photo upload
  document.querySelectorAll('[data-action="closeout"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id } = btn.dataset;
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = 'image/*';
      input.onchange = async (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        showToast('Uploading closeout…');
        try {
          if (currentMode === 'online') {
            setSyncStatus('syncing');
            const { url, path } = await uploadImage(file, `closeout/${id}`);
            await updateOnlineItem(id, { closeout_photo_url: url, closeout_photo_path: path });
          } else {
            const base64 = await new Promise(res => {
              const rd = new FileReader();
              rd.onload = () => res(rd.result);
              rd.readAsDataURL(file);
            });
            await updateOfflineItem(id, { closeoutPhoto: base64 });
          }
          showToast('✅ Close-out saved');
          refreshData();
        } catch (e) {
          showToast('Upload failed');
          setSyncStatus('error');
        }
      };
      input.click();
    });
  });

  // Edit remarks
  document.querySelectorAll('[data-action="remarks"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { id } = btn.dataset;
      const item   = punchItems.find(i => i.id === id);
      const newRem = prompt('Edit remarks', item.remarks || '');
      if (newRem !== null) {
        if (currentMode === 'online') await updateOnlineItem(id, { remarks: newRem });
        else                          await updateOfflineItem(id, { remarks: newRem });
        refreshData();
      }
    });
  });
}

// ── Select-all button UI ──────────────────────────────────
export function updateSelectAllUI() {
  const btn = document.getElementById('selectAllBtn');
  if (!btn) return;
  const filtered = currentFilter === 'all' ? punchItems : punchItems.filter(i => i.status === currentFilter);
  const allSelected = filtered.length && filtered.every(i => selectedSet.has(i.id));
  btn.innerText = allSelected ? '☑ Deselect All' : '☐ Select All';
}
