import { supabase, store, refreshCourses, refreshLectures } from '../config.js';
import { escapeHtml, uid, formatMoney, formatDate } from '../utils.js';
import { toast, modal } from '../ui.js';
import { openLectureEditor } from './lesson.js';

export default async function teacherView(el) {
  const p = store.profile;
  if (!p || (p.role !== 'teacher' && p.role !== 'assistant' && p.role !== 'super_admin')) {
    el.innerHTML = `<div class="text-center py-20 text-red-500"><i class="fa-solid fa-lock text-6xl mb-4"></i><h2 class="text-2xl font-bold">غير مصرح</h2><a href="#/login" class="btn-primary inline-block mt-4">تسجيل الدخول</a></div>`;
    return;
  }

  const hash = location.hash;
  if (hash === '#/teacher/courses') return renderCourses(el, p);
  if (hash === '#/teacher/assistants') return renderAssistants(el, p);
  if (hash === '#/teacher/students') return renderStudents(el, p);
  if (hash === '#/teacher/grading') return renderGrading(el, p);
  return renderDashboard(el, p);
}

// ==========================================
// 1. لوحة التحكم الرئيسية
// ==========================================
async function renderDashboard(el, p) {
  // جلب الإحصائيات من الدالة اللي في Supabase
  const { data: stats } = await supabase.rpc('get_teacher_stats', { teacher_id_input: p.id });
  
  const myCoursesCount = stats?.courses || 0;
  const totalStudents = stats?.students || 0;
  

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-sky-500">${p.role === 'assistant' ? 'المساعد' : 'المدرس'}</span></h1>
      <button id="add-course" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-2"></i> إضافة كورس</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up mb-8">
      <!-- كارت الطلاب -->
      <div class="glass-card p-6 text-center bg-green-500/5 border-green-500/20">
        <i class="fa-solid fa-users text-4xl text-green-500 mb-3"></i>
        <h3 class="font-bold text-3xl text-main">${totalStudents}</h3>
        <p class="text-sm text-muted">طالب مشترك</p>
      </div>

      <!-- كارت الكورسات -->
      <a href="#/teacher/courses" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-book text-4xl text-blue-500 mb-3"></i>
        <h3 class="font-bold text-3xl text-main">${myCoursesCount}</h3>
        <p class="text-sm text-muted">كورس</p>
      </a>


    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up">
      <a href="#/teacher/courses" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-book text-4xl text-blue-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">الكورسات</h3>
      </a>
      ${(p.role === 'teacher' || p.role === 'super_admin') ? `
        <a href="#/teacher/assistants" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
          <i class="fa-solid fa-user-group text-4xl text-sky-500 mb-3"></i>
          <h3 class="font-bold text-lg text-main">المساعدين</h3>
        </a>
      ` : ''}
      <a href="#/teacher/students" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-users text-4xl text-green-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">الطلاب</h3>
      </a>
      <a href="#/teacher/grading" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-file-signature text-4xl text-orange-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">تصحيح الواجبات</h3>
      </a>
      <button id="change-pw-btn" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition w-full">
        <i class="fa-solid fa-key text-4xl text-yellow-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">تغيير كلمة المرور</h3>
      </button>
    </div>
  `;

  el.querySelector('#add-course').onclick = () => openAddCourseModal(p);
  
  const cpBtn = el.querySelector('#change-pw-btn');
  if (cpBtn) {
    cpBtn.onclick = () => {
      const m = modal({
        title: 'تغيير كلمة المرور',
        body: `
          <div class="space-y-3">
            <input id="old-pw" type="password" placeholder="كلمة المرور الحالية" class="input-field">
            <input id="new-pw" type="password" placeholder="كلمة المرور الجديدة (8 أحرف على الأقل)" class="input-field">
          </div>`,
        actions: `<button id="sbtn" class="btn-primary w-full">تغيير</button>`
      });

      m.root.querySelector('#sbtn').onclick = async () => {
        const oldPw = m.root.querySelector('#old-pw').value;
        const newPw = m.root.querySelector('#new-pw').value;

        if (!oldPw) { toast('اكتب كلمة المرور الحالية', 'warn'); return; }
        if (newPw.length < 8) { toast('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', 'warn'); return; }

        try {
          const email = `${store.profile.phone.replace(/\s/g, '')}@edu.local`;
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: oldPw });
          if (loginError) { toast('كلمة المرور الحالية غير صحيحة', 'error'); return; }

          const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
          if (updateError) throw new Error(updateError.message);

          toast('تم تغيير كلمة المرور بنجاح', 'success');
          m.close();
        } catch (e) { toast(e.message, 'error'); }
      };
    };
  }
}

// ==========================================
// 2. صفحة الكورسات
// ==========================================
async function renderCourses(el, p) {
  let myCourses = [];
  if (p.role === 'assistant') {
    myCourses = store.courses.filter(c => c.teacher_id === p.teacher_id);
  } else if (p.role === 'super_admin') {
    myCourses = store.courses; 
  } else {
    myCourses = store.courses.filter(c => c.teacher_id === p.id);
  }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-blue-500">الكورسات</span></h1>
      <div class="flex gap-2">
        <button id="add-course" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-2"></i> إضافة</button>
        <a href="#/teacher" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="space-y-4 animate-fade-up">
      ${myCourses.map(c => {
        const courseLectures = store.lectures.filter(l => l.course_id === c.id);
        return `
          <div class="glass-card overflow-hidden">
            <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
              <div class="flex items-center gap-4">
                ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-16 h-16 rounded-lg object-cover">` : `<div class="w-16 h-16 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-2xl"><i class="fa-solid fa-book"></i></div>`}
                <div>
                  <h3 class="font-bold text-lg text-main">${escapeHtml(c.title)}</h3>
                  <p class="text-sm text-muted">${escapeHtml(c.grade)} • ${formatMoney(c.price)} • ${courseLectures.length} محاضرة</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button data-add-lect="${c.id}" class="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold border border-green-500/20"><i class="fa-solid fa-plus"></i> محاضرة</button>
                <button data-edit-course="${c.id}" class="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold border border-blue-500/20"><i class="fa-solid fa-pen"></i></button>
                <button data-del-course="${c.id}" class="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold border border-red-500/20"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
            <div class="hidden border-t border-border bg-black/5 dark:bg-black/20 p-4">
              <div class="space-y-2">
                ${courseLectures.map(l => `
                  <div class="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-white/5 border border-border">
                    <div>
                      <p class="font-bold text-sm text-main">${escapeHtml(l.title)}</p>
                      <p class="text-xs text-muted">${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة</p>
                    </div>
                    <div class="flex gap-2">
                      <button data-edit-lect="${l.id}" class="px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded text-xs font-bold border border-yellow-500/20">تعديل</button>
                      <button data-del-lect="${l.id}" class="px-3 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20">حذف</button>
                    </div>
                  </div>
                `).join('') || '<p class="text-muted text-sm text-center py-2">لا توجد محاضرات</p>'}
              </div>
            </div>
          </div>
        `;
      }).join('') || '<div class="glass-card p-8 text-center text-muted">لا توجد كورسات.</div>'}
    </div>
  `;

  el.querySelector('#add-course').onclick = () => openAddCourseModal(p);

  el.querySelectorAll('[data-edit-course]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      openEditCourseModal(store.courses.find(x => x.id === b.dataset.editCourse));
    };
  });

  el.querySelectorAll('[data-del-course]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف الكورس؟')) return;
      await supabase.from('courses').delete().eq('id', b.dataset.delCourse);
      toast('تم', 'success'); await refreshCourses(); location.reload();
    };
  });

  el.querySelectorAll('[data-add-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      openAddLectureModal(b.dataset.addLect, p);
    };
  });

  el.querySelectorAll('[data-edit-lect]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const lect = store.lectures.find(x => x.id === b.dataset.editLect);
      if (lect) openLectureEditor(lect);
    };
  });

  el.querySelectorAll('[data-del-lect]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('حذف المحاضرة؟')) return;
      await supabase.from('lectures').delete().eq('id', b.dataset.delLect);
      toast('تم', 'success'); await refreshLectures(); location.reload();
    };
  });
}

// ==========================================
// 3. صفحة المساعدين
// ==========================================
async function renderAssistants(el, p) {
  const { data: assistants } = await supabase.from('profiles').select('*').eq('role', 'assistant').eq('teacher_id', p.id);
  const myAssistants = assistants || [];

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-sky-500">المساعدين</span></h1>
      <div class="flex gap-2">
        <button id="add-assistant" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-user-plus mr-1"></i> إضافة مساعد</button>
        <a href="#/teacher" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
      ${myAssistants.map(a => `
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center font-bold text-xl">
            ${(a.name || '?').charAt(0)}
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-main">${escapeHtml(a.name)}</h3>
            <p class="text-xs text-muted" dir="ltr">${escapeHtml(a.phone || '')}</p>
          </div>
          <div class="flex gap-2">
            <button data-edit-assistant="${a.id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center"><i class="fa-solid fa-pen"></i></button>
            <button data-del-assistant="${a.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') || '<p class="text-muted col-span-2 text-center py-10">لا يوجد مساعدين بعد</p>'}
    </div>
  `;

  el.querySelector('#add-assistant').onclick = () => openAddAssistantModal(p);

  el.querySelectorAll('[data-edit-assistant]').forEach(b => {
    b.onclick = () => {
      const a = myAssistants.find(x => x.id === b.dataset.editAssistant);
      openEditAssistantModal(a);
    };
  });

  el.querySelectorAll('[data-del-assistant]').forEach(b => {
    b.onclick = async () => {
      if (!confirm('حذف المساعد؟')) return;
      await supabase.from('profiles').delete().eq('id', b.dataset.delAssistant);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 4. صفحة الطلاب
// ==========================================
async function renderStudents(el, p) {
  let myCourses = store.courses.filter(c => c.teacher_id === p.id || p.role === 'super_admin');
  let myStudentsStats = [];

  if (myCourses.length > 0) {
    const courseIds = myCourses.map(c => c.id);
    const { data: students } = await supabase.from('profiles')
      .select('id, name, phone, enrolled_courses')
      .eq('role', 'student')
      .overlaps('enrolled_courses', courseIds);

    if (students) {
      for (const s of students) {
        const { count: vids } = await supabase.from('student_progress').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('video_watched', true);
        const { count: exms } = await supabase.from('exam_submissions').select('*', { count: 'exact', head: true }).eq('student_id', s.id).eq('type', 'mcq');
        myStudentsStats.push({ ...s, videos: vids || 0, exams: exms || 0 });
      }
    }
  }

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إحصائيات <span class="text-green-500">الطلاب</span></h1>
      <a href="#/teacher" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-up">
      ${myStudentsStats.map(s => `
        <div class="glass-card p-4">
          <p class="font-bold text-main mb-1">${escapeHtml(s.name)}</p>
          <p class="text-xs text-muted mb-3" dir="ltr">${escapeHtml(s.phone || '')}</p>
          <div class="flex gap-4 text-sm">
            <span class="text-blue-500 font-bold"><i class="fa-solid fa-video"></i> ${s.videos} فيديو</span>
            <span class="text-sky-500 font-bold"><i class="fa-solid fa-list-check"></i> ${s.exams} امتحان</span>
          </div>
        </div>
      `).join('') || '<p class="text-muted col-span-3 text-center py-10">لا يوجد طلاب مشتركين في كورساتك</p>'}
    </div>
  `;
}

// ==========================================
// 5. صفحة تصحيح الواجبات
// ==========================================
async function renderGrading(el, p) {
  let myCourses = store.courses.filter(c => c.teacher_id === p.id || c.teacher_id === p.teacher_id || p.role === 'super_admin');
  let courseIds = myCourses.map(c => c.id);

  let myLectures = store.lectures.filter(l => courseIds.includes(l.course_id));
  let lectureIds = myLectures.map(l => l.id);

  const { data: submissions, error } = await supabase.from('exam_submissions')
    .select('*')
    .eq('type', 'essay')
    .eq('status', 'جاري التصحيح')
    .in('lecture_id', lectureIds)
    .order('submitted_at', { ascending: false });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">تصحيح <span class="text-orange-500">الواجبات</span></h1>
      <a href="#/teacher" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
    </div>
    <div class="space-y-4 animate-fade-up">
      ${(!submissions || submissions.length === 0) ? '<div class="glass-card p-12 text-center text-muted">لا توجد واجبات بانتظار التصحيح حالياً</div>' : ''}
      ${(submissions || []).map(s => `
        <div class="glass-card p-5">
          <div class="flex justify-between items-start mb-4 border-b border-border pb-3">
            <div>
              <h3 class="font-bold text-main text-lg">${escapeHtml(s.student_name)}</h3>
              <p class="text-xs text-blue-500 font-bold mt-1">
                <i class="fa-solid fa-file-lines"></i> 
                ${(() => {
                  const lect = store.lectures.find(l => l.id === s.lecture_id);
                  const ex = (lect?.essay_exams || []).find(e => e.id === s.exam_id);
                  return ex ? escapeHtml(ex.title) : 'واجب غير معروف';
                })()}
              </p>
              <p class="text-xs text-muted mt-1">${formatDate(s.submitted_at)}</p>
            </div>
          </div>
          <div class="bg-black/5 dark:bg-black/20 p-4 rounded-lg mb-4 text-sm text-main whitespace-pre-wrap">
            ${escapeHtml(s.answer || 'لا توجد إجابة')}
          </div>
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-[120px]">
              <label class="block text-xs font-bold mb-1 text-muted">الدرجة</label>
              <input id="grade-${s.id}" type="number" value="${s.grade || ''}" class="input-field" placeholder="مثال: 10">
            </div>
            <div class="flex-[2] min-w-[200px]">
              <label class="block text-xs font-bold mb-1 text-muted">ملاحظة (اختياري)</label>
              <input id="note-${s.id}" value="${escapeHtml(s.teacher_note || '')}" class="input-field" placeholder="ملاحظة للطالب">
            </div>
            <button data-save="${s.id}" class="btn-primary px-6 py-2">حفظ الدرجة</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  el.querySelectorAll('[data-save]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.save;
      const gradeVal = el.querySelector(`#grade-${id}`).value;
      const noteVal = el.querySelector(`#note-${id}`).value;

      if (gradeVal === '') { toast('أدخل الدرجة أولاً', 'warn'); return; }

      b.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      b.disabled = true;

      const { error } = await supabase.from('exam_submissions').update({
        grade: +gradeVal,
        teacher_note: noteVal,
        status: 'تم التصحيح'
      }).eq('id', id);

      if (error) {
        toast(error.message, 'error');
        b.innerHTML = 'حفظ الدرجة';
        b.disabled = false;
      } else {
        toast('تم تصحيح الواجب وإرسال الإشعار للطالب', 'success');
        b.innerHTML = '<i class="fa-solid fa-check"></i> تم';
        b.className = 'px-6 py-2 bg-green-500/20 text-green-500 rounded-lg font-bold';
      }
    };
  });
}

// ==========================================
// المودالات
// ==========================================
function openAddCourseModal(p) {
  const grades = ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  const m = modal({
    title: 'إضافة كورس جديد',
    body: `
      <div class="space-y-3">
        <input id="t" placeholder="عنوان الكورس" class="input-field">
        <select id="g" class="input-field">
          <option value="">اختر الصف</option>
          <option value="كل المراحل">كل المراحل</option>
          ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <input id="pr" type="number" placeholder="السعر (ج.م)" class="input-field">
        <textarea id="d" placeholder="وصف الكورس" class="input-field"></textarea>
        <div class="p-3 border border-border rounded-lg bg-black/5 dark:bg-white/5">
          <label class="block text-sm font-bold mb-2">صورة الكورس (اختياري)</label>
          <div class="flex items-center gap-3">
            <div id="course-img-prev" class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              <i class="fa-solid fa-image text-muted"></i>
            </div>
            <div class="flex flex-col gap-2 flex-1">
              <label class="cursor-pointer bg-blue-500/10 text-blue-500 rounded px-3 py-1.5 text-xs font-bold text-center">
                <i class="fa-solid fa-upload"></i> من المعرض
                <input type="file" id="course-img-file" class="hidden" accept="image/*">
              </label>
              <label class="cursor-pointer bg-green-500/10 text-green-500 rounded px-3 py-1.5 text-xs font-bold text-center">
                <i class="fa-solid fa-camera"></i> الكاميرا
                <input type="file" id="course-cam-file" class="hidden" accept="image/*" capture="environment">
              </label>
            </div>
          </div>
        </div>
      </div>`,
    actions: `<button id="sb" class="btn-primary w-full">إضافة الكورس</button>`
  });

  let newImgUrl = '';
  const handleCourseImg = async (file) => {
    toast('جاري رفع الصورة...', 'info');
    const fileName = `course_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل الرفع', 'error'); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    newImgUrl = data.publicUrl;
    m.root.querySelector('#course-img-prev').innerHTML = `<img src="${newImgUrl}" class="w-full h-full object-cover">`;
    toast('تم رفع الصورة', 'success');
  };
  m.root.querySelector('#course-img-file').onchange = (e) => handleCourseImg(e.target.files[0]);
  m.root.querySelector('#course-cam-file').onchange = (e) => handleCourseImg(e.target.files[0]);

  m.root.querySelector('#sb').onclick = async () => {
    try {
      const { error } = await supabase.from('courses').insert({
        id: 'course_'+Date.now(),
        teacher_id: p.role === 'assistant' ? p.teacher_id : p.id,
        title: m.root.querySelector('#t').value,
        grade: m.root.querySelector('#g').value,
        price: +m.root.querySelector('#pr').value || 0,
        description: m.root.querySelector('#d').value,
        image: newImgUrl
      });
      if (error) throw new Error(error.message);
      toast('تمت الإضافة', 'success'); m.close(); await refreshCourses(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openEditCourseModal(c) {
  const grades = ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  const m = modal({
    title: 'تعديل الكورس',
    body: `
      <div class="space-y-3">
        <input id="et" value="${escapeHtml(c.title)}" placeholder="العنوان" class="input-field">
        <select id="eg" class="input-field">
          <option value="كل المراحل" ${c.grade === 'كل المراحل' ? 'selected' : ''}>كل المراحل</option>
          ${grades.map(g => `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
        <input id="epr" type="number" value="${c.price}" class="input-field">
        <textarea id="ed" placeholder="الوصف" class="input-field">${escapeHtml(c.description || '')}</textarea>
        <div class="p-3 border border-border rounded-lg bg-black/5 dark:bg-white/5">
          <label class="block text-sm font-bold mb-2">صورة الكورس</label>
          <div class="flex items-center gap-3">
            <div id="course-img-prev" class="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
              ${c.image ? `<img src="${c.image}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-image text-muted"></i>`}
            </div>
            <div class="flex flex-col gap-2 flex-1">
              <label class="cursor-pointer bg-blue-500/10 text-blue-500 rounded px-3 py-1.5 text-xs font-bold text-center">
                <i class="fa-solid fa-upload"></i> من المعرض
                <input type="file" id="course-img-file" class="hidden" accept="image/*">
              </label>
              <label class="cursor-pointer bg-green-500/10 text-green-500 rounded px-3 py-1.5 text-xs font-bold text-center">
                <i class="fa-solid fa-camera"></i> الكاميرا
                <input type="file" id="course-cam-file" class="hidden" accept="image/*" capture="environment">
              </label>
            </div>
          </div>
        </div>
      </div>`,
    actions: `<button id="esb" class="btn-primary w-full">حفظ</button>`
  });

  let newImgUrl = c.image || '';
  const handleCourseImg = async (file) => {
    toast('جاري رفع الصورة...', 'info');
    const fileName = `course_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل الرفع', 'error'); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    newImgUrl = data.publicUrl;
    m.root.querySelector('#course-img-prev').innerHTML = `<img src="${newImgUrl}" class="w-full h-full object-cover">`;
    toast('تم رفع الصورة', 'success');
  };
  m.root.querySelector('#course-img-file').onchange = (e) => handleCourseImg(e.target.files[0]);
  m.root.querySelector('#course-cam-file').onchange = (e) => handleCourseImg(e.target.files[0]);
  m.root.querySelector('#esb').onclick = async () => {
    try {
      const { error } = await supabase.from('courses').update({
        title: m.root.querySelector('#et').value,
        grade: m.root.querySelector('#eg').value,
        price: +m.root.querySelector('#epr').value || 0,
        description: m.root.querySelector('#ed').value,
        image: newImgUrl
      }).eq('id', c.id);
      if (error) throw new Error(error.message);
      toast('تم', 'success'); m.close(); await refreshCourses(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openAddLectureModal(courseId, p) {
  const m = modal({
    title: 'إضافة محاضرة',
    body: `<input id="lt" placeholder="عنوان المحاضرة" class="input-field">`,
    actions: `<button id="lsb" class="btn-accent w-full">إضافة</button>`
  });
  m.root.querySelector('#lsb').onclick = async () => {
    try {
      const { error } = await supabase.from('lectures').insert({
        id: 'lect_'+Date.now(), course_id: courseId,
        teacher_id: p.role === 'assistant' ? p.teacher_id : p.id,
        title: m.root.querySelector('#lt').value,
        videos: [], pdfs: [], mcq_exams: [], essay_exams: []
      });
      if (error) throw new Error(error.message);
      toast('تمت', 'success'); m.close(); await refreshLectures(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openAddAssistantModal(p) {
  const m = modal({
    title: 'إضافة مساعد جديد',
    body: `
      <div class="space-y-3">
        <input id="a-name" placeholder="اسم المساعد" class="input-field">
        <input id="a-phone" placeholder="رقم الهاتف" class="input-field" dir="ltr">
        <input id="a-pass" type="password" placeholder="كلمة المرور (افتراضي 12345678)" class="input-field" dir="ltr">
      </div>`,
    actions: `<button id="save-assistant" class="btn-primary w-full">إضافة</button>`
  });
  m.root.querySelector('#save-assistant').onclick = async () => {
    const name = m.root.querySelector('#a-name').value;
    const phone = m.root.querySelector('#a-phone').value;
    const pass = m.root.querySelector('#a-pass').value;
    if (!name || !phone) { toast('الاسم والرقم مطلوبين', 'warn'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/create_assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, phone, password: pass, teacher_id: p.id })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'فشل');
      toast('تم. الباسورد: ' + out.default_password, 'success');
      m.close(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openEditAssistantModal(a) {
  const m = modal({
    title: 'تعديل المساعد',
    body: `
      <input id="ae-name" value="${escapeHtml(a.name)}" placeholder="الاسم" class="input-field mb-2">
      <input id="ae-phone" value="${escapeHtml(a.phone || '')}" placeholder="الهاتف" class="input-field mb-2" dir="ltr">
      <input id="ae-pass" type="password" placeholder="كلمة مرور جديدة (اختياري)" class="input-field" dir="ltr">
    `,
    actions: `<button id="save-ae" class="btn-primary w-full">حفظ</button>`
  });
  m.root.querySelector('#save-ae').onclick = async () => {
    try {
      const updates = {
        name: m.root.querySelector('#ae-name').value,
        phone: m.root.querySelector('#ae-phone').value
      };
      const newPass = m.root.querySelector('#ae-pass').value;

      const { error } = await supabase.from('profiles').update(updates).eq('id', a.id);
      if (error) throw new Error(error.message);

      if (newPass.length >= 8) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`https://pephaughlgezamtzphkt.supabase.co/functions/v1/admin_update_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: a.id, new_password: newPass })
        });
        if (!res.ok) throw new Error('فشل تغيير الباسورد');
      }

      toast('تم', 'success'); m.close(); location.reload();
    } catch (err) { toast(err.message, 'error'); }
  };
}
