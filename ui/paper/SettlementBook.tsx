import { useEffect, useState } from "react";
import { plotSuffix } from "../../core/names";
import type { Settlement } from "../../core/settlement";
import { money, seasonLabel } from "../format";
import { prefersReducedMotion } from "../motion";
import { Notebook } from "./Notebook";

/** Delay between lines and the extra wait before the result line (UI_DIRECTION). */
export const LINE_MS = 380;
export const RESULT_EXTRA_MS = 1400;

export interface SettlementLine {
  label: string;
  /** Signed VND for money lines (in + / out −); null for plain facts. */
  amount: number | null;
  text?: string;
}

/**
 * The lines of the settlement page, in reading order: what came in (per plot when there are several), what went out, then the debt and
 * cash facts. Everything comes from core/settlement.ts; this only words it.
 */
export function settlementLines(s: Settlement, plotCount = 1): SettlementLine[] {
  const lines: SettlementLine[] = [];
  for (const p of s.plots) {
    const of = plotSuffix(p.plotId, plotCount);
    if (p.riceSales !== 0) lines.push({ label: `Bán lúa${of}`, amount: p.riceSales });
    if (p.advanceSales !== 0) lines.push({ label: `Bán lúa non${of}`, amount: p.advanceSales });
    if (p.shortfall !== 0) lines.push({ label: `Bù thiếu lúa non${of}`, amount: -p.shortfall });
  }
  const out: [string, number][] = [
    ["Giống, phân, thuốc", s.supplies],
    ["Làm đất, công cấy, nước, máy gặt", s.farmWork],
    ["Lãi vay", s.interest],
    ["Sinh hoạt phí trong vụ", s.livingCost],
    ["Tết", s.tetCost],
  ];
  for (const [label, amount] of out) if (amount !== 0) lines.push({ label, amount: -amount });
  lines.push({ label: "Nợ đã trả trong vụ", amount: null, text: money(s.debtRepaid) });
  lines.push({ label: "Còn nợ", amount: null, text: money(s.debtRemaining) });
  lines.push({ label: "Tiền mặt cuối vụ", amount: null, text: money(s.cashNow) });
  return lines;
}

export function resultText(profit: number): string {
  return profit < 0 ? `lỗ ${money(-profit)}` : `lời ${money(profit)}`;
}

/** Ms after opening at which line `i` of `count` (the last one is the result) appears. */
export function lineDelay(i: number, count: number): number {
  return i === count - 1 ? i * LINE_MS + RESULT_EXTRA_MS : i * LINE_MS;
}

interface Props {
  settlement: Settlement;
  onClose: () => void;
}

/**
 * "Tính sổ" (spec §11, UI_DIRECTION): the most emotional moment of the season. Lines appear one by one, the
 * "Vụ này: lời/lỗ" line last after a pause, green or red. Shown at once with reduced motion.
 */
export function SettlementBook({ settlement, onClose }: Props) {
  const lines = settlementLines(settlement);
  const count = lines.length + 1;
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? count : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setShown((n) => Math.max(n, i + 1)), lineDelay(i, count)));
    return () => timers.forEach(clearTimeout);
  }, [count]);

  return (
    <Notebook title={`Tính sổ vụ ${seasonLabel(settlement.seasonKey)}`} onClose={onClose}>
      {lines.map((l, i) => (
        <div key={l.label} className={`ledger-line fade${i < shown ? " in" : ""}`}>
          <span>{l.label}</span>
          {l.amount !== null ? <span className={l.amount < 0 ? "neg" : ""}>{money(l.amount)}</span> : <span className="hint">{l.text}</span>}
        </div>
      ))}
      <div className={`ledger-line total fade${shown >= count ? " in" : ""}`}>
        <span>Vụ này</span>
        <span className={settlement.profit < 0 ? "neg" : "pos"}>{resultText(settlement.profit)}</span>
      </div>
      {settlement.overlapsOtherSeason && <p className="hint">Vụ này chồng ngày với vụ khác nên sinh hoạt phí và lãi vay có thể được tính ở cả hai vụ.</p>}
      <div className="row">
        <button type="button" className="btn" onClick={onClose}>
          Gấp sổ
        </button>
      </div>
    </Notebook>
  );
}
