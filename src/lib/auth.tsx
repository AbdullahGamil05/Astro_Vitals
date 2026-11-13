import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { demoAccounts } from "@/data/operations";
import type { DemoAccount, Role } from "@/data/types";

/**
 * DEMO AUTHENTICATION ONLY.
 * Credentials are hard-coded and the session lives in LocalStorage.
 * This provides no real security and must be replaced before production use.
 */
const STORAGE_KEY = "orbit.demo.session";

export type SessionUser = Omit<DemoAccount, "password">;

interface AuthContextValue {
  user: SessionUser | null;
  login: (email: string, password: string) => { ok: true; user: SessionUser } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toSessionUser(account: DemoAccount): SessionUser {
  const { password: _password, ...rest } = account;
  return rest;
}

function readSession(): SessionUser | null {
  try {
    const email = window.localStorage.getItem(STORAGE_KEY);
    const account = demoAccounts.find((a) => a.email === email);
    return account ? toSessionUser(account) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readSession);

  const login = useCallback<AuthContextValue["login"]>((email, password) => {
    const account = demoAccounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
    );
    if (!account) return { ok: false, error: "Invalid demo credentials. Use one of the demo accounts below." };
    const sessionUser = toSessionUser(account);
    window.localStorage.setItem(STORAGE_KEY, account.email);
    setUser(sessionUser);
    return { ok: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function homePathFor(role: Role) {
  return role === "astronaut" ? "/astronaut" : "/medical";
}
