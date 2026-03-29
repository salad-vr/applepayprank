// lib/types.ts

export type PrankConfig = {
  pranksterName: string;
  friendName: string;
  amountMode: "fixed" | "range";
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  startingBalance?: number;

  // ---- SMS ----
  victimPhone?: string;
  sendSms?: boolean;
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
  isPrank?: boolean;
};
