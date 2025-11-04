import { Link } from "react-router-dom";
import { Search, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { site, NAV_CATEGORIES, HIDDEN_CATEGORY_LABELS } from "@/lib/siteContent";

const Navigation = () => {
  const categoryLinks = NAV_CATEGORIES.filter((c) => !HIDDEN_CATEGORY_LABELS.includes(c.label));

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto px-0 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="inline-flex items-center gap-1">
                    {site.nav.thematiques}
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {categoryLinks.map((link) => (
                  <Link key={link.href} to={link.href}>
                    <DropdownMenuItem>{link.label}</DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/a-propos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.aPropos}
            </Link>
            <Link to="/services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {site.nav.services}
            </Link>
            <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
                <div className="pt-2">
                  <div className="text-sm font-semibold text-foreground mb-2">{site.nav.thematiques}</div>
                  <div className="flex flex-col">
                    {categoryLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <Link to="/a-propos" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.aPropos}
                </Link>
                <Link to="/services" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                  {site.nav.services}
                </Link>
                <Link to="/contact" className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
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
