export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ar-EG');
  } catch {
    return iso;
  }
}

export function formatMoney(n) {
  return Number(n || 0).toLocaleString('ar-EG') + ' ج.م';
}

export function youtubeEmbed(url) {
  if (!url) return '';
  const m = String(url).match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([\w-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export function normalizeWhatsappNumber(phone = '') {
  const digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return '2' + digits;
  return digits;
}

export function whatsappUrl(phone = '') {
  const normalized = normalizeWhatsappNumber(phone);
  return normalized ? `https://wa.me/${normalized}` : '';
}

export function resolveBrandInfo(settings = {}) {
  const s = settings || {};
  const platformName = (s.platform_name || '').trim() || 'منصتي التعليمية';
  const teacherName = (s.teacher_name || '').trim() || 'المعلم';
  const teacherTitle = (s.teacher_title || '').trim() || 'منصة تعليمية متكاملة';
  const heroTitle = (s.hero_title || '').trim();
  const heroSubtitle = (s.hero_subtitle || '').trim() || (s.teacher_bio || '').trim();
  const heroBtn1 = (s.hero_btn1 || '').trim();
  const heroBtn2 = (s.hero_btn2 || '').trim();

  return {
    platformName,
    teacherName,
    teacherTitle,
    heroTitle,
    heroSubtitle,
    heroBtn1,
    heroBtn2,
    hasDistinctPlatform: Boolean(s.platform_name && s.teacher_name && s.platform_name.trim() !== s.teacher_name.trim())
  };
}

export function isValidPersonName(name = '') {
  const trimmed = String(name).trim();
  if (!trimmed) return false;
  return /^[\u0600-\u06FF\s]+$/.test(trimmed) || /^[a-zA-Z\s]+$/.test(trimmed);
}

export function isValidEgyptPhone(phone = '') {
  const cleanPhone = String(phone).trim();
  return /^(010|011|012|015)[0-9]{8}$/.test(cleanPhone);
}

export function isValidPassword(pass = '') {
  if (typeof pass !== 'string' || pass.length < 8) return false;
  for (let i = 0; i < pass.length; i++) {
    const c = pass.charCodeAt(i);
    const isDigit = c >= 48 && c <= 57;
    const isUpper = c >= 65 && c <= 90;
    const isLower = c >= 97 && c <= 122;
    const isSymbol = [
      33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
      58, 59, 60, 61, 62, 63, 64, 91, 92, 93, 94, 95, 96, 123, 124, 125, 126
    ].includes(c);
    if (!isDigit && !isUpper && !isLower && !isSymbol) return false;
  }
  return true;
}

export function calcAssignmentMcqScore(questions = [], answers = []) {
  let correct = 0;
  let total = 0;
  const lines = [];

  (questions || []).forEach((q, i) => {
    if (!q || q.type === 'essay' || !Array.isArray(q.options) || q.options.length === 0) {
      return;
    }
    total++;
    const chosenIdx = answers[i];
    const hasChosen = chosenIdx !== null && chosenIdx !== undefined && q.options[chosenIdx];
    const hasCorrect = q.correctIndex !== null && q.correctIndex !== undefined && q.options[q.correctIndex];
    if (chosenIdx === q.correctIndex) correct++;

    const chosenText = hasChosen ? q.options[chosenIdx].text : 'لم يجب';
    const correctText = hasCorrect ? q.options[q.correctIndex].text : '-';
    lines.push(`س${i + 1}: إجابتك (${chosenText}) - الصح (${correctText})`);
  });

  return { correct, total, summary: lines.join('\n') };
}

export function filterCourses(
  courses = [],
  { grade = '', query = '', priceType = 'all', sortBy = 'newest', profile = null } = {}
) {
  let list = Array.isArray(courses) ? [...courses] : [];
  if (profile?.role === 'student' && profile.grade) {
    list = list.filter(
      (c) =>
        c.grade === profile.grade ||
        c.grade === 'كل المراحل' ||
        c.price === 0 ||
        (profile.enrolled_courses || []).includes(c.id)
    );
  }
  if (grade) {
    list = list.filter((c) => c.grade === grade);
  }
  if (priceType === 'free') {
    list = list.filter((c) => Number(c.price || 0) === 0);
  } else if (priceType === 'paid') {
    list = list.filter((c) => Number(c.price || 0) > 0);
  }
  const q = String(query || '').trim().toLowerCase();
  if (q) {
    list = list.filter(
      (c) =>
        String(c.title || '').toLowerCase().includes(q) ||
        String(c.description || '').toLowerCase().includes(q) ||
        String(c.grade || '').toLowerCase().includes(q)
    );
  }
  if (sortBy === 'price_asc') {
    list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortBy === 'price_desc') {
    list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }
  return list;
}

export function scoreSampleQuiz(questions = [], answers = []) {
  let answered = 0;
  let correct = 0;
  (questions || []).forEach((q, idx) => {
    const pick = answers[idx];
    if (pick !== null && pick !== undefined) {
      answered++;
      if (pick === q.correctIndex) correct++;
    }
  });
  const total = (questions || []).length;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { answered, correct, total, percent };
}

export function computeStudentSummary(courses = [], enrolledIds = [], submissions = []) {
  const enrolledCourses = (courses || []).filter((c) => (enrolledIds || []).includes(c.id));
  const graded = (submissions || []).filter((s) => typeof s.score === 'number' && typeof s.total === 'number' && s.total > 0);
  const avgPercent = graded.length
    ? Math.round(graded.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / graded.length)
    : null;
  return {
    enrolledCount: enrolledCourses.length,
    submissionsCount: (submissions || []).length,
    avgPercent
  };
}
