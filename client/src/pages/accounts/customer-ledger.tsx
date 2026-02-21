import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookUser, Search, FileText } from "lucide-react";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

export default function CustomerLedgerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", searchQuery],
    queryFn: async () => {
      const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : "/api/customers";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: searchQuery.length > 0,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<{ entries: any[]; balance: number }>({
    queryKey: ["/api/customer-ledger", selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookUser className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Customer Ledger</h1>
      </div>

      <Card>
        <CardContent className="py-3">
          <div className="flex gap-2 items-center">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer by name, contact, CNIC..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedCustomerId(null); }}
              data-testid="input-ledger-search"
            />
          </div>
          {searchQuery && customers.length > 0 && !selectedCustomerId && (
            <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="px-3 py-2 hover-elevate cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedCustomerId(c.id)}
                  data-testid={`button-select-customer-${c.id}`}
                >
                  <div>
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{c.contact}</span>
                  </div>
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomerId && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span data-testid="text-ledger-customer">Account Statement - {selectedCustomer?.name || `Customer #${selectedCustomerId}`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Outstanding:</span>
                  <Badge
                    variant={ledger && ledger.balance > 0 ? "destructive" : "default"}
                    className="no-default-hover-elevate no-default-active-elevate"
                    data-testid="text-ledger-balance"
                  >
                    {ledger ? formatRs(ledger.balance) : "..."}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ledgerLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading ledger...</div>
              ) : !ledger || ledger.entries.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No ledger entries for this customer.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-left px-4 py-3">Description</th>
                        <th className="text-right px-4 py-3">Debit</th>
                        <th className="text-right px-4 py-3">Credit</th>
                        <th className="text-right px-4 py-3">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.entries.map((entry: any, i: number) => (
                        <tr key={i} className="border-b" data-testid={`row-ledger-${i}`}>
                          <td className="px-4 py-2">{entry.date}</td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={entry.type === "payment" ? "default" : entry.type === "invoice" ? "secondary" : "outline"}
                              className="no-default-hover-elevate no-default-active-elevate"
                            >
                              {entry.type === "opening_balance" ? "Opening" : entry.type === "invoice" ? "Invoice" : "Payment"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{entry.description}</td>
                          <td className="px-4 py-2 text-right">{entry.debit > 0 ? formatRs(entry.debit) : ""}</td>
                          <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">{entry.credit > 0 ? formatRs(entry.credit) : ""}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatRs(entry.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 font-medium">
                        <td colSpan={3} className="px-4 py-3 text-right">Outstanding Balance</td>
                        <td className="px-4 py-3 text-right">
                          {formatRs(ledger.entries.reduce((s: number, e: any) => s + e.debit, 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                          {formatRs(ledger.entries.reduce((s: number, e: any) => s + e.credit, 0))}
                        </td>
                        <td className="px-4 py-3 text-right">{formatRs(ledger.balance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
