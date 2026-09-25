import type { Game } from "../useGame";
import { DEBT_STAGE, money } from "../format";
import type { DebtStage } from "../../core/types";

const REASON = {
  yearEnd: "Hết một năm làm ruộng",
  bankrupt: "Phá sản",
  quit: "Bán hết, lên thành phố",
  inProgress: "Đang chơi",
} as const;

/** "Thẻ tổng kết" (spec §11, M3.2), with replay on the same or a new seed. */
export function Summary({ game }: { game: Game }) {
  const s = game.view.summary;
  if (!s) return null;
  return (
    <section className="summary">
      <h2>{REASON[s.endReason]}</h2>
      <table>
        <tbody>
          <tr><td>Số vụ đã làm</td><td>{s.seasonsCompleted}</td></tr>
          <tr><td>Tài sản ròng cuối cùng</td><td className={s.netWorth < 0 ? "bad" : "good"}>{money(s.netWorth)}</td></tr>
          <tr><td>Tiền mặt cao nhất</td><td>{money(s.peakCash)}</td></tr>
          <tr><td>Món nợ lớn nhất</td><td>{money(s.largestDebt)}</td></tr>
          <tr><td>Uy tín cuối</td><td>{Math.round(s.uyTin)}</td></tr>
          <tr><td>Số lần suýt phá sản</td><td>{s.nearBankruptcyCount}</td></tr>
          <tr><td>Nợ nặng nhất từng gặp</td><td>{DEBT_STAGE[s.maxDebtStage as DebtStage]}</td></tr>
          <tr><td>Seed</td><td>{s.seed}</td></tr>
        </tbody>
      </table>
      <div className="actions">
        <button onClick={() => game.newGame(s.seed)}>Chơi lại cùng seed</button>
        <button onClick={() => game.newGame()}>Chơi ván mới</button>
      </div>
    </section>
  );
}
