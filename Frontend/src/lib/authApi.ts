const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  email: string;
}

export async function register(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Registration failed");
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }

  return response.json();
}

export async function getCurrentUser(token: string): Promise<{ email: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error("Failed to get current user");
  }

  return response.json();
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getRegisteredUsers(): Promise<{ users: Array<{ email: string; created_at: string }>; count: number }> {
  const response = await fetch(`${API_BASE_URL}/auth/users`);
  if (!response.ok) {
    throw new Error("Failed to fetch users list");
  }
  return response.json();
}

export function getStoredToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setStoredToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function removeStoredToken(): void {
  localStorage.removeItem("auth_token");
}
