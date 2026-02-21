import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, VendorBillWithVendor } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, FileText } from "lucide-react";

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendorOpen, setVendorOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payBillId, setPayBillId] = useState(0);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const [vName, setVName] = useState("");
  const [vContact, setVContact] = useState("");
  const [vAddress, setVAddress] = useState("");

  const [bVendorId, setBVendorId] = useState("");
  const [bBillNumber, setBBillNumber] = useState("");
  const [bBillDate, setBBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [bDueDate, setBDueDate] = useState("");
  const [bAmount, setBAmount] = useState("");
  const [bDescription, setBDescription] = useState("");
  const [bCategory, setBCategory] = useState("other");

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: bills = [], isLoading: billsLoading } = useQuery<VendorBillWithVendor[]>({
    queryKey: ["/api/vendor-bills"],
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vendors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Vendor added" });
      setVendorOpen(false);
      setVName(""); setVContact(""); setVAddress("");
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vendor-bills", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-bills"] });
      toast({ title: "Vendor bill created" });
      setBillOpen(false);
      setBVendorId(""); setBBillNumber(""); setBAmount(""); setBDescription("");
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const payBillMutation = useMutation({
    mutationFn: async ({ id, amount, paymentMethod }: any) => {
      const res = await apiRequest("POST", `/api/vendor-bills/${id}/pay`, { amount, paymentMethod });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      toast({ title: "Payment recorded" });
      setPayOpen(false);
      setPayAmount(""); setPayBillId(0);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const totalPayable = bills.filter((b) => b.status !== "paid").reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Vendors & Payables</h1>
          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
            Payable: {formatRs(totalPayable)}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="vendors">
        <TabsList>
          <TabsTrigger value="vendors" data-testid="tab-vendors">Vendors</TabsTrigger>
          <TabsTrigger value="bills" data-testid="tab-bills">Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={vendorOpen} onOpenChange={setVendorOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-vendor">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Vendor Name</Label>
                    <Input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Vendor name" data-testid="input-vendor-name" />
                  </div>
                  <div>
                    <Label>Contact</Label>
                    <Input value={vContact} onChange={(e) => setVContact(e.target.value)} placeholder="Phone number" data-testid="input-vendor-contact" />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input value={vAddress} onChange={(e) => setVAddress(e.target.value)} placeholder="Address" data-testid="input-vendor-address" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createVendorMutation.mutate({ name: vName, contact: vContact || null, address: vAddress || null })}
                    disabled={!vName || createVendorMutation.isPending}
                    data-testid="button-save-vendor"
                  >
                    {createVendorMutation.isPending ? "Saving..." : "Save Vendor"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {vendorsLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : vendors.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No vendors yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Contact</th>
                      <th className="text-left px-4 py-3">Address</th>
                      <th className="text-left px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.id} className="border-b" data-testid={`row-vendor-${v.id}`}>
                        <td className="px-4 py-3 font-medium" data-testid={`text-vendor-name-${v.id}`}>{v.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.contact || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.address || "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={v.isActive ? "default" : "secondary"} className="no-default-hover-elevate no-default-active-elevate">
                            {v.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bills" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={billOpen} onOpenChange={setBillOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-bill">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Bill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vendor Bill</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Vendor</Label>
                    <Select value={bVendorId} onValueChange={setBVendorId}>
                      <SelectTrigger data-testid="select-bill-vendor">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label>Bill Number</Label>
                      <Input value={bBillNumber} onChange={(e) => setBBillNumber(e.target.value)} placeholder="Optional" data-testid="input-bill-number" />
                    </div>
                    <div className="flex-1">
                      <Label>Category</Label>
                      <Select value={bCategory} onValueChange={setBCategory}>
                        <SelectTrigger data-testid="select-bill-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bandwidth">Bandwidth</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="salary">Salary</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label>Bill Date</Label>
                      <Input type="date" value={bBillDate} onChange={(e) => setBBillDate(e.target.value)} data-testid="input-bill-date" />
                    </div>
                    <div className="flex-1">
                      <Label>Due Date</Label>
                      <Input type="date" value={bDueDate} onChange={(e) => setBDueDate(e.target.value)} data-testid="input-bill-due-date" />
                    </div>
                  </div>
                  <div>
                    <Label>Amount (Rs.)</Label>
                    <Input type="number" value={bAmount} onChange={(e) => setBAmount(e.target.value)} placeholder="0" data-testid="input-bill-amount" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={bDescription} onChange={(e) => setBDescription(e.target.value)} placeholder="Bill description" data-testid="input-bill-description" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createBillMutation.mutate({
                      vendorId: Number(bVendorId),
                      billNumber: bBillNumber || null,
                      billDate: bBillDate,
                      dueDate: bDueDate,
                      totalAmount: Number(bAmount),
                      description: bDescription || null,
                      category: bCategory,
                    })}
                    disabled={!bVendorId || !bAmount || !bDueDate || createBillMutation.isPending}
                    data-testid="button-save-bill"
                  >
                    {createBillMutation.isPending ? "Saving..." : "Save Bill"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {billsLoading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : bills.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No vendor bills yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3">Bill #</th>
                        <th className="text-left px-4 py-3">Vendor</th>
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Due</th>
                        <th className="text-right px-4 py-3">Amount</th>
                        <th className="text-right px-4 py-3">Paid</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id} className="border-b" data-testid={`row-bill-${bill.id}`}>
                          <td className="px-4 py-3 font-mono">{bill.billNumber || `-`}</td>
                          <td className="px-4 py-3">{bill.vendor?.name}</td>
                          <td className="px-4 py-3">{bill.billDate}</td>
                          <td className="px-4 py-3">{bill.dueDate}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatRs(bill.totalAmount)}</td>
                          <td className="px-4 py-3 text-right">{formatRs(bill.paidAmount)}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${STATUS_COLORS[bill.status]} no-default-hover-elevate no-default-active-elevate`}>
                              {bill.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {bill.status !== "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setPayBillId(bill.id); setPayOpen(true); }}
                                data-testid={`button-pay-bill-${bill.id}`}
                              >
                                Pay
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Vendor Bill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (Rs.)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" data-testid="input-pay-amount" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger data-testid="select-pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => payBillMutation.mutate({ id: payBillId, amount: Number(payAmount), paymentMethod: payMethod })}
              disabled={!payAmount || Number(payAmount) <= 0 || payBillMutation.isPending}
              data-testid="button-confirm-pay"
            >
              {payBillMutation.isPending ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
