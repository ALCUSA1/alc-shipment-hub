import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import alcLogo from "@/assets/alc-logo.png";

const navLinks = [
  { label: "Product", to: "/product" },
  { label: "Rates", to: "/rates" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "Category", to: "/category" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header role="banner">
    <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <img src={alcLogo} alt="ALC Logo" className="h-14 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button variant="electric" asChild>
            <Link to="/sign-up">Sign Up</Link>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background px-6 py-4 space-y-3">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex gap-3 pt-3">
            <Button variant="ghost" asChild size="sm">
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="electric" size="sm" asChild>
              <Link to="/sign-up" onClick={() => setOpen(false)}>Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
    </header>
    <StartShipmentModal open={showSignup} onOpenChange={setShowSignup} />
    </>
  );
}
