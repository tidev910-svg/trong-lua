import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../../core/init";
import { getPlayerView } from "../../core/playerView";
import { ALL_STOP_CONDITIONS } from "../../core/types";
import { pageOfDay } from "../../ui/App";
import { ALWAYS_STOP_TEXT, SkipDialog, STOP_LABELS } from "../../ui/paper/SkipDialog";
import { data } from "../helpers";

describe("SkipDialog", () => {
  it("offers rest (default) or hired work, every stop condition ticked, 7 days, and lists what always stops", () => {
    const view = getPlayerView(createInitialState(1, data), data);
    const html = renderToString(<SkipDialog view={view} data={data} onStart={() => {}} onBack={() => {}} />).replaceAll("<!-- -->", "");
    expect(html).toMatch(/type="radio" name="skip-activity" checked=""[^>]*\/> Nghỉ ở nhà/);
    for (const c of ALL_STOP_CONDITIONS) expect(html).toContain(STOP_LABELS[c]);
    expect(html.match(/type="checkbox" checked=""/g)).toHaveLength(ALL_STOP_CONDITIONS.length);
    expect(html).toMatch(/<option value="7" selected="">7<\/option>/);
    expect(html).toContain(ALWAYS_STOP_TEXT);
  });
});

describe("calendar pages during a skip", () => {
  it("come from core calendar helpers", () => {
    expect(pageOfDay(0, data)).toEqual({ month: 11, dayOfMonth: 15, seasonKey: "DX-1", daysToTet: data.calendar.tetDay });
    expect(pageOfDay(17, data)).toMatchObject({ month: 12, dayOfMonth: 2 });
    expect(pageOfDay(data.calendar.tetDay + 1, data).daysToTet).toBeNull();
  });
});
