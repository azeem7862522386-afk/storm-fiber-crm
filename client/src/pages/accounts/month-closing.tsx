import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MonthClosing, MonthClosingSideEntry, Receivable, DailyEntryWithRelations } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Download, Printer, Pencil, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

function formatNum(n: number) {
  if (n === 0) return "-";
  return n.toLocaleString();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

export default function MonthClosingPage() {
  const { toast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  const [newRecName, setNewRecName] = useState("");
  const [newRecAmount, setNewRecAmount] = useState("");
  const [newExtraName, setNewExtraName] = useState("");
  const [newExtraAmount, setNewExtraAmount] = useState("");
  const [editingBalance, setEditingBalance] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DailyEntryWithRelations | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", description: "", type: "expense" as string });

  const { data: closing } = useQuery<MonthClosing & { openingBalance: number }>({
    queryKey: ["/api/month-closing", selectedMonth],
  });

  const { data: dailySummary = [] } = useQuery<{ date: string; income: number; expense: number }[]>({
    queryKey: ["/api/month-closing", selectedMonth, "summary"],
  });

  const { data: sideEntries = [] } = useQuery<MonthClosingSideEntry[]>({
    queryKey: ["/api/month-closing", selectedMonth, "side-entries"],
  });

  const { data: pendingReceivables = [] } = useQuery<Receivable[]>({
    queryKey: ["/api/receivables", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/receivables?status=pending", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load receivables");
      return res.json();
    },
  });

  const { data: dayEntries = [], isLoading: dayEntriesLoading } = useQuery<DailyEntryWithRelations[]>({
    queryKey: ["/api/daily-entries", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-entries?date=${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load entries");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/month-closing"] });
  };

  const invalidateDay = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/daily-entries", selectedDate] });
    invalidateAll();
  };

  const upsertMutation = useMutation({
    mutationFn: async (data: { month: string; openingBalance: number }) => {
      const res = await apiRequest("POST", "/api/month-closing", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Opening balance updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createSideMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/month-closing/side-entries", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteSideMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/month-closing/side-entries/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Entry removed" });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/daily-entries/${id}`, data);
    },
    onSuccess: () => {
      invalidateDay();
      setEditingEntry(null);
      toast({ title: "Entry updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/daily-entries/${id}`);
    },
    onSuccess: () => {
      invalidateDay();
      toast({ title: "Entry deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const prevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleSaveBalance = () => {
    const val = parseInt(openingBalanceInput) || 0;
    upsertMutation.mutate({ month: selectedMonth, openingBalance: val });
    setEditingBalance(false);
  };

  const handleAddRecovery = () => {
    if (!newRecName.trim()) return;
    createSideMutation.mutate({
      month: selectedMonth,
      section: "recovery",
      name: newRecName.trim().toUpperCase(),
      amount: parseInt(newRecAmount) || 0,
    }, {
      onSuccess: () => {
        setNewRecName("");
        setNewRecAmount("");
        toast({ title: "Recovery added" });
      }
    });
  };

  const handleAddExtra = () => {
    if (!newExtraName.trim()) return;
    createSideMutation.mutate({
      month: selectedMonth,
      section: "extra_amount",
      name: newExtraName.trim().toUpperCase(),
      amount: parseInt(newExtraAmount) || 0,
    }, {
      onSuccess: () => {
        setNewExtraName("");
        setNewExtraAmount("");
        toast({ title: "Extra amount added" });
      }
    });
  };

  const openingBalance = closing?.openingBalance ?? 0;

  const recoveries = sideEntries.filter(e => e.section === "recovery");
  const extraAmounts = sideEntries.filter(e => e.section === "extra_amount");
  const recoveryTotal = recoveries.reduce((s, e) => s + e.amount, 0);
  const extraTotal = extraAmounts.reduce((s, e) => s + e.amount, 0);

  let runningBalance = openingBalance;
  const dailyRows = dailySummary.map((row) => {
    const dailyBalance = row.income - row.expense;
    runningBalance += dailyBalance;
    return { ...row, dailyBalance, closingBalance: runningBalance };
  });

  const totalIncome = dailySummary.reduce((s, r) => s + r.income, 0);
  const totalExpense = dailySummary.reduce((s, r) => s + r.expense, 0);
  const finalBalance = runningBalance;

  const maxSideRows = Math.max(recoveries.length + 1, extraAmounts.length + 1, dailyRows.length);

  const pendingReceivablesTotal = pendingReceivables.reduce((s, r) => s + r.amount, 0);
  const cashInHand = finalBalance - recoveryTotal - extraTotal - pendingReceivablesTotal;

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const monthLabel = getMonthLabel(selectedMonth);

    const maxRows = Math.max(dailyRows.length, recoveries.length, extraAmounts.length);
    const rows: any[][] = [
      [`${monthLabel} CLOSING SHEET`],
      [],
      ["Date", "Income", "Expense", "Daily Balance", "Closing Balance", "", "Recovery Purpose", "Recovery Amount", "", "Extra Name", "Extra Amount"],
    ];

    for (let i = 0; i < maxRows; i++) {
      const day = dailyRows[i];
      const rec = recoveries[i];
      const ext = extraAmounts[i];
      rows.push([
        day ? formatDate(day.date) : "",
        day ? day.income : "",
        day ? day.expense : "",
        day ? day.dailyBalance : "",
        day ? day.closingBalance : "",
        "",
        rec ? rec.name : "",
        rec ? rec.amount : "",
        "",
        ext ? ext.name : "",
        ext ? ext.amount : "",
      ]);
    }

    rows.push([
      "TOTAL",
      totalIncome,
      totalExpense,
      "",
      finalBalance,
      "",
      "TOTAL",
      recoveryTotal,
      "",
      "TOTAL",
      extraTotal,
    ]);
    rows.push([]);
    rows.push(["Opening Balance", openingBalance]);
    rows.push(["Final Balance", finalBalance]);
    rows.push(["Recovery Total", recoveryTotal]);
    rows.push(["Extra Amount Total", extraTotal]);
    rows.push(["Pending Receivables", pendingReceivablesTotal]);
    rows.push(["Cash in Hand", cashInHand]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
      { wch: 2 },
      { wch: 20 }, { wch: 14 },
      { wch: 2 },
      { wch: 20 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Month Closing");
    XLSX.writeFile(wb, `Month_Closing_${selectedMonth}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" data-testid="page-month-closing">
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Month Closing Sheet</h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-48"
            data-testid="input-month"
          />
          <Button size="icon" variant="ghost" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" data-testid="table-closing-sheet">
              <thead>
                <tr className="bg-muted/60">
                  <th colSpan={5} className="text-left p-2 font-bold text-base border-b border-r">
                    {getMonthLabel(selectedMonth)} CLOSING SHEET
                  </th>
                  <th className="border-b border-r p-2"></th>
                  <th colSpan={2} className="text-left p-2 font-bold text-sm border-b border-r">
                    RECOVERIES
                  </th>
                  <th className="border-b border-r p-2"></th>
                  <th colSpan={2} className="text-left p-2 font-bold text-sm border-b">
                    EXTRA AMOUNT
                  </th>
                  <th className="border-b p-2"></th>
                </tr>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left p-2 font-semibold border-r">Date</th>
                  <th className="text-right p-2 font-semibold border-r w-24">Income</th>
                  <th className="text-right p-2 font-semibold border-r w-24">Expense</th>
                  <th className="text-right p-2 font-semibold border-r w-28">Daily Balance</th>
                  <th className="text-right p-2 font-semibold border-r w-28">Closing Balance</th>
                  <th className="border-r p-1 w-1"></th>
                  <th className="text-left p-2 font-semibold border-r">Purpose</th>
                  <th className="text-right p-2 font-semibold border-r w-24">Amount</th>
                  <th className="border-r p-1 w-8"></th>
                  <th className="text-left p-2 font-semibold border-r">Name</th>
                  <th className="text-right p-2 font-semibold border-r w-24">Amount</th>
                  <th className="p-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-4 text-center text-muted-foreground" data-testid="text-no-data">
                      No daily entries found for {getMonthLabel(selectedMonth)}. Add entries in the Daily Sheet first.
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: Math.max(dailyRows.length, maxSideRows) }).map((_, idx) => {
                    const day = dailyRows[idx];
                    const rec = recoveries[idx];
                    const ext = extraAmounts[idx];
                    return (
                      <tr key={idx} className="border-b" data-testid={`row-closing-${idx}`}>
                        <td className="p-2 border-r">
                          {day ? (
                            <span
                              className="cursor-pointer text-blue-600 hover:underline"
                              onClick={() => setSelectedDate(day.date)}
                            >
                              {formatDate(day.date)}
                            </span>
                          ) : ""}
                        </td>
                        <td className="p-2 text-right border-r">{day ? formatNum(day.income) : ""}</td>
                        <td className="p-2 text-right border-r">{day ? formatNum(day.expense) : ""}</td>
                        <td className={`p-2 text-right border-r ${day && day.dailyBalance < 0 ? "text-red-600" : ""}`}>
                          {day ? formatNum(day.dailyBalance) : ""}
                        </td>
                        <td className={`p-2 text-right font-medium border-r ${day && day.closingBalance < 0 ? "text-red-600" : ""}`}>
                          {day ? formatNum(day.closingBalance) : ""}
                        </td>
                        <td className="border-r"></td>
                        <td className="p-2 border-r">{rec ? rec.name : ""}</td>
                        <td className="p-2 text-right border-r">{rec ? formatNum(rec.amount) : ""}</td>
                        <td className="p-1 border-r text-center">
                          {rec && (
                            <Button size="icon" variant="ghost" onClick={() => deleteSideMutation.mutate(rec.id)} data-testid={`button-delete-rec-${rec.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                        <td className="p-2 border-r">{ext ? ext.name : ""}</td>
                        <td className={`p-2 text-right border-r ${ext && ext.amount < 0 ? "text-red-600" : ""}`}>{ext ? formatNum(ext.amount) : ""}</td>
                        <td className="p-1 text-center">
                          {ext && (
                            <Button size="icon" variant="ghost" onClick={() => deleteSideMutation.mutate(ext.id)} data-testid={`button-delete-ext-${ext.id}`}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                <tr className="border-b bg-muted/20">
                  <td colSpan={5} className="border-r"></td>
                  <td className="border-r"></td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="Name / Purpose"
                      value={newRecName}
                      onChange={(e) => setNewRecName(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-rec-name"
                      onKeyDown={(e) => e.key === "Enter" && handleAddRecovery()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newRecAmount}
                      onChange={(e) => setNewRecAmount(e.target.value)}
                      className="h-8 text-sm text-right"
                      data-testid="input-rec-amount"
                      onKeyDown={(e) => e.key === "Enter" && handleAddRecovery()}
                    />
                  </td>
                  <td className="p-1 border-r text-center">
                    <Button size="icon" variant="ghost" onClick={handleAddRecovery} disabled={createSideMutation.isPending} data-testid="button-add-recovery">
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="Name"
                      value={newExtraName}
                      onChange={(e) => setNewExtraName(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-extra-name"
                      onKeyDown={(e) => e.key === "Enter" && handleAddExtra()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExtraAmount}
                      onChange={(e) => setNewExtraAmount(e.target.value)}
                      className="h-8 text-sm text-right"
                      data-testid="input-extra-amount"
                      onKeyDown={(e) => e.key === "Enter" && handleAddExtra()}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <Button size="icon" variant="ghost" onClick={handleAddExtra} disabled={createSideMutation.isPending} data-testid="button-add-extra">
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold border-t-2">
                  <td className="p-2 border-r">TOTAL</td>
                  <td className="p-2 text-right border-r text-green-700 dark:text-green-400" data-testid="text-total-income">{formatNum(totalIncome)}</td>
                  <td className="p-2 text-right border-r text-red-700 dark:text-red-400" data-testid="text-total-expense">{formatNum(totalExpense)}</td>
                  <td className="p-2 text-right border-r"></td>
                  <td className={`p-2 text-right font-bold border-r ${finalBalance < 0 ? "text-red-600" : "text-green-700 dark:text-green-400"}`} data-testid="text-final-balance">
                    {formatNum(finalBalance)}
                  </td>
                  <td className="border-r"></td>
                  <td className="p-2 border-r">TOTAL</td>
                  <td className="p-2 text-right font-bold border-r" data-testid="text-recovery-total">{formatNum(recoveryTotal)}</td>
                  <td className="border-r"></td>
                  <td className="p-2 border-r">TOTAL</td>
                  <td className="p-2 text-right font-bold border-r" data-testid="text-extra-total">{formatNum(extraTotal)}</td>
                  <td></td>
                </tr>
                <tr className="bg-muted/40 font-bold">
                  <td className="p-2 border-r">
                    Opening Balance
                  </td>
                  <td colSpan={4} className="p-2 border-r">
                    {editingBalance ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={openingBalanceInput}
                          onChange={(e) => setOpeningBalanceInput(e.target.value)}
                          className="h-8 text-sm w-32"
                          data-testid="input-opening-balance"
                          onKeyDown={(e) => e.key === "Enter" && handleSaveBalance()}
                        />
                        <Button size="sm" onClick={handleSaveBalance} data-testid="button-save-balance">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingBalance(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover-elevate px-2 py-1 rounded"
                        onClick={() => { setOpeningBalanceInput(String(openingBalance)); setEditingBalance(true); }}
                        data-testid="text-opening-balance"
                      >
                        Rs. {openingBalance.toLocaleString()} (click to edit)
                      </span>
                    )}
                  </td>
                  <td className="border-r"></td>
                  <td className="p-2 border-r text-muted-foreground">Pending Receivables</td>
                  <td className={`p-2 text-right font-bold border-r ${pendingReceivablesTotal > 0 ? "text-orange-600" : ""}`} data-testid="text-pending-receivables">
                    {formatNum(pendingReceivablesTotal)}
                  </td>
                  <td className="border-r"></td>
                  <td className="p-2 border-r">CASH IN HAND</td>
                  <td className={`p-2 text-right font-bold border-r ${cashInHand < 0 ? "text-red-600" : ""}`} data-testid="text-cash-in-hand">
                    {formatNum(cashInHand)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="text-center mb-4">
          <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="mx-auto mb-2" style={{ maxWidth: "200px" }} />
          <p style={{ fontSize: "10px", color: "#666" }}>
            Basement Soneri Bank, Alama Iqbal Road, Pattoki
          </p>
        </div>

        <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>MONTH CLOSING SHEET - {getMonthLabel(selectedMonth)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Month:</strong> {getMonthLabel(selectedMonth)}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "12px" }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ border: "1px solid #333", padding: "5px", background: "#f0f0f0", fontWeight: "bold", fontSize: "11px", textAlign: "center" }}>
                DAILY ENTRIES
              </th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th colSpan={2} style={{ border: "1px solid #333", padding: "5px", background: "#f0f0f0", fontWeight: "bold", fontSize: "11px", textAlign: "center" }}>
                RECOVERIES
              </th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th colSpan={2} style={{ border: "1px solid #333", padding: "5px", background: "#f0f0f0", fontWeight: "bold", fontSize: "11px", textAlign: "center" }}>
                EXTRA AMOUNT
              </th>
            </tr>
            <tr>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Date</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Income</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Expense</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Daily Bal.</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Closing Bal.</th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Purpose</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Amount</th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Name</th>
              <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(dailyRows.length, recoveries.length, extraAmounts.length, 1) }).map((_, idx) => {
              const day = dailyRows[idx];
              const rec = recoveries[idx];
              const ext = extraAmounts[idx];
              return (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: "3px" }}>{day ? formatDate(day.date) : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right" }}>{day ? formatNum(day.income) : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right" }}>{day ? formatNum(day.expense) : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right", color: day && day.dailyBalance < 0 ? "red" : undefined }}>{day ? formatNum(day.dailyBalance) : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right", fontWeight: "600", color: day && day.closingBalance < 0 ? "red" : undefined }}>{day ? formatNum(day.closingBalance) : ""}</td>
                  <td style={{ width: "4px", border: "none" }}></td>
                  <td style={{ border: "1px solid #ccc", padding: "3px" }}>{rec ? rec.name : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right" }}>{rec ? formatNum(rec.amount) : ""}</td>
                  <td style={{ width: "4px", border: "none" }}></td>
                  <td style={{ border: "1px solid #ccc", padding: "3px" }}>{ext ? ext.name : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right", color: ext && ext.amount < 0 ? "red" : undefined }}>{ext ? formatNum(ext.amount) : ""}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ border: "2px solid #333", padding: "5px", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold", color: "green" }}>{formatNum(totalIncome)}</td>
              <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold", color: "red" }}>{formatNum(totalExpense)}</td>
              <td style={{ border: "2px solid #333", padding: "5px" }}></td>
              <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold", color: finalBalance < 0 ? "red" : "green" }}>{formatNum(finalBalance)}</td>
              <td style={{ width: "4px", border: "none" }}></td>
              <td style={{ border: "2px solid #333", padding: "5px", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold" }}>{formatNum(recoveryTotal)}</td>
              <td style={{ width: "4px", border: "none" }}></td>
              <td style={{ border: "2px solid #333", padding: "5px", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold" }}>{formatNum(extraTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "12px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #999", padding: "6px", fontWeight: "bold", background: "#f8f8f8", width: "50%" }}>Opening Balance</td>
              <td style={{ border: "1px solid #999", padding: "6px", textAlign: "right", fontWeight: "bold" }}>Rs. {openingBalance.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #999", padding: "6px", fontWeight: "bold", background: "#f8f8f8" }}>Final Balance</td>
              <td style={{ border: "1px solid #999", padding: "6px", textAlign: "right", fontWeight: "bold", color: finalBalance < 0 ? "red" : "green" }}>Rs. {finalBalance.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #999", padding: "6px", fontWeight: "bold", background: "#f8f8f8" }}>Recovery Total</td>
              <td style={{ border: "1px solid #999", padding: "6px", textAlign: "right", fontWeight: "bold" }}>Rs. {recoveryTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #999", padding: "6px", fontWeight: "bold", background: "#f8f8f8" }}>Extra Amount Total</td>
              <td style={{ border: "1px solid #999", padding: "6px", textAlign: "right", fontWeight: "bold" }}>Rs. {extraTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #999", padding: "6px", fontWeight: "bold", background: "#f8f8f8" }}>Pending Receivables</td>
              <td style={{ border: "1px solid #999", padding: "6px", textAlign: "right", fontWeight: "bold", color: pendingReceivablesTotal > 0 ? "orange" : undefined }}>Rs. {pendingReceivablesTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ border: "2px solid #333", padding: "8px", fontWeight: "bold", background: "#e8e8e8", fontSize: "12px" }}>Cash in Hand</td>
              <td style={{ border: "2px solid #333", padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "12px", color: cashInHand < 0 ? "red" : undefined }}>Rs. {cashInHand.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {pendingReceivables.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "4px", padding: "4px", background: "#f0f0f0", border: "1px solid #999" }}>PENDING RECEIVABLES</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #999", padding: "4px", textAlign: "left", background: "#f8f8f8" }}>Customer</th>
                  <th style={{ border: "1px solid #999", padding: "4px", textAlign: "right", background: "#f8f8f8" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pendingReceivables.map((r) => (
                  <tr key={r.id}>
                    <td style={{ border: "1px solid #ccc", padding: "3px" }}>{r.customerName || `Customer #${r.customerId}`}</td>
                    <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right" }}>Rs. {r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ border: "2px solid #333", padding: "5px", fontWeight: "bold" }}>Total</td>
                  <td style={{ border: "2px solid #333", padding: "5px", textAlign: "right", fontWeight: "bold" }}>Rs. {pendingReceivablesTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Prepared By</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Verified By</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #999", paddingTop: "4px", width: "140px" }}>Authorized Sign</div>
          </div>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "9px", color: "#999" }}>
          Software developed by: Storm Fiber Internet Pattoki
        </div>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(open) => { if (!open) { setSelectedDate(null); setEditingEntry(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Entries for {selectedDate ? formatDate(selectedDate) : ""}
            </DialogTitle>
          </DialogHeader>
          {dayEntriesLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading...
            </div>
          ) : dayEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No entries found for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-center p-2 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      {editingEntry?.id === entry.id ? (
                        <>
                          <td className="p-2">
                            <Select value={editForm.type} onValueChange={(v) => setEditForm(f => ({ ...f, type: v }))}>
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              value={editForm.description}
                              onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateEntryMutation.mutate({
                                    id: entry.id,
                                    data: { amount: parseInt(editForm.amount) || 0, description: editForm.description, type: editForm.type },
                                  });
                                }
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))}
                              className="h-8 text-right"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateEntryMutation.mutate({
                                    id: entry.id,
                                    data: { amount: parseInt(editForm.amount) || 0, description: editForm.description, type: editForm.type },
                                  });
                                }
                              }}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateEntryMutation.mutate({
                                    id: entry.id,
                                    data: { amount: parseInt(editForm.amount) || 0, description: editForm.description, type: editForm.type },
                                  });
                                }}
                                disabled={updateEntryMutation.isPending}
                              >
                                {updateEntryMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingEntry(null)}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {entry.type === "income" ? "Income" : "Expense"}
                            </span>
                          </td>
                          <td className="p-2">{entry.description || entry.category || "-"}</td>
                          <td className="p-2 text-right font-medium">Rs. {entry.amount.toLocaleString()}</td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setEditForm({
                                    amount: String(entry.amount),
                                    description: entry.description || "",
                                    type: entry.type,
                                  });
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteEntryMutation.mutate(entry.id)}
                                disabled={deleteEntryMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-bold">
                    <td className="p-2" colSpan={2}>Total</td>
                    <td className="p-2 text-right">
                      Rs. {dayEntries.reduce((s, e) => s + (e.type === "income" ? e.amount : -e.amount), 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
