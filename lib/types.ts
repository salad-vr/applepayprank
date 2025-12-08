// lib/types.ts

export type PrankConfig = {
  friendName: string;
  pranksterName: string;
  amountMode: "fixed" | "range";
  fixedAmount?: number;
  minAmount?: number;
  maxAmount?: number;
};

export type TransactionDirection = "in" | "out";

export type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  direction: TransactionDirection;
  timeLabel: string;
  isPrank?: boolean; // we can style / track the prank row later
};
