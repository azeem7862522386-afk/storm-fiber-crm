import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AttendanceWithEmployee, EmployeeWithRelations } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  Check,
  X,
  Loader2,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Save,
  Banknote,
  Printer,
  Pencil,
  Trash2,
} from "lucide-react";

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHalfDay: number;
  totalOnLeave: number;
  totalHoliday: number;
}

interface AttendanceEntry {
  employeeId: number;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
}

const OFFICE_START_TIME = "09:00";

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
  { value: "holiday", label: "Holiday" },
];

const WORKING_HOURS_PER_DAY = 11;

function calculateLateFine(checkIn: string, basicSalary: number): { lateMinutes: number; fineAmount: number; autoStatus: string } {
  if (!checkIn) return { lateMinutes: 0, fineAmount: 0, autoStatus: "present" };

  const [startH, startM] = OFFICE_START_TIME.split(":").map(Number);
  const [inH, inM] = checkIn.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const checkInMinutes = inH * 60 + inM;
  const lateMinutes = Math.max(0, checkInMinutes - startMinutes);

  if (lateMinutes <= 0) return { lateMinutes: 0, fineAmount: 0, autoStatus: "present" };

  const perHourRate = (basicSalary || 0) / 30 / WORKING_HOURS_PER_DAY;
  const fineAmount = Math.round(perHourRate * (lateMinutes / 60));

  return { lateMinutes, fineAmount, autoStatus: "late" };
}

const OFFICE_END_HOUR = 20;
const OFFICE_END_MIN = 0;

function calculateOvertime(checkOut: string, basicSalary: number): { overtimeMinutes: number; overtimeReward: number } {
  if (!checkOut) return { overtimeMinutes: 0, overtimeReward: 0 };
  const parts = checkOut.split(":");
  if (parts.length < 2) return { overtimeMinutes: 0, overtimeReward: 0 };
  const coHour = parseInt(parts[0], 10);
  const coMin = parseInt(parts[1], 10);
  if (isNaN(coHour) || isNaN(coMin)) return { overtimeMinutes: 0, overtimeReward: 0 };
  const checkoutTotalMins = coHour * 60 + coMin;
  const endTotalMins = OFFICE_END_HOUR * 60 + OFFICE_END_MIN;
  if (checkoutTotalMins <= endTotalMins) return { overtimeMinutes: 0, overtimeReward: 0 };
  const otMinutes = checkoutTotalMins - endTotalMins;
  const salary = basicSalary || 0;
  const perHourRate = salary / 30 / WORKING_HOURS_PER_DAY;
  const otReward = Math.round(perHourRate * (otMinutes / 60));
  return { overtimeMinutes: otMinutes, overtimeReward: otReward };
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "present":
      return "bg-green-600 text-white";
    case "absent":
      return "bg-red-600 text-white";
    case "late":
      return "bg-yellow-500 text-white";
    case "half_day":
      return "bg-blue-600 text-white";
    case "on_leave":
      return "bg-purple-600 text-white";
    case "holiday":
      return "bg-gray-500 text-white";
    default:
      return "";
  }
}

function getStatusLabel(status: string): string {
  const opt = statusOptions.find((o) => o.value === status);
  return opt ? opt.label : status;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const { toast } = useToast();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(formatDate(today));
  const [attendanceEntries, setAttendanceEntries] = useState<Record<number, AttendanceEntry>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceWithEmployee | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", status: "", notes: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const parsedDate = new Date(selectedDate + "T00:00:00");
  const selectedMonth = parsedDate.getMonth() + 1;
  const selectedYear = parsedDate.getFullYear();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<EmployeeWithRelations[]>({
    queryKey: ["/api/employees"],
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery<AttendanceWithEmployee[]>({
    queryKey: ["/api/attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load attendance records");
      return res.json();
    },
  });

  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ["/api/attendance/stats", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/stats?month=${selectedMonth}&year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const markMutation = useMutation({
    mutationFn: async (data: { employeeId: number; date: string; checkIn?: string; checkOut?: string; status: string; lateMinutes?: number; fineAmount?: number; notes?: string }) => {
      const res = await apiRequest("POST", "/api/attendance", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats", selectedMonth, selectedYear] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/attendance/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats", selectedMonth, selectedYear] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/attendance/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats", selectedMonth, selectedYear] });
      toast({ title: "Deleted", description: "Attendance record deleted successfully." });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete attendance record.", variant: "destructive" });
    },
  });

  function openEditDialog(rec: AttendanceWithEmployee) {
    setEditingRecord(rec);
    setEditForm({
      checkIn: rec.checkIn || "",
      checkOut: rec.checkOut || "",
      status: rec.status,
      notes: rec.notes || "",
    });
  }

  async function saveEditedAttendance() {
    if (!editingRecord) return;
    try {
      const updateData: Record<string, unknown> = { status: editForm.status };
      if (editForm.checkIn) updateData.checkIn = editForm.checkIn;
      if (editForm.checkOut) updateData.checkOut = editForm.checkOut;
      if (editForm.notes) updateData.notes = editForm.notes;
      await updateMutation.mutateAsync({
        id: editingRecord.id,
        data: updateData,
      });
      toast({ title: "Updated", description: "Attendance record updated successfully." });
      setEditingRecord(null);
    } catch {
      toast({ title: "Error", description: "Failed to update attendance record.", variant: "destructive" });
    }
  }

  const markedEmployeeIds = new Set(records.map((r) => r.employeeId));
  const activeEmployees = employees.filter((e) => e.status === "active");
  const unmarkedEmployees = activeEmployees.filter((e) => !markedEmployeeIds.has(e.id));

  function getEntry(empId: number): AttendanceEntry {
    return attendanceEntries[empId] || {
      employeeId: empId,
      checkIn: "",
      checkOut: "",
      status: "present",
      notes: "",
    };
  }

  function getEmployeeSalary(empId: number): number {
    const emp = unmarkedEmployees.find(e => e.id === empId);
    return emp?.basicSalary || 0;
  }

  function updateEntry(empId: number, field: keyof AttendanceEntry, value: string) {
    setAttendanceEntries((prev) => {
      const current = prev[empId] || getEntry(empId);
      const updated = { ...current, [field]: value };

      if (field === "checkIn" && value) {
        const { autoStatus } = calculateLateFine(value, getEmployeeSalary(empId));
        if (autoStatus === "late") {
          updated.status = "late";
        }
      }

      return { ...prev, [empId]: updated };
    });
  }

  async function saveAllAttendance() {
    const entriesToSave = unmarkedEmployees.map((emp) => {
      const entry = getEntry(emp.id);
      const { lateMinutes, fineAmount } = calculateLateFine(entry.checkIn, emp.basicSalary || 0);
      return {
        employeeId: emp.id,
        date: selectedDate,
        checkIn: entry.checkIn || undefined,
        checkOut: entry.checkOut || undefined,
        status: entry.status,
        lateMinutes: entry.status === "late" ? lateMinutes : 0,
        fineAmount: entry.status === "late" ? fineAmount : 0,
        notes: entry.notes || undefined,
      };
    });

    if (entriesToSave.length === 0) {
      toast({ title: "No employees to mark", description: "All employees already have attendance for this date.", variant: "destructive" });
      return;
    }

    setSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const entry of entriesToSave) {
      try {
        await markMutation.mutateAsync(entry);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setSavingAll(false);
    setAttendanceEntries({});

    if (errorCount > 0) {
      toast({ title: "Partial Save", description: `${successCount} saved, ${errorCount} failed.`, variant: "destructive" });
    } else {
      toast({ title: "Attendance Saved", description: `${successCount} records saved successfully.` });
    }
  }

  const todayTotalFines = records.reduce((sum, r) => sum + ((r as any).fineAmount || 0), 0);
  const todayTotalOTReward = records.reduce((sum, r) => sum + ((r as any).overtimeReward || 0), 0);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Attendance</h1>
                <p className="text-white/70 text-sm">Track employee attendance and overtime</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-lg hidden sm:block">
                Office: {OFFICE_START_TIME}
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-36 sm:w-44 h-8 text-sm bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm placeholder:text-white/50 [&::-webkit-calendar-picker-indicator]:invert"
                data-testid="input-date-picker"
              />
              <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 print:hidden">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="stat-present">{stats?.totalPresent ?? 0}</div>
                <div className="text-xs text-muted-foreground font-medium">Present (Month)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform">
                <UserX className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400" data-testid="stat-absent">{stats?.totalAbsent ?? 0}</div>
                <div className="text-xs text-muted-foreground font-medium">Absent (Month)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="stat-late">{stats?.totalLate ?? 0}</div>
                <div className="text-xs text-muted-foreground font-medium">Late (Month)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="stat-half-day">{stats?.totalHalfDay ?? 0}</div>
                <div className="text-xs text-muted-foreground font-medium">Half Day (Month)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">Rs. {todayTotalFines}</div>
                <div className="text-xs text-muted-foreground font-medium">Fines Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Rs. {todayTotalOTReward}</div>
                <div className="text-xs text-muted-foreground font-medium">OT Reward Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-50 dark:bg-amber-950/20 border-0 shadow-sm print:hidden">
        <CardContent className="p-3">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            Late Fine: Calculated based on salary (Basic Salary / 30 / 11 working hours × late hours) - same formula as overtime reward
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Absent = Per day salary deducted | Overtime = After 8:00 PM, reward per hour added to salary
          </p>
        </CardContent>
      </Card>

      <Card className="print:hidden border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mark Attendance - {selectedDate}
          </CardTitle>
          <Button
            onClick={saveAllAttendance}
            disabled={savingAll || unmarkedEmployees.length === 0}
            data-testid="button-save-attendance"
          >
            {savingAll ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Attendance
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingEmployees ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading employees...
            </div>
          ) : unmarkedEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-all-marked">
              <Check className="h-5 w-5 mx-auto mb-2 text-green-600" />
              All employees have been marked for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Check In</th>
                    <th className="text-left px-4 py-3 font-medium">Check Out</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Fine</th>
                    <th className="text-left px-4 py-3 font-medium">Overtime</th>
                    <th className="text-left px-4 py-3 font-medium">OT Reward</th>
                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unmarkedEmployees.map((emp) => {
                    const entry = getEntry(emp.id);
                    const { lateMinutes, fineAmount } = calculateLateFine(entry.checkIn, emp.basicSalary || 0);
                    const { overtimeMinutes: otMins, overtimeReward: otReward } = calculateOvertime(entry.checkOut, emp.basicSalary || 0);
                    const showFine = entry.status === "late" && fineAmount > 0;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" data-testid={`row-mark-${emp.id}`}>
                        <td className="px-4 py-2 font-mono text-muted-foreground" data-testid={`text-emp-code-${emp.id}`}>
                          {emp.employeeCode}
                        </td>
                        <td className="px-4 py-2 font-medium" data-testid={`text-emp-name-${emp.id}`}>
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            value={entry.checkIn}
                            onChange={(e) => updateEntry(emp.id, "checkIn", e.target.value)}
                            className="w-28"
                            data-testid={`input-checkin-${emp.id}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            value={entry.checkOut}
                            onChange={(e) => updateEntry(emp.id, "checkOut", e.target.value)}
                            className="w-28"
                            data-testid={`input-checkout-${emp.id}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Select
                            value={entry.status}
                            onValueChange={(val) => updateEntry(emp.id, "status", val)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-status-${emp.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} data-testid={`option-${opt.value}-${emp.id}`}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          {showFine ? (
                            <div>
                              <span className="text-red-600 font-semibold">Rs. {fineAmount}</span>
                              <span className="text-xs text-muted-foreground ml-1">({lateMinutes}min)</span>
                            </div>
                          ) : entry.status === "absent" ? (
                            <span className="text-red-600 text-xs font-medium">Day salary deducted</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {otMins > 0 ? (
                            <span className="text-blue-600">{Math.floor(otMins / 60)}h {otMins % 60}m</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {otReward > 0 ? (
                            <span className="text-green-600 font-semibold">Rs. {otReward}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={entry.notes}
                            onChange={(e) => updateEntry(emp.id, "notes", e.target.value)}
                            placeholder="Notes..."
                            className="w-32"
                            data-testid={`input-notes-${emp.id}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="print:hidden border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Attendance Records - {selectedDate}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRecords ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading records...
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-records">
              <X className="h-5 w-5 mx-auto mb-2" />
              No attendance records for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <th className="text-left px-4 py-3 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 font-medium">Check In</th>
                    <th className="text-left px-4 py-3 font-medium">Check Out</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Late</th>
                    <th className="text-left px-4 py-3 font-medium">Fine</th>
                    <th className="text-left px-4 py-3 font-medium">Overtime</th>
                    <th className="text-left px-4 py-3 font-medium">OT Reward</th>
                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {records.map((rec) => {
                    const recAny = rec as any;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" data-testid={`row-record-${rec.id}`}>
                        <td className="px-4 py-2 font-medium" data-testid={`text-record-name-${rec.id}`}>
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </td>
                        <td className="px-4 py-2" data-testid={`text-checkin-${rec.id}`}>
                          {rec.checkIn || "-"}
                        </td>
                        <td className="px-4 py-2" data-testid={`text-checkout-${rec.id}`}>
                          {rec.checkOut || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${getStatusBadgeClass(rec.status)}`}
                            data-testid={`badge-status-${rec.id}`}
                          >
                            {getStatusLabel(rec.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {recAny.lateMinutes > 0 ? `${recAny.lateMinutes} min` : "-"}
                        </td>
                        <td className="px-4 py-2">
                          {recAny.fineAmount > 0 ? (
                            <span className="text-red-600 font-semibold">Rs. {recAny.fineAmount}</span>
                          ) : rec.status === "absent" ? (
                            <span className="text-red-500 text-xs">Day deducted</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {recAny.overtimeMinutes > 0 ? (
                            <span className="text-blue-600">{Math.floor(recAny.overtimeMinutes / 60)}h {recAny.overtimeMinutes % 60}m</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {recAny.overtimeReward > 0 ? (
                            <span className="text-green-600 font-semibold">Rs. {recAny.overtimeReward}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate" data-testid={`text-notes-${rec.id}`}>
                          {rec.notes || "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(rec)} title="Edit">
                              <Pencil className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirmId(rec.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>EMPLOYEE ATTENDANCE REPORT</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Date:</strong> {selectedDate}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Employee Code</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Name</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Status</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Check In</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Check Out</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Late Minutes</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Fine</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const recAny = rec as any;
              return (
                <tr key={rec.id}>
                  <td style={{ border: "1px solid #ccc", padding: "4px", fontFamily: "monospace" }}>{rec.employee?.employeeCode || "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{rec.employee?.firstName} {rec.employee?.lastName}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{getStatusLabel(rec.status)}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{rec.checkIn || "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px" }}>{rec.checkOut || "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{recAny.lateMinutes > 0 ? `${recAny.lateMinutes} min` : "-"}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{recAny.fineAmount > 0 ? `Rs. ${recAny.fineAmount}` : rec.status === "absent" ? "Day deducted" : "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold", textAlign: "right" }}>Total Fines:</td>
              <td style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold", textAlign: "right" }}>Rs. {todayTotalFines}</td>
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

      <Dialog open={!!editingRecord} onOpenChange={(open) => { if (!open) setEditingRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance - {editingRecord?.employee?.firstName} {editingRecord?.employee?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Check In</label>
              <Input type="time" value={editForm.checkIn} onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Check Out</label>
              <Input type="time" value={editForm.checkOut} onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
            <Button onClick={saveEditedAttendance} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Attendance Record</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this attendance record? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
