import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Department, Employee } from "@shared/schema";
import { Building2, Plus, Loader2, Pencil, Trash2, Users, CheckCircle } from "lucide-react";

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const { data: departmentsList = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: employeesList = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; managerId?: number | null; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/departments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      closeDialog();
      toast({ title: "Department added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; description: string; managerId: number | null; isActive: boolean }> }) => {
      const res = await apiRequest("PATCH", `/api/departments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      closeDialog();
      toast({ title: "Department updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/departments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Department deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setShowDialog(false);
    setEditingDepartment(null);
    setName("");
    setDescription("");
    setManagerId("");
    setIsActive(true);
  }

  function openEdit(dept: Department) {
    setEditingDepartment(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setManagerId(dept.managerId ? String(dept.managerId) : "");
    setIsActive(dept.isActive);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast({ title: "Please enter a department name", variant: "destructive" });
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      managerId: managerId ? Number(managerId) : null,
      isActive,
    };
    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function getManagerName(mgrId: number | null): string {
    if (!mgrId) return "-";
    const emp = employeesList.find((e) => e.id === mgrId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "-";
  }

  function getEmployeeCount(deptId: number): number {
    return employeesList.filter((e) => e.departmentId === deptId).length;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const activeDepts = departmentsList.filter(d => d.isActive).length;
  const totalEmployeesInDepts = employeesList.filter(e => e.departmentId).length;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Departments</h1>
                <p className="text-white/70 text-sm">Manage organizational departments</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-add-department">
              <Plus className="h-4 w-4 mr-1" />
              Add Department
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Departments</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{departmentsList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Active Departments</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{activeDepts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Employees</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{totalEmployeesInDepts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">Loading departments...</div>
          ) : departmentsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-empty">
              No departments added yet. Click "Add Department" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-departments">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                    <th className="text-left px-4 py-3 text-white font-semibold">Name</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Description</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Manager</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Employee Count</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {departmentsList.map((dept) => (
                    <tr key={dept.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-department-${dept.id}`}>
                      <td className="px-4 py-2 font-medium" data-testid={`text-department-name-${dept.id}`}>
                        {dept.name}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground max-w-[200px] truncate" data-testid={`text-department-description-${dept.id}`}>
                        {dept.description || "-"}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-department-manager-${dept.id}`}>
                        {getManagerName(dept.managerId)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={dept.isActive ? "default" : "secondary"}
                          className="no-default-hover-elevate no-default-active-elevate cursor-pointer"
                          onClick={() => updateMutation.mutate({ id: dept.id, data: { isActive: !dept.isActive } })}
                          data-testid={`badge-status-${dept.id}`}
                        >
                          {dept.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2" data-testid={`text-employee-count-${dept.id}`}>
                        {getEmployeeCount(dept.id)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(dept)}
                            data-testid={`button-edit-${dept.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this department?")) {
                                deleteMutation.mutate(dept.id);
                              }
                            }}
                            data-testid={`button-delete-${dept.id}`}
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

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); else setShowDialog(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Engineering"
                data-testid="input-department-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Department description..."
                data-testid="input-department-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger data-testid="select-manager">
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {employeesList.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-manager-${emp.id}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-testid="button-save-department"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingDepartment ? "Update" : "Add Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
