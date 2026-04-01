import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Radio, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Search,
  ChevronDown, ChevronRight, Ship, Container, FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

type ConnectionStatus = {
  carrier: string;
  auth_type: string;
  status: string;
  token_valid: boolean | null;
  token_expires_at: string | null;
  last_success_at: string | null;
  base_url_configured: boolean;
  environment: string;
};

type TntResult = {
  success: boolean;
  raw_message_id: string;
  job_id: string | null;
  http_status: number;
  events_count: number | null;
};

const AdminApiHealth = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [connLoading, setConnLoading] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);

  const [tntRef, setTntRef] = useState("");
  const [tntRefType, setTntRefType] = useState<"container" | "booking" | "bl">("container");
  const [tntResult, setTntResult] = useState<TntResult | null>(null);
  const [tntLoading, setTntLoading] = useState(false);
  const [tntError, setTntError] = useState<string | null>(null);

  const [expandedRaw, setExpandedRaw] = useState<string | null>(null);

  // Recent raw messages
  const { data: rawMessages, isLoading: rawLoading, refetch: refetchRaw } = useQuery({
    queryKey: ["admin-carrier-raw-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carrier_raw_messages")
        .select("id, carrier_id, source_channel, message_family, message_type, external_reference, http_status, processing_status, error_message, created_at, request_payload_json, response_payload_json")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Recent integration jobs
  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ["admin-integration-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_jobs")
        .select("id, carrier_id, job_type, job_status, last_error, created_at, completed_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const testConnection = async () => {
    setConnLoading(true);
    setConnError(null);
    try {
      const { data, error } = await supabase.functions.invoke("evergreen-auth", {
        body: { action: "status", environment: "production" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConnectionStatus(data);
      toast.success("Connection status retrieved");
    } catch (err: any) {
      setConnError(err.message);
      toast.error("Connection test failed");
    } finally {
      setConnLoading(false);
    }
  };

  const refreshToken = async () => {
    setConnLoading(true);
    setConnError(null);
    try {
      const { data, error } = await supabase.functions.invoke("evergreen-auth", {
        body: { action: "refresh", environment: "production" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConnectionStatus(null);
      toast.success("Token refreshed successfully");
      await testConnection();
    } catch (err: any) {
      setConnError(err.message);
      toast.error("Token refresh failed");
    } finally {
      setConnLoading(false);
    }
  };

  const fetchTnt = async () => {
    if (!tntRef.trim()) {
      toast.error("Enter a reference number");
      return;
    }
    setTntLoading(true);
    setTntError(null);
    setTntResult(null);
    try {
      const body: Record<string, string> = { environment: "production" };
      if (tntRefType === "container") body.container_number = tntRef.trim();
      else if (tntRefType === "booking") body.booking_number = tntRef.trim();
      else body.bill_of_lading_number = tntRef.trim();

      const { data, error } = await supabase.functions.invoke("evergreen-tnt", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTntResult(data);
      toast.success(data.success ? "Data fetched from Evergreen" : `Carrier returned HTTP ${data.http_status}`);
      refetchRaw();
      refetchJobs();
    } catch (err: any) {
      setTntError(err.message);
      toast.error("TNT fetch failed");
    } finally {
      setTntLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "active" || status === "processed" || status === "completed")
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === "error" || status === "failed")
      return <XCircle className="h-4 w-4 text-red-400" />;
    return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="h-5 w-5 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">API Health & Validation</h1>
        </div>
        <p className="text-sm text-[hsl(220,10%,50%)]">
          Test carrier connections, fetch live data, and inspect raw vs normalized payloads
        </p>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList className="bg-[hsl(220,18%,10%)] border border-[hsl(220,15%,15%)]">
          <TabsTrigger value="connection" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[hsl(220,10%,50%)]">
            Connection
          </TabsTrigger>
          <TabsTrigger value="fetch" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[hsl(220,10%,50%)]">
            Manual Fetch
          </TabsTrigger>
          <TabsTrigger value="raw" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[hsl(220,10%,50%)]">
            Raw Messages
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[hsl(220,10%,50%)]">
            Jobs
          </TabsTrigger>
        </TabsList>

        {/* ── Connection Tab ── */}
        <TabsContent value="connection">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-white">Evergreen (EGLV) Connection</h2>
                <p className="text-xs text-[hsl(220,10%,45%)] mt-1">Verify OAuth status and API connectivity</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={testConnection} disabled={connLoading}
                  className="border-[hsl(220,15%,20%)] text-[hsl(220,10%,60%)] hover:bg-[hsl(220,15%,15%)]">
                  {connLoading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                  Test Connection
                </Button>
                <Button size="sm" onClick={refreshToken} disabled={connLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <RefreshCw className={`h-3 w-3 mr-1 ${connLoading ? "animate-spin" : ""}`} />
                  Refresh Token
                </Button>
              </div>
            </div>

            {connError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 mb-4">
                <p className="text-xs text-red-400 font-mono">{connError}</p>
              </div>
            )}

            {connectionStatus && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Carrier", value: connectionStatus.carrier },
                  { label: "Auth Type", value: connectionStatus.auth_type },
                  { label: "Status", value: connectionStatus.status, highlight: true },
                  { label: "Environment", value: connectionStatus.environment },
                  { label: "Token Valid", value: connectionStatus.token_valid === null ? "N/A (API Key)" : connectionStatus.token_valid ? "Yes ✓" : "No ✗" },
                  { label: "Token Expires", value: connectionStatus.token_expires_at ? format(new Date(connectionStatus.token_expires_at), "MMM d, HH:mm:ss") : "—" },
                  { label: "Base URL", value: connectionStatus.base_url_configured ? "Configured ✓" : "Missing ✗" },
                  { label: "Last Success", value: connectionStatus.last_success_at ? format(new Date(connectionStatus.last_success_at), "MMM d, HH:mm") : "Never" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,18%,8%)] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] mb-1">{item.label}</p>
                    <p className={`text-sm font-medium ${item.highlight ? (connectionStatus.status === "active" ? "text-emerald-400" : "text-red-400") : "text-white"}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!connectionStatus && !connError && !connLoading && (
              <div className="text-center py-12 text-[hsl(220,10%,35%)] text-xs">
                Click "Test Connection" to check Evergreen API status
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Manual Fetch Tab ── */}
        <TabsContent value="fetch">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] p-6">
            <h2 className="text-sm font-semibold text-white mb-1">Manual Track & Trace Fetch</h2>
            <p className="text-xs text-[hsl(220,10%,45%)] mb-4">
              Enter a reference to pull live data from Evergreen's API
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,18%,8%)] overflow-hidden">
                {([
                  { key: "container", icon: Container, label: "Container" },
                  { key: "booking", icon: Ship, label: "Booking" },
                  { key: "bl", icon: FileText, label: "B/L" },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTntRefType(t.key)}
                    className={`flex items-center gap-1 px-3 py-2 text-xs transition-colors ${
                      tntRefType === t.key
                        ? "bg-indigo-600 text-white"
                        : "text-[hsl(220,10%,50%)] hover:bg-[hsl(220,15%,12%)]"
                    }`}
                  >
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder={tntRefType === "container" ? "e.g. EGHU1234567" : tntRefType === "booking" ? "e.g. EGL12345678" : "e.g. EGLV12345678"}
                value={tntRef}
                onChange={(e) => setTntRef(e.target.value)}
                className="flex-1 bg-[hsl(220,18%,8%)] border-[hsl(220,15%,15%)] text-white font-mono placeholder:text-[hsl(220,10%,30%)]"
                onKeyDown={(e) => e.key === "Enter" && fetchTnt()}
              />
              <Button onClick={fetchTnt} disabled={tntLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {tntLoading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
                Fetch
              </Button>
            </div>

            {tntError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 mb-4">
                <p className="text-xs text-red-400 font-mono">{tntError}</p>
              </div>
            )}

            {tntResult && (
              <div className="rounded-lg border border-[hsl(220,15%,15%)] bg-[hsl(220,18%,8%)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  {tntResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                  <span className={`text-sm font-semibold ${tntResult.success ? "text-emerald-400" : "text-red-400"}`}>
                    {tntResult.success ? "Live Data Received" : `Error (HTTP ${tntResult.http_status})`}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[hsl(220,10%,40%)]">Raw Message ID</span>
                    <p className="text-white font-mono truncate">{tntResult.raw_message_id}</p>
                  </div>
                  <div>
                    <span className="text-[hsl(220,10%,40%)]">Job ID</span>
                    <p className="text-white font-mono truncate">{tntResult.job_id || "—"}</p>
                  </div>
                  <div>
                    <span className="text-[hsl(220,10%,40%)]">HTTP Status</span>
                    <p className="text-white">{tntResult.http_status}</p>
                  </div>
                  <div>
                    <span className="text-[hsl(220,10%,40%)]">Events Count</span>
                    <p className="text-white">{tntResult.events_count ?? "—"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Raw Messages Tab ── */}
        <TabsContent value="raw">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Recent Raw Messages</h2>
              <Button size="sm" variant="ghost" onClick={() => refetchRaw()} className="text-[hsl(220,10%,50%)] hover:text-white">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {rawLoading ? <Skeleton className="h-48 m-4 bg-[hsl(220,15%,15%)]" /> : (
              <div className="divide-y divide-[hsl(220,15%,13%)]">
                {(!rawMessages || rawMessages.length === 0) ? (
                  <div className="px-4 py-12 text-center text-xs text-[hsl(220,10%,35%)]">No raw messages yet. Use Manual Fetch to pull data.</div>
                ) : rawMessages.map((msg: any) => (
                  <div key={msg.id}>
                    <button
                      onClick={() => setExpandedRaw(expandedRaw === msg.id ? null : msg.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[hsl(220,15%,12%)] transition-colors"
                    >
                      {expandedRaw === msg.id ? <ChevronDown className="h-3 w-3 text-[hsl(220,10%,40%)]" /> : <ChevronRight className="h-3 w-3 text-[hsl(220,10%,40%)]" />}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        {statusIcon(msg.processing_status)}
                        <span className="text-xs font-medium text-white truncate">{msg.external_reference || "—"}</span>
                        <Badge variant="outline" className="text-[10px] border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)]">{msg.message_family}</Badge>
                        <Badge variant="outline" className="text-[10px] border-[hsl(220,15%,20%)] text-[hsl(220,10%,50%)]">{msg.source_channel}</Badge>
                        <span className="text-[10px] text-[hsl(220,10%,35%)] ml-auto">{format(new Date(msg.created_at), "MMM d, HH:mm:ss")}</span>
                        <Badge variant="outline" className={`text-[10px] ${
                          msg.processing_status === "error" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          msg.processing_status === "processed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>{msg.processing_status}</Badge>
                      </div>
                    </button>
                    {expandedRaw === msg.id && (
                      <div className="px-4 pb-4 grid lg:grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] mb-1">Request</p>
                          <pre className="text-[10px] text-[hsl(220,10%,60%)] bg-[hsl(220,18%,6%)] rounded-lg p-3 overflow-auto max-h-64 font-mono">
                            {JSON.stringify(msg.request_payload_json, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[hsl(220,10%,40%)] mb-1">Response (HTTP {msg.http_status})</p>
                          <pre className="text-[10px] text-[hsl(220,10%,60%)] bg-[hsl(220,18%,6%)] rounded-lg p-3 overflow-auto max-h-64 font-mono">
                            {JSON.stringify(msg.response_payload_json, null, 2)}
                          </pre>
                        </div>
                        {msg.error_message && (
                          <div className="lg:col-span-2">
                            <p className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Error</p>
                            <p className="text-xs text-red-400 font-mono">{msg.error_message}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Jobs Tab ── */}
        <TabsContent value="jobs">
          <div className="rounded-xl border border-[hsl(220,15%,13%)] bg-[hsl(220,18%,10%)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(220,15%,13%)]">
              <h2 className="text-sm font-semibold text-white">Integration Jobs</h2>
              <Button size="sm" variant="ghost" onClick={() => refetchJobs()} className="text-[hsl(220,10%,50%)] hover:text-white">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {jobsLoading ? <Skeleton className="h-48 m-4 bg-[hsl(220,15%,15%)]" /> : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[hsl(220,15%,13%)] text-[10px] font-semibold uppercase tracking-wider text-[hsl(220,10%,40%)]">
                    <th className="text-left px-4 py-3">Job Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Created</th>
                    <th className="text-left px-4 py-3">Completed</th>
                    <th className="text-left px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(!jobs || jobs.length === 0) ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-[hsl(220,10%,35%)]">No jobs yet</td></tr>
                  ) : jobs.map((j: any) => (
                    <tr key={j.id} className="border-b border-[hsl(220,15%,13%)] hover:bg-[hsl(220,15%,12%)]">
                      <td className="px-4 py-3 font-mono text-white">{j.job_type}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${
                          j.job_status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          j.job_status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>{j.job_status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[hsl(220,10%,50%)]">{format(new Date(j.created_at), "MMM d, HH:mm:ss")}</td>
                      <td className="px-4 py-3 text-[hsl(220,10%,50%)]">{j.completed_at ? format(new Date(j.completed_at), "HH:mm:ss") : "—"}</td>
                      <td className="px-4 py-3 text-red-400 truncate max-w-[200px]">{j.last_error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminApiHealth;
