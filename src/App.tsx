import { lazy, Suspense, useEffect } from "react";
import "@/i18n/config"; // initialize i18next before any component renders
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import LanguageAnnouncer from "@/components/LanguageAnnouncer";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter, Navigate, useLocation } from "react-router-dom";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ApplicationForm from "./pages/ApplicationForm";
import NotFound from "./pages/NotFound";
import CareersPage from "./pages/CareersPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import ProductShowcase from "./pages/ProductShowcase";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import ScheduleCall from "./pages/ScheduleCall";
// The /services and /locations pages are route-level chunks: each one carries a
// few hundred lines of page copy that only its own visitors need. ContentRoute
// resolves the chunk for a path and renders it inside a Suspense boundary; the
// prerenderer and main.tsx both preload it first, so neither a generated HTML
// file nor a first paint ever shows the fallback. See routes/contentRoutes.ts.
import ContentRoute from "./routes/ContentRoute";

// Lazy-loaded: keeps recharts out of the main bundle.
const ProjectAnalysisResult = lazy(() => import("./pages/ProjectAnalysisResult"));
// Lazy-loaded: keeps livekit-client out of the main bundle.
const AiConsultation = lazy(() => import("./pages/AiConsultation"));
// Lazy-loaded: the owner dashboard is staff-only, so no visitor downloads its
// screens. The tiny boundary/guard stay eager because the boundary is what
// provides the Suspense the lazy screens resolve inside.
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLeadDetail = lazy(() => import("./pages/admin/AdminLeadDetail"));
import VirtualGuide from "./components/virtual-guide/VirtualGuide";
import ScrollButtons from "./components/ScrollButtons";
import SkipToContent from "./components/SkipToContent";
import PrintWatermark from "./components/PrintWatermark";
import ConnectionStatus from "./components/ConnectionStatus";
import RouteErrorBoundary from "./routes/RouteErrorBoundary";
import Seo from "./seo/Seo";
import RouteAnalytics from "./components/RouteAnalytics";
import AnalyticsConsent from "./components/AnalyticsConsent";
import AdminBoundary from "./components/admin/AdminBoundary";
import AdminGuard from "./components/admin/AdminGuard";
import { isAdminPath } from "./components/admin/adminSeo";

const queryClient = new QueryClient();

// Reset scroll position on route change (unless navigating to a #hash section).
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

// The global floating Buddy widget (bottom-right house) is fully unmounted on the
// AI consultation routes, where the lobby/meeting renders its own Buddy participant.
const isConsultationPath = (pathname: string) =>
  pathname === '/ai-consultation' || pathname.startsWith('/ai-consultation/');

const GlobalVirtualGuide = () => {
  const { pathname } = useLocation();
  if (isConsultationPath(pathname)) return null;
  // The owner dashboard is an internal tool: no public Buddy widget there.
  if (isAdminPath(pathname)) return null;
  return <VirtualGuide />;
};

// Floating page controls (scroll + WhatsApp) are public-site chrome too.
const GlobalScrollButtons = () => {
  const { pathname } = useLocation();
  if (isAdminPath(pathname)) return null;
  return <ScrollButtons />;
};

/**
 * Data/UI providers shared by the browser app and the build-time prerender.
 * Client-only chrome (toasters, floating widgets) stays out so the prerender
 * step can reuse this without touching browser APIs.
 */
export const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>{children}</TooltipProvider>
  </QueryClientProvider>
);

/**
 * The routed page tree plus the accessibility skip link. Router-agnostic: the
 * browser mounts it under BrowserRouter, `src/prerender/entry-server.tsx`
 * mounts it under StaticRouter to emit physical HTML per route.
 */
export const SiteRoutes = () => (
  <>
    <SkipToContent />
    <RoutesComponent />
  </>
);

const App = () => {
  return (
    <AppProviders>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <RouteAnalytics />
        <AnalyticsConsent />
        <LanguageAnnouncer />
        {/* A page whose chunk cannot be downloaded (the usual way an offline
            visitor finds out) is caught here instead of blanking the site. */}
        <RouteErrorBoundary>
          <SiteRoutes />
        </RouteErrorBoundary>
        {/* After the routes: page-level head patching (e.g. the admin noindex
            hook) runs first, so the registry always has the last word. */}
        <Seo />
        <GlobalVirtualGuide />
        <GlobalScrollButtons />
        {/* Print-only: brands whatever a visitor saves as a PDF from a page. */}
        <PrintWatermark />
        {/* Right-edge drawer for the whole visit: names a lost connection
            without taking the already-loaded page away from the visitor. */}
        <ConnectionStatus />
      </BrowserRouter>
    </AppProviders>
  );
};

const RoutesComponent = () => {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/TermsAndConditions" element={<TermsAndConditions />} />
      <Route path="/ProductDetailsPage" element={<ProductDetailsPage />} />
      {/* Consultation and call booking are one page now — old links keep working. */}
      <Route path="/consultation-form" element={<Navigate to="/schedule-call" replace />} />
      {/* The empty insights placeholder was replaced by the real /insights
          section. It forwards rather than 404s, and the build emits a noindex
          stub for it the same way it does for the old /gig paths. */}
      <Route path="/BlogPage" element={<Navigate to="/insights" replace />} />
      <Route path="/ApplicationForm" element={<ApplicationForm />} />
      {/* The services hub, then the canonical service pages it lists. */}
      <Route path="/services" element={<ContentRoute route="/services" />} />
      <Route
        path="/services/custom-software-development"
        element={<ContentRoute route="/services/custom-software-development" />}
      />
      <Route
        path="/services/mobile-app-development"
        element={<ContentRoute route="/services/mobile-app-development" />}
      />
      <Route
        path="/services/web-application-development"
        element={<ContentRoute route="/services/web-application-development" />}
      />
      <Route path="/services/saas-development" element={<ContentRoute route="/services/saas-development" />} />
      <Route
        path="/services/software-modernization"
        element={<ContentRoute route="/services/software-modernization" />}
      />
      {/* AI service pages. */}
      <Route path="/services/ai-development" element={<ContentRoute route="/services/ai-development" />} />
      <Route
        path="/services/machine-learning-development"
        element={<ContentRoute route="/services/machine-learning-development" />}
      />
      <Route
        path="/services/ai-voice-agent-development"
        element={<ContentRoute route="/services/ai-voice-agent-development" />}
      />
      <Route
        path="/services/ai-video-consultation-agents"
        element={<ContentRoute route="/services/ai-video-consultation-agents" />}
      />
      <Route
        path="/services/conversational-ai-development"
        element={<ContentRoute route="/services/conversational-ai-development" />}
      />
      <Route
        path="/services/ai-automation-integration"
        element={<ContentRoute route="/services/ai-automation-integration" />}
      />
      {/* Design, cloud, delivery and growth service pages. */}
      <Route path="/services/ui-ux-design" element={<ContentRoute route="/services/ui-ux-design" />} />
      <Route path="/services/cloud-solutions" element={<ContentRoute route="/services/cloud-solutions" />} />
      <Route path="/services/devops-engineering" element={<ContentRoute route="/services/devops-engineering" />} />
      <Route path="/services/digital-marketing" element={<ContentRoute route="/services/digital-marketing" />} />
      {/* The insights hub and the published articles. Same code-split treatment
          as the service and market pages: an article's prose is a route chunk,
          not part of the app shell. `/BlogPage` forwards here. */}
      <Route path="/insights" element={<ContentRoute route="/insights" />} />
      <Route
        path="/insights/how-to-estimate-an-ai-app-project"
        element={<ContentRoute route="/insights/how-to-estimate-an-ai-app-project" />}
      />
      <Route
        path="/insights/ai-voice-agent-production-checklist"
        element={<ContentRoute route="/insights/ai-voice-agent-production-checklist" />}
      />
      {/* Every old gig path now forwards to the canonical service page that
          replaced it. The build also emits a noindex meta-refresh stub per path,
          so a direct hit resolves without JavaScript. */}
      <Route path="/gig/web-development" element={<Navigate to="/services/web-application-development" replace />} />
      <Route path="/gig/mobile-development" element={<Navigate to="/services/mobile-app-development" replace />} />
      <Route path="/gig/ui-ux-design" element={<Navigate to="/services/ui-ux-design" replace />} />
      <Route path="/gig/cloud-solutions" element={<Navigate to="/services/cloud-solutions" replace />} />
      <Route path="/gig/devops-services" element={<Navigate to="/services/devops-engineering" replace />} />
      <Route path="/gig/digital-marketing" element={<Navigate to="/services/digital-marketing" replace />} />
      {/* The locations hub, then one regional landing page per active market.
          One flat level under /locations: no query parameters, no subdomains,
          no country abbreviations and no city pages. */}
      <Route path="/locations" element={<ContentRoute route="/locations" />} />
      <Route path="/locations/united-states" element={<ContentRoute route="/locations/united-states" />} />
      <Route path="/locations/united-kingdom" element={<ContentRoute route="/locations/united-kingdom" />} />
      <Route
        path="/locations/united-arab-emirates"
        element={<ContentRoute route="/locations/united-arab-emirates" />}
      />
      <Route path="/locations/canada" element={<ContentRoute route="/locations/canada" />} />
      <Route path="/locations/australia" element={<ContentRoute route="/locations/australia" />} />
      <Route path="/locations/singapore" element={<ContentRoute route="/locations/singapore" />} />
      <Route path="/locations/germany" element={<ContentRoute route="/locations/germany" />} />
      <Route path="/locations/netherlands" element={<ContentRoute route="/locations/netherlands" />} />
      <Route path="/locations/turkey" element={<ContentRoute route="/locations/turkey" />} />
      <Route path="/products" element={<ProductShowcase />} />
      <Route path="/project-analysis" element={<ProjectAnalysis />} />
      <Route
        path="/project-analysis/result"
        element={
          <Suspense
            fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">{t('common.loading')}</div>}
          >
            <ProjectAnalysisResult />
          </Suspense>
        }
      />
      <Route path="/schedule-call" element={<ScheduleCall />} />
      <Route
        path="/ai-consultation/:meetingReference"
        element={
          <Suspense
            fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700">{t('common.loading')}</div>}
          >
            <AiConsultation />
          </Suspense>
        }
      />
      {/* Owner dashboard. One layout route keeps a single session check alive
          across /admin navigation; AdminGuard renders children only once the
          session AND the admin_users membership check have both passed. */}
      <Route path="/admin" element={<AdminBoundary />}>
        <Route
          index
          element={
            <AdminGuard>
              <AdminDashboard />
            </AdminGuard>
          }
        />
        <Route path="login" element={<AdminLogin />} />
        <Route
          path="leads/:id"
          element={
            <AdminGuard>
              <AdminLeadDetail />
            </AdminGuard>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
