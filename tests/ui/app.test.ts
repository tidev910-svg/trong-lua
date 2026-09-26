import { describe, expect, it } from "vitest";
import { applyAction } from "../../core/actions";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import type { GameState } from "../../core/types";
import { samePhase, stripText } from "../../ui/App";
import { data } from "../helpers";

const view = (s: GameState) => getPlayerView(s, data);

describe("phase strip guidance", () => {
  const s0 = createInitialState(1, data);

  it("dawn, then choosing the morning's work, then in the field, then night", () => {
    expect(stripText(view(s0), "briefing").lead).toBe("Sáng sớm.");
    expect(stripText(view(s0), "morning")).toEqual({ lead: "Buổi sáng.", text: expect.stringContaining("bảng gỗ") });
    const r = applyAction(s0, { type: "chooseActivity", activity: "field" }, data);
    if (!r.ok) throw new Error(r.reason);
    expect(stripText(view(r.state), "morning").lead).toBe("Buổi sáng, ngoài đồng.");
    expect(stripText(view(s0), "night").lead).toBe("Trời tối.");
  });

  it("after losing the land it says where to rent it again", () => {
    expect(stripText(view({ ...s0, landAccess: false }), "afternoon").text).toMatch(/Thuê lại ruộng ở quyển sổ/);
  });

  it("field work leaves the phase unchanged (nothing to animate)", () => {
    const a = view(s0);
    expect(samePhase(a, a)).toBe(true);
    const r = applyAction(s0, { type: "chooseActivity", activity: "rest" }, data);
    if (!r.ok) throw new Error(r.reason);
    expect(samePhase(a, view(r.state))).toBe(false);
  });
});
