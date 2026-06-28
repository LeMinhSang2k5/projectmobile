-- Migration: Add 3 new workout programs with exercises
-- Created at: 2026-07-01

DO $$
DECLARE
    prog_strength_id UUID;
    prog_yoga_id UUID;
    prog_hiit_id UUID;
BEGIN
    -- 1. Thêm chương trình Sức Mạnh Toàn Thân
    INSERT INTO public.programs (title, description, level, thumbnail_url)
    VALUES ('Sức Mạnh Toàn Thân', 'Xây dựng cơ bắp và sức bền với các bài tập trọng lượng cơ thể.', 'Intermediate', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48')
    RETURNING id INTO prog_strength_id;

    -- 2. Thêm chương trình Yoga & Linh Hoạt
    INSERT INTO public.programs (title, description, level, thumbnail_url)
    VALUES ('Yoga & Linh Hoạt', 'Cải thiện sự dẻo dai, cân bằng và giảm căng thẳng tâm trí.', 'Beginner', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b')
    RETURNING id INTO prog_yoga_id;

    -- 3. Thêm chương trình HIIT Đốt Mỡ Siêu Tốc
    INSERT INTO public.programs (title, description, level, thumbnail_url)
    VALUES ('HIIT Đốt Mỡ Siêu Tốc', 'Đốt cháy calo tối đa với các bài tập cường độ cao (High-Intensity).', 'Advanced', 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712')
    RETURNING id INTO prog_hiit_id;

    -- THÊM CÁC BÀI TẬP MẪU CHO CÁC CHƯƠNG TRÌNH NÀY
    
    -- Bài tập Sức Mạnh
    INSERT INTO public.exercises (program_id, name, duration, met_value, media_url, sort_order)
    VALUES 
        (prog_strength_id, 'Push-ups (Chống đẩy)', 45, 8.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 1),
        (prog_strength_id, 'Bodyweight Squats', 45, 5.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 2);

    -- Bài tập Yoga
    INSERT INTO public.exercises (program_id, name, duration, met_value, media_url, sort_order)
    VALUES 
        (prog_yoga_id, 'Plank cơ bản', 60, 3.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 1),
        (prog_yoga_id, 'Cobra Pose', 30, 2.5, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 2);

    -- Bài tập HIIT
    INSERT INTO public.exercises (program_id, name, duration, met_value, media_url, sort_order)
    VALUES 
        (prog_hiit_id, 'Burpees', 30, 12.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 1),
        (prog_hiit_id, 'Mountain Climbers', 30, 10.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 2);

END $$;
