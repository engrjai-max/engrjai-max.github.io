// ============================================================
// auth.js — Login (online), logout, offline mode entry
// ============================================================

import { supabaseClient } from './storage.js';
import { SHARED_EMAIL } from './config.js';
import {
  currentMode, realtimeChannel,
  setCurrentMode, setPunchItems, selectedSet,
  setSyncStatus, fetchOnlineItems, getOfflineItems,
  subscribeToRealtime,
} from './database.js';
import { renderAll } from './render.js';
import { showToast } from './ui.js';

export async function loginOnline(password) {
  setSyncStatus('syncing');
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: SHARED_EMAIL,
    password,
  });
  if (error) throw new Error(error.message);

  setCurrentMode('online');
  await loadOnlineDataAndRender();
  subscribeToRealtime(() => loadOnlineDataAndRender());

  document.getElementById('gate').style.display     = 'none';
  document.getElementById('main-app').style.display = 'block';
  setSyncStatus('online');
  showToast('✅ Online mode active');
}

export async function logout() {
  if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  await supabaseClient.auth.signOut();

  setCurrentMode('offline');
  setPunchItems([]);
  selectedSet.clear();

  document.getElementById('main-app').style.display = 'none';
  document.getElementById('gate').style.display     = 'flex';
  setSyncStatus('online');
}

export async function startOfflineMode() {
  setCurrentMode('offline');
  const offlineItems = await getOfflineItems();
  setPunchItems(offlineItems);
  renderAll();

  document.getElementById('gate').style.display     = 'none';
  document.getElementById('main-app').style.display = 'block';
  setSyncStatus('online');
  showToast('📴 Offline mode - data stays on device');
}

export async function loadOnlineDataAndRender() {
  try {
    const items = await fetchOnlineItems();
    setPunchItems(items);
    renderAll();
  } catch (e) {
    showToast('Sync error: ' + e.message);
    setSyncStatus('error');
  }
}
