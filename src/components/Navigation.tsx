import { Link } from "react-router-dom";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { site } from "@/lib/siteContent";
import { useContactFallback } from "@/context/ContactFallbackContext";
import { CONTACT_MODE } from "@/config/contactFallback";

const Navigation = () => {
  const { openFallback } = useContactFallback();
  const isPlaceholder = CONTACT_MODE === "placeholder";

  function handleContactClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isPlaceholder) {
      e.preventDefault();
      openFallback();
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <h1 className="text-2xl font-display font-semibold text-foreground tracking-tight">
              {site.name}
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.accueil}
            </Link>
            <Link to="/articles" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.articles}
            </Link>
            <Link to="/a-propos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.aPropos}
            </Link>
            <Link to="/services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.services}
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleContactClick}
            >
              {site.nav.contact}
            </Link>
            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.accueil}
                </Link>
                <Link to="/articles" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.articles}
                </Link>
                <Link to="/a-propos" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.aPropos}
                </Link>
                <Link to="/services" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.services}
                </Link>
                <Link
                  to="/contact"
                  className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={handleContactClick}
                >
                  {site.nav.contact}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
