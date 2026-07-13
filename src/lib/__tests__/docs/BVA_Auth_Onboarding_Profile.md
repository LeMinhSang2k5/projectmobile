# Báo cáo Testcase BVA — Auth, Onboarding, Profile

**Dự án:** FitLife (ELITE FIT)  
**Phương pháp:** Boundary Value Analysis (phân tích giá trị biên)  
**Phạm vi:** Module Người 1 — Auth, Onboarding, Profile  
**Nguồn code:** `LoginScreen.tsx`, `OnboardingScreen.tsx`, `ProfileScreen.tsx`  
**Ngày:** 09/07/2026

---

## 1. Giới thiệu ngắn

**BVA** chọn giá trị tại biên hợp lệ / không hợp lệ để phát hiện lỗi validate.


| Ký hiệu | Ý nghĩa                       |
| ------- | ----------------------------- |
| min−1   | Ngay dưới biên dưới (invalid) |
| min     | Biên dưới (valid)             |
| max     | Biên trên (valid)             |
| max+1   | Ngay trên biên trên (invalid) |


---



## 2. Ma trận tổng hợp


| Module     | Số TC  | Biên chính                                               |
| ---------- | ------ | -------------------------------------------------------- |
| Auth       | 5      | Email, mật khẩu login (≥6), mật khẩu đăng ký (≥8 + mạnh) |
| Onboarding | 6      | Tên (≥2), tuổi (10–100), cao (100–250), nặng (25–350)    |
| Profile    | 6      | Tên không rỗng, tuổi picker (10–100), lưu hồ sơ          |
| **Tổng**   | **17** | Checklist manual                                         |


---



## 3. Auth — 5 testcase


| ID      | Trường / biên         | Input                                                    | Kỳ vọng                                | Kết quả |
| ------- | --------------------- | -------------------------------------------------------- | -------------------------------------- | ------- |
| AUTH-01 | Email rỗng            | Email `""`, mật khẩu có giá trị                          | Reject — nhập đầy đủ Email và Mật khẩu |         |
| AUTH-02 | Email sai format      | `a@b`                                                    | Reject — email không hợp lệ            |         |
| AUTH-03 | Mật khẩu login min−1  | Đăng nhập, mật khẩu 5 ký tự                              | Reject — mật khẩu không hợp lệ         |         |
| AUTH-04 | Mật khẩu login min    | Đăng nhập, mật khẩu 6 ký tự                              | Qua validate độ dài                    |         |
| AUTH-05 | Mật khẩu đăng ký biên | Đăng ký: 7 ký tự (yếu) **và** 8 ký tự đủ hoa/số/đặc biệt | 7 → Reject; 8 đủ điều kiện → Accept    |         |


---



## 4. Onboarding — 6 testcase


| ID     | Trường / biên       | Input                                    | Kỳ vọng                                  | Kết quả |
| ------ | ------------------- | ---------------------------------------- | ---------------------------------------- | ------- |
| ONB-01 | Tên min−1 / min     | `"A"` rồi `"An"`                         | 1 ký tự → Reject; 2 ký tự → Accept       |         |
| ONB-02 | Tuổi min−1 / min    | Tuổi 9 rồi tuổi 10 (+ đã chọn giới tính) | 9 → Reject; 10 → sang bước 2             |         |
| ONB-03 | Tuổi max / max+1    | Tuổi 100 rồi tuổi 101                    | 100 → Accept; 101 → Reject               |         |
| ONB-04 | Chiều cao biên      | 99 cm rồi 100 cm (cân nặng hợp lệ)       | 99 → Reject; 100 → Accept                |         |
| ONB-05 | Cân nặng biên       | 24 kg rồi 25 kg; 350 kg rồi 351 kg       | 24/351 → Reject; 25/350 → Accept         |         |
| ONB-06 | Bước 3 đủ điều kiện | Đã chọn mục tiêu + mức độ                | Lưu hồ sơ, `onboarding_completed = true` |         |


---



## 5. Profile — 6 testcase


| ID     | Trường / biên        | Input                               | Kỳ vọng                                     | Kết quả |
| ------ | -------------------- | ----------------------------------- | ------------------------------------------- | ------- |
| PRF-01 | Tên rỗng             | `""` hoặc chỉ khoảng trắng          | Reject — tên không được để trống            |         |
| PRF-02 | Tên hợp lệ           | `"Minh Sang"`                       | Accept → cập nhật `display_name`            |         |
| PRF-03 | Tuổi biên dưới UI    | Chọn ngày sinh tương đương tuổi 10  | Chọn được; lưu `age = 10`                   |         |
| PRF-04 | Tuổi ngoài biên dưới | Cố chọn tuổi 9                      | DatePicker không cho chọn                   |         |
| PRF-05 | Tuổi biên trên UI    | Chọn ngày sinh tương đương tuổi 100 | Chọn được; lưu `age = 100`                  |         |
| PRF-06 | Lưu mục tiêu         | Đổi `fitness_goal` rồi Lưu          | Cập nhật mục tiêu, tính lại chỉ số sức khỏe |         |


---



## 6. Cách ghi nhận

1. Chạy từng ID theo bảng; ghi **Pass / Fail** vào cột Kết quả.
2. Fail: ghi kèm message Alert / ảnh màn hình.
3. Ưu tiên biên **min−1 / min / max / max+1**.



### Lệch hành vi cần nhớ


| Điểm          | Onboarding | Profile / Auth                            |
| ------------- | ---------- | ----------------------------------------- |
| Tên tối thiểu | ≥ 2 ký tự  | Profile: chỉ không rỗng                   |
| Mật khẩu      | —          | Login ≥ 6; Register ≥ 8 + hoa/số/đặc biệt |


---

*Báo cáo BVA rút gọn — Auth 5, Onboarding 6, Profile 6.*