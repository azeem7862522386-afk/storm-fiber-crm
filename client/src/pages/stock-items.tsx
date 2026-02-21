import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StockItem } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { Boxes, Plus, Loader2, Pencil, Trash2, Package, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StockItemWithRemaining = StockItem & { remainingQuantity: number };

export default function StockItemsPage() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItemWithRemaining | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "pcs",
    quantity: 0,
    description: "",
  });

  const { data: items = [], isLoading } = useQuery<StockItemWithRemaining[]>({
    queryKey: ["/api/stock-items"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/stock-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Stock item added successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof formData> }) =>
      apiRequest("PATCH", `/api/stock-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setShowDialog(false);
      setEditingItem(null);
      resetForm();
      toast({ title: "Stock item updated successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stock-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
      setDeleteId(null);
      toast({ title: "Stock item deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormData({ name: "", unit: "pcs", quantity: 0, description: "" });
  }

  function openAdd() {
    resetForm();
    setEditingItem(null);
    setShowDialog(true);
  }

  function openEdit(item: StockItemWithRemaining) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      description: item.description || "",
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
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
    <div className="p-4 md:p-6 space-y-6 print:hidden overflow-auto h-full">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Stock Items</h1>
              <p className="text-white/70 text-sm">Manage your stock inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Printer className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button size="sm" onClick={openAdd} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="border-0 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-600">{item.remainingQuantity}</span>
                  <span className="text-xs text-muted-foreground">/ {item.quantity} {item.unit}</span>
                </div>
                {item.quantity - item.remainingQuantity > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    {item.quantity - item.remainingQuantity} issued
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Unit</TableHead>
                <TableHead className="text-center text-white">Total Qty</TableHead>
                <TableHead className="text-center text-white">Issued</TableHead>
                <TableHead className="text-center text-white">Remaining</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    No stock items yet. Add your first item.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-center text-red-600">{item.quantity - item.remainingQuantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.remainingQuantity > 0 ? "default" : "destructive"}>
                        {item.remainingQuantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
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
            <DialogTitle>{editingItem ? "Edit Stock Item" : "Add Stock Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ONU, Fiber Cable, Connector"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="pcs, meters, kg"
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this stock item and all its issue records. This action cannot be undone.
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
        <span style={{ fontSize: "14px", fontWeight: "bold" }}>STOCK ITEMS INVENTORY REPORT</span>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", fontSize: "12px" }}>
        <span><strong>Print Date:</strong> {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Name</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Unit</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Total Qty</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Issued</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "center", background: "#f8f8f8" }}>Remaining</th>
            <th style={{ border: "1px solid #999", padding: "5px", textAlign: "left", background: "#f8f8f8" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={{ border: "1px solid #ccc", padding: "4px", fontWeight: "600" }}>{item.name}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{item.unit}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center", color: "#c00" }}>{item.quantity - item.remainingQuantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "center", fontWeight: "bold" }}>{item.remainingQuantity}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px" }}>{item.description || "-"}</td>
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
