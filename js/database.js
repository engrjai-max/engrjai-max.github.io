// ============================================================
// database.js — Supabase CRUD, offline CRUD, realtime
// ============================================================

import { supabaseClient, uploadImage, deleteImage, getOfflineItems, saveOfflineItems } from './storage.js';
import { state } from './state.js';

// ── Sync indicator ────────────────────────────────────────
export function setSyncStatus(status) {
  const dot = document.getElementById('sync-dot');
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
    id:              item.id,
    desc:            item.description,
    location:        item.location,
    priority:        item.priority,
    status:          item.status,
    remarks:         item.remarks,
    inspectionPhoto: item.inspection_photo,
    closeoutPhoto:   item.closeout_photo,
    createdAt:       item.created_at,
    closedAt:        item.closed_at,
  }));
}

export async function addOnlineItem(itemData, file) {
  setSyncStatus('syncing');
  let inspectionPhotoUrl = '';

  if (file) {
    const { url } = await uploadImage(file, `inspections/${Date.now()}`);
    inspectionPhotoUrl = url;
  }

  const { data, error } = await supabaseClient
    .from('punch_items')
    .insert({
      description:       itemData.desc,
      location:          itemData.location,
      priority:          itemData.priority,
      status:            itemData.status,
      remarks:           itemData.remarks || '',
      inspection_photo:  inspectionPhotoUrl,
      created_at:        new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  setSyncStatus('online');
  return {
    id:              data.id,
    desc:            data.description,
    location:        data.location,
    priority:        data.priority,
    status:          data.status,
    remarks:         data.remarks,
    inspectionPhoto: data.inspection_photo,
    closeoutPhoto:   data.closeout_photo,
    createdAt:       data.created_at,
    closedAt:        data.closed_at,
  };
}

export async function updateOnlineItem(id, updates) {
  const { error } = await supabaseClient.from('punch_items').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteOnlineItems(ids, itemsList) {
  // No stored paths to clean up — photos are just URLs in this schema
  const { error } = await supabaseClient.from('punch_items').delete().in('id', ids);
  if (error) throw error;
}

// ── Offline CRUD ──────────────────────────────────────────
export async function addOfflineItem(itemData, base64Image) {
  const items = await getOfflineItems();
  const newId = `off_${Date.now()}_${Math.random().toString(36)}`;
  const newItem = {
    id:              newId,
    desc:            itemData.desc,
    location:        itemData.location,
    priority:        itemData.priority,
    status:          itemData.status,
    remarks:         itemData.remarks || '',
    inspectionPhoto: base64Image,
    closeoutPhoto:   '',
    createdAt:       new Date().toISOString(),
    closedAt:        null,
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
  const items = (await getOfflineItems()).filter(i => !ids.includes(i.id));
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

// re-export for other modules
export { getOfflineItems, saveOfflineItems };
