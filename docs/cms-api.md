# FitLife CMS / Admin API

Backend CMS cho module Người 5: quản trị nội dung qua Supabase Dashboard + Edge Functions, tích hợp Security (export/xóa tài khoản) với app mobile.

## 1. Phân quyền admin

Migration: [`supabase/migrations/20260702100000_admin_cms_security.sql`](../supabase/migrations/20260702100000_admin_cms_security.sql)

- Cột `profiles.role`: `user` | `admin`
- Hàm `public.is_admin()` dùng trong RLS

Gán admin cho tài khoản (Supabase SQL Editor):

```sql
update public.profiles
set role = 'admin'
where id = '<uuid-cua-ban>';
```

## 2. Bảng CMS (admin CRUD)

| Bảng | User thường | Admin |
|------|---------------|-------|
| `programs` | SELECT | CRUD |
| `exercises` | SELECT | CRUD |
| `workout_courses` | SELECT | CRUD |
| `foods` (`is_custom = false`) | SELECT | CRUD |
| `badges` | SELECT | CRUD |

Quản trị tạm thời: **Supabase Dashboard → Table Editor** (đăng nhập bằng tài khoản có `role = admin` qua app hoặc dùng service role trên Dashboard).

## 3. Storage media

| Bucket | Mục đích |
|--------|----------|
| `program-thumbnails` | Ảnh cover khóa tập |
| `exercise-media` | GIF/MP4 bài tập |

- App user: đọc (authenticated)
- Admin: upload qua Edge Function `media-upload` hoặc Dashboard Storage

## 4. Edge Functions

Base URL: `https://<project-ref>.supabase.co/functions/v1`

### `GET /cms-status`

- Auth: publishable key (`apikey` + `Authorization: Bearer <publishable>`)
- `verify_jwt = false`
- Trả về: trạng thái DB, số lượng content, schema version

```bash
curl "https://<ref>.supabase.co/functions/v1/cms-status" \
  -H "apikey: <publishable>" \
  -H "Authorization: Bearer <publishable>"
```

### `GET /export-user-data`

- Auth: JWT user (Bearer access token)
- Export JSON: profile, workout, nutrition, badges

```bash
curl "https://<ref>.supabase.co/functions/v1/export-user-data" \
  -H "apikey: <publishable>" \
  -H "Authorization: Bearer <user-access-token>"
```

### `POST /delete-account`

- Auth: JWT user
- Body: `{ "confirm": "DELETE" }`
- Xóa user qua Admin API (cascade data)

### `POST /media-upload`

- Auth: JWT admin
- Body:

```json
{
  "bucket": "exercise-media",
  "path": "programs/demo/plank.gif",
  "contentType": "image/gif"
}
```

Response: `signedUrl`, `publicUrl`, `token`

## 5. Seed & import

```bash
# Kiểm tra kết nối Supabase
npm run check:supabase

# Seed (chạy file SQL trên Dashboard hoặc supabase db execute)
# supabase/seed/programs.sql
# supabase/seed/foods.sql
# supabase/seed/badges.sql

# Import CSV
node scripts/cms-import.mjs --type foods --file path/to/foods.csv
node scripts/cms-import.mjs --type programs --file path/to/programs.csv
node scripts/cms-import.mjs --type exercises --file path/to/exercises.csv
```

CSV formats xem header trong [`scripts/cms-import.mjs`](../scripts/cms-import.mjs).

## 6. Deploy Edge Functions

```bash
supabase functions deploy cms-status
supabase functions deploy export-user-data
supabase functions deploy delete-account
supabase functions deploy media-upload
```

Secrets (Supabase Dashboard → Edge Functions): `SUPABASE_SECRET_KEY` được inject tự động trên hosted project.

## 7. Test

```bash
npm run test:cms
npm run test:security
```

## 8. Tích hợp mobile (Profile)

Service: [`src/services/accountService.ts`](../src/services/accountService.ts)

- `exportUserData()` → gọi `export-user-data`, tạo file **Excel (.xlsx)** nhiều sheet rồi chia sẻ
- `deleteUserAccount()` → gọi `delete-account` với confirm

UI: [`src/screens/ProfileScreen.tsx`](../src/screens/ProfileScreen.tsx) — nút Xuất dữ liệu / Xóa tài khoản.

## 9. CMS Admin trong app mobile

- Service: [`src/services/adminService.ts`](../src/services/adminService.ts)
- UI: [`src/screens/admin/AdminScreen.tsx`](../src/screens/admin/AdminScreen.tsx)
- Entry: menu drawer **Quản trị CMS** hoặc Profile → **Mở CMS Admin** (chỉ `role = admin`)

Trang: Trạng thái CMS, Programs, Exercises, Workout Courses, Món ăn, Huy hiệu, Upload media, Import CSV.

- **CRUD đầy đủ**: Thêm / Sửa (icon bút) / Xóa trên từng mục
- **Upload media**: chọn file từ thiết bị → `media-upload` Edge Function
- **Import CSV**: dán CSV trong app (foods, programs, exercises)

Import CSV qua CLI (tùy chọn): [`scripts/cms-import.mjs`](../scripts/cms-import.mjs)
