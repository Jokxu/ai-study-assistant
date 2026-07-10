const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  const response = await fetch("" + API_BASE + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "\u8bf7\u6c42\u5931\u8d25" }));
    throw new Error(error.detail || ("HTTP " + response.status));
  }

  return response.json();
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request<User>("/api/auth/register", { method: "POST", body: data }),

  login: (data: { username: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", { method: "POST", body: data }),

  getMe: (token: string) =>
    request<User>("/api/auth/me", { token }),
};

export interface Course {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export const courseApi = {
  list: (token: string) =>
    request<Course[]>("/api/courses", { token }),

  create: (data: { name: string; description?: string; color?: string }, token: string) =>
    request<Course>("/api/courses", { method: "POST", body: data, token }),
};

export interface ChatSession {
  id: number;
  course_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export const chatApi = {
  listSessions: (courseId: number, token: string) =>
    request<ChatSession[]>("/api/courses/" + courseId + "/chats", { token }),
};