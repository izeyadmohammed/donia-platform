import { store } from '../config.js';
import { escapeHtml } from '../utils.js';

export default async function aboutView(el) {
  const s = store.settings || {};
  const name = s.teacher_name || s.platform_name || 'المدرس';
  el.innerHTML = `
    <div class="glass-card max-w-3xl mx-auto p-8 md:p-12 animate-fade-up mt-6 text-center">
      <div class="w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden border-4 border-primary/30 bg-gradient-to-br from-blue-600 to-sky-700 flex items-center justify-center">
        ${s.teacher_image ? `<img src="${escapeHtml(s.teacher_image)}" class="w-full h-full object-cover object-top">` : '<i class="fa-solid fa-chalkboard-user text-6xl text-white/80"></i>'}
      </div>
      <h1 class="text-3xl md:text-4xl font-black text-main mb-2">${escapeHtml(name)}</h1>
      <p class="text-blue-500 font-bold mb-6">${escapeHtml(s.teacher_title || 'مدرس')}</p>
      <div class="w-20 h-1 bg-primary mx-auto rounded-full mb-8"></div>
      <p class="text-lg text-muted leading-relaxed whitespace-pre-wrap">${escapeHtml(s.teacher_bio || 'مرحباً بك في منصتي التعليمية. هنا هتلاقي الشرح والمتابعة والامتحانات في مكان واحد.')}</p>
      <div class="flex flex-wrap gap-3 justify-center mt-8">
        <a href="#/courses" class="btn-primary px-8">تصفح الكورسات</a>
        <a href="#/contact" class="btn-accent px-8">تواصل معي</a>
      </div>
    </div>`;
}
