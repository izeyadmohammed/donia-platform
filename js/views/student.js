import { supabase, store } from '../config.js';
import { escapeHtml, formatMoney, formatDate, computeStudentSummary } from '../utils.js';
import { toast, modal, openRedeemModal } from '../ui.js';

export default async function studentView(el) {
  if (!store.profile || store.profile.role !== 'student') {
    el.innerHTML = `<div class="text-center py-20 text-red-500"><i class="fa-solid fa-lock text-6xl mb-4"></i><h2 class="text-2xl font-bold">غير مصرح</h2><p class="text-muted mt-2">يجب تسجيل الدخول كطالب</p><a href="#/login" class="btn-primary inline-block mt-4">تسجيل الدخول</a></div>`;
    return;
  }

  const p = store.profile;
  const enrolledIds = p.enrolled_courses || [];
  const myCourses = store.courses.filter((c) => enrolledIds.includes(c.id));

  const [{ data: txs }, { data: subs }, { data: progRows }, { data: courseLectures }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', p.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('exam_submissions').select('*').eq('student_id', p.id).order('submitted_at', { ascending: false }),
    supabase.from('student_progress').select('lecture_id').eq('student_id', p.id),
    enrolledIds.length
      ? supabase.from('lectures').select('id, course_id').in('course_id', enrolledIds)
      : Promise.resolve({ data: [] })
  ]);

  const completedSet = new Set((progRows || []).map((r) => r.lecture_id));
  const summary = computeStudentSummary(store.courses, enrolledIds, subs || []);

  el.innerHTML = `
    <div class="animate-fade-up space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="glass-card p-5 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-muted">كورساتي المشتركة</p>
            <p class="text-3xl font-black text-primary mt-1 tabular-nums">${summary.enrolledCount}</p>
          </div>
          <i class="fa-solid fa-book-open text-2xl text-primary/70"></i>
        </div>
        <div class="glass-card p-5 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-muted">امتحانات وواجبات مُسلّمة</p>
            <p class="text-3xl font-black text-main mt-1 tabular-nums">${summary.submissionsCount}</p>
          </div>
          <i class="fa-solid fa-clipboard-check text-2xl text-sky-500/80"></i>
        </div>
        <div class="glass-card p-5 flex items-center justify-between">
          <div>
            <p class="text-xs font-bold text-muted">متوسط الدرجات</p>
            <p class="text-3xl font-black text-green-600 dark:text-green-400 mt-1 tabular-nums">${summary.avgPercent !== null ? summary.avgPercent + '%' : '-'}</p>
          </div>
          <i class="fa-solid fa-chart-line text-2xl text-green-500/80"></i>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card p-6 col-span-1 relative overflow-hidden">
          <div class="relative z-10 text-center">
            <div class="relative w-24 h-24 mx-auto mb-4">
              <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-sky-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30 overflow-hidden">
                ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-white"></i>`}
              </div>
              <button id="upload-profile" type="button" aria-label="تحديث الصورة الشخصية" class="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs border-2 border-white dark:border-gray-900 shadow-lg">
                <i class="fa-solid fa-camera"></i>
              </button>
            </div>
            <h2 class="text-2xl font-black mb-1 text-main">${escapeHtml(p.name)}</h2>
            <p class="text-sm text-muted mb-1 tabular-nums" dir="ltr">${escapeHtml(p.phone || '')}</p>
            <p class="text-sm text-muted mb-4">${escapeHtml(p.grade || '')}</p>

            <button id="wallet-btn" type="button" class="w-full bg-gradient-to-r from-green-500/15 to-emerald-500/15 hover:from-green-500/25 hover:to-emerald-500/25 border border-green-500/30 p-4 rounded-xl transition text-right group">
              <span class="text-xs text-green-600 dark:text-green-400 mb-1 flex justify-between items-center font-bold">
                <span>رصيد المحفظة</span>
                <i class="fa-solid fa-plus bg-green-500/20 w-6 h-6 rounded-full flex items-center justify-center text-xs group-hover:scale-110 transition"></i>
              </span>
              <span class="block text-3xl font-black text-green-600 dark:text-green-400 tabular-nums">${formatMoney(p.wallet)}</span>
            </button>
          </div>
        </div>

        <div class="glass-card p-6 md:col-span-2 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-lg text-main">كورساتي المشترك بها</h3>
              <a href="#/courses" class="text-xs font-bold text-primary hover:underline">تصفح كل الكورسات</a>
            </div>
            ${
              myCourses.length === 0
                ? `<div class="p-6 rounded-xl bg-soft text-center text-muted text-sm">
                    <p class="mb-3">لم تشترك في أي كورس بعد.</p>
                    <a href="#/courses" class="btn-primary text-xs px-4 py-2">استعرض الكورسات</a>
                  </div>`
                : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    ${myCourses
                      .map((c) => {
                        const totalLects = (courseLectures || []).filter((l) => l.course_id === c.id);
                        const doneLects = totalLects.filter((l) => completedSet.has(l.id)).length;
                        const pct = totalLects.length ? Math.round((doneLects / totalLects.length) * 100) : 0;
                        return `
                          <a href="#/courses/${encodeURIComponent(c.id)}" class="p-4 rounded-xl bg-soft border border-border hover:border-primary transition block">
                            <p class="font-bold text-main text-sm truncate mb-1">${escapeHtml(c.title)}</p>
                            <p class="text-xs text-muted mb-3 tabular-nums">${escapeHtml(c.grade || 'عام')} · ${doneLects}/${totalLects.length} محاضرة</p>
                            <div class="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mb-1.5">
                              <div class="bg-primary h-2 rounded-full" style="width:${pct}%"></div>
                            </div>
                            <div class="flex justify-between items-center text-xs font-bold">
                              <span class="text-primary tabular-nums">${pct}% مكتمل</span>
                              <span class="text-primary">دخول <i class="fa-solid fa-arrow-left"></i></span>
                            </div>
                          </a>`;
                      })
                      .join('')}
                  </div>`
            }
          </div>

          <div class="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <a href="#/courses" class="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition font-bold text-sm">
              <i class="fa-solid fa-book"></i> كل الكورسات
            </a>
            <button id="pw" type="button" class="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 transition font-bold text-sm">
              <i class="fa-solid fa-key"></i> تغيير كلمة المرور
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card p-6">
          <h3 class="font-bold text-lg mb-4 text-main">آخر المعاملات</h3>
          ${(txs || []).length === 0 ? '<p class="text-muted text-sm text-center py-4">لا توجد معاملات</p>' : `
            <div class="space-y-2">
              ${txs.map((t) => `
                <div class="flex justify-between items-center p-3 rounded-lg bg-soft border border-border text-sm">
                  <div>
                    <p class="font-bold text-main">${escapeHtml(t.note || '-')}</p>
                    <p class="text-xs text-muted">${formatDate(t.created_at)}</p>
                  </div>
                  <span class="${t.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-500'} font-black tabular-nums">
                    ${t.type === 'credit' ? '+' : '-'}${formatMoney(t.amount)}
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="glass-card p-6 md:col-span-2">
          <h3 class="font-bold text-lg mb-4 text-main">سجل الدرجات</h3>
          ${(subs || []).length === 0 ? '<p class="text-muted text-sm text-center py-4">لا توجد درجات</p>' : `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${subs.map((s) => `
                <div class="p-3 rounded-lg bg-soft border border-border text-sm">
                  <div class="flex justify-between items-start mb-2">
                    <p class="font-bold text-main">${escapeHtml(s.type === 'mcq' ? 'اختبار MCQ' : 'واجب')}</p>
                    <span class="text-xs font-bold ${s.status === 'تم التصحيح' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}">${escapeHtml(s.status)}</span>
                  </div>
                  <div class="flex justify-between items-end">
                    <p class="text-xs text-muted">${formatDate(s.submitted_at)}</p>
                    <span class="font-black text-lg text-primary tabular-nums">${s.grade ?? '-'} ${s.total ? ('/ ' + s.total) : ''}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  el.querySelector('#wallet-btn').onclick = () => {
    openRedeemModal(async () => {
      const { route } = await import('../router.js');
      await route();
    });
  };

  el.querySelector('#upload-profile').onclick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      toast('جاري رفع الصورة...', 'info');
      const fileName = `profile_${store.profile.id}_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) { toast('فشل الرفع', 'error'); return; }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      await supabase.from('profiles').update({ image: data.publicUrl }).eq('id', store.profile.id);
      store.profile.image = data.publicUrl;
      toast('تم تحديث الصورة', 'success');
      location.reload();
    };
    fileInput.click();
  };

  el.querySelector('#pw').onclick = () => {
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
