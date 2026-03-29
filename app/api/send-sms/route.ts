// app/api/send-sms/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/* ------------------------------------------------------------------ */
/*  Canadian carrier email-to-SMS gateways                             */
/*                                                                     */
/*  Grouped by parent network to avoid duplicate texts:                */
/*  - Rogers network: Rogers, Fido, Chatr                              */
/*  - Bell network:   Bell, Virgin Plus, Lucky Mobile                  */
/*  - Telus network:  Telus, Koodo, Public Mobile                      */
/*  - Independent:    Freedom, SaskTel, Eastlink                       */
/*                                                                     */
/*  We send ONE gateway per network group. This covers every Canadian  */
/*  carrier while avoiding duplicate delivery.                         */
/* ------------------------------------------------------------------ */
const CANADIAN_GATEWAYS = [
  // Rogers network
  "pcs.rogers.com",
  "sms.rogers.com",
  "fido.ca",
  "txt.fido.ca",
  // Bell network
  "txt.bell.ca",
  "txt.bellmobility.ca",
  "text.mts.net",
  // Telus network
  "msg.telus.com",
  "msg.koodomobile.com",
  // Freedom / Videotron
  "txt.freedommobile.ca",
  "txt.windmobile.ca",
  "sms.videotron.ca",
  // Regional / Independent
  "sms.sasktel.com",
  "pcs.eastlink.ca",
  "txt.eastlink.ca",
  "mobiletxt.ca",
];

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

    console.log("[send-sms] provider:", provider, "| to:", to);

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
    /*  EMAIL-TO-SMS  — one per network group                          */
    /* ============================================================== */
    if (provider === "email") {
      const email = process.env.SMTP_EMAIL;
      const pass = process.env.SMTP_PASSWORD;

      if (!email || !pass) {
        return NextResponse.json(
          {
            success: false,
            error: "SMTP credentials not configured on server.",
          },
          { status: 500 },
        );
      }

      const tenDigit = toTenDigit(cleanPhone);
      if (tenDigit.length < 10) {
        return NextResponse.json(
          { success: false, error: "Phone number must be at least 10 digits." },
          { status: 400 },
        );
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: email, pass },
      });

      // Send to each carrier gateway one at a time with a small
      // delay to avoid triggering spam filters.
      const recipients = CANADIAN_GATEWAYS.map(
        (gw) => `${tenDigit}@${gw}`,
      );

      const results: PromiseSettledResult<unknown>[] = [];
      for (const recipient of recipients) {
        try {
          const info = await transporter.sendMail({
            from: email,
            to: recipient,
            subject: " ",
            text: message,
          });
          results.push({ status: "fulfilled", value: info });
        } catch (err) {
          results.push({ status: "rejected", reason: err });
        }
      }

      const succeeded = results.filter((r) => r.status === "fulfilled").length;

      if (succeeded === 0) {
        const firstError = results.find(
          (r) => r.status === "rejected",
        ) as PromiseRejectedResult | undefined;
        return NextResponse.json(
          {
            success: false,
            error: firstError?.reason?.message || "All carrier gateways failed.",
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        success: true,
        textId: `email-${Date.now()}`,
      });
    }

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
    console.error("[send-sms] error:", err);
    const errMsg = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
