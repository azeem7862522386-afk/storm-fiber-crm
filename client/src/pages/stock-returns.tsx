import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockItem, StockReturnWithItem } from "@shared/schema";
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
import { RotateCcw, Plus, Loader2, Trash2, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StockItemWithRemaining = StockItem & { remainingQuantity: number };
type Employee = { id: number; firstName: string; lastName: string; employeeCode: string; status: string };

export default function StockReturnsPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterItemId, setFilterItemId] = useState<string>("all");
  const [formData, setFormData] = useState({
    stockItemId: 0,
    quantity: 1,
    returnedBy: "",
    receivedBy: "",
    returnDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  const { data: stockItems = [] } = useQuery<StockItemWithRemaining[]>({
    queryKey: ["/api/stock-items"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: returns = [], isLoading } = useQuery<StockReturnWithItem[]>({
    queryKey: ["/api/stock-returns", filterItemId],
    queryFn: async () => {
      const url = filterItemId !== "all"
        ? `/api/stock-returns?stockItemId=${filterItemId}`
        : "/api/stock-returns";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/stock-returns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Stock return recorded successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stock-returns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-returns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setDeleteId(null);
      toast({ title: "Return record deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({
      stockItemId: 0,
      quantity: 1,
      returnedBy: "",
      receivedBy: "",
      returnDate: new Date().toISOString().split("T")[0],
      description: "",
    });
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
    if (!formData.returnedBy.trim()) {
      toast({ title: "Returned By is required", variant: "destructive" });
      return;
    }
    if (!formData.receivedBy.trim()) {
      toast({ title: "Received By is required", variant: "destructive" });
      return;
    }
    if (formData.quantity < 1) {
      toast({ title: "Quantity must be at least 1", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  }

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
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-returns" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-returns)"/></svg>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Stock Returns</h1>
              <p className="text-white/70 text-sm">Track returned stock items</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Print</span>
            </Button>
            <Button onClick={openAdd} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Record Return</span>
            </Button>
          </div>
        </div>
      </div>

      {returns.length > 0 && (() => {
        const personMap: Record<string, { items: Record<string, number>; total: number }> = {};
        returns.forEach((ret) => {
          const person = ret.returnedBy;
          if (!personMap[person]) personMap[person] = { items: {}, total: 0 };
          const itemName = ret.stockItem?.name || "Unknown";
          personMap[person].items[itemName] = (personMap[person].items[itemName] || 0) + ret.quantity;
          personMap[person].total += ret.quantity;
        });
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(personMap).map(([person, data]) => (
              <Card key={person} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold truncate">{person}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-1">
                    {Object.entries(data.items).map(([itemName, qty]) => (
                      <div key={itemName} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">{itemName}</span>
                        <span className="font-semibold text-green-600">{qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-2 pt-1 flex justify-between text-xs font-bold">
                    <span>Total Returned</span>
                    <span className="text-green-600">{data.total}</span>
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
            <CardTitle>Return History</CardTitle>
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
                <TableHead className="text-white">Returned By</TableHead>
                <TableHead className="text-white">Received By</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    No stock returns yet.
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret) => (
                  <TableRow key={ret.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Badge variant="outline">{ret.stockItem?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-600">{ret.quantity}</TableCell>
                    <TableCell>{ret.returnedBy}</TableCell>
                    <TableCell>{ret.receivedBy}</TableCell>
                    <TableCell>{ret.returnDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ret.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(ret.id)}>
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
            <DialogTitle>Record Stock Return</DialogTitle>
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
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Return Date *</Label>
                <Input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Returned By * (who is returning)</Label>
              <Select
                value={formData.returnedBy}
                onValueChange={(v) => setFormData({ ...formData, returnedBy: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === "active").map((emp) => (
                    <SelectItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Received By * (who is receiving the return)</Label>
              <Input
                value={formData.receivedBy}
                onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
                placeholder="Name of person receiving"
              />
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
              Record Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Return Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this return record. The stock will be deducted again.
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
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>STOCK RETURNS REPORT</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", fontSize: "12px" }}>
        <span><strong>Print Date:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Item</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Qty</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Returned By</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Received By</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Date</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {returns.map((ret) => (
            <tr key={ret.id}>
              <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{ret.stockItem?.name || "Unknown"}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center" }}>{ret.quantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{ret.returnedBy}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{ret.receivedBy}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{ret.returnDate}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{ret.description || "-"}</td>
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
