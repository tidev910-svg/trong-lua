import { average } from "./average";
import type { Policy } from "./policy";
import { risky } from "./risky";
import { safe } from "./safe";

export const BOTS: Record<string, Policy> = { safe, average, risky };
export type { Policy };
