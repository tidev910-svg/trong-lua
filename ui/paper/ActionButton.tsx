import type { ActionOption } from "../../core/actionOptions";
import type { Action } from "../../core/types";
import { money } from "../format";

/** Right-hand text of an action button: what it costs and what it gives ("350.000 đ, 15 sức"). */
export function optionCostText(option: Pick<ActionOption, "cost" | "energy" | "gain">): string {
  const parts: string[] = [];
  if (option.cost > 0) parts.push(money(option.cost));
  if (option.energy > 0) parts.push(`${option.energy} sức`);
  if (option.gain !== null) {
    if (option.gain.cash > 0) parts.push(`+${money(option.gain.cash)}`);
    if (option.gain.energy > 0) parts.push(`+${option.gain.energy} sức`);
  }
  return parts.join(", ");
}

/** Price line of the store-credit button: debt added, plus what is still paid in cash. */
export function creditCostText(credit: NonNullable<ActionOption["credit"]>): string {
  const debt = `nợ ${money(credit.debtAdded)}`;
  return credit.cashCost > 0 ? `${debt} + ${money(credit.cashCost)} tiền mặt` : debt;
}

interface Props {
  option: ActionOption;
  onChoose: (action: Action) => void;
}

/**
 * Action button on paper (UI_DIRECTION "Nút hành động trên giấy"). Everything shown comes from the option:
 * cost, energy, lock reason and the store-credit alternative, which is offered only when the cash version is locked.
 */
export function ActionButton({ option, onChoose }: Props) {
  const costText = optionCostText(option);
  const credit = !option.enabled ? option.credit : null;
  return (
    <div className="act-group">
      <button type="button" className="act" disabled={!option.enabled} onClick={() => onChoose(option.action)}>
        <span>
          {option.label}
          {option.detail !== null && <span className="detail">{option.detail}</span>}
        </span>
        {costText !== "" && <small>{costText}</small>}
      </button>
      {!option.enabled && option.reason !== null && <div className="why">{option.reason}</div>}
      {credit !== null && (
        <button type="button" className="act credit" onClick={() => onChoose(credit.action)}>
          <span>Mua chịu ở đại lý, trả khi bán lúa</span>
          <small>{creditCostText(credit)}</small>
        </button>
      )}
    </div>
  );
}
