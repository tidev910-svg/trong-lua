# ARCHITECTURE – Kiến trúc prototype

## Cấu trúc thư mục

```
/
├── CLAUDE.md
├── docs/
├── data/
│   ├── schemas.ts          Khuôn Zod cho mọi file JSON + kiểu TS suy ra từ khuôn
│   ├── loadData.ts         Đọc + kiểm tra toàn bộ JSON, trả về GameData
│   ├── economy.json
│   ├── calendar.json
│   ├── varieties.json
│   ├── crop.json
│   ├── pests.json
│   ├── weather.json
│   ├── market.json
│   └── finance.json
├── core/
│   ├── rng.ts              mulberry32 + helper (nextFloat, nextInt, pickWeighted, chance)
│   ├── types.ts            GameState, PlotState, Loan, Action, GameEvent…
│   ├── init.ts             createInitialState(seed, data)
│   ├── actions.ts          applyAction(state, action, data): GameState
│   ├── phases.ts           Máy trạng thái pha trong ngày + pha đặc biệt
│   ├── systems/
│   │   ├── calendar.ts     tháng của ngày, vụ theo tháng xuống giống, Tết
│   │   ├── weather.ts
│   │   ├── water.ts
│   │   ├── growth.ts
│   │   ├── pests.ts
│   │   ├── health.ts
│   │   ├── events.ts       cảnh báo dịch, lũ, việc làm thuê
│   │   ├── market.ts
│   │   ├── finance.ts      sinh hoạt phí, lãi, hạn nợ, uy tín
│   │   └── debt.ts         bậc vòng xoáy nợ
│   ├── night.ts            runNight(state, data): chạy các system theo thứ tự cố định
│   ├── skip.ts             logic tua ngày + điều kiện dừng
│   ├── settlement.ts       dữ liệu màn tính sổ
│   ├── summary.ts          dữ liệu thẻ tổng kết, tài sản ròng
│   ├── playerView.ts       getPlayerView(state): state đã giấu thông tin ẩn
│   ├── actionOptions.ts    getActionOptions(view, target): chi phí, sức lực, bật/tắt, lý do, mua chịu
│   └── save.ts             serialize/replay
├── ui/                     React; chỉ dùng getPlayerView + getActionOptions + dispatch(action)
│   └── (cấu trúc chi tiết xem docs/UI_DIRECTION.md)
├── reference/ui-reference.html   mẫu giao diện tham chiếu
├── sim/
│   ├── bots/               safe.ts, average.ts, risky.ts (chính sách: view → action)
│   ├── runSim.ts           CLI: chạy N lượt, in bảng tổng hợp, ghi CSV
│   └── output/             (gitignore)
└── tests/
    ├── core/*.test.ts
    └── replays/            file lưu mẫu + kết quả mong đợi (golden)
```

## Kiểu dữ liệu chính (phác thảo, được phép tinh chỉnh)

```ts
type Phase =
  | { kind: "briefing" }
  | { kind: "morning" } | { kind: "afternoon" }
  | { kind: "sowing"; plotIds: number[] }
  | { kind: "harvestSale"; lotId: string }
  | { kind: "settlement"; seasonId: string }
  | { kind: "gameOver"; reason: "yearEnd" | "bankrupt" | "quit" };

interface GameState {
  version: number;
  seed: number;
  rngState: number;
  day: number;
  phase: Phase;
  energy: number;
  cash: number;
  uyTin: number;
  plots: PlotState[];
  loans: Loan[];
  advanceContracts: AdvanceContract[];
  harvestLots: HarvestLot[];         // lúa đã gặt chờ bán
  weather: { today: Weather; tomorrow: Weather; forecast: Forecast[] };
  activeEvents: ActiveEvent[];       // cảnh báo dịch, lũ sắp tới…
  debtStage: 0 | 1 | 2 | 3 | 4 | 5;
  landAccess: boolean;               // false khi mất ruộng
  ledger: LedgerEntry[];             // mọi khoản thu chi, dùng cho tính sổ
  log: GameEvent[];                  // sự kiện để UI hiển thị (bản tin, thông báo)
  stats: RunStats;                   // cho thẻ tổng kết
}

type Action =
  | { type: "chooseActivity"; activity: "field" | "hired_work" | "rest" }
  | { type: "prepareAndSow"; plotId: number; variety: string; method: "broadcast" | "transplant"; payWith: "cash" | "store_credit" }
  | { type: "fertilize"; plotId: number; payWith: "cash" | "store_credit" }
  | { type: "spray"; plotId: number; pest: PestId; mode: "cure" | "preventive"; payWith: "cash" | "store_credit" }
  | { type: "adjustWater"; plotId: number }
  | { type: "harvest"; plotId: number; method: "machine" | "hand" }
  | { type: "sellLot"; lotId: string }
  | { type: "waitSale" }
  | { type: "takeLoanShark"; amount: number }
  | { type: "rollOverLoan"; loanId: string }
  | { type: "repay"; loanId: string; amount: number }
  | { type: "sellAdvance"; plotId: number; ratio: number }
  | { type: "requestRentExtension" }
  | { type: "endHalfDay" }
  | { type: "skipUntil"; defaultActivity: "rest" | "hired_work"; stopOn: StopCondition[]; maxDays: number }
  | { type: "acknowledge" }            // đóng màn tính sổ / thông báo
  | { type: "quit" };
```

`applyAction` phải từ chối (trả state cũ + event lỗi) mọi hành động không hợp lệ với pha hiện tại, thiếu tiền, thiếu sức lực, thiếu uy tín. Bot và UI đều đi qua cùng cửa này.

## Luồng xử lý

```
UI / Bot ──action──▶ applyAction ──▶ GameState mới ──▶ getPlayerView ──▶ UI / Bot
                          │
                          └─ khi kết thúc buổi chiều ─▶ runNight ─▶ ngày mới (briefing)
```

- `runNight` gọi các system theo đúng thứ tự trong `PROTOTYPE_SPEC.md` mục 9. Mỗi system là hàm thuần `(state, data, rng) → state`.
- `skipUntil` lặp: áp hoạt động mặc định cho 2 buổi → `runNight` → kiểm tra điều kiện dừng (chỉ dựa trên thông tin người chơi được biết + sự kiện luôn dừng).

## RNG

- `mulberry32`, trạng thái 32-bit lưu trong `state.rngState`.
- Mọi lần rút ngẫu nhiên đi qua helper nhận và trả trạng thái mới (hoặc một object RNG được tạo từ state và ghi lại vào state cuối mỗi bước). Thứ tự rút phải cố định.
- Tự viết, không dùng thư viện, để port sang Godot (GDScript/C#) ra đúng dãy số.

## Thông tin ẩn

`getPlayerView(state)` trả về:
- Thời tiết: chỉ hôm nay + dự báo (không có `tomorrow` thật).
- Mỗi thửa: chỉ trường `known` (lần thăm gần nhất) + những gì người chơi tự biết (giống, ngày xuống giống, số lần bón, lịch dự kiến theo giống).
- Không có `pests` thật, không có `health` chính xác (chỉ mức ước lượng khi đã thăm).
- Sự kiện: chỉ những gì đã được báo trên radio.

Bot trong `sim/` cũng chỉ được dùng `getPlayerView` (để mô phỏng người chơi thật). Có thể thêm bot "toàn tri" riêng cho mục đích so sánh, đặt tên rõ ràng.

## Lưu game

```ts
interface SaveFile { version: number; seed: number; actions: Action[]; snapshots?: { day: number; state: GameState }[] }
```
Tải: `createInitialState(seed)` rồi `applyAction` lần lượt (hoặc từ snapshot gần nhất). Kiểm thử bắt buộc: replay một file lưu phải ra state giống hệt state gốc.

## Bộ mô phỏng

- Bot = hàm `(view: PlayerView) => Action`. Ba bot theo chính sách mô tả trong `DATA_SPEC.md` mục Bot.
- `runSim.ts` chạy N seed cho mỗi bot, 365 ngày, xuất:
  - Tỉ lệ sống sót hết năm (không phá sản, không mất ruộng cuối năm)
  - Phân vị tài sản ròng cuối năm (p10, p25, p50, p75, p90)
  - Phân bố bậc vòng xoáy nợ cao nhất đạt tới
  - Nguyên nhân thất bại (đếm)
  - Tiền mặt trung bình theo ngày (CSV để vẽ biểu đồ)
- Mục tiêu cân bằng ban đầu: bot `average` sống sót 60–70%; bot `safe` 80–90% nhưng tài sản ròng thấp; bot `risky` phương sai lớn, trung vị không cao hơn `average` quá nhiều.

## Kiểm thử

- Đơn vị: từng system (sinh trưởng đúng số ngày, lãi đúng, phun thuốc giảm mật độ đúng, dự báo đúng tỉ lệ trên nhiều mẫu…).
- Tất định: cùng seed + cùng hành động chạy 2 lần ⇒ state giống hệt.
- Replay golden: `tests/replays/*.json` chứa file lưu + snapshot kết quả mong đợi. Đây cũng là bộ kiểm thử dùng lại khi port sang Godot.

## Ghi chú cho việc port sang Godot

- Dữ liệu `data/*.json` mang sang nguyên xi.
- `core/` dịch từng file sang GDScript/C#; giữ nguyên thứ tự system và thứ tự rút RNG.
- Dùng `tests/replays/` để xác nhận bản Godot cho kết quả giống bản web.