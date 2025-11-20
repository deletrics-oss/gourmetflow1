import { supabase } from "@/lib/supabase-client";

/**
 * Helper function to log actions with automatic context capturing
 * Captures user agent automatically from the browser
 */
export const logActionWithContext = async (
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: any
) => {
  try {
    // Capture user agent
    const userAgent = navigator.userAgent;

    // Call the log_action RPC with context
    await supabase.rpc('log_action', {
      p_action: action,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_details: {
        ...details,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Log to console but don't throw - logging should not break app flow
    console.log('Log action error (non-critical):', error);
  }
};
