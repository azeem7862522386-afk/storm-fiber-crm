import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import CustomerFormPage from "@/pages/customer-form";
import CustomerDetailPage from "@/pages/customer-detail";
import PlansPage from "@/pages/plans";
import SettingsPage from "@/pages/settings";
import ReceiptPage from "@/pages/receipt";
import PosPage from "@/pages/pos";
import ComplaintsPage from "@/pages/complaints";
import ComplaintDetailPage from "@/pages/complaint-detail";
import PublicFeedbackPage from "@/pages/public-feedback";
import PublicConnectionFeedbackPage from "@/pages/public-connection-feedback";
import ChartOfAccountsPage from "@/pages/accounts/chart-of-accounts";
import JournalEntriesPage from "@/pages/accounts/journal-entries";
import ExpensesPage from "@/pages/accounts/expenses";
import VendorsPage from "@/pages/accounts/vendors";
import CustomerLedgerPage from "@/pages/accounts/customer-ledger";
import ReportsPage from "@/pages/accounts/reports";
import DailyEntriesPage from "@/pages/accounts/daily-entries";
import MonthClosingPage from "@/pages/accounts/month-closing";
import ReceivablesPage from "@/pages/accounts/receivables";
import EmployeesPage from "@/pages/employees";
import EmployeeFormPage from "@/pages/employee-form";
import EmployeeDetailPage from "@/pages/employee-detail";
import DepartmentsPage from "@/pages/departments";
import AttendancePage from "@/pages/attendance";
import EmployeeSalariesPage from "@/pages/employee-salaries";
import SalarySlipPage from "@/pages/salary-slip";
import LeaveManagementPage from "@/pages/leave-management";
import PerformancePage from "@/pages/performance";
import PoliciesPage from "@/pages/policies";
import AuditLogsPage from "@/pages/audit-logs";
import SystemConfigPage from "@/pages/system-config";
import StockItemsPage from "@/pages/stock-items";
import StockIssuesPage from "@/pages/stock-issues";
import StockReturnsPage from "@/pages/stock-returns";
import StockDamagesPage from "@/pages/stock-damages";
import UserManagementPage from "@/pages/user-management";
import NbbPortalPage from "@/pages/nbb-portal";
import AgentPortalPage from "@/pages/agent-portal";
import NewConnectionsPage from "@/pages/new-connections";
import ConnectionRegistrationSlipPage from "@/pages/connection-registration-slip";
import NetworkInfrastructurePage from "@/pages/network-infrastructure";
import AgentTrackingPage from "@/pages/agent-tracking";
import TodosPage from "@/pages/todos";
import ExpiryRemindersPage from "@/pages/expiry-reminders";
import DutyChartPage from "@/pages/duty-chart";
import EmployeeFeedbackPage from "@/pages/employee-feedback";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function ProtectedRoute({ module, component: Component }: { module: string; component: React.ComponentType<any> }) {
  const { hasAccess } = useAuth();
  if (!hasAccess(module)) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold" data-testid="text-access-denied">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this section.</p>
        </div>
      </div>
    );
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <ProtectedRoute module="dashboard" component={Dashboard} />}</Route>
      <Route path="/customers">{() => <ProtectedRoute module="customers" component={CustomersPage} />}</Route>
      <Route path="/customers/new">{() => <ProtectedRoute module="customers" component={CustomerFormPage} />}</Route>
      <Route path="/customers/:id/edit">{() => <ProtectedRoute module="customers" component={CustomerFormPage} />}</Route>
      <Route path="/customers/:id">{() => <ProtectedRoute module="customers" component={CustomerDetailPage} />}</Route>
      <Route path="/plans">{() => <ProtectedRoute module="plans" component={PlansPage} />}</Route>
      <Route path="/receipt/:invoiceId/:paymentId" component={ReceiptPage} />
      <Route path="/pos">{() => <ProtectedRoute module="pos" component={PosPage} />}</Route>
      <Route path="/complaints">{() => <ProtectedRoute module="complaints" component={ComplaintsPage} />}</Route>
      <Route path="/complaints/:id">{() => <ProtectedRoute module="complaints" component={ComplaintDetailPage} />}</Route>
      <Route path="/agent-tracking">{() => <ProtectedRoute module="complaints" component={AgentTrackingPage} />}</Route>
      <Route path="/employee-feedback">{() => <ProtectedRoute module="complaints" component={EmployeeFeedbackPage} />}</Route>
      <Route path="/todos">{() => <ProtectedRoute module="dashboard" component={TodosPage} />}</Route>
      <Route path="/expiry-reminders">{() => <ProtectedRoute module="customers" component={ExpiryRemindersPage} />}</Route>
      <Route path="/new-connections">{() => <ProtectedRoute module="customers" component={NewConnectionsPage} />}</Route>
      <Route path="/connection-slip/:id">{() => <ProtectedRoute module="customers" component={ConnectionRegistrationSlipPage} />}</Route>
      <Route path="/employees">{() => <ProtectedRoute module="employees" component={EmployeesPage} />}</Route>
      <Route path="/employees/new">{() => <ProtectedRoute module="employees" component={EmployeeFormPage} />}</Route>
      <Route path="/employees/:id/edit">{() => <ProtectedRoute module="employees" component={EmployeeFormPage} />}</Route>
      <Route path="/employees/:id">{() => <ProtectedRoute module="employees" component={EmployeeDetailPage} />}</Route>
      <Route path="/departments">{() => <ProtectedRoute module="departments" component={DepartmentsPage} />}</Route>
      <Route path="/attendance">{() => <ProtectedRoute module="attendance" component={AttendancePage} />}</Route>
      <Route path="/duty-chart">{() => <ProtectedRoute module="duty_chart" component={DutyChartPage} />}</Route>
      <Route path="/employee-salaries">{() => <ProtectedRoute module="payroll" component={EmployeeSalariesPage} />}</Route>
      <Route path="/salary-slip">{() => <ProtectedRoute module="payroll" component={SalarySlipPage} />}</Route>
      <Route path="/leave-management">{() => <ProtectedRoute module="leave" component={LeaveManagementPage} />}</Route>
      <Route path="/performance">{() => <ProtectedRoute module="performance" component={PerformancePage} />}</Route>
      <Route path="/policies">{() => <ProtectedRoute module="policies" component={PoliciesPage} />}</Route>
      <Route path="/audit-logs">{() => <ProtectedRoute module="audit_logs" component={AuditLogsPage} />}</Route>
      <Route path="/system-config">{() => <ProtectedRoute module="system_config" component={SystemConfigPage} />}</Route>
      <Route path="/accounts/chart">{() => <ProtectedRoute module="accounts" component={ChartOfAccountsPage} />}</Route>
      <Route path="/accounts/journal">{() => <ProtectedRoute module="accounts" component={JournalEntriesPage} />}</Route>
      <Route path="/accounts/expenses">{() => <ProtectedRoute module="accounts" component={ExpensesPage} />}</Route>
      <Route path="/accounts/vendors">{() => <ProtectedRoute module="accounts" component={VendorsPage} />}</Route>
      <Route path="/accounts/ledger">{() => <ProtectedRoute module="accounts" component={CustomerLedgerPage} />}</Route>
      <Route path="/accounts/reports">{() => <ProtectedRoute module="accounts" component={ReportsPage} />}</Route>
      <Route path="/accounts/daily-sheet">{() => <ProtectedRoute module="accounts" component={DailyEntriesPage} />}</Route>
      <Route path="/accounts/month-closing">{() => <ProtectedRoute module="accounts" component={MonthClosingPage} />}</Route>
      <Route path="/accounts/receivables">{() => <ProtectedRoute module="accounts" component={ReceivablesPage} />}</Route>
      <Route path="/stock/items">{() => <ProtectedRoute module="inventory" component={StockItemsPage} />}</Route>
      <Route path="/stock/issues">{() => <ProtectedRoute module="inventory" component={StockIssuesPage} />}</Route>
      <Route path="/stock/returns">{() => <ProtectedRoute module="inventory" component={StockReturnsPage} />}</Route>
      <Route path="/stock/damages">{() => <ProtectedRoute module="inventory" component={StockDamagesPage} />}</Route>
      <Route path="/users">{() => <ProtectedRoute module="user_management" component={UserManagementPage} />}</Route>
      <Route path="/network-infrastructure">{() => <ProtectedRoute module="settings" component={NetworkInfrastructurePage} />}</Route>
      <Route path="/nbb-portal">{() => <ProtectedRoute module="settings" component={NbbPortalPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute module="settings" component={SettingsPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-3 py-2 md:px-4 border-b sticky top-0 z-50 bg-background/95 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm font-medium text-foreground hidden md:inline truncate" data-testid="text-current-user">
                {user.fullName || user.username}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <Button size="icon" variant="ghost" onClick={logout} title="Logout" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Switch>
              <Route path="/feedback/:token" component={PublicFeedbackPage} />
              <Route path="/connection-feedback/:token" component={PublicConnectionFeedbackPage} />
              <Route path="/agent-portal" component={AgentPortalPage} />
              <Route>
                {() => <AuthenticatedApp />}
              </Route>
            </Switch>
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
