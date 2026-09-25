import { useState } from "react";
import type { Game } from "../useGame";
import { money, SIGN, STAGE, varietyName, WATER } from "../format";
import { Sowing } from "./Sowing";
import type { PlotView } from "../../core/playerView";
import type { PayWith } from "../../core/types";

/** "Thăm đồng" (spec §12.2, M2.3): what was seen this morning/afternoon, and the field actions. */
export function Field({ game }: { game: Game }) {
  const { view, act, data } = game;
  const [payWith, setPayWith] = useState<PayWith>("cash");
  const [sowingPlot, setSowingPlot] = useState<number | null>(null);
  const c = data.crop;

  const card = (plot: PlotView) => {
    const k = plot.known;
    const planted = plot.status === "planted" && plot.crop !== null;
    const ready = k?.stage === "harvestable";
    return (
      <div className="card plot" key={plot.id}>
        <h3>Thửa {plot.id + 1}</h3>
        {plot.crop ? (
          <>
            <p>
              {varietyName(plot.crop.varietyId, data.varieties)} · {plot.crop.method === "broadcast" ? "sạ" : "cấy"}
            </p>
            <p>
              <b>{k?.stage ? STAGE[k.stage] : "?"}</b> · {k?.waterLevel ? WATER[k.waterLevel] : "?"} · sức khỏe {k?.healthBand ?? "?"}
            </p>
            {data.pests.map((pest) => {
              const sign = k?.signs[pest.id] ?? null;
              return sign ? (
                <p key={pest.id} className={sign === "light" ? "warn" : "bad"}>
                  {pest.name} ({SIGN[sign]}): {pest.signs[sign]}
                </p>
              ) : null;
            })}
            <p className="muted">Đã bón: {plot.crop.fertilizerApps.map((a) => STAGE[a.stage]).join(", ") || "chưa"}</p>
            {plot.advanceContract && <p className="muted">Đã bán non {Math.round(plot.advanceContract.kg)} kg</p>}
          </>
        ) : (
          <p>{plot.status === "harvested" ? "Đã gặt" : "Trống"}</p>
        )}
        <div className="actions small">
          {!planted && (
            <button onClick={() => setSowingPlot(plot.id)}>Làm đất & xuống giống…</button>
          )}
          {planted && !ready && (
            <>
              <button onClick={() => act({ type: "fertilize", plotId: plot.id, payWith })}>
                Bón phân ({money(c.fertilizer.costPerApp)}, −{c.fertilizer.energy})
              </button>
              <button onClick={() => act({ type: "adjustWater", plotId: plot.id })}>
                Chỉnh nước ({money(c.water.adjustCost)}, −{c.water.adjustEnergy})
              </button>
              {data.pests.map((pest) => (
                <span key={pest.id}>
                  <button onClick={() => act({ type: "spray", plotId: plot.id, pest: pest.id, mode: "cure", payWith })}>
                    Phun trị {pest.name}
                  </button>
                  <button onClick={() => act({ type: "spray", plotId: plot.id, pest: pest.id, mode: "preventive", payWith })}>
                    Phun phòng {pest.name}
                  </button>
                </span>
              ))}
            </>
          )}
          {planted && ready && (
            <>
              <button onClick={() => act({ type: "harvest", plotId: plot.id, method: "machine" })}>
                Thuê máy gặt ({money(c.harvest.machineCostPerPlot)})
              </button>
              <button onClick={() => act({ type: "harvest", plotId: plot.id, method: "hand" })}>Gặt tay (−{c.harvest.handEnergyPerPlot} sức)</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <section>
      <h2>Ngoài đồng</h2>
      <p>
        Sức lực còn <b>{view.energy}</b>/{view.energyMax}. Phun thuốc {money(c.spray.costPerApp)}, −{c.spray.energy} sức. Trả vật tư bằng:{" "}
        <label>
          <input type="radio" checked={payWith === "cash"} onChange={() => setPayWith("cash")} /> tiền mặt
        </label>{" "}
        <label>
          <input type="radio" checked={payWith === "store_credit"} onChange={() => setPayWith("store_credit")} disabled={!view.credit.storeCreditOpen} /> mua chịu (+
          {Math.round(data.finance.storeCredit.markup * 100)}%)
        </label>
      </p>
      <div className="cards">{view.plots.map(card)}</div>
      {sowingPlot !== null && <Sowing game={game} plotId={sowingPlot} onClose={() => setSowingPlot(null)} />}
      <div className="actions">
        <button onClick={() => act({ type: "endHalfDay" })}>Về nhà (hết buổi)</button>
      </div>
    </section>
  );
}
