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
import WebDevelopment from "./pages/gigs/WebDevelopment";
import MobileDevelopment from "./pages/gigs/MobileDevelopment";
import DigitalMarketing from "./pages/gigs/DigitalMarketing";
import UIUXDesign from "./pages/gigs/UIUXDesign";
import CloudSolutions from "./pages/gigs/CloudSolutions";
import DevOpsServices from "./pages/gigs/DevOpsServices";
import NotFound from "./pages/NotFound";
import CareersPage from "./pages/CareersPage";
import BlogPage from "./pages/BlogPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import ProductShowcase from "./pages/ProductShowcase";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import ScheduleCall from "./pages/ScheduleCall";

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
import Seo from "./seo/Seo";
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
        <LanguageAnnouncer />
        <SiteRoutes />
        {/* After the routes: page-level head patching (e.g. the admin noindex
            hook) runs first, so the registry always has the last word. */}
        <Seo />
        <GlobalVirtualGuide />
        <GlobalScrollButtons />
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
      <Route path="/BlogPage" element={<BlogPage />} />
      <Route path="/ApplicationForm" element={<ApplicationForm />} />
      <Route path="/gig/web-development" element={<WebDevelopment />} />
      <Route path="/gig/mobile-development" element={<MobileDevelopment />} />
      <Route path="/gig/digital-marketing" element={<DigitalMarketing />} />
      <Route path="/gig/ui-ux-design" element={<UIUXDesign />} />
      <Route path="/gig/cloud-solutions" element={<CloudSolutions />} />
      <Route path="/gig/devops-services" element={<DevOpsServices />} />
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
