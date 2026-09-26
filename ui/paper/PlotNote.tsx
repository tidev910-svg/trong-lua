import { useState } from "react";
import type { GameData } from "../../data/schemas";
import { getActionOptions, type ActionOption } from "../../core/actionOptions";
import type { PlayerView, PlotView } from "../../core/playerView";
import type { Action } from "../../core/types";
import { dayLabel, kg, STAGE } from "../format";
import { Bar } from "../hud/Bar";
import { ripenessText, WATER_WORDS } from "../hud/labels";
import { ActionButton } from "./ActionButton";

/** Short variety name: the part before " – " in data ("Giống A – cực ngắn ngày" → "Giống A"). */
export function shortVarietyName(varietyId: string, data: GameData): string {
  const name = data.varieties.find((v) => v.id === varietyId)?.name ?? varietyId;
  return name.split(" – ")[0] ?? name;
}

/** What the note says about the plot, from `known` (the player is standing in the field). */
export function plotNoteLines(plot: PlotView, view: Pick<PlayerView, "day">, data: GameData): { meta: string; signs: string[] } {
  const k = plot.known;
  const water = k?.waterLevel ? `nước ${WATER_WORDS[k.waterLevel]}` : null;
  if (plot.crop === null || k === null || k.stage === null) {
    const what = plot.status === "harvested" ? "Đã gặt xong" : "Ruộng trống";
    return { meta: water ? `${what}, ${water}.` : `${what}.`, signs: [] };
  }
  const crop = plot.crop;
  const age = view.day - crop.sowDay;
  const method = crop.method === "broadcast" ? "sạ" : "cấy";
  const health = k.healthBand ? `, lúa ${k.healthBand.toLowerCase()}` : "";
  const meta = `${shortVarietyName(crop.varietyId, data)} ${method}, ${STAGE[k.stage].toLowerCase()} (ngày ${age}). ${water ? water[0]!.toUpperCase() + water.slice(1) : ""}${health}.`;
  const signs: string[] = [];
  for (const pest of data.pests) {
    const level = k.signs[pest.id] ?? null;
    if (level !== null) signs.push(pest.signs[level]);
  }
  return { meta, signs };
}

interface Props {
  view: PlayerView;
  data: GameData;
  plotId: number;
  onChoose: (action: Action, option: ActionOption) => void;
}

/**
 * Contents of the pinned note beside a plot (UI_DIRECTION "Mẩu giấy thửa ruộng"): what the player sees there and
 * the work they can do, every button from getActionOptions. Sowing opens a sub-step (variety × sạ/cấy);
 * preventive sprays are grouped under one entry.
 */
export function PlotNote({ view, data, plotId, onChoose }: Props) {
  const [sowing, setSowing] = useState(false);
  const [preventive, setPreventive] = useState(false);
  const plot = view.plots[plotId];
  if (!plot) return null;
  const options = getActionOptions(view, { kind: "plot", plotId });
  const { meta, signs } = plotNoteLines(plot, view, data);
  const sow = options.filter((o) => o.id.startsWith("sow:"));
  const prevent = options.filter((o) => o.id.startsWith("spray:preventive:"));
  const rest = options.filter((o) => !o.id.startsWith("sow:") && !o.id.startsWith("spray:preventive:") && o.id !== "goToField");
  const button = (o: ActionOption) => <ActionButton key={o.id} option={o} onChoose={(a) => onChoose(a, o)} />;
  const withHarvestDay = (o: ActionOption): ActionOption => (o.expectedHarvestDay === null ? o : { ...o, detail: `Dự kiến gặt ngày ${dayLabel(view, o.expectedHarvestDay)}` });

  return (
    <>
      <div className="meta">{meta}</div>
      {plot.crop !== null && plot.known?.ripeness != null && (
        <div className="ripe">
          <div className="meta">
            {ripenessText(plot.known.ripeness)} (theo lịch, gặt khoảng {dayLabel(view, plot.crop.expected.harvestable)})
          </div>
          <Bar value={Math.floor(plot.known.ripeness * 100)} max={100} className="ripe" label="Lúa chín" />
        </div>
      )}
      {plot.crop !== null &&
        (signs.length > 0 ? (
          signs.map((s) => (
            <div key={s} className="sign">
              • {s}
            </div>
          ))
        ) : (
          <div>Không thấy dấu hiệu lạ.</div>
        ))}
      {plot.advanceContract && <div className="meta">Đã bán non {kg(plot.advanceContract.kg)}, giao khi gặt.</div>}
      <div className="acts">
        {sow.length > 0 &&
          (sowing ? (
            <>
              <div className="meta">Làm đất rồi xuống giống:</div>
              {sow.map((o) => button(withHarvestDay(o)))}
            </>
          ) : (
            <button type="button" className="act" onClick={() => setSowing(true)}>
              <span>Xuống giống…</span>
              <small>chọn giống, sạ hay cấy</small>
            </button>
          ))}
        {rest.map(button)}
        {prevent.length > 0 &&
          (preventive ? (
            prevent.map(button)
          ) : (
            <button type="button" className="act" onClick={() => setPreventive(true)}>
              <span>Phun phòng…</span>
              <small>{prevent[0] ? `${prevent[0].energy} sức mỗi lần` : ""}</small>
            </button>
          ))}
      </div>
    </>
  );
}
