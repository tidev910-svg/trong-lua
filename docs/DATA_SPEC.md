# DATA_SPEC – Dữ liệu cân bằng ban đầu

Tất cả là **giá trị tạm** để bắt đầu; sẽ hiệu chỉnh bằng bộ mô phỏng. Tiền tính bằng VNĐ (số nguyên). Tháng dùng khóa chuỗi `"1"`–`"12"`. Mỗi file dưới đây tạo thành `data/<tên>.json`, kèm khuôn Zod trong `data/schemas.ts`.

Tổng các xác suất trong một phân phối phải bằng 1 (khuôn Zod kiểm tra với sai số 1e-6).

## economy.json

```json
{
  "plotCount": 5,
  "plotAreaM2": 1000,
  "startCash": 3000000,
  "familyLoan": { "amount": 5000000, "dueDay": 364, "latePenaltyUyTin": 20 },
  "rentPerYear": 10000000,
  "rentInstallments": [
    { "day": 0, "amount": 5000000 },
    { "day": 150, "amount": 5000000 }
  ],
  "livingCostPerDay": 40000,
  "startUyTin": 50,
  "energy": { "max": 100, "nightRestore": 60, "restHalfDay": 25, "fieldVisit": 5 },
  "hiredWork": {
    "wageHalfDay": 150000,
    "energyCost": 35,
    "uyTinGain": 0.5,
    "uyTinGainCapPerSeason": 8,
    "availabilityByMonth": {
      "1": 0.45, "2": 0.75, "3": 0.75, "4": 0.5, "5": 0.45, "6": 0.45,
      "7": 0.7, "8": 0.7, "9": 0.5, "10": 0.45, "11": 0.6, "12": 0.45
    }
  }
}
```

Kỳ thuê 1 (day 0) được trả ngay bằng khoản vay họ hàng khi khởi tạo.

## calendar.json

```json
{
  "startMonth": 11,
  "startDayOfMonth": 15,
  "daysInYear": 365,
  "tetDay": 80,
  "tetExtraCost": 3500000,
  "seasonBySowingMonth": {
    "11": "DX", "12": "DX", "1": "DX",
    "2": "HT", "3": "HT", "4": "HT", "5": "HT",
    "6": "TD", "7": "TD", "8": "TD", "9": "TD", "10": "TD"
  }
}
```

Dùng lịch dương không có năm nhuận để suy ra tháng từ `day`.

## varieties.json

```json
[
  {
    "id": "variety_a",
    "name": "Giống A – cực ngắn ngày",
    "note": "Giá trị tạm; thay bằng giống thật sau khi kiểm chứng",
    "baseDurationDays": 90,
    "seedCostPerPlot": 250000,
    "baseYieldKg": { "DX": 800, "HT": 680, "TD": 620 },
    "priceMultiplier": 0.92,
    "pestSusceptibility": { "brown_planthopper": 1.0, "rice_blast": 0.8 },
    "lodgingSusceptibility": 0.9
  },
  {
    "id": "variety_b",
    "name": "Giống B – ngắn ngày chất lượng cao",
    "note": "Giá trị tạm; thay bằng giống thật sau khi kiểm chứng",
    "baseDurationDays": 102,
    "seedCostPerPlot": 350000,
    "baseYieldKg": { "DX": 780, "HT": 640, "TD": 580 },
    "priceMultiplier": 1.15,
    "pestSusceptibility": { "brown_planthopper": 1.1, "rice_blast": 1.3 },
    "lodgingSusceptibility": 1.2
  }
]
```

## crop.json

```json
{
  "germinationDays": 7,
  "stageDays": { "panicle": 25, "flowering": 7, "ripening": 28 },
  "harvestWindowDays": 7,
  "overdueLossPerDay": 0.03,
  "growthRateByMonth": {
    "1": 0.9, "2": 0.92, "3": 1.0, "4": 1.05, "5": 1.05, "6": 1.05,
    "7": 1.05, "8": 1.05, "9": 1.0, "10": 1.0, "11": 0.95, "12": 0.9
  },
  "lowHealthCare": { "threshold": 0.5, "growthFactor": 0.8 },
  "healthBands": [
    { "min": 0.8, "label": "Tốt" },
    { "min": 0.6, "label": "Khá" },
    { "min": 0.4, "label": "Yếu" },
    { "min": 0, "label": "Kém" }
  ],
  "water": {
    "start": 55, "min": 30, "max": 80,
    "adjustTarget": 55, "adjustCost": 50000, "adjustEnergy": 10,
    "deltaByWeather": { "sunny": -5, "cloudy": -2, "rain": 4, "heavy_rain": 9, "storm": 15 },
    "stressHealthPerDay": 0.01,
    "stressGrowthFactor": 0.7
  },
  "landPrep": { "costPerPlot": 400000, "energy": 15 },
  "sowing": {
    "broadcast":  { "seedMultiplier": 1.5, "laborCost": 0,      "energy": 15, "yieldFactor": 1.0,  "lodgingRisk": 1.0 },
    "transplant": { "seedMultiplier": 1.0, "laborCost": 400000, "energy": 10, "yieldFactor": 1.05, "lodgingRisk": 0.5 }
  },
  "fertilizer": {
    "costPerApp": 350000,
    "energy": 15,
    "recommendedStages": ["tillering", "panicle"],
    "nutrientFactorByCorrectApps": { "0": 0.7, "1": 0.85, "2": 1.0 },
    "offStageEfficiency": 0.3
  },
  "spray": { "costPerApp": 300000, "energy": 20 },
  "harvest": {
    "machineCostPerPlot": 300000,
    "handEnergyPerPlot": 45,
    "freshRiceLossPerDay": 0.02,
    "maxWaitDays": 3
  },
  "storm": {
    "floweringLossChance": 0.5,
    "floweringHealthLoss": 0.3,
    "lodgingChanceBase": 0.1,
    "lodgingHealthLoss": 0.15
  },
  "flood": {
    "yearChance": 0.35,
    "windowStartMonth": 9,
    "windowEndMonth": 11,
    "warningDaysRange": [3, 6],
    "warningDayError": [-2, 2],
    "healthLossRange": [0.4, 0.8]
  }
}
```

`healthBands`: mức sức khỏe ước lượng người chơi thấy khi thăm đồng, xếp giảm dần theo `min`, mức cuối có `min` = 0. Khoảng nước tối ưu [30, 80] (chốt 26/09/2026; ban đầu [40, 70] làm lúa thiếu/ngập 40–65% số ngày dù thăm đồng thường xuyên). `deltaByWeather` × 0,6 và hạn mức mua chịu 8 → 12 tr theo BALANCE_LOG lần 1.

`offStageEfficiency`: một lần bón sai giai đoạn được tính như 0.3 lần bón đúng khi tra `nutrientFactorByCorrectApps` (nội suy tuyến tính, tối đa 2).

## pests.json

```json
[
  {
    "id": "brown_planthopper",
    "name": "Rầy nâu",
    "spawnChance": 0.004,
    "initialDensity": 0.02,
    "growthRate": 0.12,
    "weatherFactor": { "sunny": 1.2, "cloudy": 1.0, "rain": 0.8, "heavy_rain": 0.7, "storm": 0.6 },
    "stageFactor": { "germination": 0.5, "tillering": 1.0, "panicle": 1.2, "flowering": 1.2, "ripening": 1.0 },
    "visibleThreshold": 0.15,
    "damageThreshold": 0.3,
    "damagePerDay": 0.06,
    "spreadThreshold": 0.4,
    "spreadChance": 0.2,
    "sprayEffectiveness": 0.85,
    "preventiveDays": 7,
    "preventiveFactor": 0.3,
    "regionalAlert": {
      "chancePerDayByMonth": {
        "1": 0.01, "2": 0.01, "3": 0.015, "4": 0.015, "5": 0.01, "6": 0.01,
        "7": 0.015, "8": 0.015, "9": 0.01, "10": 0.01, "11": 0.01, "12": 0.01
      },
      "durationDays": 14,
      "spawnMultiplier": 3
    },
    "signs": {
      "light": "Gốc lúa lác đác rầy nhỏ màu nâu",
      "medium": "Gốc lúa có nhiều rầy, bẹ lá hơi vàng",
      "heavy": "Lúa khô cháy từng chòm, rầy bám dày ở gốc"
    },
    "signLevels": { "medium": 0.35, "heavy": 0.6 }
  },
  {
    "id": "rice_blast",
    "name": "Đạo ôn",
    "spawnChance": 0.003,
    "initialDensity": 0.02,
    "growthRate": 0.10,
    "weatherFactor": { "sunny": 0.7, "cloudy": 1.1, "rain": 1.4, "heavy_rain": 1.5, "storm": 1.2 },
    "stageFactor": { "germination": 0.6, "tillering": 1.2, "panicle": 0.8, "flowering": 1.5, "ripening": 0.5 },
    "visibleThreshold": 0.12,
    "damageThreshold": 0.25,
    "damagePerDay": 0.07,
    "spreadThreshold": 0.35,
    "spreadChance": 0.25,
    "sprayEffectiveness": 0.8,
    "preventiveDays": 7,
    "preventiveFactor": 0.3,
    "regionalAlert": {
      "chancePerDayByMonth": {
        "1": 0.008, "2": 0.005, "3": 0.005, "4": 0.008, "5": 0.012, "6": 0.015,
        "7": 0.015, "8": 0.015, "9": 0.015, "10": 0.012, "11": 0.012, "12": 0.01
      },
      "durationDays": 14,
      "spawnMultiplier": 3
    },
    "signs": {
      "light": "Lá có vài vết hình thoi màu nâu xám",
      "medium": "Nhiều vết hình thoi, lá bắt đầu cháy",
      "heavy": "Cổ bông thâm đen, bông lúa lép trắng"
    },
    "signLevels": { "medium": 0.3, "heavy": 0.55 }
  }
]
```

`initialDensity`: mật độ khi sâu bệnh phát sinh hoặc lây sang thửa mới (chốt 26/09/2026). `spawnChance` giảm một nửa (0,008/0,006 → 0,004/0,003) theo BALANCE_LOG lần 1.

Dấu hiệu sâu bệnh là giá trị tạm; cần kiểm chứng với tài liệu khuyến nông trước khi dùng cho bản demo.

## weather.json

```json
{
  "states": ["sunny", "cloudy", "rain", "heavy_rain", "storm"],
  "persistence": 0.5,
  "distributionByMonth": {
    "1":  { "sunny": 0.65, "cloudy": 0.27, "rain": 0.07, "heavy_rain": 0.01, "storm": 0 },
    "2":  { "sunny": 0.70, "cloudy": 0.25, "rain": 0.05, "heavy_rain": 0,    "storm": 0 },
    "3":  { "sunny": 0.70, "cloudy": 0.24, "rain": 0.06, "heavy_rain": 0,    "storm": 0 },
    "4":  { "sunny": 0.60, "cloudy": 0.25, "rain": 0.13, "heavy_rain": 0.02, "storm": 0 },
    "5":  { "sunny": 0.35, "cloudy": 0.30, "rain": 0.28, "heavy_rain": 0.07, "storm": 0 },
    "6":  { "sunny": 0.25, "cloudy": 0.30, "rain": 0.33, "heavy_rain": 0.11, "storm": 0.01 },
    "7":  { "sunny": 0.25, "cloudy": 0.30, "rain": 0.32, "heavy_rain": 0.12, "storm": 0.01 },
    "8":  { "sunny": 0.22, "cloudy": 0.30, "rain": 0.33, "heavy_rain": 0.13, "storm": 0.02 },
    "9":  { "sunny": 0.20, "cloudy": 0.28, "rain": 0.34, "heavy_rain": 0.14, "storm": 0.04 },
    "10": { "sunny": 0.22, "cloudy": 0.28, "rain": 0.32, "heavy_rain": 0.13, "storm": 0.05 },
    "11": { "sunny": 0.35, "cloudy": 0.30, "rain": 0.25, "heavy_rain": 0.07, "storm": 0.03 },
    "12": { "sunny": 0.55, "cloudy": 0.30, "rain": 0.12, "heavy_rain": 0.03, "storm": 0 }
  },
  "forecastAccuracy": { "today": 0.85, "plus1": 0.7, "plus2": 0.55 },
  "neighbors": {
    "sunny": ["cloudy"],
    "cloudy": ["sunny", "rain"],
    "rain": ["cloudy", "heavy_rain"],
    "heavy_rain": ["rain", "storm"],
    "storm": ["heavy_rain"]
  }
}
```

Dự báo sai ⇒ chọn ngẫu nhiên một trạng thái trong `neighbors` của trạng thái thật.

## market.json

```json
{
  "basePriceByMonth": {
    "1": 7400, "2": 7800, "3": 7800, "4": 7600, "5": 7200, "6": 6900,
    "7": 6800, "8": 6800, "9": 7000, "10": 7000, "11": 7100, "12": 7300
  },
  "dailyVolatility": 0.01,
  "maxDeviation": 0.12,
  "harvestGlut": {
    "windows": [
      { "startDay": 110, "endDay": 145 },
      { "startDay": 235, "endDay": 275 },
      { "startDay": 340, "endDay": 364 }
    ],
    "priceMultiplier": 0.9
  },
  "trader": { "base": 0.92, "uyTinBonus": 0.08 }
}
```

Giá thị trường hôm nay = `basePriceByMonth[tháng] × (1 + deviation)`, `deviation` đi ngẫu nhiên ±`dailyVolatility` mỗi ngày, kẹp trong ±`maxDeviation`; nhân `harvestGlut.priceMultiplier` nếu nằm trong cửa sổ; nhân `priceMultiplier` của giống khi bán.

## finance.json

```json
{
  "storeCredit": { "markup": 0.15, "minUyTin": 30, "limit": 12000000 },
  "loanShark": {
    "maxTotal": 10000000,
    "interestPer30Days": 0.10,
    "termDays": 30,
    "minUyTin": 10,
    "refuseIfTotalDebtOver": 15000000,
    "latePenaltyRate": 0.05
  },
  "advanceSale": {
    "priceFactor": 0.7,
    "expectedYieldFactor": 0.9,
    "maxRatioOfExpected": 0.6,
    "shortfallPenalty": 1.1,
    "forcedPriceFactor": 0.5
  },
  "rentExtension": { "days": 30, "uyTinCost": 15, "nextYearRentIncrease": 0.1, "maxPerYear": 1 },
  "uyTin": { "onTimePayment": 3, "latePenalty": -10, "min": 0, "max": 100 },
  "debtSpiral": { "lateDaysToWarning": 7, "finalDeadlineDays": 14, "reRentSurcharge": 0.2 }
}
```

"Sản lượng kỳ vọng" cho bán lúa non = `baseYield[giống][vụ] × yieldFactor(sạ/cấy) × expectedYieldFactor` (thương lái không tính theo sức khỏe thật vì không biết).

## Bot (chính sách cho bộ mô phỏng)

Bot chỉ dùng `getPlayerView`. Chính sách ban đầu (được phép tinh chỉnh, ghi lại thay đổi):

| | safe | average | risky |
|---|---|---|---|
| Giống | A | A vụ ĐX, B vụ HT | B |
| Số vụ | 2 (bỏ Thu Đông) | 2, thêm Thu Đông nếu tiền mặt > 5 tr | 3 |
| Sạ/cấy | Sạ | Sạ | Sạ |
| Thăm đồng | 3 ngày/lần + khi có cảnh báo | 5 ngày/lần + khi có cảnh báo | 5 ngày/lần (ban đầu 7) |
| Phun | Trị khi dấu hiệu ≥ vừa; phun phòng khi có cảnh báo | Trị khi dấu hiệu ≥ vừa | Trị khi dấu hiệu ≥ vừa (ban đầu: nặng) |
| Bón phân | Đúng 2 giai đoạn | Đúng 2 giai đoạn | Đúng 2 giai đoạn |
| Nước | Chỉnh khi lệch khỏi khoảng tối ưu | Chỉnh khi lệch | Chỉnh khi lệch (ban đầu: lệch nặng) |
| Vốn | Mua chịu, không vay nóng | Mua chịu; vay nóng khi tiền mặt sắp âm | Vay nóng thoải mái; bán lúa non 50% mỗi vụ |
| Gặt | Thuê máy | Thuê máy | Gặt tay |
| Bán | Bán ngay | Chờ tối đa 1 ngày nếu giá dưới trung bình tháng | Chờ tối đa 2 ngày |
| Ngày rảnh | Làm thuê | Làm thuê | Làm thuê |
| Tua | Tua với điều kiện dừng mặc định | Như safe | Như safe |

Đổi 26/09/2026 (BALANCE_LOG lần 1): `risky` giữ phần liều về tài chính (vay nóng thoải mái, bán non 50%, giống B, 3 vụ, gặt tay) nhưng chăm ruộng như `average`; với cách trồng ban đầu nó luôn thua vì sâu bệnh nên không đo được rủi ro tài chính.
