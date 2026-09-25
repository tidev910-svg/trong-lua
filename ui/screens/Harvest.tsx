import type { Game } from "../useGame";
import { kg, money, varietyName } from "../format";

/** "Thu hoạch và bán" (spec §12.5, M2.6): lots waiting to be sold, today's trader price, sell or wait. */
export function Harvest({ game }: { game: Game }) {
  const { view, act, data } = game;
  const maxWait = data.crop.harvest.maxWaitDays;
  const loss = Math.round(data.crop.harvest.freshRiceLossPerDay * 100);

  return (
    <section>
      <h2>Bán lúa</h2>
      <p>
        Giá thị trường hôm nay {money(view.market.pricePerKg)}/kg (giá gốc tháng này {money(view.market.basePricePerKg)}/kg)
        {view.market.glut ? " – cả vùng đang gặt rộ, thương lái ép giá." : "."}
      </p>
      <p>
        Thương lái trả:{" "}
        {data.varieties.map((v) => `${v.name}: ${money(view.market.traderPricePerKg[v.id] ?? 0)}/kg`).join(" · ")}
        {" "}(uy tín cao được giá tốt hơn)
      </p>
      <p className="muted">
        Gặt ở màn "Ngoài đồng". Lúa tươi mất {loss}% khối lượng mỗi đêm; để quá {maxWait} đêm thương lái tự mua theo giá hôm đó.
      </p>
      {view.lots.length === 0 ? (
        <p>Không có lúa chờ bán.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Lô</th><th>Giống</th><th>Khối lượng</th><th>Đã chờ</th><th>Bán hôm nay được</th><th></th></tr>
          </thead>
          <tbody>
            {view.lots.map((lot) => (
              <tr key={lot.id}>
                <td>Thửa {lot.plotId + 1}</td>
                <td>{varietyName(lot.varietyId, data.varieties)}</td>
                <td>{kg(lot.kg)}</td>
                <td className={lot.nightsWaited >= maxWait - 1 ? "bad" : ""}>{lot.nightsWaited}/{maxWait} đêm</td>
                <td>{money(lot.valueNow)}</td>
                <td>
                  <button onClick={() => act({ type: "sellLot", lotId: lot.id })}>Bán</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
