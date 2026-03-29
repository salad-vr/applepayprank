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

    // Clean phone: strip non-digits, ensure leading 1 for North America
    let cleanPhone = to.replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "1" + cleanPhone;
    if (cleanPhone.length < 11) {
      return NextResponse.json(
        { success: false, error: "Phone number looks invalid." },
        { status: 400 },
      );
    }

    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const fromNumber = process.env.VONAGE_FROM_NUMBER;

    if (!apiKey || !apiSecret || !fromNumber) {
      return NextResponse.json(
        { success: false, error: "SMS not configured on server." },
        { status: 500 },
      );
    }

    const res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret,
        to: cleanPhone,
        from: fromNumber,
        text: message,
      }),
    });

    const data = await res.json();
    const msg = data.messages?.[0];

    if (msg?.status === "0") {
      return NextResponse.json({
        success: true,
        messageId: msg["message-id"],
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: msg?.["error-text"] || "Failed to send text.",
      },
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
