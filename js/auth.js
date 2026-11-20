import { supabase, store, loadAllData } from './config.js';

export function phoneToEmail(phone) {
  return `${String(phone || '').replace(/\s/g, '')}@edu.local`;
}

export async function login(phone, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password
  });
  if (error) throw new Error('رقم أو كلمة مرور غير صحيحة');
  return data.user;
}

export async function signup({ name, phone, parent_phone, grade, password }) {
  const email = phoneToEmail(phone);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone, parent_phone, grade, role: 'student' } }
  });
  if (error) throw new Error(error.message);
  try {
    await supabase.auth.signInWithPassword({ email, password });
  } catch {}
  return data.user;
}

export async function logout() {
  await supabase.auth.signOut();
  store.user = null;
  store.profile = null;
}

export async function loadProfile(waitMs = 0) {
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) {
    store.user = null;
    store.profile = null;
    return null;
  }
  store.user = session.user;
  const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (data) {
    store.profile = data;
    return data;
  }
  return null;
}

export function roleHomePath(role) {
  if (role === 'super_admin' || role === 'admin') return '#/admin';
  if (role === 'teacher' || role === 'assistant') return '#/teacher';
  return '#/student';
}

export async function bootstrapAuth() {
  await loadProfile();
  await loadAllData();
}
