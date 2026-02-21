import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import type { ComplaintWithRelations } from "@shared/schema";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowLeft,
  UserCheck,
  CheckCircle,
  MessageSquare,
  Star,
  Loader2,
  Clock,
  Phone,
  MapPin,
  User,
  Camera,
} from "lucide-react";
import { Link } from "wouter";

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

const statusVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  open: "destructive",
  assigned: "secondary",
  in_progress: "default",
  completed: "default",
  closed: "outline",
};

export default function ComplaintDetailPage() {
  const [, params] = useRoute("/complaints/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const complaintId = Number(params?.id);

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [agentRating, setAgentRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState("");

  const { data: complaint, isLoading } = useQuery<ComplaintWithRelations>({
    queryKey: ["/api/complaints", complaintId],
    enabled: !isNaN(complaintId),
  });

  const { data: employeesList = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  const activeEmployees = employeesList.filter((e: any) => e.status === "active");

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/complaints/${complaintId}/assign`, { employeeId: Number(selectedEmployeeId) });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", complaintId] });
      setShowAssignDialog(false);
      setSelectedEmployeeId("");

      if (data.whatsappSent) {
        toast({ title: "Employee assigned & WhatsApp message sent" });
      } else if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
        toast({ title: "Employee assigned - send WhatsApp notification" });
      } else {
        toast({ title: "Employee assigned" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/complaints/${complaintId}/complete`, { resolutionNotes });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", complaintId] });
      setShowCompleteDialog(false);
      setResolutionNotes("");

      if (data.whatsappSent) {
        apiRequest("PATCH", `/api/complaints/${complaintId}/whatsapp-complete`);
        toast({ title: "Complaint completed & WhatsApp message sent" });
      } else if (data.whatsappLink) {
        window.open(data.whatsappLink, "_blank");
        apiRequest("PATCH", `/api/complaints/${complaintId}/whatsapp-complete`);
        toast({ title: "Complaint marked as completed" });
      } else {
        toast({ title: "Complaint marked as completed" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/complaints/${complaintId}/feedback`, {
        agentRating,
        serviceRating,
        comments: feedbackComments || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", complaintId] });
      setShowFeedbackDialog(false);
      setAgentRating(0);
      setServiceRating(0);
      setFeedbackComments("");
      toast({ title: "Feedback submitted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/complaints/${complaintId}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/complaints", complaintId] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Complaint not found.
        <div className="mt-2">
          <Link href="/complaints">
            <Button variant="outline">Back to Complaints</Button>
          </Link>
        </div>
      </div>
    );
  }

  function StarRating({ value, onChange, testIdPrefix }: { value: number; onChange: (v: number) => void; testIdPrefix: string }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5"
            data-testid={`${testIdPrefix}-star-${star}`}
          >
            <Star
              className={`h-6 w-6 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link href="/complaints">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">
          Complaint #{complaint.id}
        </h1>
        <Badge
          variant={statusVariant[complaint.status] || "outline"}
          className="no-default-hover-elevate no-default-active-elevate"
          data-testid="badge-complaint-status"
        >
          {statusLabels[complaint.status] || complaint.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium" data-testid="text-customer-name">{complaint.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium" data-testid="text-customer-contact">{complaint.customer?.contact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-right max-w-[200px]">{complaint.customer?.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate capitalize">{complaint.customer?.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Complaint Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="text-complaint-type">
                {complaintTypeLabels[complaint.complaintType] || complaint.complaintType}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <Badge
                variant={complaint.priority === "urgent" ? "destructive" : complaint.priority === "high" ? "secondary" : "outline"}
                className="no-default-hover-elevate no-default-active-elevate capitalize"
                data-testid="text-priority"
              >
                {complaint.priority}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registered</span>
              <span className="font-medium">{new Date(complaint.createdAt).toLocaleString()}</span>
            </div>
            {complaint.assignedTo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned To</span>
                <span className="font-medium" data-testid="text-assigned-to">{complaint.assignedTo}</span>
              </div>
            )}
            {complaint.startedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Started</span>
                <span className="font-medium text-blue-600">{new Date(complaint.startedAt).toLocaleString()}</span>
              </div>
            )}
            {complaint.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-green-600">{new Date(complaint.completedAt).toLocaleString()}</span>
              </div>
            )}
            {complaint.startedAt && complaint.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-orange-600">
                  {(() => {
                    const diff = new Date(complaint.completedAt).getTime() - new Date(complaint.startedAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(mins / 60);
                    const remainMins = mins % 60;
                    if (hrs > 0) return `${hrs}h ${remainMins}m`;
                    return `${mins}m`;
                  })()}
                </span>
              </div>
            )}
            {complaint.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolved</span>
                <span className="font-medium">{new Date(complaint.resolvedAt).toLocaleString()}</span>
              </div>
            )}
            {complaint.description && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">Description</span>
                <p data-testid="text-description">{complaint.description}</p>
              </div>
            )}
            {complaint.resolutionNotes && (
              <div className="pt-2 border-t">
                <span className="text-muted-foreground block mb-1">Resolution Notes</span>
                <p data-testid="text-resolution-notes">{complaint.resolutionNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(complaint.status === "open" || complaint.status === "assigned") && (
              <Button onClick={() => setShowAssignDialog(true)} data-testid="button-assign">
                <UserCheck className="h-4 w-4 mr-1" />
                {complaint.assignedTo ? "Reassign" : "Assign Employee"}
              </Button>
            )}

            {complaint.status === "assigned" && (
              <Button
                variant="secondary"
                onClick={() => statusChangeMutation.mutate("in_progress")}
                disabled={statusChangeMutation.isPending}
                data-testid="button-start-progress"
              >
                <Clock className="h-4 w-4 mr-1" />
                Mark In Progress
              </Button>
            )}

            {(complaint.status === "assigned" || complaint.status === "in_progress") && (
              <Button
                variant="default"
                onClick={() => setShowCompleteDialog(true)}
                data-testid="button-complete"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Completed
              </Button>
            )}

            {complaint.status === "completed" && !complaint.feedback && (
              <Button onClick={() => setShowFeedbackDialog(true)} data-testid="button-feedback">
                <MessageSquare className="h-4 w-4 mr-1" />
                Add Feedback
              </Button>
            )}

            {!complaint.whatsappSentOpen && complaint.customer && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await apiRequest("PATCH", `/api/complaints/${complaint.id}/whatsapp-open`);
                    const data = await res.json();
                    if (data.whatsappSent) {
                      toast({ title: "WhatsApp message sent to customer" });
                    } else if (data.whatsappLink) {
                      window.open(data.whatsappLink, "_blank");
                    }
                    queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/complaints", complaintId] });
                  } catch (err) {
                    toast({ title: "Error sending WhatsApp message", variant: "destructive" });
                  }
                }}
                data-testid="button-whatsapp-open"
              >
                <Phone className="h-4 w-4 mr-1" />
                WhatsApp (Registration)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {complaint.feedback && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Customer Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground block">Agent Behavior</span>
                <div className="flex gap-0.5" data-testid="text-agent-rating">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= complaint.feedback!.agentRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  ))}
                  <span className="text-sm ml-1 font-medium">{complaint.feedback.agentRating}/5</span>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Service Quality</span>
                <div className="flex gap-0.5" data-testid="text-service-rating">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= complaint.feedback!.serviceRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  ))}
                  <span className="text-sm ml-1 font-medium">{complaint.feedback.serviceRating}/5</span>
                </div>
              </div>
            </div>
            {complaint.feedback.comments && (
              <div>
                <span className="text-sm text-muted-foreground">Comments</span>
                <p className="text-sm mt-1" data-testid="text-feedback-comments">{complaint.feedback.comments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ComplaintImagesSection complaintId={complaint.id} />

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {activeEmployees.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No active employees found. Please add employees first.
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)} data-testid={`option-employee-${emp.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{emp.firstName} {emp.lastName}</span>
                          <span className="text-muted-foreground text-xs">({emp.whatsappNumber || emp.contact})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Employee will receive a WhatsApp notification with customer details and complaint information.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!selectedEmployeeId || assignMutation.isPending}
              data-testid="button-save-assign"
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Resolution Notes (optional)</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="What was done to resolve the issue..."
                data-testid="input-resolution-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              data-testid="button-save-complete"
            >
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Complete & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent Behavior Rating</Label>
              <StarRating value={agentRating} onChange={setAgentRating} testIdPrefix="agent-rating" />
            </div>
            <div className="space-y-2">
              <Label>Service Quality Rating</Label>
              <StarRating value={serviceRating} onChange={setServiceRating} testIdPrefix="service-rating" />
            </div>
            <div className="space-y-2">
              <Label>Comments (optional)</Label>
              <Textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Customer comments about the service..."
                data-testid="input-feedback-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>Cancel</Button>
            <Button
              onClick={() => feedbackMutation.mutate()}
              disabled={agentRating === 0 || serviceRating === 0 || feedbackMutation.isPending}
              data-testid="button-save-feedback"
            >
              {feedbackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComplaintImagesSection({ complaintId }: { complaintId: number }) {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/complaints/${complaintId}/images`, { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setImages(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [complaintId]);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Agent Photos ({images.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img: any) => (
              <div
                key={img.id}
                className="cursor-pointer rounded-lg overflow-hidden border hover:border-blue-400 transition-colors"
                onClick={() => setSelectedImage(img.imagePath)}
              >
                <img
                  src={img.imagePath}
                  alt={img.caption || "Complaint photo"}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-gray-500">By: {img.uploadedBy}</p>
                  <p className="text-xs text-gray-400">{new Date(img.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size complaint photo"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
