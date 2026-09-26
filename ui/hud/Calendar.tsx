import { seasonLabel } from "../format";

interface Props {
  month: number;
  dayOfMonth: number;
  seasonKey: string;
  daysToTet: number | null;
  /** Changes each time a page is torn off (new day, each skipped day): replays the flip. */
  flipKey: number;
}

export function tetLine(daysToTet: number | null): string | null {
  if (daysToTet === null) return null;
  return daysToTet === 0 ? "Hôm nay Tết" : `Còn ${daysToTet} ngày đến Tết`;
}

/** Tear-off calendar (top left). No weekday: the data has none (UI_DIRECTION). */
export function Calendar({ month, dayOfMonth, seasonKey, daysToTet, flipKey }: Props) {
  const tet = tetLine(daysToTet);
  return (
    <div key={flipKey} className={`hud calendar${flipKey > 0 ? " flip" : ""}`} aria-live="polite" aria-label={`Ngày ${dayOfMonth} tháng ${month}`}>
      <div className="ring" />
      <div className="mon">Tháng {month}</div>
      <div className="num">{dayOfMonth}</div>
      <div className="sub">
        Vụ {seasonLabel(seasonKey)}
        {tet !== null && (
          <>
            <br />
            {tet}
          </>
        )}
      </div>
    </div>
  );
}
