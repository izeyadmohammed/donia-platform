import { supabase, store, SUPABASE_URL } from '../config.js';
import { escapeHtml, formatMoney, formatDate, uid } from '../utils.js';
import { toast, modal, confirmModal } from '../ui.js';

export default async function adminView(el) {
  if (!store.profile || (store.profile.role !== 'super_admin' && store.profile.role !== 'admin')) {
    el.innerHTML = `<div class="text-center py-20 text-red-500"><i class="fa-solid fa-lock text-6xl mb-4"></i><h2 class="text-2xl font-bold">غير مصرح</h2><p class="text-muted mt-2">يجب تسجيل الدخول كمدرس</p><a href="#/login" class="btn-primary inline-block mt-4">تسجيل الدخول</a></div>`;
    return;
  }

  const hash = location.hash;
  if (hash === '#/admin/students') return renderStudents(el);
  if (hash === '#/admin/codes') return renderCodes(el);
  if (hash === '#/admin/verify-codes') return renderVerifyCodes(el);
  if (hash === '#/admin/assistants') return renderAssistants(el);
  if (hash === '#/admin/admins') return renderAdmins(el);
  return renderDashboard(el);
}

// ==========================================
// 1. لوحة التحكم الرئيسية (بإحصائيات)
// ==========================================
async function renderDashboard(el) {
  const { data: stats } = await supabase.rpc('get_admin_stats');
  const s = stats || { students: 0, teachers: 0, courses: 0, total_wallet: 0, total_revenue: 0 };

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up flex-wrap gap-2">
      <h1 class="text-3xl font-black text-main">لوحة <span class="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-sky-500">المدرس</span></h1>
      <button id="settings-btn" class="btn-primary text-sm"><i class="fa-solid fa-gear mr-2"></i> الإعدادات</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-up">
      ${statCard('fa-users', 'الطلاب', s.students, 'text-blue-500')}
      ${statCard('fa-book', 'الكورسات', s.courses, 'text-sky-500')}
      ${statCard('fa-wallet', 'إجمالي المحافظ', formatMoney(s.total_wallet), 'text-orange-500')}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-up">
      <div class="glass-card p-6 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <i class="fa-solid fa-money-bill-trend-up text-3xl text-emerald-500"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-muted">إجمالي المبيعات (الاشتراكات)</p>
            <p class="text-3xl font-black text-emerald-500">${formatMoney(s.total_revenue)}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-up">
      <a href="#/teacher/courses" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-book-open text-4xl text-blue-600 mb-3"></i>
        <h3 class="font-bold text-lg text-main">إدارة الكورسات</h3>
      </a>
      <a href="#/teacher/grading" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-file-signature text-4xl text-emerald-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">تصحيح الواجبات</h3>
      </a>
      <a href="#/admin/students" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-users text-4xl text-blue-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">الطلاب</h3>
      </a>
      <a href="#/admin/codes" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-ticket text-4xl text-sky-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">أكواد الشحن</h3>
      </a>
      <a href="#/admin/verify-codes" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-shield-halved text-4xl text-orange-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">أكواد التحقق</h3>
      </a>
      <a href="#/admin/assistants" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-user-group text-4xl text-teal-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">المساعدين</h3>
      </a>
      <a href="#/admin/admins" class="glass-card p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition">
        <i class="fa-solid fa-user-shield text-4xl text-red-500 mb-3"></i>
        <h3 class="font-bold text-lg text-main">الإداريين</h3>
      </a>
    </div>
  `;

  el.querySelector('#settings-btn').onclick = () => openSettingsModal();
}

// ==========================================
// 2. الطلاب (بيانات كاملة + إحصائيات + أزرار)
// ==========================================
async function renderStudents(el) {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'student');
  const { data: stats } = await supabase.rpc('get_students_detailed_stats');

  const statsMap = {};
  (stats || []).forEach(s => { statsMap[s.student_id] = s; });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-blue-500">الطلاب</span></h1>
      <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
    </div>
    <div class="mb-4 animate-fade-up">
      <div class="relative">
        <i class="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-muted"></i>
        <input id="search-student" type="text" placeholder="ابحث بالاسم أو رقم الهاتف..." class="w-full pr-12 pl-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-border focus:border-primary outline-none text-main">
      </div>
    </div>
    <div class="glass-card p-6 overflow-x-auto animate-fade-up">
      <table class="w-full text-right text-sm">
        <thead class="bg-black/5 dark:bg-white/5 text-muted">
          <tr>
            <th class="p-3 rounded-r-lg">الطالب</th>
            <th class="p-3">رقم ولي الأمر</th>
            <th class="p-3">الصف</th>
            <th class="p-3">الكورسات</th>
            <th class="p-3">الفيديوهات</th>
            <th class="p-3">الامتحانات</th>
            <th class="p-3">المحفظة</th>
            <th class="p-3 rounded-l-lg">إجراءات</th>
          </tr>
        </thead>
        <tbody id="students-tbody">
          ${(profiles || []).map(s => {
            const stat = statsMap[s.id] || {};
            return `
            <tr class="border-b border-border hover:bg-black/5 dark:hover:bg-white/5 transition">
              <td class="p-3">
                <p class="font-bold text-main">${escapeHtml(s.name)} ${s.isblocked ? '<span class="text-red-500 text-xs">(محظور)</span>' : ''}</p>
                <p class="text-xs text-muted" dir="ltr">${escapeHtml(s.phone || '')}</p>
              </td>
              <td class="p-3 text-muted" dir="ltr">${escapeHtml(s.parent_phone || '-')}</td>
              <td class="p-3 text-muted">${escapeHtml(s.grade || '-')}</td>
              <td class="p-3 text-blue-500 font-bold">${stat.courses_count || 0}</td>
              <td class="p-3 text-sky-500 font-bold">${stat.videos_watched || 0}</td>
              <td class="p-3 text-orange-500 font-bold">${stat.exams_taken || 0}</td>
              <td class="p-3 font-bold text-green-500">${formatMoney(s.wallet)}</td>
              <td class="p-3">
                <div class="flex gap-1 justify-end">
                  <button data-view="${s.id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="عرض"><i class="fa-solid fa-eye text-xs"></i></button>
                  <button data-edit="${s.id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" title="تعديل"><i class="fa-solid fa-pen text-xs"></i></button>
                  <button data-charge="${s.id}" class="w-8 h-8 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20" title="شحن"><i class="fa-solid fa-plus text-xs"></i></button>
                  <button data-block="${s.id}" data-blk="${s.isblocked}" class="w-8 h-8 rounded bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" title="حظر"><i class="fa-solid ${s.isblocked ? 'fa-unlock' : 'fa-ban'} text-xs"></i></button>
                  <button data-delu="${s.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20" title="حذف"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
              </td>
            </tr>
          `}).join('') || '<tr><td colspan="8" class="text-center p-4 text-muted">لا يوجد طلاب</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  // البحث
  const searchInput = el.querySelector('#search-student');
  const tbody = el.querySelector('#students-tbody');
  if (searchInput && tbody) {
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      tbody.querySelectorAll('tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    };
  }

  // زرار عرض التفاصيل
  el.querySelectorAll('[data-view]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.view;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
      const { data: subs } = await supabase.from('exam_submissions').select('*').eq('student_id', id);
      const m = modal({
        title: 'تفاصيل الطالب',
        body: `
          <div class="space-y-3">
            <p class="font-bold text-lg text-main">${escapeHtml(profile.name)}</p>
            <p class="text-muted text-sm" dir="ltr">${escapeHtml(profile.phone || '')}</p>
            <p class="text-muted text-sm">${escapeHtml(profile.grade || '')}</p>
            <p class="text-muted text-sm" dir="ltr">ولي الأمر: ${escapeHtml(profile.parent_phone || '-')}</p>
            <div class="h-px bg-border my-3"></div>
            <p class="font-bold text-main">آخر الامتحانات:</p>
            ${(subs || []).length ? subs.map(s => `
              <div class="flex justify-between p-2 bg-black/5 rounded text-sm">
                <span>${s.type}</span>
                <span class="font-bold">${s.score ?? '-'} / ${s.total ?? '-'}</span>
              </div>
            `).join('') : '<p class="text-muted text-sm">لا توجد امتحانات</p>'}
          </div>`
      });
    };
  });

  // زرار التعديل
  el.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.edit;
      const s = profiles.find(x => x.id === id);
      const m = modal({
        title: 'تعديل بيانات الطالب',
        body: `
          <div class="space-y-3">
            <input id="e-name" value="${escapeHtml(s.name)}" class="input-field">
            <input id="e-phone" value="${escapeHtml(s.phone || '')}" class="input-field" dir="ltr">
            <input id="e-parent" value="${escapeHtml(s.parent_phone || '')}" class="input-field" dir="ltr">
            <input id="e-grade" value="${escapeHtml(s.grade || '')}" class="input-field">
            <input id="e-pass" type="password" placeholder="كلمة مرور جديدة (اختياري)" class="input-field">
          </div>`,
        actions: `<button id="save" class="btn-primary w-full">حفظ</button>`
      });
      m.root.querySelector('#save').onclick = async () => {
        try {
          const updates = {
            name: m.root.querySelector('#e-name').value,
            phone: m.root.querySelector('#e-phone').value,
            parent_phone: m.root.querySelector('#e-parent').value,
            grade: m.root.querySelector('#e-grade').value
          };
          const newPass = m.root.querySelector('#e-pass').value;
          const { error } = await supabase.from('profiles').update(updates).eq('id', id);
          if (error) throw new Error(error.message);
          if (newPass.length >= 8) {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${SUPABASE_URL}/functions/v1/admin_update_user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
              body: JSON.stringify({ user_id: id, new_password: newPass })
            });
            if (!res.ok) throw new Error('فشل تغيير الباسورد');
          }
          toast('تم', 'success'); m.close(); location.reload();
        } catch (err) { toast(err.message, 'error'); }
      };
    };
  });

  // زرار الشحن
  el.querySelectorAll('[data-charge]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.charge;
      const m = modal({
        title: 'تعديل الرصيد', body: `<input id="amt" type="number" placeholder="المبلغ (سالب للخصم)" class="input-field">`,
        actions: `<button id="cb" class="btn-accent w-full">تنفيذ</button>`
      });
      m.root.querySelector('#cb').onclick = async () => {
        const amt = +m.root.querySelector('#amt').value;
        if (!amt) return;
        const { error } = await supabase.rpc('add_wallet_balance', { target_id: id, amt: amt, note_text: 'تعديل يدوي' });
        if (error) { toast(error.message, 'error'); return; }
        toast('تم', 'success'); m.close(); location.reload();
      };
    };
  });

  // زرار الحظر
  el.querySelectorAll('[data-block]').forEach(b => {
    b.onclick = async () => {
      const blk = b.dataset.blk === 'true';
      await supabase.from('profiles').update({ isblocked: !blk }).eq('id', b.dataset.block);
      toast('تم', 'success'); location.reload();
    };
  });

  // زرار الحذف
  el.querySelectorAll('[data-delu]').forEach(b => {
    b.onclick = async () => {
      const ok = await confirmModal({
        title: 'حذف الطالب',
        message: 'هل تريد حذف حساب هذا الطالب نهائياً؟',
        confirmText: 'حذف نهائي',
        danger: true
      });
      if (!ok) return;
      await supabase.from('profiles').delete().eq('id', b.dataset.delu);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 3. المدرسين
// ==========================================
async function renderTeachers(el) {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const teachers = (profiles || []).filter(p => p.role === 'teacher' || p.role === 'assistant');
  const { data: allCourses } = await supabase.from('courses').select('id, teacher_id');
  const { data: allStudents } = await supabase.from('profiles').select('enrolled_courses').eq('role', 'student');

  const teacherStudentsMap = {};
  teachers.forEach(t => {
    const teacherCourseIds = (allCourses || []).filter(c => c.teacher_id === t.id).map(c => c.id);
    const count = (allStudents || []).filter(s => (s.enrolled_courses || []).some(id => teacherCourseIds.includes(id))).length;
    teacherStudentsMap[t.id] = count;
  });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-green-500">المدرسين</span></h1>
      <div class="flex gap-2">
        <button id="add-teacher" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> إضافة</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
      ${teachers.map(t => `
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-14 h-14 rounded-full overflow-hidden bg-blue-500/20 flex items-center justify-center shrink-0">
             ${t.image ? `<img src="${escapeHtml(t.image)}" class="w-full h-full object-cover">` : `<span class="text-blue-500 font-bold text-xl">${(t.name||'?').charAt(0)}</span>`}
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-main">${escapeHtml(t.name)}</h3>
            <p class="text-xs text-muted">${escapeHtml(t.phone || '')} • ${t.role === 'assistant' ? 'مساعد' : (t.grade || 'مدرس')}</p>
            <p class="text-xs text-green-500 font-bold mt-1"><i class="fa-solid fa-users mr-1"></i> ${teacherStudentsMap[t.id] || 0} طالب</p>
          </div>
          <div class="flex gap-1">
            <button data-edit-teacher="${t.id}" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><i class="fa-solid fa-pen"></i></button>
            <button data-del-teacher="${t.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('') || '<p class="text-muted col-span-2 text-center">لا يوجد مدرسين</p>'}
    </div>
  `;

  el.querySelector('#add-teacher').onclick = () => openAddTeacherModal();
  el.querySelectorAll('[data-edit-teacher]').forEach(b => {
    b.onclick = () => openEditTeacherModal(profiles.find(x => x.id === b.dataset.editTeacher));
  });
  el.querySelectorAll('[data-del-teacher]').forEach(b => {
    b.onclick = async () => {
      const ok = await confirmModal({
        title: 'حذف المدرس',
        message: 'هل أنت متأكد من حذف هذا المدرس؟',
        confirmText: 'حذف',
        danger: true
      });
      if (!ok) return;
      await supabase.from('profiles').delete().eq('id', b.dataset.delTeacher);
      toast('تم', 'success'); location.reload();
    };
  });
}

// ==========================================
// 4. الأكواد
// ==========================================
async function renderCodes(el) {
  const { data: codes } = await supabase.from('codes').select('*').order('created_at', { ascending: false });
  const list = codes || [];
  let filter = 'all';

  el.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">أكواد <span class="text-sky-500">الشحن</span></h1>
      <div class="flex flex-wrap items-center gap-2">
        <button id="copy-unused-codes" type="button" class="btn-outline text-sm px-4 py-2"><i class="fa-solid fa-copy mr-1"></i> نسخ المتاح</button>
        <button id="gen-codes" type="button" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> توليد</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary px-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="flex gap-2 mb-4 animate-fade-up" role="group" aria-label="تصفية الأكواد">
      <button type="button" class="chip active" data-cfilter="all">الكل (${list.length})</button>
      <button type="button" class="chip" data-cfilter="unused">متاح (${list.filter(c => !c.used).length})</button>
      <button type="button" class="chip" data-cfilter="used">مستخدم (${list.filter(c => c.used).length})</button>
    </div>
    <div class="glass-card p-6 animate-fade-up">
      <div id="codes-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"></div>
    </div>
  `;

  const grid = el.querySelector('#codes-grid');
  const drawCodes = () => {
    const filtered = list.filter(c => (filter === 'unused' ? !c.used : filter === 'used' ? c.used : true));
    grid.innerHTML = filtered.map(c => `
      <div class="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border flex justify-between items-center gap-2">
        <div>
          <p class="font-mono text-sm text-main font-bold" dir="ltr">${escapeHtml(c.code)}</p>
          <p class="text-xs font-bold ${c.used ? 'text-red-500' : 'text-green-600 dark:text-green-400'}">${c.used ? 'مستخدم' : 'متاح'}</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="text-left">
            <p class="font-bold text-green-600 dark:text-green-400 tabular-nums">${formatMoney(c.amount)}</p>
            <button type="button" data-del-code="${c.id}" class="text-red-500 text-xs mt-1 hover:underline">حذف</button>
          </div>
          <button type="button" data-copy-charge="${escapeHtml(c.code)}" aria-label="نسخ الكود" class="w-8 h-8 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center"><i class="fa-solid fa-copy text-xs"></i></button>
        </div>
      </div>
    `).join('') || '<p class="text-muted col-span-3 text-center py-6">لا توجد أكواد مطابقة</p>';

    grid.querySelectorAll('[data-copy-charge]').forEach(b => {
      b.onclick = () => {
        navigator.clipboard?.writeText(b.dataset.copyCharge);
        toast('تم نسخ الكود', 'success');
      };
    });
    grid.querySelectorAll('[data-del-code]').forEach(b => {
      b.onclick = async () => {
        const ok = await confirmModal({
          title: 'حذف الكود',
          message: 'هل تريد حذف كود الشحن هذا نهائياً؟',
          confirmText: 'حذف',
          danger: true
        });
        if (!ok) return;
        await supabase.from('codes').delete().eq('id', b.dataset.delCode);
        toast('تم', 'success'); location.reload();
      };
    });
  };
  drawCodes();

  el.querySelectorAll('[data-cfilter]').forEach(btn => {
    btn.onclick = () => {
      filter = btn.dataset.cfilter;
      el.querySelectorAll('[data-cfilter]').forEach(x => x.classList.toggle('active', x.dataset.cfilter === filter));
      drawCodes();
    };
  });

  el.querySelector('#copy-unused-codes').onclick = () => {
    const unused = list.filter(c => !c.used).map(c => `${c.code} (${c.amount} ج.م)`).join('\n');
    if (!unused) { toast('لا توجد أكواد متاحة للنسخ', 'warn'); return; }
    navigator.clipboard?.writeText(unused);
    toast('تم نسخ جميع الأكواد المتاحة', 'success');
  };

  el.querySelector('#gen-codes').onclick = () => openGenCodesModal();
}

// ==========================================
// 5. أكواد التحقق
// ==========================================
async function renderVerifyCodes(el) {
  const { data: codes } = await supabase.from('verification_codes').select('*').order('created_at', { ascending: false });
  const list = codes || [];
  let filter = 'all';

  el.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">أكواد <span class="text-orange-500">التحقق</span></h1>
      <div class="flex flex-wrap items-center gap-2">
        <button id="copy-unused-vcodes" type="button" class="btn-outline text-sm px-4 py-2"><i class="fa-solid fa-copy mr-1"></i> نسخ المتاح</button>
        <button id="gen-vcodes" type="button" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> توليد</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary px-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="flex gap-2 mb-4 animate-fade-up" role="group" aria-label="تصفية أكواد التحقق">
      <button type="button" class="chip active" data-vfilter="all">الكل (${list.length})</button>
      <button type="button" class="chip" data-vfilter="unused">متاح (${list.filter(c => !c.used).length})</button>
      <button type="button" class="chip" data-vfilter="used">مستخدم (${list.filter(c => c.used).length})</button>
    </div>
    <div class="glass-card p-6 animate-fade-up">
      <div id="vcodes-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"></div>
    </div>
  `;

  const grid = el.querySelector('#vcodes-grid');
  const drawVCodes = () => {
    const filtered = list.filter(c => (filter === 'unused' ? !c.used : filter === 'used' ? c.used : true));
    grid.innerHTML = filtered.map(c => `
      <div class="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-border flex justify-between items-center">
        <div>
          <p class="font-mono text-lg text-main font-bold tracking-widest" dir="ltr">${escapeHtml(c.code)}</p>
          <p class="text-xs font-bold ${c.used ? 'text-red-500' : 'text-green-600 dark:text-green-400'}">${c.used ? 'مستخدم' : 'متاح'}</p>
        </div>
        <button type="button" data-copy="${escapeHtml(c.code)}" aria-label="نسخ كود التحقق" class="text-blue-500 hover:text-blue-400 p-2"><i class="fa-solid fa-copy"></i></button>
      </div>
    `).join('') || '<p class="text-muted col-span-3 text-center py-6">لا توجد أكواد مطابقة</p>';

    grid.querySelectorAll('[data-copy]').forEach(b => {
      b.onclick = () => {
        navigator.clipboard?.writeText(b.dataset.copy);
        toast('تم نسخ الكود', 'success');
      };
    });
  };
  drawVCodes();

  el.querySelectorAll('[data-vfilter]').forEach(btn => {
    btn.onclick = () => {
      filter = btn.dataset.vfilter;
      el.querySelectorAll('[data-vfilter]').forEach(x => x.classList.toggle('active', x.dataset.vfilter === filter));
      drawVCodes();
    };
  });

  el.querySelector('#copy-unused-vcodes').onclick = () => {
    const unused = list.filter(c => !c.used).map(c => c.code).join('\n');
    if (!unused) { toast('لا توجد أكواد متاحة للنسخ', 'warn'); return; }
    navigator.clipboard?.writeText(unused);
    toast('تم نسخ جميع أكواد التحقق المتاحة', 'success');
  };

  el.querySelector('#gen-vcodes').onclick = () => {
    const m = modal({
      title: 'توليد أكواد تحقق',
      body: `<input id="vc-cnt" type="number" placeholder="العدد" value="5" class="input-field">`,
      actions: `<button id="vcb" class="btn-primary w-full">توليد</button>`
    });
    m.root.querySelector('#vcb').onclick = async () => {
      const cnt = +m.root.querySelector('#vc-cnt').value || 1;
      const rows = [];
      for (let i = 0; i < cnt; i++) {
        rows.push({ id: uid(), code: 'VRF-' + Math.random().toString(36).slice(2, 8).toLowerCase() });
      }
      const { error } = await supabase.from('verification_codes').insert(rows);
      if (error) toast(error.message, 'error'); else { toast('تم', 'success'); m.close(); location.reload(); }
    };
  };
}

// ==========================================
// 6. المساعدين
// ==========================================
async function renderAssistants(el) {
  const { data: assistants } = await supabase.from('profiles').select('*').eq('role', 'assistant');
  const { data: teachers } = await supabase.from('profiles').select('id, name').eq('role', 'super_admin');
  const teachersMap = {};
  (teachers || []).forEach(t => { teachersMap[t.id] = t.name; });

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-teal-500">المساعدين</span></h1>
      <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
    </div>
    <div class="glass-card p-6 overflow-x-auto animate-fade-up">
      <table class="w-full text-right text-sm">
        <thead class="bg-black/5 dark:bg-white/5 text-muted">
          <tr>
            <th class="p-3 rounded-r-lg">المساعد</th>
            <th class="p-3">تابع لـ</th>
            <th class="p-3 rounded-l-lg">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${(assistants || []).map(a => `
            <tr class="border-b border-border hover:bg-black/5 dark:hover:bg-white/5 transition">
              <td class="p-3">
                <p class="font-bold text-main">${escapeHtml(a.name)}</p>
                <p class="text-xs text-muted" dir="ltr">${escapeHtml(a.phone || '')}</p>
              </td>
              <td class="p-3 text-muted">${escapeHtml(teachersMap[a.teacher_id] || 'غير محدد')}</td>
              <td class="p-3">
                <div class="flex gap-1 justify-end">
                  <button data-del-assistant="${a.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20" title="حذف"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="3" class="text-center p-4 text-muted">لا يوجد مساعدين</td></tr>'}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('[data-del-assistant]').forEach(b => {
    b.onclick = async () => {
      const ok = await confirmModal({
        title: 'حذف المساعد',
        message: 'هل تريد حذف هذا المساعد نهائياً؟',
        confirmText: 'حذف نهائي',
        danger: true
      });
      if (!ok) return;
      const { error } = await supabase.from('profiles').delete().eq('id', b.dataset.delAssistant);
      if (error) toast(error.message, 'error');
      else { toast('تم الحذف', 'success'); location.reload(); }
    };
  });
}

// ==========================================
// 7. الإداريين
// ==========================================
async function renderAdmins(el) {
  const { data: admins } = await supabase.from('profiles').select('*').eq('role', 'admin');

  el.innerHTML = `
    <div class="flex items-center justify-between mb-6 animate-fade-up">
      <h1 class="text-3xl font-black text-main">إدارة <span class="text-red-500">الإداريين</span></h1>
      <div class="flex gap-2">
        <button id="add-admin" class="btn-primary text-sm px-4 py-2"><i class="fa-solid fa-plus mr-1"></i> إضافة أدمن</button>
        <a href="#/admin" class="text-sm font-bold text-muted hover:text-primary mt-2"><i class="fa-solid fa-arrow-right"></i> رجوع</a>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
      ${(admins || []).map(a => `
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xl">
            ${(a.name || '?').charAt(0)}
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-main">${escapeHtml(a.name)}</h3>
            <p class="text-xs text-muted" dir="ltr">${escapeHtml(a.phone || '')}</p>
          </div>
          <button data-del-admin="${a.id}" class="w-8 h-8 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center" title="إزالة الصلاحية"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('') || '<p class="text-muted col-span-2 text-center py-10">لا يوجد إداريين حالياً</p>'}
    </div>
  `;

  el.querySelector('#add-admin').onclick = () => {
    const m = modal({
      title: 'إضافة إداري جديد',
      body: `
        <div class="space-y-3">
          <input id="adm-phone" placeholder="رقم الهاتف" class="input-field" dir="ltr">
          <p class="text-xs text-muted">اكتب رقم الهاتف لحساب موجود بالفعل (طالب أو مدرس) لتحويله لأدمن.</p>
        </div>`,
      actions: `<button id="save-adm" class="btn-primary w-full">إضافة</button>`
    });
    
    m.root.querySelector('#save-adm').onclick = async () => {
      const phone = m.root.querySelector('#adm-phone').value.trim();
      if (!phone) { toast('أدخل رقم الهاتف', 'warn'); return; }
      
      const { data: profile } = await supabase.from('profiles').select('id').eq('phone', phone).maybeSingle();
      if (!profile) { toast('لا يوجد حساب بهذا الرقم', 'error'); return; }

      const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', profile.id);
      if (error) { toast(error.message, 'error'); return; }
      
      toast('تم تحويل الحساب إلى أدمن', 'success');
      m.close(); location.reload();
    };
  };

  el.querySelectorAll('[data-del-admin]').forEach(b => {
    b.onclick = async () => {
      const ok = await confirmModal({
        title: 'إزالة صلاحية الأدمن',
        message: 'هل تريد إزالة صلاحية الأدمن من هذا الحساب؟',
        confirmText: 'إزالة الصلاحية',
        danger: true
      });
      if (!ok) return;
      await supabase.from('profiles').update({ role: 'student' }).eq('id', b.dataset.delAdmin);
      toast('تم إزالة الصلاحية', 'success'); location.reload();
    };
  });
}

// ==========================================
// المودالات المساعدة
// ==========================================
function openAddTeacherModal() {
  const m = modal({
    title: 'إضافة مدرس',
    body: `<input id="t-name" placeholder="الاسم" class="input-field mb-2"><input id="t-phone" placeholder="الهاتف" class="input-field mb-2" dir="ltr"><input id="t-pass" type="password" placeholder="كلمة المرور" class="input-field" dir="ltr">`,
    actions: `<button id="save-teacher" class="btn-primary w-full">إضافة</button>`
  });
  m.root.querySelector('#save-teacher').onclick = async () => {
    const name = m.root.querySelector('#t-name').value;
    const phone = m.root.querySelector('#t-phone').value;
    const pass = m.root.querySelector('#t-pass').value;
    if (!name || !phone) { toast('الاسم والرقم مطلوبين', 'warn'); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create_teacher`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, phone, password: pass })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'فشل');
      toast('تم. الباسورد: ' + out.default_password, 'success');
      m.close(); location.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
}

function openEditTeacherModal(t) {
  const m = modal({
    title: 'تعديل المدرس',
    body: `
      <div class="space-y-3">
        <input id="et-name" value="${escapeHtml(t.name)}" class="input-field" placeholder="الاسم">
        <input id="et-phone" value="${escapeHtml(t.phone || '')}" class="input-field" placeholder="الهاتف" dir="ltr">
        <input id="et-grade" value="${escapeHtml(t.grade || '')}" class="input-field" placeholder="الصف/المادة">
        <input id="et-pass" type="password" class="input-field" placeholder="كلمة مرور جديدة (اختياري)" dir="ltr">
        <div>
          <label class="block text-sm font-bold mb-2 text-main">صورة المدرس</label>
          <div class="flex items-center gap-3">
            <div id="teach-img-prev" class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-border">
              ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-muted"></i>`}
            </div>
            <input type="file" id="teach-img" accept="image/*" class="text-sm w-full file:bg-blue-500/10 file:text-blue-500 file:border-0 file:rounded-lg file:px-3 file:py-1">
          </div>
        </div>
      </div>
    `,
    actions: `<button id="save-et" class="btn-primary w-full">حفظ</button>`
  });

  let newImgUrl = t.image || '';
  m.root.querySelector('#teach-img').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    toast('جاري رفع الصورة...', 'info');
    const fileName = `teacher_${t.id}_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل رفع الصورة', 'error'); return; }
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    newImgUrl = data.publicUrl;
    m.root.querySelector('#teach-img-prev').innerHTML = `<img src="${newImgUrl}" class="w-full h-full object-cover">`;
    toast('تم', 'success');
  };

  m.root.querySelector('#save-et').onclick = async () => {
    try {
      const updates = {
        name: m.root.querySelector('#et-name').value,
        phone: m.root.querySelector('#et-phone').value,
        grade: m.root.querySelector('#et-grade').value,
        image: newImgUrl
      };
      const newPass = m.root.querySelector('#et-pass').value;

      const { error } = await supabase.from('profiles').update(updates).eq('id', t.id);
      if (error) throw new Error(error.message);

      if (newPass.length >= 8) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/admin_update_user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ user_id: t.id, new_password: newPass })
        });
        if (!res.ok) throw new Error('فشل تغيير الباسورد');
      }

      toast('تم الحفظ بنجاح', 'success');
      m.close();
      setTimeout(() => location.reload(), 500);
    } catch (err) { toast(err.message, 'error'); }
  };
}

function openGenCodesModal() {
  const m = modal({
    title: 'توليد أكواد شحن',
    body: `<input id="gc-amt" type="number" placeholder="قيمة الكود" class="input-field mb-2"><input id="gc-cnt" type="number" placeholder="العدد" value="5" class="input-field">`,
    actions: `<button id="gcb" class="btn-primary w-full">توليد</button>`
  });
  m.root.querySelector('#gcb').onclick = async () => {
    const amt = +m.root.querySelector('#gc-amt').value;
    const cnt = +m.root.querySelector('#gc-cnt').value || 1;
    if (!amt) return;
    const rows = [];
    for (let i = 0; i < cnt; i++) rows.push({ id: uid(), code: 'EDU-' + Math.random().toString(36).slice(2, 10).toLowerCase(), amount: amt });
    const { error } = await supabase.from('codes').insert(rows);
    if (error) toast(error.message, 'error'); else { toast('تم', 'success'); m.close(); location.reload(); }
  };
}

async function openSettingsModal() {
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const m = modal({
    title: 'إعدادات المنصة',
    body: `
      <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <h4 class="font-bold text-blue-500 mb-2">بيانات المدرس (تظهر في أول الصفحة)</h4>
        <div class="flex items-center gap-3">
          <div id="teacher-img-prev" class="w-24 h-24 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-border shrink-0">
            ${s?.teacher_image ? `<img src="${escapeHtml(s.teacher_image)}" class="w-full h-full object-cover object-top">` : '<i class="fa-solid fa-user text-muted text-3xl"></i>'}
          </div>
          <label class="cursor-pointer bg-blue-500/10 text-blue-500 rounded-lg px-4 py-2 text-sm font-bold"><i class="fa-solid fa-upload"></i> رفع صورة المدرس
            <input type="file" id="teacher-img" class="hidden" accept="image/*"></label>
        </div>
        <input id="teacher-name" value="${escapeHtml(s?.teacher_name || '')}" placeholder="اسم المدرس" class="input-field">
        <input id="teacher-title" value="${escapeHtml(s?.teacher_title || '')}" placeholder="اللقب / المادة (مثال: مدرس اللغة العربية)" class="input-field">
        <textarea id="teacher-bio" placeholder="نبذة عن المدرس" rows="3" class="input-field">${escapeHtml(s?.teacher_bio || '')}</textarea>
        <h4 class="font-bold text-blue-500 mt-4 mb-2">الهوية البصرية</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">اسم المنصة</label>
          <input id="platform-name" value="${escapeHtml(s?.platform_name || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">البريد الإلكتروني</label>
          <input id="contact-email" value="${escapeHtml(s?.contact_email || '')}" class="input-field" dir="ltr">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم الهاتف</label>
          <input id="contact-phone" value="${escapeHtml(s?.contact_phone || '')}" class="input-field" dir="ltr">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">العنوان (مثال: القاهرة، مصر)</label>
          <input id="contact-address" value="${escapeHtml(s?.contact_address || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم الدعم (واتساب)</label>
          <input id="support-whatsapp" value="${escapeHtml(s?.support_whatsapp || '')}" class="input-field" dir="ltr">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">رقم المطور (واتساب)</label>
          <input id="developer-whatsapp" value="${escapeHtml(s?.developer_whatsapp || '')}" class="input-field" dir="ltr">
        </div>

        <h4 class="font-bold text-sky-500 mt-6 mb-2">نصوص الصفحة الرئيسية</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">العنوان الرئيسي</label>
          <input id="hero-title" value="${escapeHtml(s?.hero_title || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">الوصف (Subtitle)</label>
          <textarea id="hero-subtitle" class="input-field">${escapeHtml(s?.hero_subtitle || '')}</textarea>
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">نص زرار 1 (تصفح الكورسات)</label>
          <input id="hero-btn1" value="${escapeHtml(s?.hero_btn1 || '')}" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">نص زرار 2 (سجل الآن)</label>
          <input id="hero-btn2" value="${escapeHtml(s?.hero_btn2 || '')}" class="input-field">
        </div>

        <h4 class="font-bold text-orange-500 mt-6 mb-2">إعدادات الأمان</h4>
        <div>
          <label class="block text-sm font-bold mb-1 text-main">عدد الحسابات المسموح بها لكل جهاز (IP)</label>
          <input id="max-accounts" type="number" value="${s?.max_accounts_per_ip || 2}" class="input-field" min="1">
          <p class="text-xs text-muted mt-1">لو الطالب زاد عن الرقم ده، هيطلب منه كود تحقق.</p>
        </div>

        <h4 class="font-bold text-blue-500 mt-6 mb-2">روابط التواصل الاجتماعي</h4>
        ${socialInput('facebook', 'فيسبوك', s?.facebook_url, s?.show_facebook)}
        ${socialInput('whatsapp', 'واتساب', s?.whatsapp_url, s?.show_whatsapp)}
        ${socialInput('telegram', 'تيلجرام', s?.telegram_url, s?.show_telegram)}
        ${socialInput('instagram', 'إنستجرام', s?.instagram_url, s?.show_instagram)}
        ${socialInput('tiktok', 'تيك توك', s?.tiktok_url, s?.show_tiktok)}
      </div>`,
    actions: `<button id="save-settings" class="btn-primary w-full">حفظ</button>`
  });

  let teacherImg = s?.teacher_image || '';
  m.root.querySelector('#teacher-img').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    toast('جاري رفع الصورة...', 'info');
    const fileName = `teacher_${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('images').upload(fileName, file);
    if (error) { toast('فشل رفع الصورة', 'error'); return; }
    teacherImg = supabase.storage.from('images').getPublicUrl(fileName).data.publicUrl;
    m.root.querySelector('#teacher-img-prev').innerHTML = `<img src="${teacherImg}" class="w-full h-full object-cover object-top">`;
    toast('تم رفع الصورة، اضغط حفظ', 'success');
  };

  m.root.querySelector('#save-settings').onclick = async () => {
    const updates = {
      teacher_image: teacherImg,
      teacher_name: m.root.querySelector('#teacher-name').value,
      teacher_title: m.root.querySelector('#teacher-title').value,
      teacher_bio: m.root.querySelector('#teacher-bio').value,
      platform_name: m.root.querySelector('#platform-name').value,
      contact_email: m.root.querySelector('#contact-email').value,
      contact_phone: m.root.querySelector('#contact-phone').value,
      contact_address: m.root.querySelector('#contact-address').value,
      support_whatsapp: m.root.querySelector('#support-whatsapp').value,
      developer_whatsapp: m.root.querySelector('#developer-whatsapp').value,
      max_accounts_per_ip: +m.root.querySelector('#max-accounts')?.value || 2,
      hero_title: m.root.querySelector('#hero-title')?.value || '',
      hero_subtitle: m.root.querySelector('#hero-subtitle')?.value || '',
      hero_btn1: m.root.querySelector('#hero-btn1')?.value || '',
      hero_btn2: m.root.querySelector('#hero-btn2')?.value || '',
      facebook_url: m.root.querySelector('#url-facebook')?.value || '',
      whatsapp_url: m.root.querySelector('#url-whatsapp')?.value || '',
      telegram_url: m.root.querySelector('#url-telegram')?.value || '',
      instagram_url: m.root.querySelector('#url-instagram')?.value || '',
      tiktok_url: m.root.querySelector('#url-tiktok')?.value || '',
      show_facebook: m.root.querySelector('#show-facebook')?.checked || false,
      show_whatsapp: m.root.querySelector('#show-whatsapp')?.checked || false,
      show_telegram: m.root.querySelector('#show-telegram')?.checked || false,
      show_instagram: m.root.querySelector('#show-instagram')?.checked || false,
      show_tiktok: m.root.querySelector('#show-tiktok')?.checked || false
    };
    const { error } = await supabase.from('settings').update(updates).eq('id', 1);
    if (error) { toast(error.message, 'error'); return; }
    toast('تم الحفظ', 'success'); m.close(); setTimeout(() => location.reload(), 500);
  };
}

function socialInput(key, label, val, show) {
  return `<div class="p-3 rounded-lg bg-black/5 dark:bg-black/20 border border-border mb-2">
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold text-sm text-main">${label}</span>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id="show-${key}" class="sr-only peer" ${show ? 'checked' : ''}>
        <div class="w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
      </label>
    </div>
    <input id="url-${key}" value="${escapeHtml(val || '')}" placeholder="https://..." class="input-field text-xs" dir="ltr">
  </div>`;
}

function statCard(icon, label, val, colorClass) {
  return `<div class="glass-card p-5 flex items-center gap-4">
    <div class="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
      <i class="fa-solid ${icon} text-2xl ${colorClass}"></i>
    </div>
    <div>
      <p class="text-2xl font-black text-main">${val}</p>
      <p class="text-xs font-bold text-muted">${label}</p>
    </div>
  </div>`;
}
