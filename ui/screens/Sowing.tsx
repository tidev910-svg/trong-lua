import { useState } from "react";
import type { Game } from "../useGame";
import { dayLabel, kg, money, seasonLabel } from "../format";
import { seasonKeyOfDay, seasonOfSowingDay } from "../../core/systems/calendar";
import { expectedSchedule } from "../../core/systems/growth";
import { sowingCost } from "../../core/systems/yield";
import type { PayWith } from "../../core/types";
import type { SowingMethod } from "../../data/schemas";

/** "Xuống giống" (spec §12.3, M2.4): variety, sạ/cấy, costs and expected dates. */
export function Sowing({ game, plotId, onClose }: { game: Game; plotId: number; onClose: () => void }) {
  const { view, act, data } = game;
  const [variety, setVariety] = useState(data.varieties[0]?.id ?? "");
  const [method, setMethod] = useState<SowingMethod>("broadcast");
  const [payWith, setPayWith] = useState<PayWith>("cash");

  const cost = sowingCost(variety, method, data);
  const schedule = expectedSchedule(view.day, variety, data);
  const season = seasonOfSowingDay(view.day, data.calendar);
  const baseYield = data.varieties.find((v) => v.id === variety)?.baseYieldKg[season] ?? 0;
  const lastDay = data.calendar.daysInYear - 1;

  const sow = () => {
    if (act({ type: "prepareAndSow", plotId, variety, method, payWith })) onClose();
  };

  return (
    <div className="dialog">
      <h3>
        Xuống giống thửa {plotId + 1} – vụ {seasonLabel(seasonKeyOfDay(view.day, data.calendar))}
      </h3>
      <p>
        Giống:{" "}
        {data.varieties.map((v) => (
          <label key={v.id}>
            <input type="radio" checked={variety === v.id} onChange={() => setVariety(v.id)} /> {v.name}{" "}
          </label>
        ))}
      </p>
      <p>
        Cách gieo:{" "}
        <label>
          <input type="radio" checked={method === "broadcast"} onChange={() => setMethod("broadcast")} /> Sạ (tốn giống, dễ đổ ngã)
        </label>{" "}
        <label>
          <input type="radio" checked={method === "transplant"} onChange={() => setMethod("transplant")} /> Cấy (tốn công, năng suất cao hơn)
        </label>
      </p>
      <table>
        <tbody>
          <tr><td>Làm đất</td><td>{money(cost.landPrep)}</td></tr>
          <tr><td>Giống</td><td>{money(cost.seed)}{payWith === "store_credit" ? ` → mua chịu ${money(Math.round(cost.seed * (1 + data.finance.storeCredit.markup)))}` : ""}</td></tr>
          <tr><td>Công cấy</td><td>{money(cost.labor)}</td></tr>
          <tr><td>Sức lực</td><td>{cost.energy}</td></tr>
          <tr><td>Năng suất gốc</td><td>{kg(baseYield * data.crop.sowing[method].yieldFactor)}</td></tr>
          <tr><td>Dự kiến trổ bông</td><td>{dayLabel(view, schedule.flowering)}</td></tr>
          <tr>
            <td>Dự kiến gặt được</td>
            <td className={schedule.harvestable > lastDay ? "bad" : ""}>
              {dayLabel(view, schedule.harvestable)}
              {schedule.harvestable > lastDay ? " (sau khi hết năm!)" : ""}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Trả tiền giống:{" "}
        <label>
          <input type="radio" checked={payWith === "cash"} onChange={() => setPayWith("cash")} /> tiền mặt
        </label>{" "}
        <label>
          <input type="radio" checked={payWith === "store_credit"} onChange={() => setPayWith("store_credit")} disabled={!view.credit.storeCreditOpen} /> mua chịu
        </label>
      </p>
      <div className="actions">
        <button onClick={sow}>Xuống giống</button>
        <button onClick={onClose}>Thôi</button>
      </div>
    </div>
  );
}
