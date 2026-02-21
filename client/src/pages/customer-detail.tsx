import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  CreditCard,
  Wifi,
  Cable,
  Send,
  Loader2,
  User,
  Clock,
  StickyNote,
  Save,
  Trash2,
  Receipt,
  FileText,
  Calendar,
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import type {
  CustomerWithRelations,
  ServicePlan,
  Invoice,
} from "@shared/schema";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");

  const { data: customer, isLoading } = useQuery<CustomerWithRelations>({
    queryKey: ["/api/customers", params.id],
  });

  const { data: plans } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: customerInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/customers", params.id, "invoices"],
  });

  const { data: expiryData } = useQuery<Record<number, { lastPayment: string; expiryDate: string }>>({
    queryKey: ["/api/customers/expiry-data"],
  });

  const [installForm, setInstallForm] = useState({
    connectionType: "new_connection",
    router: "",
    onu: "",
    macAddress: "",
    port: "",
  });

  useEffect(() => {
    if (customer?.installation) {
      setInstallForm({
        connectionType: customer.installation.connectionType || "new_connection",
        router: customer.installation.router || "",
        onu: customer.installation.onu || "",
        macAddress: customer.installation.macAddress || "",
        port: customer.installation.port || "",
      });
    }
  }, [customer?.installation]);

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/customers/${params.id}/notes`, {
        content: noteText,
        customerId: Number(params.id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", params.id] });
      setNoteText("");
      toast({ title: "Note Added", description: "Note has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveInstallMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...installForm,
        customerId: Number(params.id),
      };
      if (customer?.installation) {
        return apiRequest("PATCH", `/api/installations/${customer.installation.id}`, data);
      }
      return apiRequest("POST", "/api/installations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", params.id] });
      toast({ title: "Installation Saved", description: "Installation details updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/customers/${params.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Status Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest("DELETE", `/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", params.id] });
      toast({ title: "Note Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <User className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Customer not found</p>
        <Link href="/customers">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const totalDue = customerInvoices
    ?.filter((inv) => inv.status === "issued" || inv.status === "partial" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.totalAmount - inv.paidAmount, 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/customers")}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-customer-name">
                {customer.name}
              </h1>
              <StatusBadge status={customer.status} />
            </div>
            <p className="text-sm text-muted-foreground">Customer ID: #{customer.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={customer.status}
            onValueChange={(v) => statusMutation.mutate(v)}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-change-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="register">Register</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Link href={`/customers/${customer.id}/edit`}>
            <Button variant="outline" data-testid="button-edit-customer">
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-lg">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium" data-testid="text-detail-name">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Since {new Date(customer.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm" data-testid="text-detail-contact">{customer.contact}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm" data-testid="text-detail-address">{customer.address}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm" data-testid="text-detail-email">{customer.email}</span>
                </div>
              )}
              {customer.cnicNumber && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm" data-testid="text-detail-cnic">{customer.cnicNumber}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Service Plan</p>
              {customer.plan ? (
                <div className="flex items-center gap-3">
                  <Wifi className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{customer.plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.plan.speed} - Rs. {customer.plan.price}/{customer.plan.validity}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No plan assigned</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              {customer.connectionDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Connection Date</p>
                    <p className="text-sm font-medium">{customer.connectionDate}</p>
                  </div>
                </div>
              )}
              {expiryData?.[customer.id] && (
                <>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Last Payment</p>
                      <p className="text-sm font-medium">{expiryData[customer.id].lastPayment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 shrink-0" style={{ color: new Date(expiryData[customer.id].expiryDate) < new Date() ? "#ef4444" : new Date(expiryData[customer.id].expiryDate) <= new Date(Date.now() + 3 * 86400000) ? "#f97316" : "#22c55e" }} />
                    <div>
                      <p className="text-xs text-muted-foreground">Expiry Date</p>
                      <Badge variant={new Date(expiryData[customer.id].expiryDate) < new Date() ? "destructive" : "default"}>
                        {expiryData[customer.id].expiryDate}
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </div>

            {totalDue > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400" data-testid="text-outstanding-balance">
                    Rs. {totalDue.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="billing" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="billing" data-testid="tab-billing">
                <Receipt className="mr-2 h-4 w-4" /> Billing
              </TabsTrigger>
              <TabsTrigger value="installation" data-testid="tab-installation">
                <Cable className="mr-2 h-4 w-4" /> Installation
              </TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">
                <StickyNote className="mr-2 h-4 w-4" /> Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="billing" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">Invoices</CardTitle>
                  <Link href="/billing">
                    <Button variant="ghost" size="sm" data-testid="button-view-all-billing">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!customerInvoices || customerInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No invoices yet. Generate invoices from the Billing page.
                      </p>
                      <Link href="/billing">
                        <Button variant="outline" size="sm" className="mt-3" data-testid="button-go-to-billing">
                          Go to Billing
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerInvoices
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((inv) => (
                          <Link key={inv.id} href={`/billing/${inv.id}`}>
                            <div
                              className="flex items-center justify-between gap-3 rounded-md p-3 hover-elevate cursor-pointer"
                              data-testid={`card-invoice-${inv.id}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">
                                    Rs. {inv.totalAmount.toLocaleString()}
                                    {inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        (Paid: Rs. {inv.paidAmount.toLocaleString()})
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {inv.periodStart} to {inv.periodEnd} | Due: {inv.dueDate}
                                  </p>
                                </div>
                              </div>
                              <InvoiceStatusBadge status={inv.status} />
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="installation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Installation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Connection Type</label>
                      <Select
                        value={installForm.connectionType}
                        onValueChange={(v) =>
                          setInstallForm((prev) => ({ ...prev, connectionType: v }))
                        }
                      >
                        <SelectTrigger data-testid="select-connection-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_connection">New Connection</SelectItem>
                          <SelectItem value="upgrade">Upgrade</SelectItem>
                          <SelectItem value="relocation">Relocation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Router</label>
                      <Input
                        placeholder="Router model/serial"
                        value={installForm.router}
                        onChange={(e) =>
                          setInstallForm((prev) => ({ ...prev, router: e.target.value }))
                        }
                        data-testid="input-router"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">ONU</label>
                      <Input
                        placeholder="ONU serial number"
                        value={installForm.onu}
                        onChange={(e) =>
                          setInstallForm((prev) => ({ ...prev, onu: e.target.value }))
                        }
                        data-testid="input-onu"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">MAC Address</label>
                      <Input
                        placeholder="XX:XX:XX:XX:XX:XX"
                        value={installForm.macAddress}
                        onChange={(e) =>
                          setInstallForm((prev) => ({ ...prev, macAddress: e.target.value }))
                        }
                        data-testid="input-mac"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Port</label>
                      <Input
                        placeholder="Port number"
                        value={installForm.port}
                        onChange={(e) =>
                          setInstallForm((prev) => ({ ...prev, port: e.target.value }))
                        }
                        data-testid="input-port"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => saveInstallMutation.mutate()}
                      disabled={saveInstallMutation.isPending}
                      data-testid="button-save-installation"
                    >
                      {saveInstallMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Installation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes & History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Add a note about this customer..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="resize-none"
                      data-testid="input-note"
                    />
                    <Button
                      size="icon"
                      onClick={() => addNoteMutation.mutate()}
                      disabled={!noteText.trim() || addNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      {addNoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {!customer.notes || customer.notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <StickyNote className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No notes yet. Add a note to track customer interactions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customer.notes
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .map((note) => (
                          <div
                            key={note.id}
                            className="flex items-start gap-3 rounded-md p-3 bg-muted/50"
                            data-testid={`note-${note.id}`}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
