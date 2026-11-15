import { login, signup, roleHomePath, loadProfile } from '../auth.js';
import { toast, modal } from '../ui.js';
import { supabase } from '../config.js';

export default async function authView(el) {
  const isSignup = location.hash === '#/signup';
  if (isSignup) renderSignup(el); else renderLogin(el);
}

function renderLogin(el) {
  el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 mt-10 animate-fade-up">
    <h2 class="text-2xl font-extrabold mb-6 text-center text-main">تسجيل الدخول</h2>
    <form id="login-form" class="space-y-4">
      <div><label class="block text-sm font-bold mb-1 text-muted">رقم الهاتف</label><input name="phone" required type="tel" placeholder="01xxxxxxxxx" class="input-field" dir="ltr"></div>
      <div><label class="block text-sm font-bold mb-1 text-muted">كلمة المرور</label><input name="password" required type="password" class="input-field" dir="ltr"></div>
      <button class="btn-primary w-full py-3">دخول</button>
      <div class="flex justify-between text-sm mt-4"><a href="#/signup" class="text-blue-500 hover:underline">حساب جديد</a><a href="#" id="forgot" class="text-red-500 hover:underline">نسيت كلمة المرور؟</a></div>
    </form></div>`;

  el.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await login(fd.get('phone').trim(), fd.get('password'));
      toast('تم الدخول بنجاح', 'success');
      
      const { loadProfile, roleHomePath } = await import('../auth.js');
      const profile = await loadProfile();
      
      if (profile) {
        window.location.href = window.location.origin + roleHomePath(profile.role);
      } else {
        window.location.hash = '#/home';
      }
    } catch (err) { toast(err.message, 'error'); }
  };

  el.querySelector('#forgot').onclick = (e) => {
    e.preventDefault();
    modal({ title: 'استعادة كلمة المرور', body: `<p class="mb-3">تواصل مع الدعم عبر واتساب:</p><a target="_blank" href="https://wa.me/201126346329" class="block text-center py-3 bg-green-500/20 text-green-500 rounded-lg font-bold border border-green-500/30"><i class="fa-brands fa-whatsapp"></i> فتح واتساب</a>` });
  };
}

function renderSignup(el) {
  const grades = ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  el.innerHTML = `<div class="glass-card max-w-md mx-auto p-8 mt-10 animate-fade-up">
    <h2 class="text-2xl font-extrabold mb-6 text-center text-main">إنشاء حساب جديد</h2>
    <form id="signup-form" class="space-y-3" novalidate>
      <div class="grid grid-cols-3 gap-2">
        <input name="name1" required placeholder="الاسم الأول" class="input-field text-sm">
        <input name="name2" required placeholder="اسم الأب" class="input-field text-sm">
        <input name="name3" required placeholder="الاسم الأخير" class="input-field text-sm">
      </div>

      <input name="phone" required type="tel" placeholder="رقم الهاتف (11 رقم)" class="input-field" dir="ltr" maxlength="11">
      <input name="parent_phone" required type="tel" placeholder="رقم ولي الأمر (11 رقم)" class="input-field" dir="ltr" maxlength="11">
      <select name="grade" required class="input-field">
        <option value="">اختر الصف</option>
        ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
      <input name="password" required type="password" minlength="8" placeholder="كلمة المرور (8 خانات على الأقل)" class="input-field" dir="ltr">

      <!-- كابتشا مرئية في التسجيل بس -->
      <div id="turnstile-widget" class="cf-turnstile" data-sitekey="0x4AAAAAAFotshjiLBUI1DY8" data-theme="light" style="margin: 10px 0;"></div>

      <div class="flex items-start gap-2 mt-4">
        <input type="checkbox" id="terms-checkbox" required class="mt-1 w-4 h-4 accent-blue-500">
        <label for="terms-checkbox" class="text-sm text-muted leading-tight">
          أوافق على <a href="#/policy/terms" target="_blank" class="text-blue-500 hover:underline">شروط الاستخدام</a> و <a href="#/policy/privacy" target="_blank" class="text-blue-500 hover:underline">سياسة الخصوصية</a>
        </label>
      </div>

      <div id="verify-code-box" class="hidden space-y-2 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
        <p class="text-sm text-blue-400 font-bold">لقد قمت بإنشاء حساب من هذا الجهاز سابقاً.</p>
        <p class="text-xs text-muted">يرجى التواصل مع الدعم للحصول على كود التحقق.</p>
        <input name="verify_code" id="verify-code-input" placeholder="أدخل كود التحقق" class="input-field text-center font-mono">
        <a target="_blank" href="https://wa.me/201126346329" class="block text-center text-sm text-green-500 hover:underline">تواصل مع الدعم</a>
      </div>

      <button type="submit" class="btn-primary w-full py-3 mt-2 opacity-50 cursor-not-allowed" id="signup-btn" disabled>جاري التحقق من الجهاز...</button>
      <a href="#/login" class="block text-center text-sm text-blue-500 hover:underline mt-3">لدي حساب بالفعل</a>
    </form></div>`;

  if (!document.getElementById('cf-turnstile-script')) {
    const script = document.createElement('script');
    script.id = 'cf-turnstile-script';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  const form = el.querySelector('#signup-form');
  const verifyBox = el.querySelector('#verify-code-box');
  const verifyInput = el.querySelector('#verify-code-input');
  const signupBtn = el.querySelector('#signup-btn');
  const termsCheckbox = el.querySelector('#terms-checkbox');
  
  let userIP = '';
  let needsVerification = false;
  let ipCheckDone = false;

  function isValidName(name) {
    const arabicRegex = /^[\u0600-\u06FF\s]+$/;
    const englishRegex = /^[a-zA-Z\s]+$/;
    return arabicRegex.test(name) || englishRegex.test(name);
  }

  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(async (data) => {
      userIP = data.ip;
      const { data: count } = await supabase.rpc('check_ip_accounts', { ip_input: userIP });
      const { data: settings } = await supabase.from('settings').select('max_accounts_per_ip').eq('id', 1).single();
      const maxAccounts = settings?.max_accounts_per_ip || 2;

      if (count >= maxAccounts) {
        needsVerification = true;
        verifyBox.classList.remove('hidden');
      }
      ipCheckDone = true;
      signupBtn.disabled = false;
      signupBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      signupBtn.textContent = 'تسجيل';
    })
    .catch(() => {
      needsVerification = true;
      verifyBox.classList.remove('hidden');
      ipCheckDone = true;
      signupBtn.disabled = false;
      signupBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      signupBtn.textContent = 'تسجيل';
    });

  function isValidPhone(phone) {
    const cleanPhone = phone.trim();
    return /^(010|011|012|015)[0-9]{8}$/.test(cleanPhone);
  }

  function isValidPassword(pass) {
    if (pass.length < 8) return false;
    for (let i = 0; i < pass.length; i++) {
      const c = pass.charCodeAt(i);
      const isDigit = c >= 48 && c <= 57;
      const isUpper = c >= 65 && c <= 90;
      const isLower = c >= 97 && c <= 122;
      const isSymbol = [33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,58,59,60,61,62,63,64,91,92,93,94,95,96,123,124,125,126].includes(c);
      if (!isDigit && !isUpper && !isLower && !isSymbol) return false;
    }
    return true;
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (!ipCheckDone) {
      toast('من فضلك انتظر لحظة، جاري التحقق من الجهاز...', 'warn');
      return;
    }

    if (!termsCheckbox.checked) {
      toast('يجب الموافقة على الشروط والأحكام أولاً', 'error');
      return;
    }

    const turnstileResponse = form.querySelector('[name="cf-turnstile-response"]');
    if (!turnstileResponse || !turnstileResponse.value) {
      toast('من فضلك أكمل التحقق (أنا لست روبوت)', 'error');
      return;
    }

    const name1 = form.querySelector('[name="name1"]').value.trim();
    const name2 = form.querySelector('[name="name2"]').value.trim();
    const name3 = form.querySelector('[name="name3"]').value.trim();
    const name = `${name1} ${name2} ${name3}`;
    const phone = form.querySelector('[name="phone"]').value.trim();
    const parentPhone = form.querySelector('[name="parent_phone"]').value.trim();
    const grade = form.querySelector('[name="grade"]').value;
    const password = form.querySelector('[name="password"]').value;
    const verifyCode = verifyInput?.value.trim() || '';

    if (!name1 || !name2 || !name3) { toast('يجب كتابة الاسم الأول واسم الأب والاسم الأخير', 'error'); return; }
    if (!isValidName(name1) || !isValidName(name2) || !isValidName(name3)) { toast('الاسم يجب أن يحتوي على حروف فقط (عربية أو إنجليزية)', 'error'); return; }
    if (!phone || !parentPhone || !grade || !password) { toast('يجب ملء جميع الخانات', 'error'); return; }
    if (!isValidPhone(phone)) { toast('رقم الهاتف يجب أن يبدأ بـ 010, 011, 012, 015 ويكون 11 رقم', 'error'); return; }
    if (!isValidPhone(parentPhone)) { toast('رقم ولي الأمر يجب أن يبدأ بـ 010, 011, 012, 015 ويكون 11 رقم', 'error'); return; }
    if (phone === parentPhone) { toast('رقم ولي الأمر يجب أن يكون مختلفاً عن رقم الطالب', 'error'); return; }
    if (!isValidPassword(password)) { toast('كلمة المرور يجب أن تكون 8 خانات على الأقل وتتكون من أرقام وحروف إنجليزي أو رموز فقط', 'error'); return; }

    if (needsVerification) {
      if (!verifyCode) { toast('يجب إدخال كود التحقق (تواصل مع الدعم)', 'error'); return; }
      try {
        const { error } = await supabase.rpc('verify_signup_code', { code_input: verifyCode });
        if (error) throw new Error(error.message || 'كود التحقق غير صحيح');
      } catch (err) { toast(err.message, 'error'); return; }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${phone.replace(/\s/g, '')}@edu.local`,
        password: password,
        options: { 
          data: { name: name, phone: phone, parent_phone: parentPhone, grade: grade, role: 'student' }
        }
      });

      if (error) throw new Error(error.message);

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: `${phone.replace(/\s/g, '')}@edu.local`,
        password: password
      });

      if (loginError) throw new Error('تم إنشاء الحساب بس تعذر تسجيل الدخول: ' + loginError.message);

      if (userIP) {
        await supabase.rpc('increment_ip_accounts', { ip_input: userIP });
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      const profile = await loadProfile();

      if (profile) {
        toast('تم التسجيل بنجاح!', 'success');
        setTimeout(() => {
          window.location.href = window.location.origin + '#/student';
          window.location.reload();
        }, 1000);
      } else {
        toast('حدث خطأ، يرجى تسجيل الدخول', 'warn');
        setTimeout(() => { location.hash = '#/login'; }, 1500);
      }
    } catch (err) {
      toast(err.message, 'error');
      console.error('Signup error:', err);
    }
  };
}
