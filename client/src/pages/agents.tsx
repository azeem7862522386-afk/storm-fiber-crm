import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Agent } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Plus, Loader2, Phone, Pencil, Trash2, Star, BarChart3, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface AgentPerformance {
  agent: Agent;
  totalComplaints: number;
  completedComplaints: number;
  openComplaints: number;
  feedbackCount: number;
  avgAgentRating: number;
  avgServiceRating: number;
  complaints: Array<{
    id: number;
    complaintType: string;
    status: string;
    priority: string;
    customerName: string;
    customerContact: string;
    createdAt: string;
    resolvedAt: string | null;
    feedback: {
      agentRating: number;
      serviceRating: number;
      comments: string | null;
      createdAt: string;
    } | null;
  }>;
}

const complaintTypeLabels: Record<string, string> = {
  no_internet: "No Internet",
  slow_internet: "Slow Internet",
  red_light: "Red Light",
  wire_damage: "Wire Damage",
  modem_dead: "Modem Dead",
  modem_replacement: "Modem Replacement",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

function RatingStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${iconSize} ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function AgentsPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  const { data: agentsList = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: performanceData } = useQuery<AgentPerformance>({
    queryKey: ["/api/agents", expandedAgentId, "performance"],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${expandedAgentId}/performance`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: expandedAgentId !== null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; whatsappNumber: string }) => {
      const res = await apiRequest("POST", "/api/agents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      closeDialog();
      toast({ title: "Agent added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; whatsappNumber: string; isActive: boolean }> }) => {
      const res = await apiRequest("PATCH", `/api/agents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      closeDialog();
      toast({ title: "Agent updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/agents/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({ title: "Agent deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setShowDialog(false);
    setEditingAgent(null);
    setName("");
    setWhatsappNumber("");
  }

  function openEdit(agent: Agent) {
    setEditingAgent(agent);
    setName(agent.name);
    setWhatsappNumber(agent.whatsappNumber);
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!name.trim() || !whatsappNumber.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent.id, data: { name, whatsappNumber } });
    } else {
      createMutation.mutate({ name, whatsappNumber });
    }
  }

  function toggleExpand(agentId: number) {
    setExpandedAgentId(expandedAgentId === agentId ? null : agentId);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Agents / Employees</h1>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-add-agent">
          <Plus className="h-4 w-4 mr-1" />
          Add Agent
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
          ) : agentsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agents added yet. Click "Add Agent" to add your first agent.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">WhatsApp</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Performance</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                {agentsList.map((agent) => (
                  <tbody key={agent.id}>
                    <tr className="border-b" data-testid={`row-agent-${agent.id}`}>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{agent.id}</td>
                      <td className="px-4 py-2 font-medium" data-testid={`text-agent-name-${agent.id}`}>
                        {agent.name}
                      </td>
                      <td className="px-4 py-2" data-testid={`text-agent-whatsapp-${agent.id}`}>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {agent.whatsappNumber}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={agent.isActive ? "default" : "secondary"}
                          className="no-default-hover-elevate no-default-active-elevate cursor-pointer"
                          onClick={() => updateMutation.mutate({ id: agent.id, data: { isActive: !agent.isActive } })}
                          data-testid={`badge-status-${agent.id}`}
                        >
                          {agent.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(agent.id)}
                          data-testid={`button-performance-${agent.id}`}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          View
                          {expandedAgentId === agent.id ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(agent)}
                            data-testid={`button-edit-${agent.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this agent?")) {
                                deleteMutation.mutate(agent.id);
                              }
                            }}
                            data-testid={`button-delete-${agent.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedAgentId === agent.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <AgentPerformancePanel agentId={agent.id} data={performanceData} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); else setShowDialog(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit Agent" : "Add Agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Adnan"
                data-testid="input-agent-name"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g., 0307-1234567"
                data-testid="input-whatsapp-number"
              />
              <p className="text-xs text-muted-foreground">
                Pakistani format: 03XX-XXXXXXX
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-testid="button-save-agent"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingAgent ? "Update" : "Add Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentPerformancePanel({ agentId, data }: { agentId: number; data?: AgentPerformance }) {
  if (!data || data.agent.id !== agentId) {
    return (
      <div className="p-6 text-center text-muted-foreground bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 space-y-4 border-t" data-testid={`panel-performance-${agentId}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid={`text-total-complaints-${agentId}`}>{data.totalComplaints}</div>
            <div className="text-xs text-muted-foreground">Total Complaints</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold" data-testid={`text-completed-${agentId}`}>{data.completedComplaints}</span>
            </div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold" data-testid={`text-avg-agent-rating-${agentId}`}>{data.avgAgentRating || "-"}</span>
            </div>
            <div className="text-xs text-muted-foreground">Avg Agent Rating</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold" data-testid={`text-avg-service-rating-${agentId}`}>{data.avgServiceRating || "-"}</span>
            </div>
            <div className="text-xs text-muted-foreground">Avg Service Rating</div>
          </CardContent>
        </Card>
      </div>

      {data.complaints.length > 0 ? (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Complaint History ({data.complaints.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Customer</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Agent Rating</th>
                    <th className="text-left px-3 py-2">Service Rating</th>
                    <th className="text-left px-3 py-2">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {data.complaints.map((c) => (
                    <tr key={c.id} className="border-b" data-testid={`row-complaint-${c.id}`}>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{c.id}</td>
                      <td className="px-3 py-2 font-medium">{c.customerName}</td>
                      <td className="px-3 py-2">{complaintTypeLabels[c.complaintType] || c.complaintType}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={c.status === "closed" || c.status === "completed" ? "default" : c.status === "open" ? "destructive" : "secondary"}
                          className="no-default-hover-elevate no-default-active-elevate text-[10px]"
                        >
                          {statusLabels[c.status] || c.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        {c.feedback ? (
                          <div className="flex items-center gap-1">
                            <RatingStars rating={c.feedback.agentRating} />
                            <span className="text-muted-foreground ml-1">{c.feedback.agentRating}/5</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {c.feedback ? (
                          <div className="flex items-center gap-1">
                            <RatingStars rating={c.feedback.serviceRating} />
                            <span className="text-muted-foreground ml-1">{c.feedback.serviceRating}/5</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 max-w-[150px] truncate text-muted-foreground">
                        {c.feedback?.comments || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No complaints assigned to this agent yet.
        </div>
      )}
    </div>
  );
}
