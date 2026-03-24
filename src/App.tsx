import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/RoleGate";
import { AdminGate } from "@/components/admin/AdminGate";
import { ForwarderGate } from "@/components/forwarder/ForwarderGate";
import Index from "./pages/Index";
import Product from "./pages/Product";
import RateSearch from "./pages/RateSearch";
import HowItWorks from "./pages/HowItWorks";
import Features from "./pages/Features";
import Category from "./pages/Category";
import About from "./pages/About";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Shipments from "./pages/Shipments";
import NewShipmentWizard from "./pages/NewShipmentWizard";
import ShipmentDetail from "./pages/ShipmentDetail";
import CustomerShipmentWorkspace from "./pages/CustomerShipmentWorkspace";
import Quotes from "./pages/Quotes";
import NewQuote from "./pages/NewQuote";
import QuoteApproval from "./pages/QuoteApproval";
import Documents from "./pages/Documents";
import Partners from "./pages/Partners";
import Account from "./pages/Account";
import CRM from "./pages/CRM";
import Trucking from "./pages/Trucking";
import { TruckingGate } from "./components/trucking/TruckingGate";
import TruckingDashboard from "./pages/trucking/TruckingDashboard";
import TruckingOrders from "./pages/trucking/TruckingOrders";
import TruckingOrderDetail from "./pages/trucking/TruckingOrderDetail";
import TruckingQuotes from "./pages/trucking/TruckingQuotes";
import TruckingAccount from "./pages/trucking/TruckingAccount";
import { DriverGate } from "./components/driver/DriverGate";
import { WarehouseGate } from "./components/warehouse/WarehouseGate";
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import WarehouseInbound from "./pages/warehouse/WarehouseInbound";
import WarehouseInventory from "./pages/warehouse/WarehouseInventory";
import WarehouseReleases from "./pages/warehouse/WarehouseReleases";
import WarehouseBilling from "./pages/warehouse/WarehouseBilling";
import WarehouseFacility from "./pages/warehouse/WarehouseFacility";
import WarehouseAccount from "./pages/warehouse/WarehouseAccount";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverAssignmentDetail from "./pages/driver/DriverAssignmentDetail";
import DriverAccount from "./pages/driver/DriverAccount";
import TruckingAssignments from "./pages/trucking/TruckingAssignments";
import Warehouses from "./pages/Warehouses";
import PaymentSuccess from "./pages/PaymentSuccess";
import Team from "./pages/Team";
import Accounting from "./pages/Accounting";
import RateTrends from "./pages/RateTrends";
import Pipeline from "./pages/Pipeline";
import Earnings from "./pages/Earnings";
import ResetPassword from "./pages/ResetPassword";
import NotificationPreferences from "./pages/NotificationPreferences";
import PendingApproval from "./pages/PendingApproval";
import Onboarding from "./pages/Onboarding";
import Analytics from "./pages/Analytics";
import CustomerPortal from "./pages/CustomerPortal";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Security from "./pages/Security";
import Templates from "./pages/Templates";
import Spark from "./pages/Spark";
import Opportunities from "./pages/Opportunities";
import ForwarderDashboard from "./pages/forwarder/ForwarderDashboard";
import ForwarderCustomers from "./pages/forwarder/ForwarderCustomers";
import ForwarderShipments from "./pages/forwarder/ForwarderShipments";
import ForwarderRequests from "./pages/forwarder/ForwarderRequests";
import ForwarderQuotes from "./pages/forwarder/ForwarderQuotes";
import ForwarderDocuments from "./pages/forwarder/ForwarderDocuments";
import ForwarderAnalytics from "./pages/forwarder/ForwarderAnalytics";
import ForwarderAccount from "./pages/forwarder/ForwarderAccount";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminFinancials from "./pages/admin/AdminFinancials";
import AdminSystem from "./pages/admin/AdminSystem";
import AdminShipments from "./pages/admin/AdminShipments";
import AdminShipmentDetail from "./pages/admin/AdminShipmentDetail";
import AdminCustomerLookup from "./pages/admin/AdminCustomerLookup";
import AdminPipeline from "./pages/admin/AdminPipeline";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminTrucking from "./pages/admin/AdminTrucking";
import AdminWarehouses from "./pages/admin/AdminWarehouses";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminAccounting from "./pages/admin/AdminAccounting";
import AdminRateTrends from "./pages/admin/AdminRateTrends";
import AdminCRM from "./pages/admin/AdminCRM";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAccount from "./pages/admin/AdminAccount";
import AdminCompliance from "./pages/admin/AdminCompliance";
import AdminApiHealth from "./pages/admin/AdminApiHealth";
import AdminDataExplorer from "./pages/admin/AdminDataExplorer";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail";
import AdminSalesPipeline from "./pages/admin/AdminSalesPipeline";
import AdminSalesAnalytics from "./pages/admin/AdminSalesAnalytics";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminPaymentSettings from "./pages/admin/AdminPaymentSettings";
import AdminPricingEngine from "./pages/admin/AdminPricingEngine";
import AdminProfitIntelligence from "./pages/admin/AdminProfitIntelligence";
import AdminRateIntelligence from "./pages/admin/AdminRateIntelligence";
import PricingPreview from "./pages/PricingPreview";
import BookingFlow from "./pages/BookingFlow";
import AdminLearningInsights from "./pages/admin/AdminLearningInsights";
import AdminCustomerPricing from "./pages/admin/AdminCustomerPricing";
import AdminMarketIngestion from "./pages/admin/AdminMarketIngestion";
import AdminLaneAutoQuote from "./pages/admin/AdminLaneAutoQuote";
import AdminCommercialCommand from "./pages/admin/AdminCommercialCommand";
import AdminWeeklyReview from "./pages/admin/AdminWeeklyReview";
import Support from "./pages/Support";
import Ideas from "./pages/Ideas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <ImpersonationBanner />
            <Routes>
            {/* Marketing / Public */}
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/features" element={<Features />} />
            <Route path="/category" element={<Category />} />
            <Route path="/about" element={<About />} />
            <Route path="/rates" element={<RateSearch />} />
            <Route path="/security" element={<Security />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/quote/approve" element={<QuoteApproval />} />
            <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Quick entry routes */}
            <Route path="/shipments/new" element={<ProtectedRoute><NewShipmentWizard /></ProtectedRoute>} />
            <Route path="/pricing-preview" element={<ProtectedRoute><PricingPreview /></ProtectedRoute>} />
            <Route path="/book" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />

            {/* Operations Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/dashboard/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
            <Route path="/dashboard/shipments/new" element={<ProtectedRoute><NewShipmentWizard /></ProtectedRoute>} />
            <Route path="/dashboard/shipments/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
            <Route path="/dashboard/shipments/:id/workspace" element={<ProtectedRoute><CustomerShipmentWorkspace /></ProtectedRoute>} />
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
            <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/dashboard/portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />
            <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/dashboard/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
            <Route path="/dashboard/spark" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
            <Route path="/dashboard/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
            <Route path="/dashboard/opportunities" element={<ProtectedRoute><Opportunities /></ProtectedRoute>} />
            <Route path="/dashboard/spark/:companyId" element={<ProtectedRoute><Spark /></ProtectedRoute>} />
            <Route path="/dashboard/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/dashboard/ideas" element={<ProtectedRoute><Ideas /></ProtectedRoute>} />

            {/* Admin Console — separate platform monitoring portal */}
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminGate><AdminDashboard /></AdminGate>} />
            <Route path="/admin/pipeline" element={<AdminGate><AdminPipeline /></AdminGate>} />
            <Route path="/admin/quotes" element={<AdminGate><AdminQuotes /></AdminGate>} />
            <Route path="/admin/shipments" element={<AdminGate><AdminShipments /></AdminGate>} />
            <Route path="/admin/shipments/:id" element={<AdminGate><AdminShipmentDetail /></AdminGate>} />
            <Route path="/admin/trucking" element={<AdminGate><AdminTrucking /></AdminGate>} />
            <Route path="/admin/warehouses" element={<AdminGate><AdminWarehouses /></AdminGate>} />
            <Route path="/admin/documents" element={<AdminGate><AdminDocuments /></AdminGate>} />
            <Route path="/admin/accounting" element={<AdminGate><AdminAccounting /></AdminGate>} />
            <Route path="/admin/rate-trends" element={<AdminGate><AdminRateTrends /></AdminGate>} />
            <Route path="/admin/crm" element={<AdminGate><AdminCRM /></AdminGate>} />
            <Route path="/admin/crm/:id" element={<AdminGate><AdminCompanyDetail /></AdminGate>} />
            <Route path="/admin/partners" element={<AdminGate><AdminPartners /></AdminGate>} />
            <Route path="/admin/users" element={<AdminGate><AdminUsers /></AdminGate>} />
            <Route path="/admin/customers" element={<AdminGate><AdminCustomerLookup /></AdminGate>} />
            <Route path="/admin/activity" element={<AdminGate><AdminActivity /></AdminGate>} />
            <Route path="/admin/financials" element={<AdminGate><AdminFinancials /></AdminGate>} />
            <Route path="/admin/compliance" element={<AdminGate><AdminCompliance /></AdminGate>} />
            <Route path="/admin/api-health" element={<AdminGate><AdminApiHealth /></AdminGate>} />
            <Route path="/admin/system" element={<AdminGate><AdminSystem /></AdminGate>} />
            <Route path="/admin/data" element={<AdminGate><AdminDataExplorer /></AdminGate>} />
            <Route path="/admin/team" element={<AdminGate><AdminTeam /></AdminGate>} />
            <Route path="/admin/notifications" element={<AdminGate><AdminNotifications /></AdminGate>} />
            <Route path="/admin/account" element={<AdminGate><AdminAccount /></AdminGate>} />
            <Route path="/admin/sales-pipeline" element={<AdminGate><AdminSalesPipeline /></AdminGate>} />
            <Route path="/admin/sales-analytics" element={<AdminGate><AdminSalesAnalytics /></AdminGate>} />
            <Route path="/admin/campaigns" element={<AdminGate><AdminCampaigns /></AdminGate>} />
            <Route path="/admin/materials" element={<AdminGate><AdminMaterials /></AdminGate>} />
            <Route path="/admin/payment-settings" element={<AdminGate><AdminPaymentSettings /></AdminGate>} />
            <Route path="/admin/pricing-engine" element={<AdminGate><AdminPricingEngine /></AdminGate>} />
            <Route path="/admin/profit" element={<AdminGate><AdminProfitIntelligence /></AdminGate>} />
            <Route path="/admin/rate-intelligence" element={<AdminGate><AdminRateIntelligence /></AdminGate>} />
            <Route path="/admin/learning-insights" element={<AdminGate><AdminLearningInsights /></AdminGate>} />
            <Route path="/admin/customer-pricing" element={<AdminGate><AdminCustomerPricing /></AdminGate>} />
            <Route path="/admin/market-ingestion" element={<AdminGate><AdminMarketIngestion /></AdminGate>} />
            <Route path="/admin/lane-auto-quote" element={<AdminGate><AdminLaneAutoQuote /></AdminGate>} />
            <Route path="/admin/commercial" element={<AdminGate><AdminCommercialCommand /></AdminGate>} />
            <Route path="/admin/weekly-review" element={<AdminGate><AdminWeeklyReview /></AdminGate>} />

            {/* Forwarder Portal */}
            <Route path="/forwarder" element={<ForwarderGate><ForwarderDashboard /></ForwarderGate>} />
            <Route path="/forwarder/customers" element={<ForwarderGate><ForwarderCustomers /></ForwarderGate>} />
            <Route path="/forwarder/shipments" element={<ForwarderGate><ForwarderShipments /></ForwarderGate>} />
            <Route path="/forwarder/requests" element={<ForwarderGate><ForwarderRequests /></ForwarderGate>} />
            <Route path="/forwarder/quotes" element={<ForwarderGate><ForwarderQuotes /></ForwarderGate>} />
            <Route path="/forwarder/documents" element={<ForwarderGate><ForwarderDocuments /></ForwarderGate>} />
            <Route path="/forwarder/analytics" element={<ForwarderGate><ForwarderAnalytics /></ForwarderGate>} />
            <Route path="/forwarder/account" element={<ForwarderGate><ForwarderAccount /></ForwarderGate>} />

            {/* Trucking Company Portal */}
            <Route path="/trucking/login" element={<Navigate to="/login" replace />} />
            <Route path="/trucking" element={<TruckingGate><TruckingDashboard /></TruckingGate>} />
            <Route path="/trucking/orders" element={<TruckingGate><TruckingOrders /></TruckingGate>} />
            <Route path="/trucking/orders/:id" element={<TruckingGate><TruckingOrderDetail /></TruckingGate>} />
            <Route path="/trucking/quotes" element={<TruckingGate><TruckingQuotes /></TruckingGate>} />
            <Route path="/trucking/assignments" element={<TruckingGate><TruckingAssignments /></TruckingGate>} />
            <Route path="/trucking/account" element={<TruckingGate><TruckingAccount /></TruckingGate>} />

            {/* Driver Portal */}
            <Route path="/driver" element={<DriverGate><DriverDashboard /></DriverGate>} />
            <Route path="/driver/job/:id" element={<DriverGate><DriverAssignmentDetail /></DriverGate>} />
            <Route path="/driver/account" element={<DriverGate><DriverAccount /></DriverGate>} />

            {/* Warehouse Portal */}
            <Route path="/warehouse" element={<WarehouseGate><WarehouseDashboard /></WarehouseGate>} />
            <Route path="/warehouse/inbound" element={<WarehouseGate><WarehouseInbound /></WarehouseGate>} />
            <Route path="/warehouse/inventory" element={<WarehouseGate><WarehouseInventory /></WarehouseGate>} />
            <Route path="/warehouse/releases" element={<WarehouseGate><WarehouseReleases /></WarehouseGate>} />
            <Route path="/warehouse/billing" element={<WarehouseGate><WarehouseBilling /></WarehouseGate>} />
            <Route path="/warehouse/facility" element={<WarehouseGate><WarehouseFacility /></WarehouseGate>} />
            <Route path="/warehouse/account" element={<WarehouseGate><WarehouseAccount /></WarehouseGate>} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
