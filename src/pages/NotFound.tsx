import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50">
      <div className="text-center max-w-md px-6">
        <div className="text-8xl font-black text-accent/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page <code className="text-sm bg-secondary px-1.5 py-0.5 rounded">{location.pathname}</code> doesn't exist.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
          <Button variant="electric" asChild>
            <Link to="/"><Home className="mr-2 h-4 w-4" /> Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
