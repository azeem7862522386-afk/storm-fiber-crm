import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  DollarSign,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Users,
  Banknote,
  ArrowDownCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Wallet,
  CalendarDays,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { Employee, SalaryStructure } from "@shared/schema";

type EmployeeWithDept = Employee & {
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string } | null;
};

type SalaryAdvanceWithEmployee = {
  id: number;
  employeeId: number;
  amount: number;
  advanceDate: string;
  month: string;
  description: string | null;
  status: string;
  approvedBy: string | null;
  createdAt: string;
  employee: { firstName: string; lastName: string; employeeCode: string };
};

type EmployeeCommissionWithEmployee = {
  id: number;
  employeeId: number;
  commissionName: string;
  amount: number;
  month: string;
  description: string | null;
  createdAt: string;
  employee: { firstName: string; lastName: string; employeeCode: string };
};

type AttendanceDeduction = {
  employeeId: number;
  totalFines: number;
  absentDays: number;
  lateDays: number;
  totalOvertimeReward: number;
};

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EmployeeSalariesPage() {
  const { toast } = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [advanceDescription, setAdvanceDescription] = useState("");
  const [advanceApprovedBy, setAdvanceApprovedBy] = useState("");
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [commissionEmployeeId, setCommissionEmployeeId] = useState("");
  const [commissionName, setCommissionName] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [commissionDescription, setCommissionDescription] = useState("");

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  })();

  const prevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const { data: employees = [], isLoading: empLoading } = useQuery<EmployeeWithDept[]>({
    queryKey: ["/api/employees"],
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  const { data: advances = [], isLoading: advLoading } = useQuery<SalaryAdvanceWithEmployee[]>({
    queryKey: ["/api/salary-advances", `?month=${selectedMonth}`],
    queryFn: async () => {
      const res = await fetch(`/api/salary-advances?month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: salaryStructures = [] } = useQuery<SalaryStructure[]>({
    queryKey: ["/api/salary-structures-all"],
    queryFn: async () => {
      const structs: SalaryStructure[] = [];
      for (const emp of activeEmployees) {
        try {
          const res = await fetch(`/api/salary-structures/employee/${emp.id}`, { credentials: "include" });
          if (res.ok) {
            const s = await res.json();
            structs.push(s);
          }
        } catch {}
      }
      return structs;
    },
    enabled: activeEmployees.length > 0,
  });

  const [parsedYear, parsedMonth] = selectedMonth.split("-").map(Number);

  const { data: attendanceDeductions = [] } = useQuery<AttendanceDeduction[]>({
    queryKey: ["/api/attendance/monthly-deductions", parsedMonth, parsedYear],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/monthly-deductions?month=${parsedMonth}&year=${parsedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance deductions");
      return res.json();
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/salary-advances", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances"] });
      toast({ title: "Advance recorded successfully" });
      resetAdvanceForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/salary-advances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary-advances"] });
      toast({ title: "Advance removed" });
    },
  });

  const { data: commissions = [], isLoading: commLoading } = useQuery<EmployeeCommissionWithEmployee[]>({
    queryKey: ["/api/employee-commissions", `?month=${selectedMonth}`],
    queryFn: async () => {
      const res = await fetch(`/api/employee-commissions?month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createCommissionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/employee-commissions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-commissions"] });
      toast({ title: "Commission added successfully" });
      resetCommissionForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCommissionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employee-commissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-commissions"] });
      toast({ title: "Commission removed" });
    },
  });

  const resetCommissionForm = () => {
    setCommissionEmployeeId("");
    setCommissionName("");
    setCommissionAmount("");
    setCommissionDescription("");
    setShowCommissionDialog(false);
  };

  const handleAddCommission = () => {
    if (!commissionEmployeeId) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }
    if (!commissionName.trim()) {
      toast({ title: "Enter commission name", variant: "destructive" });
      return;
    }
    if (!commissionAmount || parseInt(commissionAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    createCommissionMutation.mutate({
      employeeId: parseInt(commissionEmployeeId),
      commissionName: commissionName.trim(),
      amount: parseInt(commissionAmount),
      month: selectedMonth,
      description: commissionDescription.trim() || null,
    });
  };

  const getCommissionsForEmployee = (empId: number) => {
    return commissions.filter(c => c.employeeId === empId);
  };

  const getTotalCommissions = (empId: number) => {
    return getCommissionsForEmployee(empId).reduce((sum, c) => sum + c.amount, 0);
  };

  const resetAdvanceForm = () => {
    setAdvanceEmployeeId("");
    setAdvanceAmount("");
    setAdvanceDate(new Date().toISOString().split("T")[0]);
    setAdvanceDescription("");
    setAdvanceApprovedBy("");
    setShowAdvanceDialog(false);
  };

  const handleAddAdvance = () => {
    if (!advanceEmployeeId) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }
    if (!advanceAmount || parseInt(advanceAmount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!advanceDate) {
      toast({ title: "Select advance date", variant: "destructive" });
      return;
    }
    createAdvanceMutation.mutate({
      employeeId: parseInt(advanceEmployeeId),
      amount: parseInt(advanceAmount),
      advanceDate,
      month: selectedMonth,
      description: advanceDescription.trim() || null,
      approvedBy: advanceApprovedBy.trim() || null,
      status: "approved",
    });
  };

  const getSalaryForEmployee = (empId: number) => {
    const structure = salaryStructures.find(s => s.employeeId === empId);
    const emp = activeEmployees.find(e => e.id === empId);
    if (structure) {
      return { basic: structure.basicSalary, gross: structure.grossSalary, net: structure.netSalary };
    }
    return { basic: emp?.basicSalary || 0, gross: emp?.basicSalary || 0, net: emp?.basicSalary || 0 };
  };

  const getAdvancesForEmployee = (empId: number) => {
    return advances.filter(a => a.employeeId === empId && a.status !== "cancelled");
  };

  const getTotalAdvances = (empId: number) => {
    return getAdvancesForEmployee(empId).reduce((sum, a) => sum + a.amount, 0);
  };

  const getAttendanceDeduction = (empId: number) => {
    return attendanceDeductions.find(d => d.employeeId === empId) || { totalFines: 0, absentDays: 0, lateDays: 0, totalOvertimeReward: 0 };
  };

  const summaryData = activeEmployees.map(emp => {
    const salary = getSalaryForEmployee(emp.id);
    const totalAdv = getTotalAdvances(emp.id);
    const totalComm = getTotalCommissions(emp.id);
    const attDed = getAttendanceDeduction(emp.id);
    const perDaySalary = Math.round(salary.net / 30);
    const absentDeduction = attDed.absentDays * perDaySalary;
    const lateFines = attDed.totalFines;
    const overtimeReward = attDed.totalOvertimeReward || 0;
    const totalDeductions = totalAdv + lateFines + absentDeduction;
    const netPayable = salary.net - totalDeductions + overtimeReward + totalComm;
    return {
      employee: emp,
      basicSalary: salary.basic,
      grossSalary: salary.gross,
      netSalary: salary.net,
      totalAdvances: totalAdv,
      totalCommissions: totalComm,
      lateFines,
      lateDays: attDed.lateDays,
      absentDays: attDed.absentDays,
      absentDeduction,
      overtimeReward,
      perDaySalary,
      totalDeductions,
      netPayable,
      advanceCount: getAdvancesForEmployee(emp.id).length,
    };
  });

  const grandTotalSalary = summaryData.reduce((s, r) => s + r.netSalary, 0);
  const grandTotalAdvances = summaryData.reduce((s, r) => s + r.totalAdvances, 0);
  const grandTotalCommissions = summaryData.reduce((s, r) => s + r.totalCommissions, 0);
  const grandTotalLateFines = summaryData.reduce((s, r) => s + r.lateFines, 0);
  const grandTotalAbsentDed = summaryData.reduce((s, r) => s + r.absentDeduction, 0);
  const grandTotalOTReward = summaryData.reduce((s, r) => s + r.overtimeReward, 0);
  const grandTotalPayable = summaryData.reduce((s, r) => s + r.netPayable, 0);
  const grandTotalDeductions = grandTotalAdvances + grandTotalLateFines + grandTotalAbsentDed;

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [
      [`Employee Salaries - ${monthLabel}`],
      [],
      ["#", "Employee Code", "Employee Name", "Department", "Basic Salary", "Net Salary", "Advances", "Late Fines", "Absent Days", "Absent Deduction", "OT Reward", "Commission", "Net Payable"],
    ];
    summaryData.forEach((r, idx) => {
      rows.push([
        idx + 1,
        r.employee.employeeCode,
        `${r.employee.firstName} ${r.employee.lastName}`,
        r.employee.department?.name || "-",
        r.basicSalary,
        r.netSalary,
        r.totalAdvances,
        r.lateFines,
        r.absentDays,
        r.absentDeduction,
        r.overtimeReward,
        r.totalCommissions,
        r.netPayable,
      ]);
    });
    rows.push(["", "", "", "TOTALS", "", grandTotalSalary, grandTotalAdvances, grandTotalLateFines, "", grandTotalAbsentDed, grandTotalOTReward, grandTotalCommissions, grandTotalPayable]);

    if (advances.length > 0) {
      rows.push([]);
      rows.push(["ADVANCE DETAILS"]);
      rows.push(["#", "Employee", "Amount", "Date", "Description", "Status", "Approved By"]);
      advances.forEach((a, idx) => {
        rows.push([
          idx + 1,
          `${a.employee.firstName} ${a.employee.lastName}`,
          a.amount,
          a.advanceDate,
          a.description || "-",
          a.status,
          a.approvedBy || "-",
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 4 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Salaries");
    XLSX.writeFile(wb, `Employee_Salaries_${selectedMonth}.xlsx`);
  };

  const isLoading = empLoading || advLoading || commLoading;

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-auto h-full">

      <div className="print:hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Employee Salaries</h1>
                <p className="text-white/70 text-sm">Manage payroll, advances & commissions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-1">
                <Button size="icon" variant="ghost" onClick={prevMonth} className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-2">
                  <CalendarDays className="h-3.5 w-3.5 text-white/70" />
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-36 sm:w-44 h-8 text-sm bg-transparent border-none text-white placeholder:text-white/50 focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={nextMonth} className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={() => setShowAdvanceDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Advance</span>
                </Button>
                <Button size="sm" onClick={() => setShowCommissionDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Award className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Commission</span>
                </Button>
                <Button size="sm" onClick={handleDownloadExcel} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Download className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 print:hidden">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Active Employees</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{activeEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Salary</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 truncate">{formatRs(grandTotalSalary)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Deductions</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 truncate">-{formatRs(grandTotalDeductions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Net Payable</p>
                <p className="text-lg font-bold text-violet-700 dark:text-violet-400 truncate">{formatRs(grandTotalPayable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 print:hidden">
        <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/40">
            <ArrowDownCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Advances</p>
            <p className="text-sm font-bold text-red-600 truncate">{formatRs(grandTotalAdvances)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40">
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Late Fines</p>
            <p className="text-sm font-bold text-amber-600 truncate">{formatRs(grandTotalLateFines)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/40">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Absent Ded.</p>
            <p className="text-sm font-bold text-orange-600 truncate">{formatRs(grandTotalAbsentDed)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">OT Reward</p>
            <p className="text-sm font-bold text-emerald-600 truncate">+{formatRs(grandTotalOTReward)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40">
            <Award className="h-4 w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Commission</p>
            <p className="text-sm font-bold text-blue-600 truncate">+{formatRs(grandTotalCommissions)}</p>
          </div>
        </div>
      </div>

      <Card className="print:hidden border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 px-4 md:px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-slate-300" />
            <h2 className="text-sm font-semibold text-white">{monthLabel} - Salary Summary</h2>
          </div>
          <Badge variant="secondary" className="bg-white/15 text-white border-0 text-xs">
            {summaryData.length} employees
          </Badge>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                  <th className="text-left p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-10">#</th>
                  <th className="text-left p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Code</th>
                  <th className="text-left p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Employee</th>
                  <th className="text-left p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Dept</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Net Salary</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Advances</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Late Fines</th>
                  <th className="text-center p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Absent</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Absent Ded.</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">OT</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Commission</th>
                  <th className="text-right p-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={12} className="p-3">
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-medium">No active employees found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row, idx) => (
                    <tr key={row.employee.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="p-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {row.employee.employeeCode}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-foreground">
                          {row.employee.firstName} {row.employee.lastName}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {row.employee.department?.name || "-"}
                      </td>
                      <td className="p-3 text-right font-semibold">{formatRs(row.netSalary)}</td>
                      <td className="p-3 text-right">
                        {row.totalAdvances > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                            -{formatRs(row.totalAdvances)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {row.lateFines > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                            -{formatRs(row.lateFines)}
                            <span className="text-[10px] text-amber-500">({row.lateDays}d)</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {row.absentDays > 0 ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs font-semibold dark:bg-red-950/50 dark:text-red-400">{row.absentDays} days</Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">0</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {row.absentDeduction > 0 ? (
                          <span className="inline-flex items-center text-orange-600 font-semibold text-xs bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">
                            -{formatRs(row.absentDeduction)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {row.overtimeReward > 0 ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                            +{formatRs(row.overtimeReward)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {row.totalCommissions > 0 ? (
                          <span className="inline-flex items-center text-blue-600 font-semibold text-xs bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                            +{formatRs(row.totalCommissions)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold text-sm ${row.netPayable < 0 ? "text-red-600" : "text-foreground"}`}>
                          {formatRs(row.netPayable)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summaryData.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={4} className="p-3 font-bold text-sm">
                      TOTAL <span className="text-muted-foreground font-normal text-xs ml-1">({summaryData.length} employees)</span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{formatRs(grandTotalSalary)}</td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">
                      {grandTotalAdvances > 0 ? `-${formatRs(grandTotalAdvances)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                      {grandTotalLateFines > 0 ? `-${formatRs(grandTotalLateFines)}` : "-"}
                    </td>
                    <td className="p-3 text-center"></td>
                    <td className="p-3 text-right font-bold text-orange-600 dark:text-orange-400">
                      {grandTotalAbsentDed > 0 ? `-${formatRs(grandTotalAbsentDed)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {grandTotalOTReward > 0 ? `+${formatRs(grandTotalOTReward)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {grandTotalCommissions > 0 ? `+${formatRs(grandTotalCommissions)}` : "-"}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-base font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                        {formatRs(grandTotalPayable)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print:hidden">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-white/80" />
              <h2 className="text-sm font-semibold text-white">Advance Records</h2>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">{monthLabel}</Badge>
            </div>
            <Button size="sm" onClick={() => setShowAdvanceDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-8">#</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Employee</th>
                    <th className="text-right p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Note</th>
                    <th className="text-center p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="w-8 p-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {advLoading ? (
                    <tr><td colSpan={7} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ) : advances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ArrowDownCircle className="h-8 w-8 text-muted-foreground/20" />
                          <p className="text-muted-foreground text-xs">No advances for {monthLabel}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    advances.map((adv, idx) => (
                      <tr key={adv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{adv.employee.firstName} {adv.employee.lastName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{adv.employee.employeeCode}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <span className="font-bold text-red-600 text-xs">{formatRs(adv.amount)}</span>
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground">
                          {new Date(adv.advanceDate + "T00:00:00").toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short",
                          })}
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-[120px] truncate">{adv.description || "-"}</td>
                        <td className="p-2.5 text-center">
                          <Badge className={`text-[10px] border-0 ${
                            adv.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                            adv.status === "deducted" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                            "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                          }`}>
                            {adv.status}
                          </Badge>
                        </td>
                        <td className="p-1 text-center">
                          {adv.status !== "deducted" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => deleteAdvanceMutation.mutate(adv.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-400 hover:text-red-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {advances.length > 0 && (
                  <tfoot>
                    <tr className="bg-red-50/50 dark:bg-red-950/20 border-t-2 border-red-200 dark:border-red-800">
                      <td colSpan={2} className="p-2.5 text-xs font-bold">TOTAL ({advances.length})</td>
                      <td className="p-2.5 text-right text-xs font-bold text-red-600">
                        {formatRs(advances.filter(a => a.status !== "cancelled").reduce((s, a) => s + a.amount, 0))}
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-white/80" />
              <h2 className="text-sm font-semibold text-white">Commission Records</h2>
              <Badge className="bg-white/20 text-white border-0 text-[10px]">{monthLabel}</Badge>
            </div>
            <Button size="sm" onClick={() => setShowCommissionDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-8">#</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Employee</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Name</th>
                    <th className="text-right p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Amount</th>
                    <th className="text-left p-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Note</th>
                    <th className="w-8 p-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {commLoading ? (
                    <tr><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>
                  ) : commissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Award className="h-8 w-8 text-muted-foreground/20" />
                          <p className="text-muted-foreground text-xs">No commissions for {monthLabel}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    commissions.map((comm, idx) => (
                      <tr key={comm.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{comm.employee.firstName} {comm.employee.lastName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{comm.employee.employeeCode}</span>
                          </div>
                        </td>
                        <td className="p-2.5 font-medium text-xs">{comm.commissionName}</td>
                        <td className="p-2.5 text-right">
                          <span className="font-bold text-blue-600 text-xs">{formatRs(comm.amount)}</span>
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground hidden md:table-cell max-w-[120px] truncate">{comm.description || "-"}</td>
                        <td className="p-1 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => deleteCommissionMutation.mutate(comm.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-400 hover:text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {commissions.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50/50 dark:bg-blue-950/20 border-t-2 border-blue-200 dark:border-blue-800">
                      <td colSpan={3} className="p-2.5 text-xs font-bold">TOTAL ({commissions.length})</td>
                      <td className="p-2.5 text-right text-xs font-bold text-blue-600">
                        {formatRs(commissions.reduce((s, c) => s + c.amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="text-center mb-4">
          <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="mx-auto mb-2" style={{ maxWidth: "200px" }} />
          <p style={{ fontSize: "10px", color: "#666" }}>
            Basement Soneri Bank, Alama Iqbal Road, Pattoki
          </p>
        </div>

        <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>EMPLOYEE SALARIES - {monthLabel}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Month:</strong> {monthLabel}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>#</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Employee Code</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Name</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Department</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Basic</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Net Salary</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Advances</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Late Fines</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "center", background: "#f8f8f8" }}>Absent Days</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Absent Ded.</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>OT Reward</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Commission</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Net Payable</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, idx) => (
              <tr key={row.employee.id}>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{idx + 1}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", fontFamily: "monospace" }}>{row.employee.employeeCode}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{row.employee.firstName} {row.employee.lastName}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{row.employee.department?.name || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(row.basicSalary)}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(row.netSalary)}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.totalAdvances > 0 ? formatRs(row.totalAdvances) : "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.lateFines > 0 ? formatRs(row.lateFines) : "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center" }}>{row.absentDays > 0 ? row.absentDays : "0"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.absentDeduction > 0 ? formatRs(row.absentDeduction) : "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right", color: "#16a34a" }}>{row.overtimeReward > 0 ? `+${formatRs(row.overtimeReward)}` : "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right", color: "#2563eb" }}>{row.totalCommissions > 0 ? `+${formatRs(row.totalCommissions)}` : "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right", fontWeight: "bold" }}>{formatRs(row.netPayable)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>TOTAL ({summaryData.length} Employees)</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}></td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(grandTotalSalary)}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{grandTotalAdvances > 0 ? formatRs(grandTotalAdvances) : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{grandTotalLateFines > 0 ? formatRs(grandTotalLateFines) : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "center" }}></td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{grandTotalAbsentDed > 0 ? formatRs(grandTotalAbsentDed) : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold", color: "#16a34a" }}>{grandTotalOTReward > 0 ? `+${formatRs(grandTotalOTReward)}` : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold", color: "#2563eb" }}>{grandTotalCommissions > 0 ? `+${formatRs(grandTotalCommissions)}` : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>{formatRs(grandTotalPayable)}</td>
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

      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/40">
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              </div>
              Record Salary Advance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={advanceEmployeeId} onValueChange={setAdvanceEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      [{emp.employeeCode}] {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Enter amount"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={advanceDescription}
                onChange={(e) => setAdvanceDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Approved By</Label>
              <Input
                placeholder="Manager name"
                value={advanceApprovedBy}
                onChange={(e) => setAdvanceApprovedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAdvanceForm}>Cancel</Button>
            <Button
              onClick={handleAddAdvance}
              disabled={createAdvanceMutation.isPending}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0"
            >
              {createAdvanceMutation.isPending ? "Saving..." : "Record Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                <Award className="h-4 w-4 text-blue-500" />
              </div>
              Add Commission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={commissionEmployeeId} onValueChange={setCommissionEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      [{emp.employeeCode}] {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission Name *</Label>
                <Input
                  placeholder="e.g. Sales Commission"
                  value={commissionName}
                  onChange={(e) => setCommissionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (Rs.) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Enter amount"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={commissionDescription}
                onChange={(e) => setCommissionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCommissionForm}>Cancel</Button>
            <Button
              onClick={handleAddCommission}
              disabled={createCommissionMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
            >
              {createCommissionMutation.isPending ? "Saving..." : "Add Commission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}