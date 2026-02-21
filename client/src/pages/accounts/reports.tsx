import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, Scale, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

export default function ReportsPage() {
  const now = new Date();
  const [plStart, setPlStart] = useState(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]);
  const [plEnd, setPlEnd] = useState(now.toISOString().split("T")[0]);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const { data: trialBalance, isLoading: tbLoading } = useQuery<{ accounts: any[] }>({
    queryKey: ["/api/reports/trial-balance"],
  });

  const { data: profitLoss, isLoading: plLoading } = useQuery<{ revenue: any[]; expenses: any[]; totalRevenue: number; totalExpenses: number; netIncome: number }>({
    queryKey: ["/api/reports/profit-loss", plStart, plEnd],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/profit-loss?startDate=${plStart}&endDate=${plEnd}`);
      return res.json();
    },
  });

  const { data: balanceSheet, isLoading: bsLoading } = useQuery<{ assets: any[]; liabilities: any[]; equity: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number }>({
    queryKey: ["/api/reports/balance-sheet"],
  });

  const { data: aging = [], isLoading: agingLoading } = useQuery<any[]>({
    queryKey: ["/api/reports/aging"],
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Financial Reports</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <Tabs defaultValue="trial-balance" className="print:hidden">
        <TabsList className="flex-wrap">
          <TabsTrigger value="trial-balance" data-testid="tab-trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="profit-loss" data-testid="tab-profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="aging" data-testid="tab-aging">Aging Report</TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance" className="space-y-3">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Trial Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tbLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : !trialBalance || trialBalance.accounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No journal entries recorded yet. Post some transactions first.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Code</th>
                        <th className="text-left px-4 py-3">Account</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-right px-4 py-3">Debit</th>
                        <th className="text-right px-4 py-3">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts.map((acc: any) => (
                        <tr key={acc.id} className="border-b" data-testid={`row-tb-${acc.id}`}>
                          <td className="px-4 py-2 font-mono text-muted-foreground">{acc.code}</td>
                          <td className="px-4 py-2">{acc.name}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate capitalize">{acc.type}</Badge>
                          </td>
                          <td className="px-4 py-2 text-right">{acc.debit > 0 ? formatRs(acc.debit) : ""}</td>
                          <td className="px-4 py-2 text-right">{acc.credit > 0 ? formatRs(acc.credit) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-medium">
                        <td colSpan={3} className="px-4 py-3 text-right">Totals</td>
                        <td className="px-4 py-3 text-right" data-testid="text-tb-total-debit">
                          {formatRs(trialBalance.accounts.reduce((s: number, a: any) => s + a.debit, 0))}
                        </td>
                        <td className="px-4 py-3 text-right" data-testid="text-tb-total-credit">
                          {formatRs(trialBalance.accounts.reduce((s: number, a: any) => s + a.credit, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-3">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Profit & Loss Statement
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={plStart} onChange={(e) => setPlStart(e.target.value)} className="w-36" data-testid="input-pl-start" />
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={plEnd} onChange={(e) => setPlEnd(e.target.value)} className="w-36" data-testid="input-pl-end" />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : !profitLoss ? (
                <div className="text-center py-6 text-muted-foreground">No data available.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Revenue</h3>
                    {profitLoss.revenue.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No revenue recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {profitLoss.revenue.map((r: any) => (
                          <div key={r.id} className="flex justify-between text-sm" data-testid={`row-revenue-${r.id}`}>
                            <span><span className="font-mono text-muted-foreground mr-2">{r.code}</span>{r.name}</span>
                            <span className="font-medium">{formatRs(r.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-1" data-testid="text-total-revenue">
                          <span>Total Revenue</span>
                          <span className="text-green-600 dark:text-green-400">{formatRs(profitLoss.totalRevenue)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Expenses</h3>
                    {profitLoss.expenses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No expenses recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {profitLoss.expenses.map((e: any) => (
                          <div key={e.id} className="flex justify-between text-sm" data-testid={`row-expense-${e.id}`}>
                            <span><span className="font-mono text-muted-foreground mr-2">{e.code}</span>{e.name}</span>
                            <span className="font-medium">{formatRs(e.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-1" data-testid="text-total-expenses">
                          <span>Total Expenses</span>
                          <span className="text-red-600 dark:text-red-400">{formatRs(profitLoss.totalExpenses)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t-2 pt-2 flex justify-between font-bold text-base" data-testid="text-net-income">
                    <span>Net Income</span>
                    <span className={profitLoss.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {formatRs(profitLoss.netIncome)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-3">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bsLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : !balanceSheet ? (
                <div className="text-center py-6 text-muted-foreground">No data available.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Assets</h3>
                    {balanceSheet.assets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No assets recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {balanceSheet.assets.map((a: any) => (
                          <div key={a.id} className="flex justify-between text-sm">
                            <span><span className="font-mono text-muted-foreground mr-2">{a.code}</span>{a.name}</span>
                            <span className="font-medium">{formatRs(a.balance)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-1" data-testid="text-total-assets">
                          <span>Total Assets</span>
                          <span>{formatRs(balanceSheet.totalAssets)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Liabilities</h3>
                    {balanceSheet.liabilities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No liabilities recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {balanceSheet.liabilities.map((l: any) => (
                          <div key={l.id} className="flex justify-between text-sm">
                            <span><span className="font-mono text-muted-foreground mr-2">{l.code}</span>{l.name}</span>
                            <span className="font-medium">{formatRs(l.balance)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-1" data-testid="text-total-liabilities">
                          <span>Total Liabilities</span>
                          <span>{formatRs(balanceSheet.totalLiabilities)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">Equity</h3>
                    {balanceSheet.equity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No equity recorded</p>
                    ) : (
                      <div className="space-y-1">
                        {balanceSheet.equity.map((e: any) => (
                          <div key={e.id} className="flex justify-between text-sm">
                            <span><span className="font-mono text-muted-foreground mr-2">{e.code}</span>{e.name}</span>
                            <span className="font-medium">{formatRs(e.balance)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-1" data-testid="text-total-equity">
                          <span>Total Equity</span>
                          <span>{formatRs(balanceSheet.totalEquity)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t-2 pt-2 flex justify-between font-bold text-sm">
                    <span>Liabilities + Equity</span>
                    <span>{formatRs(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-3">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base">Accounts Receivable Aging Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {agingLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
              ) : aging.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No outstanding receivables.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Customer</th>
                        <th className="text-right px-4 py-3">Current</th>
                        <th className="text-right px-4 py-3">1-30 Days</th>
                        <th className="text-right px-4 py-3">31-60 Days</th>
                        <th className="text-right px-4 py-3">61-90 Days</th>
                        <th className="text-right px-4 py-3">90+ Days</th>
                        <th className="text-right px-4 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aging.map((row: any) => (
                        <tr key={row.customerId} className="border-b" data-testid={`row-aging-${row.customerId}`}>
                          <td className="px-4 py-2 font-medium">{row.customerName}</td>
                          <td className="px-4 py-2 text-right">{row.current > 0 ? formatRs(row.current) : ""}</td>
                          <td className="px-4 py-2 text-right">{row.days30 > 0 ? formatRs(row.days30) : ""}</td>
                          <td className="px-4 py-2 text-right">{row.days60 > 0 ? formatRs(row.days60) : ""}</td>
                          <td className="px-4 py-2 text-right">{row.days90 > 0 ? formatRs(row.days90) : ""}</td>
                          <td className="px-4 py-2 text-right text-destructive">{row.over90 > 0 ? formatRs(row.over90) : ""}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatRs(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-medium">
                        <td className="px-4 py-3">Totals</td>
                        <td className="px-4 py-3 text-right">{formatRs(aging.reduce((s: number, r: any) => s + r.current, 0))}</td>
                        <td className="px-4 py-3 text-right">{formatRs(aging.reduce((s: number, r: any) => s + r.days30, 0))}</td>
                        <td className="px-4 py-3 text-right">{formatRs(aging.reduce((s: number, r: any) => s + r.days60, 0))}</td>
                        <td className="px-4 py-3 text-right">{formatRs(aging.reduce((s: number, r: any) => s + r.days90, 0))}</td>
                        <td className="px-4 py-3 text-right text-destructive">{formatRs(aging.reduce((s: number, r: any) => s + r.over90, 0))}</td>
                        <td className="px-4 py-3 text-right">{formatRs(aging.reduce((s: number, r: any) => s + r.total, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif" }}>
        <div className="text-center mb-4">
          <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="mx-auto mb-2" style={{ maxWidth: "200px" }} />
          <p style={{ fontSize: "10px", color: "#666" }}>
            Basement Soneri Bank, Alama Iqbal Road, Pattoki
          </p>
        </div>

        <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold" }}>ACCOUNTING REPORT</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "12px" }}>
          <span><strong>Period:</strong> {plStart} to {plEnd}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        </div>

        {trialBalance && trialBalance.accounts.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", padding: "4px", background: "#f0f0f0", border: "1px solid #999" }}>TRIAL BALANCE</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Code</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Account</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Type</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Debit</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.accounts.map((acc: any) => (
                  <tr key={acc.id}>
                    <td style={{ border: "1px solid #ccc", padding: "4px", fontFamily: "monospace", color: "#666" }}>{acc.code}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px" }}>{acc.name}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textTransform: "capitalize" }}>{acc.type}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{acc.debit > 0 ? formatRs(acc.debit) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{acc.credit > 0 ? formatRs(acc.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>Totals</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(trialBalance.accounts.reduce((s: number, a: any) => s + a.debit, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(trialBalance.accounts.reduce((s: number, a: any) => s + a.credit, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {profitLoss && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", padding: "4px", background: "#f0f0f0", border: "1px solid #999" }}>PROFIT & LOSS STATEMENT</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <tbody>
                {profitLoss.revenue.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={2} style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold", background: "#f8f8f8" }}>Revenue</td>
                    </tr>
                    {profitLoss.revenue.map((r: any) => (
                      <tr key={r.id}>
                        <td style={{ border: "1px solid #ccc", padding: "4px" }}><span style={{ fontFamily: "monospace", color: "#666", marginRight: "8px" }}>{r.code}</span>{r.name}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(r.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold" }}>Total Revenue</td>
                      <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right", fontWeight: "bold", color: "green" }}>{formatRs(profitLoss.totalRevenue)}</td>
                    </tr>
                  </>
                )}
                {profitLoss.expenses.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={2} style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold", background: "#f8f8f8" }}>Expenses</td>
                    </tr>
                    {profitLoss.expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ border: "1px solid #ccc", padding: "4px" }}><span style={{ fontFamily: "monospace", color: "#666", marginRight: "8px" }}>{e.code}</span>{e.name}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(e.amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold" }}>Total Expenses</td>
                      <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right", fontWeight: "bold", color: "red" }}>{formatRs(profitLoss.totalExpenses)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td style={{ border: "2px solid #333", padding: "8px", fontWeight: "bold", fontSize: "12px" }}>Net Income</td>
                  <td style={{ border: "2px solid #333", padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "12px", color: profitLoss.netIncome >= 0 ? "green" : "red" }}>{formatRs(profitLoss.netIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {balanceSheet && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", padding: "4px", background: "#f0f0f0", border: "1px solid #999" }}>BALANCE SHEET</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <tbody>
                {balanceSheet.assets.length > 0 && (
                  <>
                    <tr><td colSpan={2} style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold", background: "#f8f8f8" }}>Assets</td></tr>
                    {balanceSheet.assets.map((a: any) => (
                      <tr key={a.id}>
                        <td style={{ border: "1px solid #ccc", padding: "4px" }}><span style={{ fontFamily: "monospace", color: "#666", marginRight: "8px" }}>{a.code}</span>{a.name}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(a.balance)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold" }}>Total Assets</td>
                      <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right", fontWeight: "bold" }}>{formatRs(balanceSheet.totalAssets)}</td>
                    </tr>
                  </>
                )}
                {balanceSheet.liabilities.length > 0 && (
                  <>
                    <tr><td colSpan={2} style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold", background: "#f8f8f8" }}>Liabilities</td></tr>
                    {balanceSheet.liabilities.map((l: any) => (
                      <tr key={l.id}>
                        <td style={{ border: "1px solid #ccc", padding: "4px" }}><span style={{ fontFamily: "monospace", color: "#666", marginRight: "8px" }}>{l.code}</span>{l.name}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(l.balance)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold" }}>Total Liabilities</td>
                      <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right", fontWeight: "bold" }}>{formatRs(balanceSheet.totalLiabilities)}</td>
                    </tr>
                  </>
                )}
                {balanceSheet.equity.length > 0 && (
                  <>
                    <tr><td colSpan={2} style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold", background: "#f8f8f8" }}>Equity</td></tr>
                    {balanceSheet.equity.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ border: "1px solid #ccc", padding: "4px" }}><span style={{ fontFamily: "monospace", color: "#666", marginRight: "8px" }}>{e.code}</span>{e.name}</td>
                        <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{formatRs(e.balance)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ border: "1px solid #999", padding: "5px", fontWeight: "bold" }}>Total Equity</td>
                      <td style={{ border: "1px solid #999", padding: "5px", textAlign: "right", fontWeight: "bold" }}>{formatRs(balanceSheet.totalEquity)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>Liabilities + Equity</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {aging.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", padding: "4px", background: "#f0f0f0", border: "1px solid #999" }}>ACCOUNTS RECEIVABLE AGING REPORT</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Customer</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Current</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>1-30 Days</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>31-60 Days</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>61-90 Days</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>90+ Days</th>
                  <th style={{ border: "1px solid #999", padding: "5px", textAlign: "right", background: "#f8f8f8" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {aging.map((row: any) => (
                  <tr key={row.customerId}>
                    <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{row.customerName}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.current > 0 ? formatRs(row.current) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.days30 > 0 ? formatRs(row.days30) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.days60 > 0 ? formatRs(row.days60) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{row.days90 > 0 ? formatRs(row.days90) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right", color: "red" }}>{row.over90 > 0 ? formatRs(row.over90) : ""}</td>
                    <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right", fontWeight: "600" }}>{formatRs(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ border: "2px solid #333", padding: "6px", fontWeight: "bold" }}>Totals</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.current, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.days30, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.days60, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.days90, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold", color: "red" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.over90, 0))}</td>
                  <td style={{ border: "2px solid #333", padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatRs(aging.reduce((s: number, r: any) => s + r.total, 0))}</td>
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
    </div>
  );
}
