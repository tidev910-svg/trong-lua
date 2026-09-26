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
│   ├── actions.ts          applyAction(state, action, data): ActionResult; actionRefusal (luật kiểm tra duy nhất)
│   ├── phases.ts           Máy trạng thái pha trong ngày: chọn hoạt động, kết thúc buổi
│   ├── field.ts            thăm đồng, cập nhật known
│   ├── systems/
│   │   ├── calendar.ts     tháng của ngày, vụ theo tháng xuống giống, Tết
│   │   ├── weather.ts      thời tiết + dự báo
│   │   ├── water.ts
│   │   ├── growth.ts       sinh trưởng, lịch dự kiến công khai
│   │   ├── yield.ts        xuống giống, bón phân, năng suất
│   │   ├── pests.ts        sâu bệnh + cảnh báo vùng
│   │   ├── health.ts       nước, bão, đổ ngã, lũ
│   │   ├── harvest.ts      gặt, lô lúa, bán
│   │   ├── market.ts
│   │   ├── finance.ts      sinh hoạt phí, lãi, hạn nợ, uy tín, nguồn vay, việc làm thuê
│   │   └── debt.ts         bậc vòng xoáy nợ
│   ├── night.ts            runNight(state, data): chạy các system theo thứ tự cố định
│   ├── skip.ts             logic tua ngày + điều kiện dừng
│   ├── settlement.ts       dữ liệu màn tính sổ
│   ├── summary.ts          dữ liệu thẻ tổng kết, tài sản ròng
│   ├── playerView.ts       getPlayerView(state, data): state đã giấu thông tin ẩn
│   ├── actionOptions.ts    getActionOptions(view, target, data): chi phí, sức lực, bật/tắt, lý do, mua chịu (M2.0)
│   ├── save.ts             Session, dispatch, serialize/replay/load
│   ├── golden.ts           kết quả mong đợi cho replay golden
│   └── playtest.ts         thống kê playtest trong file lưu (không ảnh hưởng replay)
├── ui/                     React; chỉ dùng getPlayerView + getActionOptions + dispatch(action) (bảng debug được đọc state đầy đủ)
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

## Kiểu dữ liệu chính (tóm tắt; nguồn sự thật là `core/types.ts`)

```ts
type Phase =
  | { kind: "briefing" }                                          // sáng sớm = buổi sáng chưa chọn việc
  | { kind: "halfDay"; slot: "morning" | "afternoon"; activity: "field" | null }
  | { kind: "settlement"; seasonKey: string; resume: Phase }      // chờ "acknowledge"
  | { kind: "gameOver"; reason: "yearEnd" | "bankrupt" | "quit" };
// Không có pha "night": runNight chạy ngay khi hết buổi chiều. Cảnh tối dần chỉ là animation (quyết định B2).
// Không có pha "sowing"/"harvestSale": đó là màn hình UI, không phải pha.

interface GameState {
  version: number; seed: number; rngState: number; nextId: number;
  day: number; phase: Phase; energy: number;
  cash: number;                      // luôn ≥ 0 sau mỗi action; phần âm thành khoản household_arrears (A1)
  uyTin: number;
  weather: { queue: [W, W, W]; forecast: [Forecast, Forecast, Forecast]; realized: W | null }; // A2
  regionalAlerts: RegionalAlert[]; flood: FloodPlan; market: { deviation: number };
  plots: PlotState[];                // { id, status, crop, known }
  harvestLots: HarvestLot[]; advanceContracts: AdvanceContract[];
  loans: Loan[];                     // mọi nghĩa vụ trả tiền, kể cả tiền thuê (B14)
  hiredWorkAvailable: boolean; hiredWorkUyTin: {...}; rentExtensionsUsed: number;
  debtStage: 0 | 1 | 2 | 3 | 4 | 5; landAccess: boolean; settledSeasons: string[];
  ledger: LedgerEntry[];             // mọi khoản thu chi, dùng cho tính sổ
  log: GameEvent[];                  // sự kiện cho bản tin, thông báo và animation
  stats: RunStats;                   // cho thẻ tổng kết
}

type Action =
  | { type: "chooseActivity"; activity: "field" | "hired_work" | "rest" }
  | { type: "prepareAndSow"; plotId: number; variety: string; method: "broadcast" | "transplant"; payWith: PayWith }
  | { type: "fertilize"; plotId: number; payWith: PayWith }
  | { type: "spray"; plotId: number; pest: string; mode: "cure" | "preventive"; payWith: PayWith }
  | { type: "adjustWater"; plotId: number }
  | { type: "harvest"; plotId: number; method: "machine" | "hand" }
  | { type: "endHalfDay" }
  | { type: "sellLot"; lotId: string }                 // chờ bán = không bán; không có action riêng
  | { type: "takeLoanShark"; amount: number }
  | { type: "rollOverLoan"; loanId: string }
  | { type: "repay"; loanId: string; amount: number }
  | { type: "sellAdvance"; plotId: number; ratio: number }
  | { type: "requestRentExtension" }
  | { type: "reRent" }                                 // thuê lại ruộng sau khi mất ruộng
  | { type: "skipUntil"; defaultActivity: "rest" | "hired_work"; stopOn: StopCondition[]; maxDays: number }
  | { type: "acknowledge" }                            // đóng màn tính sổ
  | { type: "quit" };                                  // "Bán hết, lên thành phố"

type ActionResult = { ok: true; state: GameState } | { ok: false; state: GameState; reason: string };
```

`applyAction` từ chối mọi hành động không hợp lệ với pha hiện tại, thiếu tiền, thiếu sức lực, thiếu uy tín: trả `{ ok: false, state (không đổi), reason }` với lý do tiếng Việt (A15). File lưu chỉ ghi action `ok`. Luật kiểm tra nằm duy nhất ở `actionRefusal`; `getActionOptions` dùng lại nó để UI và bot thấy đúng lý do khóa mà `applyAction` sẽ trả.

**Thao tác không tốn buổi** (B1): bán lúa, trả nợ, vay nóng, đảo nợ, bán lúa non, xin gia hạn, thuê lại ruộng, bỏ cuộc — làm được ở bản tin, buổi sáng và buổi chiều.

### GameEvent

`state.log` là nguồn cho bản tin, thông báo và animation (UI không chờ animation mới đổi state). Tên `kind` dạng camelCase. Đã có: `gameStarted`, `floodWarning`, `flood`, `lotSold`, `loanLate`, `tet`, `creditorVisit`, `foreclosure`, `landLost`, `landReRented`, `bankrupt`, `skipStopped`. Thêm ở M2.0: `wentToField`, `hiredWorkDone`, `restDone`, `dayStarted`, `skipDayPassed`. `getPlayerView` chỉ trả những event người chơi được biết (`PUBLIC_EVENTS`).

### getActionOptions

`getActionOptions(view, target, data)`, với `target` là một thửa, nhà, bảng gỗ, sổ hoặc thương lái. Mỗi option: action sẽ dispatch, nhãn tiếng Việt, chi phí tiền, sức lực, `enabled`, lý do khi bị khóa, và phương án mua chịu (khi chỉ thiếu tiền cho phần vật tư và đủ điều kiện uy tín, hạn mức) kèm giá đã cộng phụ phí. UI và bot dùng cùng hàm này.

## Luồng xử lý

```
UI / Bot ──action──▶ applyAction ──▶ GameState mới ──▶ getPlayerView ──▶ getActionOptions ──▶ UI / Bot
                          │
                          └─ khi kết thúc buổi chiều ─▶ runNight ─▶ ngày mới (briefing)
```

- `runNight` gọi các system theo đúng thứ tự trong `PROTOTYPE_SPEC.md` mục 9. Mỗi system là hàm thuần `(state, data, rng) → state`.
- `skipUntil` lặp: áp hoạt động mặc định cho 2 buổi (làm thuê mà không có việc hoặc không đủ sức thì nghỉ) → `runNight` → kiểm tra điều kiện dừng (chỉ dựa trên thông tin người chơi được biết + sự kiện luôn dừng, và chỉ khi trạng thái mới xảy ra, B15). Cả đợt tua là một action; từ M2.0 mỗi ngày ghi một event `skipDayPassed` để UI lật lịch.

## RNG

- `mulberry32`, trạng thái 32-bit lưu trong `state.rngState`.
- Mọi lần rút ngẫu nhiên đi qua helper nhận và trả trạng thái mới (hoặc một object RNG được tạo từ state và ghi lại vào state cuối mỗi bước). Thứ tự rút phải cố định.
- Tự viết, không dùng thư viện, để port sang Godot (GDScript/C#) ra đúng dãy số.

## Thông tin ẩn

`getPlayerView(state, data)` trả về:
- Thời tiết: thời tiết thật hôm qua + dự báo hôm nay và 2 ngày tới (không có thời tiết thật hôm nay hay ngày mai).
- Mỗi thửa: chỉ trường `known` (lần thăm gần nhất) + những gì người chơi tự biết (giống, ngày xuống giống, số lần bón, lịch dự kiến theo giống).
- Không có `pests` thật, không có `health` chính xác (chỉ mức ước lượng khi đã thăm).
- Sự kiện: chỉ những gì đã được báo trên radio.

Bot trong `sim/` cũng chỉ được dùng `getPlayerView` và `getActionOptions` (để mô phỏng người chơi thật). Có thể thêm bot "toàn tri" riêng cho mục đích so sánh, đặt tên rõ ràng.

## Lưu game

```ts
interface SaveFile { version: number; seed: number; actions: Action[]; snapshots?: { day: number; actionCount: number; state: GameState }[]; playtest?: PlaytestMeta }
```
Tải: `createInitialState(seed)` rồi `applyAction` lần lượt (hoặc từ snapshot gần nhất). Kiểm thử bắt buộc: replay một file lưu phải ra state giống hệt state gốc.

## Bộ mô phỏng

- Bot = hàm `(view: PlayerView) => Action` (kèm `data`). Ba bot theo chính sách mô tả trong `DATA_SPEC.md` mục Bot.
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