# PROGRESS – Tiến độ prototype

Quy ước: làm từng task theo thứ tự. Xong task thì đổi `[ ]` thành `[x]` và ghi 1–2 dòng vào mục "Nhật ký quyết định".

## M1 – Lõi mô phỏng và bộ mô phỏng (tuần 1–2)

- [x] M1.1 Khởi tạo dự án: Vite + React + TS strict, Vitest, Zod, tsx; các script `dev`, `typecheck`, `test`, `validate-data`, `sim`
- [x] M1.2 `data/`: toàn bộ JSON theo `DATA_SPEC.md` + khuôn Zod + `loadData.ts` + script `validate-data`
- [x] M1.3 `core/rng.ts` + kiểm thử tất định
- [x] M1.4 `core/types.ts`, `init.ts`, `systems/calendar.ts` + kiểm thử
- [x] M1.5 Thời tiết + dự báo + nước + kiểm thử (tỉ lệ dự báo đúng trên nhiều mẫu)
- [x] M1.6 Sinh trưởng, bón phân, năng suất + kiểm thử (đúng số ngày theo giống và tháng)
- [x] M1.7 Sâu bệnh, phun thuốc, cảnh báo vùng + kiểm thử
- [x] M1.8 Bão, đổ ngã, lũ, sức khỏe
- [x] M1.9 Thị trường, thu hoạch, bán lúa, thương lái
- [x] M1.10 Tài chính: sinh hoạt phí, Tết, tiền thuê, 5 nguồn vay, uy tín + kiểm thử lãi
- [x] M1.11 Vòng xoáy nợ (6 bậc) + điều kiện kết thúc
- [x] M1.12 `actions.ts` + máy trạng thái pha + `runNight` + `skipUntil`
- [x] M1.13 `playerView.ts` (giấu thông tin ẩn) + kiểm thử không rò rỉ
- [x] M1.14 `save.ts` + kiểm thử replay giống hệt
- [x] M1.15 3 bot + `runSim.ts` + báo cáo (tỉ lệ sống sót, phân vị tài sản ròng, bậc nợ cao nhất, nguyên nhân thất bại, CSV tiền mặt theo ngày)
- [x] M1.16 Chạy mô phỏng 1.000 seed/bot, viết báo cáo cân bằng lần 1 vào `docs/BALANCE_LOG.md` (chưa tự đổi số)

**Nghiệm thu M1:** `typecheck` và `test` qua; `sim` chạy được 3.000 lượt; có báo cáo cân bằng lần 1. ✅ Cân bằng lần 2 đã áp dụng (BALANCE_LOG).

## M2 – Giao diện trong thế giới game (tuần 3–4)

Theo `docs/UI_DIRECTION.md`, tham chiếu `reference/ui-reference.html`. Giao diện dạng tab/thẻ cũ (`ui/screens/*`) bị thay thế toàn bộ; chỉ giữ `useGame.ts` (phiên chơi, tự lưu, dữ liệu playtest), `format.ts` và `debug/`.

- [ ] M2.0 Core cho giao diện:
  - `core/actionOptions.ts`: `getActionOptions(view, target, data)` cho thửa, nhà, bảng gỗ, sổ, thương lái; dùng chung `actionRefusal` với `applyAction` (không viết lại luật kiểm tra). Mỗi option: action, nhãn, chi phí, sức lực, enabled, lý do khóa, phương án mua chịu kèm giá đã cộng phụ phí.
  - GameEvent trình bày (camelCase): `wentToField`, `hiredWorkDone`, `restDone`, `dayStarted`, `skipDayPassed` (mỗi ngày tua); `skipStopped` thêm tiền làm thuê kiếm được. Thêm vào `PUBLIC_EVENTS` nếu người chơi được biết.
  - `PlayerView` thêm số ngày kể từ lần thăm của mỗi thửa và những gì UI còn thiếu, không lộ thông tin ẩn.
  - Bot chuyển sang `getActionOptions` (bỏ hệ số viết cứng `1.2` trong `sim/bots/policy.ts`); chạy lại sim, ghi BALANCE_LOG nếu kết quả đổi; `npm run make-replays` tạo lại replay golden.
  - Kiểm thử: option enabled thì `applyAction` chấp nhận; option bị khóa có lý do; bot chạy qua `getActionOptions`.
- [ ] M2.1 `theme.css` (token, chữ, chất liệu giấy vở ô ly) + `Notebook`, `PinnedNote`, `ActionButton`
- [ ] M2.2 `Scene` tĩnh: toàn bộ vật thể SVG, pattern lúa theo giai đoạn, `Interactive` (hover, bàn phím), di động vuốt ngang
- [ ] M2.3 HUD: lịch bóc (lật trang), ví, thanh pha, nhãn hover, thông báo, mưa, ánh sáng theo pha
- [ ] M2.4 Bản tin buổi sáng (radio gõ chữ) + khung App nối dispatch + tự lưu cuối ngày (dùng lại `useGame.ts`)
- [ ] M2.5 Ra đồng: nhân vật di chuyển, cập nhật `known`, `Plot` vẽ theo known + cũ, `PlotNote` với hành động từ `getActionOptions` (kể cả xuống giống và mua chịu)
- [ ] M2.6 Làm thuê, nghỉ, chuyển buổi, đêm, sang ngày
- [ ] M2.7 Tua đến khi… (lịch lật liên tục, dừng với lý do)
- [ ] M2.8 Sổ tiền nợ + các nguồn vay + thuê lại ruộng + "Bán hết, lên thành phố"
- [ ] M2.9 Thu hoạch và bán (thương lái ở xuồng)
- [ ] M2.10 Dọn dẹp: xóa `ui/screens/*`, `ui/styles.css` và `tests/ui/screens.test.tsx` cũ; kiểm thử khói cho giao diện mới

**Nghiệm thu M2:** chơi trọn một vụ từ xuống giống đến bán lúa chỉ bằng giao diện; không có logic luật chơi trong `ui/`; dùng được bằng bàn phím; chạy được trên màn hình 390px.

## M3 – Hoàn thiện vòng chơi (tuần 5)

- [ ] M3.1 Tính sổ (dòng hiện lần lượt, dòng kết quả hiện sau cùng) — phần dữ liệu `core/settlement.ts` đã xong, còn giao diện vở
- [ ] M3.2 Thẻ tổng kết + "Bán hết, lên thành phố" + chơi lại cùng/khác seed — phần dữ liệu `core/summary.ts` đã xong, còn giao diện vở
- [x] M3.3 Bảng debug (state ẩn, nhảy ngày, xuất/nhập file lưu)
- [x] M3.4 Tạo 3 file lưu mẫu vào `tests/replays/` + kiểm thử golden (phải tạo lại sau M2.0)
- [ ] M3.5 Build tĩnh để đăng itch.io (`vite build`, đường dẫn tương đối) — `base: "./"` đã có; còn `README.md` và build lại với giao diện mới

**Nghiệm thu M3:** chơi trọn một năm; có bản build đăng được.

## M4 – Playtest (tuần 6)

- [x] M4.1 Thêm ghi nhận dữ liệu playtest vào file lưu (thời điểm quit, số lần tua, bậc nợ cao nhất)
- [ ] M4.2 Sửa lỗi và điều chỉnh theo phản hồi (ghi vào `docs/BALANCE_LOG.md`)

## Nhật ký quyết định

Quyết định luật chơi A1–A16, B1–B18 nằm ở `PROTOTYPE_SPEC.md` mục 14.

- M1.1: Dựng tay (không dùng create-vite vì thư mục không trống). Phiên bản: Vite 8, React 19, TypeScript 7, Vitest 5, Zod 4, tsx 4. Một `tsconfig.json` chung, bật `strict` + `noUncheckedIndexedAccess`. `sim` hiện là stub. `base: "./"` sẵn cho build itch.io.
- M1.2: JSON tách nguyên văn từ DATA_SPEC, không đổi số. Khuôn Zod dùng `strictObject` (gõ sai tên khóa là báo lỗi) và record theo enum (thiếu tháng/trạng thái thời tiết là báo lỗi). Thêm kiểm tra chéo giữa các file: độ nhạy sâu bệnh của giống khớp id trong pests.json, tổng các kỳ thuê = `rentPerYear`, `baseDurationDays` > tổng giai đoạn cố định (67), các ngày nằm trong năm. `parseGameData` gom mọi lỗi của mọi file rồi ném một `DataValidationError` dạng `file › đường dẫn: thông báo`. Chưa thêm `initialDensity`/`healthBands` (chờ câu hỏi A4, A5).
- M1.3: `Rng` là object nhỏ tạo từ `rngState` (uint32) và ghi `rng.state` ngược lại vào state; có thêm hàm thuần `mulberry32Step`. Quy ước cho bản port Godot: mỗi helper (`nextFloat`, `nextInt`, `chance`, `pickWeighted`) luôn tốn đúng 1 lượt rút, kể cả `chance(0)`/`chance(1)`; `pickWeighted` nhận mảng có thứ tự cố định, không dựa vào thứ tự khóa của object. Đã khóa dãy số bằng giá trị golden lấy từ bản mulberry32 gốc. Thêm `tests/core/purity.test.ts`: quét core/ để chặn Math.random, Date, React, DOM.
- 26/09: Chốt toàn bộ câu hỏi A/B của phiên rà soát spec, ghi vào `PROTOTYPE_SPEC.md` mục 14. Còn chờ số cho `initialDensity` (A4) và `healthBands` (A5).
- M1.4: `GameState` mở rộng dần theo task (thời tiết thêm ở M1.5, sâu bệnh ở M1.7, thị trường/lô lúa ở M1.9…) thay vì khai báo trước các trường chưa có luật. Tiền thuê chưa đến hạn và nợ họ hàng là `Loan` ngay từ day 0; kỳ thuê day 0 được trả luôn lúc khởi tạo. Id khoản vay tất định (`family-1`, `rent-2`) nhờ bộ đếm `nextId` trong state. Chuyển `DAYS_IN_MONTH` vào `data/schemas.ts` để khuôn Zod kiểm tra được ngày bắt đầu có tồn tại.
- M1.5: `state.weather` = `{ queue (thời tiết thật d..d+2), forecast (d..d+2), realized }`. Đêm: `advanceWeather` đẩy hàng đợi rồi sinh d+3 và dự báo cho sáng mai; `updateWater` đọc `realized`. Ngày 0 rút thẳng từ phân phối tháng (không có hôm trước để giữ). Lịch cho phép ngày > 364 để hàng đợi nhìn trước qua cuối năm. Nước cập nhật cho mọi thửa có cây (kể cả `harvestable`); khoảng tối ưu [min, max] tính cả hai đầu. Đo nhanh bằng hệ thời tiết thật (500 seed, 1 thửa, 100 ngày, chỉnh nước mỗi lần thăm): **stress nước 40/57/65% số ngày vụ ĐX khi thăm 3/5/7 ngày một lần, TD vẫn 28/41/48%** ⇒ riêng nước đã mất 0,3–0,65 health mỗi vụ. Chưa đổi số; chờ báo cáo M1.16.
- 26/09 (sau M1.5): Người dùng chốt: nước tối ưu [40, 70] → **[30, 80]** (thăm 3/5/7 ngày: ĐX thiếu/ngập 1/23/37% số ngày thay vì 40/57/65%); `initialDensity` = 0,02 cho cả 2 loại sâu bệnh; `crop.healthBands` 4 mức Tốt/Khá/Yếu/Kém (0,8/0,6/0,4/0); tổng nợ để xét vay nóng và phá sản chỉ tính khoản đã đến hạn + vay nóng, mua chịu, nợ sinh hoạt. Đã cập nhật data, khuôn Zod, DATA_SPEC và PROTOTYPE_SPEC §14.
- M1.6: `growth.ts` (ngưỡng giai đoạn, careFactor, sinh trưởng đêm, lịch dự kiến công khai) + `yield.ts` (chi phí xuống giống tách phần giống để mua chịu được, bón phân, nutrientFactor, năng suất). So sánh ngưỡng giai đoạn có sai số 1e-9 vì cộng dồn 0,9 trong IEEE không ra đúng số nguyên; bản Godot phải dùng cùng sai số. `harvestableDay` = sáng đầu tiên gặt được, cửa sổ gặt là `harvestableDay … +harvestWindowDays−1`. Mốc kiểm chứng: giống A sạ 17/11 gặt được day 101, giống B day 114, giống A sạ 1/7 day 315.
- M1.7: Sâu bệnh chạy theo pha trên cả ruộng: phát sinh/phát triển → lây lan → gây hại. Lây lan tính từ mật độ trước bước lây để không phụ thuộc thứ tự thửa. Đêm vừa phát sinh thì chưa phát triển (spec mục 5 viết dạng nếu/ngược lại). Mật độ không tự về 0 sau khi phun; chỉ về 0 khi gặt. Phun phòng có tác dụng các đêm `day … day+preventiveDays−1`. Cảnh báo vùng rút ở bước 6, bắt đầu từ hôm sau.
- M1.8: `health.ts` = bước đêm 5: thiếu/ngập nước (chỉ thửa đang `growing`), bão lúc trổ bông, đổ ngã (từ flowering, gồm cả thửa `harvestable` còn ngoài đồng), lũ. Cửa sổ lũ tính từ ngày đầu tháng 9 tới ngày cuối game thuộc tháng 11 ⇒ day 290–364. Radio báo lũ vào tối trước `warningDay` (log `floodWarning`). Nâng `lib` TS lên ES2023 (dùng `findLast`).
- M1.9: Mã vụ `DX-1`, `HT-1`, `TD-1`, `DX-2` suy từ lịch (tháng 11 đầu và cuối game là hai vụ khác nhau); cây và lô lúa mang mã vụ để tính sổ. Ledger có thêm khoản `cashless` (mua chịu, lãi phát sinh) để màn tính sổ đủ chi phí mà không lệch tiền mặt. Giá thị trường đổi khi sang ngày mới (bước đêm 9); lô lúa hao hụt và tự bán ở bước 7 theo giá của ngày đang kết thúc. Tiền phạt thiếu kg bán lúa non = giá thị trường của giống × `shortfallPenalty`.
- M1.10: `finance.ts`. Chuyển hệ số 0,9 của sản lượng kỳ vọng bán lúa non từ chữ trong DATA_SPEC vào `finance.advanceSale.expectedYieldFactor` (giữ nguyên 0,9). Mua chịu gộp vào một khoản mở duy nhất; vay nóng mỗi lần là một khoản. Tiền âm (A1) được chuyển thành một khoản `household_arrears` đến hạn ngay, tiền mặt về 0 (tương đương "tiền âm tính là nợ quá hạn" nhưng giữ bất biến tiền mặt ≥ 0). Khoản nợ trả xong thì xóa khỏi `loans` (lịch sử nằm trong ledger). Việc làm thuê ngày 0 rút lúc khởi tạo, sau kế hoạch lũ.
- M1.11: `debt.ts` = bước đêm 8. "Trễ N ngày" tính theo sáng hôm sau (sáng sau ngày hạn = trễ 1 ngày); trễ > 7 ngày ⇒ bậc 2, `warningDay` = sáng hôm sau, hạn chót = +14. Đêm của hạn chót còn nợ ⇒ bậc 3 (siết nợ chạy mỗi đêm khi còn khoản qua hạn chót), riêng tiền thuê ⇒ bậc 4. **Tự quyết (spec không nói):** mất ruộng thì hợp đồng bán lúa non trên các thửa bị mất tính là thiếu toàn bộ kg và phải trả bù theo spec §7. Phá sản xét mỗi đêm sau khi siết nợ.
- M1.12: `actions.ts` (kiểm tra theo pha/tiền/sức lực/uy tín, trả `ActionResult`), `phases.ts`, `night.ts` (thứ tự spec §9, một RNG dùng chung cho cả đêm), `skip.ts`, `field.ts` (thăm đồng), kèm `settlement.ts` + `summary.ts` (phần logic của M3.1/M3.2 mà sim cần). Pha `briefing` = buổi sáng chưa chọn việc. Thao tác tài chính và bán lúa làm được bất cứ lúc nào trong ngày. Tính sổ bật lên ngay khi bán lô cuối của vụ (kể cả giữa buổi), `acknowledge` quay về pha cũ. Tua dừng thêm cả khi có báo lũ, siết nợ, mất ruộng (coi như sự kiện "luôn dừng"); lý do dừng ghi vào log `skipStopped`.
- M1.13: `getPlayerView(state, data)` (cần `data` để tính lịch dự kiến, giá, hạn mức). Thửa `growing`/`harvestable` đều hiện là `planted`; thông tin đồng ruộng chỉ lấy từ `known`. Kiểm thử chống rò rỉ: xáo trộn mọi trường ẩn (RNG, hàng đợi thời tiết, ngày lũ, sâu bệnh, sức khỏe, sinh trưởng, nước, đổ ngã) phải cho ra view giống hệt.
- M1.14: `save.ts` có `Session { state, save }` + `dispatch` (chỉ ghi action được chấp nhận, snapshot mỗi lần qua mốc 30 ngày), `replay` (luôn chạy lại từ seed), `load` (từ snapshot gần nhất), `parseSave`/`serializeSave`. Kiểm thử dùng một tác tử ngẫu nhiên có seed (`tests/randomAgent.ts`) chơi cả năm với nhiều hành động bị từ chối; replay và load đều ra state giống hệt.
- M1.15: 3 bot dùng chung `sim/bots/policy.ts` (chỉ đọc `PlayerView`), khác nhau ở cấu hình. Ngưỡng tự đặt (B18): giữ 5 ngày sinh hoạt phí làm dự trữ; chỉ gieo nếu lịch dự kiến gặt ≤ day 359; bot `average` bón/đi đồng theo lịch công khai; `risky` "lệch nặng" = chỉ chỉnh khi thiếu nước, vay nóng giữ đệm 2 tr; `average`/`risky` chờ bán tối đa 1/2 ngày khi giá dưới giá gốc tháng. Thêm `CropState.sprayLog` (người chơi biết mình đã phun gì) để bot `safe` không phun phòng lặp lại. Tiền mặt theo ngày ghi tại các thời điểm bot quyết định; ngày bị tua lấy giá trị gần nhất trước đó.
- M1.16: Chạy 1.000 seed/bot: sống sót safe 8% / average 5% / risky 0% (mục tiêu 80–90 / 60–70). Nguyên nhân chính (tách bằng thí nghiệm tắt từng yếu tố): sâu bệnh quá dày, chỉnh nước quá thường xuyên, hụt tiền trước vụ gặt đầu (Tết day 80). Đề xuất 3 thay đổi trong `docs/BALANCE_LOG.md` (sim cho ra safe 84% / average 72%); **chưa áp dụng, chờ người dùng quyết**.
- M2 (giao diện cũ, đã bỏ theo hướng mới): UI trong `ui/` chỉ đọc `getPlayerView` (+ các hàm thuần công khai như `sowingCost`, `expectedSchedule` để xem trước chi phí/lịch). `useGame` tự lưu localStorage khi sang ngày mới hoặc hết lượt; seed ván mới lấy bằng `Math.random` ở UI (core không dùng). Kiểm thử khói render từng màn bằng `react-dom/server`. Đã chơi thử bằng Chrome headless (playwright-core cài tạm ở scratchpad, không thêm vào dự án): trọn một vụ từ xuống giống đến tính sổ chỉ qua giao diện, không lỗi console; tải lại trang khôi phục đúng ván.
- M3 (giao diện cũ, đã bỏ theo hướng mới; debug, replay, build vẫn giữ): Tính sổ hiện từng dòng (0,45 s/dòng, dòng lời/lỗ sau 1,6 s, có nút "Xem ngay"). Thẻ tổng kết có chơi lại cùng/khác seed; nút "Bán hết, lên thành phố" ở thanh tab (có hỏi lại). Debug: phím `, xem state ẩn, "nhảy N ngày" là một action `skipUntil` nghỉ không điều kiện dừng (file lưu vẫn replay được), xuất/nhập file lưu. Golden replays: `tests/replays/{safe-seed13,average-seed36,risky-seed1}.json` = file lưu + kết quả mong đợi (`core/golden.ts`), tạo lại bằng `npm run make-replays`. Build: `npm run build` → `dist/` đường dẫn tương đối; đã thử phục vụ từ thư mục con trong Chrome, chạy được.
- M4.1: File lưu có thêm `playtest` (`core/playtest.ts`: ngày dừng, lý do kết thúc, số lần tua, số ngày tua, lý do dừng tua, số lần ra đồng, bậc nợ cao nhất, số lần suýt phá sản, số vụ; UI thêm `startedAt`, `lastPlayedAt`, `sessions`). Trường này không ảnh hưởng replay. UI lưu thêm khi đóng tab để biết người chơi dừng ở đâu.
- 26/09 (sau M4.1): Người dùng chọn áp dụng cả 3 đề xuất cân bằng + đổi bot `risky` sang "liều tiền, chăm ruộng". Sim 1.000 seed: safe 84% / average 72% / risky 27% (BALANCE_LOG lần 2). Đã tạo lại replay mẫu. **Việc còn lại: M4.2 cần playtest với người thật.**
- 26/09 (đổi hướng giao diện): Docs cập nhật theo `UI_DIRECTION.md` + `reference/ui-reference.html`. Khôi phục PROTOTYPE_SPEC §14 và nhật ký này từ lịch sử phiên làm việc (bản docs mới đã vô tình xóa). Chốt cho giao diện mới (chi tiết ở UI_DIRECTION): ví và lớp mưa theo dự báo hôm nay, không theo thời tiết thật; `getActionOptions` dựa trên `actionRefusal`; mẩu giấy thửa gọn (xuống giống mở bước con, phun trị chỉ cho loại đang thấy dấu hiệu); xuồng là chỗ bán cho thương lái; thuê lại ruộng và "Bán hết, lên thành phố" ở cuối sổ nợ; tên event camelCase; không có nút "xem thử tính sổ" ngoài bảng debug. Thứ trong tuần trên lịch: chờ chốt (thêm `startWeekday` vào `calendar.json` hoặc bỏ dòng thứ).
