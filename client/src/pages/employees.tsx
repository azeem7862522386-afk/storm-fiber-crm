import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import type { EmployeeWithRelations } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Plus, Search, Loader2, Building2, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmployeeStats {
  totalActive: number;
  totalOnLeave: number;
  totalByDepartment: { name: string; count: number }[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  on_leave: { label: "On Leave", variant: "outline" },
  suspended: { label: "Suspended", variant: "destructive" },
  terminated: { label: "Terminated", variant: "secondary" },
  resigned: { label: "Resigned", variant: "secondary" },
};

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-600 text-white hover:bg-green-600";
    case "on_leave":
      return "bg-yellow-500 text-white hover:bg-yellow-500";
    case "suspended":
      return "bg-red-600 text-white hover:bg-red-600";
    case "terminated":
    case "resigned":
      return "bg-gray-500 text-white hover:bg-gray-500";
    default:
      return "";
  }
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const { toast } = useToast();

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees/stats"] });
      toast({ title: "Employee Deleted", description: `${deleteName} has been removed.` });
      setDeleteId(null);
      setDeleteName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: employees = [], isLoading } = useQuery<EmployeeWithRelations[]>({
    queryKey: ["/api/employees", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/employees${params}`);
      if (!res.ok) throw new Error("Failed to load employees");
      return res.json();
    },
  });

  const { data: stats } = useQuery<EmployeeStats>({
    queryKey: ["/api/employees/stats"],
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">Employees</h1>
                <p className="text-white/70 text-sm">Manage your team members</p>
              </div>
            </div>
            <Link href="/employees/new">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-add-employee">
                <Plus className="h-4 w-4 mr-1" />
                Add Employee
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Active Employees</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400" data-testid="text-total-active">{stats.totalActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                  <UserX className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">On Leave</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-400" data-testid="text-total-on-leave">{stats.totalOnLeave}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium truncate">Departments</p>
                  <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400" data-testid="text-total-departments">{stats.totalByDepartment.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, contact, or code..."
          className="pl-9"
          data-testid="input-search-employees"
        />
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search
                ? `No employees found matching "${search}".`
                : 'No employees added yet. Click "Add Employee" to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                    <th className="text-left px-4 py-3 text-white font-semibold">Code</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Name</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Department</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Designation</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Contact</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-employee-${emp.id}`}>
                      <td className="px-4 py-2 font-mono text-muted-foreground" data-testid={`text-employee-code-${emp.id}`}>
                        {emp.employeeCode}
                      </td>
                      <td className="px-4 py-2 font-medium" data-testid={`text-employee-name-${emp.id}`}>
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground" data-testid={`text-employee-department-${emp.id}`}>
                        {emp.department?.name || "-"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground" data-testid={`text-employee-designation-${emp.id}`}>
                        {emp.designation?.title || "-"}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-employee-contact-${emp.id}`}>
                        {emp.contact}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          className={`no-default-hover-elevate no-default-active-elevate ${getStatusBadgeClass(emp.status)}`}
                          data-testid={`badge-status-${emp.id}`}
                        >
                          {statusConfig[emp.status]?.label || emp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Link href={`/employees/${emp.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${emp.id}`}>
                              View
                            </Button>
                          </Link>
                          <Link href={`/employees/${emp.id}/edit`}>
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${emp.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeleteId(emp.id);
                              setDeleteName(`${emp.firstName} ${emp.lastName}`);
                            }}
                            data-testid={`button-delete-${emp.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteName(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteName}</strong>? This action cannot be undone and will remove all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteEmployeeMutation.mutate(deleteId)}
            >
              {deleteEmployeeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
