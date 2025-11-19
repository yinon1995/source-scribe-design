import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import AdminGuard from "@/components/AdminGuard";
import Index from "./pages/Index";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import AdminDashboard from "./pages/AdminDashboard";
import AdminNew from "./pages/AdminNew";
import AdminArticles from "./pages/AdminArticles";
import AdminInbox from "./pages/AdminInbox";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminAbout from "./pages/AdminAbout";
import About from "./pages/About";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import Thematiques from "./pages/Thematiques";
import NotFound from "./pages/NotFound";
import LegalMentions from "./pages/LegalMentions";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ReviewsPage from "./pages/ReviewsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navigation />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/nouvel-article" element={<AdminGuard><AdminNew /></AdminGuard>} />
            <Route path="/admin/articles" element={<AdminGuard><AdminArticles /></AdminGuard>} />
            <Route path="/admin/demandes" element={<AdminGuard><AdminInbox /></AdminGuard>} />
            <Route path="/admin/temoignages" element={<AdminGuard><AdminTestimonials /></AdminGuard>} />
            <Route path="/admin/a-propos" element={<AdminGuard><AdminAbout /></AdminGuard>} />
            <Route path="/admin/new" element={<AdminGuard><AdminNew /></AdminGuard>} />
            <Route path="/thematiques" element={<Thematiques />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/avis" element={<ReviewsPage />} />
            <Route path="/mentions-legales" element={<LegalMentions />} />
            <Route path="/politique-de-confidentialite" element={<Privacy />} />
            <Route path="/conditions-dutilisation" element={<Terms />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
