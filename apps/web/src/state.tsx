import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";
import { supabase } from "./supabase";

export interface Me {
  profile: { id: string; email: string; name: string; role: string } | null;
  trainee?: { id: string; name: string; targetJob?: { title: string } | null } | null;
  recruiter?: { id: string; company: string } | null;
  provider?: { id: string; name: string } | null;
}

interface Session {
  me: Me | null;
  loading: boolean;
  loginWithPersona: (email: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Session>(null!);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<Me>("/auth/me");
      setMe(data);
    } catch {
      setToken(null);
      setMe(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const loginWithPersona = async (email: string) => {
    const res = await api<{ id: string }>("/auth/demo-login", { method: "POST", body: { email } });
    setToken(res.id);
    await refresh();
  };

  const logout = () => {
    setToken(null);
    setMe(null);
    // Clear the Supabase session too so a stale session can't silently re-login.
    supabase?.auth.signOut().catch(() => {});
  };

  return (
    <Ctx.Provider value={{ me, loading, loginWithPersona, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
