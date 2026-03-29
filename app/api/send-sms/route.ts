// app/api/send-sms/route.ts
import { NextResponse } from "next/server";

/**
 * POST /api/send-sms
 *
 * Sends an SMS via TextBelt. Uses env var TEXTBELT_KEY.
 * Falls back to "textbelt" (1 free text/day) for testing.
 *
 * Body: { to: string, message: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, message } = body as { to?: string; message?: string };

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'message' field." },
        { status: 400 }
      );
    }

    // Clean phone number (strip spaces, dashes, parens)
    const cleanPhone = to.replace(/[^+0-9]/g, "");
    if (cleanPhone.length < 7) {
      return NextResponse.json(
        { success: false, error: "Phone number looks invalid." },
        { status: 400 }
      );
    }

    const apiKey = process.env.TEXTBELT_KEY || "textbelt";

    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: cleanPhone,
        message,
        key: apiKey,
      }),
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({ success: true, textId: data.textId });
    }

    return NextResponse.json(
      { success: false, error: data.error || "TextBelt returned an error." },
      { status: 502 }
    );
  } catch (err) {
    console.error("[send-sms] error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
