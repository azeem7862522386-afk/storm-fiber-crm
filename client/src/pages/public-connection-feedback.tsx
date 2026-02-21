import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, CheckCircle, AlertTriangle, Wifi } from "lucide-react";

function StarRating({ value, onChange, testIdPrefix }: { value: number; onChange: (v: number) => void; testIdPrefix: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-1"
          data-testid={`${testIdPrefix}-star-${star}`}
        >
          <Star
            className={`h-8 w-8 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function PublicConnectionFeedbackPage() {
  const [, params] = useRoute("/connection-feedback/:token");
  const token = params?.token || "";
  const { toast } = useToast();

  const [fieldWorkerRating, setFieldWorkerRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery<{
    connectionRequestId: number;
    customerName: string;
    fieldWorkerName: string | null;
    hasFeedback: boolean;
  }>({
    queryKey: ["/api/public/connection-feedback", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/connection-feedback/${token}`);
      if (!res.ok) throw new Error((await res.json()).message || "Not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/connection-feedback/${token}`, {
        fieldWorkerRating,
        serviceRating,
        comments: comments || null,
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Thank you for your feedback!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6 space-y-3">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Link Invalid or Expired</h2>
            <p className="text-sm text-muted-foreground">
              This feedback link is not valid. It may have already been used or the connection request was not found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.hasFeedback || submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6 space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <h2 className="text-lg font-semibold" data-testid="text-thank-you">Thank You!</h2>
            <p className="text-sm text-muted-foreground">
              Your feedback has been submitted successfully. We appreciate your time and will use your feedback to improve our installation service.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Wifi className="h-4 w-4" />
              <span>Storm Fiber Pattoki</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="h-5 w-5" />
            <CardTitle className="text-lg">Storm Fiber Pattoki</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Installation Feedback</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">Connection #</span>
              <span className="font-medium" data-testid="text-connection-id">{data.connectionRequestId}</span>
            </div>
            <div className="flex justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium" data-testid="text-customer-name">{data.customerName}</span>
            </div>
            {data.fieldWorkerName && (
              <div className="flex justify-between flex-wrap gap-1">
                <span className="text-muted-foreground">Installed By</span>
                <span className="font-medium" data-testid="text-fieldworker-name">{data.fieldWorkerName}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-center">How was your installation experience?</p>

            <div className="space-y-2">
              <Label className="text-sm">Field Worker Behavior</Label>
              <div className="flex justify-center">
                <StarRating value={fieldWorkerRating} onChange={setFieldWorkerRating} testIdPrefix="public-fieldworker" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Installation Quality</Label>
              <div className="flex justify-center">
                <StarRating value={serviceRating} onChange={setServiceRating} testIdPrefix="public-service" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Comments (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts about the installation..."
                data-testid="input-public-comments"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => feedbackMutation.mutate()}
              disabled={fieldWorkerRating === 0 || serviceRating === 0 || feedbackMutation.isPending}
              data-testid="button-submit-connection-feedback"
            >
              {feedbackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Submit Feedback
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>Storm Fiber Pattoki</p>
            <p>Basement Soneri Bank, Alama Iqbal Road, Pattoki</p>
            <p>0307-8844421 | 0327-0223873</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
