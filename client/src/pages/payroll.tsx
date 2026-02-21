import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  SalaryStructure,
  PayrollRun,
  PayslipWithEmployee,
  Employee,
} from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Plus,
  Loader2,
  Save,
  Eye,
  ArrowLeft,
  FileText,
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

function getPayrollStatusClass(status: string): string {
  switch (status) {
    case "draft":
      return "bg-gray-500 text-white";
    case "processed":
      return "bg-blue-600 text-white";
    case "paid":
      return "bg-green-600 text-white";
    default:
      return "";
  }
}

function SalaryStructureTab() {
  const { toast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [form, setForm] = useState({
    basicSalary: 0,
    houseAllowance: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    otherAllowances: 0,
    taxDeduction: 0,
    pfDeduction: 0,
    otherDeductions: 0,
    effectiveFrom: new Date().toISOString().split("T")[0],
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const activeEmployees = employees.filter((e: any) => e.status === "active");

  const { data: salaryStructure, isLoading: loadingStructure } = useQuery<SalaryStructure>({
    queryKey: ["/api/salary-structures/employee", selectedEmployeeId],
    enabled: !!selectedEmployeeId,
  });

  const grossSalary = form.basicSalary + form.houseAllowance + form.transportAllowance + form.medicalAllowance + form.otherAllowances;
  const totalDeductions = form.taxDeduction + form.pfDeduction + form.otherDeductions;
  const netSalary = grossSalary - totalDeductions;

  function loadStructureIntoForm(s: SalaryStructure) {
    setForm({
      basicSalary: s.basicSalary,
      houseAllowance: s.houseAllowance,
      transportAllowance: s.transportAllowance,
      medicalAllowance: s.medicalAllowance,
      otherAllowances: s.otherAllowances,
      taxDeduction: s.taxDeduction,
      pfDeduction: s.pfDeduction,
      otherDeductions: s.otherDeductions,
      effectiveFrom: s.effectiveFrom,
    });
  }

  const prevStructureRef = useState<number | null>(null);
  if (salaryStructure && salaryStructure.id !== prevStructureRef[0]) {
    prevStructureRef[1](salaryStructure.id);
    loadStructureIntoForm(salaryStructure);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeId: Number(selectedEmployeeId),
        ...form,
        grossSalary,
        netSalary,
      };
      if (salaryStructure) {
        const res = await apiRequest("PATCH", `/api/salary-structures/${salaryStructure.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/salary-structures", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-structures/employee", selectedEmployeeId] });
      toast({ title: "Salary Structure Saved", description: "Salary structure has been saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function handleEmployeeChange(val: string) {
    setSelectedEmployeeId(val);
    prevStructureRef[1](null);
    setForm({
      basicSalary: 0,
      houseAllowance: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      otherAllowances: 0,
      taxDeduction: 0,
      pfDeduction: 0,
      otherDeductions: 0,
      effectiveFrom: new Date().toISOString().split("T")[0],
    });
  }

  function updateField(field: keyof typeof form, value: string) {
    if (field === "effectiveFrom") {
      setForm((prev) => ({ ...prev, [field]: value }));
    } else {
      setForm((prev) => ({ ...prev, [field]: Number(value) || 0 }));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Salary Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger data-testid="select-employee-salary">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <SelectItem value="__loading" disabled>Loading...</SelectItem>
                ) : (
                  activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-employee-${emp.id}`}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeId && (
            <>
              {loadingStructure ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading salary structure...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label>Basic Salary</Label>
                      <Input
                        type="number"
                        value={form.basicSalary}
                        onChange={(e) => updateField("basicSalary", e.target.value)}
                        data-testid="input-basic-salary"
                      />
                    </div>
                    <div>
                      <Label>House Allowance</Label>
                      <Input
                        type="number"
                        value={form.houseAllowance}
                        onChange={(e) => updateField("houseAllowance", e.target.value)}
                        data-testid="input-house-allowance"
                      />
                    </div>
                    <div>
                      <Label>Transport Allowance</Label>
                      <Input
                        type="number"
                        value={form.transportAllowance}
                        onChange={(e) => updateField("transportAllowance", e.target.value)}
                        data-testid="input-transport-allowance"
                      />
                    </div>
                    <div>
                      <Label>Medical Allowance</Label>
                      <Input
                        type="number"
                        value={form.medicalAllowance}
                        onChange={(e) => updateField("medicalAllowance", e.target.value)}
                        data-testid="input-medical-allowance"
                      />
                    </div>
                    <div>
                      <Label>Other Allowances</Label>
                      <Input
                        type="number"
                        value={form.otherAllowances}
                        onChange={(e) => updateField("otherAllowances", e.target.value)}
                        data-testid="input-other-allowances"
                      />
                    </div>
                    <div>
                      <Label>Tax Deduction</Label>
                      <Input
                        type="number"
                        value={form.taxDeduction}
                        onChange={(e) => updateField("taxDeduction", e.target.value)}
                        data-testid="input-tax-deduction"
                      />
                    </div>
                    <div>
                      <Label>PF Deduction</Label>
                      <Input
                        type="number"
                        value={form.pfDeduction}
                        onChange={(e) => updateField("pfDeduction", e.target.value)}
                        data-testid="input-pf-deduction"
                      />
                    </div>
                    <div>
                      <Label>Other Deductions</Label>
                      <Input
                        type="number"
                        value={form.otherDeductions}
                        onChange={(e) => updateField("otherDeductions", e.target.value)}
                        data-testid="input-other-deductions"
                      />
                    </div>
                    <div>
                      <Label>Effective From</Label>
                      <Input
                        type="date"
                        value={form.effectiveFrom}
                        onChange={(e) => updateField("effectiveFrom", e.target.value)}
                        data-testid="input-effective-from"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                    <div>
                      <Label className="text-muted-foreground">Gross Salary</Label>
                      <div className="text-xl font-bold" data-testid="text-gross-salary">{formatRs(grossSalary)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Net Salary</Label>
                      <div className="text-xl font-bold" data-testid="text-net-salary">{formatRs(netSalary)}</div>
                    </div>
                  </div>

                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-salary"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Salary Structure
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollRunsTab() {
  const { toast } = useToast();
  const [viewingRunId, setViewingRunId] = useState<number | null>(null);
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState(MONTHS[new Date().getMonth()]);
  const [newRunYear, setNewRunYear] = useState(new Date().getFullYear());

  const { data: payrollRuns = [], isLoading: loadingRuns } = useQuery<PayrollRun[]>({
    queryKey: ["/api/payroll"],
  });

  const createRunMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payroll", {
        month: newRunMonth,
        year: newRunYear,
        status: "draft",
        totalAmount: 0,
        employeeCount: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      setNewRunOpen(false);
      toast({ title: "Payroll Run Created", description: `Payroll run for ${newRunMonth} ${newRunYear} created.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (viewingRunId !== null) {
    const run = payrollRuns.find((r) => r.id === viewingRunId);
    return (
      <PayslipsView
        runId={viewingRunId}
        runLabel={run ? `${run.month} ${run.year}` : ""}
        onBack={() => setViewingRunId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Payroll Runs
          </CardTitle>
          <Dialog open={newRunOpen} onOpenChange={setNewRunOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-payroll-run">
                <Plus className="h-4 w-4 mr-1" />
                New Payroll Run
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Payroll Run</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Month</Label>
                  <Select value={newRunMonth} onValueChange={setNewRunMonth}>
                    <SelectTrigger data-testid="select-payroll-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m} value={m} data-testid={`option-month-${m}`}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newRunYear}
                    onChange={(e) => setNewRunYear(Number(e.target.value))}
                    data-testid="input-payroll-year"
                  />
                </div>
                <Button
                  onClick={() => createRunMutation.mutate()}
                  disabled={createRunMutation.isPending}
                  className="w-full"
                  data-testid="button-create-payroll-run"
                >
                  {createRunMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create Payroll Run
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRuns ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading payroll runs...
            </div>
          ) : payrollRuns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-payroll-runs">
              No payroll runs found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Month</th>
                    <th className="text-left px-4 py-3">Year</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Total Amount (Rs.)</th>
                    <th className="text-left px-4 py-3">Employee Count</th>
                    <th className="text-left px-4 py-3">Processed Date</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run) => (
                    <tr key={run.id} className="border-b" data-testid={`row-payroll-run-${run.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-run-month-${run.id}`}>{run.month}</td>
                      <td className="px-4 py-2" data-testid={`text-run-year-${run.id}`}>{run.year}</td>
                      <td className="px-4 py-2">
                        <Badge
                          className={`no-default-hover-elevate no-default-active-elevate ${getPayrollStatusClass(run.status)}`}
                          data-testid={`badge-run-status-${run.id}`}
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2" data-testid={`text-run-total-${run.id}`}>{formatRs(run.totalAmount)}</td>
                      <td className="px-4 py-2" data-testid={`text-run-count-${run.id}`}>{run.employeeCount}</td>
                      <td className="px-4 py-2 text-muted-foreground" data-testid={`text-run-date-${run.id}`}>
                        {run.processedAt ? new Date(run.processedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingRunId(run.id)}
                          data-testid={`button-view-payslips-${run.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Payslips
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PayslipsView({ runId, runLabel, onBack }: { runId: number; runLabel: string; onBack: () => void }) {
  const { toast } = useToast();

  const { data: payslips = [], isLoading: loadingPayslips } = useQuery<PayslipWithEmployee[]>({
    queryKey: ["/api/payroll", runId, "payslips"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payslips", { payrollRunId: runId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll", runId, "payslips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payslips Generated", description: "Payslips have been generated for all active employees." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back-to-runs">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Payroll Runs
        </Button>
        <span className="text-muted-foreground">Payslips for {runLabel}</span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Payslips
          </CardTitle>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-payslips"
          >
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Generate Payslips
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingPayslips ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading payslips...
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-payslips">
              No payslips generated yet. Click "Generate Payslips" to create them.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-left px-4 py-3">Basic Salary</th>
                    <th className="text-left px-4 py-3">Allowances</th>
                    <th className="text-left px-4 py-3">Deductions</th>
                    <th className="text-left px-4 py-3">Gross</th>
                    <th className="text-left px-4 py-3">Net Salary</th>
                    <th className="text-left px-4 py-3">Working</th>
                    <th className="text-left px-4 py-3">Present</th>
                    <th className="text-left px-4 py-3">Absent</th>
                    <th className="text-left px-4 py-3">Leave</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((slip) => (
                    <tr key={slip.id} className="border-b" data-testid={`row-payslip-${slip.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-payslip-employee-${slip.id}`}>
                        {slip.employee?.firstName} {slip.employee?.lastName}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-payslip-basic-${slip.id}`}>{formatRs(slip.basicSalary)}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-allowances-${slip.id}`}>{formatRs(slip.totalAllowances)}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-deductions-${slip.id}`}>{formatRs(slip.totalDeductions)}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-gross-${slip.id}`}>{formatRs(slip.grossSalary)}</td>
                      <td className="px-4 py-2 font-medium" data-testid={`text-payslip-net-${slip.id}`}>{formatRs(slip.netSalary)}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-working-${slip.id}`}>{slip.workingDays}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-present-${slip.id}`}>{slip.presentDays}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-absent-${slip.id}`}>{slip.absentDays}</td>
                      <td className="px-4 py-2" data-testid={`text-payslip-leave-${slip.id}`}>{slip.leaveDays}</td>
                      <td className="px-4 py-2">
                        <Badge
                          className={`no-default-hover-elevate no-default-active-elevate ${getPayrollStatusClass(slip.status)}`}
                          data-testid={`badge-payslip-status-${slip.id}`}
                        >
                          {slip.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PayrollPage() {
  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Payroll Management</h1>
      </div>

      <Tabs defaultValue="salary-structure">
        <TabsList data-testid="tabs-payroll">
          <TabsTrigger value="salary-structure" data-testid="tab-salary-structure">Salary Structure</TabsTrigger>
          <TabsTrigger value="payroll-runs" data-testid="tab-payroll-runs">Payroll Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="salary-structure" className="mt-4">
          <SalaryStructureTab />
        </TabsContent>
        <TabsContent value="payroll-runs" className="mt-4">
          <PayrollRunsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
