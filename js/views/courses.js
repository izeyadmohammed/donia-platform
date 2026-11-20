import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney, filterCourses } from '../utils.js';
import { toast, openRedeemModal } from '../ui.js';

export default async function coursesView(el, params) {
  if (params && params[0]) {
    return courseDetail(el, params[0]);
  }
  return courseList(el);
}

async function courseList(el) {
  const p = store.profile;

  const { data: allCourses } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  const baseList = filterCourses(allCourses || [], { profile: p });
  const grades = [...new Set(baseList.map((c) => c.grade).filter((g) => g && g !== 'كل المراحل'))];

  el.innerHTML = `
    <div class="mb-6 animate-fade-up flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black mb-1 text-main">
          ${p?.role === 'student' ? 'كورسات ' + escapeHtml(p.grade || 'صفك') : 'تصفح الكورسات'}
        </h1>
        <p class="text-sm text-muted">اختر الكورس المناسب لمرحلتك الدراسية وابدأ المذاكرة</p>
      </div>
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-64">
          <i class="fa-solid fa-search absolute right-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
          <input id="course-search" type="search" placeholder="ابحث عن كورس..." aria-label="ابحث عن كورس" class="input-field pr-10 text-sm">
        </div>
        <select id="course-sort" aria-label="ترتيب الكورسات" class="input-field w-auto text-sm font-bold">
          <option value="newest">الأحدث</option>
          <option value="price_asc">الأقل سعراً</option>
          <option value="price_desc">الأعلى سعراً</option>
        </select>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 animate-fade-up">
      <div class="flex flex-wrap items-center gap-2">
        <div id="price-filters" class="flex items-center gap-1 p-1 rounded-xl border border-border bg-[var(--color-third-container)]" role="group" aria-label="تصفية حسب السعر">
          <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white transition" data-price="all">الكل</button>
          <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-lg text-muted hover:text-main transition" data-price="free">مجاني</button>
          <button type="button" class="px-3 py-1.5 text-xs font-bold rounded-lg text-muted hover:text-main transition" data-price="paid">مدفوع</button>
        </div>
        ${grades.length > 1 ? `<div id="course-chips" class="flex gap-2 overflow-x-auto py-1"><button type="button" class="chip active" data-g="">كل المراحل</button>${grades.map((g) => `<button type="button" class="chip" data-g="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('')}</div>` : ''}
      </div>
      <p id="courses-count" class="text-sm font-bold text-muted tabular-nums"></p>
    </div>

    <div id="courses-list-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up"></div>`;

  const grid = el.querySelector('#courses-list-grid');
  const searchInp = el.querySelector('#course-search');
  const sortSel = el.querySelector('#course-sort');
  const countEl = el.querySelector('#courses-count');
  let activeGrade = '';
  let activePrice = 'all';

  const renderGrid = () => {
    const list = filterCourses(baseList, {
      grade: activeGrade,
      query: searchInp?.value || '',
      priceType: activePrice,
      sortBy: sortSel?.value || 'newest'
    });
    if (countEl) countEl.textContent = `${list.length} كورس`;
    grid.innerHTML = list.length
      ? list
          .map(
            (c) => `
        <a href="#/courses/${encodeURIComponent(c.id)}" class="course-card group">
          <div class="pic">
            ${
              c.image
                ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.title)}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=&quot;w-full h-full flex items-center justify-center text-5xl text-white&quot; style=&quot;background:linear-gradient(135deg,#0171dd,#41d6ff)&quot;><i class=&quot;fa-solid fa-book-open&quot;></i></div>'">`
                : `<div class="w-full h-full flex items-center justify-center text-5xl text-white" style="background:linear-gradient(135deg,#0171dd,#41d6ff)"><i class="fa-solid fa-book-open"></i></div>`
            }
          </div>
          <div class="body">
            <p class="text-xs font-bold text-muted">${escapeHtml(c.grade || 'عام')}</p>
            <h3 class="font-head text-lg text-main truncate">${escapeHtml(c.title)}</h3>
            ${c.description ? `<p class="text-xs text-muted line-clamp-2">${escapeHtml(c.description)}</p>` : ''}
            <div class="mt-auto pt-3 border-t border-border flex items-center justify-between">
              <span class="text-primary font-black text-xl tabular-nums">${c.price === 0 ? 'مجاني' : formatMoney(c.price)}</span>
              <span class="text-xs font-bold text-primary flex items-center gap-1">عرض الكورس <i class="fa-solid fa-arrow-left"></i></span>
            </div>
          </div>
        </a>`
          )
          .join('')
      : `<div class="glass-card p-12 text-center text-muted col-span-full">لا توجد كورسات مطابقة للبحث</div>`;
  };

  renderGrid();
  if (searchInp) searchInp.oninput = renderGrid;
  if (sortSel) sortSel.onchange = renderGrid;

  el.querySelectorAll('#price-filters [data-price]').forEach((btn) => {
    btn.onclick = () => {
      activePrice = btn.dataset.price;
      el.querySelectorAll('#price-filters [data-price]').forEach((x) => {
        const active = x.dataset.price === activePrice;
        x.className = active
          ? 'px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white transition'
          : 'px-3 py-1.5 text-xs font-bold rounded-lg text-muted hover:text-main transition';
      });
      renderGrid();
    };
  });

  el.querySelectorAll('#course-chips .chip').forEach((btn) => {
    btn.onclick = () => {
      activeGrade = btn.dataset.g;
      el.querySelectorAll('#course-chips .chip').forEach((x) => x.classList.toggle('active', x.dataset.g === activeGrade));
      renderGrid();
    };
  });
}

async function courseDetail(el, id) {
  const { data: course, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error || !course) {
    el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 text-center mt-8"><p class="text-red-500 font-bold mb-4">الكورس غير موجود</p><a href="#/courses" class="btn-primary">رجوع للكورسات</a></div>`;
    return;
  }

  const { data: lectures } = await supabase.from('lectures').select('*').eq('course_id', id).order('created_at');
  const p = store.profile;
  const staff = p && ['teacher', 'assistant', 'super_admin', 'admin'].includes(p.role);
  const enrolled = p?.enrolled_courses?.includes(id);

  let lastLectureId = null;
  let completedIds = [];
  let completedCount = 0;

  if (enrolled && p) {
    const { data: lastLect } = await supabase.rpc('get_last_lecture', { student_id_input: p.id, course_id_input: id });
    if (lastLect) lastLectureId = lastLect;

    const { data: prog } = await supabase.from('student_progress').select('lecture_id').eq('student_id', p.id);
    if (prog) {
      completedIds = prog.map((x) => x.lecture_id);
      completedCount = (lectures || []).filter((l) => completedIds.includes(l.id)).length;
    }
  }

  const progressPercent = lectures?.length ? Math.round((completedCount / lectures.length) * 100) : 0;
  const walletBalance = Number(p?.wallet || 0);
  const needsRecharge = p && !staff && !enrolled && Number(course.price || 0) > 0 && walletBalance < Number(course.price || 0);
  const shortfall = Math.max(0, Number(course.price || 0) - walletBalance);

  el.innerHTML = `
    <div class="animate-fade-up">
      <div class="mb-4">
        <a href="#/courses" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right ml-1"></i> كل الكورسات</a>
      </div>

      <div class="glass-card p-6 md:p-8 mb-8">
        <div class="flex flex-col md:flex-row gap-8 items-start">
          <div class="w-full md:w-1/3 h-52 rounded-xl overflow-hidden bg-soft shrink-0">
            ${
              course.image
                ? `<img src="${escapeHtml(course.image)}" alt="${escapeHtml(course.title)}" referrerpolicy="no-referrer" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center text-6xl text-white" style="background:linear-gradient(135deg,#0171dd,#41d6ff)"><i class="fa-solid fa-book-open"></i></div>`
            }
          </div>
          <div class="flex-1 w-full">
            <p class="text-xs font-bold text-primary mb-2">${escapeHtml(course.grade || 'كل المراحل')}</p>
            <h1 class="text-3xl font-black mb-3 text-main">${escapeHtml(course.title)}</h1>
            <p class="text-muted mb-6 leading-relaxed">${escapeHtml(course.description || 'محتوى تعليمي متكامل يشمل الشرح والتدريبات والاختبارات.')}</p>
            <div class="flex flex-wrap items-center gap-4">
              <span class="text-2xl font-black text-primary tabular-nums">${course.price === 0 ? 'مجاني' : formatMoney(course.price)}</span>
              ${
                !p
                  ? `<a href="#/login" class="btn-primary">سجّل دخول للاشتراك</a>`
                  : staff || enrolled || course.price === 0
                  ? `<span class="text-sm font-bold text-green-600 dark:text-green-400"><i class="fa-solid fa-circle-check ml-1"></i> ${staff ? 'صلاحية إدارة' : enrolled ? 'مشترك بالفعل' : 'متاح مجاناً'}</span>`
                  : `<button id="enroll-btn" type="button" class="btn-primary">اشترك الآن</button>`
              }
              ${
                needsRecharge
                  ? `<button id="recharge-inline-btn" type="button" class="btn-outline text-sm"><i class="fa-solid fa-ticket"></i> شحن المحفظة بكود</button>`
                  : ''
              }
            </div>
            ${
              p && !staff && !enrolled && Number(course.price || 0) > 0
                ? `<p class="text-xs font-bold text-muted mt-3 tabular-nums">رصيد محفظتك الحالي: <span class="text-main">${formatMoney(walletBalance)}</span>${needsRecharge ? ` · تحتاج <span class="text-amber-600 dark:text-amber-400">${formatMoney(shortfall)}</span> إضافية للاشتراك` : ' · الرصيد كافٍ للاشتراك'}</p>`
                : ''
            }
          </div>
        </div>

        ${
          enrolled
            ? `
          <div class="mt-8 pt-6 border-t border-border">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-muted">تقدمك في الكورس</span>
              <span class="text-sm font-bold text-primary tabular-nums">${progressPercent}%</span>
            </div>
            <div class="w-full bg-black/10 dark:bg-white/10 rounded-full h-3">
              <div class="bg-primary h-3 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
            ${lastLectureId ? `<button id="continue-btn" type="button" class="btn-accent w-full mt-4"><i class="fa-solid fa-play ml-2"></i> كمّل من حيث وقفت</button>` : ''}
          </div>
        `
            : ''
        }
      </div>

      <h2 class="text-2xl font-black mb-4 text-main tabular-nums">المحاضرات (${lectures?.length || 0})</h2>
      <div class="space-y-3">
        ${
          (lectures || [])
            .map((l, idx) => {
              const vids = (l.videos || []).length;
              const pdfs = (l.pdfs || []).length;
              const exams = (l.mcq_exams || []).length;
              const essays = (l.essay_exams || []).length;
              const isDone = completedIds.includes(l.id);
              const meta = [
                `${vids} فيديو`,
                `${pdfs} مذكرة`,
                exams ? `${exams} امتحان` : '',
                essays ? `${essays} واجب` : '',
                l.is_preview ? 'معاينة متاحة' : ''
              ]
                .filter(Boolean)
                .join(' · ');

              return `
          <div class="glass-card p-4 flex justify-between items-center gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <span class="w-9 h-9 rounded-lg bg-soft text-primary font-head text-sm flex items-center justify-center shrink-0 tabular-nums">${String(idx + 1).padStart(2, '0')}</span>
              <div class="min-w-0">
                <p class="font-bold text-main truncate">${escapeHtml(l.title)}</p>
                <p class="text-xs text-muted tabular-nums">${meta}${isDone ? ' · <span class="text-green-600 dark:text-green-400 font-bold"><i class="fa-solid fa-circle-check"></i> تم الإنجاز</span>' : ''}</p>
              </div>
            </div>
            ${
              p || course.price === 0 || l.is_preview
                ? `<a href="#/lesson/${encodeURIComponent(l.id)}" class="btn-primary text-sm px-4 py-1.5 shrink-0">دخول</a>`
                : `<a href="#/login" class="btn-outline text-sm px-4 py-1.5 shrink-0">سجّل دخول</a>`
            }
          </div>
        `;
            })
            .join('') || '<div class="glass-card p-8 text-muted text-center">لا توجد محاضرات متاحة حالياً</div>'
        }
      </div>
    </div>
  `;

  const rechargeBtn = el.querySelector('#recharge-inline-btn');
  if (rechargeBtn) {
    rechargeBtn.onclick = () => {
      openRedeemModal(async () => {
        const { route } = await import('../router.js');
        await route();
      });
    };
  }

  const eb = el.querySelector('#enroll-btn');
  if (eb) {
    eb.onclick = async () => {
      try {
        const { error: enrollErr } = await supabase.rpc('enroll_course', { course_id_input: id });
        if (enrollErr) throw new Error(enrollErr.message);
        toast('تم الاشتراك بنجاح', 'success');
        const { loadProfile } = await import('../auth.js');
        await loadProfile();
        const { renderHeader } = await import('../ui.js');
        await renderHeader();
        const { route } = await import('../router.js');
        await route();
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  }

  const cb = el.querySelector('#continue-btn');
  if (cb && lastLectureId) {
    cb.onclick = () => {
      location.hash = '#/lesson/' + lastLectureId;
    };
  }
}
