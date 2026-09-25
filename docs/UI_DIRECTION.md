# UI_DIRECTION – Hướng giao diện của prototype

File mẫu tham chiếu: `reference/ui-reference.html` (mở trực tiếp bằng trình duyệt để xem và bấm thử). Đây là bản HTML thuần làm bằng tay, logic bên trong chỉ là giả lập. **Chỉ lấy giao diện và tương tác từ file này, không lấy logic game.** Logic thật nằm trong `core/`.

## Nguyên tắc

1. **Mọi thao tác nằm trong thế giới game.** Người chơi chọn việc bằng cách bấm vào vật thể trong cảnh (ruộng, nhà, bảng gỗ, quyển sổ), không bằng menu, tab hay lưới thẻ.
2. **Giấy tờ là giao diện.** Bản tin, tua ngày, sổ nợ, tính sổ đều là trang vở ô ly viết tay. Thông tin chi tiết của một thửa là mẩu giấy ghim cạnh thửa đó.
3. **Thế giới hiện theo những gì người chơi biết.** Thửa ruộng vẽ theo `known` (lần thăm gần nhất), không theo state thật. Thửa lâu không thăm bị mờ và có cọc ghi "thấy N ngày trước".
4. **Không có ảnh, không có art.** Toàn bộ cảnh là hình khối SVG đơn giản. Mỗi vật thể là một component có điểm neo và khung cố định để sau này thay bằng sprite.
5. **Chuyển động chỉ để cho thấy điều gì vừa thay đổi:** nhân vật đi tới nơi làm việc, lịch lật trang khi sang ngày, dòng tính sổ hiện lần lượt, trời tối dần.

**Không được làm:** tab, sidebar, lưới thẻ kiểu dashboard, bảng dữ liệu dày đặc, nhãn chữ in hoa, icon thư viện có sẵn thay cho vật thể trong cảnh.

## Màu (token CSS)

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#4f7a34` (tối: `#2c4620`) | Nền quanh cảnh |
| `--ink` | `#27336e` | Mực trên giấy, nút chính |
| `--ink-soft` | `#4a5596` | Chữ phụ trên giấy |
| `--paper` | `#f7f8f1` | Giấy vở |
| `--grid` | `#c9bde0` | Dòng kẻ ô ly |
| `--margin` | `#d65a52` | Lề đỏ của vở, tiêu đề mục, số trên lịch |
| `--hud` | `#fffdf6` | Nền lịch và ví |
| `--gold` | `#e0b23a` | Uy tín, lúa chín |
| `--leaf` | `#3f8f3a` | Sức lực, lúa xanh |
| `--danger` | `#b8352c` | Dấu hiệu sâu bệnh, số âm |
| `--good` | `#2f7a3a` | Số dương |

Màu trong cảnh (cỏ `#79a64a`, đường `#c9a56b`, kênh `#4e9c9a`, bờ ruộng `#8a6b45`, bùn `#6b4f33`, nước `#5aa6a0`) là màu của thế giới, giữ nguyên ở chế độ tối.

## Chữ

- **Be Vietnam Pro** (400, 600, 700): lịch, ví, thanh pha, nút, nhãn trong cảnh.
- **Patrick Hand**: mọi chữ trên giấy (vở, mẩu giấy ghim, bảng gỗ, số tiền trong ví).
- Tải từ Google Fonts, luôn có fallback. Viết hoa kiểu câu, không in hoa toàn bộ.

## Bố cục cảnh (SVG `viewBox="0 0 1200 720"`)

| Vật thể | Vị trí | Tương tác |
|---|---|---|
| Đường đất | Dải ngang y ≈ 70–130 | – |
| Bảng gỗ "Cần người gặt / Hôm nay nghỉ" | Tâm (700, 42) trên đường | Đi làm thuê |
| Nhà lá | x 58–282, y 170–348 | Nghỉ ngơi |
| Ghế + quyển sổ | Quanh (255, 375) | Mở sổ tiền nợ |
| 5 thửa ruộng 240×170 | (370,170) (625,170) (880,170) (370,365) (625,365) | Ra đồng / xem thửa |
| Chòi máy bơm | Quanh (900–1010, 380–490) | Trang trí (sau này: chỉnh nước) |
| Kênh + xuồng | Dải cong y ≈ 580–700 | – |
| Nhân vật đội nón lá | Nhà (215, 392) | Di chuyển theo hoạt động |

Lớp phủ theo thứ tự: nền → đường, kênh → cây → nhà, sổ, bảng, chòi → ruộng → nhân vật → lớp màu thời gian → lớp đêm (sao, đom đóm, cửa sổ sáng đèn) → mưa (div phủ ngoài SVG).

**Thửa ruộng** gồm: bờ, bùn, lớp nước (độ đậm giảm dần theo giai đoạn), pattern cây lúa theo giai đoạn (`empty`, `germination`, `tillering`, `panicle`, `flowering`, `ripening`, `harvestable`), lớp mờ khi cũ ≥ 2 ngày, cọc tên "Thửa N" (thêm ", thấy N ngày trước" khi cũ), dấu "!" đỏ khi `known` có dấu hiệu.

## HUD

- **Lịch bóc** (trên trái): khoen treo, dải đỏ "Tháng N", số ngày lớn màu đỏ, thứ trong tuần, tên vụ, số ngày đến Tết. Lật trang (rotateX) mỗi khi sang ngày.
- **Ví** (trên phải): tiền mặt chữ viết tay (đỏ khi âm), thanh sức lực, thanh uy tín, thời tiết hôm nay kèm icon.
- **Thanh pha** (dưới giữa): vòng cung mặt trời chỉ sáng/chiều/tối, câu hướng dẫn theo pha, nút theo ngữ cảnh ("Mở bản tin", "Xong việc, về nhà").
- **Nhãn hover**: nhãn đen nhỏ theo con trỏ, nói vật thể làm gì ("Nhà: nghỉ ngơi").
- **Thông báo**: dải giấy trượt xuống từ trên, chữ viết tay, tự ẩn sau khoảng 2,6 giây.

## Giấy

- **Vở ô ly (modal):** nền giấy + ô ly tím + lề đỏ, nghiêng nhẹ (−1°), tiêu đề chữ viết tay lớn, tiêu đề mục màu lề đỏ. Dùng cho: Bản tin buổi sáng, Tua đến khi…, Sổ tiền nợ, Tính sổ, Thẻ tổng kết, (sau này) Thu hoạch và bán.
- **Mẩu giấy ghim (popover):** cùng chất liệu, có băng dính trên đầu, đặt cạnh thửa (ưu tiên bên phải, hết chỗ thì bên trái, hẹp quá thì giữa màn hình), nghiêng xen kẽ ±1,3°. Nội dung: tên thửa, giống và giai đoạn, nước, sức khỏe ước lượng, dấu hiệu (đỏ) hoặc "Không thấy dấu hiệu lạ", các nút hành động.
- **Nút hành động trên giấy:** nền trắng, viền mực, bên trái là tên việc, bên phải là chi phí và sức lực. Bị khóa thì mờ đi và có dòng lý do đỏ bên dưới. Nếu chỉ thiếu tiền, thêm nút viền đứt "Mua chịu ở đại lý, trả khi bán lúa" kèm giá đã cộng phụ phí.

## Luồng tương tác

| Pha | Người chơi thấy | Người chơi làm |
|---|---|---|
| Sáng sớm (`briefing`) | Vở bản tin tự mở | "Bắt đầu ngày" hoặc "Tua đến khi…" |
| Buổi sáng / chiều, chưa chọn việc | Cảnh bình thường, thanh pha hướng dẫn | Bấm ruộng, bảng gỗ, nhà, hoặc sổ |
| Ra đồng | Nhân vật đi tới thửa được bấm, cảnh cập nhật `known`, thông báo nếu có thửa có dấu hiệu, mẩu giấy của thửa mở ra | Bấm các thửa, làm việc, rồi "Xong việc, về nhà" |
| Đi làm thuê | Nhân vật đi ra bảng gỗ, thông báo tiền công | – (tự hết buổi) |
| Nghỉ | Thông báo hồi sức | – (tự hết buổi) |
| Tối (`night`) | Trời tối dần khoảng 1,7 giây | – |
| Sang ngày | Lịch lật trang, vở bản tin mở | – |
| Tua | Pha tối, lịch lật mỗi ~0,4 giây mỗi ngày, dừng thì mở bản tin với dòng đỏ "Dừng tua: lý do" | – |

Trong bản tin, radio hiện kiểu gõ chữ. Màn tính sổ hiện từng dòng mỗi ~0,38 giây, dòng "Vụ này: lời/lỗ" hiện sau cùng với độ trễ thêm ~1,4 giây.

## Quy tắc triển khai trong kiến trúc hiện có

- **UI không tính toán luật chơi.** Chi phí, sức lực, điều kiện khóa và lý do khóa, khả năng mua chịu phải lấy từ core qua hàm `getActionOptions(view, target)`. Bot dùng cùng hàm này.
- **State game là nguồn sự thật; animation là lớp trình bày.** Dispatch action ngay, rồi UI phát animation dựa trên sự kiện trong `state.log` (ví dụ `WentToField`, `HiredWorkDone`, `DayStarted`, `SkipStopped`). Không chờ animation xong mới đổi state.
- **Trạng thái chỉ thuộc UI** (vị trí nhân vật, mẩu giấy nào đang mở, hover, thông báo đang hiện) để trong React (useState, useReducer hoặc Zustand), không đưa vào `GameState`.
- **Mỗi vật thể trong cảnh là một component** nhận props từ `PlayerView`, có khung và điểm neo cố định, để thay bằng sprite sau này mà không đổi bố cục.

## Cấu trúc thư mục UI đề xuất

```
ui/
├── theme.css                 token màu, chữ, chất liệu giấy
├── App.tsx                   ghép Scene + HUD + Paper, nối dispatch
├── scene/
│   ├── Scene.tsx             SVG gốc, defs (pattern lúa, gradient), thứ tự lớp
│   ├── Ground.tsx, Road.tsx, Canal.tsx, Trees.tsx
│   ├── House.tsx, LedgerBench.tsx, WorkSign.tsx, PumpShed.tsx
│   ├── Plot.tsx              vẽ theo known + staleDays
│   ├── Farmer.tsx            nhân vật, di chuyển bằng CSS transform
│   ├── TimeOfDay.tsx         lớp màu, lớp đêm
│   └── Interactive.tsx       bọc vật thể: role=button, tabIndex, bàn phím, nhãn hover
├── hud/  Calendar.tsx, Purse.tsx, PhaseStrip.tsx, HoverTag.tsx, Toast.tsx, Rain.tsx
└── paper/
    ├── Notebook.tsx          khung vở ô ly dạng modal (focus trap)
    ├── PinnedNote.tsx        khung mẩu giấy ghim + định vị cạnh vật thể
    ├── ActionButton.tsx      nút hành động trên giấy (chi phí, sức, lý do khóa, mua chịu)
    ├── Briefing.tsx, SkipDialog.tsx, LedgerBook.tsx, Settlement.tsx, Summary.tsx
    └── PlotNote.tsx
```

## Chất lượng tối thiểu

- Bàn phím: mọi vật thể tương tác dùng được bằng Tab + Enter/Space; viền focus vàng rõ; Escape đóng mẩu giấy.
- `prefers-reduced-motion`: tắt mưa động, nhân vật dịch chuyển tức thì, lịch không lật, chữ radio hiện ngay, dòng tính sổ hiện ngay.
- Di động (≤ 640px): cảnh giữ tỉ lệ, cao bằng màn hình và vuốt ngang để di chuyển, cuộn ban đầu vào khu ruộng; lịch và ví thu nhỏ; thanh pha xuống dòng.
- Chế độ tối: chỉ đổi token nền và bóng; giấy và thế giới giữ màu.