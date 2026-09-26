import type { ReactElement } from "react";
import { renderToString as renderRaw } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getActionOptions, type ActionOption } from "../../core/actionOptions";
import { getPlayerView } from "../../core/playerView";
import { dispatch, newSession } from "../../core/save";
import { ActionButton, creditCostText, optionCostText } from "../../ui/paper/ActionButton";
import { trapStep } from "../../ui/paper/focus";
import { Notebook } from "../../ui/paper/Notebook";
import { noteTilt, PinnedNote, placeNote } from "../../ui/paper/PinnedNote";
import { data } from "../helpers";

function renderToString(element: ReactElement): string {
  return renderRaw(element).replaceAll("<!-- -->", "");
}

/** Real options for plot 0 in the field on day 0, with the given cash. */
function sowOptions(cash: number): ActionOption[] {
  const s = dispatch(newSession(1, data), { type: "chooseActivity", activity: "field" }, data).session;
  return getActionOptions(getPlayerView({ ...s.state, cash }, data), { kind: "plot", plotId: 0 });
}

const noop = () => {};

describe("ActionButton", () => {
  it("cost text: money, energy and gains, only what applies", () => {
    expect(optionCostText({ cost: 350_000, energy: 15, gain: null })).toBe("350.000 đ, 15 sức");
    expect(optionCostText({ cost: 0, energy: 35, gain: { cash: 150_000, energy: 0 } })).toBe("35 sức, +150.000 đ");
    expect(optionCostText({ cost: 0, energy: 0, gain: { cash: 0, energy: 25 } })).toBe("+25 sức");
    expect(optionCostText({ cost: 0, energy: 0, gain: null })).toBe("");
    expect(creditCostText({ action: { type: "endHalfDay" }, cashCost: 0, debtAdded: 345_000 })).toBe("nợ 345.000 đ");
    expect(creditCostText({ action: { type: "endHalfDay" }, cashCost: 400_000, debtAdded: 287_500 })).toBe("nợ 287.500 đ + 400.000 đ tiền mặt");
  });

  it("enabled: label and cost, no reason, no credit button even if credit is possible", () => {
    const [opt] = sowOptions(10_000_000);
    expect(opt?.enabled && opt.credit !== null).toBe(true);
    const html = renderToString(<ActionButton option={opt!} onChoose={noop} />);
    expect(html).toContain(opt!.label);
    expect(html).toContain(optionCostText(opt!));
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("Mua chịu");
  });

  it("locked for lack of cash: faded, red reason, dashed store-credit button with its price", () => {
    const opt = sowOptions(500_000)[0]!;
    expect(opt.enabled).toBe(false);
    const html = renderToString(<ActionButton option={opt} onChoose={noop} />);
    expect(html).toMatch(/class="act" disabled=""/);
    expect(html).toContain(`<div class="why">${opt.reason}</div>`);
    expect(html).toContain("act credit");
    expect(html).toContain(creditCostText(opt.credit!));
  });

  it("locked with no credit possible: reason only", () => {
    const opt = sowOptions(0)[0]!;
    const html = renderToString(<ActionButton option={opt} onChoose={noop} />);
    expect(html).toContain("why");
    expect(html).not.toContain("act credit");
  });
});

describe("PinnedNote placement (reference layout)", () => {
  const screen = { width: 1200, height: 720 };
  const note = { width: 270, height: 300 };

  it("right of the object when there is room", () => {
    expect(placeNote({ left: 370, top: 170, right: 610, bottom: 340 }, note, screen)).toEqual({ left: 622, top: 170 });
  });

  it("left of the object near the right edge", () => {
    expect(placeNote({ left: 880, top: 170, right: 1120, bottom: 340 }, note, screen)).toEqual({ left: 598, top: 170 });
  });

  it("centred when neither side fits (narrow phone)", () => {
    expect(placeNote({ left: 60, top: 200, right: 330, bottom: 360 }, note, { width: 390, height: 800 })).toEqual({ left: 60, top: 200 });
  });

  it("clear of the HUD at the top and the phase strip at the bottom", () => {
    expect(placeNote({ left: 370, top: 40, right: 610, bottom: 100 }, note, screen).top).toBe(150);
    expect(placeNote({ left: 370, top: 500, right: 610, bottom: 680 }, note, screen).top).toBe(720 - 300 - 110);
    expect(placeNote({ left: 370, top: 500, right: 610, bottom: 680 }, { width: 270, height: 700 }, screen).top).toBe(12);
  });

  it("tilts alternate", () => {
    expect(noteTilt(0)).toBeLessThan(0);
    expect(noteTilt(1)).toBeGreaterThan(0);
  });

  it("renders as a labelled paper with a close button", () => {
    const html = renderToString(
      <PinnedNote title="Thửa 1" anchor={{ left: 0, top: 0, right: 10, bottom: 10 }} container={screen} index={0} onClose={noop}>
        <p>Không thấy dấu hiệu lạ.</p>
      </PinnedNote>,
    );
    expect(html).toContain('class="note paper"');
    expect(html).toContain('aria-label="Thửa 1"');
    expect(html).toContain('aria-label="Đóng"');
  });
});

describe("Notebook", () => {
  it("is a modal dialog titled by its heading", () => {
    const html = renderToString(
      <Notebook title="Sổ tiền nợ" onClose={noop}>
        <p>Tiền mặt</p>
      </Notebook>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="([^"]+)"[\s\S]*<h2 id="\1">Sổ tiền nợ<\/h2>/);
    expect(html).toContain('class="veil"');
  });

  it("focus trap wraps both ways", () => {
    expect(trapStep(-1, 3, false)).toBe(0);
    expect(trapStep(-1, 3, true)).toBe(2);
    expect(trapStep(2, 3, false)).toBe(0);
    expect(trapStep(0, 3, true)).toBe(2);
    expect(trapStep(1, 3, false)).toBe(2);
    expect(trapStep(0, 0, false)).toBeNull();
  });
});
