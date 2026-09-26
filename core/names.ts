/**
 * Player-facing plot names. The game has one field of 5 công (plotCount 1, PROTOTYPE_SPEC §14): it is
 * "ruộng" and labels need no plot number. With several plots (the core supports any plotCount) they are "thửa N".
 */

/** "Ruộng" or "Thửa 3" (capitalised, to start a line). */
export function plotName(plotId: number, plotCount: number): string {
  return plotCount === 1 ? "Ruộng" : `Thửa ${plotId + 1}`;
}

/** Suffix for labels such as "Bán lúa non" + " thửa 3"; empty with a single field. */
export function plotSuffix(plotId: number, plotCount: number): string {
  return plotCount === 1 ? "" : ` thửa ${plotId + 1}`;
}
