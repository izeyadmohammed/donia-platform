import { supabase, store } from '../config.js';
import { escapeHtml, lockExamPage, watermark, calcAssignmentMcqScore } from '../utils.js';
import { toast, modal, confirmModal } from '../ui.js';

export default async function assignmentView(el, params) {
  const p = store.profile;
  if (!p || p.role !== 'student') {
    el.innerHTML = `<div class="text-center py-20 text-red-500"><i class="fa-solid fa-lock text-6xl mb-4"></i><h2 class="text-2xl font-bold">غير مصرح</h2><p class="text-muted mt-2">يجب تسجيل الدخول كطالب لتسليم الواجب</p><a href="#/login" class="btn-primary inline-block mt-4">تسجيل الدخول</a></div>`;
    return;
  }

  const [lectureId, examId] = params;

  const { data: existing } = await supabase.from('exam_submissions')
    .select('*').eq('student_id', p.id)
    .eq('lecture_id', lectureId).eq('exam_id', examId).eq('type','essay').maybeSingle();

  if (existing) {
    el.innerHTML = `
      <div class="glass-card max-w-lg mx-auto p-8 text-center animate-fade-up">
        <i class="fa-solid fa-circle-check text-green-400 text-6xl mb-4"></i>
        <h2 class="text-2xl font-bold mb-2 text-main">تم التسليم مسبقاً</h2>
        <p class="text-muted mb-2">الحالة: <strong class="text-main">${escapeHtml(existing.status)}</strong></p>
        ${existing.status === 'تم التصحيح' ? `<p class="text-green-400 font-black text-2xl mb-4">الدرجة: ${existing.grade ?? '-'}</p>` : ''}
        ${existing.teacher_note ? `<p class="text-sm bg-soft p-3 rounded-lg mb-4 text-muted">ملاحظة المدرس: ${escapeHtml(existing.teacher_note)}</p>` : ''}
        ${existing.answer && existing.answer.startsWith('http') ? `<img src="${existing.answer}" class="max-h-48 mx-auto rounded-lg mb-4 border border-border">` : ''}
        <a href="${existing.course_id ? `#/courses/${existing.course_id}` : `#/lesson/${lectureId}`}" class="btn-primary">رجوع</a>
      </div>`;
    return;
  }

  const { data: lecture } = await supabase.from('lectures').select('*').eq('id', lectureId).single();
  const ex = (lecture?.essay_exams || []).find(x => x.id === examId);
  if (!ex) { el.innerHTML = `<p class="text-center py-10 text-red-400">الواجب غير موجود</p>`; return; }

  lockExamPage();
  let timeLeft = (ex.duration || 30) * 60;
  let isSubmitted = false;
  let exitWarnings = 0;
  let uploadedImageUrl = '';
  
  // مصفوفة لحفظ إجابات الأسئلة الاختيارية
  const mcqAnswers = new Array((ex.questions || []).length).fill(null);

  el.innerHTML = `
    <div class="glass-card max-w-3xl mx-auto p-8 relative animate-fade-up" id="assign-wrap">
      <div class="flex justify-between items-center mb-6 border-b border-border pb-4">
        <h1 class="text-xl font-black text-main">${escapeHtml(ex.title)}</h1>
        <div class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-black border border-red-500/30" id="timer">--:--</div>
      </div>

      ${ex.image ? `<img src="${ex.image}" class="max-h-64 rounded-lg mb-4 border border-border">` : ''}
      
      ${ex.question ? `<p class="text-muted mb-6 leading-relaxed whitespace-pre-wrap">${escapeHtml(ex.question)}</p>` : ''}

      <!-- قسم الأسئلة الاختيارية -->
      ${(ex.questions || []).length > 0 ? `
        <div class="mb-8">
          <h3 class="text-lg font-bold mb-4 text-blue-400 border-b border-blue-500/20 pb-2">الأسئلة الاختيارية</h3>
          <div id="mcq-container" class="space-y-6"></div>
        </div>
      ` : ''}

      <!-- قسم الإجابة المقالية (لو فيه سؤال مقالي مكتوب) -->
      ${ex.question ? `
        <div class="mb-6">
          <h3 class="text-lg font-bold mb-4 text-green-400 border-b border-green-500/20 pb-2">إجابتك المقالية</h3>
          <textarea id="ans" rows="5" placeholder="اكتب إجابتك هنا..." class="input-field mb-4"></textarea>
          
          <div class="bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-border mb-6 text-center">
            <p class="text-sm text-muted mb-2 font-bold">أو ارفع صورة للإجابة (اختياري)</p>
            <div class="flex justify-center gap-4">
              <label class="cursor-pointer bg-blue-500/10 text-blue-500 rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-blue-500/20">
                <i class="fa-solid fa-image"></i> من المعرض
                <input type="file" id="img-file" class="hidden" accept="image/*">
              </label>
              <label class="cursor-pointer bg-green-500/10 text-green-500 rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-green-500/20">
                <i class="fa-solid fa-camera"></i> الكاميرا
                <input type="file" id="cam-file" class="hidden" accept="image/*" capture="environment">
              </label>
            </div>
            <div id="img-preview" class="mt-3 hidden"><img src="" class="max-h-40 mx-auto rounded-lg border border-border"></div>
          </div>
        </div>
      ` : ''}

      <button id="sub" class="btn-accent w-full py-3">تسليم الواجب</button>
    </div>`;

  watermark(el.querySelector('#assign-wrap'), p.name + ' - ' + (p.phone||''));
  const timer = el.querySelector('#timer');
  const imgPrev = el.querySelector('#img-preview');
  const mcqContainer = el.querySelector('#mcq-container');

  // رسم الأسئلة الاختيارية
  if (mcqContainer) {
    (ex.questions || []).forEach((q, qi) => {
      const qDiv = document.createElement('div');
      qDiv.dataset.qCard = '1';
      qDiv.className = 'bg-black/5 dark:bg-black/20 p-4 rounded-xl border border-border';
      qDiv.innerHTML = `
        <p class="font-bold mb-3 text-main">${qi + 1}. ${escapeHtml(q.questionText)}</p>
        <div class="space-y-2">
          ${(q.options || []).map((o, oi) => `
            <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${mcqAnswers[qi] === oi ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-black/5 dark:hover:bg-soft border border-transparent'}">
              <input type="radio" name="mcq_${qi}" value="${oi}" ${mcqAnswers[qi] === oi ? 'checked' : ''} class="w-4 h-4 accent-blue-500" data-q="${qi}" data-o="${oi}">
              <span class="text-main">${escapeHtml(o.text)}</span>
            </label>
          `).join('')}
        </div>
      `;
      mcqContainer.appendChild(qDiv);
    });

    // ربط الأحداث
    mcqContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.onchange = () => {
        const qi = +radio.dataset.q;
        mcqAnswers[qi] = +radio.dataset.o;
        const parentDiv = radio.closest('[data-q-card]');
        parentDiv?.querySelectorAll('label').forEach(l => {
          l.className = 'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition hover:bg-black/5 dark:hover:bg-soft border border-transparent';
        });
        radio.closest('label').className = 'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition bg-blue-500/20 border border-blue-500/30';
      };
    });
  }

  // رفع الصورة
  const handleImage = async (file) => {
    if (!file) return;
    toast('جاري رفع الصورة...', 'info');
    const fileName = `ans_${p.id}_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل رفع الصورة', 'error'); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    uploadedImageUrl = data.publicUrl;
    imgPrev.innerHTML = `<img src="${uploadedImageUrl}" class="max-h-40 mx-auto rounded-lg border border-border">`;
    imgPrev.classList.remove('hidden');
    toast('تم رفع الصورة', 'success');
  };

  const imgFile = el.querySelector('#img-file');
  const camFile = el.querySelector('#cam-file');
  if (imgFile) imgFile.onchange = (e) => handleImage(e.target.files[0]);
  if (camFile) camFile.onchange = (e) => handleImage(e.target.files[0]);

  const intv = setInterval(() => {
    timeLeft--;
    const m = Math.floor(Math.max(0, timeLeft) / 60), s = Math.max(0, timeLeft) % 60;
    timer.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timeLeft <= 0) { clearInterval(intv); submit(true); }
  }, 1000);

  const visibilityHandler = () => {
    if (document.hidden && !isSubmitted) {
      exitWarnings++;
      if (exitWarnings === 1) {
        modal({
          title: 'تنبيه مراقبة الواجب',
          body: '<p class="text-main leading-relaxed">لقد غادرت صفحة الواجب. في المرة القادمة سيتم التسليم تلقائياً.</p>',
          actions: '<button type="button" onclick="this.closest(\'.fixed\').remove()" class="btn-primary text-sm">فهمت، متابعة الحل</button>'
        });
      } else {
        toast('تم رصد مغادرة أخرى — جاري التسليم التلقائي', 'warn');
        submit(true);
      }
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('hashchange', () => {
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);
  }, { once: true });

  async function submit(force = false) {
    if (isSubmitted) return;
    const textAnswer = el.querySelector('#ans')?.value.trim() || '';
    
    if (!force && !textAnswer && !uploadedImageUrl && (ex.questions || []).length === 0) { 
      toast('يجب كتابة إجابة أو رفع صورة', 'warn'); return; 
    }

    isSubmitted = true;
    clearInterval(intv);
    document.removeEventListener('visibilitychange', visibilityHandler);

    try {
      const mcqResult = calcAssignmentMcqScore(ex.questions || [], mcqAnswers);
      const finalAnswer = uploadedImageUrl ? uploadedImageUrl : textAnswer;
      const mcqHeader = mcqResult.total ? `الاختياري: ${mcqResult.correct}/${mcqResult.total}\n${mcqResult.summary}\n\n` : '';
      const fullAnswer = mcqHeader + (finalAnswer ? `المقالي: ${finalAnswer}` : '');

      const { error } = await supabase.from('exam_submissions').insert({
        id: 'sub_' + Date.now(), 
        type: 'essay',
        student_id: p.id, 
        student_name: p.name,
        course_id: lecture.course_id, 
        lecture_id: lectureId, 
        exam_id: examId,
        answer: fullAnswer || '(تم التسليم تلقائياً - بدون إجابة)', 
        status: 'جاري التصحيح'
      });
      
      if (error) throw new Error(error.message);

      const { data: prog } = await supabase.from('student_progress').select('id').eq('student_id', p.id).eq('lecture_id', lectureId).maybeSingle();
      if (prog) await supabase.from('student_progress').update({ assignment_submitted: true }).eq('id', prog.id);
      else await supabase.from('student_progress').insert({ student_id: p.id, lecture_id: lectureId, assignment_submitted: true });

      toast(force ? 'تم التسليم التلقائي' : 'تم تسليم الواجب', 'success');
      location.hash = `#/courses/${lecture.course_id}`;
    } catch (e) { 
      toast(e.message, 'error'); 
      isSubmitted = false; 
    }
  }

  el.querySelector('#sub').onclick = async () => {
    const ok = await confirmModal({
      title: 'تأكيد تسليم الواجب',
      message: 'هل أنت متأكد من تسليم الواجب النهائي؟ لن تتمكن من تعديل إجاباتك بعد التسليم.',
      confirmText: 'تسليم الواجب',
      cancelText: 'مراجعة الحل'
    });
    if (ok) submit();
  };
}
