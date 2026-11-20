import { supabase, store, SUPABASE_URL } from '../config.js';
import { escapeHtml, watermark, lockExamPage } from '../utils.js';
import { toast, modal, confirmModal } from '../ui.js';

export default async function examView(el, params) {
  const p = store.profile;
  if (!p || p.role !== 'student') {
    el.innerHTML = `<div class="text-center py-20 text-red-500"><i class="fa-solid fa-lock text-6xl mb-4"></i><h2 class="text-2xl font-bold">غير مصرح</h2><p class="text-muted mt-2">يجب تسجيل الدخول كطالب لأداء الامتحان</p><a href="#/login" class="btn-primary inline-block mt-4">تسجيل الدخول</a></div>`;
    return;
  }

  const [lectureId, examId] = params;

  const { data: existing } = await supabase.from('exam_submissions')
    .select('*').eq('student_id', p.id)
    .eq('lecture_id', lectureId).eq('exam_id', examId).eq('type', 'mcq').maybeSingle();

  if (existing) {
    el.innerHTML = `
      <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
        <i class="fa-solid fa-circle-check text-green-500 text-6xl mb-4"></i>
        <h2 class="text-2xl font-bold mb-2 text-main">لقد سلّمت هذا الامتحان بالفعل</h2>
        <p class="text-lg mb-6 text-muted">الدرجة: <strong class="text-primary text-2xl tabular-nums">${existing.score ?? '-'} / ${existing.total ?? '-'}</strong></p>
        <a href="${existing.course_id ? `#/courses/${existing.course_id}` : `#/lesson/${lectureId}`}" class="btn-primary">رجوع</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const exam = (lecture?.mcq_exams || []).find(x => x.id === examId);
  if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 text-center"><p class="text-red-500 font-bold mb-4">الامتحان غير موجود أو لا يحتوي على أسئلة</p><a href="#/lesson/${encodeURIComponent(lectureId)}" class="btn-primary">رجوع للمحاضرة</a></div>`;
    return;
  }

  lockExamPage();
  let current = 0;
  const answers = new Array(exam.questions.length).fill(null);
  let timeLeft = (exam.duration || 10) * 60;
  let isSubmitted = false;
  let exitWarnings = 0;

  el.innerHTML = `
    <div class="max-w-3xl mx-auto relative animate-fade-up" id="exam-wrap">
      <div class="glass-card p-6 relative">
        <div class="flex justify-between items-center gap-3 mb-5 border-b border-border pb-4">
          <h1 class="text-xl font-black text-main">${escapeHtml(exam.title)}</h1>
          <div class="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg font-black border border-red-500/20 tabular-nums shrink-0" id="timer">--:--</div>
        </div>
        <div class="mb-5">
          <div class="bg-black/5 dark:bg-soft rounded-full h-2 overflow-hidden">
            <div id="progress" class="bg-primary h-full transition-all duration-300" style="width:0%"></div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
            <p class="text-sm text-muted font-bold tabular-nums" id="qcount"></p>
            <p class="text-xs text-muted font-bold tabular-nums" id="answered-count"></p>
          </div>
          <div id="q-nav" class="flex flex-wrap gap-1.5 mt-3" role="navigation" aria-label="قائمة الأسئلة"></div>
        </div>

        <div id="question" class="min-h-[200px]"></div>

        <div class="flex flex-wrap justify-between items-center gap-3 mt-8 pt-4 border-t border-border">
          <button id="prev" type="button" class="px-5 py-2 rounded-lg bg-black/5 dark:bg-soft hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold transition text-main">السابق</button>
          <div class="flex flex-wrap gap-2">
            <button id="skip" type="button" class="px-5 py-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm font-bold hover:bg-yellow-500/20 transition">تخطي</button>
            <button id="next" type="button" class="px-5 py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition">التالي</button>
            <button id="submit" type="button" class="btn-accent text-sm">تسليم نهائي</button>
          </div>
        </div>
      </div>
    </div>`;

  watermark(el.querySelector('#exam-wrap'), p.name + ' - ' + (p.phone || ''));

  const qbox = el.querySelector('#question');
  const timer = el.querySelector('#timer');
  const progress = el.querySelector('#progress');
  const qcount = el.querySelector('#qcount');
  const answeredCountEl = el.querySelector('#answered-count');
  const qNav = el.querySelector('#q-nav');

  function isAnswered(val) {
    return val !== null && val !== undefined && String(val).trim() !== '';
  }

  function render() {
    const q = exam.questions[current];
    const answeredTotal = answers.filter(isAnswered).length;
    qcount.textContent = `السؤال ${current + 1} من ${exam.questions.length}`;
    answeredCountEl.textContent = `تمت الإجابة: ${answeredTotal} / ${exam.questions.length}`;
    progress.style.width = `${((current + 1) / exam.questions.length) * 100}%`;

    qNav.innerHTML = exam.questions
      .map((_, idx) => {
        const active = idx === current;
        const done = isAnswered(answers[idx]);
        const cls = active
          ? 'bg-primary text-white border-primary'
          : done
          ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40'
          : 'bg-soft text-muted border-border hover:border-primary';
        return `<button type="button" data-qjump="${idx}" aria-label="الانتقال إلى السؤال ${idx + 1}" ${active ? 'aria-current="step"' : ''} class="w-9 h-9 rounded-lg border text-xs font-bold tabular-nums transition ${cls}">${idx + 1}</button>`;
      })
      .join('');

    qNav.querySelectorAll('[data-qjump]').forEach((btn) => {
      btn.onclick = () => {
        current = +btn.dataset.qjump;
        render();
      };
    });

    qbox.innerHTML = `
      ${q.image ? `<img src="${escapeHtml(q.image)}" alt="صورة السؤال" class="max-h-48 rounded-lg mb-4 border border-border">` : ''}
      <h2 class="font-bold text-lg mb-6 leading-relaxed text-main">${escapeHtml(q.questionText)}</h2>
      ${q.type === 'essay' ? `
        <textarea id="essay-ans" rows="5" class="input-field w-full" placeholder="اكتب إجابتك هنا...">${escapeHtml(answers[current] || '')}</textarea>
      ` : `
        <div class="space-y-3">
          ${(q.options||[]).map((o, i) => `
            <label class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${answers[current] === i ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:bg-black/5 dark:hover:bg-soft'}">
              <input type="radio" name="ans" ${answers[current] === i ? 'checked' : ''} value="${i}" class="w-4 h-4 accent-blue-500" data-opt="${i}">
              <span class="font-bold text-main">${escapeHtml(o.text)}</span>
            </label>`).join('')}
        </div>
      `}`;

    qbox.querySelectorAll('[data-opt]').forEach(radio => {
      radio.onchange = () => {
        answers[current] = +radio.dataset.opt;
        render();
      };
    });

    const essayInp = qbox.querySelector('#essay-ans');
    if (essayInp) {
      essayInp.oninput = () => {
        answers[current] = essayInp.value;
        const doneCount = answers.filter(isAnswered).length;
        answeredCountEl.textContent = `تمت الإجابة: ${doneCount} / ${exam.questions.length}`;
      };
    }
  }
  render();

  el.querySelector('#prev').onclick = () => { if (current > 0) { current--; render(); } };
  el.querySelector('#next').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#skip').onclick = () => { if (current < exam.questions.length - 1) { current++; render(); } };
  el.querySelector('#submit').onclick = async () => {
    const answeredTotal = answers.filter(isAnswered).length;
    const remaining = exam.questions.length - answeredTotal;
    const msg = remaining > 0
      ? `أجبت عن ${answeredTotal} من ${exam.questions.length} سؤالاً، ويتبقى ${remaining} أسئلة دون إجابة. هل تريد التسليم الآن؟`
      : `أجبت عن جميع الأسئلة (${exam.questions.length}). هل تريد التسليم النهائي الآن؟`;
    const ok = await confirmModal({
      title: 'تأكيد تسليم الامتحان',
      message: msg,
      confirmText: 'تسليم نهائي',
      cancelText: 'مراجعة الإجابات'
    });
    if (ok) submitExam();
  };

  const intv = setInterval(() => {
    timeLeft--;
    const m = Math.floor(Math.max(0, timeLeft) / 60), s = Math.max(0, timeLeft) % 60;
    timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeLeft <= 0) { clearInterval(intv); submitExam(true); }
  }, 1000);

  const visibilityHandler = () => {
    if (document.hidden && !isSubmitted) {
      exitWarnings++;
      if (exitWarnings === 1) {
        modal({
          title: 'تنبيه مراقبة الامتحان',
          body: '<p class="text-main leading-relaxed">لقد غادرت صفحة الامتحان. في المرة القادمة سيتم تسليم الامتحان تلقائياً.</p>',
          actions: '<button type="button" onclick="this.closest(\'.fixed\').remove()" class="btn-primary text-sm">فهمت، متابعة الامتحان</button>'
        });
      } else {
        toast('تم رصد مغادرة أخرى — جاري التسليم التلقائي', 'warn');
        submitExam(true);
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('hashchange', () => {
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);
  }, { once: true });

  async function submitExam(force = false) {
    if (isSubmitted) return;
    isSubmitted = true;
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit_exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lecture_id: lectureId,
          exam_id: examId,
          answers: answers
        })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'فشل تسليم الامتحان');

      el.innerHTML = `
        <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
          <i class="fa-solid fa-circle-check text-green-500 text-6xl mb-4"></i>
          <h2 class="text-2xl font-bold mb-2 text-main">${force ? 'تم التسليم التلقائي' : 'تم التسليم بنجاح'}</h2>
          <p class="text-lg mb-6 text-muted">درجتك: <strong class="text-primary text-3xl tabular-nums">${out.score} / ${out.total}</strong></p>
          <a href="#/courses/${lecture.course_id}" class="btn-primary">رجوع للكورس</a>
        </div>`;
    } catch (e) { toast(e.message, 'error'); isSubmitted = false; }
  }
}
