# Báo cáo Testcase BVA — Nutrition, Water, Health Logic

**Dự án:** FitLife (ELITE FIT)  
**Phương pháp:** Boundary Value Analysis (phân tích giá trị biên)  
**Phạm vi:** Module Người 3 — Nutrition, Water, Health Logic  
**Nguồn code:** `NutritionScreen.tsx`, `AddFoodModal.tsx`, `WaterTracker.tsx`, `waterService.ts`, `limitWarnings.ts`, `healthCalculations.ts`  
**Ngày:** 09/07/2026

---

## 1. Giới thiệu ngắn

**BVA** chọn giá trị tại biên hợp lệ / không hợp lệ để phát hiện lỗi validate và công thức sức khỏe.

| Ký hiệu | Ý nghĩa |
|---|---|
| min−1 | Ngay dưới biên dưới (invalid / vượt ngưỡng) |
| min | Biên dưới (valid / vừa đủ) |
| max | Biên trên (valid) |
| max+1 | Ngay trên biên trên (invalid / vượt ngưỡng) |

---

## 2. Ma trận tổng hợp

| Module | Số TC | Biên chính |
|---|---|---|
| Nutrition | 6 | Khẩu phần 0.5–2; calo vừa đủ / vượt; gợi ý khẩu phần khi còn ≥ 60 kcal |
| Water | 6 | +250 / +500; cắt phần dư về đúng goal; chặn khi đã đủ; `kg×35` |
| Health Logic | 6 | BMI đầu vào ≤ 0; calo sàn 1200; nước fallback 2000 / `1×35` |
| **Tổng** | **18** | Checklist manual (+ có thể đối chiếu `npm run test:formulas`) |

---

## 3. Nutrition — 6 testcase

### Biến & miền giá trị

| Biến | Quy tắc trong code | Biên |
|---|---|---|
| Khẩu phần (`quantity`) | Chỉ chọn trong `[0.5, 1, 1.5, 2]` | 0.5 (min), 2 (max) |
| Calo sau khi thêm | `current + round(foodCal × qty) <= goal` → cho thêm; `>` → chặn | vừa đủ / vượt 1 kcal |
| Calo còn lại gợi ý khẩu phần | `remaining < 60` → không gợi ý khẩu phần an toàn | 59 / 60 |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| NUT-01 | Khẩu phần min | Chọn món, khẩu phần **0.5x** (calo sau thêm ≤ mục tiêu) | Cho thêm món; calo = `round(food × 0.5)` | |
| NUT-02 | Khẩu phần max | Chọn món, khẩu phần **2x** (calo sau thêm ≤ mục tiêu) | Cho thêm món; calo = `round(food × 2)` | |
| NUT-03 | Calo vừa đủ mục tiêu | `current + added = goal` (đúng biên) | Accept — không vượt, nút thêm hoạt động | |
| NUT-04 | Calo vượt mục tiêu (max+1) | `current + added = goal + 1` (hoặc hơn) | Reject — cảnh báo vượt, **không** thêm món | |
| NUT-05 | Calo còn lại &lt; 60 | `goal − current = 59` | Không gợi ý khẩu phần an toàn (`suggestedQuantity = null`) | |
| NUT-06 | Calo còn lại ≥ 60 | `goal − current = 60` (hoặc hơn), món phù hợp | Có thể gợi ý khẩu phần trong `[0.5, 1, 1.5, 2]` không vượt mục tiêu | |

---

## 4. Water — 6 testcase

### Biến & miền giá trị

| Biến | Quy tắc trong code (`NutritionScreen.handleAddWater`) | Biên |
|---|---|---|
| Nút thêm nước | Chỉ **+250 ml** hoặc **+500 ml** | 250 (min bước), 500 (max bước UI) |
| Còn lại đến mục tiêu | `remaining = goal − current`; nếu `remaining ≤ 0` → chặn thêm | 0 / 1+ |
| Thêm vượt bước | Nếu `ml > remaining` → hỏi thêm đúng `remaining` (không cho vượt goal) | vừa đủ / cắt phần dư |
| Đặt về mục tiêu | `setWaterMl(goal)` | về đúng `goal` |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| WAT-01 | Bước +250 | Bấm **+250ml** khi `current + 250 ≤ goal` | Tăng đúng 250 ml | |
| WAT-02 | Bước +500 | Bấm **+500ml** khi `current + 500 ≤ goal` | Tăng đúng 500 ml | |
| WAT-03 | Vừa đủ mục tiêu | `current + add = goal` | Accept — đạt 100% mục tiêu | |
| WAT-04 | Bước lớn hơn phần còn lại | Còn **100 ml** đến goal, bấm **+250ml** | Hỏi thêm **100 ml** (cắt về đúng goal), không cho vượt | |
| WAT-05 | Đã đủ / vượt mục tiêu | `remaining ≤ 0`, bấm +250 hoặc +500 | Chặn — Alert “Đã đủ mục tiêu”; gợi ý “Đặt về mục tiêu” | |
| WAT-06 | Mục tiêu nước theo cân nặng | Hồ sơ `weight_kg = 70` | Mục tiêu nước = **2450 ml** (`70 × 35`) | |

---

## 5. Health Logic — 6 testcase

### Biến & miền giá trị

| Biến | Quy tắc trong code | Biên |
|---|---|---|
| BMI / BMR đầu vào | `weight ≤ 0` hoặc `height ≤ 0` (BMR thêm `age ≤ 0`) → trả **0** | 0 / giá trị dương nhỏ |
| Calo ngày | `max(1200, tdee + adjustment)` | sàn **1200** |
| Nước/ngày | `weight > 0` → `round(kg × 35)`; `weight ≤ 0` → **2000** | 0 kg / 1 kg / 70 kg |
| Macro | Protein 30%, Carbs 45%, Fat 25% của calo mục tiêu | đối chiếu số làm tròn |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| HL-01 | BMI đầu vào ≤ 0 | `weight = 0` hoặc `height = 0` | `BMI = 0` | |
| HL-02 | BMI hợp lệ (điểm trong miền) | 70 kg, 175 cm | `BMI ≈ 22.9` | |
| HL-03 | Nước fallback (weight ≤ 0) | `weight_kg = 0` | `water_goal_ml = 2000` | |
| HL-04 | Nước biên dương | `weight_kg = 1` | `water_goal_ml = 35` (`1 × 35`) | |
| HL-05 | Calo sàn 1200 | TDEE + điều chỉnh mục tiêu **&lt; 1200** (vd. người nhẹ, lose_weight) | `daily_calorie_goal = 1200` (không thấp hơn) | |
| HL-06 | Calo trên sàn | Nam 70 kg, 175 cm, 30 tuổi, moderately_active, lose_weight | `calorie_goal = 2156` (TDEE 2556 − 400); macro theo 30/45/25 | |

> Có thể đối chiếu nhanh bằng: `npm run test:formulas` (`src/lib/healthCalculations.test.ts`).

---

## 6. Cách ghi nhận

1. Chạy từng ID; ghi **Pass / Fail** vào cột Kết quả.
2. Nutrition/Water: test trên tab **Dinh dưỡng** (thêm món, +250/+500).
3. Health Logic: đối chiếu số trên Profile/Nutrition sau onboarding, hoặc chạy `test:formulas`.
4. Fail: ghi kèm giá trị thực tế (calo/nước/BMI) và message Alert nếu có.

### Lệch hành vi cần nhớ

| Điểm | Hành vi thực tế |
|---|---|
| Vượt **calo** khi thêm món | **Chặn cứng** — không thêm khi `current + added > goal` |
| Vượt **nước** khi +250/+500 | **Không cho vượt** — hỏi thêm đúng phần còn lại; nếu đã đủ thì chặn hẳn |
| Khẩu phần món | Chỉ 4 mức cố định: 0.5 / 1 / 1.5 / 2 (không nhập tự do) |
| Bữa ăn UI | Chỉ Sáng / Trưa / Tối — DB có `snack` nhưng UI chưa có |
| Nước mặc định | Không có cân nặng (`≤ 0`) → **2000 ml**, không phải 0 |
| Calo ngày | Luôn **≥ 1200** dù TDEE − điều chỉnh mục tiêu thấp hơn |

---

*Báo cáo BVA — Nutrition 6, Water 6, Health Logic 6 (Người 3).*
