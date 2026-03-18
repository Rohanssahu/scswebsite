import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, BrowserRouter } from "react-router-dom";

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
import ConsultationForm from "./pages/ConsultationForm";
import ProductDetailsPage from "./pages/ProductDetailsPage";

import ProductShowcase from "./pages/ProductShowcase";

const queryClient = new QueryClient();

const App = () => {


  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RoutesComponent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
const RoutesComponent = () => {




  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/TermsAndConditions" element={<TermsAndConditions />} />
      <Route path="/ProductDetailsPage" element={<ProductDetailsPage />} />
      <Route path="/consultation-form" element={<ConsultationForm />} />
      <Route path="/BlogPage" element={<BlogPage />} />
      <Route path="/ApplicationForm" element={<ApplicationForm />} />
      <Route path="/gig/web-development" element={<WebDevelopment />} />
      <Route path="/gig/mobile-development" element={<MobileDevelopment />} />
      <Route path="/gig/digital-marketing" element={<DigitalMarketing />} />
      <Route path="/gig/ui-ux-design" element={<UIUXDesign />} />
      <Route path="/gig/cloud-solutions" element={<CloudSolutions />} />
      <Route path="/gig/devops-services" element={<DevOpsServices />} />
      <Route path="/products" element={<ProductShowcase />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


export default App;
