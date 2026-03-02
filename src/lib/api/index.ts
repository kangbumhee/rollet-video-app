// ============================================
// 파일: src/lib/api/index.ts
// 설명: 인증된 API 호출 헬퍼
//       모든 API 호출 시 Firebase 토큰 자동 첨부
// ============================================

import { auth } from "@/lib/firebase/config";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiCall<T = unknown>(url: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  // Firebase 인증 토큰 가져오기
  const user = auth.currentUser;
  let authHeader: Record<string, string> = {};
  if (user) {
    const token = await user.getIdToken();
    authHeader = { Authorization: `Bearer ${token}` };
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API 오류: ${res.status}`);
  }

  return data as T;
}

export async function apiClient(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}
