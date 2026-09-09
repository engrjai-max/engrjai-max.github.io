// Audit entries identify the person and browser session performing online work.
import { supabaseClient, getOfflineAudit, saveOfflineAudit } from './storage.js?v=8';
import { state } from './state.js?v=8';

export async function recordAudit(action, itemId = null, details = {}) {
  if (!state.actorName) throw new Error('A full name is required before making changes.');
  const entry = {
    actor_name: state.actorName,
    session_id: state.sessionId,
    action,
    item_id: itemId || null,
    details,
    created_at: new Date().toISOString(),
  };
  if (state.currentMode === 'online') {
    const { error } = await supabaseClient.from('punch_item_audit').insert(entry);
    if (error) throw error;
    return;
  }
  const entries = await getOfflineAudit();
  entries.unshift({ id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...entry });
  await saveOfflineAudit(entries.slice(0, 500));
}

export async function fetchAuditEntries(limit = 200) {
  if (state.currentMode === 'online') {
    const { data, error } = await supabaseClient
      .from('punch_item_audit')
      .select('id, actor_name, action, item_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }
  return (await getOfflineAudit()).slice(0, limit);
}
