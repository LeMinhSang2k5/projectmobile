# Công thức sức khỏe — FitLife (Module Nutrition, Water, Health Logic)

Tài liệu mô tả các công thức tính toán chỉ số dinh dưỡng và nước uống trong ứng dụng.

## 1. BMI (Body Mass Index)

```
BMI = cân_nặng(kg) / chiều_cao(m)²
```

**Ví dụ:** 70 kg, 175 cm → BMI = 70 / (1.75)² = **22.9** (bình thường)

## 2. BMR — Mifflin-St Jeor

Basal Metabolic Rate — năng lượng cơ thể tiêu hao khi nghỉ.

**Nam:**
```
BMR = 10 × cân_nặng(kg) + 6.25 × chiều_cao(cm) - 5 × tuổi + 5
```

**Nữ:**
```
BMR = 10 × cân_nặng(kg) + 6.25 × chiều_cao(cm) - 5 × tuổi - 161
```

**Ví dụ (nam, 70kg, 175cm, 30 tuổi):**
BMR = 700 + 1093.75 - 150 + 5 = **1649 kcal/ngày**

## 3. TDEE (Total Daily Energy Expenditure)

```
TDEE = BMR × hệ_số_vận_động
```

| Mức vận động | Hệ số |
|--------------|-------|
| Ít vận động (sedentary) | 1.2 |
| Vận động nhẹ (lightly_active) | 1.375 |
| Vận động vừa (moderately_active) | 1.55 |
| Vận động nhiều (very_active) | 1.725 |
| Vận động rất nhiều (extra_active) | 1.9 |

**Ví dụ:** BMR 1649, moderately_active → TDEE = 1649 × 1.55 = **2556 kcal**

## 4. Mục tiêu calo hàng ngày

Điều chỉnh TDEE theo mục tiêu tập luyện:

| Mục tiêu | Điều chỉnh |
|----------|------------|
| Giảm cân (lose_weight) | -400 kcal |
| Tăng cơ (build_muscle) | +300 kcal |
| Duy trì (maintain) | 0 |
| Cải thiện cardio (improve_cardio) | -200 kcal |
| Linh hoạt (flexibility) | 0 |

Tối thiểu: **1200 kcal/ngày**

**Ví dụ:** TDEE 2556, giảm cân → 2556 - 400 = **2156 kcal**

## 5. Phân bổ Macronutrients

Tỷ lệ mặc định của tổng calo:

| Macro | Tỷ lệ | Calo/g |
|-------|-------|--------|
| Protein | 30% | 4 kcal/g |
| Carbs | 45% | 4 kcal/g |
| Fat | 25% | 9 kcal/g |

```
protein_g = (calo_mục_tiêu × 0.30) / 4
carbs_g   = (calo_mục_tiêu × 0.45) / 4
fat_g     = (calo_mục_tiêu × 0.25) / 9
```

**Ví dụ (2100 kcal):** Protein 158g, Carbs 236g, Fat 58g

## 6. Lượng nước khuyến nghị

Theo đặc tả FitLife:

```
nước_ml/ngày = cân_nặng(kg) × 35
```

**Ví dụ:** 70 kg → **2450 ml/ngày**

Mặc định khi chưa có cân nặng: **2000 ml**

## 7. Nhắc uống nước

- Tần suất: mỗi **2 giờ**
- Khung giờ: **7:00 – 22:00**
- Các mốc: 7h, 9h, 11h, 13h, 15h, 17h, 19h, 21h

## 8. Implementation

Logic được triển khai tại:
- `src/lib/healthCalculations.ts` — pure functions
- `src/services/healthService.ts` — lưu vào Supabase profiles
- `src/services/nutritionService.ts` — meal CRUD + tổng hợp daily_nutrition
- `src/services/waterService.ts` — theo dõi ml (+250ml, +500ml)

Chạy test công thức:
```bash
npm run test:formulas
```
