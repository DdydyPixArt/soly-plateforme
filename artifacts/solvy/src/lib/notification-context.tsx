import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "nouveau_dossier" | "decision" | "info";
  dossier_id?: number;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const SEEN_KEY = "solvy_notif_seen";

function getSeenIds(): Set<string> {
  try {
    const s = localStorage.getItem(SEEN_KEY);
    return new Set(s ? JSON.parse(s) : []);
  } catch { return new Set(); }
}

function addSeenId(id: string) {
  const seen = getSeenIds();
  seen.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const checkForNew = useCallback(async () => {
    if (!user) return;

    try {
      // Get cached dossier/decision data from React Query cache
      const allQueries = queryClient.getQueriesData<unknown>({ queryKey: ["dossiers"] });
      const dossierCache = allQueries.find(([key]) =>
        Array.isArray(key) && key[0] === "dossiers"
      );

      if (!dossierCache) return;
      const dossiers = dossierCache[1] as Array<{
        id: number; statut: string; objet: string; montant: number;
        client?: { prenom: string; nom: string }; created_by?: string | null;
      }> | undefined;
      if (!Array.isArray(dossiers)) return;

      const seen = getSeenIds();
      const newNotifs: AppNotification[] = [];

      if (user.role === "analyste") {
        // Notify analyste of new dossiers awaiting risk review
        const pending = dossiers.filter(d => d.statut === "en_attente_risque");
        for (const d of pending) {
          const key = `dossier-${d.id}-pending`;
          if (!seen.has(key)) {
            newNotifs.push({
              id: key,
              title: "Nouveau dossier à traiter",
              message: `${d.client ? `${d.client.prenom} ${d.client.nom}` : `Dossier #${d.id}`} — ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(d.montant)}`,
              type: "nouveau_dossier",
              dossier_id: d.id,
              timestamp: new Date(),
              read: false,
            });
          }
        }
      } else if (user.role === "conseiller") {
        // Notify conseiller of decisions on their dossiers
        const decided = dossiers.filter(d =>
          d.created_by === user.login &&
          ["approuve", "refuse", "conditionnel"].includes(d.statut)
        );
        for (const d of decided) {
          const key = `dossier-${d.id}-decided`;
          if (!seen.has(key)) {
            const label = d.statut === "approuve" ? "Approuvé ✓" : d.statut === "refuse" ? "Refusé ✗" : "Conditionnel";
            newNotifs.push({
              id: key,
              title: "Décision rendue",
              message: `Dossier #${d.id} — ${label}`,
              type: "decision",
              dossier_id: d.id,
              timestamp: new Date(),
              read: false,
            });
          }
        }
      }

      if (newNotifs.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const truly_new = newNotifs.filter(n => !existingIds.has(n.id));
          return truly_new.length > 0 ? [...truly_new, ...prev] : prev;
        });
      }
    } catch {
      // silently ignore
    }
  }, [user, queryClient]);

  useEffect(() => {
    // Check on mount and on interval
    const t = setTimeout(checkForNew, 2000); // first check after 2s (allow cache to populate)
    const iv = setInterval(checkForNew, 30000); // then every 30s
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [checkForNew]);

  const markAsRead = useCallback((id: string) => {
    addSeenId(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => addSeenId(n.id));
      return prev.map(n => ({ ...n, read: true }));
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications(prev => {
      prev.forEach(n => addSeenId(n.id));
      return [];
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
