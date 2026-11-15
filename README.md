# منصة المدرس الواحد

نفس منصة التعليم (كورسات، محاضرات، امتحانات، واجبات، محفظة وأكواد شحن، إشعارات، مساعدين)
لكن لمدرس واحد: **صورته واسمه ونبذته في أول صفحة**، والمدرس هو المالك (`super_admin`).

## التشغيل
1. مشروع Supabase جديد → SQL Editor: شغّل `security.sql` ثم `single-teacher.sql`.
2. Authentication: Email Confirmations = OFF.
3. أنشئ مستخدم للمدرس (`رقمه@edu.local`) ثم نفّذ سطر UPDATE الموجود آخر `single-teacher.sql`.
4. عدّل `js/config.js` (SUPABASE_URL و SUPABASE_KEY).
5. افتح الموقع، سجّل دخول كمدرس ← لوحة المدرس ← الإعدادات ← ارفع صورتك واكتب اسمك ونبذتك.
6. محلياً: `python -m http.server 8080`.

## ملاحظات
- الكود بيستخدم Edge Functions (`submit_exam`, `create_assistant`, `admin_update_user`) مش موجودة في الـ zip الأصلي؛
  لازم تتنشر في مشروع Supabase الجديد (انسخها من مشروعك الحالي). `create_teacher` اتشالت لأن فيه مدرس واحد.
