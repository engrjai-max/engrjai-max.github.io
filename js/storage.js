// ============================================================
// storage.js — Image compression, Supabase Storage, offline DB
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, STORAGE_BUCKET } from './config.js';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Image compression ──────────────────────────────────────
export async function compressImage(file, maxSizePx = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width, height = img.height;
        if (width > maxSizePx || height > maxSizePx) {
          const ratio = Math.min(maxSizePx / width, maxSizePx / height);
          width  = Math.floor(width  * ratio);
          height = Math.floor(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Supabase Storage upload / delete ──────────────────────
export async function uploadImage(file, folderPrefix, onSyncStatus) {
  const compressed = await compressImage(file);
  const fileName = `${folderPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  if (onSyncStatus) onSyncStatus('syncing');

  const { error } = await supabaseClient.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, compressed, { cacheControl: '3600' });
  if (error) throw error;

  const { data: publicUrlData } = supabaseClient.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  if (onSyncStatus) onSyncStatus('online');
  return { url: publicUrlData.publicUrl, path: fileName };
}

export async function deleteImage(path) {
  if (path) {
    await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .remove([path])
      .catch(e => console.warn('deleteImage error:', e));
  }
}

// ── Offline store (localforage) ───────────────────────────
const offlineDB = localforage.createInstance({ name: 'punchlist_offline_v2' });

export async function getOfflineItems()      { return (await offlineDB.getItem('items')) || []; }
export async function saveOfflineItems(items) { await offlineDB.setItem('items', items); }
