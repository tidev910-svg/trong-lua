import type { Policy } from "./policy";

/** Cash above which the average bot also farms Thu Đông (DATA_SPEC: "thêm Thu Đông nếu tiền mặt > 5 tr"). */
const TD_CASH_THRESHOLD = 5_000_000;

/** DATA_SPEC "average": A in Đông Xuân, B in Hè Thu, visits every 5 days + on alerts, loan shark when cash runs short. */
export const average: Policy = {
  name: "average",
  varietyFor: (season) => (season === "HT" ? "variety_b" : "variety_a"),
  sowsIn: (season, view) => season !== "TD" || view.cash > TD_CASH_THRESHOLD,
  visitEveryDays: 5,
  visitOnAlert: true,
  cureFrom: "medium",
  preventiveOnAlert: false,
  water: "any",
  useStoreCredit: true,
  loanShark: "whenShort",
  advanceSaleRatio: 0,
  harvest: "machine",
  waitSaleDays: 1,
};
