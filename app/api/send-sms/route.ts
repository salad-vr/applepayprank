// app/api/send-sms/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/* ------------------------------------------------------------------ */
/*  All Canadian carrier email-to-SMS gateways                         */
/* ------------------------------------------------------------------ */
const CANADIAN_GATEWAYS = [
  "pcs.rogers.com",        // Rogers
  "txt.bell.ca",           // Bell
  "msg.telus.com",         // Telus
  "fido.ca",               // Fido
  "msg.koodomobile.com",   // Koodo
  "txt.freedommobile.ca",  // Freedom Mobile
  "txt.windmobile.ca",     // Wind (old Freedom)
  "sms.sasktel.com",       // SaskTel
  "text.mts.net",          // MTS (now Bell MTS)
  "pcs.eastlink.ca",       // Eastlink
  "mobiletxt.ca",          // PC Mobile
];

const UNIQUE_CANADIAN_GATEWAYS = [...new Set(CANADIAN_GATEWAYS)];

function toTenDigit(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const to: string = body.to || "";
    const message: string = body.message || "";
    const provider: string = body.provider || "email";

    // DEBUG: Log everything so we can see what's happening
    console.log("[send-sms] ========== INCOMING REQUEST ==========");
    console.log("[send-sms] provider:", JSON.stringify(provider));
    console.log("[send-sms] to:", JSON.stringify(to));
    console.log("[send-sms] message:", JSON.stringify(message));
    console.log("[send-sms] SMTP_EMAIL env set:", !!process.env.SMTP_EMAIL);
    console.log("[send-sms] SMTP_PASSWORD env set:", !!process.env.SMTP_PASSWORD);
    console.log("[send-sms] full body keys:", Object.keys(body));

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'message' field." },
        { status: 400 },
      );
    }

    const cleanPhone = to.replace(/[^+0-9]/g, "");
    if (cleanPhone.length < 7) {
      return NextResponse.json(
        { success: false, error: "Phone number looks invalid." },
        { status: 400 },
      );
    }

    /* ============================================================== */
    /*  EMAIL-TO-SMS  — blast all Canadian carrier gateways            */
    /* ============================================================== */
    if (provider === "email") {
      console.log("[send-sms] >>> ENTERING EMAIL PROVIDER PATH");

      const email = process.env.SMTP_EMAIL;
      const pass = process.env.SMTP_PASSWORD;

      console.log("[send-sms] SMTP_EMAIL:", email ? email : "NOT SET");
      console.log("[send-sms] SMTP_PASSWORD length:", pass ? pass.length : 0);

      if (!email || !pass) {
        console.log("[send-sms] ERROR: Missing SMTP credentials");
        return NextResponse.json(
          {
            success: false,
            error: "SMTP_EMAIL and SMTP_PASSWORD must be set in .env.local",
          },
          { status: 500 },
        );
      }

      const tenDigit = toTenDigit(cleanPhone);
      console.log("[send-sms] cleanPhone:", cleanPhone, "tenDigit:", tenDigit);

      if (tenDigit.length < 10) {
        return NextResponse.json(
          { success: false, error: "Phone number must be at least 10 digits." },
          { status: 400 },
        );
      }

      console.log("[send-sms] Creating nodemailer transporter...");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: email, pass },
      });

      // Verify the transporter can connect
      try {
        await transporter.verify();
        console.log("[send-sms] SMTP connection verified OK");
      } catch (verifyErr) {
        console.error("[send-sms] SMTP verify FAILED:", verifyErr);
        return NextResponse.json(
          {
            success: false,
            error: `Gmail auth failed: ${verifyErr instanceof Error ? verifyErr.message : "unknown error"}`,
          },
          { status: 502 },
        );
      }

      const recipients = UNIQUE_CANADIAN_GATEWAYS.map(
        (gw) => `${tenDigit}@${gw}`,
      );
      console.log("[send-sms] Sending to gateways:", recipients);

      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          transporter.sendMail({
            from: email,
            to: recipient,
            subject: "",
            text: message,
          }),
        ),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      console.log("[send-sms] Results: succeeded:", succeeded, "failed:", failed);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.log(`[send-sms]   FAILED ${recipients[i]}:`, r.reason?.message);
        }
      });

      if (succeeded === 0) {
        const firstError = results.find(
          (r) => r.status === "rejected",
        ) as PromiseRejectedResult | undefined;
        return NextResponse.json(
          {
            success: false,
            error:
              firstError?.reason?.message || "All carrier gateways failed.",
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        textId: `email-${Date.now()}`,
        detail: `Sent to ${succeeded} gateways (${failed} bounced)`,
      });
    }

    /* ============================================================== */
    /*  If we got here, provider is NOT "email"                        */
    /*  Log it so we know                                              */
    /* ============================================================== */
    console.log("[send-sms] WARNING: provider is NOT email, it is:", provider);

    /* ============================================================== */
    /*  TWILIO                                                         */
    /* ============================================================== */
    if (provider === "twilio") {
      const sid = body.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const token = body.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
      const fromNum = body.twilioFromNumber || process.env.TWILIO_FROM_NUMBER;

      if (!sid || !token || !fromNum) {
        return NextResponse.json(
          { success: false, error: "Twilio credentials missing." },
          { status: 400 },
        );
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;

      const params = new URLSearchParams();
      params.append("To", cleanPhone);
      params.append("From", fromNum);
      params.append("Body", message);

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json();

      if (res.ok && data.sid) {
        return NextResponse.json({ success: true, textId: data.sid });
      }

      return NextResponse.json(
        { success: false, error: data.message || "Twilio error." },
        { status: 502 },
      );
    }

    /* ============================================================== */
    /*  TEXTBELT (fallback)                                            */
    /* ============================================================== */
    console.log("[send-sms] Falling through to TEXTBELT fallback");
    const apiKey = body.textbeltKey || process.env.TEXTBELT_KEY || "textbelt";

    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, message, key: apiKey }),
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({ success: true, textId: data.textId });
    }

    return NextResponse.json(
      { success: false, error: data.error || "TextBelt error." },
      { status: 502 },
    );
  } catch (err: unknown) {
    console.error("[send-sms] UNCAUGHT ERROR:", err);
    const errMsg =
      err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}
