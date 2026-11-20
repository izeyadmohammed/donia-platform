import { supabase } from './config.js';

export {
  escapeHtml,
  uid,
  formatDate,
  formatMoney,
  youtubeEmbed,
  normalizeWhatsappNumber,
  whatsappUrl,
  resolveBrandInfo,
  isValidPersonName,
  isValidEgyptPhone,
  isValidPassword,
  calcAssignmentMcqScore,
  filterCourses,
  scoreSampleQuiz,
  computeStudentSummary
} from './helpers.js';

export async function compressImage(file, maxW = 1000, quality = 0.75) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = img.width * sc;
        c.height = img.height * sc;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = rej;
      img.src = e.target.result;
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function watermark(el, text) {
  if (!el) return;
  el.style.position = 'relative';
  const layer = document.createElement('div');
  layer.className = 'watermark-layer';
  const s = document.createElement('span');
  s.className = 'watermark-item';
  s.textContent = text;
  layer.appendChild(s);
  el.appendChild(layer);
}

export function lockExamPage() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) e.preventDefault();
    if (e.ctrlKey && e.key.toUpperCase() === 'U') e.preventDefault();
    if (e.ctrlKey && e.key.toUpperCase() === 'P') e.preventDefault();
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      navigator.clipboard?.writeText('').catch(() => {});
    }
  });
}

export async function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  try {
    const { data, error } = await supabase.storage.from('images').createSignedUrl(path, 3600);
    if (error) {
      console.warn('Error getting signed URL:', error);
      return '';
    }
    return data.signedUrl;
  } catch (e) {
    console.warn('Error getting signed URL:', e);
    return '';
  }
}
