// ============================================================
// items.js — Create new punch item (form logic)
// ============================================================

import { currentMode, setSyncStatus, addOnlineItem, addOfflineItem, getOfflineItems, setPunchItems } from './database.js';
import { loadOnlineDataAndRender } from './auth.js';
import { renderAll } from './render.js';
import { closeAdd, showToast } from './ui.js';

export async function createNewItem() {
  const desc   = document.getElementById('f-desc').value.trim();
  const loc    = document.getElementById('f-loc').value.trim();
  const pri    = document.getElementById('f-pri').value;
  const status = document.getElementById('f-status').value;
  const notes  = document.getElementById('f-notes').value.trim();
  const file   = document.getElementById('f-photo-in').files[0];

  if (!desc || !loc || !file) {
    alert('Description, location and inspection photo required.');
    return;
  }

  const btn     = document.getElementById('addItemBtn');
  const progDiv = document.getElementById('upload-progress-insp');
  btn.disabled  = true;
  btn.innerText = 'Processing…';
  progDiv.style.display = 'block';

  try {
    if (currentMode === 'online') {
      setSyncStatus('syncing');
      await addOnlineItem({ desc, location: loc, priority: pri, status, remarks: notes }, file);
      await loadOnlineDataAndRender();
    } else {
      const base64 = await new Promise(res => {
        const rd = new FileReader();
        rd.onload = () => res(rd.result);
        rd.readAsDataURL(file);
      });
      await addOfflineItem({ desc, location: loc, priority: pri, status, remarks: notes }, base64);
      const items = await getOfflineItems();
      setPunchItems(items);
      renderAll();
    }
    closeAdd();
    showToast('✓ Item created');
  } catch (e) {
    alert('Error: ' + e.message);
    setSyncStatus('error');
  } finally {
    btn.disabled  = false;
    btn.innerText = 'Create Item';
    progDiv.style.display = 'none';
  }
}
