import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WorkingHoursConfig, Holiday, LeaveTypeConfig } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Settings2, Plus, Loader2, Pencil, Trash2, Clock, Calendar, BookOpen } from "lucide-react";
import { Link } from "wouter";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface WorkingHoursLocal {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}

export default function SystemConfigPage() {
  const { toast } = useToast();

  const [workingHours, setWorkingHours] = useState<WorkingHoursLocal[]>([]);
  const [holidayYear, setHolidayYear] = useState("2026");
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayYearInput, setHolidayYearInput] = useState("2026");
  const [holidayOptional, setHolidayOptional] = useState(false);

  const { data: workingHoursData = [], isLoading: whLoading } = useQuery<WorkingHoursConfig[]>({
    queryKey: ["/api/working-hours"],
  });

  const { data: holidays = [], isLoading: holidaysLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays", `?year=${holidayYear}`],
    queryFn: async () => {
      const res = await fetch(`/api/holidays?year=${holidayYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: leaveTypes = [] } = useQuery<LeaveTypeConfig[]>({
    queryKey: ["/api/leave-type-configs"],
  });

  useEffect(() => {
    if (workingHoursData.length > 0) {
      setWorkingHours(workingHoursData.map((wh) => ({
        dayOfWeek: wh.dayOfWeek,
        startTime: wh.startTime,
        endTime: wh.endTime,
        isWorkingDay: wh.isWorkingDay,
      })));
    } else {
      setWorkingHours(DAY_NAMES.map((_, i) => ({
        dayOfWeek: i,
        startTime: "09:00",
        endTime: "17:00",
        isWorkingDay: i !== 0,
      })));
    }
  }, [workingHoursData]);

  const saveWorkingHoursMutation = useMutation({
    mutationFn: async (data: WorkingHoursLocal[]) => {
      const res = await apiRequest("PUT", "/api/working-hours", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/working-hours"] });
      toast({ title: "Working hours saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/holidays", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      closeHolidayDialog();
      toast({ title: "Holiday added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/holidays/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      closeHolidayDialog();
      toast({ title: "Holiday updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/holidays/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({ title: "Holiday deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function updateWorkingDay(dayOfWeek: number, field: string, value: string | boolean) {
    setWorkingHours((prev) =>
      prev.map((wh) => wh.dayOfWeek === dayOfWeek ? { ...wh, [field]: value } : wh)
    );
  }

  function closeHolidayDialog() {
    setShowHolidayDialog(false);
    setEditingHoliday(null);
    setHolidayName("");
    setHolidayDate("");
    setHolidayYearInput("2026");
    setHolidayOptional(false);
  }

  function openEditHoliday(holiday: Holiday) {
    setEditingHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDate(holiday.date);
    setHolidayYearInput(holiday.year.toString());
    setHolidayOptional(holiday.isOptional);
    setShowHolidayDialog(true);
  }

  function handleHolidaySubmit() {
    if (!holidayName.trim() || !holidayDate) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const data = {
      name: holidayName,
      date: holidayDate,
      year: parseInt(holidayYearInput) || 2026,
      isOptional: holidayOptional,
    };
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data });
    } else {
      createHolidayMutation.mutate(data);
    }
  }

  const isHolidayPending = createHolidayMutation.isPending || updateHolidayMutation.isPending;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">System Configuration</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Working Hours Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {whLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3">Day</th>
                      <th className="text-left px-4 py-3">Start Time</th>
                      <th className="text-left px-4 py-3">End Time</th>
                      <th className="text-left px-4 py-3">Working Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.map((wh) => (
                      <tr key={wh.dayOfWeek} className="border-b" data-testid={`row-working-hours-${wh.dayOfWeek}`}>
                        <td className="px-4 py-2 font-medium" data-testid={`text-day-name-${wh.dayOfWeek}`}>{DAY_NAMES[wh.dayOfWeek]}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            value={wh.startTime}
                            onChange={(e) => updateWorkingDay(wh.dayOfWeek, "startTime", e.target.value)}
                            className="w-[130px]"
                            data-testid={`input-start-time-${wh.dayOfWeek}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="time"
                            value={wh.endTime}
                            onChange={(e) => updateWorkingDay(wh.dayOfWeek, "endTime", e.target.value)}
                            className="w-[130px]"
                            data-testid={`input-end-time-${wh.dayOfWeek}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Switch
                            checked={wh.isWorkingDay}
                            onCheckedChange={(val) => updateWorkingDay(wh.dayOfWeek, "isWorkingDay", val)}
                            data-testid={`switch-working-day-${wh.dayOfWeek}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => saveWorkingHoursMutation.mutate(workingHours)}
                  disabled={saveWorkingHoursMutation.isPending}
                  data-testid="button-save-working-hours"
                >
                  {saveWorkingHoursMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Working Hours
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Holiday Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={holidayYear} onValueChange={setHolidayYear}>
              <SelectTrigger className="w-[100px]" data-testid="select-holiday-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowHolidayDialog(true)} data-testid="button-add-holiday">
              <Plus className="h-4 w-4 mr-1" />
              Add Holiday
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {holidaysLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No holidays for {holidayYear}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Holiday Name</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Year</th>
                    <th className="text-left px-4 py-3">Optional</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="border-b" data-testid={`row-holiday-${holiday.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-holiday-name-${holiday.id}`}>{holiday.name}</td>
                      <td className="px-4 py-2" data-testid={`text-holiday-date-${holiday.id}`}>{holiday.date}</td>
                      <td className="px-4 py-2" data-testid={`text-holiday-year-${holiday.id}`}>{holiday.year}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={holiday.isOptional ? "secondary" : "default"}
                          className="no-default-hover-elevate no-default-active-elevate"
                          data-testid={`badge-holiday-optional-${holiday.id}`}
                        >
                          {holiday.isOptional ? "Optional" : "Mandatory"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditHoliday(holiday)} data-testid={`button-edit-holiday-${holiday.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this holiday?")) {
                                deleteHolidayMutation.mutate(holiday.id);
                              }
                            }}
                            data-testid={`button-delete-holiday-${holiday.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Leave Types Configuration</CardTitle>
          </div>
          <Link href="/leave-management">
            <Button variant="outline" size="sm" data-testid="link-leave-management">
              Manage in Leave Management
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {leaveTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave types configured.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Default Days</th>
                    <th className="text-left px-4 py-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt) => (
                    <tr key={lt.id} className="border-b" data-testid={`row-leave-type-${lt.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-leave-name-${lt.id}`}>{lt.name}</td>
                      <td className="px-4 py-2" data-testid={`text-leave-type-${lt.id}`}>{lt.type}</td>
                      <td className="px-4 py-2" data-testid={`text-leave-days-${lt.id}`}>{lt.defaultDays}</td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={lt.isActive ? "default" : "secondary"}
                          className="no-default-hover-elevate no-default-active-elevate"
                          data-testid={`badge-leave-active-${lt.id}`}
                        >
                          {lt.isActive ? "Active" : "Inactive"}
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

      <Dialog open={showHolidayDialog} onOpenChange={(open) => { if (!open) closeHolidayDialog(); else setShowHolidayDialog(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday Name *</Label>
              <Input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g., Independence Day" data-testid="input-holiday-name" />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} data-testid="input-holiday-date" />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={holidayYearInput} onChange={(e) => setHolidayYearInput(e.target.value)} data-testid="input-holiday-year" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={holidayOptional}
                onCheckedChange={(val) => setHolidayOptional(val === true)}
                id="holiday-optional"
                data-testid="checkbox-holiday-optional"
              />
              <Label htmlFor="holiday-optional">Optional Holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeHolidayDialog} data-testid="button-cancel-holiday">Cancel</Button>
            <Button onClick={handleHolidaySubmit} disabled={isHolidayPending} data-testid="button-save-holiday">
              {isHolidayPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingHoliday ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
