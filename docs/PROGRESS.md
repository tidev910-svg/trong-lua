# PROGRESS – Tiến độ prototype

Quy ước: làm từng task theo thứ tự. Xong task thì đổi `[ ]` thành `[x]` và ghi 1–2 dòng vào mục "Nhật ký quyết định".

## M1 – Lõi mô phỏng và bộ mô phỏng (tuần 1–2)

- [ ] M1.1 Khởi tạo dự án: Vite + React + TS strict, Vitest, Zod, tsx; các script `dev`, `typecheck`, `test`, `validate-data`, `sim`
- [ ] M1.2 `data/`: toàn bộ JSON theo `DATA_SPEC.md` + khuôn Zod + `loadData.ts` + script `validate-data`
- [ ] M1.3 `core/rng.ts` + kiểm thử tất định
- [ ] M1.4 `core/types.ts`, `init.ts`, `systems/calendar.ts` + kiểm thử
- [ ] M1.5 Thời tiết + dự báo + nước + kiểm thử (tỉ lệ dự báo đúng trên nhiều mẫu)
- [ ] M1.6 Sinh trưởng, bón phân, năng suất + kiểm thử (đúng số ngày theo giống và tháng)
- [ ] M1.7 Sâu bệnh, phun thuốc, cảnh báo vùng + kiểm thử
- [ ] M1.8 Bão, đổ ngã, lũ, sức khỏe
- [ ] M1.9 Thị trường, thu hoạch, bán lúa, thương lái
- [ ] M1.10 Tài chính: sinh hoạt phí, Tết, tiền thuê, 5 nguồn vay, uy tín + kiểm thử lãi
- [ ] M1.11 Vòng xoáy nợ (6 bậc) + điều kiện kết thúc
- [ ] M1.12 `actions.ts` + máy trạng thái pha + `runNight` + `skipUntil`
- [ ] M1.13 `playerView.ts` (giấu thông tin ẩn) + kiểm thử không rò rỉ
- [ ] M1.14 `save.ts` + kiểm thử replay giống hệt
- [ ] M1.15 3 bot + `runSim.ts` + báo cáo (tỉ lệ sống sót, phân vị tài sản ròng, bậc nợ cao nhất, nguyên nhân thất bại, CSV tiền mặt theo ngày)
- [ ] M1.16 Chạy mô phỏng 1.000 seed/bot, viết báo cáo cân bằng lần 1 vào `docs/BALANCE_LOG.md` (chưa tự đổi số)

**Nghiệm thu M1:** `typecheck` và `test` qua; `sim` chạy được 3.000 lượt; có báo cáo cân bằng lần 1.

## M2 – Giao diện trong thế giới game (tuần 3–4)

Theo `docs/UI_DIRECTION.md`, tham chiếu `reference/ui-reference.html`.

- [ ] M2.0 Core: `getActionOptions(view, target)` + các GameEvent trình bày (`WentToField`, `HiredWorkDone`, `RestDone`, `DayStarted`, `SkipDayPassed`, `SkipStopped`…) + kiểm thử
- [ ] M2.1 `theme.css` (token, chữ, chất liệu giấy vở ô ly) + `Notebook`, `PinnedNote`, `ActionButton`
- [ ] M2.2 `Scene` tĩnh: toàn bộ vật thể SVG, pattern lúa theo giai đoạn, `Interactive` (hover, bàn phím), di động vuốt ngang
- [ ] M2.3 HUD: lịch bóc (lật trang), ví, thanh pha, nhãn hover, thông báo, mưa, ánh sáng theo pha
- [ ] M2.4 Bản tin buổi sáng (radio gõ chữ) + khung App nối dispatch + tự lưu cuối ngày
- [ ] M2.5 Ra đồng: nhân vật di chuyển, cập nhật `known`, `Plot` vẽ theo known + cũ, `PlotNote` với hành động từ `getActionOptions` (kể cả xuống giống và mua chịu)
- [ ] M2.6 Làm thuê, nghỉ, chuyển buổi, đêm, sang ngày
- [ ] M2.7 Tua đến khi… (lịch lật liên tục, dừng với lý do)
- [ ] M2.8 Sổ tiền nợ + các nguồn vay
- [ ] M2.9 Thu hoạch và bán

**Nghiệm thu M2:** chơi trọn một vụ từ xuống giống đến bán lúa chỉ bằng giao diện; không có logic luật chơi trong `ui/`; dùng được bằng bàn phím; chạy được trên màn hình 390px.

## M3 – Hoàn thiện vòng chơi (tuần 5)

- [ ] M3.1 Tính sổ (dòng hiện lần lượt, dòng kết quả hiện sau cùng)
- [ ] M3.2 Thẻ tổng kết + "Bán hết, lên thành phố" + chơi lại cùng/khác seed
- [ ] M3.3 Bảng debug (state ẩn, nhảy ngày, xuất/nhập file lưu)
- [ ] M3.4 Tạo 3 file lưu mẫu vào `tests/replays/` + kiểm thử golden
- [ ] M3.5 Build tĩnh để đăng itch.io (`vite build`, đường dẫn tương đối)

**Nghiệm thu M3:** chơi trọn một năm; có bản build đăng được.

## M4 – Playtest (tuần 6)

- [ ] M4.1 Thêm ghi nhận dữ liệu playtest vào file lưu (thời điểm quit, số lần tua, bậc nợ cao nhất)
- [ ] M4.2 Sửa lỗi và điều chỉnh theo phản hồi (ghi vào `docs/BALANCE_LOG.md`)

## Nhật ký quyết định

- (trống)