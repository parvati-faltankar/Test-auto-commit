const API = "http://localhost:5000/api";

export interface User {
  username: string;
  mobile: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: User;
  otp?: string; // only present in development
}

// Save JWT token
export const saveToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const getToken = (): string | null => {
  return localStorage.getItem("token");
};

export const logout = (): void => {
  localStorage.removeItem("token");
};

// ── Register ─────────────────────────────────────────
export const registerUser = async (
  username: string,
  password: string,
  mobile: string
): Promise<AuthResponse> => {
  const res = await fetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, mobile }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ── Login: Username + Password ────────────────────────
export const loginWithUsername = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.message);
  if (data.token) saveToken(data.token);
  return data;
};

// ── OTP: Send ─────────────────────────────────────────
export const sendOtp = async (mobile: string): Promise<AuthResponse> => {
  const res = await fetch(`${API}/login/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// ── OTP: Verify ───────────────────────────────────────
export const verifyOtp = async (
  mobile: string,
  otp: string
): Promise<AuthResponse> => {
  const res = await fetch(`${API}/login/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile, otp }),
  });
  const data: AuthResponse = await res.json();
  if (!res.ok) throw new Error(data.message);
  if (data.token) saveToken(data.token);
  return data;
};
