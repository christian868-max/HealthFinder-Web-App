const USERS_KEY = 'healthfinder_local_users';

export interface LocalUserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isActive?: boolean;
  lastActiveAt?: string;
}

export interface LocalAccountSummary {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastActiveAt?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalUserRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: LocalUserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function nextId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function localSignUp(
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): { ok: true; user: Omit<LocalUserRecord, 'password'> } | { ok: false; reason: 'exists' } {
  const key = normalizeEmail(email);
  const users = readUsers();
  if (users.some((u) => normalizeEmail(u.email) === key)) {
    return { ok: false, reason: 'exists' };
  }
  const record: LocalUserRecord = {
    id: nextId(),
    name: name.trim(),
    email: key,
    password,
    role,
    isActive: false,
  };
  users.push(record);
  writeUsers(users);
  return { ok: true, user: { id: record.id, name: record.name, email: record.email, role: record.role } };
}

export function localSignIn(email: string, password: string): { ok: true; user: Omit<LocalUserRecord, 'password'> } | { ok: false } {
  const key = normalizeEmail(email);
  const users = readUsers();
  const found = users.find((u) => normalizeEmail(u.email) === key && u.password === password);
  if (!found) {
    return { ok: false };
  }
  return { ok: true, user: { id: found.id, name: found.name, email: found.email, role: found.role } };
}

export function localHasAnyAdmin() {
  const users = readUsers();
  return users.some((u) => u.role === 'admin');
}

export function listLocalAccounts(): LocalAccountSummary[] {
  return readUsers().map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: !!u.isActive,
    lastActiveAt: u.lastActiveAt,
  }));
}

export function setLocalAccountActive(email: string, isActive: boolean) {
  const key = normalizeEmail(email);
  const users = readUsers();
  const index = users.findIndex((u) => normalizeEmail(u.email) === key);
  if (index < 0) return;
  users[index] = {
    ...users[index],
    isActive,
    lastActiveAt: new Date().toISOString(),
  };
  writeUsers(users);
}

export function deleteLocalAccount(email: string) {
  const key = normalizeEmail(email);
  const users = readUsers();
  const next = users.filter((u) => normalizeEmail(u.email) !== key);
  writeUsers(next);
}
