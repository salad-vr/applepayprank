import { NextResponse } from "next/server";

const ACCESS_CODE = "SALAAR";

export async function POST(request: Request) {
  try {
    const { to, message, code } = (await request.json()) as {
      to?: string;
      message?: string;
      code?: string;
    };

    // Validate access code
    if (!code || code.toUpperCase() !== ACCESS_CODE) {
      return NextResponse.json(
        { success: false, error: "Invalid access code." },
        { status: 403 },
      );
    }

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing phone number or message." },
        { status: 400 },
      );
    }

    const cleanPhone = to.replace(/[^+0-9]/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Phone number looks invalid." },
        { status: 400 },
      );
    }

    const apiKey = process.env.TEXTBELT_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "SMS not configured on server." },
        { status: 500 },
      );
    }

    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, message, key: apiKey }),
    });

    const data = await res.json();

    if (data.success) {
      return NextResponse.json({
        success: true,
        textId: data.textId,
        quotaRemaining: data.quotaRemaining,
      });
    }

    return NextResponse.json(
      { success: false, error: data.error || "Failed to send text." },
      { status: 502 },
    );
  } catch (err: unknown) {
    console.error("[send-sms]", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error." },
      { status: 500 },
    );
  }
}
