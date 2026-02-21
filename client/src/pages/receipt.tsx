import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, Receipt } from "lucide-react";
import { amountToWords } from "@/lib/amount-to-words";
import type { InvoiceWithRelations } from "@shared/schema";

function formatPaymentMethod(method: string): string {
  switch (method) {
    case "cash": return "Cash";
    case "bank": return "Bank Transfer";
    case "mobile_money": return "Mobile Money";
    case "online": return "Online";
    default: return method;
  }
}

function formatDateTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

function formatNextDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

export default function ReceiptPage() {
  const params = useParams<{ invoiceId: string; paymentId: string }>();
  const [, navigate] = useLocation();

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ["/api/invoices", params.invoiceId],
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] max-w-[320px] mx-auto" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Invoice not found</p>
        <Link href="/billing">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Billing
          </Button>
        </Link>
      </div>
    );
  }

  const payment = invoice.payments.find((p) => p.id === Number(params.paymentId));

  if (!payment) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Payment not found</p>
        <Link href={`/billing/${params.invoiceId}`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoice
          </Button>
        </Link>
      </div>
    );
  }

  const nextDueDate = formatNextDueDate(invoice.dueDate);
  const balance = invoice.totalAmount - payment.amount;

  return (
    <div className="p-4 md:p-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/billing/${params.invoiceId}`)}
            data-testid="button-back-to-invoice"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-receipt-title">
            Payment Receipt
          </h1>
        </div>
        <Button onClick={() => window.print()} data-testid="button-print-receipt">
          <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
      </div>

      <div className="max-w-[320px] mx-auto" data-testid="receipt-container">
        <div className="receipt-slip bg-white text-black border border-border rounded-md overflow-visible print:border-none print:rounded-none print:shadow-none" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          <div className="px-3 pt-3 pb-1 text-center">
            <img src="/images/slip-logo.jpg" alt="NBB & Storm Fiber" className="w-full max-w-[240px] mx-auto mb-1" />
            <p className="text-[9px] text-gray-600 leading-snug">
              Basement Soneri Bank, Alama Iqbal Road, Pattoki
            </p>
          </div>

          <div className="px-3 py-1">
            <div className="border-t border-b border-gray-400 text-center py-0.5">
              <span className="text-xs font-bold">Invoice</span>
            </div>
          </div>

          <div className="px-3 py-1 text-[11px] space-y-0.5">
            <div className="flex justify-between" data-testid="text-receipt-bill-no">
              <span>Bill # : <span className="font-semibold ml-1">NBB-{String(invoice.id).padStart(5, "0")}</span></span>
              <span className="text-[10px]">{formatDateTime(payment.receivedAt)}</span>
            </div>
            <div data-testid="text-receipt-name">
              Name : <span className="ml-3 font-semibold uppercase">{invoice.customer.name}</span>
            </div>
            <div data-testid="text-receipt-contact">
              Contact #. <span className="font-semibold">{invoice.customer.contact}</span>
            </div>
            <div data-testid="text-receipt-address">
              Address : <span className="uppercase">{invoice.customer.address}</span>
            </div>
          </div>

          <div className="px-3 pt-2 pb-1">
            <div className="flex justify-between text-[11px] border-b border-gray-400 pb-0.5 mb-1">
              <span className="font-semibold">Description</span>
              <span className="font-semibold">Charges</span>
            </div>
            <div className="flex justify-between text-[11px] py-0.5">
              <span>
                {invoice.plan?.name || "Internet"} {invoice.plan?.speed || ""}
              </span>
              <span>{Number(invoice.baseAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-[11px] py-0.5">
                <span>Discount</span>
                <span>-{Number(invoice.discountAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </div>
            )}
            {invoice.penaltyAmount > 0 && (
              <div className="flex justify-between text-[11px] py-0.5">
                <span>Late Penalty</span>
                <span>+{Number(invoice.penaltyAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </div>
            )}
          </div>

          <div className="px-3 py-1 text-[11px]">
            <div className="border-t border-gray-300 pt-1">
              <div className="flex justify-between">
                <div>
                  <div>Next due date:</div>
                  <div className="text-[10px]" data-testid="text-receipt-next-due">{nextDueDate}</div>
                </div>
                <div className="text-right">
                  <div className="flex justify-between gap-4">
                    <span>Sub Total :</span>
                    <span className="font-semibold" data-testid="text-receipt-subtotal">{Number(invoice.totalAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-1">
              <div className="flex justify-end">
                <div className="flex justify-between gap-4">
                  <span data-testid="text-receipt-method">{formatPaymentMethod(payment.method)}:</span>
                  <span className="font-semibold" data-testid="text-receipt-paid">{Number(payment.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="flex justify-between gap-4">
                  <span>Balance:</span>
                  <span className="font-semibold">{balance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 py-1 text-[11px]">
            <div>Amount in words:</div>
            <div className="font-semibold" data-testid="text-receipt-words">
              {amountToWords(payment.amount)}
            </div>
          </div>

          <div className="px-3 pt-2 pb-3 text-center space-y-0.5 text-[11px]">
            <p className="font-bold">Thank you!</p>
            <p>For Connection &amp; Complain</p>
            <p className="font-semibold">0307-8844421 0327-0223873</p>
            <p className="text-[9px] text-gray-500 pt-1">Software developed by: Fast Click Solutions, Ptk</p>
            <p className="text-[9px] text-gray-500">www.fastclicksolutions.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
