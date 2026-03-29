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
