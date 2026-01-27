import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SERVER_URL = "https://iapedido.deletrics.site/whatsapp-api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, broadcastId } = await req.json();

    console.log(`[Broadcast Queue] Action: ${action}, Broadcast: ${broadcastId}`);

    switch (action) {
      case "start": {
        // Get broadcast details
        const { data: broadcast, error: broadcastError } = await supabase
          .from("whatsapp_broadcasts")
          .select("*, whatsapp_devices(*)")
          .eq("id", broadcastId)
          .single();

        if (broadcastError || !broadcast) {
          throw new Error("Broadcast not found");
        }

        // Update status to running
        await supabase
          .from("whatsapp_broadcasts")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", broadcastId);

        // Get server URL
        let serverUrl = DEFAULT_SERVER_URL;
        if (broadcast.restaurant_id) {
          const { data: settings } = await supabase
            .from("restaurant_settings")
            .select("whatsapp_server_url")
            .eq("restaurant_id", broadcast.restaurant_id)
            .maybeSingle();

          if (settings?.whatsapp_server_url) {
            serverUrl = settings.whatsapp_server_url;
          }
        }

        // Get pending contacts
        const { data: contacts } = await supabase
          .from("whatsapp_broadcast_contacts")
          .select("*")
          .eq("broadcast_id", broadcastId)
          .eq("status", "pending")
          .order("created_at")
          .limit(50);

        if (!contacts || contacts.length === 0) {
          // Mark as completed
          await supabase
            .from("whatsapp_broadcasts")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", broadcastId);

          return new Response(JSON.stringify({ success: true, message: "Broadcast completed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Process contacts one by one with delay
        let sentCount = broadcast.sent_count || 0;
        let failedCount = broadcast.failed_count || 0;

        for (const contact of contacts) {
          try {
            // Check if broadcast was paused
            const { data: currentBroadcast } = await supabase
              .from("whatsapp_broadcasts")
              .select("status")
              .eq("id", broadcastId)
              .single();

            if (currentBroadcast?.status === "paused") {
              console.log(`[Broadcast] Paused, stopping...`);
              break;
            }

            // Replace variables in message
            let finalMessage = broadcast.message;
            finalMessage = finalMessage.replace(/{nome}/g, contact.name || "Cliente");
            finalMessage = finalMessage.replace(/{telefone}/g, contact.phone);

            // Send message via server
            const sendResponse = await fetch(`${serverUrl}/api/messages/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId: broadcast.device_id,
                phone: contact.phone.replace(/\D/g, ""),
                message: finalMessage,
              }),
            });

            if (sendResponse.ok) {
              sentCount++;
              await supabase
                .from("whatsapp_broadcast_contacts")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("id", contact.id);
            } else {
              const errorText = await sendResponse.text();
              failedCount++;
              await supabase
                .from("whatsapp_broadcast_contacts")
                .update({ status: "failed", error: errorText })
                .eq("id", contact.id);
            }

            // Send media if exists
            const mediaUrls = broadcast.media_urls as string[] || [];
            for (const mediaUrl of mediaUrls) {
              await fetch(`${serverUrl}/api/messages/send-media`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  deviceId: broadcast.device_id,
                  phone: contact.phone.replace(/\D/g, ""),
                  mediaUrl,
                }),
              });
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Update counts
            await supabase
              .from("whatsapp_broadcasts")
              .update({ sent_count: sentCount, failed_count: failedCount })
              .eq("id", broadcastId);

            console.log(`[Broadcast] Sent to ${contact.phone}, ${sentCount}/${broadcast.total_contacts}`);

            // Wait delay between messages
            await new Promise(resolve => setTimeout(resolve, (broadcast.delay_seconds || 20) * 1000));

          } catch (error: any) {
            console.error(`[Broadcast] Error sending to ${contact.phone}:`, error);
            failedCount++;
            await supabase
              .from("whatsapp_broadcast_contacts")
              .update({ status: "failed", error: error.message })
              .eq("id", contact.id);
          }
        }

        // Check if there are more pending contacts
        const { count: remaining } = await supabase
          .from("whatsapp_broadcast_contacts")
          .select("*", { count: "exact", head: true })
          .eq("broadcast_id", broadcastId)
          .eq("status", "pending");

        if (remaining === 0) {
          await supabase
            .from("whatsapp_broadcasts")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              sent_count: sentCount,
              failed_count: failedCount
            })
            .eq("id", broadcastId);
        }

        return new Response(JSON.stringify({
          success: true,
          sentCount,
          failedCount,
          remaining
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "pause": {
        await supabase
          .from("whatsapp_broadcasts")
          .update({ status: "paused" })
          .eq("id", broadcastId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resume": {
        await supabase
          .from("whatsapp_broadcasts")
          .update({ status: "running" })
          .eq("id", broadcastId);

        // Trigger start again
        const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-broadcast-queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ action: "start", broadcastId }),
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("[Broadcast Queue] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
