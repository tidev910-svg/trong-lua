import type { GameData } from "../../data/schemas";
import { getActionOptions } from "../../core/actionOptions";
import type { PlayerView } from "../../core/playerView";
import type { Action, GameEvent } from "../../core/types";
import { kg, money } from "../format";
import { ActionButton } from "./ActionButton";
import { Notebook } from "./Notebook";
import { shortVarietyName } from "./PlotNote";

/** Toast after a sale: money for the rice, and the store-credit debt taken from it (decision A8). */
export function saleText(events: readonly GameEvent[], cashChange: number): string {
  const sold = events.reduce((sum, e) => sum + (e.kind === "lotSold" ? e.amount : 0), 0);
  const repaid = sold - cashChange;
  return repaid > 0 ? `Bán lúa được ${money(sold)}, trừ nợ đại lý ${money(repaid)}.` : `Bán lúa được ${money(sold)}.`;
}

/** How waiting works, in the player's words (numbers from data). */
export function waitingText(data: GameData): string {
  const { maxWaitDays, freshRiceLossPerDay } = data.crop.harvest;
  return `Lúa tươi để mỗi đêm hao ${Math.round(freshRiceLossPerDay * 100)}%; để quá ${maxWaitDays} đêm thì phải bán cho thương lái với giá hôm đó.`;
}

interface Props {
  view: PlayerView;
  data: GameData;
  onChoose: (action: Action) => void;
  onClose: () => void;
}

/** "Thu hoạch và bán" (spec §12.6), opened from the trader's boat: today's price, each lot, sell or wait. */
export function TraderBook({ view, data, onChoose, onClose }: Props) {
  const options = getActionOptions(view, { kind: "trader" });
  return (
    <Notebook title="Thương lái" onClose={onClose}>
      <h4>Giá hôm nay</h4>
      {data.varieties.map((v) => (
        <p key={v.id}>
          {shortVarietyName(v.id, data)}: {money(view.market.traderPricePerKg[v.id] ?? 0)}/kg
        </p>
      ))}
      {view.market.glut && <p className="neg">Đang gặt rộ, thương lái ép giá.</p>}
      <h4>Lúa chờ bán</h4>
      {view.lots.length === 0 && <p>Không còn lúa chờ bán.</p>}
      {view.lots.map((lot) => {
        const option = options.find((o) => o.id === `sell:${lot.id}`);
        return (
          <div key={lot.id} className="loan">
            <div className="ledger-line">
              <span>
                {view.plots.length > 1 && `Thửa ${lot.plotId + 1}, `}
                {shortVarietyName(lot.varietyId, data)}: {kg(lot.kg)}
              </span>
              <span>{money(lot.valueNow)}</span>
            </div>
            <p className="hint">{lot.nightsWaited === 0 ? "Gặt hôm nay" : `Đã chờ ${lot.nightsWaited} đêm`}</p>
            {option && (
              <div className="acts">
                <ActionButton option={option} onChoose={onChoose} />
              </div>
            )}
          </div>
        );
      })}
      <p className="hint">{waitingText(data)} Không bán thì cứ gấp sổ, mai hỏi giá lại.</p>
      <div className="row">
        <button type="button" className="btn" onClick={onClose}>
          Để mai tính
        </button>
      </div>
    </Notebook>
  );
}
