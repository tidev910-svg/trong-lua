import type { Policy } from "./policy";

/** DATA_SPEC "safe": variety A, 2 seasons (no Thu Đông), visits every 3 days + on alerts, store credit, no loan shark. */
export const safe: Policy = {
  name: "safe",
  varietyFor: () => "variety_a",
  sowsIn: (season) => season !== "TD",
  visitEveryDays: 3,
  visitOnAlert: true,
  cureFrom: "medium",
  preventiveOnAlert: true,
  water: "any",
  useStoreCredit: true,
  loanShark: "never",
  advanceSaleRatio: 0,
  harvest: "machine",
  waitSaleDays: 0,
};
