import { Badge } from "@/components/ui/badge";

const invoiceStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: { label: "Draft", variant: "outline", className: "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400" },
  issued: { label: "Issued", variant: "outline", className: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" },
  paid: { label: "Paid", variant: "outline", className: "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" },
  partial: { label: "Partial", variant: "outline", className: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300" },
  overdue: { label: "Overdue", variant: "outline", className: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300" },
  void: { label: "Void", variant: "outline", className: "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-500" },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = invoiceStatusConfig[status] || invoiceStatusConfig.draft;
  return (
    <Badge variant={config.variant} className={config.className} data-testid={`badge-invoice-status-${status}`}>
      {config.label}
    </Badge>
  );
}

const methodLabels: Record<string, string> = {
  cash: "Cash",
  bank: "Bank Transfer",
  mobile_money: "Mobile Money",
  online: "Online",
};

export function PaymentMethodBadge({ method }: { method: string }) {
  return (
    <Badge variant="secondary" data-testid={`badge-payment-method-${method}`}>
      {methodLabels[method] || method}
    </Badge>
  );
}
