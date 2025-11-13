const supabase = require('../db/supabase');

async function logAction(guildId, actionType, userId, targetId = null, details = {}) {
  try {
    const { error } = await supabase
      .from('action_logs')
      .insert({
        guild_id: guildId,
        action_type: actionType,
        user_id: userId,
        target_id: targetId,
        details: details
      });

    if (error) {
      console.error('Error logging action:', error);
    }
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}

module.exports = { logAction };
