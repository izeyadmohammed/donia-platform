-- ==========================================================
-- نسخة المدرس الواحد: شغّل security.sql أولاً ثم هذا الملف
-- ==========================================================

-- 1) بيانات المدرس + أعمدة ناقصة في الإعدادات
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS teacher_name  text,
  ADD COLUMN IF NOT EXISTS teacher_title text,
  ADD COLUMN IF NOT EXISTS teacher_bio   text,
  ADD COLUMN IF NOT EXISTS teacher_image text,
  ADD COLUMN IF NOT EXISTS contact_address text;

-- 2) دوال الإحصائيات اللي بتناديها لوحة المدرس
CREATE OR REPLACE FUNCTION public.get_admin_stats() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher()) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN jsonb_build_object(
    'students', (SELECT count(*) FROM profiles WHERE role = 'student'),
    'courses', (SELECT count(*) FROM courses),
    'total_wallet', COALESCE((SELECT sum(wallet) FROM profiles WHERE role = 'student'), 0),
    'total_revenue', COALESCE((SELECT sum(amount) FROM transactions WHERE type = 'debit' AND note LIKE 'اشتراك في%'), 0));
END; $$;

CREATE OR REPLACE FUNCTION public.get_teacher_stats(teacher_id_input uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher()) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN jsonb_build_object(
    'courses', (SELECT count(*) FROM courses),
    'students', (SELECT count(*) FROM profiles WHERE role = 'student' AND cardinality(enrolled_courses) > 0));
END; $$;

CREATE OR REPLACE FUNCTION public.get_students_detailed_stats()
RETURNS TABLE(student_id uuid, courses_count bigint, videos_watched bigint, exams_taken bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher()) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY SELECT p.id, COALESCE(cardinality(p.enrolled_courses), 0)::bigint,
    (SELECT count(*) FROM student_progress sp WHERE sp.student_id = p.id AND sp.video_watched)::bigint,
    (SELECT count(*) FROM exam_submissions es WHERE es.student_id = p.id AND es.type = 'mcq')::bigint
  FROM profiles p WHERE p.role = 'student';
END; $$;

-- آخر محاضرة وقف عندها الطالب في الكورس (لزرار "كمّل من حيث وقفت")
CREATE OR REPLACE FUNCTION public.get_last_lecture(student_id_input uuid, course_id_input text) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.lecture_id FROM student_progress sp JOIN lectures l ON l.id = sp.lecture_id
  WHERE sp.student_id = auth.uid() AND l.course_id = course_id_input
  ORDER BY sp.updated_at DESC LIMIT 1;
$$;

-- 3) الصف الافتراضي للإعدادات
INSERT INTO settings (id, platform_name, teacher_name, teacher_title)
VALUES (1, 'منصتي التعليمية', 'مس اسم المدرسة', 'مدرسة العلوم')
ON CONFLICT (id) DO NOTHING;

-- 4) Storage: bucket عام للصور (صورة المدرس والكورسات)
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS images_read ON storage.objects;
CREATE POLICY images_read ON storage.objects FOR SELECT USING (bucket_id = 'images');
DROP POLICY IF EXISTS images_upload ON storage.objects;
CREATE POLICY images_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');

-- 5) حساب المدرس (المالك): أنشئ مستخدم من Authentication ثم شغّل (غيّر الرقم):
-- UPDATE profiles SET role='super_admin', name='اسم المدرس'
-- WHERE id=(SELECT id FROM auth.users WHERE email='01xxxxxxxxx@edu.local');
