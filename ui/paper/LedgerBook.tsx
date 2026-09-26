import { useState } from "react";
import type { GameData } from "../../data/schemas";
import { getActionOptions, quoteOption, type ActionOption, type OptionQuote } from "../../core/actionOptions";
import type { PlayerView } from "../../core/playerView";
import type { Action, Loan } from "../../core/types";
import { dayLabel, DEBT_STAGE, kg, LOAN_KIND, money } from "../format";
import { ActionButton } from "./ActionButton";
import { Notebook } from "./Notebook";

/** Due line of a loan as the player reads it. */
export function dueText(loan: Loan, view: Pick<PlayerView, "day" | "date">): string {
  if (loan.lateSinceDay !== null) {
    const deadline = loan.finalDeadlineDay !== null ? `, hạn chót ${dayLabel(view, loan.finalDeadlineDay)}` : "";
    return `Quá hạn ${view.day - loan.dueDay} ngày${deadline}`;
  }
  if (loan.kind === "store_credit") return "Trả khi bán lúa";
  if (loan.dueDay === view.day) return "Hạn hôm nay";
  return `Hạn ${dayLabel(view, loan.dueDay)} (còn ${loan.dueDay - view.day} ngày)`;
}

/** Confirmation after a ledger action, from the cash it moved (before → after). */
export function ledgerDoneText(action: Action, cashBefore: number, cashAfter: number): string | null {
  switch (action.type) {
    case "repay":
      return `Đã trả ${money(action.amount)}.`;
    case "rollOverLoan":
      return `Đã trả lãi ${money(cashBefore - cashAfter)}, khoản vay được gia hạn.`;
    case "takeLoanShark":
      return `Nhận ${money(action.amount)} tiền vay nóng.`;
    case "sellAdvance":
      return `Bán lúa non: nhận ${money(cashAfter - cashBefore)}.`;
    case "requestRentExtension":
      return "Chủ đất đồng ý hoãn tiền thuê.";
    case "reRent":
      return "Đã thuê lại ruộng.";
    default:
      return null;
  }
}

/** One line explaining the terms for the chosen amount. */
export function quoteText(option: ActionOption, quote: OptionQuote, view: Pick<PlayerView, "day" | "date">): string {
  switch (quote.action.type) {
    case "repay":
      return quote.owe !== null && quote.owe > 0 ? `Trả xong còn nợ ${money(quote.owe)}.` : "Trả hết khoản này.";
    case "takeLoanShark":
      return `Nhận ngay ${money(quote.receive)}, phải trả ${money(quote.owe ?? 0)} trước ngày ${dayLabel(view, quote.dueDay ?? view.day)}.`;
    case "sellAdvance":
      return `Bán trước ${kg(quote.kg ?? 0)}, nhận ngay ${money(quote.receive)}. Gặt thiếu thì phải bù tiền.`;
    default:
      return option.label;
  }
}

/** Presentation steps for the amount field (VND or percent); every value in the option's range is accepted. */
function stepFor(option: ActionOption): number {
  return option.range?.field === "percent" ? 5 : 100_000;
}

function RangedAction({ option, view, data, onChoose }: { option: ActionOption; view: PlayerView; data: GameData; onChoose: (a: Action) => void }) {
  const range = option.range;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(range?.max ?? 0);
  if (!range || !option.enabled) return <ActionButton option={option} onChoose={onChoose} />;
  if (!open) return <ActionButton option={{ ...option, cost: 0 }} onChoose={() => setOpen(true)} />;
  const quote = quoteOption(view, option, value, data);
  const unit = range.field === "percent" ? "% sản lượng dự kiến" : "đ";
  return (
    <div className="act-group ranged">
      <div className="act-head">{option.label}</div>
      <label className="amount">
        <input
          type="number"
          min={range.min}
          max={range.max}
          step={stepFor(option)}
          value={value}
          onChange={(e) => setValue(Math.min(range.max, Math.max(range.min, Math.round(Number(e.target.value) || range.min))))}
        />{" "}
        {unit} <small>(tối đa {range.field === "percent" ? `${range.max}%` : money(range.max)})</small>
      </label>
      <div className="quote">{quoteText(option, quote, view)}</div>
      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setOpen(false);
            onChoose(quote.action);
          }}
        >
          Đồng ý
        </button>
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Thôi
        </button>
      </div>
    </div>
  );
}

interface Props {
  view: PlayerView;
  data: GameData;
  onChoose: (action: Action) => void;
  onClose: () => void;
}

/** "Sổ tiền nợ" (spec §12.5): cash, every debt, uy tín, borrowing options, re-renting, quitting. */
export function LedgerBook({ view, data, onChoose, onClose }: Props) {
  const [quitting, setQuitting] = useState(false);
  const options = getActionOptions(view, { kind: "ledger" });
  const byLoan = (loan: Loan) => options.filter((o) => o.id === `repay:${loan.id}` || o.id === `rollOver:${loan.id}`);
  const borrow = options.filter((o) => o.id === "loanShark" || o.id.startsWith("advance:") || o.id === "rentExtension" || o.id === "reRent");
  const quit = options.find((o) => o.id === "quit");
  const c = view.credit;
  const item = (o: ActionOption) => <RangedAction key={o.id} option={o} view={view} data={data} onChoose={onChoose} />;

  return (
    <Notebook title="Sổ tiền nợ" onClose={onClose}>
      <p>Tiền mặt: {money(view.cash)}</p>
      <p>
        Uy tín trong làng: {Math.round(view.uyTin)}/100{view.debtStage >= 1 && <span className="neg"> · {DEBT_STAGE[view.debtStage]}</span>}
      </p>
      <h4>Đang nợ</h4>
      {view.loans.length === 0 && <p>Không nợ ai.</p>}
      {view.loans.map((loan) => (
        <div key={loan.id} className="loan">
          <div className="ledger-line">
            <span>{LOAN_KIND[loan.kind]}</span>
            <span>{money(loan.balance)}</span>
          </div>
          <p className={`hint${loan.lateSinceDay !== null ? " neg" : ""}`}>{dueText(loan, view)}</p>
          <div className="acts">{byLoan(loan).map(item)}</div>
        </div>
      ))}
      <h4>Xoay tiền</h4>
      <p className="hint">
        Mua chịu đại lý: đang nợ {money(c.storeCreditBalance)} / hạn mức {money(c.storeCreditLimit)}. Vay nóng: đang vay {money(c.loanSharkPrincipal)} / tối đa {money(c.loanSharkMax)}.
      </p>
      <div className="acts">{borrow.map(item)}</div>
      <h4>Bỏ cuộc</h4>
      {quit &&
        (quitting ? (
          <>
            <p>Bán hết lúa đang có và lên thành phố làm công nhân? Lượt chơi sẽ kết thúc.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => onChoose(quit.action)}>
                Đúng, lên thành phố
              </button>
              <button type="button" className="btn ghost" onClick={() => setQuitting(false)}>
                Ở lại
              </button>
            </div>
          </>
        ) : (
          <div className="acts">
            <ActionButton option={quit} onChoose={() => setQuitting(true)} />
          </div>
        ))}
      <div className="row">
        <button type="button" className="btn" onClick={onClose}>
          Gấp sổ
        </button>
      </div>
    </Notebook>
  );
}
