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

    console.log("[Reminders Cron] Starting...");

    // Get all active reminders
    const { data: reminders, error: remindersError } = await supabase
      .from("whatsapp_reminders")
      .select("*, restaurants(name)")
      .eq("is_active", true);

    if (remindersError) {
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No active reminders" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const reminder of reminders) {
      try {
        console.log(`[Reminders Cron] Processing: ${reminder.name} (${reminder.trigger_type})`);

        // Get connected device
        const { data: device } = await supabase
          .from("whatsapp_devices")
          .select("id")
          .eq("restaurant_id", reminder.restaurant_id)
          .eq("connection_status", "connected")
          .maybeSingle();

        if (!device) {
          console.log(`[Reminders Cron] No connected device for restaurant ${reminder.restaurant_id}`);
          continue;
        }

        // Get server URL
        let serverUrl = DEFAULT_SERVER_URL;
        const { data: settings } = await supabase
          .from("restaurant_settings")
          .select("whatsapp_server_url, loyalty_enabled")
          .eq("restaurant_id", reminder.restaurant_id)
          .maybeSingle();

        if (settings?.whatsapp_server_url) {
          serverUrl = settings.whatsapp_server_url;
        }

        // Get customers to notify based on trigger type
        let customersToNotify: any[] = [];

        switch (reminder.trigger_type) {
          case "inactivity": {
            // Get customers inactive for X days
            const inactiveDays = reminder.trigger_days || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

            const { data: inactiveCustomers } = await supabase
              .from("customers")
              .select("id, name, phone, updated_at")
              .eq("restaurant_id", reminder.restaurant_id)
              .lt("updated_at", cutoffDate.toISOString())
              .limit(50);

            customersToNotify = inactiveCustomers || [];
            break;
          }

          case "cashback_available": {
            // Get customers with cashback/loyalty points
            const { data: customersWithCashback } = await supabase
              .from("customers")
              .select("id, name, phone, loyalty_points")
              .eq("restaurant_id", reminder.restaurant_id)
              .gt("loyalty_points", 0)
              .limit(50);

            customersToNotify = customersWithCashback || [];
            break;
          }

          case "loyalty_milestone": {
            // Get customers who recently hit a milestone
            const { data: milestoneCustomers } = await supabase
              .from("customers")
              .select("id, name, phone, loyalty_points")
              .eq("restaurant_id", reminder.restaurant_id)
              .or("loyalty_points.eq.100,loyalty_points.eq.500,loyalty_points.eq.1000")
              .limit(50);

            customersToNotify = milestoneCustomers || [];
            break;
          }

          case "weekly_promo": {
            // Get all customers (weekly promo to everyone)
            const { data: allCustomers } = await supabase
              .from("customers")
              .select("id, name, phone")
              .eq("restaurant_id", reminder.restaurant_id)
              .limit(100);

            customersToNotify = allCustomers || [];
            break;
          }
        }

        // Filter out opted-out customers
        const { data: optOuts } = await supabase
          .from("whatsapp_opt_outs")
          .select("phone")
          .eq("restaurant_id", reminder.restaurant_id);

        const optOutPhones = new Set((optOuts || []).map(o => o.phone));
        customersToNotify = customersToNotify.filter(c => !optOutPhones.has(c.phone));

        console.log(`[Reminders Cron] ${customersToNotify.length} customers to notify for ${reminder.name}`);

        let sentCount = 0;
        let failedCount = 0;

        for (const customer of customersToNotify) {
          if (!customer.phone) continue;

          try {
            // Replace variables in template
            let message = reminder.message_template;
            message = message.replace(/{nome}/g, customer.name || "Cliente");
            message = message.replace(/{cashback}/g, `R$ ${((customer.loyalty_points || 0) * 0.01).toFixed(2)}`);
            message = message.replace(/{pontos}/g, String(customer.loyalty_points || 0));
            message = message.replace(/{restaurante}/g, reminder.restaurants?.name || "Restaurante");

            // Send message
            const response = await fetch(`${serverUrl}/api/messages/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceId: device.id,
                phone: customer.phone.replace(/\D/g, ""),
                message,
              }),
            });

            if (response.ok) {
              sentCount++;
            } else {
              failedCount++;
            }

            // Delay between messages
            await new Promise(resolve => setTimeout(resolve, 15000));

          } catch (err) {
            console.error(`[Reminders Cron] Error sending to ${customer.phone}:`, err);
            failedCount++;
          }
        }

        // Update last run
        await supabase
          .from("whatsapp_reminders")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", reminder.id);

        results.push({
          reminder: reminder.name,
          sent: sentCount,
          failed: failedCount,
        });

      } catch (err: any) {
        console.error(`[Reminders Cron] Error processing ${reminder.name}:`, err);
        results.push({
          reminder: reminder.name,
          error: err.message,
        });
      }
    }

    console.log("[Reminders Cron] Completed", results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Reminders Cron] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
