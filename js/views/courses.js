import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';
import { toast } from '../ui.js';

export default async function coursesView(el, params) {
  if (params && params[0]) {
    const p = store.profile;
    if (!p) { toast('يجب تسجيل الدخول أولاً', 'warn'); location.hash = '#/login'; return; }
    return courseDetail(el, params[0]);
  }
  return courseList(el);
}

async function courseList(el) {
  const p = store.profile;

  const { data: allCourses } = await supabase.from('courses').select('*');
  let list = allCourses || [];

  if (p?.role === 'student' && p.grade) {
    list = list.filter(c =>
      c.grade === p.grade ||
      c.grade === 'كل المراحل' ||
      (p.enrolled_courses || []).includes(c.id)
    );
  }

  el.innerHTML = `
    <div class="mb-8 animate-fade-up">
      <h2 class="text-3xl font-black mb-2 text-main">
        ${p?.role === 'student' ? 'كورسات ' + escapeHtml(p.grade || 'صفك') : 'تصفح'}
        <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-sky-500">الكورسات</span>
      </h2>
    </div>
    ${list.length === 0 ? `<div class="glass-card p-12 text-center text-muted">لا توجد كورسات متاحة حالياً</div>` : ''}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
      ${list.map(c => `
        <div class="glass-card overflow-hidden group cursor-pointer" onclick="window.location.hash='#/courses/${c.id}'">
          <div class="h-48 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-gray-400"><i class="fa-solid fa-book-open"></i></div>`}
            <div class="absolute top-3 right-3 bg-white/80 dark:bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-border text-main">${escapeHtml(c.grade || 'عام')}</div>
          </div>
          <div class="p-5">
            <h3 class="font-extrabold text-lg mb-2 truncate group-hover:text-primary transition text-main">${escapeHtml(c.title)}</h3>
            <div class="flex items-center justify-between mt-4">
              <span class="text-primary font-black text-xl">${c.price === 0 ? 'مجاني' : formatMoney(c.price)}</span>
              <span class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition text-main"><i class="fa-solid fa-arrow-left text-xs"></i></span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}

async function courseDetail(el, id) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) { el.innerHTML = `<p class="text-center py-10 text-red-500">الكورس غير موجود</p>`; return; }

  const { data: lectures } = await supabase.from('lectures').select('*').eq('course_id', id).order('created_at');
  const p = store.profile;
  const enrolled = p?.enrolled_courses?.includes(id);

  let lastLectureId = null;
  let completedCount = 0;
  
  if (enrolled && p) {
    const { data: lastLect } = await supabase.rpc('get_last_lecture', { student_id_input: p.id, course_id_input: id });
    if (lastLect) lastLectureId = lastLect;

    const { data: prog } = await supabase.from('student_progress').select('lecture_id').eq('student_id', p.id);
    if (prog) {
      const completedIds = prog.map(x => x.lecture_id);
      completedCount = (lectures || []).filter(l => completedIds.includes(l.id)).length;
    }
  }

  const progressPercent = lectures?.length ? Math.round((completedCount / lectures.length) * 100) : 0;

  el.innerHTML = `
    <div class="animate-fade-up">
      <div class="glass-card p-8 mb-8 relative overflow-hidden">
        <div class="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div class="w-full md:w-1/3 h-48 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
             ${course.image ? `<img src="${escapeHtml(course.image)}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-6xl text-gray-400"><i class="fa-solid fa-book-open"></i></div>`}
          </div>
          <div class="flex-1">
            <span class="inline-block py-1 px-3 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold mb-3">${escapeHtml(course.grade)}</span>
            <h1 class="text-3xl font-black mb-3 text-main">${escapeHtml(course.title)}</h1>
            <p class="text-muted mb-6">${escapeHtml(course.description || '')}</p>
            <div class="flex items-center gap-4">
              <span class="text-2xl font-black text-primary">${course.price === 0 ? 'مجاني' : formatMoney(course.price)}</span>
              ${(enrolled || course.price === 0)
                ? `<span class="px-6 py-2 bg-green-500/10 text-green-500 rounded-lg font-bold">${enrolled ? 'مشترك' : 'مجاني'}</span>`
                : `<button id="enroll-btn" class="btn-primary">اشترك الآن</button>`}
            </div>
          </div>
        </div>

        ${enrolled ? `
          <div class="mt-8 pt-6 border-t border-border">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-muted">تقدمك في الكورس</span>
              <span class="text-sm font-bold text-primary">${progressPercent}%</span>
            </div>
            <div class="w-full bg-black/10 dark:bg-white/10 rounded-full h-3">
              <div class="bg-primary h-3 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
            ${lastLectureId ? `<button id="continue-btn" class="btn-accent w-full mt-4"><i class="fa-solid fa-play mr-2"></i> كمّل من حيث وقفت</button>` : ''}
          </div>
        ` : ''}
      </div>

      <h2 class="text-2xl font-black mb-4 text-main">المحاضرات (${lectures?.length || 0})</h2>
      <div class="space-y-4">
        ${(lectures || []).map((l, i) => `
          <div class="glass-card p-4 flex justify-between items-center">
            <div>
              <p class="font-bold text-main">${escapeHtml(l.title)}</p>
              <p class="text-xs text-muted">${(l.videos||[]).length} فيديو • ${(l.pdfs||[]).length} مذكرة</p>
            </div>
            <a href="#/lesson/${l.id}" class="btn-primary text-sm px-4 py-1.5">دخول</a>
          </div>
        `).join('') || '<p class="text-muted text-center">لا توجد محاضرات</p>'}
      </div>
    </div>
  `;

  const eb = el.querySelector('#enroll-btn');
  if (eb) {
    eb.onclick = async () => {
      try {
        const { error } = await supabase.rpc('enroll_course', { course_id_input: id });
        if (error) throw new Error(error.message);
        toast('تم الاشتراك', 'success');
        const { loadProfile } = await import('../auth.js'); await loadProfile();
        location.reload();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  const cb = el.querySelector('#continue-btn');
  if (cb && lastLectureId) {
    cb.onclick = () => { location.hash = '#/lesson/' + lastLectureId; };
  }
}
