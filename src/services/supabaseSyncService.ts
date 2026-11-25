import { DayflowDataset } from '../types/dayflow';

export interface SupabaseStatusInfo {
  configured: boolean;
  projectRef: string;
  url: string;
  schemaReady: boolean;
  sqlSchema: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
}

export interface SupabaseAuthResult {
  user: SupabaseUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  needsEmailConfirmation?: boolean;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      typeof data.error === 'string' ? data.error : `Request failed (${res.status})`
    ) as Error & { code?: string };
    if (typeof data.code === 'string') err.code = data.code;
    throw err;
  }
  return data as T;
}

export async function fetchSupabaseStatus(): Promise<SupabaseStatusInfo> {
  const res = await fetch('/api/supabase/status');
  return handleResponse<SupabaseStatusInfo>(res);
}

export async function signUpWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<SupabaseAuthResult>(res);
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<SupabaseAuthResult>(res);
}

export async function refreshSupabaseSession(
  refreshToken: string
): Promise<SupabaseAuthResult> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return handleResponse<SupabaseAuthResult>(res);
}

export async function pullWorkspaceFromSupabase(
  accessToken: string
): Promise<Omit<Partial<DayflowDataset>, 'preferences'> & { preferences?: Partial<DayflowDataset['preferences']>; isEmpty: boolean }> {
  const res = await fetch('/api/workspace', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse<Omit<Partial<DayflowDataset>, 'preferences'> & { preferences?: Partial<DayflowDataset['preferences']>; isEmpty: boolean }>(res);
}

export async function pushWorkspaceToSupabase(
  accessToken: string,
  dataset: DayflowDataset
): Promise<{ ok: boolean; syncedAt: string }> {
  const res = await fetch('/api/workspace', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(dataset),
  });
  return handleResponse<{ ok: boolean; syncedAt: string }>(res);
}
