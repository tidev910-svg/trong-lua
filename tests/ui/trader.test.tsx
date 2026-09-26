import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import type { GameState } from "../../core/types";
import { saleText, TraderBook, waitingText } from "../../ui/paper/TraderBook";
import { data } from "../helpers";

describe("TraderBook", () => {
  it("today's price per variety, each lot with its value and a sell button, how waiting works", () => {
    const s: GameState = {
      ...createInitialState(1, data),
      harvestLots: [{ id: "lot-3", plotId: 0, varietyId: "variety_a", seasonKey: "DX-1", kg: 467, harvestDay: 0, nightsWaited: 1 }],
    };
    const view = getPlayerView(s, data);
    const html = renderToString(<TraderBook view={view} data={data} onChoose={() => {}} onClose={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toContain("Giống A:");
    expect(html).toContain("Giống B:");
    expect(html).toContain("Giống A: 467 kg");
    expect(html).not.toContain("Thửa");
    expect(html).toContain("Đã chờ 1 đêm");
    expect(html).toContain("Bán lúa<");
    expect(html).toContain(waitingText(data));
    expect(waitingText(data)).toBe("Lúa tươi để mỗi đêm hao 2%; để quá 3 đêm thì phải bán cho thương lái với giá hôm đó.");
  });

  it("sale toast shows the store-credit debt taken from the money", () => {
    const sold = [{ day: 0, kind: "lotSold" as const, lotId: "l", kg: 400, amount: 3_000_000, auto: false }];
    expect(saleText(sold, 3_000_000)).toBe("Bán lúa được 3.000.000 đ.");
    expect(saleText(sold, -500_000)).toBe("Bán lúa được 3.000.000 đ, trừ nợ đại lý 3.500.000 đ.");
  });
});
