import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockItem, StockIssueWithItem, StockReturnWithItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftRight, Plus, Loader2, Trash2, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StockItemWithRemaining = StockItem & { remainingQuantity: number };
type Employee = { id: number; firstName: string; lastName: string; employeeCode: string; status: string };

export default function StockIssuesPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterItemId, setFilterItemId] = useState<string>("all");
  const [issuedToType, setIssuedToType] = useState<string>("employee");
  const [formData, setFormData] = useState({
    stockItemId: 0,
    quantity: 1,
    issuedTo: "",
    issuedBy: "",
    issueDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  const { data: stockItems = [] } = useQuery<StockItemWithRemaining[]>({
    queryKey: ["/api/stock-items"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: returns = [] } = useQuery<StockReturnWithItem[]>({
    queryKey: ["/api/stock-returns"],
  });

  const { data: issues = [], isLoading } = useQuery<StockIssueWithItem[]>({
    queryKey: ["/api/stock-issues", filterItemId],
    queryFn: async () => {
      const url = filterItemId !== "all"
        ? `/api/stock-issues?stockItemId=${filterItemId}`
        : "/api/stock-issues";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/stock-issues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Stock issued successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stock-issues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setDeleteId(null);
      toast({ title: "Issue record deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({
      stockItemId: 0,
      quantity: 1,
      issuedTo: "",
      issuedBy: "",
      issueDate: new Date().toISOString().split("T")[0],
      description: "",
    });
    setIssuedToType("employee");
  }

  function openAdd() {
    resetForm();
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!formData.stockItemId) {
      toast({ title: "Please select a stock item", variant: "destructive" });
      return;
    }
    if (!formData.issuedTo.trim()) {
      toast({ title: "Issued To is required", variant: "destructive" });
      return;
    }
    if (formData.quantity < 1) {
      toast({ title: "Quantity must be at least 1", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  }

  const selectedItem = stockItems.find((i) => i.id === formData.stockItemId);

  const handlePrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="overflow-auto h-full p-4 md:p-6 space-y-6 print:hidden">
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-issues" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-issues)"/></svg>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Stock Issues</h1>
              <p className="text-white/70 text-sm">Track stock issued to employees</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Print</span>
            </Button>
            <Button onClick={openAdd} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Issue Stock</span>
            </Button>
          </div>
        </div>
      </div>

      {issues.length > 0 && (() => {
        const personMap: Record<string, { items: Record<string, number>; total: number }> = {};
        issues.forEach((issue) => {
          const person = issue.issuedTo;
          if (!personMap[person]) personMap[person] = { items: {}, total: 0 };
          const itemName = issue.stockItem?.name || "Unknown";
          personMap[person].items[itemName] = (personMap[person].items[itemName] || 0) + issue.quantity;
          personMap[person].total += issue.quantity;
        });
        returns.forEach((ret) => {
          const person = ret.returnedBy;
          if (personMap[person]) {
            const itemName = ret.stockItem?.name || "Unknown";
            if (personMap[person].items[itemName] !== undefined) {
              personMap[person].items[itemName] = Math.max(0, personMap[person].items[itemName] - ret.quantity);
            }
            personMap[person].total = Math.max(0, personMap[person].total - ret.quantity);
          }
        });
        const filteredPersons = Object.entries(personMap).filter(([, data]) => data.total > 0);
        if (filteredPersons.length === 0) return null;
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPersons.map(([person, data]) => (
              <Card key={person} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold truncate">{person}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-1">
                    {Object.entries(data.items).filter(([, qty]) => qty > 0).map(([itemName, qty]) => (
                      <div key={itemName} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">{itemName}</span>
                        <span className="font-semibold text-red-600">{qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-1 flex justify-between text-xs font-bold">
                    <span>Total</span>
                    <span className="text-red-600">{data.total}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Issue History</CardTitle>
            <Select value={filterItemId} onValueChange={setFilterItemId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {stockItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="text-white">Item</TableHead>
                <TableHead className="text-center text-white">Qty</TableHead>
                <TableHead className="text-white">Issued To</TableHead>
                <TableHead className="text-white">Issued By</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    No stock issues yet.
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Badge variant="outline">{issue.stockItem?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{issue.quantity}</TableCell>
                    <TableCell>{issue.issuedTo}</TableCell>
                    <TableCell>{issue.issuedBy || "-"}</TableCell>
                    <TableCell>{issue.issueDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{issue.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(issue.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stock Item *</Label>
              <Select
                value={formData.stockItemId ? formData.stockItemId.toString() : ""}
                onValueChange={(v) => setFormData({ ...formData, stockItemId: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stock item" />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} (Available: {item.remainingQuantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-sm text-muted-foreground mt-1">
                  Available: <span className="font-semibold text-green-600">{selectedItem.remainingQuantity}</span> {selectedItem.unit}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedItem?.remainingQuantity || 9999}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Issued To *</Label>
              <div className="flex gap-2 mt-1">
                <Select value={issuedToType} onValueChange={(v) => { setIssuedToType(v); setFormData({ ...formData, issuedTo: "" }); }}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {issuedToType === "employee" ? (
                  <Select
                    value={formData.issuedTo}
                    onValueChange={(v) => setFormData({ ...formData, issuedTo: v })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.status === "active").map((emp) => (
                        <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="flex-1"
                    value={formData.issuedTo}
                    onChange={(e) => setFormData({ ...formData, issuedTo: e.target.value })}
                    placeholder="Customer / Owner name"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issued By</Label>
                <Input
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                  placeholder="Who is issuing"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Issue Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Issue Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this stock issue record. The stock quantity will be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    <div className="hidden print:block daily-print-sheet" style={{ fontFamily: "Arial, sans-serif", padding: "10px" }}>
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" style={{ maxWidth: "200px", margin: "0 auto", display: "block" }} />
        <p style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
          Basement Soneri Bank, Alama Iqbal Road, Pattoki
        </p>
      </div>

      <div style={{ borderTop: "2px solid #333", borderBottom: "2px solid #333", padding: "4px 0", marginBottom: "12px", textAlign: "center" }}>
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>STOCK ISSUES REPORT</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", fontSize: "12px" }}>
        <span><strong>Print Date:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Item</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Qty</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Issued To</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Issued By</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Date</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id}>
              <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{issue.stockItem?.name || "Unknown"}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center" }}>{issue.quantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{issue.issuedTo}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{issue.issuedBy || "-"}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{issue.issueDate}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{issue.description || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

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

      <div style={{ marginTop: "30px", textAlign: "center", fontSize: "9px", color: "#999", borderTop: "1px solid #eee", paddingTop: "8px" }}>
        Software developed by: Storm Fiber Internet Pattoki
      </div>
    </div>
    </>
  );
}
