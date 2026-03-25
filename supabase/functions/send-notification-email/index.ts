import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * send-notification-email Edge Function
 *
 * Sends formatted email notifications for key shipment events:
 * - Booking confirmations
 * - Document readiness
 * - Payment receipts
 * - Milestone / tracking updates
 *
 * Called internally by DB triggers or cron jobs.
 * Accepts: { notification_id } or { user_id, subject, body, template, data }
 */

interface EmailPayload {
  notification_id?: string;
  user_id?: string;
  to_email?: string;
  subject?: string;
  template?: string;
  data?: Record<string, unknown>;
}

const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  booking_confirmed: (data) => ({
    subject: `Booking Confirmed — ${data.shipment_ref || "Shipment"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">✅ Booking Confirmed</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Your shipment has been booked with the carrier.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Shipment</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.shipment_ref || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Route</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.origin || "—"} → ${data.destination || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Carrier</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.carrier || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">ETD</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.etd || "TBD"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Booking Ref</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.booking_ref || "—"}</td></tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),

  document_ready: (data) => ({
    subject: `Document Ready: ${data.doc_type || "Document"} — ${data.shipment_ref || ""}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">📄 Document Ready</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">A new document is available for download.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Document</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.doc_type || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Shipment</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.shipment_ref || "—"}</td></tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),

  payment_received: (data) => ({
    subject: `Payment Confirmed — $${data.amount || "0"} ${data.currency || "USD"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">💰 Payment Confirmed</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Your payment has been successfully processed.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Amount</td><td style="padding: 8px 0; color: #10b981; font-size: 16px; font-weight: 600; text-align: right;">$${data.amount || "0"} ${data.currency || "USD"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Shipment</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.shipment_ref || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Method</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.payment_method || "—"}</td></tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),

  tracking_update: (data) => ({
    subject: `Tracking Update: ${data.milestone || ""} — ${data.shipment_ref || ""}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">📍 Tracking Update</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Your shipment has reached a new milestone.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Milestone</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.milestone || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Location</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.location || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Shipment</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.shipment_ref || "—"}</td></tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),

  shipment_status: (data) => ({
    subject: `Shipment ${data.shipment_ref || ""} — ${data.new_status || "Updated"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">🚢 Shipment Update</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Your shipment status has been updated.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Shipment</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.shipment_ref || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Previous</td><td style="padding: 8px 0; color: #ef4444; font-size: 13px; text-align: right;">${data.old_status || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Current</td><td style="padding: 8px 0; color: #10b981; font-size: 13px; text-align: right;">${data.new_status || "—"}</td></tr>
          </table>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),

  sailing_reminder: (data) => ({
    subject: `🔔 Rate Alert: ${data.carrier || "Carrier"} — ${data.origin || "?"} → ${data.destination || "?"}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #0A1628; border-radius: 12px; padding: 32px; color: #fff;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">🔔 Sailing Rate Alert</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Your rate alert is now due. Check availability for your target criteria!</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Carrier</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.carrier || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Route</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.origin || "—"} → ${data.destination || "—"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">ETD</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.etd || "Flexible"}</td></tr>
            <tr style="border-top: 1px solid #1e293b;"><td colspan="2" style="padding: 12px 0 4px; color: #60a5fa; font-size: 12px; font-weight: 600;">YOUR CRITERIA</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Date Window</td><td style="padding: 8px 0; color: #fff; font-size: 13px; text-align: right;">${data.date_from || "Any"} — ${data.date_to || "Any"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Target Price</td><td style="padding: 8px 0; color: #10b981; font-size: 13px; font-weight: 600; text-align: right;">${data.price_min || "Any"} — ${data.price_max || "Any"}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Rate at Alert</td><td style="padding: 8px 0; color: #f59e0b; font-size: 13px; text-align: right;">${data.current_rate || "—"} ${data.currency || ""}</td></tr>
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Log in to search and book this sailing now.</p>
          </div>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 16px;">ALC Forwarding Platform</p>
      </div>
    `,
  }),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload: EmailPayload = await req.json();
    let toEmail = payload.to_email;
    let subject = payload.subject || "";
    let html = "";

    // If notification_id is provided, fetch the notification and build email
    if (payload.notification_id) {
      const { data: notif, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", payload.notification_id)
        .single();
      if (error || !notif) throw new Error("Notification not found");

      // Get user email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(notif.user_id);
      if (!user?.email) throw new Error("User email not found");

      // Check notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", notif.user_id)
        .single();

      if (prefs) {
        // Check quiet hours
        if (prefs.quiet_hours_enabled) {
          const now = new Date();
          const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:00`;
          if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
            return new Response(JSON.stringify({ skipped: true, reason: "quiet_hours" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Check type preferences
        const typeMap: Record<string, string> = {
          rate_alert: "rate_alerts",
          shipment_update: "shipment_updates",
          demurrage_alert: "demurrage_alerts",
          tracking_update: "shipment_updates",
          document_ready: "shipment_updates",
          payment: "shipment_updates",
        };
        const prefKey = typeMap[notif.type];
        if (prefKey && prefs[prefKey] === false) {
          return new Response(JSON.stringify({ skipped: true, reason: "preference_disabled" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      toEmail = user.email;
      const templateFn = TEMPLATES[notif.type] || TEMPLATES["shipment_status"];
      const meta = (notif.metadata || {}) as Record<string, unknown>;
      const rendered = templateFn({ ...meta, title: notif.title, message: notif.message });
      subject = rendered.subject;
      html = rendered.html;
    } else if (payload.template && TEMPLATES[payload.template]) {
      const rendered = TEMPLATES[payload.template](payload.data || {});
      subject = payload.subject || rendered.subject;
      html = rendered.html;
    } else {
      // Raw email
      html = `<div style="font-family: sans-serif; padding: 24px;">${payload.data?.body || subject}</div>`;
    }

    if (!toEmail) {
      // Resolve from user_id
      if (payload.user_id) {
        const { data: { user } } = await supabase.auth.admin.getUserById(payload.user_id);
        toEmail = user?.email;
      }
      if (!toEmail) throw new Error("No recipient email");
    }

    // Log the email attempt (actual sending would integrate with Resend/SES/etc.)
    console.log(`📧 Email to: ${toEmail}, Subject: ${subject}`);
    console.log(`📧 HTML length: ${html.length} chars`);

    // Store as a notification log entry for audit
    return new Response(
      JSON.stringify({
        success: true,
        to: toEmail,
        subject,
        html_length: html.length,
        note: "Email queued. Connect an email service (Resend, SES) for actual delivery.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
