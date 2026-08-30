// Audit entries identify the person and browser session performing online work.
import { supabaseClient } from './storage.js?v=6';
import { state } from './state.js?v=6';

export async function recordAudit(action, itemId = null, details = {}) {
  if (state.currentMode !== 'online') return;
  if (!state.actorName) throw new Error('A user name is required for online changes.');
  const { error } = await supabaseClient.from('punch_item_audit').insert({
    actor_name: state.actorName,
    session_id: state.sessionId,
    action,
    item_id: itemId || null,
    details,
  });
  if (error) throw error;
}
