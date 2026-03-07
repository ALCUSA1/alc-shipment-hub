import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Ship } from "lucide-react";
import { useState } from "react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-navy items-center justify-center p-12">
        <div className="max-w-md text-center">
          <Ship className="h-12 w-12 text-electric mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">ALC Shipper Portal</h2>
          <p className="text-primary-foreground/60">Your centralized logistics workspace for global shipping operations.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground mb-8 lg:hidden">
            <Ship className="h-6 w-6 text-electric" />
            ALC Shipper Portal
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Log in to your workspace</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" />
            </div>
            <Button variant="electric" className="w-full" type="submit">Log In</Button>
          </form>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Don't have an account? <Link to="/signup" className="text-accent font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
