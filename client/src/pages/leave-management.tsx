import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  LeaveRequest,
  LeaveRequestWithEmployee,
  LeaveBalance,
  LeaveTypeConfig,
  Employee,
} from "@shared/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Plus,
  Loader2,
  Check,
  X,
  ChevronDown,
  Settings2,
  Send,
  CalendarCheck,
} from "lucide-react";

const leaveTypeOptions = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "earned", label: "Earned" },
  { value: "unpaid", label: "Unpaid" },
  { value: "maternity", label: "Maternity" },
  { value: "paternity", label: "Paternity" },
];

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-500 text-white";
    case "approved":
      return "bg-green-600 text-white";
    case "rejected":
      return "bg-red-600 text-white";
    case "cancelled":
      return "bg-gray-500 text-white";
    default:
      return "";
  }
}

function getLeaveTypeLabel(type: string): string {
  const opt = leaveTypeOptions.find((o) => o.value === type);
  return opt ? opt.label : type;
}

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (e < s) return 0;
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff;
}

export default function LeaveManagementPage() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [balanceEmployeeId, setBalanceEmployeeId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("all");

  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applyEmployeeId, setApplyEmployeeId] = useState<string>("");
  const [applyLeaveType, setApplyLeaveType] = useState<string>("");
  const [applyStartDate, setApplyStartDate] = useState("");
  const [applyEndDate, setApplyEndDate] = useState("");
  const [applyReason, setApplyReason] = useState("");

  const [configOpen, setConfigOpen] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configName, setConfigName] = useState("");
  const [configType, setConfigType] = useState("");
  const [configDefaultDays, setConfigDefaultDays] = useState("");
  const [configIsActive, setConfigIsActive] = useState(true);

  const applyTotalDays = useMemo(
    () => calculateDays(applyStartDate, applyEndDate),
    [applyStartDate, applyEndDate]
  );

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: leaveBalances = [], isLoading: loadingBalances } = useQuery<LeaveBalance[]>({
    queryKey: ["/api/leave-balances/employee", balanceEmployeeId, { year: currentYear }],
    queryFn: async () => {
      if (!balanceEmployeeId) return [];
      const res = await fetch(`/api/leave-balances/employee/${balanceEmployeeId}?year=${currentYear}`);
      if (!res.ok) throw new Error("Failed to load leave balances");
      return res.json();
    },
    enabled: !!balanceEmployeeId,
  });

  const { data: leaveRequests = [], isLoading: loadingRequests } = useQuery<LeaveRequestWithEmployee[]>({
    queryKey: ["/api/leave-requests", { status: filterStatus, employeeId: filterEmployeeId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterEmployeeId !== "all") params.set("employeeId", filterEmployeeId);
      const res = await fetch(`/api/leave-requests?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load leave requests");
      return res.json();
    },
  });

  const { data: leaveTypeConfigs = [], isLoading: loadingConfigs } = useQuery<LeaveTypeConfig[]>({
    queryKey: ["/api/leave-types"],
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: {
      employeeId: number;
      leaveType: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      reason: string;
      status: string;
    }) => {
      const res = await apiRequest("POST", "/api/leave-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Leave Request Submitted", description: "Your leave request has been submitted successfully." });
      resetApplyForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/leave-requests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Leave Request Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createConfigMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; defaultDays: number; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/leave-types", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-types"] });
      toast({ title: "Leave Type Created" });
      resetConfigForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function resetApplyForm() {
    setShowApplyDialog(false);
    setApplyEmployeeId("");
    setApplyLeaveType("");
    setApplyStartDate("");
    setApplyEndDate("");
    setApplyReason("");
  }

  function resetConfigForm() {
    setShowConfigDialog(false);
    setConfigName("");
    setConfigType("");
    setConfigDefaultDays("");
    setConfigIsActive(true);
  }

  function handleApplySubmit() {
    if (!applyEmployeeId || !applyLeaveType || !applyStartDate || !applyEndDate) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (applyTotalDays <= 0) {
      toast({ title: "Validation Error", description: "End date must be on or after start date.", variant: "destructive" });
      return;
    }
    createRequestMutation.mutate({
      employeeId: Number(applyEmployeeId),
      leaveType: applyLeaveType,
      startDate: applyStartDate,
      endDate: applyEndDate,
      totalDays: applyTotalDays,
      reason: applyReason,
      status: "pending",
    });
  }

  function handleConfigSubmit() {
    if (!configName || !configType || !configDefaultDays) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    createConfigMutation.mutate({
      name: configName,
      type: configType,
      defaultDays: Number(configDefaultDays),
      isActive: configIsActive,
    });
  }

  function handleApprove(id: number) {
    updateRequestMutation.mutate({ id, data: { status: "approved" } });
  }

  function handleReject(id: number) {
    updateRequestMutation.mutate({ id, data: { status: "rejected" } });
  }

  function getEmployeeName(emp: Employee | undefined): string {
    if (!emp) return "Unknown";
    return `${emp.firstName} ${emp.lastName}`;
  }

  const activeEmployees = employees.filter((e) => e.status === "active");

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Leave Management</h1>
        </div>
        <Button onClick={() => setShowApplyDialog(true)} data-testid="button-apply-leave">
          <Plus className="h-4 w-4 mr-1" />
          Apply Leave
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Leave Balance Summary - {currentYear}
            </CardTitle>
            <Select value={balanceEmployeeId} onValueChange={setBalanceEmployeeId}>
              <SelectTrigger className="w-56" data-testid="select-balance-employee">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-balance-emp-${emp.id}`}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!balanceEmployeeId ? (
            <div className="text-center py-6 text-muted-foreground" data-testid="text-select-employee-prompt">
              Select an employee to view leave balances
            </div>
          ) : loadingBalances ? (
            <div className="text-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading balances...
            </div>
          ) : leaveBalances.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground" data-testid="text-no-balances">
              No leave balances found for this employee in {currentYear}.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {leaveBalances.map((bal) => (
                <Card key={bal.id} data-testid={`card-balance-${bal.leaveType}`}>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground mb-1">{getLeaveTypeLabel(bal.leaveType)}</div>
                    <div className="text-lg font-bold" data-testid={`text-remaining-${bal.leaveType}`}>{bal.remainingDays}</div>
                    <div className="text-xs text-muted-foreground">
                      {bal.usedDays} used / {bal.totalDays} total
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Leave Requests</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
                <SelectTrigger className="w-48" data-testid="select-filter-employee">
                  <SelectValue placeholder="Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-filter-emp-${emp.id}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRequests ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading leave requests...
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-requests">
              No leave requests found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-left px-4 py-3">Leave Type</th>
                    <th className="text-left px-4 py-3">Start Date</th>
                    <th className="text-left px-4 py-3">End Date</th>
                    <th className="text-left px-4 py-3">Days</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Reason</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="border-b" data-testid={`row-request-${req.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-request-employee-${req.id}`}>
                        {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : "Unknown"}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-request-type-${req.id}`}>
                        {getLeaveTypeLabel(req.leaveType)}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-request-start-${req.id}`}>
                        {req.startDate}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-request-end-${req.id}`}>
                        {req.endDate}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-request-days-${req.id}`}>
                        {req.totalDays}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={`no-default-hover-elevate no-default-active-elevate ${getStatusBadgeClass(req.status)}`}
                          data-testid={`badge-status-${req.id}`}
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate" data-testid={`text-request-reason-${req.id}`}>
                        {req.reason || "-"}
                      </td>
                      <td className="px-4 py-2">
                        {req.status === "pending" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleApprove(req.id)}
                              disabled={updateRequestMutation.isPending}
                              data-testid={`button-approve-${req.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleReject(req.id)}
                              disabled={updateRequestMutation.isPending}
                              data-testid={`button-reject-${req.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Leave Types Configuration
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${configOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex items-center justify-end mb-3">
                <Button size="sm" onClick={() => setShowConfigDialog(true)} data-testid="button-add-leave-type">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Leave Type
                </Button>
              </div>
              {loadingConfigs ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading configurations...
                </div>
              ) : leaveTypeConfigs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground" data-testid="text-no-configs">
                  No leave types configured.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Name</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-left px-4 py-3">Default Days</th>
                        <th className="text-left px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveTypeConfigs.map((config) => (
                        <tr key={config.id} className="border-b" data-testid={`row-config-${config.id}`}>
                          <td className="px-4 py-2 font-medium" data-testid={`text-config-name-${config.id}`}>
                            {config.name}
                          </td>
                          <td className="px-4 py-2" data-testid={`text-config-type-${config.id}`}>
                            {getLeaveTypeLabel(config.type)}
                          </td>
                          <td className="px-4 py-2" data-testid={`text-config-days-${config.id}`}>
                            {config.defaultDays}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${config.isActive ? "bg-green-600 text-white" : "bg-gray-500 text-white"}`}
                              data-testid={`badge-config-status-${config.id}`}
                            >
                              {config.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={applyEmployeeId} onValueChange={setApplyEmployeeId}>
                <SelectTrigger data-testid="select-apply-employee">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-apply-emp-${emp.id}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={applyLeaveType} onValueChange={setApplyLeaveType}>
                <SelectTrigger data-testid="select-apply-leave-type">
                  <SelectValue placeholder="Select Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-apply-type-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={applyStartDate}
                  onChange={(e) => setApplyStartDate(e.target.value)}
                  data-testid="input-apply-start-date"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={applyEndDate}
                  onChange={(e) => setApplyEndDate(e.target.value)}
                  data-testid="input-apply-end-date"
                />
              </div>
            </div>
            <div>
              <Label>Total Days</Label>
              <Input
                type="number"
                value={applyTotalDays}
                readOnly
                className="bg-muted"
                data-testid="input-apply-total-days"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                placeholder="Reason for leave..."
                data-testid="textarea-apply-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetApplyForm} data-testid="button-cancel-apply">
              Cancel
            </Button>
            <Button
              onClick={handleApplySubmit}
              disabled={createRequestMutation.isPending}
              data-testid="button-submit-apply"
            >
              {createRequestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Leave Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g. Casual Leave"
                data-testid="input-config-name"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={configType} onValueChange={setConfigType}>
                <SelectTrigger data-testid="select-config-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-config-type-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Days</Label>
              <Input
                type="number"
                value={configDefaultDays}
                onChange={(e) => setConfigDefaultDays(e.target.value)}
                placeholder="e.g. 12"
                data-testid="input-config-default-days"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={configIsActive}
                onChange={(e) => setConfigIsActive(e.target.checked)}
                id="config-active"
                data-testid="checkbox-config-active"
              />
              <Label htmlFor="config-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetConfigForm} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button
              onClick={handleConfigSubmit}
              disabled={createConfigMutation.isPending}
              data-testid="button-submit-config"
            >
              {createConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
