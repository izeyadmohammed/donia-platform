import { store } from '../config.js';
import { escapeHtml, formatMoney, resolveBrandInfo } from '../utils.js';

const BARS = ['#0171dd', '#16a34a', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899'];
const ICONS = ['fa-atom', 'fa-flask', 'fa-dna', 'fa-microscope', 'fa-vial', 'fa-seedling'];

const FAQS = [
  {
    q: 'كيف أنشئ حساب طالب جديد على المنصة؟',
    a: 'اضغط على زر «حساب جديد» واختر صفك الدراسي وأدخل بياناتك ورقم ولي الأمر، وسيتم تفعيل حسابك فوراً لتصفح الكورسات والاختبارات.'
  },
  {
    q: 'كيف أشحن رصيد المحفظة وأشترك في الكورس؟',
    a: 'تواصل مع الدعم عبر زر واتساب للحصول على كود الشحن، ثم أدخله من أيقونة المحفظة بالأعلى أو من صفحة الكورس واضغط «اشترك الآن».'
  },
  {
    q: 'هل توجد متابعة للواجبات والامتحانات؟',
    a: 'نعم، كل محاضرة تضم فيديوهات الشرح والمذكرات، وتصحيحاً فورياً لأسئلة الاختيار من متعدد، ومراجعة من المعلم للواجبات المقالية مع إشعار فوري بالنتيجة.'
  },
  {
    q: 'كيف أتابع تقدمي داخل كل كورس؟',
    a: 'تظهر نسبة إنجازك مباشرة في صفحة الكورس وفي لوحة الطالب، مع زر «كمّل من حيث وقفت» للعودة فوراً إلى آخر محاضرة.'
  }
];

export default async function homeView(el) {
  const profile = store.profile;
  const s = store.settings || {};
  const brand = resolveBrandInfo(s);
  const isOwner = profile?.role === 'super_admin' || profile?.role === 'admin';

  const all =
    profile?.role === 'student' && profile.grade
      ? store.courses.filter((c) => c.grade === profile.grade || c.grade === 'كل المراحل' || c.price === 0)
      : store.courses;
  const grades = [...new Set(all.map((c) => c.grade).filter((g) => g && g !== 'كل المراحل'))];

  const photo = s.teacher_image
    ? `<div class="hero-photo-frame">
        <img src="${escapeHtml(s.teacher_image)}" alt="${escapeHtml(brand.teacherName)}" referrerpolicy="no-referrer" class="hero-photo" onerror="this.parentElement.innerHTML='<div class=&quot;hero-placeholder&quot;><i class=&quot;fa-solid fa-user-graduate text-7xl&quot;></i><p class=&quot;font-bold text-lg&quot;>${escapeHtml(brand.teacherName)}</p></div>'">
        <div class="hero-photo-caption">
          <p class="font-head text-lg text-white">${escapeHtml(brand.teacherName)}</p>
          <p class="text-xs text-sky-200 font-bold">${escapeHtml(brand.teacherTitle)}</p>
        </div>
      </div>`
    : `<div class="hero-photo-frame">
        <div class="hero-placeholder">
          <i class="fa-solid fa-atom text-7xl"></i>
          <p class="font-head text-xl">${escapeHtml(brand.teacherName)}</p>
          ${isOwner ? '<a href="#/admin" class="text-xs bg-white/25 hover:bg-white/35 px-4 py-1.5 rounded-full font-bold transition">ارفع صورة المعلم من الإعدادات</a>' : ''}
        </div>
      </div>`;

  const paras = brand.heroSubtitle
    ? [brand.heroSubtitle]
    : [
        'شرح مبسّط يربط المفاهيم العلمية بالتجارب والحياة اليومية عشان الفهم يثبت من أول مرة.',
        'امتحانات تفاعلية وواجبات ومتابعة مستمرة لمستواك لحد يوم الامتحان.'
      ];

  const primaryCtaHref = profile ? '#/courses' : '#/signup';
  const primaryCtaText = profile
    ? brand.heroBtn1 || 'تصفح الكورسات'
    : brand.heroBtn2 || `انضم لمنصة ${brand.platformName}`;

  const headlineHtml = brand.heroTitle
    ? `${escapeHtml(brand.heroTitle)}<br><span class="text-dodger-800 dark:text-dodger-200">${escapeHtml(brand.teacherName)}</span>`
    : `${escapeHtml(brand.teacherName)}<br><span class="text-dodger-800 dark:text-dodger-200 text-[0.72em]">${escapeHtml(brand.teacherTitle)}</span>`;

  const why = [
    [
      'fa-flask',
      'شرح مبسّط بالتجارب',
      'نربط العلوم بالحياة اليومية بالتجارب والرسومات التوضيحية عشان المعلومة تثبت بالفهم مش بالحفظ.'
    ],
    [
      'fa-vial-circle-check',
      'مراجعات وامتحانات',
      'اختبارات إلكترونية على النظام الجديد مع تصحيح فوري وواجبات ومتابعة شاملة بعد كل محاضرة.'
    ],
    [
      'fa-chart-line',
      'متابعة مستمرة',
      'متابعة دقيقة لمستوى الطالب وتقدمه في كل كورس، مع تواصل مباشر ودعم مستمر.'
    ]
  ];

  el.innerHTML = `
    <section class="hero-section full-bleed">
      <div class="hero-inner">
        <div class="hero-grid">
          <div class="fade-right text-center md:text-right space-y-5 order-2 md:order-1">
            ${brand.hasDistinctPlatform ? `<p class="hero-eyebrow">منصة ${escapeHtml(brand.platformName)} التعليمية</p>` : ''}
            <h1 class="hero-title text-main">${headlineHtml}</h1>
            <div class="font-ibm text-base md:text-lg space-y-2 text-muted leading-relaxed">
              ${
                profile
                  ? `<p class="text-xl lg:text-2xl text-main font-bold">أهلاً بيك يا ${escapeHtml((profile.name || 'بطل').split(' ')[0])} — كمّل رحلتك التعليمية الآن</p>`
                  : paras.map((p) => `<p class="md:w-11/12">${escapeHtml(p)}</p>`).join('')
              }
            </div>
            <div class="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <a href="${primaryCtaHref}" class="btn-primary px-7 py-3.5 text-base">${escapeHtml(primaryCtaText)}</a>
              <a href="#/courses" class="btn-outline px-6 py-3.5 text-base">${escapeHtml(brand.heroBtn1 || 'استعرض الكورسات')}</a>
            </div>
          </div>
          <div class="fade-left hero-photo-wrap order-1 md:order-2">${photo}</div>
        </div>
      </div>
    </section>

    <section class="full-bleed border-y border-border bg-[var(--color-third-container)]" aria-label="ملخص المنصة">
      <div class="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border text-center">
        <div class="py-3 sm:py-1 px-4">
          <p class="font-head text-2xl md:text-3xl text-primary tabular-nums">${all.length}</p>
          <p class="text-sm font-bold text-muted mt-1">كورسات متاحة حالياً</p>
        </div>
        <div class="py-3 sm:py-1 px-4">
          <p class="font-head text-2xl md:text-3xl text-primary tabular-nums">${grades.length || 1}</p>
          <p class="text-sm font-bold text-muted mt-1">مراحل تعليمية مدعومة</p>
        </div>
        <div class="py-3 sm:py-1 px-4">
          <p class="font-head text-2xl md:text-3xl text-primary">تصحيح فوري</p>
          <p class="text-sm font-bold text-muted mt-1">امتحانات وواجبات بعد كل محاضرة</p>
        </div>
      </div>
    </section>

    ${
      grades.length
        ? `
    <section class="py-12 animate-fade-up">
      <div class="sec-title mb-10 text-center">
        <div>
          <h2 class="font-head text-3xl md:text-4xl text-dodger-800 dark:text-dodger-200 mb-2">جميع المراحل الدراسية</h2>
          <p class="font-ibm text-muted text-sm md:text-base">اختر مرحلتك الدراسية وتصفح الكورسات المتاحة لك مباشرة</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${grades
          .map(
            (g, i) => `
          <button type="button" class="year-card" data-grade="${escapeHtml(g)}">
            <div class="bar" style="background:${BARS[i % BARS.length]}"></div>
            <div class="art"><i class="fa-solid ${ICONS[i % ICONS.length]}"></i></div>
            <div class="info">
              <h3 class="font-head text-lg text-main mb-1">${escapeHtml(g)}</h3>
              <p class="text-sm text-muted tabular-nums">${all.filter((c) => c.grade === g).length} كورس</p>
            </div>
          </button>`
          )
          .join('')}
      </div>
    </section>`
        : ''
    }

    <section id="courses-sec" class="py-10">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h2 class="font-head text-3xl md:text-4xl text-dodger-800 dark:text-dodger-200">${profile?.role === 'student' ? 'كورسات ' + escapeHtml(profile.grade || 'صفك') : 'أحدث الكورسات'}</h2>
          <p class="text-sm text-muted mt-1">كورسات منظمة بالمحاضرات والمذكرات والاختبارات</p>
        </div>
        <a href="#/courses" class="font-bold text-primary hover:underline whitespace-nowrap">عرض الكل <i class="fa-solid fa-arrow-left mr-1"></i></a>
      </div>
      ${grades.length > 1 ? `<div id="chips" class="flex gap-2 overflow-x-auto pb-3 mb-4"><button type="button" class="chip active" data-g="">الكل</button>${grades.map((g) => `<button type="button" class="chip" data-g="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join('')}</div>` : ''}
      <div id="course-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </section>

    <section class="why-section full-bleed py-16 mt-4">
      <div class="px-4 max-w-6xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="font-head text-3xl md:text-4xl text-main mb-2">لماذا تختار <span class="text-dodger-800 dark:text-dodger-200">${escapeHtml(brand.platformName)}</span>؟</h2>
          <p class="text-muted text-sm md:text-base">تجربة تعليمية متكاملة بإشراف ${escapeHtml(brand.teacherName)}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${why
            .map(
              (w) => `
            <div class="why-card animate-fade-up">
              <div class="ic"><i class="fa-solid ${w[0]}"></i></div>
              <h3 class="font-head text-xl text-main">${w[1]}</h3>
              <p class="text-muted text-sm leading-relaxed font-ibm">${w[2]}</p>
            </div>`
            )
            .join('')}
        </div>
      </div>
    </section>

    <section class="py-14 max-w-4xl mx-auto" aria-labelledby="faq-title">
      <div class="text-center mb-8">
        <h2 id="faq-title" class="font-head text-3xl text-main mb-2">الأسئلة الشائعة</h2>
        <p class="text-sm text-muted">إجابات واضحة حول التسجيل والاشتراك ونظام الدراسة</p>
      </div>
      <div class="space-y-3" id="faq-list">
        ${FAQS.map(
          (item, idx) => `
          <div class="glass-card overflow-hidden">
            <button type="button" class="w-full p-5 flex items-center justify-between gap-4 text-right font-head text-base md:text-lg text-main hover:text-primary transition" data-faq-btn="${idx}" aria-expanded="false">
              <span>${escapeHtml(item.q)}</span>
              <i class="fa-solid fa-chevron-down text-sm text-muted transition-transform duration-200" data-faq-icon="${idx}"></i>
            </button>
            <div id="faq-panel-${idx}" class="hidden px-5 pb-5 pt-0 text-sm md:text-base text-muted leading-relaxed font-ibm border-t border-border/60">
              <p class="pt-4">${escapeHtml(item.a)}</p>
            </div>
          </div>`
        ).join('')}
      </div>
    </section>`;

  const grid = el.querySelector('#course-grid');
  const draw = (g) => {
    const list = (g ? all.filter((c) => c.grade === g) : all).slice(0, 9);
    grid.innerHTML = list.length
      ? list
          .map(
            (c) => `
      <a href="#/courses/${encodeURIComponent(c.id)}" class="course-card group">
        <div class="pic">
          ${
            c.image
              ? `<img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.title)}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=&quot;w-full h-full flex items-center justify-center text-5xl text-white&quot; style=&quot;background:linear-gradient(135deg,#0171dd,#41d6ff)&quot;><i class=&quot;fa-solid fa-flask&quot;></i></div>'">`
              : `<div class="w-full h-full flex items-center justify-center text-5xl text-white" style="background:linear-gradient(135deg,#0171dd,#41d6ff)"><i class="fa-solid fa-flask"></i></div>`
          }
        </div>
        <div class="body">
          <p class="text-xs font-bold text-muted">${escapeHtml(c.grade || 'كل المراحل')}</p>
          <h3 class="font-head text-lg text-main truncate">${escapeHtml(c.title)}</h3>
          ${c.description ? `<p class="text-xs text-muted line-clamp-2">${escapeHtml(c.description)}</p>` : ''}
          <div class="mt-auto pt-3 border-t border-border flex items-center justify-between">
            <span class="font-black text-lg text-primary tabular-nums">${c.price === 0 ? 'مجاني' : formatMoney(c.price)}</span>
            <span class="text-xs font-bold text-primary flex items-center gap-1">التفاصيل <i class="fa-solid fa-arrow-left"></i></span>
          </div>
        </div>
      </a>`
          )
          .join('')
      : '<div class="glass-card p-12 text-center text-muted col-span-full">لا توجد كورسات متاحة حالياً</div>';
  };
  draw('');
  const setChip = (g) => {
    el.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x.dataset.g === g));
    draw(g);
  };
  el.querySelectorAll('.chip').forEach((b) => (b.onclick = () => setChip(b.dataset.g)));
  el.querySelectorAll('.year-card').forEach(
    (c) =>
      (c.onclick = () => {
        setChip(c.dataset.grade);
        el.querySelector('#courses-sec').scrollIntoView({ behavior: 'smooth' });
      })
  );

  // FAQ accordion
  el.querySelectorAll('[data-faq-btn]').forEach((btn) => {
    btn.onclick = () => {
      const idx = btn.dataset.faqBtn;
      const panel = el.querySelector(`#faq-panel-${idx}`);
      const icon = el.querySelector(`[data-faq-icon="${idx}"]`);
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      panel?.classList.toggle('hidden', expanded);
      if (icon) icon.style.transform = expanded ? '' : 'rotate(180deg)';
    };
  });
}
