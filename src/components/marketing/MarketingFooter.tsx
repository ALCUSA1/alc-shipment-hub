import { Ship } from "lucide-react";
import { Link } from "react-router-dom";

export function MarketingFooter() {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <Ship className="h-5 w-5 text-electric" />
              ALC Shipper Portal
            </div>
            <p className="text-sm text-primary-foreground/60">
              The Shipper Logistics Workspace for modern exporters and importers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <div className="space-y-2 text-sm text-primary-foreground/60">
              <Link to="/product" className="block hover:text-primary-foreground transition-colors">Overview</Link>
              <Link to="/features" className="block hover:text-primary-foreground transition-colors">Features</Link>
              <Link to="/how-it-works" className="block hover:text-primary-foreground transition-colors">How It Works</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <div className="space-y-2 text-sm text-primary-foreground/60">
              <Link to="/category" className="block hover:text-primary-foreground transition-colors">Category</Link>
              <span className="block">Careers</span>
              <span className="block">Contact</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Get Started</h4>
            <div className="space-y-2 text-sm text-primary-foreground/60">
              <Link to="/login" className="block hover:text-primary-foreground transition-colors">Log In</Link>
              <Link to="/signup" className="block hover:text-primary-foreground transition-colors">Sign Up</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-sm text-primary-foreground/40 text-center">
          © {new Date().getFullYear()} ALC Shipper Portal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
