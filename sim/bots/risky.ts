import type { Policy } from "./policy";

/**
 * DATA_SPEC "risky": variety B, 3 seasons, loan shark freely, sells 50% in advance, hand harvest.
 * Farms like "average" (changed 26/09/2026, BALANCE_LOG run 1): with 7-day visits and curing only at
 * "heavy" it always lost to pests, which hid the financial risk the bot is meant to measure.
 */
export const risky: Policy = {
  name: "risky",
  varietyFor: () => "variety_b",
  sowsIn: () => true,
  visitEveryDays: 5,
  visitOnAlert: false,
  cureFrom: "medium",
  preventiveOnAlert: false,
  water: "any",
  useStoreCredit: false,
  loanShark: "freely",
  advanceSaleRatio: 0.5,
  harvest: "hand",
  waitSaleDays: 2,
};
