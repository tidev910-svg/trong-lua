import { useState } from "react";
import type { Game } from "../useGame";
import { dayLabel, DEBT_STAGE, kg, LOAN_KIND, money } from "../format";
import type { Loan } from "../../core/types";

function LoanRow({ game, loan }: { game: Game; loan: Loan }) {
  const { view, act } = game;
  const [amount, setAmount] = useState(Math.min(loan.balance, Math.max(0, view.cash)));
  const status =
    loan.finalDeadlineDay !== null
      ? `quá hạn, hạn chót ${dayLabel(view, loan.finalDeadlineDay)}`
      : loan.lateSinceDay !== null
        ? "quá hạn"
        : `còn ${loan.dueDay - view.day} ngày`;
  return (
    <tr className={loan.lateSinceDay !== null ? "bad" : ""}>
      <td>{LOAN_KIND[loan.kind]}</td>
      <td>{money(loan.principal)}</td>
      <td>{money(loan.balance)}</td>
      <td>{dayLabel(view, loan.dueDay)}</td>
      <td>{status}</td>
      <td>
        <input type="number" min={1} max={loan.balance} step={100_000} value={amount} onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
        <button onClick={() => act({ type: "repay", loanId: loan.id, amount })}>Trả</button>
        <button onClick={() => act({ type: "repay", loanId: loan.id, amount: Math.min(loan.balance, view.cash) })}>Trả hết được bao nhiêu</button>
        {loan.kind === "loan_shark" && loan.lateSinceDay === null && (
          <button onClick={() => act({ type: "rollOverLoan", loanId: loan.id })}>Đảo nợ (trả lãi {money(loan.balance - loan.principal)})</button>
        )}
      </td>
    </tr>
  );
}

/** "Tài chính" (spec §12.4, M2.5): debts, sources of money, uy tín. */
export function Finance({ game }: { game: Game }) {
  const { view, act, data } = game;
  const [sharkAmount, setSharkAmount] = useState(1_000_000);
  const [ratio, setRatio] = useState(data.finance.advanceSale.maxRatioOfExpected);
  const shark = data.finance.loanShark;
  const advance = data.finance.advanceSale;

  return (
    <section>
      <h2>Tài chính</h2>
      <p>
        Tiền mặt <b>{money(view.cash)}</b> · Uy tín <b>{Math.round(view.uyTin)}</b>/100 · Tình trạng nợ: <b>{DEBT_STAGE[view.debtStage]}</b>
      </p>

      <h3>Các khoản nợ</h3>
      <table>
        <thead>
          <tr><th>Loại</th><th>Gốc</th><th>Còn nợ</th><th>Hạn</th><th>Tình trạng</th><th></th></tr>
        </thead>
        <tbody>
          {view.loans.map((loan) => (
            <LoanRow key={`${loan.id}-${loan.balance}`} game={game} loan={loan} />
          ))}
        </tbody>
      </table>

      <h3>Nguồn tiền</h3>
      <div className="cards">
        <div className="card">
          <h4>Vay nóng</h4>
          <p>
            Lãi {Math.round(shark.interestPer30Days * 100)}%/{shark.termDays} ngày, trả sớm vẫn tính đủ lãi. Quá hạn phạt {Math.round(shark.latePenaltyRate * 100)}% và lãi chồng lãi.
          </p>
          <p>
            Đang vay {money(view.credit.loanSharkPrincipal)} / tối đa {money(view.credit.loanSharkMax)}. {view.credit.loanSharkOpen ? "" : "Hiện không ai cho vay."}
          </p>
          <input type="number" min={100_000} step={500_000} value={sharkAmount} onChange={(e) => setSharkAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))} />
          <button disabled={!view.credit.loanSharkOpen} onClick={() => act({ type: "takeLoanShark", amount: sharkAmount })}>Vay</button>
        </div>

        <div className="card">
          <h4>Mua chịu ở đại lý</h4>
          <p>
            Giá cao hơn {Math.round(data.finance.storeCredit.markup * 100)}%, tự trừ khi bán lúa. Cần uy tín từ {data.finance.storeCredit.minUyTin}.
          </p>
          <p>
            Đang nợ {money(view.credit.storeCreditBalance)} / hạn mức {money(view.credit.storeCreditLimit)}. {view.credit.storeCreditOpen ? "Đang cho mua chịu." : "Không cho mua chịu."}
          </p>
          <p className="muted">Chọn "mua chịu" khi mua giống, phân, thuốc ngoài đồng.</p>
        </div>

        <div className="card">
          <h4>Bán lúa non</h4>
          <p>
            Nhận ngay {Math.round(advance.priceFactor * 100)}% giá hôm nay cho phần sản lượng bán trước; gặt thiếu thì bù {Math.round(advance.shortfallPenalty * 100)}% giá thị trường.
          </p>
          <label>
            Tỉ lệ bán: <input type="number" min={0.1} max={advance.maxRatioOfExpected} step={0.1} value={ratio} onChange={(e) => setRatio(Number(e.target.value) || 0)} />
          </label>
          {view.plots
            .filter((p) => p.status === "planted" && p.crop && !p.advanceContract)
            .map((p) => {
              const kgSold = (p.crop?.expectedYieldKg ?? 0) * ratio;
              const price = (view.market.pricePerKg * (data.varieties.find((v) => v.id === p.crop?.varietyId)?.priceMultiplier ?? 1)) * advance.priceFactor;
              return (
                <p key={p.id}>
                  Thửa {p.id + 1}: {kg(kgSold)} → {money(kgSold * price)}{" "}
                  <button onClick={() => act({ type: "sellAdvance", plotId: p.id, ratio })}>Bán non</button>
                </p>
              );
            })}
        </div>

        <div className="card">
          <h4>Tiền thuê ruộng</h4>
          <p>Xin gia hạn {data.finance.rentExtension.days} ngày: mất {data.finance.rentExtension.uyTinCost} uy tín, năm sau tăng giá thuê {Math.round(data.finance.rentExtension.nextYearRentIncrease * 100)}%.</p>
          <p>Đã xin {view.credit.rentExtensionsUsed}/{data.finance.rentExtension.maxPerYear} lần năm nay.</p>
          <button onClick={() => act({ type: "requestRentExtension" })}>Xin gia hạn</button>
          {!view.landAccess && (
            <p>
              Thuê lại ruộng: {money(view.credit.reRentCost)} <button onClick={() => act({ type: "reRent" })}>Thuê lại</button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
