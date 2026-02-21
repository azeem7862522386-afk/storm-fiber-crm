import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReceivableWithPayments, ReceivablePayment } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, HandCoins, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Banknote } from "lucide-react";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "received":
      return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Received</Badge>;
    case "overdue":
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
    case "cancelled":
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function ReceivableCard({ item, onEdit, onDelete, invalidate }: {
  item: ReceivableWithPayments;
  onEdit: () => void;
  onDelete: () => void;
  invalidate: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  const addPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/receivables/${item.id}/payments`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      setPayAmount("");
      setPayNotes("");
      setPayDate(new Date().toISOString().split("T")[0]);
      toast({ title: "Payment recorded" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/receivable-payments/${id}`);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Payment removed" });
    },
  });

  const handleAddPayment = () => {
    const amt = parseInt(payAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (amt > item.remaining) {
      toast({ title: `Amount exceeds remaining balance (${formatRs(item.remaining)})`, variant: "destructive" });
      return;
    }
    addPaymentMutation.mutate({
      amount: amt,
      date: payDate,
      method: payMethod,
      notes: payNotes.trim() || null,
    });
  };

  const progressPercent = item.amount > 0 ? Math.min(100, Math.round((item.totalPaid / item.amount) * 100)) : 0;

  return (
    <Card data-testid={`card-receivable-${item.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base" data-testid={`text-person-${item.id}`}>{item.personName}</span>
              {getStatusBadge(item.status)}
            </div>
            <p className="text-sm text-muted-foreground" data-testid={`text-desc-${item.id}`}>{item.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Expected: {item.expectedDate}</span>
              {item.receivedDate && <span>Received: {item.receivedDate}</span>}
              {item.contact && <span>Contact: {item.contact}</span>}
            </div>
            {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit" data-testid={`button-edit-${item.id}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Delete" data-testid={`button-delete-${item.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total Amount</div>
            <div className="font-bold" data-testid={`text-total-${item.id}`}>{formatRs(item.amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-bold text-green-600" data-testid={`text-paid-${item.id}`}>{formatRs(item.totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-bold text-destructive" data-testid={`text-remaining-${item.id}`}>{formatRs(item.remaining)}</div>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
            data-testid={`progress-${item.id}`}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right">{progressPercent}% recovered</div>

        {item.status !== "received" && item.status !== "cancelled" && (
          <div className="border rounded-md p-3 space-y-2">
            <div className="text-sm font-medium flex items-center gap-1">
              <Banknote className="h-4 w-4" />
              Add Installment Payment
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                data-testid={`input-pay-amount-${item.id}`}
              />
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                data-testid={`input-pay-date-${item.id}`}
              />
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger data-testid={`select-pay-method-${item.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="mobile">Mobile Money</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddPayment}
                disabled={addPaymentMutation.isPending}
                data-testid={`button-add-payment-${item.id}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <Input
              placeholder="Payment notes (optional)"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              data-testid={`input-pay-notes-${item.id}`}
            />
          </div>
        )}

        {item.payments && item.payments.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full justify-between"
              data-testid={`button-toggle-payments-${item.id}`}
            >
              <span>Payment History ({item.payments.length} payments)</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {expanded && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Notes</span>
                  <span></span>
                </div>
                {item.payments.map((p: ReceivablePayment) => (
                  <div key={p.id} className="grid grid-cols-5 gap-2 items-center text-sm px-2 py-1 border rounded" data-testid={`payment-row-${p.id}`}>
                    <span>{p.date}</span>
                    <span className="font-medium text-green-600">{formatRs(p.amount)}</span>
                    <span className="capitalize">{p.method || "cash"}</span>
                    <span className="text-muted-foreground text-xs truncate">{p.notes || "-"}</span>
                    <div className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deletePaymentMutation.mutate(p.id)}
                        aria-label="Remove payment"
                        data-testid={`button-delete-payment-${p.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReceivablesPage() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceivableWithPayments | null>(null);

  const [personName, setPersonName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  const qs = filterStatus !== "all" ? `?status=${filterStatus}` : "";

  const { data: receivables = [], isLoading } = useQuery<ReceivableWithPayments[]>({
    queryKey: ["/api/receivables", qs],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/receivables", data);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      resetForm();
      setDialogOpen(false);
      toast({ title: "Receivable added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/receivables/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      resetForm();
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Receivable updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/receivables/${id}`);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Receivable deleted" });
    },
  });

  const resetForm = () => {
    setPersonName("");
    setDescription("");
    setAmount("");
    setExpectedDate("");
    setReceivedDate("");
    setStatus("pending");
    setContact("");
    setNotes("");
  };

  const openEdit = (item: ReceivableWithPayments) => {
    setEditingItem(item);
    setPersonName(item.personName);
    setDescription(item.description);
    setAmount(String(item.amount));
    setExpectedDate(item.expectedDate);
    setReceivedDate(item.receivedDate || "");
    setStatus(item.status);
    setContact(item.contact || "");
    setNotes(item.notes || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!personName.trim() || !description.trim() || !amount || !expectedDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const data = {
      personName: personName.trim(),
      description: description.trim(),
      amount: parseInt(amount),
      expectedDate,
      receivedDate: receivedDate || null,
      status,
      contact: contact.trim() || null,
      notes: notes.trim() || null,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const totalAmount = receivables.filter(r => r.status !== "cancelled").reduce((s, r) => s + r.amount, 0);
  const totalPaid = receivables.reduce((s, r) => s + (r.totalPaid || 0), 0);
  const totalRemaining = receivables.filter(r => r.status !== "cancelled" && r.status !== "received").reduce((s, r) => s + (r.remaining || 0), 0);

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <HandCoins className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Receivables / Recovery</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) { resetForm(); setEditingItem(null); }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-receivable">
              <Plus className="h-4 w-4 mr-1" />
              Add Receivable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Receivable" : "Add New Receivable"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Person Name *</label>
                <Input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Person or company name"
                  data-testid="input-person-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description *</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this amount for?"
                  data-testid="input-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Amount (Rs.) *</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    data-testid="input-amount"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Expected Date *</label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    data-testid="input-expected-date"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Received Date</label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    data-testid="input-received-date"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Contact</label>
                <Input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone number"
                  data-testid="input-contact"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="resize-none"
                  data-testid="input-notes"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-receivable"
              >
                {editingItem ? "Update" : "Add"} Receivable
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Receivable</div>
            <div className="text-xl font-bold" data-testid="text-total-amount">{formatRs(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Recovered</div>
            <div className="text-xl font-bold text-green-600" data-testid="text-total-paid">{formatRs(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-xl font-bold text-destructive" data-testid="text-total-remaining">{formatRs(totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : receivables.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No receivables found. Add one to start tracking amounts to be received.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receivables.map((item) => (
            <ReceivableCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => deleteMutation.mutate(item.id)}
              invalidate={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
