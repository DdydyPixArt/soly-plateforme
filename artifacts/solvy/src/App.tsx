import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
// Conseiller
import DashboardPage from "@/pages/conseiller/DashboardPage";
import DossiersPage from "@/pages/conseiller/DossiersPage";
import NouveauDossierPage from "@/pages/conseiller/NouveauDossierPage";
import DocumentsPage from "@/pages/conseiller/DocumentsPage";
import ConseillerDossierDetailPage from "@/pages/conseiller/DossierDetailPage";
// Analyste
import PipelinePage from "@/pages/analyste/PipelinePage";
import AllDossiersPage from "@/pages/analyste/AllDossiersPage";
import ReportingPage from "@/pages/analyste/ReportingPage";
import DossierDetailPage from "@/pages/analyste/DossierDetailPage";
// Admin
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import UsersPage from "@/pages/admin/UsersPage";
import ScoringSettingsPage from "@/pages/admin/ScoringSettingsPage";
import InfrastructurePage from "@/pages/admin/InfrastructurePage";
import DataGouvernancePage from "@/pages/admin/DataGouvernancePage";
// Conformite
import AuditPage from "@/pages/conformite/AuditPage";
import ArchivesPage from "@/pages/conformite/ArchivesPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

const ROLE_HOME: Record<string, string> = {
  conseiller: "/conseiller/dashboard",
  analyste: "/analyste/pipeline",
  admin: "/admin/dashboard",
  conformite: "/conformite/audit",
};

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

  const home = ROLE_HOME[user.role] || "/login";

  return (
    <AppShell>
      <Switch>
        {/* Root redirect based on role */}
        <Route path="/">{() => <Redirect to={home} />}</Route>
        <Route path="/login">{() => <Redirect to={home} />}</Route>

        {/* Conseiller */}
        <Route path="/conseiller/dashboard" component={DashboardPage} />
        <Route path="/conseiller/dossiers" component={DossiersPage} />
        <Route path="/conseiller/dossier/:id" component={ConseillerDossierDetailPage} />
        <Route path="/conseiller/nouveau-dossier" component={NouveauDossierPage} />
        <Route path="/conseiller/documents" component={DocumentsPage} />

        {/* Analyste */}
        <Route path="/analyste/pipeline" component={PipelinePage} />
        <Route path="/analyste/dossiers" component={AllDossiersPage} />
        <Route path="/analyste/reporting" component={ReportingPage} />
        <Route path="/analyste/dossier/:id" component={DossierDetailPage} />

        {/* Admin */}
        <Route path="/admin/dashboard" component={AdminDashboardPage} />
        <Route path="/admin/utilisateurs" component={UsersPage} />
        <Route path="/admin/scoring" component={ScoringSettingsPage} />
        <Route path="/admin/infrastructure" component={InfrastructurePage} />
        <Route path="/admin/data-gouvernance" component={DataGouvernancePage} />

        {/* Conformite */}
        <Route path="/conformite/audit" component={AuditPage} />
        <Route path="/conformite/archives" component={ArchivesPage} />

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
