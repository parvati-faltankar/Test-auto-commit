import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../utils/auth";
import { saveToken, getToken, saveUser, getSavedUser, logout as clearAuth } from "../utils/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSavedUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  const login = (newToken: string, newUser: User) => {
    saveToken(newToken);
    saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    saveUser(updated);
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
