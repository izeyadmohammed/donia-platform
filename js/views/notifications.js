import { supabase, store } from '../config.js';
import { escapeHtml, formatDate } from '../utils.js';
import { toast, confirmModal } from '../ui.js';

export default async function notificationsView(el) {
  const p = store.profile;
  if (!p) { location.hash = '#/login'; return; }

  // جلب الإشعارات
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', p.id)
    .order('created_at', { ascending: false });

  if (error) {
    el.innerHTML = `<p class="text-center py-10 text-red-500">حدث خطأ في جلب الإشعارات</p>`;
    return;
  }

  // تعليم الإشعارات كمقروءة
  const unreadIds = (notifications || []).filter(n => !n.read).map(n => n.id);
  if (unreadIds.length > 0) {
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    // تحديث الـ store
    if (store.notifications) {
      store.notifications.forEach(n => { if (unreadIds.includes(n.id)) n.read = true; });
    }
  }

  store.notifications = notifications || [];
  const { renderHeader } = await import('../ui.js');
  await renderHeader();

  el.innerHTML = `
    <div class="max-w-3xl mx-auto animate-fade-up">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-black text-main">الإشعارات</h1>
        ${notifications?.length ? `<button id="clear-all" type="button" class="text-sm text-red-500 hover:underline font-bold">مسح الكل</button>` : ''}
      </div>

      ${(!notifications || notifications.length === 0) ? `
        <div class="glass-card p-16 text-center text-muted">
          <i class="fa-regular fa-bell-slash text-6xl mb-4 opacity-50"></i>
          <h2 class="text-xl font-bold mb-2">لا توجد إشعارات</h2>
          <p class="text-sm">هتظهرلك الإشعارات هنا أول ما يكون فيه جديد.</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${notifications.map(n => `
            <div class="glass-card p-4 flex items-start gap-4 ${!n.read ? 'border-blue-500/40 bg-blue-500/5' : ''}" id="notif-${n.id}">
              <div class="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-bell text-sm"></i>
              </div>
              <div class="flex-1">
                <p class="font-bold text-main text-sm">${escapeHtml(n.text)}</p>
                <p class="text-xs text-muted mt-1">${formatDate(n.created_at)}</p>
              </div>
              <button type="button" data-del="${n.id}" aria-label="مسح الإشعار" class="w-8 h-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center shrink-0" title="مسح الإشعار">
                <i class="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // مسح إشعار واحد
  el.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.del;
      b.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm"></i>';

      const { error } = await supabase.from('notifications').delete().eq('id', id);

      if (error) {
        toast('فشل المسح', 'error');
        b.innerHTML = '<i class="fa-solid fa-xmark text-sm"></i>';
        return;
      }

      document.getElementById(`notif-${id}`).remove();
      toast('تم مسح الإشعار', 'success');

      store.notifications = store.notifications.filter(x => x.id !== id);
      await renderHeader();
    };
  });

  // مسح الكل
  const clearAll = el.querySelector('#clear-all');
  if (clearAll) {
    clearAll.onclick = async () => {
      const ok = await confirmModal({
        title: 'مسح جميع الإشعارات',
        message: 'هل تريد مسح جميع الإشعارات نهائياً؟',
        confirmText: 'مسح الكل',
        danger: true
      });
      if (!ok) return;

      const { error } = await supabase.from('notifications').delete().eq('user_id', p.id);

      if (error) {
        toast('فشل المسح', 'error');
        return;
      }

      toast('تم مسح كل الإشعارات', 'success');
      location.reload();
    };
  }
}
