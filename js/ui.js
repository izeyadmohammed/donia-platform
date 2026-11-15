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
  const img = s.teacher_image || s.logo_url;
  const isDark = document.documentElement.classList.contains('dark');
  const coursesHref = staff ? '#/teacher/courses' : '#/courses';
  const homeAccount = !p ? '#/login' : p.role === 'student' ? '#/student' : p.role === 'super_admin' ? '#/admin' : '#/teacher';
  const accountLabel = !p ? 'دخول' : p.role === 'student' ? 'حسابي' : 'لوحتي';
  const accountIcon = !p ? 'fa-right-to-bracket' : p.role === 'student' ? 'fa-user' : 'fa-gauge';
  const wa = s.support_whatsapp;

  h.innerHTML = `
    <div class="max-w-7xl mx-auto px-3 pt-3">
      <div class="nav-bar flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5">
        <a href="#/home" class="flex items-center gap-3 min-w-0">
          ${img ? `<img src="${img}" class="w-11 h-11 rounded-2xl object-cover object-top border-2 border-blue-500/30">` : `<span class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white flex items-center justify-center"><i class="fa-solid fa-graduation-cap"></i></span>`}
          <span class="font-black text-lg text-main truncate leading-tight">${brand}${s.teacher_title ? `<small class="block text-xs font-semibold text-muted">${s.teacher_title}</small>` : ''}</span>
        </a>
        <nav class="hidden md:flex items-center gap-1">
          <a data-nav href="#/home" class="nav-pill">الرئيسية</a>
          <a data-nav href="${coursesHref}" class="nav-pill">الكورسات</a>
          <a data-nav href="#/about" class="nav-pill">عن المدرس</a>
          <a data-nav href="#/contact" class="nav-pill">تواصل</a>
          ${p ? `<a data-nav href="${homeAccount}" class="nav-pill">${accountLabel}</a>` : ''}
        </nav>
        <div class="flex items-center gap-2">
          ${p?.role === 'student' ? `<button id="wallet-header-btn" class="hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm"><i class="fa-solid fa-wallet"></i>${formatMoney(p.wallet || 0)}</button>` : ''}
          ${wa ? `<a href="https://wa.me/${wa}" target="_blank" class="icon-btn hidden sm:flex" title="الدعم"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
          ${p ? `<a href="#/notifications" class="icon-btn"><i class="fa-regular fa-bell"></i>${unread ? `<span class="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">${unread}</span>` : ''}</a>` : ''}
          <button id="dark-toggle" class="icon-btn" title="الوضع الليلي"><i class="fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}"></i></button>
          ${p ? `<button id="logout-btn" class="icon-btn" title="خروج"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>`
              : `<a href="#/signup" class="btn-primary text-sm !py-2 hidden sm:inline-flex">حساب جديد</a>`}
        </div>
      </div>
    </div>
    <div class="bottom-nav">
      <a data-nav href="#/home"><i class="fa-solid fa-house"></i>الرئيسية</a>
      <a data-nav href="${coursesHref}"><i class="fa-solid fa-book-open"></i>الكورسات</a>
      <a data-nav href="${homeAccount}"><i class="fa-solid ${accountIcon}"></i>${accountLabel}</a>
      ${p ? `<a data-nav href="#/notifications"><i class="fa-regular fa-bell"></i>الإشعارات</a>` : `<a data-nav href="#/about"><i class="fa-solid fa-circle-info"></i>المدرس</a>`}
    </div>`;

  const markActive = () => {
    const cur = (location.hash || '#/home').split('?')[0];
    h.querySelectorAll('[data-nav]').forEach(a => {
      const t = a.getAttribute('href');
      a.classList.toggle('active', cur === t || (t.length > 7 && cur.startsWith(t)) || (t === '#/home' && cur === '#/'));
    });
  };
  markActive();
  if (!window.__navWatch) { window.__navWatch = true; window.addEventListener('hashchange', () => window.__markActive && window.__markActive()); }
  window.__markActive = markActive;

  h.querySelector('#dark-toggle').onclick = () => { toggleDark(); renderHeader(); };
  const lo = h.querySelector('#logout-btn');
  if (lo) lo.onclick = async () => { await supabase.auth.signOut(); location.hash = '#/home'; location.reload(); };
  const walletBtn = h.querySelector('#wallet-header-btn');
  if (walletBtn) walletBtn.onclick = () => {
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
}

export async function renderFooter() {
  const f = document.getElementById('app-footer');
  if (!f) return;
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const socials = [
    ['facebook', 'fa-facebook-f', s?.facebook_url, s?.show_facebook], ['whatsapp', 'fa-whatsapp', s?.whatsapp_url, s?.show_whatsapp],
    ['telegram', 'fa-telegram', s?.telegram_url, s?.show_telegram], ['instagram', 'fa-instagram', s?.instagram_url, s?.show_instagram],
    ['tiktok', 'fa-tiktok', s?.tiktok_url, s?.show_tiktok]
  ].filter(x => x[3] && x[2]);
  const name = s?.teacher_name || s?.platform_name || 'منصة التعليم';
  f.className = 'max-w-7xl mx-auto px-3 pb-6';
  f.innerHTML = `
    <div class="glass-card p-6 md:p-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p class="font-black text-xl text-main mb-1">${name}</p>
          <p class="text-sm text-muted">${s?.teacher_title || 'شرح وامتحانات ومتابعة في مكان واحد'}</p>
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-muted">
            ${s?.contact_phone ? `<a href="tel:${s.contact_phone}" dir="ltr" class="hover:text-blue-500"><i class="fa-solid fa-phone text-blue-500 ml-1"></i>${s.contact_phone}</a>` : ''}
            ${s?.contact_email ? `<a href="mailto:${s.contact_email}" class="hover:text-blue-500"><i class="fa-solid fa-envelope text-blue-500 ml-1"></i>${s.contact_email}</a>` : ''}
          </div>
        </div>
        <div class="flex gap-2">${socials.map(x => `<a href="${x[2]}" target="_blank" class="icon-btn"><i class="fa-brands ${x[1]}"></i></a>`).join('')}</div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border mt-6 pt-4 text-xs text-muted">
        <p>&copy; ${new Date().getFullYear()} ${name}. جميع الحقوق محفوظة.</p>
        <div class="flex gap-4"><a href="#/policy/terms" class="hover:text-blue-500">الشروط</a><a href="#/policy/privacy" class="hover:text-blue-500">الخصوصية</a><a href="#/policy/refund" class="hover:text-blue-500">الاسترجاع</a></div>
      </div>
    </div>`;
}

export function setLoading(el = document.getElementById('app-main'), msg = 'جاري التحميل...') {
  if (!el) return;
  el.innerHTML = `<div class="flex flex-col items-center justify-center py-32 text-muted animate-fade-up">
    <div class="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
    <p class="font-bold">${msg}</p>
  </div>`;
}
