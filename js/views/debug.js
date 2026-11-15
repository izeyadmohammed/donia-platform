import { supabase, store } from '../config.js';

export default async function debugView(el) {
  el.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><h1 class="text-2xl font-bold mb-4">فحص المنصة</h1><div id="debug-content">جاري الفحص...</div></div>`;
  const out = el.querySelector('#debug-content');
  
  let report = '<div class="space-y-3">';

  // 1. هل فيه جلسة؟
  const { data: { session } } = await supabase.auth.getSession();
  report += `<div class="p-3 bg-black/5 rounded"><b>الجلسة (Session):</b> ${session ? 'موجودة ✅' : 'غير موجودة ❌'}</div>`;
  
  if (session) {
    report += `<div class="p-3 bg-black/5 rounded"><b>الإيميل:</b> ${session.user.email}</div>`;
    report += `<div class="p-3 bg-black/5 rounded"><b>الـ ID:</b> ${session.user.id}</div>`;
    
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (error) {
      report += `<div class="p-3 bg-red-500/20 rounded text-red-500"><b>خطأ في قراءة البروفايل:</b> ${error.message}</div>`;
    } else if (profile) {
      report += `<div class="p-3 bg-green-500/20 rounded text-green-500"><b>البروفايل موجود ✅</b></div>`;
      report += `<div class="p-3 bg-black/5 rounded"><b>الاسم:</b> ${profile.name}</div>`;
      report += `<div class="p-3 bg-black/5 rounded"><b>الرقم:</b> ${profile.phone}</div>`;
      report += `<div class="p-3 bg-black/5 rounded"><b>الـ Role:</b> ${profile.role}</div>`;
    } else {
      report += `<div class="p-3 bg-red-500/20 rounded text-red-500"><b>البروفايل غير موجود في الداتابيز ❌</b></div>`;
    }
  } else {
    report += `<div class="p-3 bg-red-500/20 rounded text-red-500"><b>يجب تسجيل الدخول أولاً</b></div>`;
  }

  report += `<div class="p-3 bg-black/5 rounded"><b>store.profile:</b> ${store.profile ? 'متحمل ✅' : 'غير متحمل ❌'}</div>`;
  report += `<div class="p-3 bg-black/5 rounded"><b>store.user:</b> ${store.user ? 'متحمل ✅' : 'غير متحمل ❌'}</div>`;

  report += '</div>';
  out.innerHTML = report;
}
