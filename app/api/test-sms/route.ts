// app/api/test-sms/route.ts
// GET /api/test-sms?phone=4161234567
// GET /api/test-sms?phone=4161234567&msg=custom+message+here

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const CANADIAN_GATEWAYS = [
  "pcs.rogers.com", "sms.rogers.com", "fido.ca", "txt.fido.ca",
  "txt.bell.ca", "txt.bellmobility.ca", "text.mts.net",
  "msg.telus.com", "msg.koodomobile.com",
  "txt.freedommobile.ca", "txt.windmobile.ca", "sms.videotron.ca",
  "sms.sasktel.com", "pcs.eastlink.ca", "txt.eastlink.ca", "mobiletxt.ca",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = (url.searchParams.get("phone") || "").replace(/[^0-9]/g, "");
  const customMsg = url.searchParams.get("msg");
  const log: string[] = [];

  const email = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!email || !pass) {
    return NextResponse.json({ log: ["FATAL: Missing SMTP credentials"] }, { status: 500 });
  }

  let tenDigit = phone;
  if (tenDigit.length === 11 && tenDigit.startsWith("1")) tenDigit = tenDigit.slice(1);
  if (!tenDigit || tenDigit.length < 10) {
    return NextResponse.json({ log: ["Need 10-digit phone via ?phone="] }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: email, pass },
  });

  const message = customMsg || "TEST from Apple Pay Prank - if you got this, it works!";
  log.push(`Message: "${message}"`);

  const recipients = CANADIAN_GATEWAYS.map((gw) => `${tenDigit}@${gw}`);
  let ok = 0;

  for (const to of recipients) {
    try {
      await transporter.sendMail({ from: email, to, subject: " ", text: message });
      ok++;
      log.push(`OK: ${to}`);
    } catch (err) {
      log.push(`FAIL: ${to} - ${err instanceof Error ? err.message : err}`);
    }
  }

  log.push(`${ok}/${recipients.length} sent`);
  return NextResponse.json({ log, succeeded: ok });
}
