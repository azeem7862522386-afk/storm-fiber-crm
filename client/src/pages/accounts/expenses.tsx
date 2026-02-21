import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ExpenseWithVendor, Vendor } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Wallet, Trash2 } from "lucide-react";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  bandwidth: "Bandwidth",
  infrastructure: "Infrastructure",
  salary: "Salary",
  commission: "Commission",
  maintenance: "Maintenance",
  office: "Office",
  utilities: "Utilities",
  other: "Other",
};

export default function ExpensesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [vendorId, setVendorId] = useState("");

  const { data: expenses = [], isLoading } = useQuery<ExpenseWithVendor[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      toast({ title: "Expense recorded" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  const resetForm = () => {
    setCategory("other");
    setDescription("");
    setAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("cash");
    setReference("");
    setVendorId("");
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Expenses</h1>
          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
            Total: {formatRs(totalExpenses)}
          </Badge>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-1" />
              Record Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this expense for?" data-testid="input-expense-description" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Amount (Rs.)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-testid="input-expense-amount" />
                </div>
                <div className="flex-1">
                  <Label>Date</Label>
                  <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} data-testid="input-expense-date" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger data-testid="select-expense-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Reference</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" data-testid="input-expense-reference" />
                </div>
              </div>
              <div>
                <Label>Vendor (Optional)</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger data-testid="select-expense-vendor">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({
                  category,
                  description,
                  amount: Number(amount),
                  expenseDate,
                  paymentMethod,
                  reference: reference || null,
                  vendorId: vendorId && vendorId !== "none" ? Number(vendorId) : null,
                })}
                disabled={!description || !amount || Number(amount) <= 0 || createMutation.isPending}
                data-testid="button-save-expense"
              >
                {createMutation.isPending ? "Saving..." : "Save Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No expenses recorded yet. Click "Record Expense" to add your first expense.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-left px-4 py-3">Vendor</th>
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-b" data-testid={`row-expense-${exp.id}`}>
                      <td className="px-4 py-3">{exp.expenseDate}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{exp.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{exp.vendor?.name || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{exp.paymentMethod?.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatRs(exp.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(exp.id)} data-testid={`button-delete-expense-${exp.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={5} className="px-4 py-3 text-right">Total</td>
                    <td className="px-4 py-3 text-right">{formatRs(totalExpenses)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
