// app/api/test-sms/route.ts
// 
// GET /api/test-sms?phone=1234567890
//
// Quick diagnostic endpoint. Open in browser to test email-to-SMS.
// Shows exactly what happens at each step.

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const CANADIAN_GATEWAYS = [
  "pcs.rogers.com",
  "txt.bell.ca",
  "msg.telus.com",
  "fido.ca",
  "msg.koodomobile.com",
  "txt.freedommobile.ca",
  "txt.windmobile.ca",
  "sms.sasktel.com",
  "text.mts.net",
  "pcs.eastlink.ca",
  "mobiletxt.ca",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = (url.searchParams.get("phone") || "").replace(/[^0-9]/g, "");
  const log: string[] = [];

  log.push(`=== SMS TEST DIAGNOSTIC ===`);
  log.push(`Time: ${new Date().toISOString()}`);
  log.push(``);

  // 1. Check env vars
  const email = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;
  log.push(`SMTP_EMAIL: ${email ? email : "NOT SET"}`);
  log.push(`SMTP_PASSWORD: ${pass ? `SET (${pass.length} chars)` : "NOT SET"}`);
  log.push(``);

  if (!email || !pass) {
    log.push(`FATAL: Gmail credentials missing from .env.local`);
    return NextResponse.json({ log }, { status: 500 });
  }

  // 2. Check phone
  let tenDigit = phone;
  if (tenDigit.length === 11 && tenDigit.startsWith("1")) {
    tenDigit = tenDigit.slice(1);
  }
  log.push(`Raw phone param: "${url.searchParams.get("phone")}"`);
  log.push(`Cleaned digits: "${phone}"`);
  log.push(`Ten-digit: "${tenDigit}"`);
  log.push(``);

  if (!tenDigit || tenDigit.length < 10) {
    log.push(`FATAL: Need a valid 10-digit phone. Use ?phone=1234567890`);
    return NextResponse.json({ log }, { status: 400 });
  }

  // 3. Test SMTP connection
  log.push(`Creating Gmail SMTP transporter...`);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass },
  });

  try {
    await transporter.verify();
    log.push(`SMTP verify: SUCCESS - Gmail accepted the credentials`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`SMTP verify: FAILED - ${msg}`);
    log.push(``);
    log.push(`This means the App Password is wrong or Gmail blocked the login.`);
    return NextResponse.json({ log }, { status: 502 });
  }
  log.push(``);

  // 4. Send to all gateways
  const testMessage = "TEST from Apple Pay Prank app. If you got this, it works!";
  const recipients = CANADIAN_GATEWAYS.map((gw) => `${tenDigit}@${gw}`);

  log.push(`Sending to ${recipients.length} carrier gateways...`);
  log.push(``);

  const results = await Promise.allSettled(
    recipients.map((to) =>
      transporter.sendMail({
        from: email,
        to,
        subject: "",
        text: testMessage,
      }),
    ),
  );

  let ok = 0;
  let fail = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      ok++;
      log.push(`  OK: ${recipients[i]}`);
    } else {
      fail++;
      log.push(`  FAIL: ${recipients[i]} — ${r.reason?.message || "unknown"}`);
    }
  });

  log.push(``);
  log.push(`Results: ${ok} sent, ${fail} failed`);
  log.push(``);

  if (ok > 0) {
    log.push(`SUCCESS: Emails sent. The correct carrier should deliver it as an SMS within a few seconds.`);
  } else {
    log.push(`FAILURE: No emails could be sent. Check the errors above.`);
  }

  return NextResponse.json({ log, succeeded: ok, failed: fail });
}
