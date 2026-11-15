import { store } from './config.js';
import { setLoading } from './ui.js';

const routes = {
  '#/home': () => import('./views/home.js'),
  '#/login': () => import('./views/auth-views.js'),
  '#/signup': () => import('./views/auth-views.js'),
  '#/courses': () => import('./views/courses.js'),
  '#/courses/:id': () => import('./views/courses.js'),
  '#/lesson/:id': () => import('./views/lesson.js'),
  '#/student': () => import('./views/student.js'),
  '#/teacher': () => import('./views/teacher.js'),
  '#/teacher/courses': () => import('./views/teacher.js'),
  '#/teacher/assistants': () => import('./views/teacher.js'),
  '#/teacher/students': () => import('./views/teacher.js'),
  '#/teacher/grading': () => import('./views/teacher.js'),
  '#/admin': () => import('./views/admin.js'),
  '#/admin/students': () => import('./views/admin.js'),
  '#/admin/codes': () => import('./views/admin.js'),
  '#/admin/verify-codes': () => import('./views/admin.js'),
  '#/admin/assistants': () => import('./views/admin.js'),
  '#/admin/admins': () => import('./views/admin.js'),
  '#/exam/:lectureId/:examId': () => import('./views/exam.js'),
  '#/assignment/:lectureId/:examId': () => import('./views/assignment.js'),
  '#/notifications': () => import('./views/notifications.js'),
  '#/policy/:type': () => import('./views/policy.js'),
  '#/about': () => import('./views/about.js'),
  '#/contact': () => import('./views/contact.js'),
};

function matchRoute(hash) {
  for (const pat of Object.keys(routes)) {
    const regex = new RegExp('^' + pat.replace(/:[^/]+/g, '([^/]+)') + '$');
    const m = hash.match(regex);
    if (m) return { loader: routes[pat], params: m.slice(1), pattern: pat };
  }
  return null;
}

export async function route() {
  const hash = (location.hash || '#/home').split('?')[0];
  const m = matchRoute(hash);
  const main = document.getElementById('app-main');

  if (!m) {
    main.innerHTML = `<div class="text-center py-20"><h2 class="text-2xl font-bold text-main">404</h2></div>`;
    return;
  }

  setLoading(main);
  try {
    const mod = await m.loader();
    main.innerHTML = '';
    await mod.default(main, m.params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    main.innerHTML = `<div class="text-center py-20 text-red-400"><p>خطأ: ${e.message}</p></div>`;
  }
}
