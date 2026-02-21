import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ListTodo, CheckCircle2, Clock, AlertTriangle,
  Calendar, User, Loader2, Filter, Edit2
} from "lucide-react";

type Todo = {
  id: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  completed: boolean;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string;
  completedAt: string | null;
  createdAt: string;
};

const priorityColors: Record<string, string> = {
  low: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200",
  medium: "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200",
  high: "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export default function TodosPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: allTodos = [], isLoading } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/todos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      resetForm();
      toast({ title: "Task added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/todos/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({ title: "Task deleted" });
    },
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingTodo(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
    };
    if (editingTodo) {
      updateMutation.mutate({ id: editingTodo.id, data }, {
        onSuccess: () => {
          resetForm();
          toast({ title: "Task updated" });
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || "");
    setPriority(todo.priority);
    setDueDate(todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "");
    setAssignedTo(todo.assignedTo || "");
    setShowDialog(true);
  };

  const toggleComplete = (todo: Todo) => {
    updateMutation.mutate({ id: todo.id, data: { completed: !todo.completed } });
  };

  const todos = allTodos.filter((t) => {
    if (filter === "pending" && t.completed) return false;
    if (filter === "completed" && !t.completed) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const totalTasks = allTodos.length;
  const completedTasks = allTodos.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const urgentTasks = allTodos.filter((t) => !t.completed && t.priority === "urgent").length;
  const overdueTasks = allTodos.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  const isOverdue = (todo: Todo) => !todo.completed && todo.dueDate && new Date(todo.dueDate) < new Date();

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <ListTodo className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">To Do List</h1>
                <p className="text-white/70 text-sm">Manage your tasks and activities</p>
              </div>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-lg shadow-slate-500/25 group-hover:scale-110 transition-transform">
                <ListTodo className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-400">{totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Pending</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{pendingTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Completed</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Urgent</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{urgentTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Overdue</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{overdueTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm dark:bg-background/80">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : todos.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No tasks found. Click "Add Task" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <Card key={todo.id} className={`border-0 shadow-sm hover:shadow-md transition-all ${todo.completed ? "opacity-60 border-l-4 border-l-emerald-500" : ""} ${isOverdue(todo) ? "border-l-4 border-l-red-500" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleComplete(todo)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                        {todo.title}
                      </span>
                      <Badge variant="outline" className={priorityColors[todo.priority]}>
                        {priorityLabels[todo.priority]}
                      </Badge>
                      {isOverdue(todo) && (
                        <Badge variant="destructive" className="text-xs">Overdue</Badge>
                      )}
                    </div>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {todo.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue(todo) ? "text-red-500 font-medium" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(todo.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {todo.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {todo.assignedTo}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(todo.createdAt).toLocaleDateString()}
                      </span>
                      {todo.completedAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Done: {new Date(todo.completedAt).toLocaleString()}
                        </span>
                      )}
                      <span className="text-muted-foreground">by {todo.createdBy}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(todo)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(todo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={resetForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTodo ? "Edit Task" : "Add New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select value={assignedTo || "_none"} onValueChange={(v) => setAssignedTo(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not Assigned</SelectItem>
                  {employees.filter((e: any) => e.status === "active").map((emp: any) => (
                    <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingTodo ? "Update" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
