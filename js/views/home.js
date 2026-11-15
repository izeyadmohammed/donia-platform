import { store } from '../config.js';
import { escapeHtml, formatMoney } from '../utils.js';

const BARS = ['#4ade80', '#60a5fa', '#41d6ff', '#c084fc', '#fbbf24', '#f472b6'];
const ICONS = ['fa-atom', 'fa-flask', 'fa-dna', 'fa-microscope', 'fa-vial', 'fa-seedling'];

export default async function homeView(el) {
  const profile = store.profile;
  const s = store.settings || {};
  const name = s.teacher_name || s.platform_name || 'مس اسم المدرسة';
  const title = s.teacher_title || 'مدرسة العلوم';
  const isOwner = profile?.role === 'super_admin';
  const all = profile?.role === 'student' && profile.grade
    ? store.courses.filter(c => c.grade === profile.grade || c.grade === 'كل المراحل' || c.price === 0)
    : store.courses;
  const grades = [...new Set(all.map(c => c.grade).filter(g => g && g !== 'كل المراحل'))];

  const photo = s.teacher_image
    ? `<img src="${escapeHtml(s.teacher_image)}" alt="${escapeHtml(name)}" class="hero-photo">`
    : `<div class="hero-placeholder"><i class="fa-solid fa-user-doctor text-8xl"></i>${isOwner ? '<a href="#/admin" class="text-xs bg-white/25 px-3 py-1 rounded-full">ارفعي صورتك من الإعدادات</a>' : ''}</div>`;

  const paras = (s.hero_subtitle || s.teacher_bio)
    ? [s.hero_subtitle || s.teacher_bio]
    : ['بخبرتي مش هتذاكر العلوم حفظ وبس… لكن هتفهم إزاي الظواهر بتحصل وتربط المعلومة بالحياة.',
       'هدفي إنك تحب العلوم وتشوفها مادة ممتعة وسهلة، وتخش أي امتحان وإنت واثق.'];

  const why = [
    ['fa-flask', 'شرح مبسّط بالتجارب', 'بنربط العلوم بالحياة اليومية بالتجارب والصور والرسومات عشان المعلومة تثبت.', 'bg-dodger-800/50', 'rounded-tr-[200px] rounded-br-2xl rounded-tl-2xl rounded-bl-2xl', 'left-4'],
    ['fa-vial-circle-check', 'مراجعات وامتحانات', 'اختبارات تفاعلية على النظام الجديد مع تصحيح فوري ومراجعات نهائية قبل الامتحان.', 'bg-[#47C780]', 'rounded-2xl', 'left-0 right-0 mx-auto'],
    ['fa-chart-line', 'متابعة مستمرة', 'متابعة لمستواك وتقدمك في كل كورس، ودعم مباشر لحد ما تتأكد إنك فاهم.', 'bg-dodger-800/50', 'rounded-tl-[200px] rounded-bl-2xl rounded-tr-2xl rounded-br-2xl', 'right-4']
  ];

  el.innerHTML = `
    <section class="hero-section full-bleed">
      <div class="hero-inner">
        <div class="hero-grid">
          <div class="fade-right text-center md:text-right space-y-6 order-2 md:order-1">
            <h1 class="hero-title text-main">${escapeHtml(title)}<br><span class="text-dodger-800 dark:text-dodger-200">${escapeHtml(name)}</span></h1>
            <div class="font-ibm text-lg md:text-xl space-y-3 text-main opacity-90">
              ${profile ? `<p class="text-2xl lg:text-3xl">أهلاً بيك يا ${escapeHtml((profile.name || 'بطل').split(' ')[0])}<br>تابع آخر الكورسات</p>` : paras.map(p => `<p class="md:w-4/5">${escapeHtml(p)}</p>`).join('')}
            </div>
            <div class="pt-2"><a href="${profile ? '#/courses' : '#/signup'}" class="btn-primary w-full max-w-[350px] py-3 text-lg">${profile ? 'كورساتي' : 'انضم لعيلة ' + escapeHtml(name)}</a></div>
          </div>
          <div class="fade-left hero-photo-wrap order-1 md:order-2">${photo}</div>
        </div>
      </div>
    </section>

    ${grades.length ? `
    <section class="py-14 animate-fade-up">
      <div class="sec-title mb-12 text-center">
        <div><h2 class="font-head text-4xl md:text-5xl text-dodger-800 dark:text-dodger-200 mb-3">جميع المراحل الدراسية</h2>
        <p class="font-ibm text-muted">اختصرنالك الطريق: اختار سنتك الدراسية وشوف المحتوى الخاص بيك</p></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        ${grades.map((g, i) => `
          <div class="year-card" data-grade="${escapeHtml(g)}">
            <div class="bar" style="background:${BARS[i % BARS.length]}"></div>
            <div class="art"><i class="fa-solid ${ICONS[i % ICONS.length]}"></i></div>
            <div class="info"><h3 class="font-head text-lg text-main">${escapeHtml(g)}</h3><p class="text-sm text-muted">${all.filter(c => c.grade === g).length} كورس</p></div>
          </div>`).join('')}
      </div>
    </section>` : ''}

    <section id="courses-sec" class="py-10">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h2 class="font-head text-3xl md:text-4xl text-dodger-800 dark:text-dodger-200">${profile?.role === 'student' ? 'كورسات ' + escapeHtml(profile.grade || 'صفك') : 'أحدث الكورسات'}</h2>
        <a href="#/courses" class="font-bold text-primary">عرض الكل <i class="fa-solid fa-arrow-left mr-1"></i></a>
      </div>
      ${grades.length > 1 ? `<div id="chips" class="flex gap-2 overflow-x-auto pb-3 mb-4"><button class="chip active" data-g="">الكل</button>${grades.map(g => `<button class="chip" data-g="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('')}</div>` : ''}
      <div id="course-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10"></div>
    </section>

    <section class="why-section full-bleed py-20 mt-10">
      <div class="px-4 max-w-6xl mx-auto">
        <h2 class="font-head text-4xl md:text-5xl text-center mb-14 text-main">ليه تختار .. <span class="text-dodger-800 dark:text-dodger-200">${escapeHtml(name)}</span></h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          ${why.map(w => `
            <div class="why-card ${w[3]} ${w[4]} animate-fade-up">
              <div class="ic ${w[5]}"><i class="fa-solid ${w[0]}"></i></div>
              <h3 class="font-bold text-xl mb-2 font-ibm">${w[1]}</h3>
              <p class="text-white/90 text-sm leading-relaxed font-ibm">${w[2]}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`;

  const grid = el.querySelector('#course-grid');
  const draw = (g) => {
    const list = (g ? all.filter(c => c.grade === g) : all).slice(0, 9);
    grid.innerHTML = list.length ? list.map(c => `
      <div class="course-card group cursor-pointer" onclick="window.location.hash='#/courses/${c.id}'">
        <div class="pic">${c.image ? `<img src="${escapeHtml(c.image)}" alt="">` : `<div class="w-full h-full flex items-center justify-center text-6xl text-white" style="background:linear-gradient(135deg,#0171dd,#41d6ff)"><i class="fa-solid fa-flask"></i></div>`}</div>
        <div class="body">
          <span class="inline-block text-xs font-bold px-3 py-1 rounded-md bg-yellow-500/40 mb-2 text-main">${escapeHtml(c.grade || 'عام')}</span>
          <h3 class="font-head text-lg text-main truncate">${escapeHtml(c.title)}</h3>
          <div class="divider-2"></div>
          <div class="flex items-center justify-between"><span class="text-muted text-sm">السعر</span><span class="font-black text-xl text-primary">${c.price === 0 ? 'مجاني' : formatMoney(c.price)}</span></div>
        </div>
      </div>`).join('') : '<div class="glass-card p-12 text-center text-muted col-span-full">لا توجد كورسات متاحة حالياً</div>';
  };
  draw('');
  const setChip = (g) => { el.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x.dataset.g === g)); draw(g); };
  el.querySelectorAll('.chip').forEach(b => b.onclick = () => setChip(b.dataset.g));
  el.querySelectorAll('.year-card').forEach(c => c.onclick = () => { setChip(c.dataset.grade); el.querySelector('#courses-sec').scrollIntoView({ behavior: 'smooth' }); });
}
