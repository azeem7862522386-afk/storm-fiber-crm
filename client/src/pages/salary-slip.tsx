import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Printer,
  User,
  Phone,
  MapPin,
  RotateCcw,
  IdCard,
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  FileText,
  CalendarDays,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Employee, SalaryStructure } from "@shared/schema";

type EmployeeWithDept = Employee & {
  department?: { id: number; name: string } | null;
  designation?: { id: number; name: string } | null;
};

type AttendanceDeduction = {
  employeeId: number;
  totalFines: number;
  absentDays: number;
  lateDays: number;
};

type SalaryAdvanceRecord = {
  id: number;
  employeeId: number;
  amount: number;
  advanceDate: string;
  month: string;
  description: string | null;
  status: string;
};

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CommissionRecord = {
  id: number;
  employeeId: number;
  commissionName: string;
  amount: number;
  month: string;
  description: string | null;
};

function PrintableSalarySlip({
  employee,
  salary,
  advances,
  commissions,
  attendanceDeduction,
  monthLabel,
  isPrintOnly = false,
}: {
  employee: EmployeeWithDept;
  salary: { basic: number; gross: number; net: number; houseAllowance: number; transportAllowance: number; medicalAllowance: number; otherAllowances: number; taxDeduction: number; pfDeduction: number; otherDeductions: number };
  advances: number;
  commissions: CommissionRecord[];
  attendanceDeduction: AttendanceDeduction;
  monthLabel: string;
  isPrintOnly?: boolean;
}) {
  const perDaySalary = Math.round(salary.net / 30);
  const absentDeduction = attendanceDeduction.absentDays * perDaySalary;
  const lateFines = attendanceDeduction.totalFines;
  const overtimeReward = (attendanceDeduction as any).totalOvertimeReward || 0;
  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalDeductions = advances + lateFines + absentDeduction + salary.taxDeduction + salary.pfDeduction + salary.otherDeductions;
  const netPayable = salary.gross - totalDeductions + overtimeReward + totalCommissions;

  return (
    <div className="salary-slip bg-white text-black border border-border rounded-md overflow-visible print:border-none print:rounded-none print:shadow-none print:text-black" style={{ fontFamily: "'Courier New', Courier, monospace", maxWidth: "500px" }}>
      <div className="px-4 pt-4 pb-1 text-center">
        <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="w-full max-w-[240px] mx-auto mb-1" />
        <p className="text-[9px] text-gray-600 print:text-black leading-snug">
          Basement Soneri Bank, Alama Iqbal Road, Pattoki
        </p>
      </div>

      <div className="px-4 py-1">
        <div className="border-t border-b border-gray-400 text-center py-0.5">
          <span className="text-xs font-bold">SALARY SLIP - {monthLabel}</span>
        </div>
      </div>

      <div className="px-4 py-1 text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span>Emp Code : <span className="font-semibold ml-1">{employee.employeeCode}</span></span>
          <span className="text-[10px]">Date: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>
        <div>
          Name : <span className="ml-3 font-semibold uppercase">{employee.firstName} {employee.lastName}</span>
        </div>
        {employee.fatherName && (
          <div>
            Father : <span className="ml-1 uppercase">{employee.fatherName}</span>
          </div>
        )}
        <div>
          Contact : <span className="font-semibold">{employee.contact}</span>
        </div>
        {employee.cnicNumber && (
          <div>
            CNIC : <span className="font-semibold">{employee.cnicNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Dept : <span className="font-semibold">{employee.department?.name || "-"}</span></span>
          <span>Designation : <span className="font-semibold">{employee.designation?.name || "-"}</span></span>
        </div>
        <div>
          Joining : <span className="font-semibold">{formatDate(employee.joiningDate)}</span>
        </div>
      </div>

      <div className="px-4 pt-2 pb-1">
        <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
          <span className="font-semibold">Earnings</span>
          <span className="font-semibold">Amount</span>
        </div>
        <div className="flex justify-between text-[11px] py-0.5">
          <span>Basic Salary</span>
          <span>{formatRs(salary.basic)}</span>
        </div>
        {salary.houseAllowance > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>House Allowance</span>
            <span>{formatRs(salary.houseAllowance)}</span>
          </div>
        )}
        {salary.transportAllowance > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Transport Allowance</span>
            <span>{formatRs(salary.transportAllowance)}</span>
          </div>
        )}
        {salary.medicalAllowance > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Medical Allowance</span>
            <span>{formatRs(salary.medicalAllowance)}</span>
          </div>
        )}
        {salary.otherAllowances > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Other Allowances</span>
            <span>{formatRs(salary.otherAllowances)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] py-0.5 border-t border-gray-300 font-bold">
          <span>Gross Salary</span>
          <span>{formatRs(salary.gross)}</span>
        </div>
      </div>

      <div className="px-4 pt-2 pb-1">
        <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
          <span className="font-semibold">Deductions</span>
          <span className="font-semibold">Amount</span>
        </div>
        {salary.taxDeduction > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Tax Deduction</span>
            <span>{formatRs(salary.taxDeduction)}</span>
          </div>
        )}
        {salary.pfDeduction > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>PF Deduction</span>
            <span>{formatRs(salary.pfDeduction)}</span>
          </div>
        )}
        {salary.otherDeductions > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Other Deductions</span>
            <span>{formatRs(salary.otherDeductions)}</span>
          </div>
        )}
        {advances > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Salary Advance</span>
            <span>{formatRs(advances)}</span>
          </div>
        )}
        {lateFines > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Late Fine ({attendanceDeduction.lateDays} days)</span>
            <span>{formatRs(lateFines)}</span>
          </div>
        )}
        {attendanceDeduction.absentDays > 0 && (
          <div className="flex justify-between text-[11px] py-0.5">
            <span>Absent Deduction ({attendanceDeduction.absentDays} days × {formatRs(perDaySalary)}/day)</span>
            <span>{formatRs(absentDeduction)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] py-0.5 border-t border-gray-300 font-bold">
          <span>Total Deductions</span>
          <span>{formatRs(totalDeductions)}</span>
        </div>
      </div>

      {(overtimeReward > 0 || totalCommissions > 0) && (
        <div className="px-4 py-1">
          <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
            <span className="font-semibold">Additions</span>
            <span className="font-semibold">Amount</span>
          </div>
          {overtimeReward > 0 && (
            <div className="flex justify-between text-[11px] py-0.5" style={{ color: "#16a34a" }}>
              <span>Overtime Reward</span>
              <span>+{formatRs(overtimeReward)}</span>
            </div>
          )}
          {commissions.map((c) => (
            <div key={c.id} className="flex justify-between text-[11px] py-0.5" style={{ color: "#2563eb" }}>
              <span>{c.commissionName}</span>
              <span>+{formatRs(c.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[11px] py-0.5 border-t border-gray-300 font-bold" style={{ color: "#16a34a" }}>
            <span>Total Additions</span>
            <span>+{formatRs(overtimeReward + totalCommissions)}</span>
          </div>
        </div>
      )}

      <div className="px-4 py-2">
        <div className="border-t-2 border-b-2 border-gray-600 py-1.5">
          <div className="flex justify-between text-[12px] font-bold">
            <span>NET PAYABLE</span>
            <span>{formatRs(netPayable)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-1 text-[11px]">
        <div className="border-t border-gray-300 pt-1 space-y-0.5">
          <div className="flex justify-between">
            <span>Working Days:</span>
            <span>{30 - attendanceDeduction.absentDays}</span>
          </div>
          <div className="flex justify-between">
            <span>Absent Days:</span>
            <span>{attendanceDeduction.absentDays}</span>
          </div>
          <div className="flex justify-between">
            <span>Late Days:</span>
            <span>{attendanceDeduction.lateDays}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6 pb-2 text-[11px]">
        <div className="flex justify-between">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-1 w-32">
              <span>Employee Sign</span>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-1 w-32">
              <span>Authorized Sign</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-3 text-center space-y-0.5 text-[11px]">
        <p className="text-[9px] text-gray-500 print:text-black pt-1">This is a computer generated salary slip</p>
        <p className="text-[9px] text-gray-500 print:text-black">Software developed by: Storm Fiber Internet Pattoki</p>
      </div>
    </div>
  );
}

export default function SalarySlipPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  })();

  const [parsedYear, parsedMonth] = selectedMonth.split("-").map(Number);

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
  const selectedEmployee = activeEmployees.find(e => e.id === selectedEmployeeId);

  const { data: salaryStructure } = useQuery<SalaryStructure>({
    queryKey: ["/api/salary-structures/employee", selectedEmployeeId],
    queryFn: async () => {
      const res = await fetch(`/api/salary-structures/employee/${selectedEmployeeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!selectedEmployeeId,
  });

  const { data: advances = [] } = useQuery<SalaryAdvanceRecord[]>({
    queryKey: ["/api/salary-advances", `?month=${selectedMonth}`],
    queryFn: async () => {
      const res = await fetch(`/api/salary-advances?month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: attendanceDeductions = [] } = useQuery<AttendanceDeduction[]>({
    queryKey: ["/api/attendance/monthly-deductions", parsedMonth, parsedYear],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/monthly-deductions?month=${parsedMonth}&year=${parsedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: allCommissions = [] } = useQuery<CommissionRecord[]>({
    queryKey: ["/api/employee-commissions", `?month=${selectedMonth}`],
    queryFn: async () => {
      const res = await fetch(`/api/employee-commissions?month=${selectedMonth}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const getEmployeeCommissions = (): CommissionRecord[] => {
    if (!selectedEmployeeId) return [];
    return allCommissions.filter(c => c.employeeId === selectedEmployeeId);
  };

  const getSalary = () => {
    if (salaryStructure) {
      return {
        basic: salaryStructure.basicSalary,
        gross: salaryStructure.grossSalary,
        net: salaryStructure.netSalary,
        houseAllowance: salaryStructure.houseAllowance,
        transportAllowance: salaryStructure.transportAllowance,
        medicalAllowance: salaryStructure.medicalAllowance,
        otherAllowances: salaryStructure.otherAllowances,
        taxDeduction: salaryStructure.taxDeduction,
        pfDeduction: salaryStructure.pfDeduction,
        otherDeductions: salaryStructure.otherDeductions,
      };
    }
    const basic = selectedEmployee?.basicSalary || 0;
    return { basic, gross: basic, net: basic, houseAllowance: 0, transportAllowance: 0, medicalAllowance: 0, otherAllowances: 0, taxDeduction: 0, pfDeduction: 0, otherDeductions: 0 };
  };

  const getAdvancesTotal = () => {
    if (!selectedEmployeeId) return 0;
    return advances
      .filter(a => a.employeeId === selectedEmployeeId && a.status !== "cancelled")
      .reduce((sum, a) => sum + a.amount, 0);
  };

  const getAttendanceDeduction = (): AttendanceDeduction => {
    if (!selectedEmployeeId) return { employeeId: 0, totalFines: 0, absentDays: 0, lateDays: 0 };
    return attendanceDeductions.find(d => d.employeeId === selectedEmployeeId) || { employeeId: selectedEmployeeId, totalFines: 0, absentDays: 0, lateDays: 0 };
  };

  const filteredEmployees = activeEmployees.filter(e => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    return (
      fullName.includes(term) ||
      e.employeeCode.toLowerCase().includes(term) ||
      e.contact.toLowerCase().includes(term) ||
      (e.cnicNumber && e.cnicNumber.toLowerCase().includes(term))
    );
  });

  const handleSelectEmployee = (emp: EmployeeWithDept) => {
    setSelectedEmployeeId(emp.id);
    setSearchTerm("");
  };

  const sendWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/salary-slip/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employeeId: selectedEmployeeId, month: selectedMonth }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.sent) {
        toast({ title: "WhatsApp Sent", description: "Salary slip details sent to employee via WhatsApp" });
      } else if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
        toast({ title: "WhatsApp Link Opened", description: "Redirecting to WhatsApp with salary details" });
      } else {
        toast({ title: "Sent", description: data.message || "Salary slip details processed" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSendWhatsApp = () => {
    if (!selectedEmployeeId) return;
    sendWhatsAppMutation.mutate();
  };

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const handleReset = () => {
    setSelectedEmployeeId(null);
    setSearchTerm("");
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <div className="p-4 md:p-6 overflow-auto h-full space-y-5">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-slip" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-slip)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Salary Slip</h1>
                <p className="text-white/70 text-sm">Generate employee salary slips</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-xl px-1">
                <Button size="icon" variant="ghost" onClick={prevMonth} className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1.5 px-2">
                  <CalendarDays className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel}</span>
                </div>
                <Button size="icon" variant="ghost" onClick={nextMonth} className="h-8 w-8 text-white hover:bg-white/20 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {selectedEmployee && (
                <>
                  <Button size="sm" onClick={handleReset} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                    <RotateCcw className="mr-2 h-4 w-4" /> New
                  </Button>
                  <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                    <Printer className="mr-2 h-4 w-4" /> Print Slip
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendWhatsApp}
                    disabled={sendWhatsAppMutation.isPending}
                    className="bg-green-600/80 hover:bg-green-600 text-white border-0 backdrop-blur-sm"
                    data-testid="button-send-whatsapp-salary"
                  >
                    {sendWhatsAppMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <SiWhatsapp className="mr-2 h-4 w-4" />
                    )}
                    Send WhatsApp
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:hidden">
        <div className="lg:col-span-5 space-y-4">
          {!selectedEmployee && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Employee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Name, employee code, contact, or CNIC..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>

                {empLoading && searchTerm && (
                  <div className="space-y-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                )}

                {filteredEmployees.length > 0 && (
                  <div className="max-h-[400px] overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Code</th>
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Department</th>
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((e) => (
                          <tr
                            key={e.id}
                            onClick={() => handleSelectEmployee(e)}
                            className="hover-elevate cursor-pointer border-t"
                          >
                            <td className="p-2 font-medium">{e.employeeCode}</td>
                            <td className="p-2">{e.firstName} {e.lastName}</td>
                            <td className="p-2 text-muted-foreground">{e.department?.name || "-"}</td>
                            <td className="p-2 text-muted-foreground">{e.contact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {searchTerm && filteredEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No employees found</p>
                )}

                {!searchTerm && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Type to search by name, employee code, contact, or CNIC
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {selectedEmployee && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Employee Details</CardTitle>
                  <Badge variant={selectedEmployee.status === "active" ? "default" : "secondary"}>
                    {selectedEmployee.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Employee Code</span>
                      <p className="font-medium">{selectedEmployee.employeeCode}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Name</span>
                      <p className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</span>
                      <p>{selectedEmployee.department?.name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Briefcase className="h-3 w-3" /> Designation</span>
                      <p>{selectedEmployee.designation?.name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Contact</span>
                      <p>{selectedEmployee.contact}</p>
                    </div>
                    {selectedEmployee.cnicNumber && (
                      <div>
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><IdCard className="h-3 w-3" /> CNIC</span>
                        <p>{selectedEmployee.cnicNumber}</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Salary</span>
                      <span className="font-medium">{formatRs(getSalary().gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Advances</span>
                      <span className="font-medium text-red-600">-{formatRs(getAdvancesTotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Late Fines</span>
                      <span className="font-medium text-red-600">-{formatRs(getAttendanceDeduction().totalFines)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Absent Deduction</span>
                      <span className="font-medium text-red-600">-{formatRs(getAttendanceDeduction().absentDays * Math.round(getSalary().net / 30))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-7">
          {selectedEmployee ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground print:hidden">Salary Slip Preview</h3>
              <div className="max-w-[500px] mx-auto">
                <PrintableSalarySlip
                  employee={selectedEmployee}
                  salary={getSalary()}
                  advances={getAdvancesTotal()}
                  commissions={getEmployeeCommissions()}
                  attendanceDeduction={getAttendanceDeduction()}
                  monthLabel={monthLabel}
                />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Salary Slip Preview</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                  Search and select an employee to generate their salary slip for {monthLabel}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div className="hidden print:block" aria-hidden="true">
          <div className="max-w-[500px] mx-auto">
            <PrintableSalarySlip
              employee={selectedEmployee}
              salary={getSalary()}
              advances={getAdvancesTotal()}
              commissions={getEmployeeCommissions()}
              attendanceDeduction={getAttendanceDeduction()}
              monthLabel={monthLabel}
              isPrintOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}
