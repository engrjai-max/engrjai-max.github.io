// ============================================================
// auth.js — Login (online), logout, offline mode entry
// ============================================================

import { supabaseClient } from './storage.js?v=8';
import { SHARED_EMAIL } from './config.js?v=8';
import { state, setActorName, restoreActorName, rememberMode, restoreMode } from './state.js?v=8';
import { setSyncStatus, fetchOnlineItems, subscribeToRealtime, getOfflineItems } from './database.js?v=8';
import { renderAll } from './render.js?v=8';
import { showToast } from './ui.js?v=8';


let authenticating = false;
let loadVersion = 0;
function loginProgress(busy, message = 'Signing in…') {
  authenticating = busy;
  const button = document.getElementById('online-login-btn');
  button.disabled = busy;
  button.textContent = busy ? message : '🔐 Sign in & Sync Cloud';
  document.getElementById('offline-mode-btn').disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  const feedback = document.getElementById('gate-err');
  feedback.setAttribute('role', 'status');
  feedback.textContent = busy ? message : '';
  let progress = document.getElementById('login-progress');
  if (!progress) {
    progress = document.createElement('progress');
    progress.id = 'login-progress';
    progress.setAttribute('aria-label', 'Login progress');
    progress.style.cssText = 'width:100%;height:6px;margin-top:12px';
    button.after(progress);
  }
  progress.hidden = !busy;
}

function openOnlineApp() {
  state.currentMode = 'online';
  rememberMode('online');
  document.getElementById('gate').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  document.getElementById('list').innerHTML = '<div class="empty" role="status"><progress aria-label="Loading items"></progress><p>Loading items…</p></div>';
  subscribeToRealtime(() => loadOnlineDataAndRender());
}

export async function loginOnline(password, actorName) {
  if (authenticating) return;
  loginProgress(true);
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

    openOnlineApp();
    document.getElementById('login-password').value = '';
    await loadOnlineDataAndRender();
    if (state.currentMode === 'online') showToast('✅ Online mode active');
  } catch (e) {
    loginProgress(false);
    errEl.innerText = '❌ ' + e.message;
    setSyncStatus('error');
    return;
  }
  loginProgress(false);
}

export async function logout() {
  loadVersion++;
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
  document.getElementById('login-name').value = actorName;
  if (!actorName) return false;
  if (restoreMode() === 'offline') {
    await startOfflineMode(actorName);
    return true;
  }
  loginProgress(true, 'Restoring your session…');
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data?.session && restoreMode() !== 'offline') {
      setActorName(actorName);
      openOnlineApp();
      await loadOnlineDataAndRender();
      return true;
    }
    return false;
  } catch (e) {
    loginProgress(false);
    document.getElementById('gate-err').textContent = 'Could not restore your session. Check your connection and refresh to retry.';
    return false;
  } finally {
    if (authenticating) loginProgress(false);
  }
}

export async function loadOnlineDataAndRender() {
  const version = ++loadVersion;
  try {
    const items = await fetchOnlineItems(items => {
      if (version !== loadVersion || state.currentMode !== 'online') return;
      state.punchItems = items;
      renderAll();
    });
    if (version !== loadVersion || state.currentMode !== 'online') return;
    state.punchItems = items;
    renderAll();
  } catch (e) {
    if (version !== loadVersion || state.currentMode !== 'online') return;
    if (!state.punchItems.length) {
      const list = document.getElementById('list');
      list.textContent = 'Could not load items. ';
      const retry = document.createElement('button');
      retry.textContent = 'Retry';
      retry.onclick = () => loadOnlineDataAndRender();
      list.append(retry);
    }
    showToast('⚠️ Sync error: ' + e.message);
    setSyncStatus('error');
  }
}
