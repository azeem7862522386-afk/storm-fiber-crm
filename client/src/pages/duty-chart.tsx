import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DutyType, DutyAssignmentWithDetails, EmployeeWithRelations } from "@shared/schema";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Plus,
  Clock,
  Users,
  Calendar,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Printer,
  Coffee,
  Loader2,
} from "lucide-react";

function getWeekDates(baseDate: Date): { start: Date; end: Date; dates: Date[] } {
  const day = baseDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diff);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return { start: dates[0], end: dates[6], dates };
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function DutyChartPage() {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showDutyTypeDialog, setShowDutyTypeDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingDutyType, setEditingDutyType] = useState<DutyType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingAssignment, setEditingAssignment] = useState<DutyAssignmentWithDetails | null>(null);

  const [dtName, setDtName] = useState("");
  const [dtStart, setDtStart] = useState("09:00");
  const [dtEnd, setDtEnd] = useState("17:00");
  const [dtBreak, setDtBreak] = useState("60");
  const [dtColor, setDtColor] = useState("#3B82F6");
  const [dtDesc, setDtDesc] = useState("");

  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignDutyTypeId, setAssignDutyTypeId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignSkills, setAssignSkills] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const week = getWeekDates(currentWeek);
  const startDate = formatDate(week.start);
  const endDate = formatDate(week.end);

  const { data: dutyTypes = [], isLoading: loadingTypes } = useQuery<DutyType[]>({
    queryKey: ["/api/duty-types"],
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery<DutyAssignmentWithDetails[]>({
    queryKey: ["/api/duty-assignments", startDate, endDate],
    queryFn: () => apiRequest("GET", `/api/duty-assignments?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
  });

  const { data: employeesData = [] } = useQuery<EmployeeWithRelations[]>({
    queryKey: ["/api/employees"],
  });

  const activeEmployees = employeesData.filter((e: any) => e.status === "active");

  const createDutyTypeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/duty-types", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-types"] });
      toast({ title: "Duty type created" });
      resetDutyTypeForm();
      setShowDutyTypeDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateDutyTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/duty-types/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-types"] });
      toast({ title: "Duty type updated" });
      resetDutyTypeForm();
      setShowDutyTypeDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteDutyTypeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/duty-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-types"] });
      toast({ title: "Duty type deleted" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/duty-assignments", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-assignments"] });
      toast({ title: "Duty assigned" });
      resetAssignForm();
      setShowAssignDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/duty-assignments/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-assignments"] });
      toast({ title: "Assignment updated" });
      resetAssignForm();
      setShowAssignDialog(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/duty-assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duty-assignments"] });
      toast({ title: "Assignment removed" });
    },
  });

  function resetDutyTypeForm() {
    setDtName(""); setDtStart("09:00"); setDtEnd("17:00"); setDtBreak("60"); setDtColor("#3B82F6"); setDtDesc(""); setEditingDutyType(null);
  }

  function resetAssignForm() {
    setAssignEmployeeId(""); setAssignDutyTypeId(""); setAssignDate(""); setAssignSkills(""); setAssignNotes(""); setEditingAssignment(null);
  }

  function openEditDutyType(dt: DutyType) {
    setEditingDutyType(dt);
    setDtName(dt.name);
    setDtStart(dt.startTime);
    setDtEnd(dt.endTime);
    setDtBreak(String(dt.breakMinutes));
    setDtColor(dt.color || "#3B82F6");
    setDtDesc(dt.description || "");
    setShowDutyTypeDialog(true);
  }

  function openAssignForDate(date: string) {
    resetAssignForm();
    setAssignDate(date);
    setSelectedDate(date);
    setShowAssignDialog(true);
  }

  function openEditAssignment(a: DutyAssignmentWithDetails) {
    setEditingAssignment(a);
    setAssignEmployeeId(String(a.employeeId));
    setAssignDutyTypeId(String(a.dutyTypeId));
    setAssignDate(a.date);
    setAssignSkills(a.skills || "");
    setAssignNotes(a.notes || "");
    setShowAssignDialog(true);
  }

  function saveDutyType() {
    const data = { name: dtName, startTime: dtStart, endTime: dtEnd, breakMinutes: parseInt(dtBreak), color: dtColor, description: dtDesc || null };
    if (editingDutyType) {
      updateDutyTypeMutation.mutate({ id: editingDutyType.id, data });
    } else {
      createDutyTypeMutation.mutate(data);
    }
  }

  function saveAssignment() {
    const data = {
      employeeId: parseInt(assignEmployeeId),
      dutyTypeId: parseInt(assignDutyTypeId),
      date: assignDate,
      skills: assignSkills || null,
      notes: assignNotes || null,
    };
    if (editingAssignment) {
      updateAssignmentMutation.mutate({ id: editingAssignment.id, data });
    } else {
      createAssignmentMutation.mutate(data);
    }
  }

  function prevWeek() {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  }

  function nextWeek() {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  }

  function goToday() {
    setCurrentWeek(new Date());
  }

  function getAssignmentsForDate(dateStr: string) {
    return assignments.filter(a => a.date === dateStr);
  }

  const totalAssignments = assignments.length;
  const uniqueEmployees = new Set(assignments.map(a => a.employeeId)).size;
  const todayStr = formatDate(new Date());
  const todayAssignments = assignments.filter(a => a.date === todayStr).length;

  function handlePrint() {
    const printContent = document.getElementById("duty-chart-print");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Duty Chart - Week ${startDate} to ${endDate}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 2px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .duty-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 11px; margin: 1px 0; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <div class="header">
        <h1>Storm Fiber Pattoki</h1>
        <p>Employee Duty Chart</p>
        <p>Week: ${startDate} to ${endDate}</p>
      </div>
      ${printContent.innerHTML}
      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString("en-PK")} | Storm Fiber Pattoki CRM</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="overflow-auto h-full p-4 md:p-6 space-y-5">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-duty" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-duty)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Duty Chart</h1>
                <p className="text-white/70 text-sm">Weekly employee shift assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 print:hidden">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-fuchsia-50 to-white dark:from-fuchsia-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/25 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Shift Types</p>
                <p className="text-xl font-bold text-fuchsia-700 dark:text-fuchsia-400">{dutyTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Week Assignments</p>
                <p className="text-xl font-bold text-pink-700 dark:text-pink-400">{totalAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Employees Assigned</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{uniqueEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Today's Duties</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{todayAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="duty-types">Shift Types</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToday}>Today</Button>
              <Button variant="outline" size="icon" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 font-medium text-sm">
                {week.start.toLocaleDateString("en-PK", { month: "long", day: "numeric" })} - {week.end.toLocaleDateString("en-PK", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {loadingAssignments ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div id="duty-chart-print">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700">
                    {week.dates.map(d => {
                      const ds = formatDate(d);
                      const isToday = ds === todayStr;
                      return (
                        <TableHead key={ds} className={`text-center min-w-[140px] text-white ${isToday ? "bg-white/10" : ""}`}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-normal">{formatDateShort(d)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => openAssignForDate(ds)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {week.dates.map(d => {
                      const ds = formatDate(d);
                      const dayAssignments = getAssignmentsForDate(ds);
                      return (
                        <TableCell key={ds} className="align-top p-2 min-w-[140px]">
                          {dayAssignments.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-4">No duties</div>
                          ) : (
                            <div className="space-y-2">
                              {dayAssignments.map(a => {
                                const dt = a.dutyType;
                                const bgColor = dt?.color || "#3B82F6";
                                return (
                                  <div
                                    key={a.id}
                                    className="rounded-md p-2 text-xs border cursor-pointer hover:shadow-md transition-shadow"
                                    style={{ borderLeft: `4px solid ${bgColor}` }}
                                    onClick={() => openEditAssignment(a)}
                                  >
                                    <div className="font-semibold truncate">
                                      {a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : "Unknown"}
                                    </div>
                                    <Badge
                                      className="mt-1 text-[10px]"
                                      style={{ backgroundColor: bgColor, color: "white" }}
                                    >
                                      {dt?.name || "Unknown"}
                                    </Badge>
                                    {dt && (
                                      <div className="text-muted-foreground mt-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime12h(dt.startTime)} - {formatTime12h(dt.endTime)}
                                      </div>
                                    )}
                                    {dt && dt.breakMinutes > 0 && (
                                      <div className="text-muted-foreground flex items-center gap-1">
                                        <Coffee className="h-3 w-3" />
                                        {dt.breakMinutes} min break
                                      </div>
                                    )}
                                    {a.skills && (
                                      <div className="text-muted-foreground mt-1 truncate" title={a.skills}>
                                        Skills: {a.skills}
                                      </div>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 mt-1 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteAssignmentMutation.mutate(a.id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {dutyTypes.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-sm text-muted-foreground">Legend:</span>
              {dutyTypes.map(dt => (
                <div key={dt.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: dt.color || "#3B82F6" }} />
                  <span className="text-xs">{dt.name} ({formatTime12h(dt.startTime)} - {formatTime12h(dt.endTime)})</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duty-types" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manage Shift Types</h3>
            <Dialog open={showDutyTypeDialog} onOpenChange={(open) => { if (!open) resetDutyTypeForm(); setShowDutyTypeDialog(open); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Shift Type</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDutyType ? "Edit" : "Add"} Shift Type</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={dtName} onChange={e => setDtName(e.target.value)} placeholder="e.g. Morning Shift" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" value={dtStart} onChange={e => setDtStart(e.target.value)} />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" value={dtEnd} onChange={e => setDtEnd(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Break (minutes)</Label>
                      <Input type="number" value={dtBreak} onChange={e => setDtBreak(e.target.value)} min="0" />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <div className="flex items-center gap-2">
                        <Input type="color" value={dtColor} onChange={e => setDtColor(e.target.value)} className="w-12 h-9 p-1" />
                        <Input value={dtColor} onChange={e => setDtColor(e.target.value)} className="flex-1" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea value={dtDesc} onChange={e => setDtDesc(e.target.value)} placeholder="Shift description" rows={2} />
                  </div>
                  <Button onClick={saveDutyType} disabled={!dtName || !dtStart || !dtEnd}>
                    {editingDutyType ? "Update" : "Create"} Shift Type
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingTypes ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dutyTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No shift types created yet</p>
                <p className="text-sm text-muted-foreground">Create shift types like Morning, Evening, Night to start scheduling</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dutyTypes.map(dt => (
                <Card key={dt.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: dt.color || "#3B82F6" }} />
                        <CardTitle className="text-base">{dt.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDutyType(dt)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("Delete this shift type?")) deleteDutyTypeMutation.mutate(dt.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatTime12h(dt.startTime)} - {formatTime12h(dt.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      <span>{dt.breakMinutes} min break</span>
                    </div>
                    {dt.description && (
                      <p className="text-sm text-muted-foreground">{dt.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showAssignDialog} onOpenChange={(open) => { if (!open) resetAssignForm(); setShowAssignDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit" : "Assign"} Duty</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} />
            </div>
            <div>
              <Label>Employee</Label>
              <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift Type</Label>
              <Select value={assignDutyTypeId} onValueChange={setAssignDutyTypeId}>
                <SelectTrigger><SelectValue placeholder="Select shift type" /></SelectTrigger>
                <SelectContent>
                  {dutyTypes.map(dt => (
                    <SelectItem key={dt.id} value={String(dt.id)}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: dt.color || "#3B82F6" }} />
                        {dt.name} ({formatTime12h(dt.startTime)} - {formatTime12h(dt.endTime)})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Skills / Expertise (optional)</Label>
              <Input value={assignSkills} onChange={e => setAssignSkills(e.target.value)} placeholder="e.g. GPON, Splicing, ONU Config" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Additional notes" rows={2} />
            </div>
            <Button
              onClick={saveAssignment}
              disabled={!assignEmployeeId || !assignDutyTypeId || !assignDate}
            >
              {editingAssignment ? "Update" : "Assign"} Duty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
