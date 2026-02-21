import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
  Loader2,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Cable,
} from "lucide-react";

interface FeedbackItem {
  id: number;
  type: "complaint" | "connection";
  complaintId?: number;
  connectionRequestId?: number;
  complaintType?: string;
  customerName: string;
  agentRating?: number;
  fieldWorkerRating?: number;
  serviceRating: number;
  comments: string | null;
  createdAt: string;
}

interface EmployeeFeedbackData {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  totalComplaints: number;
  totalConnections: number;
  feedbackCount: number;
  avgRating: number;
  avgServiceRating: number;
  feedbacks: FeedbackItem[];
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

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export default function EmployeeFeedbackPage() {
  const [search, setSearch] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  const { data: feedbackData = [], isLoading } = useQuery<EmployeeFeedbackData[]>({
    queryKey: ["/api/employee-feedback"],
  });

  const filtered = feedbackData.filter(
    (emp) =>
      emp.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalFeedbacks = feedbackData.reduce((sum, e) => sum + e.feedbackCount, 0);
  const overallAvg =
    feedbackData.length > 0
      ? Math.round(
          (feedbackData.reduce((sum, e) => sum + e.avgRating * e.feedbackCount, 0) /
            Math.max(totalFeedbacks, 1)) *
            10
        ) / 10
      : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600 p-6 md:p-8 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Employee Feedback
          </h1>
          <p className="text-amber-100/80 mt-1">Customer ratings and comments for employees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-blue-800" data-testid="text-total-employees">
                  {feedbackData.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Feedbacks</p>
                <p className="text-2xl font-bold text-green-800" data-testid="text-total-feedbacks">
                  {totalFeedbacks}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all hover:scale-[1.02]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Overall Avg Rating</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-yellow-800" data-testid="text-avg-rating">
                    {overallAvg}
                  </p>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employee name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-employee"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No employee feedback found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((emp) => (
            <Card key={emp.employeeId} className="overflow-hidden" data-testid={`card-employee-${emp.employeeId}`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setExpandedEmployee(expandedEmployee === emp.employeeId ? null : emp.employeeId)
                }
                data-testid={`button-expand-${emp.employeeId}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {emp.employeeName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold" data-testid={`text-employee-name-${emp.employeeId}`}>
                      {emp.employeeName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{emp.employeeCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center hidden md:block">
                    <p className="text-xs text-muted-foreground">Complaints</p>
                    <p className="font-semibold">{emp.totalComplaints}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-xs text-muted-foreground">Connections</p>
                    <p className="font-semibold">{emp.totalConnections}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Feedbacks</p>
                    <Badge variant={emp.feedbackCount > 0 ? "default" : "secondary"}>
                      {emp.feedbackCount}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-yellow-600">{emp.avgRating}</span>
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  {expandedEmployee === emp.employeeId ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedEmployee === emp.employeeId && (
                <div className="border-t">
                  {emp.feedbacks.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <p>No feedback received yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {emp.feedbacks.map((fb) => (
                        <div key={`${fb.type}-${fb.id}`} className="p-4 hover:bg-muted/30" data-testid={`feedback-item-${fb.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {fb.type === "complaint" ? (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Complaint #{fb.complaintId}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                    <Cable className="h-3 w-3 mr-1" />
                                    Connection #{fb.connectionRequestId}
                                  </Badge>
                                )}
                                {fb.complaintType && (
                                  <Badge variant="secondary">
                                    {complaintTypeLabels[fb.complaintType] || fb.complaintType}
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {new Date(fb.createdAt).toLocaleDateString("en-PK")}
                                </span>
                              </div>
                              <p className="text-sm font-medium mb-1">Customer: {fb.customerName}</p>
                              <div className="flex items-center gap-4 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {fb.type === "complaint" ? "Agent" : "Worker"} Rating:
                                  </span>
                                  <StarRating rating={fb.agentRating || fb.fieldWorkerRating || 0} size={14} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Service:</span>
                                  <StarRating rating={fb.serviceRating} size={14} />
                                </div>
                              </div>
                              {fb.comments && (
                                <div className="mt-2 bg-muted/50 rounded-lg p-3">
                                  <p className="text-sm italic text-muted-foreground">"{fb.comments}"</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
