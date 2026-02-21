import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  ArrowRight,
  Wifi,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Receipt,
  LayoutDashboard,
  Activity,
} from "lucide-react";
import { Link } from "wouter";
import type { Customer, ServicePlan } from "@shared/schema";
import { StatusBadge } from "@/components/status-badge";

export default function Dashboard() {
  const { data: customers, isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: plans, isLoading: loadingPlans } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: billingStats } = useQuery<{
    totalDue: number;
    totalCollected: number;
    overdueCount: number;
    collectedThisMonth: number;
  }>({
    queryKey: ["/api/billing/stats"],
  });

  const stats = {
    total: customers?.length || 0,
    active: customers?.filter((c) => c.status === "active").length || 0,
    suspended: customers?.filter((c) => c.status === "suspended").length || 0,
    registered: customers?.filter((c) => c.status === "register").length || 0,
    terminated: customers?.filter((c) => c.status === "terminated").length || 0,
  };

  const customerStatCards = [
    { label: "Total Customers", value: stats.total, icon: Users, color: "blue" },
    { label: "Active", value: stats.active, icon: UserCheck, color: "emerald" },
    { label: "Suspended", value: stats.suspended, icon: UserX, color: "amber" },
    { label: "New Registrations", value: stats.registered, icon: UserPlus, color: "violet" },
  ];

  const billingStatCards = [
    {
      label: "Total Due",
      value: billingStats ? `Rs. ${billingStats.totalDue.toLocaleString()}` : "-",
      icon: DollarSign,
      color: "orange",
    },
    {
      label: "This Month",
      value: billingStats ? `Rs. ${billingStats.collectedThisMonth.toLocaleString()}` : "-",
      icon: TrendingUp,
      color: "teal",
    },
    {
      label: "Total Collected",
      value: billingStats ? `Rs. ${billingStats.totalCollected.toLocaleString()}` : "-",
      icon: Receipt,
      color: "indigo",
    },
    {
      label: "Overdue",
      value: billingStats ? billingStats.overdueCount.toString() : "-",
      icon: AlertTriangle,
      color: "rose",
    },
  ];

  const recentCustomers = customers?.slice(-5).reverse() || [];

  const colorMap: Record<string, { card: string; iconBg: string; text: string; shadow: string }> = {
    blue: {
      card: "bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      text: "text-blue-700 dark:text-blue-400",
      shadow: "shadow-blue-500/25",
    },
    emerald: {
      card: "bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
      text: "text-emerald-700 dark:text-emerald-400",
      shadow: "shadow-emerald-500/25",
    },
    amber: {
      card: "bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
      text: "text-amber-700 dark:text-amber-400",
      shadow: "shadow-amber-500/25",
    },
    violet: {
      card: "bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
      text: "text-violet-700 dark:text-violet-400",
      shadow: "shadow-violet-500/25",
    },
    orange: {
      card: "bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
      text: "text-orange-700 dark:text-orange-400",
      shadow: "shadow-orange-500/25",
    },
    teal: {
      card: "bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-teal-500 to-teal-600",
      text: "text-teal-700 dark:text-teal-400",
      shadow: "shadow-teal-500/25",
    },
    indigo: {
      card: "bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      text: "text-indigo-700 dark:text-indigo-400",
      shadow: "shadow-indigo-500/25",
    },
    rose: {
      card: "bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-background",
      iconBg: "bg-gradient-to-br from-rose-500 to-rose-600",
      text: "text-rose-700 dark:text-rose-400",
      shadow: "shadow-rose-500/25",
    },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="text-white/70 text-sm">
                Welcome to Storm Fiber Pattoki Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customers Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {customerStatCards.map((stat) => {
            const c = colorMap[stat.color];
            return (
              <Card key={stat.label} className={`group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${c.card}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${c.iconBg} text-white shadow-lg ${c.shadow} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium truncate">{stat.label}</p>
                      {loadingCustomers ? (
                        <Skeleton className="h-7 w-14 mt-0.5" />
                      ) : (
                        <p className={`text-xl font-bold ${c.text}`} data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                          {stat.value}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Billing Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {billingStatCards.map((stat) => {
            const c = colorMap[stat.color];
            return (
              <Card key={stat.label} className={`group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${c.card}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${c.iconBg} text-white shadow-lg ${c.shadow} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground font-medium truncate">{stat.label}</p>
                      <p className={`text-xl font-bold ${c.text} truncate`} data-testid={`text-billing-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-semibold text-white">Recent Customers</h3>
            </div>
            <Link href="/customers">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 h-7 text-xs" data-testid="link-view-all-customers">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <CardContent className="p-4">
            {loadingCustomers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No customers yet</p>
                <Link href="/customers/new">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-add-first-customer">
                    Add First Customer
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentCustomers.map((customer) => (
                  <Link key={customer.id} href={`/customers/${customer.id}`}>
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                      data-testid={`card-customer-${customer.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-sm">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{customer.contact}</p>
                        </div>
                      </div>
                      <StatusBadge status={customer.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-semibold text-white">Service Plans</h3>
            </div>
            <Link href="/plans">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 h-7 text-xs" data-testid="link-view-all-plans">
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          <CardContent className="p-4">
            {loadingPlans ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !plans || plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Wifi className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No plans configured</p>
                <Link href="/plans">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-add-first-plan">
                    Add Plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {plans.slice(0, 6).map((plan, index) => {
                  const colors = ["from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600", "from-violet-500 to-violet-600", "from-orange-500 to-orange-600", "from-teal-500 to-teal-600", "from-rose-500 to-rose-600"];
                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-accent/50 transition-colors"
                      data-testid={`card-plan-${plan.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-sm`}>
                          <Wifi className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{plan.speed}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground bg-accent/50 px-3 py-1 rounded-lg">
                        Rs. {plan.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
