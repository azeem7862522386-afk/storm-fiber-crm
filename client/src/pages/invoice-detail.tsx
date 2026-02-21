import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Receipt,
  User,
  Loader2,
  CreditCard,
  DollarSign,
  Calendar,
  Wifi,
  Plus,
  Phone,
  MessageCircle,
  Check,
  Minus,
  Printer,
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InvoiceStatusBadge, PaymentMethodBadge } from "@/components/invoice-status-badge";
import type { InvoiceWithRelations } from "@shared/schema";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: "",
    method: "cash",
    collectedBy: "",
    reference: "",
    notes: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    discountAmount: "",
    penaltyAmount: "",
  });

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.id],
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments", {
        invoiceId: Number(params.id),
        customerId: invoice!.customerId,
        amount: parseInt(payForm.amount),
        method: payForm.method,
        collectedBy: payForm.collectedBy,
        reference: payForm.reference || null,
        notes: payForm.notes || null,
        whatsappSent: false,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setPaymentOpen(false);
      setPayForm({ amount: "", method: "cash", collectedBy: "", reference: "", notes: "" });

      if (data.whatsappSent) {
        apiRequest("PATCH", `/api/payments/${data.payment.id}/whatsapp-sent`);
        toast({ title: "Payment Recorded", description: "WhatsApp receipt sent to customer" });
      } else if (data.whatsappLink) {
        toast({ title: "Payment Recorded", description: "Opening WhatsApp to notify the customer..." });
        window.open(data.whatsappLink, "_blank");
        apiRequest("PATCH", `/api/payments/${data.payment.id}/whatsapp-sent`);
      } else {
        toast({ title: "Payment Recorded", description: "Payment has been saved successfully." });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (adjustForm.discountAmount) body.discountAmount = parseInt(adjustForm.discountAmount);
      if (adjustForm.penaltyAmount) body.penaltyAmount = parseInt(adjustForm.penaltyAmount);
      const res = await apiRequest("PATCH", `/api/invoices/${params.id}/adjustment`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/stats"] });
      setAdjustOpen(false);
      setAdjustForm({ discountAmount: "", penaltyAmount: "" });
      toast({ title: "Invoice Updated", description: "Discount/penalty applied." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const voidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/invoices/${params.id}`, { status: "void" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/stats"] });
      toast({ title: "Invoice Voided" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Invoice not found</p>
        <Link href="/billing">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Billing
          </Button>
        </Link>
      </div>
    );
  }

  const remaining = invoice.totalAmount - invoice.paidAmount;
  const canPay = invoice.status !== "paid" && invoice.status !== "void";

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/billing")}
            data-testid="button-back-to-billing"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-invoice-title">
                Invoice #{invoice.id}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.customer.name} - {invoice.periodStart} to {invoice.periodEnd}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canPay && (
            <>
              <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-adjust-invoice">
                    <Minus className="mr-2 h-4 w-4" /> Adjust
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adjust Invoice</DialogTitle>
                    <DialogDescription>Apply discount or late payment penalty.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Discount (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adjustForm.discountAmount}
                        onChange={(e) => setAdjustForm((p) => ({ ...p, discountAmount: e.target.value }))}
                        data-testid="input-discount"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Late Penalty (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={adjustForm.penaltyAmount}
                        onChange={(e) => setAdjustForm((p) => ({ ...p, penaltyAmount: e.target.value }))}
                        data-testid="input-penalty"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => adjustMutation.mutate()}
                      disabled={adjustMutation.isPending}
                      data-testid="button-apply-adjustment"
                    >
                      {adjustMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply Adjustment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-record-payment">
                    <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Remaining balance: Rs. {remaining.toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount (Rs.)</label>
                      <Input
                        type="number"
                        placeholder={remaining.toString()}
                        value={payForm.amount}
                        onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                        data-testid="input-payment-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Method</label>
                      <Select
                        value={payForm.method}
                        onValueChange={(v) => setPayForm((p) => ({ ...p, method: v }))}
                      >
                        <SelectTrigger data-testid="select-payment-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money (JazzCash/EasyPaisa)</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Collected By</label>
                      <Input
                        placeholder="Name of person collecting payment"
                        value={payForm.collectedBy}
                        onChange={(e) => setPayForm((p) => ({ ...p, collectedBy: e.target.value }))}
                        data-testid="input-collected-by"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reference (optional)</label>
                      <Input
                        placeholder="Transaction ID, receipt number..."
                        value={payForm.reference}
                        onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                        data-testid="input-payment-reference"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (optional)</label>
                      <Textarea
                        placeholder="Any additional notes..."
                        value={payForm.notes}
                        onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
                        className="resize-none"
                        data-testid="input-payment-notes"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => paymentMutation.mutate()}
                      disabled={paymentMutation.isPending || !payForm.amount || !payForm.collectedBy}
                      data-testid="button-submit-payment"
                    >
                      {paymentMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="mr-2 h-4 w-4" />
                      )}
                      Record Payment & Send WhatsApp
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {invoice.status !== "void" && invoice.status !== "paid" && (
            <Button
              variant="outline"
              onClick={() => voidMutation.mutate()}
              disabled={voidMutation.isPending}
              data-testid="button-void-invoice"
            >
              Void
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              <div className="min-w-0">
                <p className="text-sm font-medium" data-testid="text-invoice-customer">{invoice.customer.name}</p>
                <p className="text-xs text-muted-foreground">{invoice.customer.contact}</p>
                <p className="text-xs text-muted-foreground truncate">{invoice.customer.address}</p>
              </div>
            </div>

            <Separator />

            {invoice.plan && (
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{invoice.plan.name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.plan.speed}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm">Period: {invoice.periodStart} to {invoice.periodEnd}</p>
                <p className="text-xs text-muted-foreground">Due: {invoice.dueDate}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span>Rs. {invoice.baseAmount.toLocaleString()}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-emerald-600 dark:text-emerald-400">- Rs. {invoice.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {invoice.penaltyAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Late Penalty</span>
                  <span className="text-red-600 dark:text-red-400">+ Rs. {invoice.penaltyAmount.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span data-testid="text-invoice-total">Rs. {invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="text-emerald-600 dark:text-emerald-400" data-testid="text-invoice-paid">
                  Rs. {invoice.paidAmount.toLocaleString()}
                </span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm font-semibold">
                  <span>Remaining</span>
                  <span className="text-amber-600 dark:text-amber-400" data-testid="text-invoice-remaining">
                    Rs. {remaining.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {invoice.isProRata && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  {invoice.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No payments recorded yet</p>
                {canPay && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setPaymentOpen(true)}
                    data-testid="button-record-first-payment"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Record Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="hidden md:table-cell">Collected By</TableHead>
                      <TableHead className="hidden lg:table-cell">Reference</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments
                      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
                      .map((payment) => {
                        return (
                          <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                            <TableCell className="text-sm">
                              {new Date(payment.receivedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              Rs. {payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <PaymentMethodBadge method={payment.method} />
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {payment.collectedBy}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {payment.reference || "-"}
                            </TableCell>
                            <TableCell>
                              {payment.whatsappSent ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                  <Check className="h-3 w-3" /> Sent
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const res = await apiRequest("PATCH", `/api/payments/${payment.id}/whatsapp-sent`);
                                      const data = await res.json();
                                      if (data.whatsappSent) {
                                        toast({ title: "WhatsApp receipt sent to customer" });
                                      } else if (data.whatsappLink) {
                                        window.open(data.whatsappLink, "_blank");
                                      }
                                      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
                                    } catch (err) {
                                      toast({ title: "Error sending WhatsApp", variant: "destructive" });
                                    }
                                  }}
                                  data-testid={`button-whatsapp-${payment.id}`}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <Link href={`/receipt/${invoice.id}/${payment.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-receipt-${payment.id}`}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
