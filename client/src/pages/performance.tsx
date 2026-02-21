import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  PerformanceCycle,
  PerformanceReviewWithRelations,
  Employee,
} from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Loader2, Pencil } from "lucide-react";

const ratingOptions = [
  { value: "outstanding", label: "Outstanding" },
  { value: "exceeds_expectations", label: "Exceeds Expectations" },
  { value: "meets_expectations", label: "Meets Expectations" },
  { value: "needs_improvement", label: "Needs Improvement" },
  { value: "unsatisfactory", label: "Unsatisfactory" },
];

function getRatingBadgeClass(rating: string | null): string {
  switch (rating) {
    case "outstanding":
      return "bg-green-600 text-white";
    case "exceeds_expectations":
      return "bg-blue-600 text-white";
    case "meets_expectations":
      return "bg-yellow-500 text-white";
    case "needs_improvement":
      return "bg-orange-500 text-white";
    case "unsatisfactory":
      return "bg-red-600 text-white";
    default:
      return "";
  }
}

function getRatingLabel(rating: string | null): string {
  const opt = ratingOptions.find((o) => o.value === rating);
  return opt ? opt.label : rating || "N/A";
}

export default function PerformancePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cycles");

  const [showCycleDialog, setShowCycleDialog] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PerformanceCycle | null>(null);
  const [cycleName, setCycleName] = useState("");
  const [cycleStartDate, setCycleStartDate] = useState("");
  const [cycleEndDate, setCycleEndDate] = useState("");
  const [cycleIsActive, setCycleIsActive] = useState(true);

  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReviewWithRelations | null>(null);
  const [reviewCycleId, setReviewCycleId] = useState("");
  const [reviewEmployeeId, setReviewEmployeeId] = useState("");
  const [reviewGoals, setReviewGoals] = useState("");
  const [reviewSelfAssessment, setReviewSelfAssessment] = useState("");
  const [reviewManagerComments, setReviewManagerComments] = useState("");
  const [reviewRating, setReviewRating] = useState("");

  const [filterCycleId, setFilterCycleId] = useState("");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");

  const { data: cycles = [], isLoading: cyclesLoading } = useQuery<PerformanceCycle[]>({
    queryKey: ["/api/performance/cycles"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const reviewsQueryKey = ["/api/performance/reviews", filterCycleId, filterEmployeeId];
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<PerformanceReviewWithRelations[]>({
    queryKey: reviewsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCycleId) params.set("cycleId", filterCycleId);
      if (filterEmployeeId) params.set("employeeId", filterEmployeeId);
      const url = `/api/performance/reviews${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: async (data: { name: string; startDate: string; endDate: string; isActive: boolean }) => {
      const res = await apiRequest("POST", "/api/performance/cycles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/cycles"] });
      closeCycleDialog();
      toast({ title: "Performance cycle added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCycleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; startDate: string; endDate: string; isActive: boolean }> }) => {
      const res = await apiRequest("PATCH", `/api/performance/cycles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/cycles"] });
      closeCycleDialog();
      toast({ title: "Performance cycle updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { cycleId: number; employeeId: number; goals?: string; selfAssessment?: string; managerComments?: string; rating?: string }) => {
      const res = await apiRequest("POST", "/api/performance/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/reviews"] });
      closeReviewDialog();
      toast({ title: "Performance review added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/performance/reviews/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance/reviews"] });
      closeReviewDialog();
      toast({ title: "Performance review updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function closeCycleDialog() {
    setShowCycleDialog(false);
    setEditingCycle(null);
    setCycleName("");
    setCycleStartDate("");
    setCycleEndDate("");
    setCycleIsActive(true);
  }

  function openEditCycle(cycle: PerformanceCycle) {
    setEditingCycle(cycle);
    setCycleName(cycle.name);
    setCycleStartDate(cycle.startDate);
    setCycleEndDate(cycle.endDate);
    setCycleIsActive(cycle.isActive);
    setShowCycleDialog(true);
  }

  function handleCycleSubmit() {
    if (!cycleName.trim() || !cycleStartDate || !cycleEndDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingCycle) {
      updateCycleMutation.mutate({ id: editingCycle.id, data: { name: cycleName, startDate: cycleStartDate, endDate: cycleEndDate, isActive: cycleIsActive } });
    } else {
      createCycleMutation.mutate({ name: cycleName, startDate: cycleStartDate, endDate: cycleEndDate, isActive: cycleIsActive });
    }
  }

  function closeReviewDialog() {
    setShowReviewDialog(false);
    setEditingReview(null);
    setReviewCycleId("");
    setReviewEmployeeId("");
    setReviewGoals("");
    setReviewSelfAssessment("");
    setReviewManagerComments("");
    setReviewRating("");
  }

  function openEditReview(review: PerformanceReviewWithRelations) {
    setEditingReview(review);
    setReviewCycleId(String(review.cycleId));
    setReviewEmployeeId(String(review.employeeId));
    setReviewGoals(review.goals || "");
    setReviewSelfAssessment(review.selfAssessment || "");
    setReviewManagerComments(review.managerComments || "");
    setReviewRating(review.rating || "");
    setShowReviewDialog(true);
  }

  function handleReviewSubmit() {
    if (!reviewCycleId || !reviewEmployeeId) {
      toast({ title: "Please select cycle and employee", variant: "destructive" });
      return;
    }
    const data: Record<string, unknown> = {
      cycleId: Number(reviewCycleId),
      employeeId: Number(reviewEmployeeId),
      goals: reviewGoals || null,
      selfAssessment: reviewSelfAssessment || null,
      managerComments: reviewManagerComments || null,
      rating: reviewRating || null,
    };
    if (editingReview) {
      updateReviewMutation.mutate({ id: editingReview.id, data });
    } else {
      createReviewMutation.mutate(data as { cycleId: number; employeeId: number });
    }
  }

  const cyclePending = createCycleMutation.isPending || updateCycleMutation.isPending;
  const reviewPending = createReviewMutation.isPending || updateReviewMutation.isPending;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Performance Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-performance">
          <TabsTrigger value="cycles" data-testid="tab-cycles">Performance Cycles</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="cycles" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCycleDialog(true)} data-testid="button-add-cycle">
              <Plus className="h-4 w-4 mr-1" />
              Add Cycle
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {cyclesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading cycles...</div>
              ) : cycles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No performance cycles yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Name</th>
                        <th className="text-left px-4 py-3">Start Date</th>
                        <th className="text-left px-4 py-3">End Date</th>
                        <th className="text-left px-4 py-3">Active</th>
                        <th className="text-left px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycles.map((cycle) => (
                        <tr key={cycle.id} className="border-b" data-testid={`row-cycle-${cycle.id}`}>
                          <td className="px-4 py-2 font-medium" data-testid={`text-cycle-name-${cycle.id}`}>{cycle.name}</td>
                          <td className="px-4 py-2" data-testid={`text-cycle-start-${cycle.id}`}>{cycle.startDate}</td>
                          <td className="px-4 py-2" data-testid={`text-cycle-end-${cycle.id}`}>{cycle.endDate}</td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={cycle.isActive ? "default" : "secondary"}
                              className="no-default-hover-elevate no-default-active-elevate"
                              data-testid={`badge-cycle-active-${cycle.id}`}
                            >
                              {cycle.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditCycle(cycle)}
                              data-testid={`button-edit-cycle-${cycle.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterCycleId} onValueChange={setFilterCycleId}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-cycle">
                  <SelectValue placeholder="All Cycles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
                <SelectTrigger className="w-[200px]" data-testid="select-filter-employee">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowReviewDialog(true)} data-testid="button-add-review">
              <Plus className="h-4 w-4 mr-1" />
              Add Review
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {reviewsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No reviews found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Employee</th>
                        <th className="text-left px-4 py-3">Cycle</th>
                        <th className="text-left px-4 py-3">Goals</th>
                        <th className="text-left px-4 py-3">Self Assessment</th>
                        <th className="text-left px-4 py-3">Manager Comments</th>
                        <th className="text-left px-4 py-3">Rating</th>
                        <th className="text-left px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((review) => (
                        <tr key={review.id} className="border-b" data-testid={`row-review-${review.id}`}>
                          <td className="px-4 py-2 font-medium" data-testid={`text-review-employee-${review.id}`}>
                            {review.employee?.firstName} {review.employee?.lastName}
                          </td>
                          <td className="px-4 py-2" data-testid={`text-review-cycle-${review.id}`}>
                            {review.cycle?.name}
                          </td>
                          <td className="px-4 py-2 max-w-[150px] truncate" data-testid={`text-review-goals-${review.id}`}>
                            {review.goals || "-"}
                          </td>
                          <td className="px-4 py-2 max-w-[150px] truncate" data-testid={`text-review-self-${review.id}`}>
                            {review.selfAssessment || "-"}
                          </td>
                          <td className="px-4 py-2 max-w-[150px] truncate" data-testid={`text-review-comments-${review.id}`}>
                            {review.managerComments || "-"}
                          </td>
                          <td className="px-4 py-2">
                            {review.rating ? (
                              <Badge className={`no-default-hover-elevate no-default-active-elevate ${getRatingBadgeClass(review.rating)}`} data-testid={`badge-review-rating-${review.id}`}>
                                {getRatingLabel(review.rating)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground" data-testid={`text-review-no-rating-${review.id}`}>Not Rated</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditReview(review)}
                              data-testid={`button-edit-review-${review.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCycleDialog} onOpenChange={(open) => { if (!open) closeCycleDialog(); else setShowCycleDialog(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCycle ? "Edit Cycle" : "Add Performance Cycle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="e.g., Q1 2026" data-testid="input-cycle-name" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={cycleStartDate} onChange={(e) => setCycleStartDate(e.target.value)} data-testid="input-cycle-start-date" />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={cycleEndDate} onChange={(e) => setCycleEndDate(e.target.value)} data-testid="input-cycle-end-date" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={cycleIsActive} onChange={(e) => setCycleIsActive(e.target.checked)} id="cycle-active" data-testid="checkbox-cycle-active" />
              <Label htmlFor="cycle-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCycleDialog} data-testid="button-cancel-cycle">Cancel</Button>
            <Button onClick={handleCycleSubmit} disabled={cyclePending} data-testid="button-save-cycle">
              {cyclePending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCycle ? "Update" : "Add Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={(open) => { if (!open) closeReviewDialog(); else setShowReviewDialog(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReview ? "Edit Review" : "Add Performance Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cycle</Label>
              <Select value={reviewCycleId} onValueChange={setReviewCycleId}>
                <SelectTrigger data-testid="select-review-cycle">
                  <SelectValue placeholder="Select Cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={reviewEmployeeId} onValueChange={setReviewEmployeeId}>
                <SelectTrigger data-testid="select-review-employee">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Goals</Label>
              <Textarea value={reviewGoals} onChange={(e) => setReviewGoals(e.target.value)} placeholder="Employee goals..." data-testid="textarea-review-goals" />
            </div>
            <div className="space-y-2">
              <Label>Self Assessment</Label>
              <Textarea value={reviewSelfAssessment} onChange={(e) => setReviewSelfAssessment(e.target.value)} placeholder="Self assessment..." data-testid="textarea-review-self-assessment" />
            </div>
            <div className="space-y-2">
              <Label>Manager Comments</Label>
              <Textarea value={reviewManagerComments} onChange={(e) => setReviewManagerComments(e.target.value)} placeholder="Manager comments..." data-testid="textarea-review-manager-comments" />
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={reviewRating} onValueChange={setReviewRating}>
                <SelectTrigger data-testid="select-review-rating">
                  <SelectValue placeholder="Select Rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReviewDialog} data-testid="button-cancel-review">Cancel</Button>
            <Button onClick={handleReviewSubmit} disabled={reviewPending} data-testid="button-save-review">
              {reviewPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingReview ? "Update" : "Add Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
