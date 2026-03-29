// lib/types.ts

export type PrankConfig = {
  /**
   * The person "receiving" the money -- usually you.
   */
  pranksterName: string;

  /**
   * The person "sending" the money -- the friend you're pretending sent it.
   */
  friendName: string;

  /**
   * Mode for how the prank amount is chosen.
   * - "fixed" -> always use fixedAmount
   * - "range" -> randomly choose between minAmount and maxAmount
   */
  amountMode: "fixed" | "range";

  /**
   * Exact amount to show when amountMode === "fixed".
   */
  fixedAmount?: number;

  /**
   * Minimum value for random amounts (when amountMode === "range").
   */
  minAmount?: number;

  /**
   * Maximum value for random amounts (when amountMode === "range").
   */
  maxAmount?: number;

  /**
   * Starting visible balance on the card when there's no saved wallet yet.
   */
  startingBalance?: number;

  // ---- SMS Prank ----

  /**
   * Phone number of the person being pranked (for SMS delivery).
   */
  victimPhone?: string;

  /**
   * Whether to send an SMS when the prank triggers.
   */
  sendSms?: boolean;

  /**
   * Message template with {amount} and {friendName} placeholders.
   */
  smsTemplate?: string;

  /**
   * SMS provider:
   * - "email"    — Free & unlimited via email-to-SMS carrier gateways (recommended)
   * - "textbelt" — 1 free text/day, or buy a key for more
   * - "twilio"   — Free trial, then pay-per-text
   */
  smsProvider?: "email" | "textbelt" | "twilio";

  // ---- Email-to-SMS gateway fields ----

  /**
   * Victim's mobile carrier (e.g. "verizon", "att", "tmobile").
   * Required when smsProvider === "email".
   */
  victimCarrier?: string;

  /**
   * Gmail address used to send the email-to-SMS.
   */
  smtpEmail?: string;

  /**
   * Gmail App Password (NOT your regular password).
   * Generate at https://myaccount.google.com/apppasswords
   */
  smtpPassword?: string;

  // ---- TextBelt fields ----

  /**
   * TextBelt API key. Defaults to "textbelt" (1 free text/day).
   * Purchase keys at https://textbelt.com for more.
   */
  textbeltKey?: string;

  // ---- Twilio fields ----

  /**
   * Twilio Account SID (from twilio.com/console).
   */
  twilioAccountSid?: string;

  /**
   * Twilio Auth Token.
   */
  twilioAuthToken?: string;

  /**
   * Twilio "From" phone number (e.g. +15551234567).
   */
  twilioFromNumber?: string;
};

export type TransactionDirection = "in" | "out";

export type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  direction: TransactionDirection;
  timeLabel: string;

  /**
   * Marks the transaction as one created by the prank flow.
   */
  isPrank?: boolean;
};
