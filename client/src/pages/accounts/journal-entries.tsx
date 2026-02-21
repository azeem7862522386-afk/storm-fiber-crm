import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { JournalEntryWithLines, ChartOfAccount } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookMarked, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

export default function JournalEntriesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<{ accountId: number; debit: number; credit: number; description: string }[]>([
    { accountId: 0, debit: 0, credit: 0, description: "" },
    { accountId: 0, debit: 0, credit: 0, description: "" },
  ]);

  const { data: entries = [], isLoading } = useQuery<JournalEntryWithLines[]>({
    queryKey: ["/api/journal-entries"],
  });

  const { data: accounts = [] } = useQuery<ChartOfAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/journal-entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      toast({ title: "Journal entry created" });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split("T")[0]);
    setMemo("");
    setLines([
      { accountId: 0, debit: 0, credit: 0, description: "" },
      { accountId: 0, debit: 0, credit: 0, description: "" },
    ]);
  };

  const addLine = () => setLines([...lines, { accountId: 0, debit: 0, credit: 0, description: "" }]);
  const removeLine = (i: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== i));
  };

  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = () => {
    if (!isBalanced) return;
    createMutation.mutate({
      entry: { entryDate, memo, sourceType: "manual" },
      lines: lines.filter((l) => l.accountId > 0),
    });
  };

  const sourceLabels: Record<string, string> = {
    invoice: "Invoice",
    payment: "Payment",
    expense: "Expense",
    adjustment: "Adjustment",
    opening_balance: "Opening Balance",
    manual: "Manual",
  };

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Journal Entries</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-journal">
              <Plus className="h-4 w-4 mr-1" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Date</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} data-testid="input-entry-date" />
                </div>
              </div>
              <div>
                <Label>Memo</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Description of this entry" data-testid="input-entry-memo" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lines</Label>
                  <Button size="sm" variant="outline" onClick={addLine} data-testid="button-add-line">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Line
                  </Button>
                </div>
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {i === 0 && <Label className="text-xs">Account</Label>}
                      <Select value={String(line.accountId)} onValueChange={(v) => updateLine(i, "accountId", Number(v))}>
                        <SelectTrigger data-testid={`select-line-account-${i}`}>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      {i === 0 && <Label className="text-xs">Debit</Label>}
                      <Input
                        type="number"
                        value={line.debit || ""}
                        onChange={(e) => updateLine(i, "debit", Number(e.target.value) || 0)}
                        placeholder="0"
                        data-testid={`input-line-debit-${i}`}
                      />
                    </div>
                    <div className="w-24">
                      {i === 0 && <Label className="text-xs">Credit</Label>}
                      <Input
                        type="number"
                        value={line.credit || ""}
                        onChange={(e) => updateLine(i, "credit", Number(e.target.value) || 0)}
                        placeholder="0"
                        data-testid={`input-line-credit-${i}`}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLine(i)} disabled={lines.length <= 2}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end gap-4 text-sm font-medium border-t pt-2">
                  <span>Total Debit: {formatRs(totalDebit)}</span>
                  <span>Total Credit: {formatRs(totalCredit)}</span>
                  {!isBalanced && totalDebit + totalCredit > 0 && (
                    <span className="text-destructive">Not balanced!</span>
                  )}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!isBalanced || !memo || createMutation.isPending}
                data-testid="button-save-journal"
              >
                {createMutation.isPending ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No journal entries yet. Create manual entries or they will be auto-posted from billing and payments.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const totalD = entry.lines.reduce((s, l) => s + l.debit, 0);
            return (
              <Card key={entry.id} data-testid={`card-journal-${entry.id}`}>
                <div
                  className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover-elevate"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  data-testid={`button-expand-journal-${entry.id}`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-mono text-sm text-muted-foreground">JE-{String(entry.id).padStart(4, "0")}</span>
                    <span className="text-sm font-medium">{entry.memo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="no-default-hover-elevate no-default-active-elevate" variant="secondary">
                      {sourceLabels[entry.sourceType] || entry.sourceType}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{entry.entryDate}</span>
                    <span className="text-sm font-medium">{formatRs(totalD)}</span>
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="pt-0 pb-3">
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-3 py-2">Account</th>
                            <th className="text-left px-3 py-2">Description</th>
                            <th className="text-right px-3 py-2">Debit</th>
                            <th className="text-right px-3 py-2">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="border-t">
                              <td className="px-3 py-2">
                                <span className="font-mono text-xs text-muted-foreground mr-2">{line.account?.code}</span>
                                {line.account?.name}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{line.description}</td>
                              <td className="px-3 py-2 text-right">{line.debit > 0 ? formatRs(line.debit) : ""}</td>
                              <td className="px-3 py-2 text-right">{line.credit > 0 ? formatRs(line.credit) : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
