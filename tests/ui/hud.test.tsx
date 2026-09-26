import type { ReactElement } from "react";
import { renderToString as renderRaw } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Calendar, tetLine } from "../../ui/hud/Calendar";
import { forecastConfidence, visualPhase } from "../../ui/hud/labels";
import { PhaseStrip } from "../../ui/hud/PhaseStrip";
import { Purse } from "../../ui/hud/Purse";
import { rainClass } from "../../ui/hud/Rain";
import { TimeOfDay } from "../../ui/scene/TimeOfDay";

function render(element: ReactElement): string {
  return renderRaw(element).replaceAll("<!-- -->", "");
}

describe("HUD", () => {
  it("calendar: month, day, season, days to Tết, no weekday", () => {
    const html = render(<Calendar month={12} dayOfMonth={26} seasonKey="DX-1" daysToTet={39} flipKey={0} />);
    expect(html).toContain("Tháng 12");
    expect(html).toContain(">26<");
    expect(html).toContain("Vụ Đông Xuân");
    expect(html).toContain("Còn 39 ngày đến Tết");
    expect(html).not.toMatch(/Thứ|Chủ nhật/);
    expect(html).not.toContain("flip");
    expect(render(<Calendar month={1} dayOfMonth={1} seasonKey="DX-1" daysToTet={null} flipKey={3} />)).toContain("calendar flip");
    expect(tetLine(0)).toBe("Hôm nay Tết");
    expect(tetLine(null)).toBeNull();
  });

  it("purse: handwritten cash (red when negative), bars, today's forecast with confidence", () => {
    const html = render(<Purse cash={4_560_000} energy={72} energyMax={100} uyTin={58.4} forecastToday={{ day: 3, predicted: "rain", accuracy: 0.85 }} />);
    expect(html).toContain("4.560.000 đ");
    expect(html).toContain("Sức lực 72/100");
    expect(html).toContain("Uy tín trong làng 58/100");
    expect(html).toContain("Dự báo hôm nay: Mưa (khá chắc)");
    expect(render(<Purse cash={-5} energy={0} energyMax={100} uyTin={0} forecastToday={undefined} />)).toContain("cash neg");
  });

  it("phase strip: guidance and buttons", () => {
    const html = render(
      <PhaseStrip phase="briefing" lead="Sáng sớm." text="Đọc bản tin trước khi bắt đầu ngày.">
        <button>Mở bản tin</button>
      </PhaseStrip>,
    );
    expect(html).toContain("<b>Sáng sớm.</b>");
    expect(html).toContain("Mở bản tin");
  });

  it("rain follows the forecast; night layer only at night", () => {
    expect(rainClass("sunny")).toBe("rain");
    expect(rainClass("rain")).toBe("rain on");
    expect(rainClass("storm")).toBe("rain on heavy");
    expect(render(<svg><TimeOfDay phase="night" /></svg>)).toMatch(/class="night" opacity="1"/);
    expect(render(<svg><TimeOfDay phase="afternoon" /></svg>)).toMatch(/class="night" opacity="0"/);
  });

  it("visual phase: dawn until the briefing is closed, half-days, night while the UI plays it", () => {
    expect(visualPhase({ phase: { kind: "briefing" } }, false, false)).toBe("briefing");
    expect(visualPhase({ phase: { kind: "briefing" } }, true, false)).toBe("morning");
    expect(visualPhase({ phase: { kind: "halfDay", slot: "afternoon", activity: null } }, true, false)).toBe("afternoon");
    expect(visualPhase({ phase: { kind: "halfDay", slot: "morning", activity: "field" } }, true, true)).toBe("night");
    expect(forecastConfidence(0)).toBe("khá chắc");
    expect(forecastConfidence(2)).toBe("chưa chắc");
  });
});
