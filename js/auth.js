// ============================================================
// auth.js — Login (online), logout, offline mode entry
// ============================================================

import { supabaseClient } from './storage.js?v=8';
import { SHARED_EMAIL } from './config.js?v=8';
import { state, setActorName, restoreActorName, rememberMode, restoreMode } from './state.js?v=8';
import { setSyncStatus, fetchOnlineItems, subscribeToRealtime, getOfflineItems } from './database.js?v=8';
import { renderAll } from './render.js?v=8';
import { showToast } from './ui.js?v=8';

export async function loginOnline(password, actorName) {
  const errEl = document.getElementById('gate-err');
  errEl.innerText = '';
  setSyncStatus('syncing');

  try {
    setActorName(actorName);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: SHARED_EMAIL,
      password,
    });
    if (error) throw new Error(error.message);

    state.currentMode = 'online';
    rememberMode('online');
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
    await supabaseClient.auth.signOut({ scope: 'local' });

  state.currentMode = 'offline';
  rememberMode('');
  state.punchItems  = [];
  state.selectedSet.clear();

  document.getElementById('main-app').style.display = 'none';
  document.getElementById('gate').style.display     = 'flex';
  setSyncStatus('offline');
}

export async function verifyCurrentUserPassword(password) {
  if (!password) throw new Error('Enter the full team password.');
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: SHARED_EMAIL,
    password,
  });
  if (error) throw new Error('Password verification failed.');
}

export async function startOfflineMode(actorName) {
  try {
    setActorName(actorName);
    state.currentMode = 'offline';
    rememberMode('offline');
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

document.addEventListener('DOMContentLoaded', () => {
  const name = document.getElementById('login-name');
  if (name) name.value = restoreActorName();
});

export async function restorePersistedSession() {
  const actorName = restoreActorName();
  if (!actorName) return false;

  const { data, error } = await supabaseClient.auth.getSession();
  if (!error && data?.session && restoreMode() !== 'offline') {
    setActorName(actorName);
    state.currentMode = 'online';
    await loadOnlineDataAndRender();
    subscribeToRealtime(() => loadOnlineDataAndRender());
    document.getElementById('gate').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    setSyncStatus('online');
    return true;
  }

  if (restoreMode() === 'offline') {
    await startOfflineMode(actorName);
    return true;
  }
  return false;
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
