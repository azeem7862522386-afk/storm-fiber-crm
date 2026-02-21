import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConnectionRequestWithRelations, ServicePlan, Employee, Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Loader2,
  Cable,
  UserCheck,
  Wrench,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  Pencil,
  Printer,
  Search,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned_engineer: "Engineer Assigned",
  assigned_fieldworker: "Field Worker Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const formSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().min(1, "Contact is required"),
  customerWhatsapp: z.string().optional().default(""),
  customerAddress: z.string().min(1, "Address is required"),
  customerCnic: z.string().optional().default(""),
  planId: z.number().nullable().optional().default(null),
  modemOwnership: z.string().optional().default("company"),
  notes: z.string().optional().default(""),
  registeredBy: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate">{statusLabels[status]}</Badge>;
    case "assigned_engineer":
      return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{statusLabels[status]}</Badge>;
    case "assigned_fieldworker":
      return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">{statusLabels[status]}</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{statusLabels[status]}</Badge>;
    case "completed":
      return <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate bg-green-600 dark:bg-green-700 text-white">{statusLabels[status]}</Badge>;
    case "cancelled":
      return <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">{statusLabels[status]}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">{status}</Badge>;
  }
}

export default function NewConnectionsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ConnectionRequestWithRelations | null>(null);
  const [showEngineerDialog, setShowEngineerDialog] = useState(false);
  const [showFieldWorkerDialog, setShowFieldWorkerDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedEngineerId, setSelectedEngineerId] = useState("");
  const [selectedFieldWorkerId, setSelectedFieldWorkerId] = useState("");
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customerSearch || customerSearch.length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data);
          setShowCustomerDropdown(data.length > 0);
        }
      } catch {}
      setSearchingCustomers(false);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [customerSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCustomer(customer: Customer) {
    form.setValue("customerName", customer.name);
    form.setValue("customerContact", customer.contact);
    form.setValue("customerAddress", customer.address);
    form.setValue("customerCnic", customer.cnicNumber || "");
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  }

  function clearCustomerSelection() {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    form.setValue("customerName", "");
    form.setValue("customerContact", "");
    form.setValue("customerAddress", "");
    form.setValue("customerCnic", "");
    form.setValue("customerWhatsapp", "");
  }

  const { data: requests = [], isLoading } = useQuery<ConnectionRequestWithRelations[]>({
    queryKey: ["/api/connection-requests"],
  });

  const { data: plans = [] } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const activeEmployees = employees.filter((e) => e.status === "active");

  const filteredRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerContact: "",
      customerWhatsapp: "",
      customerAddress: "",
      customerCnic: "",
      planId: null,
      modemOwnership: "company",
      notes: "",
      registeredBy: "",
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerContact: "",
      customerWhatsapp: "",
      customerAddress: "",
      customerCnic: "",
      planId: null,
      modemOwnership: "company",
      notes: "",
      registeredBy: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/connection-requests", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      setShowNewDialog(false);
      form.reset();
      if (data.whatsappSent) {
        toast({ title: "Connection request created & WhatsApp sent" });
      } else if (data.whatsappLink) {
        setWhatsappLink(data.whatsappLink);
        setShowWhatsappDialog(true);
        toast({ title: "Connection request created successfully" });
      } else {
        toast({ title: "Connection request created successfully" });
        if (data.id) navigate(`/connection-slip/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      const { registeredBy, ...editData } = data;
      const res = await apiRequest("PATCH", `/api/connection-requests/${id}`, editData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      setShowEditDialog(false);
      setEditingRequest(null);
      editForm.reset();
      toast({ title: "Connection request updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignEngineerMutation = useMutation({
    mutationFn: async ({ id, engineerId }: { id: number; engineerId: number }) => {
      const res = await apiRequest("PATCH", `/api/connection-requests/${id}/assign-engineer`, { engineerId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      setShowEngineerDialog(false);
      setSelectedEngineerId("");
      setSelectedRequestId(null);
      if (data.whatsappSent) {
        toast({ title: "Engineer assigned & WhatsApp sent" });
      } else if (data.whatsappLink) {
        setWhatsappLink(data.whatsappLink);
        setShowWhatsappDialog(true);
        toast({ title: "Engineer assigned successfully" });
      } else {
        toast({ title: "Engineer assigned successfully" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignFieldWorkerMutation = useMutation({
    mutationFn: async ({ id, fieldWorkerId }: { id: number; fieldWorkerId: number }) => {
      const res = await apiRequest("PATCH", `/api/connection-requests/${id}/assign-fieldworker`, { fieldWorkerId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      setShowFieldWorkerDialog(false);
      setSelectedFieldWorkerId("");
      setSelectedRequestId(null);
      if (data.whatsappSent) {
        toast({ title: "Field worker assigned & WhatsApp sent" });
      } else if (data.whatsappLink) {
        setWhatsappLink(data.whatsappLink);
        setShowWhatsappDialog(true);
        toast({ title: "Field worker assigned successfully" });
      } else {
        toast({ title: "Field worker assigned successfully" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/connection-requests/${id}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      if (data.whatsappSent) {
        toast({ title: "Connection completed & WhatsApp sent" });
      } else if (data.whatsappLink) {
        setWhatsappLink(data.whatsappLink);
        setShowWhatsappDialog(true);
        toast({ title: "Connection marked as completed" });
      } else {
        toast({ title: "Connection marked as completed" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/connection-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      toast({ title: "Connection request cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "assigned_engineer", label: "Engineer Assigned" },
    { value: "assigned_fieldworker", label: "Field Worker Assigned" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const completedCount = requests.filter(r => r.status === "completed").length;
  const inProgressCount = requests.filter(r => r.status !== "pending" && r.status !== "completed" && r.status !== "cancelled").length;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Cable className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">New Connections</h1>
                <p className="text-white/70 text-sm">Manage connection requests and installations</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowNewDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-new-request">
              <Plus className="h-4 w-4 mr-1" />
              New Request
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                <Cable className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Pending</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">In Progress</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Completed</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <Badge
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStatusFilter(opt.value)}
            data-testid={`filter-${opt.value}`}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1">
                ({requests.filter((r) => r.status === opt.value).length})
              </span>
            )}
            {opt.value === "all" && (
              <span className="ml-1">({requests.length})</span>
            )}
          </Badge>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
              No connection requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-connection-requests">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700">
                    <TableHead className="text-white font-semibold">ID</TableHead>
                    <TableHead className="text-white font-semibold">Customer Name</TableHead>
                    <TableHead className="text-white font-semibold">Contact</TableHead>
                    <TableHead className="text-white font-semibold">Address</TableHead>
                    <TableHead className="text-white font-semibold">Package</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Engineer</TableHead>
                    <TableHead className="text-white font-semibold">Field Worker</TableHead>
                    <TableHead className="text-white font-semibold">Date</TableHead>
                    <TableHead className="text-white font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-request-${req.id}`}>
                      <TableCell className="font-mono text-muted-foreground" data-testid={`text-id-${req.id}`}>
                        {req.id}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-name-${req.id}`}>
                        {req.customerName}
                      </TableCell>
                      <TableCell data-testid={`text-contact-${req.id}`}>
                        {req.customerContact}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" data-testid={`text-address-${req.id}`}>
                        {req.customerAddress}
                      </TableCell>
                      <TableCell data-testid={`text-plan-${req.id}`}>
                        {req.plan ? (
                          <span>{req.plan.name} - Rs. {req.plan.price.toLocaleString("en-PK")}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`badge-status-${req.id}`}>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell data-testid={`text-engineer-${req.id}`}>
                        {req.engineer ? `${req.engineer.firstName} ${req.engineer.lastName}` : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-fieldworker-${req.id}`}>
                        {req.fieldWorker ? `${req.fieldWorker.firstName} ${req.fieldWorker.lastName}` : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-date-${req.id}`}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Link href={`/connection-slip/${req.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-print-slip-${req.id}`}
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Slip
                            </Button>
                          </Link>
                          {req.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRequest(req);
                                editForm.reset({
                                  customerName: req.customerName,
                                  customerContact: req.customerContact,
                                  customerWhatsapp: req.customerWhatsapp || "",
                                  customerAddress: req.customerAddress,
                                  customerCnic: req.customerCnic || "",
                                  planId: req.planId || null,
                                  modemOwnership: (req as any).modemOwnership || "company",
                                  notes: req.notes || "",
                                  registeredBy: (req as any).registeredBy || "",
                                });
                                setShowEditDialog(true);
                              }}
                              data-testid={`button-edit-${req.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                          {req.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequestId(req.id);
                                setSelectedEngineerId(req.engineerId ? String(req.engineerId) : "");
                                setShowEngineerDialog(true);
                              }}
                              data-testid={`button-assign-engineer-${req.id}`}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Engineer
                            </Button>
                          )}
                          {req.status !== "cancelled" && req.status !== "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequestId(req.id);
                                setSelectedFieldWorkerId(req.fieldWorkerId ? String(req.fieldWorkerId) : "");
                                setShowFieldWorkerDialog(true);
                              }}
                              data-testid={`button-assign-fieldworker-${req.id}`}
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Field Worker
                            </Button>
                          )}
                          {req.status !== "completed" && req.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => completeMutation.mutate(req.id)}
                              disabled={completeMutation.isPending}
                              data-testid={`button-complete-${req.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          {req.status !== "completed" && req.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelMutation.mutate(req.id)}
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-${req.id}`}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewDialog} onOpenChange={(open) => { setShowNewDialog(open); if (!open) { form.reset(); clearCustomerSelection(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Connection Request</DialogTitle>
          </DialogHeader>

          <div className="relative" ref={dropdownRef}>
            <Label className="text-sm font-medium mb-1.5 block">Search Existing Customer</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type name, mobile number or CNIC..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (selectedCustomerId) setSelectedCustomerId(null);
                }}
                className="pl-9 pr-9"
              />
              {(customerSearch || selectedCustomerId) && (
                <button
                  type="button"
                  onClick={clearCustomerSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchingCustomers && (
                <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {selectedCustomerId && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Customer selected - details auto-filled
              </p>
            )}
            {showCustomerDropdown && customerResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/60 border-b last:border-b-0 text-sm"
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.contact} {c.cnicNumber ? `| CNIC: ${c.cnicNumber}` : ""} | {c.address}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showCustomerDropdown && customerResults.length === 0 && !searchingCustomers && customerSearch.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-3 text-sm text-muted-foreground text-center">
                No existing customer found. Fill the details below manually.
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="03XX-XXXXXXX" {...field} data-testid="input-customer-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="03XX-XXXXXXX" {...field} value={field.value || ""} data-testid="input-customer-whatsapp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} data-testid="input-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerCnic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXXX-XXXXXXX-X" {...field} value={field.value || ""} data-testid="input-customer-cnic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package (Optional)</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.name} - {plan.speed} - Rs. {plan.price.toLocaleString("en-PK")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modemOwnership"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modem Ownership</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "company"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-modem-ownership">
                          <SelectValue placeholder="Select modem ownership" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company">Company Owned</SelectItem>
                        <SelectItem value="customer">Customer Owned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} value={field.value || ""} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => { setShowNewDialog(false); form.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-request">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Create Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setEditingRequest(null); editForm.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Connection Request #{editingRequest?.id}</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((values) => {
              if (editingRequest) updateMutation.mutate({ id: editingRequest.id, data: values });
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} data-testid="input-edit-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="customerContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="03XX-XXXXXXX" {...field} data-testid="input-edit-customer-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="customerWhatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="03XX-XXXXXXX" {...field} value={field.value || ""} data-testid="input-edit-customer-whatsapp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Full address" {...field} data-testid="input-edit-customer-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="customerCnic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNIC (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="XXXXX-XXXXXXX-X" {...field} value={field.value || ""} data-testid="input-edit-customer-cnic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package (Optional)</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-plan">
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.name} - {plan.speed} - Rs. {plan.price.toLocaleString("en-PK")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="modemOwnership"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modem Ownership</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "company"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-modem-ownership">
                          <SelectValue placeholder="Select modem ownership" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company">Company Owned</SelectItem>
                        <SelectItem value="customer">Customer Owned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} value={field.value || ""} data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => { setShowEditDialog(false); setEditingRequest(null); editForm.reset(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEngineerDialog} onOpenChange={(open) => { setShowEngineerDialog(open); if (!open) { setSelectedEngineerId(""); setSelectedRequestId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Engineer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Engineer</Label>
              <Select value={selectedEngineerId} onValueChange={setSelectedEngineerId}>
                <SelectTrigger data-testid="select-engineer">
                  <SelectValue placeholder="Choose an engineer" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.firstName} {emp.lastName} - {emp.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEngineerDialog(false); setSelectedEngineerId(""); setSelectedRequestId(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequestId && selectedEngineerId) {
                  assignEngineerMutation.mutate({ id: selectedRequestId, engineerId: Number(selectedEngineerId) });
                }
              }}
              disabled={!selectedEngineerId || assignEngineerMutation.isPending}
              data-testid="button-confirm-engineer"
            >
              {assignEngineerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign Engineer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFieldWorkerDialog} onOpenChange={(open) => { setShowFieldWorkerDialog(open); if (!open) { setSelectedFieldWorkerId(""); setSelectedRequestId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Field Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Field Worker</Label>
              <Select value={selectedFieldWorkerId} onValueChange={setSelectedFieldWorkerId}>
                <SelectTrigger data-testid="select-fieldworker">
                  <SelectValue placeholder="Choose a field worker" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.firstName} {emp.lastName} - {emp.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFieldWorkerDialog(false); setSelectedFieldWorkerId(""); setSelectedRequestId(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequestId && selectedFieldWorkerId) {
                  assignFieldWorkerMutation.mutate({ id: selectedRequestId, fieldWorkerId: Number(selectedFieldWorkerId) });
                }
              }}
              disabled={!selectedFieldWorkerId || assignFieldWorkerMutation.isPending}
              data-testid="button-confirm-fieldworker"
            >
              {assignFieldWorkerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign Field Worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhatsappDialog} onOpenChange={setShowWhatsappDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send WhatsApp Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            <MessageSquare className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Click the button below to send a WhatsApp notification.
            </p>
            <Button
              className="w-full bg-green-600 dark:bg-green-700 text-white"
              onClick={() => {
                if (whatsappLink) {
                  window.open(whatsappLink, "_blank");
                }
                setShowWhatsappDialog(false);
                setWhatsappLink(null);
              }}
              data-testid="button-send-whatsapp"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Send WhatsApp Notification
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowWhatsappDialog(false); setWhatsappLink(null); }} className="w-full">
              Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
