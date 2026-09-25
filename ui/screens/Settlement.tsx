import { useEffect, useState } from "react";
import type { Game } from "../useGame";
import { dayLabel, money, seasonLabel } from "../format";
import type { Settlement as SettlementData } from "../../core/settlement";

const LINE_DELAY_MS = 450;
const FINAL_DELAY_MS = 1600;

function lines(s: SettlementData): [string, number][] {
  return [
    ...s.plots.map((p): [string, number] => [`Thửa ${p.plotId + 1}: bán lúa${p.advanceSales ? " + bán non" : ""}${p.shortfall ? " − bù thiếu" : ""}`, p.riceSales + p.advanceSales - p.shortfall]),
    ["Vật tư (giống, phân, thuốc)", -s.supplies],
    ["Làm đất, công cấy, nước, gặt", -s.farmWork],
    ["Lãi vay", -s.interest],
    ["Sinh hoạt phí trong vụ", -s.livingCost],
    ...(s.tetCost > 0 ? [["Tết", -s.tetCost] as [string, number]] : []),
  ];
}

/** "Tính sổ" (spec §11, M3.1): lines appear one by one; the profit/loss line comes last and slowly. */
export function Settlement({ game }: { game: Game }) {
  const { view, act } = game;
  const s = view.settlement;
  const [shown, setShown] = useState(0);
  const all = s ? lines(s) : [];
  const done = shown > all.length;

  useEffect(() => {
    if (!s || done) return;
    const delay = shown === all.length ? FINAL_DELAY_MS : LINE_DELAY_MS;
    const timer = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [s, shown, done, all.length]);

  if (!s) return null;
  return (
    <section className="settlement">
      <h2>Tính sổ vụ {seasonLabel(s.seasonKey)}</h2>
      <p className="muted">
        Từ {dayLabel(view, s.startDay)} đến {dayLabel(view, s.endDay)}
        {s.overlapsOtherSeason ? " · có vụ khác trùng thời gian, sinh hoạt phí và lãi được tính cho cả hai" : ""}
      </p>
      <table>
        <tbody>
          {all.slice(0, shown).map(([label, amount], i) => (
            <tr key={i}>
              <td>{label}</td>
              <td className={amount < 0 ? "bad num" : "num"}>{money(amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {done && (
        <>
          <p className={`final ${s.profit >= 0 ? "good" : "bad"}`}>
            Vụ này: {s.profit >= 0 ? "lời" : "lỗ"} {money(Math.abs(s.profit))}
          </p>
          <p className="muted">
            Nợ đã trả trong vụ {money(s.debtRepaid)} · nợ còn lại {money(s.debtRemaining)} · tiền mặt {money(s.cashNow)}
          </p>
        </>
      )}
      <div className="actions">
        {!done && <button onClick={() => setShown(all.length + 1)}>Xem ngay</button>}
        {done && <button onClick={() => act({ type: "acknowledge" })}>Tiếp tục</button>}
      </div>
    </section>
  );
}
