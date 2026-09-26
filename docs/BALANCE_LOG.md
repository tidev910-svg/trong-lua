# BALANCE_LOG – Nhật ký cân bằng

## Lần 1 – 26/09/2026 (M1.16)

**Dữ liệu:** `data/*.json` như hiện tại (DATA_SPEC + các quyết định ngày 26/09: nước tối ưu [30, 80], `initialDensity` 0,02, `expectedYieldFactor` 0,9). **Chưa sửa số nào sau lần chạy này.**

**Cách chạy:** `npm run sim -- --bot all --runs 1000` (seed 1–1000). Bot chỉ đọc `getPlayerView`, theo bảng chính sách DATA_SPEC; các ngưỡng tự đặt ghi ở PROGRESS.md (M1.15). Kết quả thô: `sim/output/runs.csv`, `cash_by_day.csv`, `report.json`.

### 1. Kết quả so với mục tiêu (ARCHITECTURE.md)

| | safe | average | risky |
|---|---|---|---|
| **Sống sót hết năm** | **8%** | **5%** | **0%** |
| Mục tiêu | 80–90% | 60–70% | phương sai lớn, trung vị ≈ average |
| Tài sản ròng p10 / p50 / p90 | −28,2 / −25,0 / +1,2 tr | −23,6 / −19,9 / −12,2 tr | −21,2 / −18,6 / −17,4 tr |
| Độ lệch chuẩn tài sản ròng | 12,0 tr | 5,8 tr | 1,7 tr |
| Phá sản / mất ruộng cuối năm | 897 / 23 | 955 / 0 | 1000 / 0 |
| Ngày phá sản (trung vị) | 142 | 152 | 137 |
| Số vụ tính sổ (TB) | 0,77 | 0,88 | 0,03 |
| Bậc nợ cao nhất = 5 | 90% | 96% | 100% |

**Kết luận: chưa đạt.** Gần như mọi lượt chơi phá sản quanh day 137–152 (đầu tháng 4), tức ngay sau vụ Đông Xuân đầu tiên và trước/đúng kỳ tiền thuê thứ hai (day 150). Bot `risky` không có "phương sai lớn": nó thua chắc chắn.

### 2. Nguyên nhân chính

Tôi tách nguyên nhân bằng cách tắt từng yếu tố trên bản sao data trong bộ nhớ (200 seed mỗi cấu hình, file data không đổi):

| Thí nghiệm | safe | average | risky |
|---|---|---|---|
| Hiện tại | 5% | 1% | 0% |
| Không có sâu bệnh | 96% | 100% | 97% |
| Nước không biến động | 86% | 99% | 1% |
| Không sâu bệnh, không biến động nước | 100% | 100% | 100% |
| Phát sinh sâu bệnh × 0,5 | 22% | 37% | 2% |
| Tốc độ phát triển sâu bệnh × 0,7 | 21% | 35% | 0% |
| Hạn mức mua chịu 12 tr (một mình) | 10% | 3% | 0% |

1. **Sâu bệnh quá dày.** Mỗi lượt phun 23–37 lần (7–11 tr/năm). Với `spawnChance` 0,008/ngày, lây lan và cảnh báo vùng ×3, gần như thửa nào mỗi vụ cũng dính cả rầy lẫn đạo ôn. Rầy nâu mùa khô tăng ~15–17%/ngày nên sau khi phun trị (−85%) chỉ khoảng 12 ngày là quay lại mức "vừa". Chi phí phun ~1,5–2 tr/công/vụ, trong khi GDD tính **toàn bộ** chi phí một công chỉ ~2,5 tr. Hết tiền mua thuốc thì rầy phá chết lúa (nhiều thửa về sức khỏe 0 ngay trước khi gặt).
2. **Chỉnh nước quá thường xuyên và tốn.** Kể cả với khoảng [30, 80], bot chỉnh 60–95 lần/năm (3–4,7 tr) và vẫn mất sức khỏe do thiếu nước những ngày giữa hai lần thăm. Nước ảnh hưởng cả chi phí lẫn năng suất.
3. **Khoảng hụt tiền mặt trước vụ gặt đầu.** Trước lần gặt đầu (~day 101–114), người chơi phải chi ~25–27 tr (làm đất, vật tư, phun, nước, sinh hoạt 4 tr, Tết 3,5 tr ở day 80) trong khi chỉ có 3 tr + 8 tr hạn mức mua chịu + tiền làm thuê. Bot `safe` (không vay nóng) hết tiền quanh day 55–80, rơi vào nợ sinh hoạt → siết nợ ép bán non cả 5 thửa ở giá 0,5 ngay trước khi gặt. Yếu tố này một mình không giết người chơi (hạn mức 12 tr một mình chỉ +5%), nhưng quyết định **thứ tự** giữa `safe` và `average`: không có nó, `safe` sống sót kém hơn `average`, ngược với mục tiêu.
4. **`risky` thua vì cách trồng, không phải vì liều tài chính.** Bảng DATA_SPEC cho `risky` thăm đồng 7 ngày/lần và chỉ phun khi dấu hiệu "nặng" (mật độ ≥ 0,6, đã qua ngưỡng gây hại 0,3 từ lâu). Tắt sâu bệnh thì `risky` sống 97%. Bản thử `riskyCare` (giữ nguyên vay nóng, bán non 50%, giống B, 3 vụ nhưng thăm 5 ngày/lần và phun khi "vừa") sống 27% với các đề xuất bên dưới: tài chính liều vẫn bị phạt nặng (vay nóng 10%/30 ngày, bán non 50% ở giá 0,7).

### 3. Đề xuất (tối đa 3 thay đổi số liệu, **chưa áp dụng**)

| # | Thay đổi | Lý do |
|---|---|---|
| 1 | `pests.json` › `spawnChance`: rầy nâu 0,008 → **0,004**, đạo ôn 0,006 → **0,003** | Sâu bệnh vẫn là mối đe dọa chính và vẫn cần thăm đồng để phát hiện, nhưng bớt còn khoảng một nửa số ổ dịch, đưa chi phí phun về gần mức GDD. Giữ nguyên tốc độ phát triển để giữ cảm giác "phát hiện muộn là mất". |
| 2 | `crop.json` › `water.deltaByWeather` × 0,6: nắng −8 → **−5**, âm u −4 → **−2**, mưa 6 → **4**, mưa lớn 15 → **9**, bão 25 → **15** | Giảm số lần phải chỉnh nước và số ngày thiếu/ngập giữa hai lần thăm; mưa bão vẫn đẩy nước lên rõ. |
| 3 | `finance.json` › `storeCredit.limit`: 8.000.000 → **12.000.000** | Lấp khoảng hụt tiền trước vụ gặt đầu (Tết + sinh hoạt phí) cho người chơi không vay nóng. Đây là đòn bẩy đưa `safe` lên trên `average`. |

**Kết quả mô phỏng khi áp dụng cả 3 (1.000 seed mỗi bot):**

| | safe | average | risky | riskyCare* |
|---|---|---|---|---|
| Sống sót | **84%** | **72%** | 2% | 27% |
| Tài sản ròng p50 | 25,7 tr | 9,4 tr | −17,6 tr | −14,0 tr |
| Tài sản ròng p90 | 34,8 tr | 29,8 tr | −13,3 tr | 9,3 tr |
| Vụ tính sổ (TB) | 1,83 | 2,42 | 0,52 | 1,46 |

\* `riskyCare` là bản thử chính sách bot, chưa thay bot `risky` chính thức.

Với 3 thay đổi này, `safe` đạt mục tiêu (84%), `average` hơi cao so với mục tiêu (72% so với 60–70%). `risky` vẫn chưa đạt "phương sai lớn".

Tổ hợp phương án đã thử (200 seed, safe/average/risky):
- Chỉ đề xuất 1 + 2: 64% / 75% / 4%
- Tốc độ sâu bệnh × 0,7 + nước × 0,6: 59% / 84% / 0%
- 1 + 2 + tốc độ sâu bệnh × 0,7: 85% / 98% / 13% (quá dễ với `average`)
- 1 + 2 + tiền đầu game 5 tr: 82% / 82% / 5%
- 1 + 2 + sinh hoạt phí 30.000/ngày: 74% / 83% / 5%
- 1 + 2 + chi phí chỉnh nước 20.000: 77% / 85% / 5%

### 4. Việc cần quyết tiếp

- **Chính sách bot `risky`:** giữ đúng bảng DATA_SPEC (thua chắc chắn, không đo được "phương sai lớn") hay đổi sang kiểu `riskyCare` (liều về tiền, chăm ruộng như `average`)? Đây là chính sách bot, không phải số trong data.
- Nếu muốn `risky` có cửa thắng thật, cần xem lại độ nặng của vay nóng (10%/30 ngày cộng dồn) hoặc bán lúa non (giá 0,7, phạt thiếu 1,1). Chưa đề xuất số vì đã dùng hết 3 thay đổi.

### 5. Lưu ý khi đọc số

- Bot là người chơi "máy móc", không linh hoạt như người thật: ví dụ bot luôn chỉnh nước khi lệch và luôn phun khi đạt ngưỡng dù đang cạn tiền.
- `cash_by_day.csv` ghi tiền mặt ở các thời điểm bot ra quyết định; những ngày bị tua lấy giá trị gần nhất trước đó.
- Tài sản ròng tính theo quyết định A12 (lúa ngoài đồng = 0), nên lượt nào dở dang vụ cuối năm sẽ bị thấp hơn thực tế một chút.

## Lần 2 – 26/09/2026 (áp dụng đề xuất lần 1)

**Thay đổi đã áp dụng (người dùng chọn):**
- `pests.json` › `spawnChance`: 0,008 → 0,004 (rầy nâu), 0,006 → 0,003 (đạo ôn)
- `crop.json` › `water.deltaByWeather`: nắng −5, âm u −2, mưa 4, mưa lớn 9, bão 15
- `finance.json` › `storeCredit.limit`: 12.000.000
- Bot `risky`: giữ phần liều tài chính, nhưng chăm ruộng như `average` (thăm 5 ngày/lần, phun khi "vừa", chỉnh nước khi lệch).

**Kết quả `npm run sim -- --bot all --runs 1000` (seed 1–1000):**

| | safe | average | risky |
|---|---|---|---|
| **Sống sót hết năm** | **84%** | **72%** | **27%** |
| Mục tiêu | 80–90% ✅ | 60–70% (cao hơn 2 điểm) | phương sai lớn, trung vị ≈ average |
| Tài sản ròng p10 / p50 / p90 | −11,4 / 25,7 / 34,8 tr | −19,8 / 9,4 / 29,8 tr | −19,1 / −14,0 / 9,3 tr |
| Độ lệch chuẩn | 16,8 tr | 17,7 tr | 11,5 tr |
| Phá sản / mất ruộng cuối năm | 154 / 7 | 276 / 0 | 727 / 0 |
| Ngày phá sản (trung vị) | 180 | 218 | 150 |
| Vụ tính sổ (TB) | 1,83 | 2,42 | 1,46 |
| Bậc nợ cao nhất = 5 | 15% | 28% | 73% |

Kết quả khớp đúng từng số với thí nghiệm ở lần 1 (xác nhận tất định).

**Nhận xét:**
- `safe` đạt mục tiêu; `average` cao hơn khoảng mục tiêu 2 điểm, chấp nhận được cho vòng playtest đầu.
- `risky`: trung vị thấp hơn `average` nhiều (−14 tr so với +9,4 tr) và độ lệch chuẩn không lớn hơn (11,5 tr so với 17,7 tr): liều chưa "đáng", tức là chưa đạt "phương sai lớn". Nguyên nhân khả dĩ: vay nóng 10%/30 ngày (và lãi chồng lãi khi trễ) cộng bán non 50% ở giá 0,7 ăn gần hết lời của vụ thứ ba. Chưa đề xuất số: nên chờ playtest xem người chơi thật có dùng vay nóng/bán non không.
- Replay mẫu trong `tests/replays/` đã tạo lại theo luật mới: safe seed 13 (sống, 2 vụ), average seed 5 (phá sản day 202), risky seed 1 (sống, 3 vụ).

## Lần 3 – 26/09/2026 (M2.0: bot dùng `getActionOptions`, bán non đến khi gặt)

**Không đổi số nào trong `data/`.** Hai thay đổi có thể ảnh hưởng kết quả:
- Bot lấy chi phí, lý do khóa và phương án mua chịu từ `getActionOptions`, thay cho việc tự tính (trước đây bot ước hạn mức mua chịu với phụ phí viết cứng 20%, thật ra là 15%).
- Luật: bán lúa non được đến khi gặt (cả khi lúa đã chín mà chưa gặt), áp dụng cả cho siết nợ và điều kiện phá sản (PROTOTYPE_SPEC §14, B12).

**Kết quả `npm run sim -- --bot all --runs 1000` (seed 1–1000), so với lần 2:**

| | safe | average | risky |
|---|---|---|---|
| **Sống sót hết năm** | **85%** (84%) | **73%** (72%) | **27%** (27%) |
| Tài sản ròng p10 / p50 / p90 | −11,3 / 25,7 / 34,8 tr | −19,6 / 9,5 / 29,8 tr | −19,1 / −14,0 / 9,3 tr |
| Độ lệch chuẩn | 16,8 tr | 17,6 tr | 11,5 tr |
| Phá sản / mất ruộng cuối năm | 151 / 0 (154 / 7) | 268 / 0 (276 / 0) | 727 / 0 (727 / 0) |
| Vụ tính sổ (TB) | 1,84 | 2,50 | 1,46 |
| Hành động bị từ chối / lượt | 0,0 | 0,0 | 0,0 |

**Nhận xét:** thay đổi rất nhỏ (±1 điểm), nhận định của lần 2 giữ nguyên: `safe` đạt mục tiêu, `average` cao hơn khoảng mục tiêu 3 điểm, `risky` chưa đạt "phương sai lớn". Bộ mô phỏng chạy chậm hơn khoảng 1,7 lần vì `getPlayerView` giờ tính sẵn toàn bộ lựa chọn (1.000 lượt `average` ≈ 4 phút trên máy hiện tại). Ba replay mẫu có chuỗi hành động không đổi; chỉ số dòng log tăng do có event trình bày.

## Lần 4 – 26/09/2026 (quyết định C1: gộp 5 thửa thành một ruộng 5 công)

**Đổi số trong `data/` (người dùng chọn, PROTOTYPE_SPEC §14 C1):** `plotCount` 5 → 1, `plotAreaM2` 1.000 → 5.000; mọi số tiền và năng suất tính theo diện tích nhân 5 (làm đất 2 tr, giống 1,25 / 1,75 tr, công cấy 2 tr, phân 1,75 tr, thuốc 1,5 tr, chỉnh nước 250.000 đ, máy gặt 1,5 tr, `baseYieldKg` ×5). Sức lực mỗi thao tác giữ nguyên. Xác suất phát sinh sâu bệnh giữ nguyên cho cả ruộng.

**Chọn xác suất sâu bệnh (thử trước trên seed 1–300):**

| Phương án | safe | average | risky |
|---|---|---|---|
| 5 thửa (trước C1) | 85% | 73% | 30% |
| **(a) 1 ruộng, giữ 0,004 / 0,003 – đã chọn** | 87% | 84% | 54% |
| (c) 1 ruộng, nhân đôi 0,008 / 0,006 | 75% | 64% | 23% |
| (b) 1 ruộng, quy đổi 5 công 0,0198 / 0,0149 | 47% | 23% | 1% |

**Kết quả `npm run sim -- --bot all --runs 1000` (seed 1–1000), so với lần 3:**

| | safe | average | risky |
|---|---|---|---|
| **Sống sót hết năm** | **88%** (85%) | **84%** (73%) | **56%** (27%) |
| Tài sản ròng p10 / p50 / p90 | −23,7 / 32,4 / 44,8 tr | −20,4 / 23,9 / 45,4 tr | −28,2 / 4,8 / 37,0 tr |
| Độ lệch chuẩn | 21,5 tr | 22,4 tr | 24,7 tr |
| Phá sản / mất ruộng cuối năm | 124 / 0 | 161 / 0 | 435 / 0 |
| Vụ tính sổ (TB) | 1,84 | 2,66 | 2,20 |
| Bậc nợ cao nhất = 0 | 79% | 61% | 7% |

**Nhận xét:**
- Dễ hơn rõ rệt: ít lần xét phát sinh sâu bệnh hơn (1 thửa thay vì 5) và không còn lây lan giữa thửa. `safe` vẫn trong mục tiêu 80–90%; `average` cao hơn khoảng mục tiêu 60–70% 14 điểm.
- Phân tán lớn hơn (p10 thấp hơn, p90 cao hơn, độ lệch chuẩn tăng ~5 tr): một ruộng là "được ăn cả, ngã về không". `risky` giờ có phương sai lớn nhất và trung vị dương, gần với ý đồ "liều có thể đáng" hơn lần 3.
- Vụ đầu bắt buộc mua chịu giống (tiền đầu game 3 tr < 3,875 tr).
- Replay mẫu tạo lại: safe seed 13 (sống, 2 vụ, 26,2 tr), average seed 5 (sống, 3 vụ, 3,2 tr), risky seed 1 (sống, 3 vụ, 17,6 tr).
- Nếu playtest thấy quá dễ: thử phương án (c) (nhân đôi xác suất phát sinh), sim cho 75 / 64 / 23%.
