# UI_DIRECTION – Hướng giao diện của prototype

File mẫu tham chiếu: `reference/ui-reference.html` (mở trực tiếp bằng trình duyệt để xem và bấm thử). Đây là bản HTML thuần làm bằng tay, logic bên trong chỉ là giả lập. **Chỉ lấy giao diện và tương tác từ file này, không lấy logic game.** Logic thật nằm trong `core/`. Riêng các chỗ file mẫu đọc thông tin ẩn (thời tiết thật hôm nay `S.wx.q[0]`, giai đoạn thật `stageOf(p)`, mực nước thật để hiện nút chỉnh nước) và mọi con số trong file mẫu đều không được chép.

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
| Bảng gỗ "Cần người làm / Hôm nay nghỉ" | Tâm (700, 42) trên đường | Đi làm thuê |
| Nhà lá | x 58–282, y 170–348 | Nghỉ ngơi |
| Ghế + quyển sổ | Quanh (255, 375) | Mở sổ tiền nợ |
| 5 thửa ruộng 240×170 | (370,170) (625,170) (880,170) (370,365) (625,365) | Ra đồng / xem thửa |
| Chòi máy bơm | Quanh (900–1010, 380–490) | Trang trí (sau này: chỉnh nước) |
| Kênh + xuồng thương lái | Dải cong y ≈ 580–700, xuồng quanh (980, 625) | Xuồng: "Thương lái: bán lúa", chỉ bấm được khi có lô lúa chờ bán; mở vở Thu hoạch và bán |
| Nhân vật đội nón lá | Nhà (215, 392) | Di chuyển theo hoạt động |

Lớp phủ theo thứ tự: nền → đường, kênh → cây → nhà, sổ, bảng, chòi → ruộng → nhân vật → lớp màu thời gian → lớp đêm (sao, đom đóm, cửa sổ sáng đèn) → mưa (div phủ ngoài SVG).

**Thửa ruộng** gồm: bờ, bùn, lớp nước (độ đậm giảm dần theo giai đoạn), pattern cây lúa theo giai đoạn (`empty`, `germination`, `tillering`, `panicle`, `flowering`, `ripening`, `harvestable`), lớp mờ khi cũ ≥ 2 ngày, cọc tên "Thửa N" (thêm ", thấy N ngày trước" khi cũ), dấu "!" đỏ khi `known` có dấu hiệu. Khi mất ruộng (`landAccess = false`), các thửa có cọc "Đã trả ruộng" và không ra đồng được.

## HUD

- **Lịch bóc** (trên trái): khoen treo, dải đỏ "Tháng N", số ngày lớn màu đỏ, tên vụ, số ngày đến Tết (không hiện thứ trong tuần). Lật trang (rotateX) mỗi khi sang ngày.
- **Ví** (trên phải): tiền mặt chữ viết tay (đỏ khi âm), thanh sức lực, thanh uy tín, **dự báo** hôm nay kèm icon và độ tin cậy (ví dụ "Dự báo hôm nay: Mưa (khá chắc)"). Không hiện thời tiết thật của hôm nay vì đó là thông tin ẩn.
- **Thanh pha** (dưới giữa): vòng cung mặt trời chỉ sáng/chiều/tối, câu hướng dẫn theo pha, nút theo ngữ cảnh ("Mở bản tin", "Xong việc, về nhà").
- **Nhãn hover**: nhãn đen nhỏ theo con trỏ, nói vật thể làm gì ("Nhà: nghỉ ngơi").
- **Thông báo**: dải giấy trượt xuống từ trên, chữ viết tay, tự ẩn sau khoảng 2,6 giây.

## Giấy

- **Vở ô ly (modal):** nền giấy + ô ly tím + lề đỏ, nghiêng nhẹ (−1°), tiêu đề chữ viết tay lớn, tiêu đề mục màu lề đỏ. Dùng cho: Bản tin buổi sáng, Tua đến khi…, Sổ tiền nợ, Tính sổ, Thẻ tổng kết, Thu hoạch và bán.
- **Mẩu giấy ghim (popover):** cùng chất liệu, có băng dính trên đầu, đặt cạnh thửa (ưu tiên bên phải, hết chỗ thì bên trái, hẹp quá thì giữa màn hình), nghiêng xen kẽ ±1,3°. Nội dung: tên thửa, giống và giai đoạn, nước, sức khỏe ước lượng, dấu hiệu (đỏ) hoặc "Không thấy dấu hiệu lạ", các nút hành động.
- **Nút hành động trên giấy:** nền trắng, viền mực, bên trái là tên việc, bên phải là chi phí và sức lực. Bị khóa thì mờ đi và có dòng lý do đỏ bên dưới. Nếu chỉ thiếu tiền, thêm nút viền đứt "Mua chịu ở đại lý, trả khi bán lúa" kèm giá đã cộng phụ phí.

## Luồng tương tác

| Pha | Người chơi thấy | Người chơi làm |
|---|---|---|
| Sáng sớm (`briefing`) | Vở bản tin tự mở | "Bắt đầu ngày" hoặc "Tua đến khi…" |
| Buổi sáng / chiều, chưa chọn việc | Cảnh bình thường, thanh pha hướng dẫn | Bấm ruộng, bảng gỗ, nhà, hoặc sổ |
| Ra đồng | Nhân vật đi tới thửa được bấm, cảnh cập nhật `known`, thông báo nếu có thửa có dấu hiệu, mẩu giấy của thửa mở ra | Bấm các thửa, làm việc, rồi "Xong việc, về nhà" |
| Đi làm thuê | Nhân vật đi ra bảng gỗ, thông báo tiền công | – (tự hết buổi) |
| Đang ra đồng mà bấm nhà / bảng gỗ | Thông báo "Đang ở ngoài đồng. Bấm “Xong việc, về nhà” trước." | – |
| Mở sổ (bất cứ lúc nào trừ ban đêm) | Vở Sổ tiền nợ; không tốn buổi, nhân vật không di chuyển | Trả nợ, vay, bán non, gia hạn, thuê lại ruộng, bỏ cuộc |
| Bấm xuồng (khi có lô chờ bán) | Vở Thu hoạch và bán; không tốn buổi | Bán từng lô hoặc để chờ (không bán) |
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

## Quyết định bổ sung (chốt 26/09/2026)

Các điểm file mẫu và spec lệch nhau hoặc bỏ trống, đã chốt như sau. Nếu mâu thuẫn với các mục trên, mục này thắng.

- **Mưa và thời tiết trên HUD:** lớp mưa vẽ theo **dự báo hôm nay** (rain → mưa, heavy_rain/storm → mưa nặng), ví hiện dự báo hôm nay kèm độ tin cậy. Bản tin hiện thêm thời tiết thật **hôm qua** (quyết định A2) và bậc vòng xoáy nợ khi ≥ 1.
- **Mẩu giấy thửa ruộng** chỉ đọc `known` và `getActionOptions`, không đọc state thật:
  - Thửa trống: một nút "Xuống giống…" mở bước con ngay trên mẩu giấy (chọn giống, sạ hoặc cấy, xem chi phí, sức lực và ngày gặt dự kiến), rồi mới xuống giống.
  - Phun trị: chỉ hiện nút cho loại sâu bệnh `known` đang thấy dấu hiệu. Phun phòng gộp thành một mục (mở ra chọn loại).
  - Gặt máy / gặt tay hiện khi `known` thấy lúa có thể gặt.
  - Bán lúa non của thửa nằm trong sổ nợ, không nằm trên mẩu giấy.
- **Mua chịu:** chỉ vật tư (giống, phân, thuốc) được mua chịu; làm đất, công cấy, chỉnh nước, thuê máy luôn trả tiền mặt. Nút viền đứt "Mua chịu ở đại lý…" chỉ hiện khi `getActionOptions` trả phương án mua chịu; giá hiển thị lấy từ option, không tự cộng phụ phí.
- **Tua đến khi…:** hoạt động mặc định "Nghỉ ở nhà" (chọn được "Đi làm thuê khi có việc"). Đủ 4 điều kiện dừng tùy chọn của spec §3 (dự báo mưa lớn/bão, radio báo dịch, lúa sang giai đoạn mới theo lịch dự kiến, còn ≤ 3 ngày tới hạn nợ), mặc định bật hết. Số ngày tối đa chọn trong 3 / 7 / 14 / 30. Dòng ghi chú liệt kê đủ sự kiện luôn dừng: bão, lũ và báo lũ, chủ nợ đến nhà, siết nợ, mất ruộng, tới hạn tiền thuê, lúa có thể gặt, Tết. Dòng đỏ "Dừng tua: lý do" lấy lý do và tiền làm thuê kiếm được từ event `skipStopped`; lịch lật theo từng event `skipDayPassed`.
- **Sổ tiền nợ:** tiền mặt, từng khoản nợ (gốc, số dư, hạn), uy tín, rồi các nút lấy từ `getActionOptions` cho mục tiêu "sổ": trả nợ, vay nóng, đảo nợ, bán lúa non (theo thửa), xin gia hạn tiền thuê, thuê lại ruộng (khi đã mất ruộng). Cuối sổ là "Bán hết, lên thành phố" (hỏi lại trước khi dispatch `quit`). Không có nút "Xem thử màn tính sổ": màn tính sổ tự mở qua pha `settlement`; nếu cần xem để kiểm tra thì đặt ở bảng debug.
- **Thu hoạch và bán:** làm ngay trong M2.9, không phải "sau này". Vở mở từ xuồng thương lái: giá thương lái hôm nay theo giống, từng lô (kg, số đêm đã chờ, giá trị nếu bán bây giờ), nút bán từng lô. Chờ bán nghĩa là không bán; hết số đêm tối đa thì core tự bán.
- **Chữ hiển thị:** sức khỏe dùng nhãn `crop.healthBands` trong data (Tốt / Khá / Yếu / Kém). Mực nước dùng chữ của file mẫu, ánh xạ từ `known.waterLevel`: low → "hơi cạn", ok → "vừa đủ", flooded → "ngập nhiều". Độ tin cậy dự báo: hôm nay "khá chắc", ngày mai "tương đối", ngày mốt "chưa chắc". Bảng gỗ: "Cần người làm" / "Hôm nay nghỉ" theo `hiredWorkAvailable`.
- **Lớp nước trên thửa** giữ như file mẫu (đậm dần theo giai đoạn đã biết), vì mực nước đã có chữ trên mẩu giấy.
- **Tên event:** camelCase như code (`wentToField`, `hiredWorkDone`, `restDone`, `dayStarted`, `skipDayPassed`, `skipStopped`).
- **"Bắt đầu ngày"** chỉ đóng vở bản tin phía UI, không phải action. Bấm vào ruộng khi chưa chọn việc = dispatch `chooseActivity: field`.
- **Pha tối** không có trong core: `runNight` chạy ngay khi hết buổi chiều; trời tối dần là animation phát từ event.
- **Lịch bóc không hiện thứ trong tuần** (bỏ dòng "Thứ Sáu" của file mẫu): data không có thứ của day 0, và thêm vào chỉ là quy ước.
