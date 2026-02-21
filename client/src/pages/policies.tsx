import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Policy, PolicyAcknowledgement, Employee } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Loader2, Pencil, Trash2, Eye, CheckCircle } from "lucide-react";

export default function PoliciesPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("1.0");
  const [isActive, setIsActive] = useState(true);
  const [viewingPolicyId, setViewingPolicyId] = useState<number | null>(null);

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ["/api/policies"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: acknowledgements = [] } = useQuery<PolicyAcknowledgement[]>({
    queryKey: ["/api/policies", viewingPolicyId, "acknowledgements"],
    queryFn: async () => {
      if (!viewingPolicyId) return [];
      const res = await fetch(`/api/policies/${viewingPolicyId}/acknowledgements`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: viewingPolicyId !== null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/policies", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      closeDialog();
      toast({ title: "Policy created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/policies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      closeDialog();
      toast({ title: "Policy updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ policyId, employeeId }: { policyId: number; employeeId: number }) => {
      const res = await apiRequest("POST", `/api/policies/${policyId}/acknowledgements`, { policyId, employeeId });
      return res.json();
    },
    onSuccess: () => {
      if (viewingPolicyId) {
        queryClient.invalidateQueries({ queryKey: ["/api/policies", viewingPolicyId, "acknowledgements"] });
      }
      toast({ title: "Policy acknowledged" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setShowDialog(false);
    setEditingPolicy(null);
    setTitle("");
    setContent("");
    setCategory("");
    setVersion("1.0");
    setIsActive(true);
  }

  function openEdit(policy: Policy) {
    setEditingPolicy(policy);
    setTitle(policy.title);
    setContent(policy.content);
    setCategory(policy.category);
    setVersion(policy.version);
    setIsActive(policy.isActive);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!title.trim() || !content.trim() || !category.trim()) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const data = { title, content, category, version, isActive };
    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const acknowledgedEmployeeIds = new Set(acknowledgements.map((a) => a.employeeId));

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Company Policies</h1>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-policy">
          <Plus className="h-4 w-4 mr-1" />
          Add Policy
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading policies...</div>
      ) : policies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No policies yet.</div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <Card key={policy.id} data-testid={`card-policy-${policy.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base" data-testid={`text-policy-title-${policy.id}`}>
                    {policy.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-policy-category-${policy.id}`}>
                      {policy.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground" data-testid={`text-policy-version-${policy.id}`}>
                      v{policy.version}
                    </span>
                    <Badge
                      variant={policy.isActive ? "default" : "secondary"}
                      className="no-default-hover-elevate no-default-active-elevate"
                      data-testid={`badge-policy-active-${policy.id}`}
                    >
                      {policy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewingPolicyId(viewingPolicyId === policy.id ? null : policy.id)} data-testid={`button-view-ack-${policy.id}`}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(policy)} data-testid={`button-edit-policy-${policy.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-policy-content-${policy.id}`}>
                  {policy.content}
                </p>
              </CardContent>

              {viewingPolicyId === policy.id && (
                <CardContent className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3" data-testid={`text-ack-heading-${policy.id}`}>Acknowledgements</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2">Employee</th>
                          <th className="text-left px-3 py-2">Code</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => {
                          const acked = acknowledgedEmployeeIds.has(emp.id);
                          return (
                            <tr key={emp.id} className="border-b" data-testid={`row-ack-${policy.id}-${emp.id}`}>
                              <td className="px-3 py-2 font-medium">{emp.firstName} {emp.lastName}</td>
                              <td className="px-3 py-2 text-muted-foreground">{emp.employeeCode}</td>
                              <td className="px-3 py-2">
                                {acked ? (
                                  <Badge variant="default" className="no-default-hover-elevate no-default-active-elevate bg-green-600 text-white" data-testid={`badge-acked-${policy.id}-${emp.id}`}>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Acknowledged
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-pending-${policy.id}-${emp.id}`}>
                                    Pending
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {!acked && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => acknowledgeMutation.mutate({ policyId: policy.id, employeeId: emp.id })}
                                    disabled={acknowledgeMutation.isPending}
                                    data-testid={`button-acknowledge-${policy.id}-${emp.id}`}
                                  >
                                    {acknowledgeMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                    Acknowledge
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); else setShowDialog(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? "Edit Policy" : "Add Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Policy title" data-testid="input-policy-title" />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Policy content..." rows={5} data-testid="textarea-policy-content" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., HR, IT, General" data-testid="input-policy-category" />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" data-testid="input-policy-version" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="policy-active" data-testid="switch-policy-active" />
              <Label htmlFor="policy-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-policy">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-policy">
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingPolicy ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
