# CLAUDE.md – Prototype game "Nông dân lúa nước" (tên tạm)

## Dự án là gì

Prototype web cho một game mô phỏng nông dân trồng lúa nước ở Việt Nam. Người chơi thuê 5 công ruộng, xoay xở tiền bạc qua các vụ lúa và tránh vòng xoáy nợ.

Prototype chỉ cần trả lời 3 câu hỏi:
1. Vòng lặp vụ lúa + vòng xoáy nợ có tạo căng thẳng và muốn chơi tiếp không?
2. Cơ chế tua ngày có giải quyết được sự nhàm chán không?
3. Việc phải thăm đồng mới biết tình trạng ruộng có tạo ra quyết định thú vị không?

Nếu prototype đạt, game sẽ được làm lại bằng Godot. Vì vậy **lõi logic và dữ liệu là thứ được giữ lại; giao diện web là đồ bỏ đi.**

## Tài liệu (đọc theo thứ tự khi bắt đầu phiên làm việc mới)

1. `docs/PROGRESS.md` – đang ở mốc nào, task nào tiếp theo
2. `docs/PROTOTYPE_SPEC.md` – luật chơi chi tiết của prototype (nguồn sự thật cho gameplay); mục 14 là các quyết định A/B mà code tham chiếu ("decision A2"…)
3. `docs/ARCHITECTURE.md` – cấu trúc code, kiểu dữ liệu, luồng xử lý
4. `docs/DATA_SPEC.md` – dữ liệu cân bằng ban đầu (JSON)
5. `docs/UI_DIRECTION.md` – hướng giao diện; mẫu tham chiếu ở `reference/ui-reference.html` (chỉ lấy giao diện, không lấy logic)
6. `docs/GDD.md` – thiết kế tổng thể của cả game (chỉ để tham khảo, KHÔNG làm các phần ngoài phạm vi prototype)

## Stack và lệnh

- Vite + React + TypeScript (strict), Zod, Vitest, tsx (chạy bộ mô phỏng bằng Node)
- `npm run dev` – chạy game
- `npm run typecheck` – kiểm tra kiểu
- `npm test` – chạy Vitest
- `npm run validate-data` – kiểm tra toàn bộ `data/*.json` bằng khuôn Zod
- `npm run sim -- --bot <safe|average|risky|all> --runs 1000` – chạy bộ mô phỏng

Không thêm thư viện ngoài danh sách trên khi chưa hỏi. Zustand được phép nếu thật sự cần cho trạng thái UI.

## Quy tắc kiến trúc bắt buộc

- `core/` là TypeScript thuần: **không import React, không đụng DOM, không dùng `Math.random()`, không dùng `Date.now()`**.
- Mọi ngẫu nhiên đi qua RNG có seed tự viết trong `core/rng.ts` (mulberry32). Trạng thái RNG nằm trong `GameState`.
- Game tất định: cùng seed + cùng chuỗi hành động ⇒ cùng kết quả. Không được phá vỡ điều này.
- Mọi thay đổi trạng thái đi qua `applyAction(state, action, data)` trả về state mới. Không mutate state ở UI.
- Mọi con số cân bằng nằm trong `data/*.json`, có khuôn Zod trong `data/schemas.ts`. Không viết cứng số cân bằng trong code.
- Chi phí, sức lực, điều kiện và lý do khóa của mọi hành động lấy từ `getActionOptions` trong core; UI không tự tính luật chơi.
- UI chỉ đọc trạng thái qua `getPlayerView(state, data)` – hàm này giấu thông tin người chơi chưa biết (mật độ sâu bệnh, thời tiết thật ngày mai…). Chỉ bảng debug mới được đọc state đầy đủ.
- Lưu game = `{ version, seed, actions[] }` (+ snapshot định kỳ). Tải game = chạy lại hành động.
- `sim/` dùng chung `core/` và `data/`, không có logic riêng.

## Quy ước code

- Tên biến, hàm, kiểu, file: tiếng Anh. Chữ hiển thị cho người chơi: tiếng Việt.
- Tiền: số nguyên VNĐ. Thời gian: số nguyên ngày (day 0 = ngày bắt đầu game), buổi = `"morning" | "afternoon"`.
- Không dùng `any`. Ưu tiên union type và discriminated union cho action và event.
- Hàm trong `core/` nhỏ, thuần, có kiểm thử.

## Quy trình làm việc

- Làm **một task trong `docs/PROGRESS.md` mỗi lần**. Lập kế hoạch ngắn trước khi code, chờ xác nhận nếu task lớn.
- Viết kiểm thử cho mọi logic trong `core/`. Trước khi báo xong: `npm run typecheck` và `npm test` phải qua.
- Khi xong task: đánh dấu trong `docs/PROGRESS.md`, ghi 1–2 dòng về quyết định đáng chú ý.
- Spec mơ hồ hoặc mâu thuẫn ⇒ **hỏi, không tự bịa luật chơi**. Có thể đề xuất phương án kèm lý do.
- Không tự ý đổi số trong `data/*.json`. Nếu thấy số bất hợp lý, báo lại kèm kết quả mô phỏng.

## Không làm

- Ảnh, sprite, âm thanh. Cảnh chỉ vẽ bằng hình khối SVG theo `docs/UI_DIRECTION.md`.
- Tab, sidebar, lưới thẻ kiểu dashboard, thư viện UI component, thư viện icon.
- Next.js, backend, đăng nhập, cơ sở dữ liệu.
- Các tính năng ngoài phạm vi prototype: mua đất, máy móc, nhà ở, gia đình, NPC có thoại, nuôi tôm, online.