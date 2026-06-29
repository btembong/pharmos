import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(`API Error: ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const { getToken } = await auth();
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  return res.json();
}

// Client-side fetcher for SWR (no auth token needed for public endpoints)
export const publicFetcher = (path: string) =>
  fetch(`${API_URL}${path}`).then((res) => {
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  });
