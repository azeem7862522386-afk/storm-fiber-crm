import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Printer,
  User,
  Phone,
  MapPin,
  Wifi,
  CreditCard,
  X,
  RotateCcw,
  IdCard,
  History,
  CalendarDays,
  ClipboardList,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { amountToWords } from "@/lib/amount-to-words";
import type { Customer, ServicePlan } from "@shared/schema";

type CustomerWithPlan = Customer & { plan: ServicePlan | null };

type PosSlip = {
  id: number;
  customerId: number;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  customerCnic: string | null;
  planName: string | null;
  planSpeed: string | null;
  planPrice: number;
  discount: number;
  netTotal: number;
  cashReceived: number;
  balance: number;
  slipDate: string;
  createdAt: string;
  collectedBy: string | null;
  collectedByName: string | null;
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-PK");
}

function PrintableSlip({
  customer,
  discount,
  cashReceived,
  slipDate,
  isPrintOnly = false,
}: {
  customer: CustomerWithPlan;
  discount: number;
  cashReceived: number;
  slipDate: Date;
  isPrintOnly?: boolean;
}) {
  const tid = (id: string) => isPrintOnly ? undefined : id;
  const price = customer.plan?.price || 0;
  const netTotal = Math.max(0, price - discount);
  const balance = Math.max(0, netTotal - cashReceived);
  const changeDue = cashReceived > netTotal ? cashReceived - netTotal : 0;
  const nextDue = new Date(slipDate);
  nextDue.setMonth(nextDue.getMonth() + 1);

  return (
    <div className="receipt-slip bg-white text-black border border-border rounded-md overflow-visible print:border-none print:rounded-none print:shadow-none print:text-black" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
      <div className="px-3 pt-3 pb-1 text-center">
        <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="w-full max-w-[240px] mx-auto mb-1" />
        <p className="text-[9px] text-gray-600 print:text-black leading-snug">
          Basement Soneri Bank, Alama Iqbal Road, Pattoki
        </p>
      </div>

      <div className="px-3 py-1">
        <div className="border-t border-b border-gray-400 text-center py-0.5">
          <span className="text-xs font-bold">Payment Slip</span>
        </div>
      </div>

      <div className="px-3 py-1 text-[11px] space-y-0.5">
        <div className="flex justify-between" data-testid={tid("text-slip-id")}>
          <span>Customer ID : <span className="font-semibold ml-1">{customer.id}</span></span>
          <span className="text-[10px]">{formatDate(slipDate)}</span>
        </div>
        <div data-testid={tid("text-slip-name")}>
          Name : <span className="ml-3 font-semibold uppercase">{customer.name}</span>
        </div>
        <div data-testid={tid("text-slip-contact")}>
          Contact : <span className="font-semibold">{customer.contact}</span>
        </div>
        <div data-testid={tid("text-slip-address")}>
          Address : <span className="uppercase">{customer.address}</span>
        </div>
        {customer.cnicNumber && (
          <div data-testid={tid("text-slip-cnic")}>
            CNIC : <span className="font-semibold">{customer.cnicNumber}</span>
          </div>
        )}
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
          <span className="font-semibold">Package Details</span>
          <span className="font-semibold">Amount</span>
        </div>
        <div className="flex justify-between text-[11px] py-0.5">
          <span>
            {customer.plan?.name || "No Plan"} {customer.plan?.speed ? `(${customer.plan.speed})` : ""}
          </span>
          <span data-testid={tid("text-slip-price")}>{formatCurrency(price)}.00</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[11px] py-0.5 text-red-600">
            <span>Discount</span>
            <span data-testid={tid("text-slip-discount")}>-{formatCurrency(discount)}.00</span>
          </div>
        )}
      </div>

      <div className="px-3 py-1 text-[11px]">
        <div className="border-t border-gray-300 pt-1 space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>Net Total</span>
            <span data-testid={tid("text-slip-net-total")}>Rs. {formatCurrency(netTotal)}.00</span>
          </div>
          <div className="flex justify-between">
            <span>Cash Received</span>
            <span data-testid={tid("text-slip-cash")}>Rs. {formatCurrency(cashReceived)}.00</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Balance</span>
            <span data-testid={tid("text-slip-balance")}>Rs. {formatCurrency(balance)}.00</span>
          </div>
          {changeDue > 0 && (
            <div className="flex justify-between font-bold">
              <span>Change Due</span>
              <span data-testid={tid("text-slip-change")}>Rs. {formatCurrency(changeDue)}.00</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-1 text-[11px]">
        <div className="border-t border-gray-300 pt-1 space-y-0.5">
          <div className="flex justify-between">
            <span>Payment Date:</span>
            <span data-testid={tid("text-slip-pay-date")}>{formatDate(slipDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Next Due Date:</span>
            <span data-testid={tid("text-slip-next-due")}>{formatDate(nextDue)}</span>
          </div>
        </div>
      </div>

      <div className="px-3 py-1 text-[11px]">
        <div>Amount in words:</div>
        <div className="font-semibold" data-testid={tid("text-slip-words")}>
          {amountToWords(cashReceived)}
        </div>
      </div>

      <div className="px-3 pt-2 pb-3 text-center space-y-0.5 text-[11px]">
        <p className="font-bold">Thank you!</p>
        <p>For Connection &amp; Complain</p>
        <p className="font-semibold">0307-8844421 0327-0223873</p>
        <p className="text-[9px] text-gray-500 print:text-black pt-1">Software developed by: Storm Fiber Internet Pattoki</p>
      </div>
    </div>
  );
}

type Employee = { id: number; firstName: string; lastName: string; employeeCode: string; };

export default function PosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [slipDate, setSlipDate] = useState(new Date().toISOString().split("T")[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDailyCollection, setShowDailyCollection] = useState(false);
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCollector, setSelectedCollector] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: customers, isLoading: customersLoading } = useQuery<CustomerWithPlan[]>({
    queryKey: ["/api/pos/customers"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);

  const { data: previousSlips = [], isLoading: slipsLoading } = useQuery<PosSlip[]>({
    queryKey: ["/api/pos/slips", selectedCustomerId],
    queryFn: async () => {
      const res = await fetch(`/api/pos/slips?customerId=${selectedCustomerId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedCustomerId && showHistory,
    staleTime: 0,
  });

  const saveSlipMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/pos/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save slip");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/slips", selectedCustomerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/slips/daily"] });
    },
  });

  const { data: dailySlips = [], isLoading: dailyLoading } = useQuery<PosSlip[]>({
    queryKey: ["/api/pos/slips/daily", dailyDate],
    queryFn: async () => {
      const res = await fetch(`/api/pos/slips?date=${dailyDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: showDailyCollection,
    staleTime: 0,
  });

  const filteredCustomers = customers?.filter((c) => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.contact.toLowerCase().includes(term) ||
      c.address.toLowerCase().includes(term) ||
      (c.cnicNumber && c.cnicNumber.toLowerCase().includes(term)) ||
      String(c.id).includes(term)
    );
  });

  const handleSelectCustomer = (customer: CustomerWithPlan) => {
    setSelectedCustomerId(customer.id);
    setSearchTerm("");
    setDiscount(0);
    const price = customer.plan?.price || 0;
    setCashReceived(price);
    setSlipDate(new Date().toISOString().split("T")[0]);
    setShowHistory(false);
  };

  const doPrint = () => {
    const style = document.createElement("style");
    style.id = "print-page-size";
    style.textContent = "@media print { @page { size: 80mm auto; margin: 2mm; } }";
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 500);
  };

  const handlePrint = () => {
    if (selectedCustomer) {
      const price = selectedCustomer.plan?.price || 0;
      const net = Math.max(0, price - discount);
      const bal = Math.max(0, net - cashReceived);
      saveSlipMutation.mutate({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerContact: selectedCustomer.contact,
        customerAddress: selectedCustomer.address,
        customerCnic: selectedCustomer.cnicNumber || null,
        planName: selectedCustomer.plan?.name || null,
        planSpeed: selectedCustomer.plan?.speed || null,
        planPrice: price,
        discount,
        netTotal: net,
        cashReceived,
        balance: bal,
        slipDate: slipDate + "T00:00:00.000Z",
        collectedBy: selectedCollector || null,
        collectedByName: selectedCollector ? employees?.find(e => String(e.id) === selectedCollector)?.firstName + ' ' + employees?.find(e => String(e.id) === selectedCollector)?.lastName : null,
      });
    }
    doPrint();
  };

  const handleDuplicatePrint = () => {
    doPrint();
  };

  const handleReset = () => {
    setSelectedCustomerId(null);
    setDiscount(0);
    setCashReceived(0);
    setSearchTerm("");
    setSlipDate(new Date().toISOString().split("T")[0]);
    setShowHistory(false);
    setSelectedCollector("");
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const price = selectedCustomer?.plan?.price || 0;
  const netTotal = Math.max(0, price - discount);
  const balance = Math.max(0, netTotal - cashReceived);
  const changeDue = cashReceived > netTotal ? cashReceived - netTotal : 0;

  const slipDateObj = new Date(slipDate + "T00:00:00");

  return (
    <div className="p-4 md:p-6 overflow-auto h-full space-y-4">
      <div className="print:hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-pos-title">
                  {showDailyCollection ? "Daily Collection" : "POS Collection"}
                </h1>
                <p className="text-white/70 text-sm">{showDailyCollection ? "View daily payment records" : "Generate & print payment slips"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!showDailyCollection && selectedCustomer && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className={showHistory ? "bg-white/30 hover:bg-white/40 text-white border-0 backdrop-blur-sm" : "bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"}
                  >
                    <History className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{showHistory ? "Hide" : "History"}</span>
                  </Button>
                  <Button size="sm" onClick={handleReset} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-pos-reset">
                    <RotateCcw className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">New</span>
                  </Button>
                  <Button size="sm" onClick={handlePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-pos-print">
                    <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
                  </Button>
                  <Button size="sm" onClick={handleDuplicatePrint} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
                    <Copy className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Copy</span>
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={() => setShowDailyCollection(!showDailyCollection)}
                className={showDailyCollection ? "bg-white/30 hover:bg-white/40 text-white border-0 backdrop-blur-sm" : "bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"}
              >
                {showDailyCollection ? (
                  <><ArrowLeft className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Back</span></>
                ) : (
                  <><ClipboardList className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Daily</span></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showDailyCollection && (
        <div className="print:hidden space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Select Date:</Label>
              <Input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              const handleDailyPrint = () => {
                const style = document.createElement("style");
                style.id = "print-page-size";
                style.textContent = "@media print { @page { size: A4 portrait; margin: 10mm; } }";
                document.head.appendChild(style);
                window.print();
                setTimeout(() => style.remove(), 500);
              };
              handleDailyPrint();
            }}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Slips</p>
                <p className="text-2xl font-bold">{dailySlips.length}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.cashReceived, 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Discount</p>
                <p className="text-2xl font-bold text-orange-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.discount, 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-red-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.balance, 0))}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Collectors</p>
                <p className="text-2xl font-bold text-purple-600">{new Set(dailySlips.map(s => s.collectedByName || "Unassigned")).size}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Collection Details - {new Date(dailyDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : dailySlips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payment slips found for this date
                </p>
              ) : (() => {
                const grouped = dailySlips.reduce<Record<string, PosSlip[]>>((acc, slip) => {
                  const key = slip.collectedByName || "Unassigned";
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(slip);
                  return acc;
                }, {});
                const groupKeys = Object.keys(grouped);
                return (
                  <div className="space-y-4">
                    {groupKeys.map((collectorName) => {
                      const groupSlips = grouped[collectorName];
                      return (
                        <div key={collectorName}>
                          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 mb-2 flex-wrap">
                            <span className="text-sm font-semibold flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" /> {collectorName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {groupSlips.length} slips | Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.cashReceived, 0))} collected
                            </span>
                          </div>
                          <div className="overflow-x-auto rounded-lg border mb-2">
                            <table className="w-full text-sm">
                              <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                                <tr>
                                  <th className="text-left p-2 text-xs font-medium text-white">#</th>
                                  <th className="text-left p-2 text-xs font-medium text-white">Customer ID</th>
                                  <th className="text-left p-2 text-xs font-medium text-white">Customer Name</th>
                                  <th className="text-left p-2 text-xs font-medium text-white">Contact</th>
                                  <th className="text-left p-2 text-xs font-medium text-white">Package</th>
                                  <th className="text-right p-2 text-xs font-medium text-white">Price</th>
                                  <th className="text-right p-2 text-xs font-medium text-white">Discount</th>
                                  <th className="text-right p-2 text-xs font-medium text-white">Net Total</th>
                                  <th className="text-right p-2 text-xs font-medium text-white">Received</th>
                                  <th className="text-right p-2 text-xs font-medium text-white">Balance</th>
                                  <th className="text-left p-2 text-xs font-medium text-white">Collected By</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {groupSlips.map((s, idx) => (
                                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                    <td className="p-2 font-medium">{s.customerId}</td>
                                    <td className="p-2">{s.customerName}</td>
                                    <td className="p-2 text-muted-foreground">{s.customerContact}</td>
                                    <td className="p-2">
                                      {s.planName ? (
                                        <Badge variant="secondary" className="text-[10px]">{s.planName}</Badge>
                                      ) : "-"}
                                    </td>
                                    <td className="p-2 text-right">Rs. {formatCurrency(s.planPrice)}</td>
                                    <td className="p-2 text-right text-orange-600">{s.discount > 0 ? `Rs. ${formatCurrency(s.discount)}` : "-"}</td>
                                    <td className="p-2 text-right">Rs. {formatCurrency(s.netTotal)}</td>
                                    <td className="p-2 text-right font-medium text-green-600">Rs. {formatCurrency(s.cashReceived)}</td>
                                    <td className="p-2 text-right text-red-600">{s.balance > 0 ? `Rs. ${formatCurrency(s.balance)}` : "-"}</td>
                                    <td className="p-2 text-muted-foreground">{s.collectedByName || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 font-bold bg-muted/30">
                                  <td colSpan={5} className="p-2">Subtotal ({groupSlips.length} slips)</td>
                                  <td className="p-2 text-right">Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.planPrice, 0))}</td>
                                  <td className="p-2 text-right text-orange-600">Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.discount, 0))}</td>
                                  <td className="p-2 text-right">Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.netTotal, 0))}</td>
                                  <td className="p-2 text-right text-green-600">Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.cashReceived, 0))}</td>
                                  <td className="p-2 text-right text-red-600">Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.balance, 0))}</td>
                                  <td className="p-2"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                    <div className="overflow-x-auto rounded-lg border border-2 border-foreground/20">
                      <table className="w-full text-sm">
                        <tfoot>
                          <tr className="font-bold bg-muted/50">
                            <td colSpan={5} className="p-2">Grand Total ({dailySlips.length} slips, {groupKeys.length} collectors)</td>
                            <td className="p-2 text-right">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.planPrice, 0))}</td>
                            <td className="p-2 text-right text-orange-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.discount, 0))}</td>
                            <td className="p-2 text-right">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.netTotal, 0))}</td>
                            <td className="p-2 text-right text-green-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.cashReceived, 0))}</td>
                            <td className="p-2 text-right text-red-600">Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.balance, 0))}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {showDailyCollection && (
        <div className="hidden print:block daily-print-sheet">
          <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" style={{ maxWidth: "200px" }} />
              <p style={{ fontSize: "11px", color: "#666", margin: "4px 0" }}>Basement Soneri Bank, Alama Iqbal Road, Pattoki</p>
            </div>
            <div style={{ border: "2px solid #333", padding: "6px", textAlign: "center", marginBottom: "10px" }}>
              <h2 style={{ margin: 0, fontSize: "16px" }}>DAILY COLLECTION REPORT</h2>
              <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                Date: {new Date(dailyDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <p style={{ fontSize: "10px", textAlign: "right", marginBottom: "8px" }}>
              Print Date: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "12px", fontSize: "12px" }}>
              <div style={{ flex: 1, border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>{dailySlips.length}</div>
                <div>Total Slips</div>
              </div>
              <div style={{ flex: 1, border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "18px", color: "green" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.cashReceived, 0))}</div>
                <div>Total Collected</div>
              </div>
              <div style={{ flex: 1, border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "18px" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.discount, 0))}</div>
                <div>Total Discount</div>
              </div>
              <div style={{ flex: 1, border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "18px", color: "red" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.balance, 0))}</div>
                <div>Total Balance</div>
              </div>
            </div>

            {(() => {
              const printGrouped = dailySlips.reduce<Record<string, PosSlip[]>>((acc, slip) => {
                const key = slip.collectedByName || "Unassigned";
                if (!acc[key]) acc[key] = [];
                acc[key].push(slip);
                return acc;
              }, {});
              const printGroupKeys = Object.keys(printGrouped);
              return (
                <>
                  {printGroupKeys.map((collectorName) => {
                    const groupSlips = printGrouped[collectorName];
                    return (
                      <div key={collectorName} style={{ marginBottom: "16px" }}>
                        <div style={{ backgroundColor: "#e0e0e0", padding: "4px 8px", fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}>
                          {collectorName} - {groupSlips.length} slips | Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.cashReceived, 0))} collected
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f0f0f0" }}>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>#</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>ID</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>Customer Name</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>Contact</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>Package</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Price</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Discount</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Received</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Balance</th>
                              <th style={{ border: "1px solid #ccc", padding: "4px", textAlign: "left" }}>Collected By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupSlips.map((s, idx) => (
                              <tr key={s.id}>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{idx + 1}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{s.customerId}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{s.customerName}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{s.customerContact}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{s.planName || "-"}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(s.planPrice)}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{s.discount > 0 ? `Rs. ${formatCurrency(s.discount)}` : "-"}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(s.cashReceived)}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>{s.balance > 0 ? `Rs. ${formatCurrency(s.balance)}` : "-"}</td>
                                <td style={{ border: "1px solid #ccc", padding: "4px" }}>{s.collectedByName || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                              <td colSpan={5} style={{ border: "1px solid #ccc", padding: "4px" }}>Subtotal ({groupSlips.length} slips)</td>
                              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.planPrice, 0))}</td>
                              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.discount, 0))}</td>
                              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.cashReceived, 0))}</td>
                              <td style={{ border: "1px solid #ccc", padding: "4px", textAlign: "right" }}>Rs. {formatCurrency(groupSlips.reduce((s, p) => s + p.balance, 0))}</td>
                              <td style={{ border: "1px solid #ccc", padding: "4px" }}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "20px" }}>
                    <tfoot>
                      <tr style={{ fontWeight: "bold", backgroundColor: "#d0d0d0" }}>
                        <td colSpan={5} style={{ border: "2px solid #999", padding: "6px" }}>Grand Total ({dailySlips.length} slips, {printGroupKeys.length} collectors)</td>
                        <td style={{ border: "2px solid #999", padding: "6px", textAlign: "right" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.planPrice, 0))}</td>
                        <td style={{ border: "2px solid #999", padding: "6px", textAlign: "right" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.discount, 0))}</td>
                        <td style={{ border: "2px solid #999", padding: "6px", textAlign: "right" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.cashReceived, 0))}</td>
                        <td style={{ border: "2px solid #999", padding: "6px", textAlign: "right" }}>Rs. {formatCurrency(dailySlips.reduce((s, p) => s + p.balance, 0))}</td>
                        <td style={{ border: "2px solid #999", padding: "6px" }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "11px" }}>
              <div style={{ textAlign: "center", width: "30%" }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: "4px" }}>Prepared By</div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: "4px" }}>Verified By</div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: "4px" }}>Authorized Sign</div>
              </div>
            </div>
            <p style={{ textAlign: "center", fontSize: "9px", color: "#999", marginTop: "20px" }}>Software developed by: Storm Fiber Internet Pattoki</p>
          </div>
        </div>
      )}

      {!showDailyCollection && <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:hidden">
        <div className="lg:col-span-5 space-y-4">
          {!selectedCustomer && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Name, contact, CNIC, address, or ID..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    data-testid="input-pos-search"
                  />
                </div>

                {customersLoading && searchTerm && (
                  <div className="space-y-2">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                )}

                {filteredCustomers && filteredCustomers.length > 0 && (
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm" data-testid="table-pos-search-results">
                      <thead className="bg-gradient-to-r from-slate-800 to-slate-700 sticky top-0">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium text-white">ID</th>
                          <th className="text-left p-2 text-xs font-medium text-white">Name</th>
                          <th className="text-left p-2 text-xs font-medium text-white">Contact</th>
                          <th className="text-left p-2 text-xs font-medium text-white">Package</th>
                          <th className="text-left p-2 text-xs font-medium text-white">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCustomers.map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            data-testid={`row-pos-customer-${c.id}`}
                          >
                            <td className="p-2 font-medium">{c.id}</td>
                            <td className="p-2">{c.name}</td>
                            <td className="p-2 text-muted-foreground">{c.contact}</td>
                            <td className="p-2">
                              {c.plan ? (
                                <Badge variant="secondary" className="text-[10px]">{c.plan.name}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                            <td className="p-2 font-medium">{c.plan ? `Rs. ${formatCurrency(c.plan.price)}` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {searchTerm && filteredCustomers && filteredCustomers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
                )}

                {!searchTerm && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Type to search by name, contact, CNIC, address, or customer ID
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {selectedCustomer && (
            <>
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Customer Detail</CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleReset} data-testid="button-pos-clear">
                    <X className="mr-2 h-4 w-4" /> Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Customer ID</span>
                      <p className="font-medium" data-testid="text-pos-cust-id">{selectedCustomer.id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Status</span>
                      <div>
                        <Badge
                          variant={selectedCustomer.status === "active" ? "default" : "secondary"}
                          data-testid="text-pos-cust-status"
                        >
                          {selectedCustomer.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Name</span>
                      <p className="font-medium" data-testid="text-pos-cust-name">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Contact</span>
                      <p className="flex items-center gap-1" data-testid="text-pos-cust-contact">
                        <Phone className="h-3 w-3 text-muted-foreground" /> {selectedCustomer.contact}
                      </p>
                    </div>
                    {selectedCustomer.cnicNumber && (
                      <div>
                        <span className="text-muted-foreground text-xs">CNIC</span>
                        <p className="flex items-center gap-1" data-testid="text-pos-cust-cnic">
                          <IdCard className="h-3 w-3 text-muted-foreground" /> {selectedCustomer.cnicNumber}
                        </p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Address</span>
                      <p className="flex items-center gap-1 text-muted-foreground" data-testid="text-pos-cust-address">
                        <MapPin className="h-3 w-3 shrink-0" /> {selectedCustomer.address}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Package & Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-muted-foreground text-xs">Package</span>
                    <p className="font-medium flex items-center gap-1" data-testid="text-pos-package">
                      <Wifi className="h-3 w-3 text-muted-foreground" />
                      {selectedCustomer.plan?.name || "No Plan"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Speed</span>
                    <p className="font-medium" data-testid="text-pos-speed">{selectedCustomer.plan?.speed || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Price</span>
                    <p className="font-medium text-lg" data-testid="text-pos-price">Rs. {formatCurrency(price)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Net Total</span>
                    <p className="font-bold text-lg" data-testid="text-pos-net-total">Rs. {formatCurrency(netTotal)}</p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" /> Collected By
                    </Label>
                    <Select value={selectedCollector} onValueChange={setSelectedCollector} data-testid="select-collected-by">
                      <SelectTrigger data-testid="select-collected-by">
                        <SelectValue placeholder="Select collector" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="slip-date" className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Slip Date
                    </Label>
                    <Input
                      id="slip-date"
                      type="date"
                      value={slipDate}
                      onChange={(e) => setSlipDate(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount" className="text-xs text-muted-foreground">Discount (Rs.)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min={0}
                        max={price}
                        value={discount || ""}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(price, parseInt(e.target.value) || 0));
                          setDiscount(val);
                          setCashReceived(Math.max(0, price - val));
                        }}
                        placeholder="0"
                        data-testid="input-pos-discount"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cash" className="text-xs text-muted-foreground">Cash Received (Rs.)</Label>
                      <Input
                        id="cash"
                        type="number"
                        min={0}
                        value={cashReceived || ""}
                        onChange={(e) => setCashReceived(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        data-testid="input-pos-cash"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" /> Balance Due
                      </span>
                      <span className="text-sm font-bold" data-testid="text-pos-balance">
                        Rs. {formatCurrency(balance)}
                      </span>
                    </div>
                    {changeDue > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Change Due</span>
                        <span className="text-sm font-bold text-green-700 dark:text-green-400" data-testid="text-pos-change">
                          Rs. {formatCurrency(changeDue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3 flex gap-2 flex-wrap">
                  <Button onClick={handlePrint} className="flex-1" data-testid="button-pos-print-slip">
                    <Printer className="mr-2 h-4 w-4" /> Print Slip
                  </Button>
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </div>

        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground print:hidden">Slip Preview</h3>
              <div className="max-w-[380px] mx-auto" data-testid="pos-slip-preview">
                <PrintableSlip
                  customer={selectedCustomer}
                  discount={discount}
                  cashReceived={cashReceived}
                  slipDate={slipDateObj}
                />
              </div>

              {showHistory && (
                <Card className="mt-4 border-0 shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4" /> Previous Payment Slips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {slipsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                      </div>
                    ) : previousSlips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No previous slips found for this customer
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                            <tr>
                              <th className="text-left p-2 text-xs font-medium text-white">#</th>
                              <th className="text-left p-2 text-xs font-medium text-white">Date</th>
                              <th className="text-left p-2 text-xs font-medium text-white">Package</th>
                              <th className="text-right p-2 text-xs font-medium text-white">Price</th>
                              <th className="text-right p-2 text-xs font-medium text-white">Discount</th>
                              <th className="text-right p-2 text-xs font-medium text-white">Received</th>
                              <th className="text-right p-2 text-xs font-medium text-white">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {previousSlips.map((s, idx) => (
                              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                <td className="p-2">
                                  {new Date(s.slipDate).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="p-2">{s.planName || "-"}</td>
                                <td className="p-2 text-right">Rs. {formatCurrency(s.planPrice)}</td>
                                <td className="p-2 text-right text-red-600">{s.discount > 0 ? `-Rs. ${formatCurrency(s.discount)}` : "-"}</td>
                                <td className="p-2 text-right font-medium">Rs. {formatCurrency(s.cashReceived)}</td>
                                <td className="p-2 text-right">{s.balance > 0 ? `Rs. ${formatCurrency(s.balance)}` : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-bold">
                              <td colSpan={3} className="p-2">Total ({previousSlips.length} slips)</td>
                              <td className="p-2 text-right">Rs. {formatCurrency(previousSlips.reduce((s, p) => s + p.planPrice, 0))}</td>
                              <td className="p-2 text-right text-red-600">-Rs. {formatCurrency(previousSlips.reduce((s, p) => s + p.discount, 0))}</td>
                              <td className="p-2 text-right">Rs. {formatCurrency(previousSlips.reduce((s, p) => s + p.cashReceived, 0))}</td>
                              <td className="p-2 text-right">Rs. {formatCurrency(previousSlips.reduce((s, p) => s + p.balance, 0))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background">
              <CardContent className="py-16 text-center">
                <Printer className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Payment Slip Preview</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto">
                  Search and select a customer to generate a payment slip with discount option
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>}

      {!showDailyCollection && selectedCustomer && (
        <div className="hidden print:block" aria-hidden="true">
          <div className="max-w-[380px] mx-auto">
            <PrintableSlip
              customer={selectedCustomer}
              discount={discount}
              cashReceived={cashReceived}
              slipDate={slipDateObj}
              isPrintOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}
