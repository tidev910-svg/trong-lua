import { useMemo, useState } from "react";
import { getActionOptions } from "../../core/actionOptions";
import { getPlayerView } from "../../core/playerView";
import { dispatch, newSession, type Session } from "../../core/save";
import type { Action } from "../../core/types";
import { loadData } from "../../data/loadData";
import { money } from "../format";
import { ActionButton } from "../paper/ActionButton";
import { Notebook } from "../paper/Notebook";
import { PinnedNote, type Box } from "../paper/PinnedNote";
import "../theme.css";

/**
 * Dev-only page (open with ?preview) to look at the paper components with real options before the
 * scene exists (M2.1). Not part of the game; removed or kept as a dev tool in M2.10.
 */
const data = loadData();

function previewSession(lowCash: boolean): Session {
  let s = newSession(20260926, data);
  const go: Action = { type: "chooseActivity", activity: "field" };
  s = dispatch(s, go, data).session;
  return lowCash ? { ...s, state: { ...s.state, cash: 500_000 } } : s;
}

const PLOT: Box = { left: 370, top: 170, right: 610, bottom: 340 };

export function PaperPreview() {
  const [lowCash, setLowCash] = useState(true);
  const [note, setNote] = useState(true);
  const [book, setBook] = useState(() => new URLSearchParams(window.location.search).get("preview") === "book");
  const [last, setLast] = useState<string>("");
  const view = useMemo(() => getPlayerView(previewSession(lowCash).state, data), [lowCash]);
  const choose = (a: Action) => setLast(JSON.stringify(a));

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: PLOT.left, top: PLOT.top, width: PLOT.right - PLOT.left, height: PLOT.bottom - PLOT.top, background: "#6b4f33", border: "9px solid #8a6b45", borderRadius: 6 }} />
      <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => setNote((v) => !v)}>Mẩu giấy thửa 1</button>
        <button className="btn" onClick={() => setBook(true)}>Mở vở (sổ nợ)</button>
        <button className="btn ghost" style={{ background: "#fff" }} onClick={() => setLowCash((v) => !v)}>
          {lowCash ? "Tiền: ít (mua chịu)" : "Tiền: đủ"}
        </button>
        <span style={{ color: "#fff", fontSize: 12, alignSelf: "center" }}>{last}</span>
      </div>
      {note && (
        <PinnedNote title="Thửa 1" anchor={PLOT} container={{ width: window.innerWidth, height: window.innerHeight }} index={0} onClose={() => setNote(false)}>
          <div className="meta">Ruộng trống. Tiền mặt {money(view.cash)}.</div>
          <div className="acts">
            {getActionOptions(view, { kind: "plot", plotId: 0 }).map((o) => (
              <ActionButton key={o.id} option={o} onChoose={choose} />
            ))}
          </div>
        </PinnedNote>
      )}
      {book && (
        <Notebook title="Sổ tiền nợ" onClose={() => setBook(false)}>
          <p>Tiền mặt: {money(view.cash)}</p>
          <h4>Đang nợ</h4>
          {view.loans.map((l) => (
            <div key={l.id} className="ledger-line">
              <span>{l.id}</span>
              <span>{money(l.balance)}</span>
            </div>
          ))}
          <h4>Việc có thể làm</h4>
          <div className="acts">
            {getActionOptions(view, { kind: "ledger" }).map((o) => (
              <ActionButton key={o.id} option={o} onChoose={choose} />
            ))}
          </div>
          <div className="row">
            <button className="btn" onClick={() => setBook(false)}>Gấp sổ</button>
          </div>
        </Notebook>
      )}
    </div>
  );
}
