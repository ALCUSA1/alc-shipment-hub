import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/RoleGate";
import { AdminGate } from "@/components/admin/AdminGate";
import Index from "./pages/Index";
import Product from "./pages/Product";
import HowItWorks from "./pages/HowItWorks";
import Features from "./pages/Features";
import Category from "./pages/Category";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import NewShipment from "./pages/NewShipment";
import ShipmentDetail from "./pages/ShipmentDetail";
import Quotes from "./pages/Quotes";
import NewQuote from "./pages/NewQuote";
import QuoteApproval from "./pages/QuoteApproval";
import Documents from "./pages/Documents";
import Partners from "./pages/Partners";
import Account from "./pages/Account";
import CRM from "./pages/CRM";
import Trucking from "./pages/Trucking";
import Warehouses from "./pages/Warehouses";
import PaymentSuccess from "./pages/PaymentSuccess";
import Team from "./pages/Team";
import Accounting from "./pages/Accounting";
import RateTrends from "./pages/RateTrends";
import Pipeline from "./pages/Pipeline";
import ResetPassword from "./pages/ResetPassword";
import NotificationPreferences from "./pages/NotificationPreferences";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminFinancials from "./pages/admin/AdminFinancials";
import AdminSystem from "./pages/admin/AdminSystem";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Marketing / Public */}
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features" element={<Features />} />
            <Route path="/category" element={<Category />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/quote/approve" element={<QuoteApproval />} />

            {/* Operations Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/dashboard/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
            <Route path="/dashboard/shipments/new" element={<ProtectedRoute><NewShipment /></ProtectedRoute>} />
            <Route path="/dashboard/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
            <Route path="/dashboard/quotes" element={<RoleGate><Quotes /></RoleGate>} />
            <Route path="/dashboard/quotes/new" element={<ProtectedRoute><NewQuote /></ProtectedRoute>} />
            <Route path="/dashboard/trucking" element={<RoleGate><Trucking /></RoleGate>} />
            <Route path="/dashboard/warehouses" element={<RoleGate><Warehouses /></RoleGate>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/dashboard/crm" element={<RoleGate><CRM /></RoleGate>} />
            <Route path="/dashboard/accounting" element={<RoleGate><Accounting /></RoleGate>} />
            <Route path="/dashboard/rate-trends" element={<ProtectedRoute><RateTrends /></ProtectedRoute>} />
            <Route path="/dashboard/partners" element={<RoleGate><Partners /></RoleGate>} />
            <Route path="/dashboard/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />
            <Route path="/dashboard/team" element={<RoleGate><Team /></RoleGate>} />
            <Route path="/dashboard/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

            {/* Admin Portal — admin role only */}
            <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
            <Route path="/admin/users" element={<AdminGate><AdminUsers /></AdminGate>} />
            <Route path="/admin/activity" element={<AdminGate><AdminActivity /></AdminGate>} />
            <Route path="/admin/financials" element={<AdminGate><AdminFinancials /></AdminGate>} />
            <Route path="/admin/system" element={<AdminGate><AdminSystem /></AdminGate>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
