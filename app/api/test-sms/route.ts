// app/api/test-sms/route.ts
// GET /api/test-sms?phone=4161234567

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const CANADIAN_GATEWAYS = [
  "pcs.rogers.com",        // Rogers network (Rogers, Fido, Chatr)
  "txt.bell.ca",           // Bell network (Bell, Virgin Plus, Lucky)
  "msg.telus.com",         // Telus network (Telus, Koodo, Public Mobile)
  "txt.freedommobile.ca",  // Freedom Mobile
  "sms.sasktel.com",       // SaskTel
  "pcs.eastlink.ca",       // Eastlink
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = (url.searchParams.get("phone") || "").replace(/[^0-9]/g, "");
  const log: string[] = [];

  log.push("=== SMS TEST DIAGNOSTIC ===");

  const email = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;
  log.push(`SMTP_EMAIL: ${email || "NOT SET"}`);
  log.push(`SMTP_PASSWORD: ${pass ? `SET (${pass.length} chars)` : "NOT SET"}`);

  if (!email || !pass) {
    log.push("FATAL: Missing SMTP credentials");
    return NextResponse.json({ log }, { status: 500 });
  }

  let tenDigit = phone;
  if (tenDigit.length === 11 && tenDigit.startsWith("1")) tenDigit = tenDigit.slice(1);
  if (!tenDigit || tenDigit.length < 10) {
    log.push(`FATAL: Need 10-digit phone. Got: "${phone}". Use ?phone=4161234567`);
    return NextResponse.json({ log }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass },
  });

  try {
    await transporter.verify();
    log.push("SMTP: OK");
  } catch (err) {
    log.push(`SMTP: FAILED - ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ log }, { status: 502 });
  }

  const testMessage = "TEST from Apple Pay Prank - if you got this, it works!";
  const recipients = CANADIAN_GATEWAYS.map((gw) => `${tenDigit}@${gw}`);

  log.push(`Sending to ${recipients.length} gateways (1 per network)...`);

  const results = await Promise.allSettled(
    recipients.map((to) =>
      transporter.sendMail({
        from: `"Apple Pay" <${email}>`,
        to,
        subject: "",
        text: testMessage,
      }),
    ),
  );

  let ok = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { ok++; log.push(`  OK: ${recipients[i]}`); }
    else { log.push(`  FAIL: ${recipients[i]} - ${r.reason?.message}`); }
  });

  log.push(`${ok}/${recipients.length} sent`);
  return NextResponse.json({ log, succeeded: ok });
}
