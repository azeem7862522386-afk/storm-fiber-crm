import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Printer } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Customer, ServicePlan } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: plans } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: expiryData } = useQuery<Record<number, { lastPayment: string; expiryDate: string }>>({
    queryKey: ["/api/customers/expiry-data"],
  });

  const planMap = new Map(plans?.map((p) => [p.id, p]) || []);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const filtered = customers?.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.contact.includes(search) ||
      c.address.toLowerCase().includes(q) ||
      (c.cnicNumber && c.cnicNumber.includes(search));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-customers-title">
                  Customers
                </h1>
                <p className="text-white/70 text-sm">
                  Manage your customer accounts and subscriptions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
              </Button>
              <Link href="/customers/new">
                <Button size="sm" data-testid="button-add-customer" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Add</span> Customer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Card className="print:hidden border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, contact, CNIC, or address..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="register">Register</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
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
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-base font-medium text-muted-foreground">
                {search || statusFilter !== "all" ? "No customers match your filters" : "No customers yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Add your first customer to get started"}
              </p>
              {!search && statusFilter === "all" && (
                <Link href="/customers/new">
                  <Button variant="outline" className="mt-4" data-testid="button-add-first-customer-empty">
                    <Plus className="mr-2 h-4 w-4" /> Add Customer
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableHead className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Name</TableHead>
                    <TableHead className="hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Address</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Plan</TableHead>
                    <TableHead className="hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Connection</TableHead>
                    <TableHead className="hidden md:table-cell text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Expiry</TableHead>
                    <TableHead className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((customer) => {
                    const plan = customer.planId ? planMap.get(customer.planId) : null;
                    const expiry = expiryData?.[customer.id];
                    const isExpired = expiry && new Date(expiry.expiryDate) < new Date();
                    const isExpiringSoon = expiry && !isExpired && new Date(expiry.expiryDate) <= new Date(Date.now() + 3 * 86400000);
                    return (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                        data-testid={`row-customer-${customer.id}`}
                      >
                        <TableCell>
                          <Link href={`/customers/${customer.id}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground md:hidden truncate">{customer.contact}</p>
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {customer.contact}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                          {customer.address}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {plan ? plan.speed : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {customer.connectionDate || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {expiry ? (
                            <Badge
                              className={
                                isExpired
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-0"
                                  : isExpiringSoon
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border-0"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-0"
                              }
                            >
                              {expiry.expiryDate}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={customer.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>CUSTOMER LIST</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Total Customers:</strong> {filtered?.length ?? 0}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8", width: "30px" }}>#</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Name</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Contact</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Address</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Plan</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Connection</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Expiry</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered?.map((customer, idx) => {
              const plan = customer.planId ? planMap.get(customer.planId) : null;
              const expiry = expiryData?.[customer.id];
              return (
                <tr key={customer.id}>
                  <td style={{ border: "1px solid #ccc", padding: "4px", color: "#666" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{customer.name}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{customer.contact}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{customer.address}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{plan ? plan.speed : "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{customer.connectionDate || "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{expiry ? expiry.expiryDate : "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", textTransform: "capitalize" }}>{customer.status}</td>
                </tr>
              );
            })}
          </tbody>
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

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "9px", color: "#999" }}>
          Software developed by: Storm Fiber Internet Pattoki
        </div>
      </div>
    </div>
  );
}
