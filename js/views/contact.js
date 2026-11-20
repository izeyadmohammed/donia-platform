import { store } from '../config.js';
import { escapeHtml, whatsappUrl } from '../utils.js';

export default async function contactView(el) {
  const s = store.settings || {};
  const email = s.contact_email || 'support@edu.local';
  const phone = s.contact_phone || '01126346329';
  const address = s.contact_address || 'القاهرة، مصر';
  const waHref = whatsappUrl(s.support_whatsapp || s.contact_phone || '201126346329');

  el.innerHTML = `
    <div class="glass-card max-w-2xl mx-auto p-8 md:p-12 animate-fade-up mt-6">
      <h1 class="text-3xl md:text-4xl font-black mb-4 text-main text-center">
        اتصل <span class="text-primary">بنا</span>
      </h1>
      <div class="w-20 h-1 bg-primary mx-auto rounded-full mb-6"></div>

      <p class="text-center text-muted mb-8">نحن هنا لمساعدتك! يسعدنا تواصلك معنا لأي استفسارات أو دعم فني.</p>

      <div class="space-y-4">
        <a href="mailto:${escapeHtml(email)}" class="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:border-primary/50 transition group">
          <div class="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-envelope text-xl"></i>
          </div>
          <div>
            <h3 class="font-bold text-main">البريد الإلكتروني</h3>
            <p class="text-sm text-muted" dir="ltr">${escapeHtml(email)}</p>
          </div>
        </a>

        <a href="tel:${escapeHtml(phone)}" class="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:border-primary/50 transition group">
          <div class="w-12 h-12 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-phone text-xl"></i>
          </div>
          <div>
            <h3 class="font-bold text-main">رقم الهاتف</h3>
            <p class="text-sm text-muted tabular-nums" dir="ltr">${escapeHtml(phone)}</p>
          </div>
        </a>

        <div class="flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
          <div class="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-location-dot text-xl"></i>
          </div>
          <div>
            <h3 class="font-bold text-main">العنوان</h3>
            <p class="text-sm text-muted">${escapeHtml(address)}</p>
          </div>
        </div>

        ${
          waHref
            ? `<a href="${waHref}" target="_blank" rel="noopener" class="flex items-center justify-center gap-2 p-4 mt-6 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition shadow-lg">
                <i class="fa-brands fa-whatsapp text-xl"></i> تواصل معنا عبر واتساب
              </a>`
            : ''
        }
      </div>
    </div>
  `;
}
