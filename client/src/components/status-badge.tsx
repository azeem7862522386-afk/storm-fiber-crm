import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  register: { label: "Register", variant: "outline", className: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300" },
  active: { label: "Active", variant: "outline", className: "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300" },
  suspended: { label: "Suspended", variant: "outline", className: "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300" },
  terminated: { label: "Terminated", variant: "outline", className: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.register;
  return (
    <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
