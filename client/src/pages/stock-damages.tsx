import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockItem, StockDamageWithItem } from "@shared/schema";
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
import { AlertTriangle, Plus, Loader2, Trash2, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StockItemWithRemaining = StockItem & { remainingQuantity: number };

export default function StockDamagesPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filterItemId, setFilterItemId] = useState<string>("all");
  const [formData, setFormData] = useState({
    stockItemId: 0,
    quantity: 1,
    reportedBy: "",
    damageDate: new Date().toISOString().split("T")[0],
    reason: "",
    description: "",
  });

  const { data: stockItems = [] } = useQuery<StockItemWithRemaining[]>({
    queryKey: ["/api/stock-items"],
  });

  const { data: damages = [], isLoading } = useQuery<StockDamageWithItem[]>({
    queryKey: ["/api/stock-damages", filterItemId],
    queryFn: async () => {
      const url = filterItemId !== "all"
        ? `/api/stock-damages?stockItemId=${filterItemId}`
        : "/api/stock-damages";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/stock-damages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-damages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Damage report recorded successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stock-damages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-damages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setDeleteId(null);
      toast({ title: "Damage record deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({
      stockItemId: 0,
      quantity: 1,
      reportedBy: "",
      damageDate: new Date().toISOString().split("T")[0],
      reason: "",
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
    if (!formData.reportedBy.trim()) {
      toast({ title: "Reported By is required", variant: "destructive" });
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
      <div className="rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-damages" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-damages)"/></svg>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Stock Damages</h1>
              <p className="text-white/70 text-sm">Track damaged stock items</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Print</span>
            </Button>
            <Button onClick={openAdd} size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Report Damage</span>
            </Button>
          </div>
        </div>
      </div>

      {damages.length > 0 && (() => {
        const itemMap: Record<string, { total: number; reasons: string[] }> = {};
        damages.forEach((d) => {
          const itemName = d.stockItem?.name || "Unknown";
          if (!itemMap[itemName]) itemMap[itemName] = { total: 0, reasons: [] };
          itemMap[itemName].total += d.quantity;
          if (d.reason && !itemMap[itemName].reasons.includes(d.reason)) {
            itemMap[itemName].reasons.push(d.reason);
          }
        });
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(itemMap).map(([itemName, data]) => (
              <Card key={itemName} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-background">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold truncate">{itemName}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-red-600">{data.total}</span>
                    <span className="text-xs text-muted-foreground">damaged</span>
                  </div>
                  {data.reasons.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {data.reasons.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })()}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Damage History</CardTitle>
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
                <TableHead className="text-white">Reported By</TableHead>
                <TableHead className="text-white">Reason</TableHead>
                <TableHead className="text-white">Date</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {damages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    No damage reports yet.
                  </TableCell>
                </TableRow>
              ) : (
                damages.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Badge variant="outline">{d.stockItem?.name || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-red-600">{d.quantity}</TableCell>
                    <TableCell>{d.reportedBy}</TableCell>
                    <TableCell>{d.reason || "-"}</TableCell>
                    <TableCell>{d.damageDate}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
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
            <DialogTitle>Report Stock Damage</DialogTitle>
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
                <Label>Damage Date *</Label>
                <Input
                  type="date"
                  value={formData.damageDate}
                  onChange={(e) => setFormData({ ...formData, damageDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Reported By *</Label>
              <Input
                value={formData.reportedBy}
                onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                placeholder="Who is reporting"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g. Broken, Water damage, Defective"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} variant="destructive">
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Report Damage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Damage Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this damage report. The stock quantity will be restored.
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
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>STOCK DAMAGES REPORT</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", fontSize: "12px" }}>
        <span><strong>Print Date:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Item</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Qty</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Reported By</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Reason</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Date</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {damages.map((d) => (
            <tr key={d.id}>
              <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{d.stockItem?.name || "Unknown"}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center", color: "#c00" }}>{d.quantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{d.reportedBy}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{d.reason || "-"}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{d.damageDate}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{d.description || "-"}</td>
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
