import { store, supabase } from './config.js';
import { formatMoney } from './utils.js';

export function initDark() {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function toggleDark() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}

export async function getSettings(force = false) {
  if (store.settings && !force) return store.settings;
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (!error && data) {
    store.settings = data;
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = data.platform_name || 'منصة التعليم';
    return data;
  }
  return null;
}

export function toast(msg, type = 'info') {
  const colors = { info: 'bg-blue-600', success: 'bg-green-500', error: 'bg-red-500', warn: 'bg-yellow-500' };
  const el = document.createElement('div');
  el.className = `${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-2xl transition-fade max-w-sm font-bold animate-fade-up`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function modal({ title = '', body = '', actions = '' }) {
  const root = document.getElementById('modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-up';
  wrap.innerHTML = `<div class="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between p-5 border-b border-border">
      <h3 class="font-extrabold text-xl text-main">${title}</h3>
      <button data-close class="text-muted hover:text-red-500 text-2xl">&times;</button>
    </div>
    <div class="p-5">${body}</div>
    ${actions ? `<div class="p-5 border-t border-border flex justify-end gap-3">${actions}</div>` : ''}
  </div>`;
  root.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('[data-close]').onclick = close;
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  return { close, root: wrap };
}

export async function renderHeader() {
  const h = document.getElementById('app-header');
  if (!h) return;
  if (!store.settings) await getSettings();
  const s = store.settings || {};
  const p = store.profile;
  const staff = p && ['teacher', 'assistant', 'super_admin'].includes(p.role);
  const unread = (store.notifications || []).filter(n => !n.read).length;
  const brand = s.teacher_name || s.platform_name || 'منصة التعليم';
  const img = s.logo_url || s.teacher_image;
  const isDark = document.documentElement.classList.contains('dark');
  const coursesHref = staff ? '#/teacher/courses' : '#/courses';
  const dash = !p ? '#/login' : p.role === 'student' ? '#/student' : p.role === 'super_admin' ? '#/admin' : '#/teacher';
  const links = [['#/home', 'الرئيسية'], [coursesHref, 'الكورسات'], ['#/about', 'عن المدرسة'], ['#/contact', 'تواصل معنا']];
  if (p) links.push([dash, staff ? 'لوحة التحكم' : 'حسابي']);
  const initial = (p?.name || '؟').trim().charAt(0);

  h.innerHTML = `
    <nav class="site-nav">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-3">
        <a href="#/home" class="flex items-center gap-3 min-w-0">
          ${img ? `<img src="${img}" class="h-11 w-11 rounded-full object-cover object-top border-2 border-white/40 bg-white/20">` : `<span class="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center text-xl"><i class="fa-solid fa-atom"></i></span>`}
          <span class="font-head text-lg sm:text-xl truncate">${brand}</span>
        </a>
        <div class="hidden md:flex items-center gap-1">
          ${links.map(l => `<a data-nav href="${l[0]}" class="nav-link">${l[1]}</a>`).join('')}
        </div>
        <div class="flex items-center gap-2">
          ${p?.role === 'student' ? `<button id="wallet-header-btn" class="hidden sm:flex items-center gap-2 px-3 h-10 rounded-full bg-white/20 font-bold text-sm"><i class="fa-solid fa-wallet"></i>${formatMoney(p.wallet || 0)}</button>` : ''}
          ${p ? `<a href="#/notifications" class="nav-icon"><i class="fa-regular fa-bell"></i>${unread ? `<span class="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">${unread}</span>` : ''}</a>` : ''}
          <button id="dark-toggle" class="nav-icon" title="الوضع الليلي"><i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}"></i></button>
          ${p ? `<div class="relative">
              <button id="user-btn" class="nav-icon font-black">${initial}</button>
              <div id="user-drop" class="nav-drop">
                <a href="#/home"><i class="fa-solid fa-house text-blue-500 w-5"></i>الصفحة الرئيسية</a>
                <a href="${dash}"><i class="fa-solid fa-user text-blue-500 w-5"></i>${staff ? 'لوحة التحكم' : 'حسابي'}</a>
                ${p.role === 'student' ? `<a href="#" id="drop-charge"><i class="fa-solid fa-qrcode text-blue-500 w-5"></i>شحن كود</a><a href="#/student"><i class="fa-solid fa-book-open text-blue-500 w-5"></i>كورساتي</a>` : ''}
                <a href="#" id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket text-red-500 w-5"></i>تسجيل خروج</a>
              </div></div>`
            : `<a href="#/login" class="hidden sm:inline-flex nav-link">دخول</a><a href="#/signup" class="hidden sm:inline-flex bg-white text-blue-700 font-black rounded-full px-5 py-2 text-sm">حساب جديد</a>`}
          <button id="burger" class="nav-icon md:hidden"><i class="fa-solid fa-bars"></i></button>
        </div>
      </div>
      <div id="mobile-panel" class="mobile-panel md:hidden">
        ${links.map(l => `<a data-nav href="${l[0]}">${l[1]}</a>`).join('')}
        ${!p ? `<a href="#/login">تسجيل الدخول</a><a href="#/signup" class="bg-white text-blue-700 text-center mt-1">إنشاء حساب</a>` : ''}
      </div>
    </nav>`;

  const markActive = () => {
    const cur = (location.hash || '#/home').split('?')[0];
    h.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('href') === cur));
    h.querySelector('#mobile-panel')?.classList.remove('open');
    h.querySelector('#user-drop')?.classList.remove('open');
  };
  markActive();
  if (!window.__navWatch) { window.__navWatch = true; window.addEventListener('hashchange', () => window.__markActive && window.__markActive()); }
  window.__markActive = markActive;

  h.querySelector('#burger').onclick = () => h.querySelector('#mobile-panel').classList.toggle('open');
  const ub = h.querySelector('#user-btn');
  if (ub) ub.onclick = (e) => { e.stopPropagation(); h.querySelector('#user-drop').classList.toggle('open'); };
  if (!window.__dropClose) { window.__dropClose = true; document.addEventListener('click', () => document.querySelector('#user-drop')?.classList.remove('open')); }
  h.querySelector('#dark-toggle').onclick = () => { toggleDark(); renderHeader(); };
  const lo = h.querySelector('#logout-btn');
  if (lo) lo.onclick = async (e) => { e.preventDefault(); await supabase.auth.signOut(); location.hash = '#/home'; location.reload(); };

  const openCharge = () => {
    const support = s.support_whatsapp || '';
    const m = modal({
      title: 'شحن المحفظة',
      body: `<input id="header-code-inp" class="input-field text-center text-lg font-mono mb-3" placeholder="أدخل كود الشحن هنا" dir="ltr">${support ? `<a href="https://wa.me/${support}" target="_blank" class="block text-center text-sm text-green-500 hover:underline mt-2"><i class="fa-brands fa-whatsapp"></i> مش معاك كود؟ تواصل مع الدعم</a>` : ''}`,
      actions: `<button id="header-cbtn" class="btn-primary w-full">شحن الآن</button>`
    });
    m.root.querySelector('#header-cbtn').onclick = async () => {
      const code = m.root.querySelector('#header-code-inp').value.trim();
      if (!code) return;
      try {
        const { error } = await supabase.rpc('redeem_code', { code_input: code });
        if (error) throw new Error(error.message);
        toast('تم الشحن بنجاح', 'success'); m.close();
        const { loadProfile } = await import('./auth.js'); await loadProfile(); await renderHeader();
      } catch (e) { toast(e.message, 'error'); }
    };
  };
  const wb = h.querySelector('#wallet-header-btn'); if (wb) wb.onclick = openCharge;
  const dc = h.querySelector('#drop-charge'); if (dc) dc.onclick = (e) => { e.preventDefault(); openCharge(); };
}

export async function renderFooter() {
  const f = document.getElementById('app-footer');
  if (!f) return;
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const socials = [
    ['fa-facebook-f', s?.facebook_url, s?.show_facebook], ['fa-whatsapp', s?.whatsapp_url, s?.show_whatsapp],
    ['fa-telegram', s?.telegram_url, s?.show_telegram], ['fa-instagram', s?.instagram_url, s?.show_instagram],
    ['fa-tiktok', s?.tiktok_url, s?.show_tiktok]
  ].filter(x => x[2] && x[1]);
  const name = s?.teacher_name || s?.platform_name || 'منصة التعليم';
  f.innerHTML = `
    <div class="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
      <div>
        <p class="font-head text-2xl text-white mb-3">${name}</p>
        <p class="text-sm leading-7 text-gray-300">${s?.teacher_title || 'شرح مبسّط، مراجعات، وامتحانات في مكان واحد.'}</p>
        <div class="flex gap-2 mt-5">${socials.map(x => `<a href="${x[1]}" target="_blank" class="soc"><i class="fa-brands ${x[0]}"></i></a>`).join('')}</div>
      </div>
      <div>
        <p class="font-bold text-white mb-3">روابط سريعة</p>
        <div class="flex flex-col gap-2 text-sm"><a href="#/home">الرئيسية</a><a href="#/courses">الكورسات</a><a href="#/about">عن المدرسة</a><a href="#/contact">تواصل معنا</a></div>
      </div>
      <div>
        <p class="font-bold text-white mb-3">تواصل</p>
        <div class="flex flex-col gap-2 text-sm text-gray-300">
          ${s?.contact_phone ? `<a href="tel:${s.contact_phone}" dir="ltr" class="text-right"><i class="fa-solid fa-phone ml-2 text-sky-400"></i>${s.contact_phone}</a>` : ''}
          ${s?.contact_email ? `<a href="mailto:${s.contact_email}"><i class="fa-solid fa-envelope ml-2 text-sky-400"></i>${s.contact_email}</a>` : ''}
          ${s?.contact_address ? `<span><i class="fa-solid fa-location-dot ml-2 text-sky-400"></i>${s.contact_address}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="border-t border-white/10 py-4 px-6 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
      <p>&copy; ${new Date().getFullYear()} ${name}. جميع الحقوق محفوظة.</p>
      <div class="flex gap-4"><a href="#/policy/terms">الشروط</a><a href="#/policy/privacy">الخصوصية</a><a href="#/policy/refund">الاسترجاع</a></div>
    </div>`;
}

export function setLoading(el = document.getElementById('app-main'), msg = 'جاري التحميل...') {
  if (!el) return;
  el.innerHTML = `<div class="flex flex-col items-center justify-center py-32 text-muted animate-fade-up">
    <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <p class="font-bold">${msg}</p>
  </div>`;
}
