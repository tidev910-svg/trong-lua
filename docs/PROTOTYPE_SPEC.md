# PROTOTYPE_SPEC – Luật chơi của bản prototype

Tài liệu này là nguồn sự thật cho gameplay của prototype. Con số cụ thể nằm trong `DATA_SPEC.md`; ở đây chỉ mô tả luật. Mọi con số là giá trị tạm để cân bằng.

## 1. Phạm vi

**Có:** 5 công ruộng thuê, 1 năm chơi (365 ngày, tối đa 3 vụ), 2 giống lúa, 2 loại sâu bệnh, thời tiết + dự báo, lũ, thương lái, tiền thuê năm 2 kỳ, sinh hoạt phí, Tết, vay họ hàng, mua chịu, vay nóng, bán lúa non, xin gia hạn tiền thuê, đi làm thuê, uy tín, vòng xoáy nợ, màn tính sổ, thẻ tổng kết, lưu game, bảng debug.

**Không có:** art, âm thanh, mua đất, máy móc, nhà ở, kho trữ lúa, gia đình, NPC có thoại, hạn mặn, nhiều năm chơi.

## 2. Lịch và nhịp một ngày

- Day 0 = 15/11 (đầu mùa xuống giống Đông Xuân). Game kết thúc sau day 364.
- Tháng của một ngày được suy ra từ lịch (dùng cho thời tiết, tốc độ sinh trưởng, giá).
- Tết cố định tại `tetDay` (xem data): trừ thêm chi phí Tết.
- Mỗi ngày gồm các pha: `briefing` → `morning` → `afternoon` → `night` → ngày mới.
  - `briefing`: hiện bản tin, người chơi chọn việc cho buổi sáng (hoặc tua).
  - `morning`, `afternoon`: mỗi buổi thực hiện đúng một hoạt động.
  - `night`: hệ thống mô phỏng chạy (xem mục 9), rồi sang ngày mới.

## 3. Hoạt động mỗi buổi

| Hoạt động | Mô tả |
|---|---|
| `field` (ra đồng) | Thấy trạng thái thật của các thửa đã thăm; thực hiện các thao tác ruộng, mỗi thao tác tốn sức lực và/hoặc tiền |
| `hired_work` (làm thuê) | Nhận tiền công nửa ngày; chỉ có khi có việc (xác suất có việc theo tháng, cao vào mùa gặt); +uy tín nhẹ |
| `rest` (nghỉ) | Hồi sức lực |

**Sức lực (energy):** 0–100. Đêm hồi một lượng cố định. Các thao tác ruộng và làm thuê tiêu hao sức lực. Không thể làm thao tác nếu không đủ sức lực.

**Thao tác ruộng khi ra đồng** (áp dụng cho từng thửa, trừ thăm đồng):
- Thăm đồng: mặc định khi ra đồng, cập nhật "thông tin đã biết" của tất cả các thửa (mức sâu bệnh hiện dấu hiệu nếu vượt ngưỡng nhìn thấy, mực nước, giai đoạn, sức khỏe ước lượng).
- Làm đất và xuống giống (chỉ khi thửa trống).
- Bón phân.
- Phun thuốc trị (giảm mạnh mật độ một loại sâu bệnh) hoặc phun phòng (giảm tốc độ phát triển trong N ngày).
- Điều chỉnh nước (đưa mực nước về mức tối ưu).
- Gặt tay (thay vì thuê máy): tốn nhiều sức lực, không tốn tiền.

**Tua ngày (skip):** người chơi chọn một hoạt động mặc định (`rest` hoặc `hired_work`) và các điều kiện dừng:
- Dự báo mưa lớn hoặc bão
- Có cảnh báo dịch trên radio
- Có thửa chuyển giai đoạn sinh trưởng (chỉ biết nếu dự kiến theo lịch, không lộ thông tin ẩn)
- Còn ≤ 3 ngày tới hạn một khoản nợ
- Sau N ngày

Sự kiện **luôn dừng** tua: bão, lũ, chủ nợ đến nhà, tới hạn tiền thuê, lúa chín có thể gặt, Tết.

## 4. Ruộng và cây lúa

Một ruộng 5 công (5.000 m², `plotCount` = 1): mọi thao tác làm trên cả ruộng (quyết định C1, mục 14). Trong code và data ruộng vẫn là một "thửa" (`plots[0]`); core chạy được với nhiều thửa, khi đó các luật giữa thửa (lây lan, thửa kề) mới có tác dụng. Ruộng có trạng thái:

- `status`: `empty | growing | harvestable | harvested`
- `variety`, `sowingMethod` (`broadcast` = sạ, `transplant` = cấy), `sowDay`
- `growth`: tiến độ tính theo "ngày sinh trưởng" tích lũy (số thực)
- `stage`: suy ra từ `growth` (xem bên dưới)
- `water`: 0–100, tối ưu trong khoảng [waterMin, waterMax]
- `fertilizerApps`: số lần bón, và lần bón có đúng giai đoạn khuyến cáo không
- `health`: 0–1 (ảnh hưởng năng suất)
- `pests`: mật độ từng loại sâu bệnh 0–1 (thông tin ẩn)
- `preventiveUntil`: ngày hết tác dụng phun phòng theo từng loại
- `known`: thông tin người chơi thấy ở lần thăm gần nhất + `lastVisitDay`

### Giai đoạn sinh trưởng

Các giai đoạn: `germination` → `tillering` (đẻ nhánh) → `panicle` (làm đòng) → `flowering` (trổ bông) → `ripening` (chín) → `harvestable`.

- Giai đoạn `panicle`, `flowering`, `ripening` có độ dài cố định (data).
- Giai đoạn sinh dưỡng (`germination` + `tillering`) = thời gian gốc của giống − tổng 3 giai đoạn trên. Đây là phần co giãn giữa các giống.
- Mỗi đêm `growth += growthRateByMonth[tháng] × careFactor`, với `careFactor` giảm khi thiếu nước/ngập hoặc sức khỏe thấp (xem data).
- Khi đến `harvestable`: có cửa sổ gặt tối ưu; quá cửa sổ, năng suất mất dần mỗi ngày (rụng hạt).

### Năng suất khi gặt

```
yieldKg = baseYield[giống][vụ]
        × health
        × nutrientFactor[số lần bón đúng giai đoạn]
        × sowingMethodFactor
        × (1 − overdueLoss)
```

"Vụ" xác định theo tháng xuống giống (data `seasonBySowingMonth`).

### Bón phân

Có 2 thời điểm khuyến cáo: giai đoạn `tillering` và `panicle`. Bón đúng giai đoạn mới tính vào `nutrientFactor`; bón sai giai đoạn vẫn tốn tiền nhưng hiệu quả thấp.

## 5. Sâu bệnh

Hai loại: `brown_planthopper` (rầy nâu), `rice_blast` (đạo ôn). Với mỗi thửa đang có lúa, mỗi đêm:

1. Nếu mật độ = 0: có xác suất phát sinh `spawnChance × hệ số cảnh báo vùng`.
2. Nếu mật độ > 0: `density += density × growthRate × weatherFactor × varietySusceptibility × stageFactor × preventiveFactor`, giới hạn 1.
3. Lây sang thửa kề nếu mật độ > `spreadThreshold` (xác suất `spreadChance`). Chỉ có tác dụng khi `plotCount` > 1; với một ruộng thì không có bước này.
4. Gây hại: nếu mật độ > `damageThreshold`, `health -= damagePerDay × density`.

**Dấu hiệu:** chỉ hiện khi người chơi ra đồng VÀ mật độ ≥ `visibleThreshold`. Dấu hiệu là chữ mô tả theo mức (nhẹ, vừa, nặng), không hiện con số.

**Phun thuốc trị:** `density ×= (1 − sprayEffectiveness)`. **Phun phòng:** trong `preventiveDays` ngày, tốc độ phát triển nhân `preventiveFactor`.

**Cảnh báo vùng:** sự kiện ngẫu nhiên theo tháng, kéo dài N ngày, nhân xác suất phát sinh. Hiện trên radio.

## 6. Thời tiết, dự báo và lũ

- Trạng thái: `sunny | cloudy | rain | heavy_rain | storm`.
- Mỗi ngày: với xác suất `persistence` giữ nguyên thời tiết hôm trước, ngược lại rút ngẫu nhiên theo phân phối của tháng.
- Thời tiết của ngày mai được quyết định trước (ẩn). Dự báo hôm nay đúng với xác suất `forecastAccuracy.today`; dự báo 2 ngày tới kém hơn. Nếu dự báo sai, hiện một trạng thái lân cận.
- Ảnh hưởng: mưa tăng nước, nắng giảm nước; `weatherFactor` cho sâu bệnh; bão lúc `flowering` có xác suất giảm mạnh `health`; bão/mưa lớn có thể gây đổ ngã (lúa sạ rủi ro cao hơn).
- **Lũ:** mỗi năm có xác suất xảy ra một trận lũ vào một ngày ngẫu nhiên trong cửa sổ tháng 9–11. Thửa còn lúa chưa gặt bị giảm `health` mạnh. Radio báo trước vài ngày (có thể sai lệch vài ngày).

## 7. Thu hoạch và bán lúa

- Gặt: thuê máy (tốn tiền, không tốn sức) hoặc gặt tay (tốn sức lực nhiều buổi).
- Sau khi gặt, lúa tươi phải bán trong tối đa 3 ngày; mỗi ngày chờ mất phần trăm khối lượng.
- Giá thị trường: giá gốc theo vụ × hệ số giống, dao động ngẫu nhiên hằng ngày trong biên, giảm khi đang giữa đợt gặt rộ của vùng (cửa sổ theo data).
- Thương lái trả `giá thị trường × (traderBase + traderUyTinBonus × uyTin/100)`.
- Nếu có hợp đồng bán lúa non: số kg đã cam kết bị trừ trước theo giá đã chốt; thiếu kg thì trả bù bằng tiền theo giá thị trường × hệ số phạt.

## 8. Tài chính

**Khởi đầu:** tiền mặt ban đầu + khoản vay họ hàng (dùng trả kỳ thuê 1 ngay day 0).

**Chi cố định:** sinh hoạt phí mỗi ngày (trừ vào đêm), chi phí Tết tại `tetDay`, tiền thuê kỳ 2 tại `rentInstallments[1].day`.

**Nguồn vay** (tham số trong data):

| Loại | Luật |
|---|---|
| `family` | Cho sẵn ở day 0, không lãi, hạn cuối năm; trễ hạn trừ uy tín nặng |
| `store_credit` (mua chịu) | Mua vật tư (giống, phân, thuốc) trả sau với giá cao hơn; hạn = lần bán lúa kế tiếp (tự trừ khi bán); cần uy tín ≥ ngưỡng; có hạn mức |
| `loan_shark` (vay nóng) | Vay ngay tới hạn mức; lãi theo chu kỳ 30 ngày, cộng dồn; hạn 30 ngày, có thể đảo nợ (trả lãi, gia hạn) |
| `advance_sale` (bán lúa non) | Khi lúa còn ngoài đồng chưa gặt (xem B12): nhận tiền ngay = sản lượng kỳ vọng × giá hiện tại × hệ số, tối đa một tỉ lệ sản lượng kỳ vọng; cam kết giao số kg đó khi gặt |
| `rent_extension` (xin gia hạn) | Hoãn một kỳ tiền thuê N ngày; trừ uy tín; ghi nhận tăng giá thuê năm sau (chỉ hiển thị) |

**Uy tín:** 0–100, bắt đầu từ `startUyTin`. Trả đúng hạn +, trễ hạn −, làm thuê + (có giới hạn mỗi vụ), xin gia hạn −. Ảnh hưởng: điều kiện mua chịu, giá thương lái, việc vay nóng có được chấp nhận.

## 9. Thứ tự xử lý ban đêm (bắt buộc cố định để tất định)

1. Hiện thực hóa thời tiết hôm nay (đã quyết định từ hôm trước), sinh thời tiết ngày mai và dự báo
2. Cập nhật nước
3. Sinh trưởng
4. Sâu bệnh (phát sinh → phát triển → lây lan → gây hại)
5. Sức khỏe (nước, bão, đổ ngã, lũ)
6. Sự kiện (cảnh báo dịch, lũ, việc làm thuê ngày mai)
7. Tài chính (sinh hoạt phí, Tết, lãi, kiểm tra hạn)
8. Đánh giá bậc vòng xoáy nợ
9. Hồi sức lực, tăng ngày

## 10. Vòng xoáy nợ

| Bậc | Điều kiện | Hệ quả |
|---|---|---|
| 0. Bình thường | Không có khoản quá hạn | – |
| 1. Trễ hạn | Có khoản quá hạn ≤ 7 ngày | Phạt lãi, uy tín giảm |
| 2. Cảnh báo | Quá hạn > 7 ngày | Sự kiện chủ nợ đến nhà (dừng tua), hiện hạn chót cuối cùng 14 ngày |
| 3. Siết nợ | Qua hạn chót | Tự động bán lúa đang có với giá thấp; ép bán lúa non các thửa đang trồng với hệ số thấp |
| 4. Mất ruộng | Tiền thuê quá hạn chót | Mất quyền canh tác; chỉ còn làm thuê/nghỉ; thuê lại được khi đủ tiền kỳ còn lại + phụ phí |
| 5. Phá sản | Tổng nợ > tổng tài sản VÀ không còn nguồn vay nào chấp nhận | Kết thúc lượt chơi |

## 11. Tính sổ và kết thúc

- **Tính sổ** diễn ra sau khi bán lô lúa cuối cùng của một vụ (tất cả thửa đã gặt và bán). Hiện: doanh thu từng thửa, chi phí vật tư, công gặt, lãi vay, sinh hoạt phí trong vụ, nợ đã trả, nợ còn lại, tiền mặt cuối vụ. Dòng cuối "Vụ này: lời/lỗ X" hiện sau cùng.
- **Kết thúc lượt chơi:** hết day 364, phá sản, hoặc người chơi chọn "Bán hết, lên thành phố".
- **Thẻ tổng kết:** số vụ đã làm, tài sản ròng cuối cùng, cao điểm tiền mặt, món nợ lớn nhất, uy tín cuối, số lần suýt phá sản (đạt bậc ≥ 2), seed.

## 12. Màn hình

Giao diện theo `docs/UI_DIRECTION.md` và mẫu `reference/ui-reference.html`: người chơi chọn việc bằng cách bấm vào vật thể trong cảnh; bản tin, tua ngày, sổ nợ, tính sổ, tổng kết là trang vở ô ly; chi tiết một thửa là mẩu giấy ghim cạnh thửa.

Nội dung cần có:

1. **Bản tin buổi sáng** (vở) – hôm qua (thời tiết thật hôm qua, "lần cuối ra đồng: N ngày trước"), dự báo hôm nay + 2 ngày kèm độ tin cậy, tin radio, tình trạng đã biết của từng thửa, tiền mặt, khoản nợ gần hạn nhất, bậc vòng xoáy nợ (khi ≥ 1); nút "Bắt đầu ngày" và "Tua đến khi…".
2. **Cảnh chính** – ruộng (ra đồng), nhà (nghỉ), bảng gỗ (làm thuê, hiện có việc hay không), quyển sổ (tiền và nợ), xuồng thương lái (bán lúa, khi có lô chờ bán).
3. **Mẩu giấy thửa ruộng** – giai đoạn, nước, sức khỏe ước lượng, dấu hiệu; hành động phù hợp giai đoạn (xuống giống, bón phân, phun trị, phun phòng, chỉnh nước, gặt), mỗi nút hiện chi phí và sức lực, lý do khi bị khóa, lựa chọn mua chịu khi chỉ thiếu tiền.
4. **Tua đến khi…** (vở) – hoạt động mặc định, điều kiện dừng, số ngày tối đa.
5. **Sổ tiền nợ** (vở) – tiền mặt, từng khoản nợ (gốc, lãi, hạn), uy tín, các nguồn vay khả dụng (vay nóng, đảo nợ, bán lúa non, xin gia hạn), thuê lại ruộng khi đã mất ruộng, và "Bán hết, lên thành phố".
6. **Thu hoạch và bán** – gặt (thuê máy hay gặt tay) ngay trên mẩu giấy thửa; bán trong vở mở từ xuồng thương lái: giá thương lái hôm nay, từng lô, bán hay chờ (tối đa 3 ngày).
7. **Tính sổ** (vở) – như mục 11, các dòng hiện lần lượt.
8. **Thẻ tổng kết** (vở) – như mục 11, nút chơi lại cùng seed hoặc seed mới.
9. **Debug (phím `` ` ``)** – bảng thường, không cần theo phong cách game: toàn bộ state ẩn, thời tiết thật, seed, nhảy N ngày, xuất/nhập file lưu.

## 13. Lưu game

- Tự động lưu cuối mỗi ngày vào localStorage: `{ version, seed, actions[], snapshots? }`.
- Chỉ một bản lưu mỗi lượt chơi. Không có nút tải ngày cũ.
- Bảng debug cho phép xuất/nhập file lưu (để tái hiện lỗi và làm dữ liệu kiểm thử).

## 14. Quyết định bổ sung (chốt 26/09/2026)

Các điểm spec còn mơ hồ đã được chốt như dưới đây. Nếu mâu thuẫn với các mục trên, mục này thắng. Mã A/B là số câu hỏi trong phiên rà soát spec.

**Thời gian và pha**
- A2: State giữ hàng đợi thời tiết thật 3 ngày [d, d+1, d+2]. Đêm ngày d áp tác động thời tiết ngày d rồi sinh ngày d+3. Dự báo cho cả 3 ngày tạo lại độc lập mỗi sáng. Bản tin sáng cho biết thời tiết thật hôm qua. Thời tiết ngày 0–2 rút lúc khởi tạo. Dự báo sai thì chọn đều trong `neighbors`.
- A15: `applyAction` trả `{ ok: true, state } | { ok: false, state, reason }`, và state không đổi khi `ok: false`. File lưu chỉ ghi action `ok`.
- B1: Ban đầu sức lực = `max`. Buổi chiều có bước chọn hoạt động riêng. Thao tác tài chính và bán lúa không tốn buổi, làm được trong pha bản tin, sáng và chiều. Trong buổi ra đồng, số thao tác chỉ bị giới hạn bởi sức lực.
- B2: `Phase` không có `sowing` và `harvestSale` (chỉ là màn hình UI). Giữ `settlement` (chờ `acknowledge`) và `gameOver`.
- B3: Hạn `dueDay` nghĩa là trả trước bước tài chính ban đêm của ngày đó. Tua dừng ở bản tin sáng của ngày đến hạn và ngày Tết. Tiền Tết trừ vào đêm `tetDay`. Không tự trả nợ, trừ mua chịu được tự trừ khi bán lúa.
- B15: Điều kiện dừng tua chỉ bắt khi trạng thái mới xảy ra so với lúc bắt đầu tua. Làm thuê mà không có việc hoặc không đủ sức thì chuyển sang nghỉ.
- A13: Điều kiện dừng "lúa chín có thể gặt" và các cảnh báo theo giai đoạn dựa trên lịch dự kiến (ngày xuống giống + `growthRateByMonth`, careFactor = 1), không dựa trên trạng thái thật.

**Cây lúa**
- A3: Mọi giai đoạn tính theo "ngày sinh trưởng", nên giai đoạn cố định cũng co giãn theo `growthRateByMonth × careFactor`.
- B6: `harvestable` là status, không phải stage của sâu bệnh. Sâu bệnh chỉ chạy trên thửa `growing`. Thửa `harvested` được xuống giống lại như thửa trống. Không giới hạn cứng 3 vụ.
- B7: `careFactor` = tích các hệ số (thiếu hoặc ngập nước × sức khỏe thấp). Mỗi giai đoạn khuyến cáo chỉ tính lần bón đầu tiên là bón đúng; các lần sau tính là bón sai giai đoạn.
- B8: `overdueLoss = min(1, số ngày quá cửa sổ × overdueLossPerDay)`.
- A16: Mọi hao sức khỏe (bão lúc trổ bông, đổ ngã, lũ, sâu bệnh, thiếu nước) trừ thẳng vào `health`, sàn 0. Health = 0 thì vẫn tới lúc gặt nhưng năng suất 0.
- A6: Đổ ngã chỉ từ `flowering` trở đi, tối đa một lần mỗi vụ, cho cả mưa lớn và bão. Xác suất = `lodgingChanceBase × variety.lodgingSusceptibility × sowing.lodgingRisk`.
- B5: Lũ tung xác suất một lần lúc khởi tạo. Ngày lũ rút đều trong day 290–364 (15–30/11 đầu game không tính). Thửa bị lũ thì nước = 100, mức hao sức khỏe rút riêng cho từng thửa.

**Sâu bệnh**
- A4: Mật độ khi phát sinh hoặc lây sang thửa mới = `initialDensity` (pests.json, 0,02 cho cả 2 loại).
- B9: Các thửa xếp một hàng 0–4, thửa kề là thửa ±1. Khi lây, mật độ thửa bị lây = max(mật độ hiện tại, `initialDensity`). Phun phòng chỉ giảm tốc độ phát triển. Đang có cảnh báo vùng cho một loại thì không sinh thêm cảnh báo cho loại đó.
- B10: Thăm đồng cập nhật `known` lúc bắt đầu buổi ra đồng. Chỉnh nước hoặc phun thuốc thì cập nhật `known` của thửa đó.
- A5: Mức sức khỏe ước lượng theo `crop.healthBands`: Tốt ≥ 0,8 · Khá ≥ 0,6 · Yếu ≥ 0,4 · Kém. Nước mô tả theo `min`/`max`: Thiếu / Vừa / Ngập.
- Nước: khoảng tối ưu nới thành [30, 80] (đo bằng mô phỏng: [40, 70] làm lúa thiếu/ngập 40–65% số ngày kể cả khi thăm đồng 3 ngày/lần).

**Thu hoạch và bán**
- B11: Gặt tay tốn `handEnergyPerPlot` cho mỗi thửa, xong trong một thao tác. Mỗi thửa gặt ra một lô. Hết `maxWaitDays` đêm chưa bán thì lô tự bán theo giá thương lái. Lượng lúa đã cam kết bán non trừ ngay lúc gặt.
- B4: Biến động giá mỗi ngày rút đều trong ±`dailyVolatility`, kẹp trong ±`maxDeviation`.

**Tài chính**
- A1: Chi bắt buộc được làm tiền mặt âm. Phần âm là khoản "nợ sinh hoạt" quá hạn từ ngày bị âm, đi vào vòng xoáy nợ.
- B14: Mọi nghĩa vụ trả tiền (tiền thuê, nợ họ hàng, mua chịu, vay nóng, nợ sinh hoạt) biểu diễn là `Loan` có `kind`, trả bằng action `repay`.
- A7 Vay nóng: mỗi lần vay là một khoản riêng. Đến hạn trả gốc + `interestPer30Days`; trả sớm vẫn tính đủ lãi. Đảo nợ = trả phần lãi để được thêm `termDays`. Quá hạn thì cứ mỗi 30 ngày số dư ×(1 + lãi), cộng phạt `latePenaltyRate` một lần lúc bắt đầu quá hạn. `maxTotal` tính trên gốc còn nợ.
- A8 Mua chịu: chỉ vật tư (giống, phân, thuốc); làm đất, công cấy, chỉnh nước, thuê máy trả tiền mặt. Mỗi lần bán lúa trừ toàn bộ dư nợ mua chịu; phần thiếu trừ vào tiền mặt, vẫn thiếu thì quá hạn. Chưa từng bán thì tới hạn ở day 364.
- A9: Chỉ vay nóng bị phạt lãi khi trễ. Mỗi khoản bị `uyTin.latePenalty` một lần lúc bắt đầu quá hạn.
- B12: Bán lúa non được khi lúa còn ngoài đồng chưa gặt (`growing` hoặc `harvestable`), vì người chơi không phân biệt được hai trạng thái này nếu chưa thăm (chốt 26/09/2026, M2.0). Áp dụng cho cả ép bán non khi siết nợ và cho điều kiện phá sản A11. Mỗi thửa tối đa một hợp đồng bán lúa non. Giá chốt = giá thị trường × hệ số giống × `priceFactor`. Tiền bù thiếu kg trừ vào tiền mặt (theo A1 nếu âm).
- B13: Uy tín là số thực, hiển thị làm tròn. Trần uy tín từ làm thuê tính theo vụ của tháng hiện tại (`seasonBySowingMonth`). Có việc làm thuê hay không tung một lần cho cả ngày, báo trên bản tin. Trả xong trọn một khoản đúng hạn +`onTimePayment`; đảo nợ thì không cộng không trừ. Chỉ xin gia hạn tiền thuê trước khi kỳ đó quá hạn.
- B16: Tiền làm tròn bằng `Math.round`, chỉ ở chỗ tiền đổi chủ. Vòng lặp theo thứ tự cố định: thửa theo id, sâu bệnh theo thứ tự trong data.

**Vòng xoáy nợ và kết thúc**
- A10: Hạn chót = ngày vào bậc 2 + `finalDeadlineDays`. Bậc 3 chạy mỗi đêm khi còn khoản quá hạn chót: bán lô lúa với giá thương lái × `forcedPriceFactor`, ép bán lúa non các thửa đang trồng ở `maxRatioOfExpected`; tiền thu được trả các khoản quá hạn. Mất ruộng thì mất lúa đang trồng; thuê lại bằng action `reRent`. Bậc 0–3 tính lại mỗi đêm; bậc 4 giữ đến khi thuê lại.
- Tổng nợ (dùng cho `refuseIfTotalDebtOver` của vay nóng và điều kiện phá sản) chỉ tính khoản đã đến hạn hoặc quá hạn, cộng vay nóng, mua chịu và nợ sinh hoạt (các khoản này tính ngay từ lúc phát sinh). Tiền thuê và nợ họ hàng chưa đến hạn không tính.
- A11: Phá sản xét "nguồn vay chấp nhận" chỉ gồm nguồn ra tiền mặt: vay nóng, và bán lúa non khi còn thửa đang trồng chưa ký hợp đồng. Tổng tài sản = tiền mặt + lô chưa bán theo giá thương lái.
- A12: Tài sản ròng = tiền mặt + lô chưa bán (giá thương lái) − mọi khoản nợ còn lại (kể cả lãi đã phát sinh và tiền thuê chưa trả). Lúa ngoài đồng tính 0.
- A14: Một vụ (để tính sổ) = các thửa có tháng xuống giống cùng thuộc một vụ. Chi phí gắn thửa tính theo thửa; sinh hoạt phí và lãi tính theo khoảng ngày từ lần xuống giống đầu đến lần bán cuối của vụ (có thể đếm trùng khi hai vụ chồng nhau, màn tính sổ ghi rõ).
- B17: GDD mục 11 (prototype 1 thửa, 3 nguồn vay) bị thay bằng spec này.
- B18: Ngưỡng cụ thể trong chính sách bot đặt ở M1.15 và ghi vào nhật ký.
- C1 (26/09/2026, người dùng chọn): Gộp 5 thửa thành **một ruộng 5 công**. Mọi số tiền và năng suất tính theo diện tích nhân 5 (làm đất, giống, công cấy, phân, thuốc, chỉnh nước, máy gặt, `baseYieldKg`); **sức lực mỗi thao tác giữ nguyên** như làm một thửa cũ. Xác suất phát sinh sâu bệnh mỗi đêm **giữ nguyên** (0,004 / 0,003) cho cả ruộng, nên ít ổ dịch hơn nhưng mỗi ổ ăn cả ruộng. Hệ quả: tiền đầu game (3 tr) không đủ xuống giống bằng tiền mặt (ít nhất 3,875 tr), vụ đầu phải mua chịu phần giống. Các quyết định nói "từng thửa" (B9, B11, B12, A10, A11, A14) áp dụng cho ruộng như một thửa. Kết quả mô phỏng: `docs/BALANCE_LOG.md` lần 4.
