import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Zap,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Clock,
  Loader2,
  Receipt,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import type { InvoiceWithRelations } from "@shared/schema";

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generateOpen, setGenerateOpen] = useState(false);
  const { toast } = useToast();

  const now = new Date();
  const defaultPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [genForm, setGenForm] = useState({
    periodStart: defaultPeriodStart,
    periodEnd: defaultPeriodEnd,
    billingCycle: "monthly",
    dueDays: "10",
  });

  const invoicesUrl = statusFilter !== "all"
    ? `/api/invoices?status=${statusFilter}`
    : "/api/invoices";

  const { data: invoicesData, isLoading } = useQuery<InvoiceWithRelations[]>({
    queryKey: [invoicesUrl],
  });

  const { data: stats } = useQuery<{
    totalDue: number;
    totalCollected: number;
    overdueCount: number;
    collectedThisMonth: number;
  }>({
    queryKey: ["/api/billing/stats"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/generate", {
        periodStart: genForm.periodStart,
        periodEnd: genForm.periodEnd,
        billingCycle: genForm.billingCycle,
        dueDays: parseInt(genForm.dueDays),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [invoicesUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/stats"] });
      setGenerateOpen(false);
      toast({
        title: "Invoices Generated",
        description: `${data.generated} invoices generated, ${data.skipped} skipped.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markOverdueMutation = useMutation({
    mutationFn: async (suspendAccounts: boolean) => {
      const res = await apiRequest("POST", "/api/billing/mark-overdue", { suspendAccounts });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [invoicesUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Overdue Check Complete",
        description: `${data.markedOverdue} invoices marked overdue${data.suspended > 0 ? `, ${data.suspended} accounts suspended` : ""}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = invoicesData?.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.customer.name.toLowerCase().includes(q) ||
      inv.customer.contact.includes(q) ||
      (inv.customer.cnicNumber && inv.customer.cnicNumber.includes(q)) ||
      inv.customer.address.toLowerCase().includes(q)
    );
  });

  const statCards = [
    {
      label: "Total Due",
      value: stats ? `Rs. ${stats.totalDue.toLocaleString()}` : "-",
      icon: DollarSign,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Collected This Month",
      value: stats ? `Rs. ${stats.collectedThisMonth.toLocaleString()}` : "-",
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Collected",
      value: stats ? `Rs. ${stats.totalCollected.toLocaleString()}` : "-",
      icon: Banknote,
      color: "text-primary",
    },
    {
      label: "Overdue Invoices",
      value: stats ? stats.overdueCount.toString() : "-",
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-billing-title">
            Billing & Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage invoices, collect payments, and track revenue
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => markOverdueMutation.mutate(true)}
            disabled={markOverdueMutation.isPending}
            data-testid="button-mark-overdue"
          >
            {markOverdueMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Mark Overdue
          </Button>
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-invoices">
                <Zap className="mr-2 h-4 w-4" /> Generate Invoices
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Invoices</DialogTitle>
                <DialogDescription>
                  Generate monthly invoices for all active customers with assigned plans.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Period Start</label>
                    <Input
                      type="date"
                      value={genForm.periodStart}
                      onChange={(e) => setGenForm((p) => ({ ...p, periodStart: e.target.value }))}
                      data-testid="input-period-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Period End</label>
                    <Input
                      type="date"
                      value={genForm.periodEnd}
                      onChange={(e) => setGenForm((p) => ({ ...p, periodEnd: e.target.value }))}
                      data-testid="input-period-end"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Billing Cycle</label>
                    <Select
                      value={genForm.billingCycle}
                      onValueChange={(v) => setGenForm((p) => ({ ...p, billingCycle: v }))}
                    >
                      <SelectTrigger data-testid="select-billing-cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due in (days)</label>
                    <Input
                      type="number"
                      value={genForm.dueDays}
                      onChange={(e) => setGenForm((p) => ({ ...p, dueDays: e.target.value }))}
                      data-testid="input-due-days"
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  data-testid="button-confirm-generate"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-billing-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, CNIC, or address..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-invoices"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-invoice-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-base font-medium text-muted-foreground">
                {search || statusFilter !== "all" ? "No invoices match your filters" : "No invoices yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Generate invoices for active customers to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Paid</TableHead>
                    <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell>
                        <Link href={`/customers/${inv.customerId}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{inv.customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{inv.customer.contact}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {inv.periodStart} to {inv.periodEnd}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          Rs. {inv.totalAmount.toLocaleString()}
                        </span>
                        {inv.isProRata && (
                          <span className="text-xs text-muted-foreground block">Pro-rata</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        Rs. {inv.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {inv.dueDate}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/billing/${inv.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-invoice-${inv.id}`}>
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
