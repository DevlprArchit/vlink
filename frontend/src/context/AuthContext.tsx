"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NotificationItem, PublicProfile } from "@/lib/types";

interface AuthContextValue {
  user: PublicProfile | null;
  loading: boolean;
  notifications: NotificationItem[];
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<PublicProfile | null>>;
  logout: () => Promise<void>;
  demoLogin: (demoUserId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { notifications: NotificationItem[] };
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore network error
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { user: PublicProfile | null };
        setUser(data.user);
        if (data.user) {
          await refreshNotifications();
        } else {
          setNotifications([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setNotifications([]);
  }, []);

  const demoLogin = useCallback(
    async (demoUserId = "user-archit") => {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demo", demoUserId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { user: PublicProfile };
        setUser(data.user);
        setAuthModalOpen(false);
        await refreshNotifications();
      }
    },
    [refreshNotifications]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        notifications,
        authModalOpen,
        setAuthModalOpen,
        refreshUser,
        refreshNotifications,
        setUser,
        logout,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
