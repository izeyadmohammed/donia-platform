import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBrandInfo,
  whatsappUrl,
  youtubeEmbed,
  isValidEgyptPhone,
  isValidPassword,
  isValidPersonName,
  calcAssignmentMcqScore,
  filterCourses,
  scoreSampleQuiz,
  computeStudentSummary
} from '../js/helpers.js';

test('resolveBrandInfo separates platform_name and teacher_name properly', () => {
  const brand = resolveBrandInfo({
    platform_name: 'بسطهالك',
    teacher_name: 'م/ دنيا',
    teacher_title: 'science ',
    teacher_bio: 'خبره 5 سنوات'
  });
  assert.equal(brand.platformName, 'بسطهالك');
  assert.equal(brand.teacherName, 'م/ دنيا');
  assert.equal(brand.teacherTitle, 'science');
  assert.equal(brand.heroSubtitle, 'خبره 5 سنوات');
  assert.equal(brand.hasDistinctPlatform, true);
});

test('resolveBrandInfo falls back cleanly when settings are empty', () => {
  const brand = resolveBrandInfo({});
  assert.equal(brand.platformName, 'منصتي التعليمية');
  assert.equal(brand.teacherName, 'المعلم');
  assert.equal(brand.hasDistinctPlatform, false);
});

test('whatsappUrl formats local Egyptian numbers with country code 2', () => {
  assert.equal(whatsappUrl('01126346329'), 'https://wa.me/201126346329');
  assert.equal(whatsappUrl('+20 112 634 6329'), 'https://wa.me/201126346329');
  assert.equal(whatsappUrl('201126346329'), 'https://wa.me/201126346329');
  assert.equal(whatsappUrl(''), '');
});

test('youtubeEmbed handles watch, youtu.be, embed, and shorts URLs', () => {
  assert.equal(youtubeEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(youtubeEmbed('https://youtube.com/shorts/dQw4w9WgXcQ'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('signup validators enforce Egyptian phone, password, and name rules', () => {
  assert.equal(isValidEgyptPhone('01126346329'), true);
  assert.equal(isValidEgyptPhone('01926346329'), false);
  assert.equal(isValidEgyptPhone('12345'), false);
  assert.equal(isValidPassword('Pass1234!'), true);
  assert.equal(isValidPassword('short1'), false);
  assert.equal(isValidPersonName('دنيا'), true);
  assert.equal(isValidPersonName('Donia'), true);
  assert.equal(isValidPersonName('123'), false);
});

test('calcAssignmentMcqScore skips essay questions and missing options safely', () => {
  const questions = [
    { type: 'mcq', options: [{ text: 'أ' }, { text: 'ب' }], correctIndex: 1 },
    { type: 'essay', questionText: 'اشرح' },
    { type: 'mcq', options: [{ text: 'س' }, { text: 'ص' }], correctIndex: 0 }
  ];
  const res = calcAssignmentMcqScore(questions, [1, 'نص', null]);
  assert.equal(res.correct, 1);
  assert.equal(res.total, 2);
  assert.match(res.summary, /س1: إجابتك \(ب\) - الصح \(ب\)/);
  assert.match(res.summary, /س3: إجابتك \(لم يجب\) - الصح \(س\)/);
});

test('filterCourses filters by student grade, priceType, sortBy, and search query', () => {
  const courses = [
    { id: 'c1', title: 'علوم اولى اعدادي', grade: 'الأول الإعدادي', price: 100 },
    { id: 'c2', title: 'مراجعة عامة', grade: 'كل المراحل', price: 0 },
    { id: 'c3', title: 'علوم تالتة اعدادي', grade: 'الثالث الإعدادي', price: 150 }
  ];
  const student = { role: 'student', grade: 'الأول الإعدادي', enrolled_courses: [] };
  assert.equal(filterCourses(courses, { profile: student }).length, 2);
  assert.equal(filterCourses(courses, { grade: 'الثالث الإعدادي' }).length, 1);
  assert.equal(filterCourses(courses, { query: 'مراجعة' }).length, 1);
  assert.equal(filterCourses(courses, { priceType: 'free' }).length, 1);
  assert.equal(filterCourses(courses, { priceType: 'paid' }).length, 2);
  assert.equal(filterCourses(courses, { sortBy: 'price_desc' })[0].id, 'c3');
});

test('scoreSampleQuiz and computeStudentSummary return accurate metrics', () => {
  const quiz = [
    { correctIndex: 0 },
    { correctIndex: 2 },
    { correctIndex: 1 }
  ];
  assert.deepEqual(scoreSampleQuiz(quiz, [0, 1, null]), { answered: 2, correct: 1, total: 3, percent: 33 });

  const summary = computeStudentSummary(
    [{ id: 'c1' }, { id: 'c2' }],
    ['c1'],
    [{ score: 8, total: 10 }, { score: 10, total: 10 }]
  );
  assert.deepEqual(summary, { enrolledCount: 1, submissionsCount: 2, avgPercent: 90 });
});
