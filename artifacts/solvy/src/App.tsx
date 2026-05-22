import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "@/lib/role-context";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import NouveauDossierPage from "@/pages/conseiller/NouveauDossierPage";
import DossiersPage from "@/pages/conseiller/DossiersPage";
import DocumentsPage from "@/pages/conseiller/DocumentsPage";
import PipelinePage from "@/pages/analyste/PipelinePage";
import DossierDetailPage from "@/pages/analyste/DossierDetailPage";
import DatabasePage from "@/pages/admin/DatabasePage";
import GouvernancePage from "@/pages/admin/GouvernancePage";
import InfrastructurePage from "@/pages/admin/InfrastructurePage";
import AuditPage from "@/pages/conformite/AuditPage";
import ArchivesPage from "@/pages/conformite/ArchivesPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={DossiersPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/conseiller/nouveau-dossier" component={NouveauDossierPage} />
        <Route path="/conseiller/dossiers" component={DossiersPage} />
        <Route path="/conseiller/documents" component={DocumentsPage} />
        <Route path="/analyste/pipeline" component={PipelinePage} />
        <Route path="/analyste/dossier/:id" component={DossierDetailPage} />
        <Route path="/admin/database" component={DatabasePage} />
        <Route path="/admin/gouvernance" component={GouvernancePage} />
        <Route path="/admin/infrastructure" component={InfrastructurePage} />
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
        <RoleProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </RoleProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
