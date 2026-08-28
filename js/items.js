// ============================================================
// items.js — Create new punch item (form logic)
// ============================================================

import { state, rememberInspectionDate } from './state.js?v=4';
import { setSyncStatus, addOnlineItem, addOfflineItem, getOfflineItems } from './database.js?v=4';
import { loadOnlineDataAndRender } from './auth.js?v=4';
import { renderAll } from './render.js?v=4';
import { closeAdd, showToast } from './ui.js?v=4';

export async function createNewItem() {
  const desc     = document.getElementById('f-desc').value.trim();
  const loc      = document.getElementById('f-loc').value.trim();
  const dateEl   = document.getElementById('f-date');
  const date     = dateEl ? dateEl.value : '';
  const pri      = document.getElementById('f-pri').value;
  const status   = document.getElementById('f-status').value;
  const notes    = document.getElementById('f-notes').value.trim();
  const file     = document.getElementById('f-photo-in').files[0];

  if (!desc || !loc || (dateEl && !date) || !file) {
    alert('Description, location, inspection date and inspection photo are required.');
    return;
  }

  const btn     = document.getElementById('addItemBtn');
  const progDiv = document.getElementById('upload-progress-insp');
  btn.disabled  = true;
  btn.innerText = 'Processing…';
  progDiv.style.display = 'block';

  try {
    if (state.currentMode === 'online') {
      setSyncStatus('syncing');
      await addOnlineItem({ desc, location: loc, priority: pri, status, remarks: notes, inspectionDate: date }, file);
      await loadOnlineDataAndRender();
    } else {
      const base64 = await new Promise(res => {
        const rd = new FileReader();
        rd.onload = () => res(rd.result);
        rd.readAsDataURL(file);
      });
      await addOfflineItem({ desc, location: loc, priority: pri, status, remarks: notes, inspectionDate: date }, base64);
      state.punchItems = await getOfflineItems();
      renderAll();
    }
    if (dateEl && date) rememberInspectionDate(date);
    closeAdd();
    showToast('✓ Item created');
  } catch (e) {
    alert('❌ Error: ' + e.message);
    setSyncStatus('error');
  } finally {
    btn.disabled  = false;
    btn.innerText = 'Create Item';
    progDiv.style.display = 'none';
  }
}
