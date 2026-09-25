import { useState } from "react";
import type { Game } from "../useGame";
import { serializeSave } from "../../core/save";
import { WEATHER } from "../format";

/**
 * Debug panel (spec §12.8, M3.3), toggled with the backtick key. The only UI allowed to read the full state.
 * "Nhảy N ngày" is a normal skipUntil action (rest, no stop conditions) so saves stay replayable.
 */
export function DebugPanel({ game }: { game: Game }) {
  const { session, act } = game;
  const state = session.state;
  const [days, setDays] = useState(10);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const exportSave = () => {
    const blob = new Blob([serializeSave(session.save)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trong-lua-seed${state.seed}-day${state.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="debug">
      <h3>Debug</h3>
      <p>
        Seed {state.seed} · RNG {state.rngState} · ngày {state.day} · {session.save.actions.length} hành động · pha {state.phase.kind}
      </p>
      <p>Thời tiết thật: {state.weather.queue.map((w) => WEATHER[w]).join(" → ")}</p>
      <p>
        Lũ: {state.flood.day === null ? "năm nay không có" : `ngày ${state.flood.day} (báo ngày ${state.flood.warningDay}, radio nói ${state.flood.predictedDay})`}
      </p>
      <p>Độ lệch giá: {(state.market.deviation * 100).toFixed(2)}% · việc làm thuê: {String(state.hiredWorkAvailable)}</p>
      <table>
        <thead>
          <tr><th>Thửa</th><th>Trạng thái</th><th>Growth</th><th>Health</th><th>Nước</th><th>Sâu bệnh</th><th>Đổ ngã</th></tr>
        </thead>
        <tbody>
          {state.plots.map((p) => (
            <tr key={p.id}>
              <td>{p.id + 1}</td>
              <td>{p.status}</td>
              <td>{p.crop?.growth.toFixed(1) ?? "–"}</td>
              <td>{p.crop?.health.toFixed(2) ?? "–"}</td>
              <td>{p.crop?.water ?? "–"}</td>
              <td>{p.crop ? Object.entries(p.crop.pests).map(([k, v]) => `${k.slice(0, 5)} ${v.toFixed(2)}`).join(", ") : "–"}</td>
              <td>{p.crop ? String(p.crop.lodged) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="actions small">
        <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
        <button onClick={() => act({ type: "skipUntil", defaultActivity: "rest", stopOn: [], maxDays: days })}>Nhảy {days} ngày (nghỉ)</button>
        <button onClick={exportSave}>Xuất file lưu</button>
      </div>
      <details>
        <summary>Nhập file lưu</summary>
        <input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setImportError(game.importSave(await file.text()));
          }}
        />
        <textarea rows={3} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="…hoặc dán nội dung JSON" />
        <button onClick={() => setImportError(game.importSave(importText))}>Nạp</button>
        {importError && <p className="bad">{importError}</p>}
      </details>
      <details>
        <summary>Toàn bộ state (JSON)</summary>
        <pre>{JSON.stringify(state, null, 1)}</pre>
      </details>
    </aside>
  );
}
