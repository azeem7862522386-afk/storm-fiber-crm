import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyEntryWithRelations } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays, Plus, Trash2, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";

function formatRs(amount: number) {
  if (amount === 0) return "-";
  return amount.toLocaleString();
}

export default function DailyEntriesPage() {
  const { toast } = useToast();
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  const [newUserId, setNewUserId] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [newRemarks, setNewRemarks] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newExpense, setNewExpense] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");

  const entriesQs = `?date=${filterDate}`;

  const { data: entries = [], isLoading } = useQuery<DailyEntryWithRelations[]>({
    queryKey: ["/api/daily-entries", entriesQs],
  });

  const { data: report } = useQuery<{ totalIncome: number; totalExpense: number }>({
    queryKey: ["/api/daily-entries/report", `?date=${filterDate}`],
    enabled: !!filterDate,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/daily-entries"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-entries/report"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/daily-entries", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/daily-entries/${id}`);
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Entry deleted" });
    },
  });

  const handleAddIncome = () => {
    if (!newUserId.trim()) {
      toast({ title: "Enter User ID", variant: "destructive" });
      return;
    }
    if (!newIncomeAmount || parseInt(newIncomeAmount) <= 0) {
      toast({ title: "Enter valid amount", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      date: filterDate,
      type: "income",
      userId: newUserId.trim().toUpperCase(),
      amount: parseInt(newIncomeAmount),
      entryBy: newRemarks.trim() || null,
      description: newNotes.trim() || null,
    }, {
      onSuccess: () => {
        setNewUserId("");
        setNewIncomeAmount("");
        setNewRemarks("");
        setNewNotes("");
        toast({ title: "Income added" });
      }
    });
  };

  const handleAddExpense = () => {
    if (!newExpense.trim()) {
      toast({ title: "Enter expense description", variant: "destructive" });
      return;
    }
    if (!newExpenseAmount || parseInt(newExpenseAmount) <= 0) {
      toast({ title: "Enter valid amount", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      date: filterDate,
      type: "expense",
      description: newExpense.trim().toUpperCase(),
      amount: parseInt(newExpenseAmount),
    }, {
      onSuccess: () => {
        setNewExpense("");
        setNewExpenseAmount("");
        toast({ title: "Expense added" });
      }
    });
  };

  const incomeEntries = entries.filter(e => e.type === "income");
  const expenseEntries = entries.filter(e => e.type === "expense");
  const totalIncome = report?.totalIncome ?? 0;
  const totalExpense = report?.totalExpense ?? 0;
  const netBalance = totalIncome - totalExpense;

  const maxRows = Math.max(incomeEntries.length, expenseEntries.length);

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

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
    const maxLen = Math.max(incomeEntries.length, expenseEntries.length);

    const rows: any[][] = [
      [`Daily Income & Expense Sheet - ${formatDisplayDate(filterDate)}`],
      [],
      ["SR#", "USER ID", "AMOUNT", "Remarks", "Notes", "", "EXPENSE", "Amount"],
    ];

    for (let i = 0; i < maxLen; i++) {
      const inc = incomeEntries[i];
      const exp = expenseEntries[i];
      rows.push([
        inc ? i + 1 : "",
        inc ? (inc.userId || "-") : "",
        inc ? inc.amount : "",
        inc ? (inc.entryBy || "") : "",
        inc ? (inc.description || "") : "",
        "",
        exp ? (exp.description || "-") : "",
        exp ? exp.amount : "",
      ]);
    }

    rows.push(["", "TOTAL", totalIncome, "", "", "", "TOTAL", totalExpense]);
    rows.push([]);
    rows.push(["", "", "", "", "", "", "NET BALANCE", netBalance]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      { wch: 2 },
      { wch: 22 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Daily Sheet");
    XLSX.writeFile(wb, `Daily_Sheet_${filterDate}.xlsx`);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" data-testid="page-daily-entries">
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Daily Income & Expense Sheet</h1>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44"
            data-testid="input-filter-date"
          />
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
            <table className="w-full text-sm border-collapse" data-testid="table-daily-sheet">
              <thead>
                <tr className="bg-muted/60">
                  <th colSpan={6} className="text-left p-2 font-bold text-base border-b border-r">
                    {filterDate ? formatDisplayDate(filterDate) : "Select Date"}
                  </th>
                  <th colSpan={3} className="text-left p-2 font-bold text-base border-b"></th>
                </tr>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left p-2 font-semibold border-r w-12">SR#</th>
                  <th className="text-left p-2 font-semibold border-r">USER ID</th>
                  <th className="text-right p-2 font-semibold border-r w-28">AMOUNT</th>
                  <th className="text-left p-2 font-semibold border-r">Remarks</th>
                  <th className="text-left p-2 font-semibold border-r">Notes</th>
                  <th className="w-8 border-r p-1"></th>
                  <th className="text-left p-2 font-semibold border-r">EXPENSE</th>
                  <th className="text-right p-2 font-semibold border-r w-28">Amount</th>
                  <th className="w-8 p-1"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">Loading...</td>
                  </tr>
                ) : maxRows === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground" data-testid="text-no-entries">
                      No entries for this date. Add income or expense below.
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: maxRows }).map((_, idx) => {
                    const inc = incomeEntries[idx];
                    const exp = expenseEntries[idx];
                    return (
                      <tr key={idx} className="border-b hover-elevate" data-testid={`row-entry-${idx}`}>
                        <td className="p-2 text-muted-foreground border-r">{inc ? idx + 1 : ""}</td>
                        <td className="p-2 font-medium border-r" data-testid={inc ? `text-userid-${inc.id}` : undefined}>
                          {inc ? (inc.userId || "-") : ""}
                        </td>
                        <td className="p-2 text-right border-r">
                          {inc ? formatRs(inc.amount) : ""}
                        </td>
                        <td className="p-2 text-muted-foreground border-r">
                          {inc ? (inc.entryBy || "") : ""}
                        </td>
                        <td className="p-2 text-muted-foreground border-r text-xs">
                          {inc ? (inc.description || "") : ""}
                        </td>
                        <td className="p-1 border-r text-center">
                          {inc && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(inc.id)}
                              data-testid={`button-delete-income-${inc.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                        <td className="p-2 font-medium border-r" data-testid={exp ? `text-expense-${exp.id}` : undefined}>
                          {exp ? (exp.description || "-") : ""}
                        </td>
                        <td className="p-2 text-right border-r">
                          {exp ? formatRs(exp.amount) : ""}
                        </td>
                        <td className="p-1 text-center">
                          {exp && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(exp.id)}
                              data-testid={`button-delete-expense-${exp.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}

                <tr className="border-b bg-muted/20">
                  <td className="p-1 border-r"></td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="USER ID"
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-user-id"
                      onKeyDown={(e) => e.key === "Enter" && handleAddIncome()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newIncomeAmount}
                      onChange={(e) => setNewIncomeAmount(e.target.value)}
                      className="h-8 text-sm text-right"
                      data-testid="input-income-amount"
                      onKeyDown={(e) => e.key === "Enter" && handleAddIncome()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="Remarks"
                      value={newRemarks}
                      onChange={(e) => setNewRemarks(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-remarks"
                      onKeyDown={(e) => e.key === "Enter" && handleAddIncome()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="Notes"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-notes"
                      onKeyDown={(e) => e.key === "Enter" && handleAddIncome()}
                    />
                  </td>
                  <td className="p-1 border-r text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleAddIncome}
                      disabled={createMutation.isPending}
                      data-testid="button-add-income"
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      placeholder="EXPENSE"
                      value={newExpense}
                      onChange={(e) => setNewExpense(e.target.value)}
                      className="h-8 text-sm"
                      data-testid="input-expense-desc"
                      onKeyDown={(e) => e.key === "Enter" && handleAddExpense()}
                    />
                  </td>
                  <td className="p-1 border-r">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="h-8 text-sm text-right"
                      data-testid="input-expense-amount"
                      onKeyDown={(e) => e.key === "Enter" && handleAddExpense()}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleAddExpense}
                      disabled={createMutation.isPending}
                      data-testid="button-add-expense"
                    >
                      <Plus className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold border-t-2">
                  <td className="p-2 border-r"></td>
                  <td className="p-2 border-r">TOTAL</td>
                  <td className="p-2 text-right border-r text-green-700 dark:text-green-400" data-testid="text-total-income">
                    {totalIncome > 0 ? formatRs(totalIncome) : "-"}
                  </td>
                  <td className="p-2 border-r"></td>
                  <td className="p-2 border-r"></td>
                  <td className="p-2 border-r"></td>
                  <td className="p-2 border-r">TOTAL</td>
                  <td className="p-2 text-right border-r text-red-700 dark:text-red-400" data-testid="text-total-expense">
                    {totalExpense > 0 ? formatRs(totalExpense) : "-"}
                  </td>
                  <td></td>
                </tr>
                <tr className="bg-muted/40 font-bold">
                  <td colSpan={6} className="p-2 border-r"></td>
                  <td className="p-2 border-r">NET BALANCE</td>
                  <td className={`p-2 text-right border-r ${netBalance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`} data-testid="text-net-balance">
                    {formatRs(Math.abs(netBalance))}
                    {netBalance < 0 ? " (Loss)" : ""}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Printable Version - Only visible when printing */}
      <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="text-center mb-4">
          <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="mx-auto mb-2" style={{ maxWidth: "200px" }} />
          <p style={{ fontSize: "10px", color: "#666" }}>
            Basement Soneri Bank, Alama Iqbal Road, Pattoki
          </p>
        </div>

        <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>DAILY INCOME & EXPENSE SHEET</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Date:</strong> {formatDisplayDate(filterDate)}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <thead>
            <tr>
              <th colSpan={5} style={{ border: "1px solid #333", padding: "6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>
                INCOME
              </th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th colSpan={2} style={{ border: "1px solid #333", padding: "6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "12px", textAlign: "center" }}>
                EXPENSE
              </th>
            </tr>
            <tr>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8", width: "30px" }}>SR#</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>USER ID</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8", width: "80px" }}>AMOUNT</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Remarks</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Notes</th>
              <th style={{ width: "4px", border: "none" }}></th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>DESCRIPTION</th>
              <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8", width: "80px" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(maxRows, 1) }).map((_, idx) => {
              const inc = incomeEntries[idx];
              const exp = expenseEntries[idx];
              return (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: "4px", color: "#666" }}>{inc ? idx + 1 : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: inc ? "600" : "normal" }}>{inc ? (inc.userId || "-") : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{inc ? formatRs(inc.amount) : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", color: "#555" }}>{inc ? (inc.entryBy || "") : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", color: "#555", fontSize: "10px" }}>{inc ? (inc.description || "") : ""}</td>
                  <td style={{ width: "4px", border: "none" }}></td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: exp ? "600" : "normal" }}>{exp ? (exp.description || "-") : ""}</td>
                  <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{exp ? formatRs(exp.amount) : ""}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ border: "2px solid #333", padding: "6px" }}></td>
              <td style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{totalIncome > 0 ? formatRs(totalIncome) : "-"}</td>
              <td style={{ border: "2px solid #333", padding: "6px" }}></td>
              <td style={{ border: "2px solid #333", padding: "6px" }}></td>
              <td style={{ width: "4px", border: "none" }}></td>
              <td style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>TOTAL</td>
              <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{totalExpense > 0 ? formatRs(totalExpense) : "-"}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #999", padding: "6px 16px", fontWeight: "bold", background: "#f0f0f0" }}>Total Income</td>
                <td style={{ border: "1px solid #999", padding: "6px 16px", textAlign: "right", fontWeight: "bold" }}>{formatRs(totalIncome)}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #999", padding: "6px 16px", fontWeight: "bold", background: "#f0f0f0" }}>Total Expense</td>
                <td style={{ border: "1px solid #999", padding: "6px 16px", textAlign: "right", fontWeight: "bold", color: "#c00" }}>{formatRs(totalExpense)}</td>
              </tr>
              <tr>
                <td style={{ border: "2px solid #333", padding: "8px 16px", fontWeight: "bold", background: "#e8e8e8", fontSize: "13px" }}>NET BALANCE</td>
                <td style={{ border: "2px solid #333", padding: "8px 16px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>{formatRs(Math.abs(netBalance))}{netBalance < 0 ? " (Loss)" : ""}</td>
              </tr>
            </tbody>
          </table>
        </div>

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

        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "9px", color: "#999" }}>
          <p>Software developed by: Storm Fiber Internet Pattoki</p>
        </div>
      </div>
    </div>
  );
}
