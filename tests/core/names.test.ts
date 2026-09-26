import { describe, expect, it } from "vitest";
import { plotName, plotSuffix } from "../../core/names";

describe("plot names (decision C1: one field of 5 công)", () => {
  it("the single field is 'Ruộng' and labels need no number", () => {
    expect(plotName(0, 1)).toBe("Ruộng");
    expect(`Bán lúa non${plotSuffix(0, 1)}`).toBe("Bán lúa non");
  });

  it("with several plots each is numbered from 1", () => {
    expect(plotName(2, 5)).toBe("Thửa 3");
    expect(`Bán lúa${plotSuffix(2, 5)}`).toBe("Bán lúa thửa 3");
  });
});
