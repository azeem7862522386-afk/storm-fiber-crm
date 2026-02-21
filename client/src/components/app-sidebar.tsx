import { Users, LayoutDashboard, Wifi, Settings, Printer, BookOpen, BookMarked, Wallet, Store, BookUser, BarChart3, AlertTriangle, Target, FileText, ScrollText, Settings2, Building2, CalendarCheck, DollarSign, CalendarDays, Boxes, ArrowLeftRight, RotateCcw, Shield, Globe, Cable, HandCoins, Network, Navigation, ListTodo, Bell, ClipboardList, Star } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "To Do List", url: "/todos", icon: ListTodo, module: "dashboard" },
  { title: "Customers", url: "/customers", icon: Users, module: "customers" },
  { title: "New Connections", url: "/new-connections", icon: Cable, module: "customers" },
  { title: "POS", url: "/pos", icon: Printer, module: "pos" },
  { title: "Complaints", url: "/complaints", icon: AlertTriangle, module: "complaints" },
  { title: "Agent Tracking", url: "/agent-tracking", icon: Navigation, module: "complaints" },
  { title: "Employee Feedback", url: "/employee-feedback", icon: Star, module: "complaints" },
  { title: "Expiry Reminders", url: "/expiry-reminders", icon: Bell, module: "customers" },
  { title: "Service Plans", url: "/plans", icon: Wifi, module: "plans" },
  { title: "Network Infra", url: "/network-infrastructure", icon: Network, module: "settings" },
  { title: "NBB Portal", url: "/nbb-portal", icon: Globe, module: "settings" },
  { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
];

const hrItems = [
  { title: "Employees", url: "/employees", icon: Users, module: "employees" },
  { title: "Departments", url: "/departments", icon: Building2, module: "departments" },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, module: "attendance" },
  { title: "Duty Chart", url: "/duty-chart", icon: ClipboardList, module: "duty_chart" },
  { title: "Leave Management", url: "/leave-management", icon: CalendarDays, module: "leave" },
  { title: "Employee Salaries", url: "/employee-salaries", icon: HandCoins, module: "payroll" },
  { title: "Salary Slip", url: "/salary-slip", icon: Printer, module: "payroll" },
  { title: "Performance", url: "/performance", icon: Target, module: "performance" },
  { title: "Policies", url: "/policies", icon: FileText, module: "policies" },
  { title: "Audit Logs", url: "/audit-logs", icon: ScrollText, module: "audit_logs" },
  { title: "System Config", url: "/system-config", icon: Settings2, module: "system_config" },
];

const inventoryItems = [
  { title: "Stock Items", url: "/stock/items", icon: Boxes, module: "inventory" },
  { title: "Stock Issues", url: "/stock/issues", icon: ArrowLeftRight, module: "inventory" },
  { title: "Stock Returns", url: "/stock/returns", icon: RotateCcw, module: "inventory" },
  { title: "Stock Damages", url: "/stock/damages", icon: AlertTriangle, module: "inventory" },
];

const accountsItems = [
  { title: "Chart of Accounts", url: "/accounts/chart", icon: BookOpen, module: "accounts" },
  { title: "Journal Entries", url: "/accounts/journal", icon: BookMarked, module: "accounts" },
  { title: "Expenses", url: "/accounts/expenses", icon: Wallet, module: "accounts" },
  { title: "Vendors & Payables", url: "/accounts/vendors", icon: Store, module: "accounts" },
  { title: "Customer Ledger", url: "/accounts/ledger", icon: BookUser, module: "accounts" },
  { title: "Reports", url: "/accounts/reports", icon: BarChart3, module: "accounts" },
  { title: "Daily Sheet", url: "/accounts/daily-sheet", icon: CalendarCheck, module: "accounts" },
  { title: "Month Closing", url: "/accounts/month-closing", icon: CalendarDays, module: "accounts" },
  { title: "Receivables", url: "/accounts/receivables", icon: HandCoins, module: "accounts" },
];

const adminItems = [
  { title: "User Management", url: "/users", icon: Shield, module: "user_management" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { hasAccess, user } = useAuth();

  const filterItems = (items: typeof menuItems) =>
    items.filter((item) => hasAccess(item.module));

  const filteredMenu = filterItems(menuItems);
  const filteredHr = filterItems(hrItems);
  const filteredInventory = filterItems(inventoryItems);
  const filteredAccounts = filterItems(accountsItems);
  const filteredAdmin = filterItems(adminItems);

  const renderGroup = (
    label: string,
    items: typeof menuItems
  ) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-blue-300/40 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const isActive =
                item.url === "/"
                  ? location === "/"
                  : location.startsWith(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)",
            }}
          >
            <Wifi className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">Storm Fiber</span>
            <span className="text-[11px] text-blue-300/50 font-medium">Pattoki ISP CRM</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Management", filteredMenu)}
        {renderGroup("HR & Employee", filteredHr)}
        {renderGroup("Stock Management", filteredInventory)}
        {renderGroup("Accounts", filteredAccounts)}
        {renderGroup("Admin", filteredAdmin)}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-blue-300">
              {user?.fullName?.charAt(0) || "A"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-blue-100/80">{user?.fullName || "Admin"}</span>
            <span className="text-[10px] text-blue-300/40 capitalize">{user?.role || "admin"}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
