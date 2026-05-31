import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Role = "conseiller" | "analyste" | "admin" | "conformite";

export interface CurrentUser {
  login: string;
  prenom: string;
  nom: string;
  role: Role;
  displayName: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  login: (identifiant: string, password: string) => boolean;
  logout: () => void;
  addUser: (login: string, password: string, user: CurrentUser) => void;
}

const DEMO_USERS: Record<string, { password: string; user: CurrentUser }> = {
  "sophie.martin": {
    password: "password",
    user: { login: "sophie.martin", prenom: "Sophie", nom: "Martin", role: "conseiller", displayName: "Sophie Martin" },
  },
  "marc.lefebvre": {
    password: "password",
    user: { login: "marc.lefebvre", prenom: "Marc", nom: "Lefebvre", role: "conseiller", displayName: "Marc Lefebvre" },
  },
  "jean.risque": {
    password: "password",
    user: { login: "jean.risque", prenom: "Jean", nom: "Risque", role: "analyste", displayName: "Jean Risque" },
  },
  "admin.si": {
    password: "password",
    user: { login: "admin.si", prenom: "Admin", nom: "SI", role: "admin", displayName: "Administrateur SI" },
  },
  "compliance.officer": {
    password: "password",
    user: { login: "compliance.officer", prenom: "Compliance", nom: "Officer", role: "conformite", displayName: "Compliance Officer" },
  },
};

const AUTH_KEY = "solvy_auth_user";
const CUSTOM_USERS_KEY = "solvy_custom_users";

function loadCustomUsers(): Record<string, { password: string; user: CurrentUser }> {
  try {
    const stored = localStorage.getItem(CUSTOM_USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (identifiant: string, password: string): boolean => {
    const key = identifiant.trim().toLowerCase();
    // Check demo users first
    const demo = DEMO_USERS[key];
    if (demo && demo.password === password) {
      setUser(demo.user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(demo.user));
      return true;
    }
    // Check dynamically created users
    const customs = loadCustomUsers();
    const custom = customs[key];
    if (custom && custom.password === password) {
      setUser(custom.user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(custom.user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const addUser = (loginKey: string, password: string, newUser: CurrentUser) => {
    const customs = loadCustomUsers();
    customs[loginKey.toLowerCase()] = { password, user: newUser };
    localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(customs));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, addUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const DEMO_USER_LIST = Object.values(DEMO_USERS).map(e => e.user);
