import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/conseiller/DashboardPage";
import DossiersPage from "@/pages/conseiller/DossiersPage";
import NouveauDossierPage from "@/pages/conseiller/NouveauDossierPage";
import DocumentsPage from "@/pages/conseiller/DocumentsPage";
import PipelinePage from "@/pages/analyste/PipelinePage";
import DossierDetailPage from "@/pages/analyste/DossierDetailPage";
import UsersPage from "@/pages/admin/UsersPage";
import ScoringSettingsPage from "@/pages/admin/ScoringSettingsPage";
import InfrastructurePage from "@/pages/admin/InfrastructurePage";
import AuditPage from "@/pages/conformite/AuditPage";
import ArchivesPage from "@/pages/conformite/ArchivesPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  if (!user && location !== "/login") {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }

  return (
    <AppShell>
      <Switch>
        {/* Conseiller routes */}
        <Route path="/" component={DashboardPage} />
        <Route path="/conseiller/dashboard" component={DashboardPage} />
        <Route path="/conseiller/dossiers" component={DossiersPage} />
        <Route path="/conseiller/nouveau-dossier" component={NouveauDossierPage} />
        <Route path="/conseiller/documents" component={DocumentsPage} />
        {/* Analyste routes */}
        <Route path="/analyste/pipeline" component={PipelinePage} />
        <Route path="/analyste/dossier/:id" component={DossierDetailPage} />
        {/* Admin routes */}
        <Route path="/admin/utilisateurs" component={UsersPage} />
        <Route path="/admin/scoring" component={ScoringSettingsPage} />
        <Route path="/admin/infrastructure" component={InfrastructurePage} />
        {/* Conformite routes */}
        <Route path="/conformite/audit" component={AuditPage} />
        <Route path="/conformite/archives" component={ArchivesPage} />
        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
