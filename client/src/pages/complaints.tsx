import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Customer, ComplaintWithRelations } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  UserCheck,
  Loader2,
  Filter,
  Printer,
  Pencil,
  Trash2,
  XCircle,
  Star,
  ThumbsUp,
  Activity,
} from "lucide-react";
import { Link } from "wouter";

const complaintTypeLabels: Record<string, string> = {
  no_internet: "No Internet",
  slow_internet: "Slow Internet",
  red_light: "Red Light",
  wire_damage: "Wire Damage",
  modem_dead: "Modem Dead",
  modem_replacement: "Modem Replacement",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

const statusVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  open: "destructive",
  assigned: "secondary",
  in_progress: "default",
  completed: "default",
  closed: "outline",
};

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

export default function ComplaintsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [complaintType, setComplaintType] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<ComplaintWithRelations | null>(null);
  const [editComplaintType, setEditComplaintType] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editStatus, setEditStatus] = useState("open");
  const [deleteComplaintId, setDeleteComplaintId] = useState<number | null>(null);

  const { data: complaints = [], isLoading } = useQuery<ComplaintWithRelations[]>({
    queryKey: ["/api/complaints", statusFilter],
    queryFn: async () => {
      const url = statusFilter !== "all" ? `/api/complaints?status=${statusFilter}` : "/api/complaints";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const { data: stats } = useQuery<{
    totalOpen: number;
    totalAssigned: number;
    totalInProgress: number;
    totalCompleted: number;
    totalClosed: number;
    avgAgentRating: number;
    avgServiceRating: number;
  }>({
    queryKey: ["/api/complaints/stats"],
  });

  const { data: searchResults = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/customers?search=${encodeURIComponent(customerSearch)}`);
      return res.json();
    },
    enabled: customerSearch.length > 0,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { customerId: number; complaintType: string; description: string; priority: string }) => {
      const res = await apiRequest("POST", "/api/complaints", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints/stats"] });
      setShowRegisterDialog(false);
      resetForm();

      if (data.whatsappSent) {
        toast({ title: "Complaint registered & WhatsApp message sent" });
      } else if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
        apiRequest("PATCH", `/api/complaints/${data.complaint.id}/whatsapp-open`);
        toast({ title: "Complaint registered successfully" });
      } else {
        toast({ title: "Complaint registered successfully" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/complaints/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints/stats"] });
      setShowEditDialog(false);
      setEditingComplaint(null);
      toast({ title: "Complaint updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/complaints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints/stats"] });
      setDeleteComplaintId(null);
      toast({ title: "Complaint deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function openEditDialog(c: ComplaintWithRelations) {
    setEditingComplaint(c);
    setEditComplaintType(c.complaintType);
    setEditDescription(c.description || "");
    setEditPriority(c.priority);
    setEditStatus(c.status);
    setShowEditDialog(true);
  }

  function handleUpdate() {
    if (!editingComplaint || !editComplaintType) return;
    updateMutation.mutate({
      id: editingComplaint.id,
      data: {
        complaintType: editComplaintType,
        description: editDescription || null,
        priority: editPriority,
        status: editStatus,
      },
    });
  }

  function resetForm() {
    setCustomerSearch("");
    setSelectedCustomerId(null);
    setSelectedCustomerName("");
    setComplaintType("");
    setDescription("");
    setPriority("normal");
  }

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  function handleRegister() {
    if (!selectedCustomerId || !complaintType) {
      toast({ title: "Please select a customer and complaint type", variant: "destructive" });
      return;
    }
    registerMutation.mutate({
      customerId: selectedCustomerId,
      complaintType,
      description,
      priority,
    });
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Complaints</h1>
                <p className="text-white/70 text-sm">Track and resolve customer issues</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowRegisterDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-register-complaint">
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Register</span> Complaint
              </Button>
              <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 print:hidden">
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Open</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-open">{stats.totalOpen}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Assigned</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-stat-assigned">{stats.totalAssigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">In Progress</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400" data-testid="text-stat-in-progress">{stats.totalInProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Completed</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-stat-completed">{stats.totalCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/25 group-hover:scale-110 transition-transform">
                  <XCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Closed</p>
                  <p className="text-xl font-bold text-slate-600 dark:text-slate-400" data-testid="text-stat-closed">{stats.totalClosed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Agent Rating</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-stat-agent-rating">{stats.avgAgentRating || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                  <ThumbsUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Service Rating</p>
                  <p className="text-xl font-bold text-violet-600 dark:text-violet-400" data-testid="text-stat-service-rating">{stats.avgServiceRating || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 print:hidden">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-status-filter">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="print:hidden border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading complaints...</div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No complaints found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                    <th className="text-left px-4 py-3 text-white font-semibold">#</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Customer</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Type</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Priority</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Assigned To</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Date</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">
                      <div className="flex items-center gap-2">
                        Actions
                        <Badge className="bg-white/20 text-white border-0 text-[10px] no-default-hover-elevate no-default-active-elevate">{complaints.length}</Badge>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-complaint-${c.id}`}>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{c.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.customer?.name}</div>
                        <div className="text-xs text-muted-foreground">{c.customer?.contact}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-slate-50 dark:bg-slate-900/50">
                          {complaintTypeLabels[c.complaintType] || c.complaintType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={statusVariant[c.status] || "outline"}
                          className={`no-default-hover-elevate no-default-active-elevate ${
                            c.status === "open" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800" :
                            c.status === "assigned" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800" :
                            c.status === "in_progress" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" :
                            c.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" :
                            "bg-slate-100 text-slate-700 dark:bg-slate-950/50 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          }`}
                          data-testid={`badge-status-${c.id}`}
                        >
                          {statusLabels[c.status] || c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={c.priority === "urgent" ? "destructive" : c.priority === "high" ? "secondary" : "outline"}
                          className={`no-default-hover-elevate no-default-active-elevate capitalize ${
                            c.priority === "urgent" ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800" :
                            c.priority === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border-orange-200 dark:border-orange-800" :
                            c.priority === "normal" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" :
                            "bg-slate-50 text-slate-600 dark:bg-slate-950/30 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.assignedTo || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/complaints/${c.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-${c.id}`}>
                              View
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteComplaintId(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="text-center mb-4">
          <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="mx-auto mb-2" style={{ maxWidth: "200px" }} />
          <p style={{ fontSize: "10px", color: "#666" }}>
            Basement Soneri Bank, Alama Iqbal Road, Pattoki
          </p>
        </div>

        <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>CUSTOMER COMPLAINTS REPORT</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Status Filter:</strong> {statusFilter === "all" ? "All" : statusLabels[statusFilter] || statusFilter}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>ID</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Customer</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Subject</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Status</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Priority</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Assigned To</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td style={{ border: "1px solid #ccc", padding: "4px", fontFamily: "monospace" }}>{c.id}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{c.customer?.name}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{complaintTypeLabels[c.complaintType] || c.complaintType}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{statusLabels[c.status] || c.status}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textTransform: "capitalize" }}>{c.priority}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{c.assignedTo || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>Total: {complaints.length} complaints</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Prepared By</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Verified By</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Authorized Sign</div>
          </div>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "9px", color: "#999", borderTop: "1px solid #eee", paddingTop: "8px" }}>
          Software developed by: Storm Fiber Internet Pattoki
        </div>
      </div>

      <Dialog open={showRegisterDialog} onOpenChange={(open) => { setShowRegisterDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              {selectedCustomerId ? (
                <div className="flex items-center justify-between gap-2 p-2 border rounded-md">
                  <span className="text-sm font-medium">{selectedCustomerName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedCustomerId(null); setSelectedCustomerName(""); setCustomerSearch(""); }}
                    data-testid="button-clear-customer"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Search customer by name, contact, CNIC..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    data-testid="input-customer-search"
                  />
                  {customerSearch && searchResults.length > 0 && (
                    <div className="mt-1 border rounded-md divide-y max-h-32 overflow-y-auto">
                      {searchResults.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2 hover-elevate cursor-pointer text-sm"
                          onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name); setCustomerSearch(""); }}
                          data-testid={`button-select-customer-${c.id}`}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground ml-2">{c.contact}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Complaint Type</Label>
              <Select value={complaintType} onValueChange={setComplaintType}>
                <SelectTrigger data-testid="select-complaint-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_internet">No Internet</SelectItem>
                  <SelectItem value="slow_internet">Slow Internet</SelectItem>
                  <SelectItem value="red_light">Red Light</SelectItem>
                  <SelectItem value="wire_damage">Wire Damage</SelectItem>
                  <SelectItem value="modem_dead">Modem Dead</SelectItem>
                  <SelectItem value="modem_replacement">Modem Replacement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue..."
                data-testid="input-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRegisterDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={registerMutation.isPending}
              data-testid="button-submit-complaint"
            >
              {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Register & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setEditingComplaint(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Complaint #{editingComplaint?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">{editingComplaint?.customer?.name}</p>
              <p className="text-muted-foreground text-xs">{editingComplaint?.customer?.contact}</p>
            </div>

            <div className="space-y-2">
              <Label>Complaint Type</Label>
              <Select value={editComplaintType} onValueChange={setEditComplaintType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_internet">No Internet</SelectItem>
                  <SelectItem value="slow_internet">Slow Internet</SelectItem>
                  <SelectItem value="red_light">Red Light</SelectItem>
                  <SelectItem value="wire_damage">Wire Damage</SelectItem>
                  <SelectItem value="modem_dead">Modem Dead</SelectItem>
                  <SelectItem value="modem_replacement">Modem Replacement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={editPriority} onValueChange={setEditPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe the issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingComplaint(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Update Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteComplaintId !== null} onOpenChange={(open) => { if (!open) setDeleteComplaintId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete complaint #{deleteComplaintId}? This will also remove all related images and feedback. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteComplaintId && deleteMutation.mutate(deleteComplaintId)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
