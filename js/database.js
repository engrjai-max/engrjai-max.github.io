// ============================================================
// database.js — Supabase CRUD, offline CRUD, realtime
// ============================================================

import { supabaseClient, uploadImage, deleteImage, getOfflineItems, saveOfflineItems } from './storage.js';
import { state } from './state.js';

// ── Sync indicator ────────────────────────────────────────
function getSyncDot() { return document.getElementById('sync-dot'); }
export function setSyncStatus(status) {
  const dot = getSyncDot();
  if (dot) dot.className = `sync-dot ${status}`;
}

// ── Online CRUD ───────────────────────────────────────────
export async function fetchOnlineItems() {
  setSyncStatus('syncing');
  const { data, error } = await supabaseClient
    .from('punch_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  setSyncStatus('online');
  return data.map(item => ({
    id: item.id,
    firebaseKey: item.id,
    desc: item.description,
    location: item.location,
    priority: item.priority,
    status: item.status,
    remarks: item.remarks,
    inspectionPhoto:     item.inspection_photo_url,
    inspectionPhotoPath: item.inspection_photo_path,
    closeoutPhoto:       item.closeout_photo_url,
    closeoutPhotoPath:   item.closeout_photo_path,
    createdAt: item.created_at,
    closedAt:  item.closed_at,
  }));
}

export async function addOnlineItem(itemData, file) {
  setSyncStatus('syncing');
  let inspectionPhotoUrl  = '';
  let inspectionPhotoPath = '';

  if (file) {
    const { url, path } = await uploadImage(file, `inspections/${Date.now()}`);
    inspectionPhotoUrl  = url;
    inspectionPhotoPath = path;
  }

  const newItem = {
    description: itemData.desc,
    location:    itemData.location,
    priority:    itemData.priority,
    status:      itemData.status,
    remarks:     itemData.remarks || '',
    inspection_photo_url:  inspectionPhotoUrl,
    inspection_photo_path: inspectionPhotoPath,
    closeout_photo_url:    '',
    closeout_photo_path:   '',
    created_at: Date.now(),
    closed_at:  null,
  };

  const { data, error } = await supabaseClient
    .from('punch_items')
    .insert(newItem)
    .select()
    .single();
  if (error) throw error;

  setSyncStatus('online');
  return { ...data, firebaseKey: data.id, desc: data.description };
}

export async function updateOnlineItem(id, updates) {
  await supabaseClient.from('punch_items').update(updates).eq('id', id);
}

export async function deleteOnlineItems(ids, itemsList) {
  for (const id of ids) {
    const item = itemsList.find(i => i.id === id);
    if (item?.inspectionPhotoPath) await deleteImage(item.inspectionPhotoPath);
    if (item?.closeoutPhotoPath)   await deleteImage(item.closeoutPhotoPath);
  }
  await supabaseClient.from('punch_items').delete().in('id', ids);
}

// ── Offline CRUD ──────────────────────────────────────────
export async function addOfflineItem(itemData, base64Image) {
  const items = await getOfflineItems();
  const newId = `off_${Date.now()}_${Math.random().toString(36)}`;
  const newItem = {
    id: newId,
    firebaseKey: newId,
    desc:     itemData.desc,
    location: itemData.location,
    priority: itemData.priority,
    status:   itemData.status,
    remarks:  itemData.remarks || '',
    inspectionPhoto:     base64Image,
    inspectionPhotoPath: '',
    closeoutPhoto:       '',
    closeoutPhotoPath:   '',
    createdAt: Date.now(),
    closedAt:  null,
  };
  items.unshift(newItem);
  await saveOfflineItems(items);
  return newItem;
}

export async function updateOfflineItem(id, updates) {
  const items = await getOfflineItems();
  const idx   = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    await saveOfflineItems(items);
  }
}

export async function deleteOfflineItems(ids) {
  let items = await getOfflineItems();
  items = items.filter(i => !ids.includes(i.id));
  await saveOfflineItems(items);
}

// ── Realtime subscription ─────────────────────────────────
export function subscribeToRealtime(onUpdate) {
  if (state.realtimeChannel) supabaseClient.removeChannel(state.realtimeChannel);
  state.realtimeChannel = supabaseClient
    .channel('punch_items_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'punch_items' }, () => onUpdate())
    .subscribe();
}

// re-export helpers consumed by other modules
export { getOfflineItems, saveOfflineItems };
