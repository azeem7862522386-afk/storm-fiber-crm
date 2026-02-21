import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { moduleEnum, type User } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Shield, UserCheck, UserX, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

type SafeUser = Omit<User, "password">;

const ROLES = [
  { value: "admin", label: "Admin (Full Access)" },
  { value: "management", label: "Management" },
  { value: "accounts", label: "Accounts" },
  { value: "hr", label: "HR" },
  { value: "inventory", label: "Inventory" },
  { value: "complaints", label: "Complaints" },
  { value: "billing", label: "Billing" },
  { value: "viewer", label: "Viewer (Read Only)" },
];

const MODULE_GROUPS: { label: string; modules: { value: string; label: string }[] }[] = [
  {
    label: "Management",
    modules: [
      { value: "dashboard", label: "Dashboard" },
      { value: "customers", label: "Customers" },
      { value: "billing", label: "Billing" },
      { value: "pos", label: "POS" },
      { value: "complaints", label: "Complaints" },
      { value: "agents", label: "Agents" },
      { value: "plans", label: "Service Plans" },
      { value: "settings", label: "Settings" },
    ],
  },
  {
    label: "HR & Employee",
    modules: [
      { value: "employees", label: "Employees" },
      { value: "departments", label: "Departments" },
      { value: "designations", label: "Designations" },
      { value: "attendance", label: "Attendance" },
      { value: "duty_chart", label: "Duty Chart" },
      { value: "leave", label: "Leave Management" },
      { value: "payroll", label: "Payroll" },
      { value: "performance", label: "Performance" },
      { value: "recruitment", label: "Recruitment" },
      { value: "training", label: "Training" },
      { value: "assets", label: "Assets" },
      { value: "announcements", label: "Announcements" },
      { value: "policies", label: "Policies" },
      { value: "audit_logs", label: "Audit Logs" },
      { value: "system_config", label: "System Config" },
    ],
  },
  {
    label: "Inventory",
    modules: [
      { value: "inventory", label: "All Inventory" },
    ],
  },
  {
    label: "Accounts",
    modules: [
      { value: "accounts", label: "All Accounts" },
    ],
  },
  {
    label: "Admin",
    modules: [
      { value: "user_management", label: "User Management" },
    ],
  },
];

function UserForm({
  existingUser,
  onClose,
}: {
  existingUser?: SafeUser;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!existingUser;

  const [username, setUsername] = useState(existingUser?.username || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(existingUser?.fullName || "");
  const [role, setRole] = useState<string>(existingUser?.role || "viewer");
  const [allowedModules, setAllowedModules] = useState<string[]>(
    existingUser?.allowedModules || []
  );
  const [isActive, setIsActive] = useState(existingUser?.isActive !== false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/users/${existingUser!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated successfully" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleModule = (mod: string) => {
    setAllowedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      username,
      fullName,
      role,
      allowedModules: role === "admin" ? [] : allowedModules,
      isActive,
    };
    if (password) data.password = password;

    if (!isEdit) {
      if (!password) {
        toast({ title: "Password is required for new users", variant: "destructive" });
        return;
      }
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-user">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter full name"
            data-testid="input-full-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            data-testid="input-form-username"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">{isEdit ? "New Password (leave blank to keep)" : "Password"}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? "Leave blank to keep current" : "Enter password"}
            required={!isEdit}
            data-testid="input-form-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={setRole} data-testid="select-role">
            <SelectTrigger data-testid="select-trigger-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} data-testid={`select-item-role-${r.value}`}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="isActive">Account Active</Label>
        <Button
          type="button"
          size="sm"
          variant={isActive ? "default" : "secondary"}
          onClick={() => setIsActive(!isActive)}
          data-testid="button-toggle-active"
        >
          {isActive ? "Active" : "Deactivated"}
        </Button>
      </div>

      {role !== "admin" && (
        <div className="space-y-3" data-testid="section-modules">
          <Label>Allowed Modules</Label>
          <p className="text-xs text-muted-foreground">
            Select which sections this user can access. Admin role has full access automatically.
          </p>
          {MODULE_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-1">
                {group.modules.map((mod) => (
                  <Badge
                    key={mod.value}
                    className={`cursor-pointer toggle-elevate ${
                      allowedModules.includes(mod.value) ? "toggle-elevated" : ""
                    }`}
                    variant={allowedModules.includes(mod.value) ? "default" : "secondary"}
                    onClick={() => toggleModule(mod.value)}
                    data-testid={`badge-module-${mod.value}`}
                  >
                    {mod.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} data-testid="button-save-user">
          {isPending ? "Saving..." : isEdit ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}

export default function UserManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | undefined>();

  const { data: usersList = [], isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated" });
    },
  });

  const openEdit = (user: SafeUser) => {
    setEditUser(user);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditUser(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-y-auto h-full" data-testid="page-user-management">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-users" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-users)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-page-title">User Management</h1>
                <p className="text-white/70 text-sm">Manage user accounts and permissions</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreate} data-testid="button-add-user" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editUser ? "Edit User" : "Create New User"}</DialogTitle>
                </DialogHeader>
                <UserForm
                  existingUser={editUser}
                  onClose={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Users</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{usersList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Active Users</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{usersList.filter(u => u.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Admin Users</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{usersList.filter(u => u.role === 'admin').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading users...</div>
      ) : (
        <div className="grid gap-3">
          {usersList.map((u) => (
            <Card key={u.id} className="group border-0 shadow-md hover:shadow-lg transition-all duration-300" data-testid={`card-user-${u.id}`}>
              <CardContent className="flex items-center justify-between gap-4 p-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-user-name-${u.id}`}>
                        {u.fullName || u.username}
                      </span>
                      <Badge variant="secondary" data-testid={`badge-role-${u.id}`}>
                        {u.role}
                      </Badge>
                      {!u.isActive && (
                        <Badge variant="destructive" data-testid={`badge-inactive-${u.id}`}>
                          Deactivated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-username-${u.id}`}>
                      @{u.username}
                      {u.role !== "admin" && u.allowedModules.length > 0 && (
                        <span className="ml-2">
                          {u.allowedModules.length} module{u.allowedModules.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {u.role === "admin" && (
                        <span className="ml-2">Full access</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                    disabled={u.id === currentUser?.id}
                    data-testid={`button-toggle-${u.id}`}
                  >
                    {u.isActive ? (
                      <UserX className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(u)}
                    data-testid={`button-edit-${u.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this user?")) {
                        deleteMutation.mutate(u.id);
                      }
                    }}
                    disabled={u.id === currentUser?.id}
                    data-testid={`button-delete-${u.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
