import { store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';

export default async function homeView(el) {
  const profile = store.profile;
  const s = store.settings || {};
  const name = s.teacher_name || s.platform_name || 'اسم المدرس';
  const isOwner = profile?.role === 'super_admin';
  const all = profile?.role === 'student' && profile.grade
    ? store.courses.filter(c => c.grade === profile.grade || c.grade === 'كل المراحل' || c.price === 0)
    : store.courses;
  const grades = [...new Set(all.map(c => c.grade).filter(Boolean))];

  const photo = s.teacher_image
    ? `<img src="${escapeHtml(s.teacher_image)}" alt="${escapeHtml(name)}" class="w-full h-full object-cover object-top">`
    : `<div class="w-full h-full flex flex-col items-center justify-center text-white/90 gap-3"><i class="fa-solid fa-chalkboard-user text-8xl"></i>${isOwner ? '<a href="#/admin" class="text-xs bg-white/25 px-3 py-1 rounded-full">ارفع صورتك من الإعدادات</a>' : ''}</div>`;

  const features = [
    ['fa-circle-play', 'شرح بالفيديو', 'محاضرات مسجلة تشوفها في أي وقت'],
    ['fa-list-check', 'امتحانات وواجبات', 'تصحيح فوري ومتابعة من المدرس'],
    ['fa-chart-line', 'متابعة التقدم', 'تعرف وصلت فين في كل كورس'],
    ['fa-wallet', 'شحن سهل', 'محفظة وأكواد شحن بدون تعقيد']
  ];

  el.innerHTML = `
    <section class="hero animate-fade-up mb-8">
      <div class="grid md:grid-cols-5 gap-8 items-center p-6 md:p-12">
        <div class="md:col-span-3 order-2 md:order-1 text-center md:text-right">
          <span class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-soft text-blue-600 dark:text-blue-300 text-sm font-bold mb-5"><i class="fa-solid fa-circle text-[8px] text-emerald-500"></i>${escapeHtml(s.teacher_title || 'مدرس')}</span>
          <h1 class="text-4xl md:text-6xl font-black leading-tight text-main mb-4">${escapeHtml(name)}</h1>
          <p class="text-xl md:text-2xl font-bold text-primary mb-3">${escapeHtml(s.hero_title || 'تعلّم بذكاء، وابني مستقبلك')}</p>
          <p class="text-muted text-base md:text-lg leading-relaxed mb-7 max-w-xl mx-auto md:mx-0">${escapeHtml(s.hero_subtitle || s.teacher_bio || 'شرح مبسّط، متابعة مستمرة، وامتحانات تقيس مستواك.')}</p>
          <div class="flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#/courses" class="btn-primary text-lg px-8">${escapeHtml(s.hero_btn1 || 'تصفح الكورسات')}<i class="fa-solid fa-arrow-left"></i></a>
            ${!profile ? `<a href="#/signup" class="btn-accent text-lg px-8">${escapeHtml(s.hero_btn2 || 'سجّل الآن')}</a>` : ''}
          </div>
        </div>
        <div class="md:col-span-2 order-1 md:order-2 flex justify-center py-4">
          <div class="hero-photo">
            <div class="frame">${photo}</div>
            <div class="float-chip" style="top:8%;left:-6%"><i class="fa-solid fa-book-open"></i>${all.length} كورس</div>
            <div class="float-chip" style="bottom:10%;right:-6%;animation-delay:1.5s"><i class="fa-solid fa-circle-check"></i>امتحانات تفاعلية</div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 animate-fade-up">
      ${features.map(f => `<div class="glass-card p-5 text-center"><div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-soft text-primary flex items-center justify-center text-xl"><i class="fa-solid ${f[0]}"></i></div><h3 class="font-extrabold text-main mb-1">${f[1]}</h3><p class="text-xs text-muted">${f[2]}</p></div>`).join('')}
    </section>

    <section class="mb-12">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-5">
        <h2 class="text-3xl font-black text-main">${profile?.role === 'student' ? 'كورسات ' + escapeHtml(profile.grade || 'صفك') : 'الكورسات'}</h2>
        <a href="#/courses" class="text-sm font-bold text-primary">عرض الكل <i class="fa-solid fa-arrow-left mr-1"></i></a>
      </div>
      ${grades.length > 1 ? `<div id="chips" class="flex gap-2 overflow-x-auto pb-3 mb-3"><button class="chip active" data-g="">الكل</button>${grades.map(g => `<button class="chip whitespace-nowrap" data-g="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('')}</div>` : ''}
      <div id="course-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </section>

    <section class="cta-band p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="text-center md:text-right">
        <h3 class="text-2xl md:text-3xl font-black mb-2">جاهز تبدأ مع ${escapeHtml(name)}؟</h3>
        <p class="text-blue-50/90">${escapeHtml((s.teacher_bio || 'أنشئ حسابك دلوقتي وابدأ أول محاضرة.').slice(0, 140))}</p>
      </div>
      <a href="${profile ? '#/courses' : '#/signup'}" class="bg-white text-blue-600 font-black rounded-2xl px-8 py-3 shadow-lg hover:scale-105 transition shrink-0">${profile ? 'ابدأ التعلم' : 'أنشئ حسابك'}</a>
    </section>`;

  const grid = el.querySelector('#course-grid');
  const draw = (g) => {
    const list = (g ? all.filter(c => c.grade === g) : all).slice(0, 9);
    grid.innerHTML = list.length ? list.map(c => `
      <div class="glass-card overflow-hidden group cursor-pointer" onclick="window.location.hash='#/courses/${c.id}'">
        <div class="h-44 bg-soft relative overflow-hidden">
          ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">` : `<div class="w-full h-full flex items-center justify-center text-5xl text-blue-300"><i class="fa-solid fa-book-open"></i></div>`}
          <span class="absolute top-3 right-3 bg-white/90 dark:bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-main">${escapeHtml(c.grade || 'عام')}</span>
        </div>
        <div class="p-5">
          <h3 class="font-extrabold text-lg text-main truncate group-hover:text-primary transition">${escapeHtml(c.title)}</h3>
          <div class="flex items-center justify-between mt-4">
            <span class="text-primary font-black text-xl">${c.price === 0 ? 'مجاني' : formatMoney(c.price)}</span>
            <span class="w-9 h-9 rounded-full bg-soft text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition"><i class="fa-solid fa-arrow-left text-xs"></i></span>
          </div>
        </div>
      </div>`).join('') : '<div class="glass-card p-12 text-center text-muted col-span-full">لا توجد كورسات متاحة حالياً</div>';
  };
  draw('');
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    el.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); draw(b.dataset.g);
  });
}
