// ============================================================
// auth.js — Login (online), logout, offline mode entry
// ============================================================

import { supabaseClient } from './storage.js';
import { SHARED_EMAIL } from './config.js';
import { state } from './state.js';
import { setSyncStatus, fetchOnlineItems, subscribeToRealtime, getOfflineItems } from './database.js';
import { renderAll } from './render.js';
import { showToast } from './ui.js';

export async function loginOnline(password) {
  const errEl = document.getElementById('gate-err');
  errEl.innerText = '';
  setSyncStatus('syncing');

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: SHARED_EMAIL,
      password,
    });
    if (error) throw new Error(error.message);

    state.currentMode = 'online';
    await loadOnlineDataAndRender();
    subscribeToRealtime(() => loadOnlineDataAndRender());

    document.getElementById('gate').style.display     = 'none';
    document.getElementById('main-app').style.display = 'block';
    setSyncStatus('online');
    showToast('✅ Online mode active');
  } catch (e) {
    errEl.innerText = '❌ ' + e.message;
    setSyncStatus('error');
  }
}

export async function logout() {
  if (state.realtimeChannel) supabaseClient.removeChannel(state.realtimeChannel);
  await supabaseClient.auth.signOut();

  state.currentMode = 'offline';
  state.punchItems  = [];
  state.selectedSet.clear();

  document.getElementById('main-app').style.display = 'none';
  document.getElementById('gate').style.display     = 'flex';
  setSyncStatus('offline');
}

export async function startOfflineMode() {
  try {
    state.currentMode = 'offline';
    state.punchItems  = await getOfflineItems();
    renderAll();

    document.getElementById('gate').style.display     = 'none';
    document.getElementById('main-app').style.display = 'block';
    setSyncStatus('offline');
    showToast('📴 Offline mode — data stays on device');
  } catch (e) {
    document.getElementById('gate-err').innerText = '❌ ' + e.message;
  }
}

export async function loadOnlineDataAndRender() {
  try {
    state.punchItems = await fetchOnlineItems();
    renderAll();
  } catch (e) {
    showToast('⚠️ Sync error: ' + e.message);
    setSyncStatus('error');
  }
}
