import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollText } from "lucide-react";

export default function AuditLogsPage() {
  const [entityFilter, setEntityFilter] = useState("");
  const [limitFilter, setLimitFilter] = useState("100");

  const queryParams = new URLSearchParams();
  if (entityFilter.trim()) queryParams.set("entity", entityFilter.trim());
  queryParams.set("limit", limitFilter || "100");
  const queryString = queryParams.toString();

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", `?${queryString}`],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Audit Logs</h1>
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Input
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="e.g., employees, policies"
            className="w-[200px]"
            data-testid="input-filter-entity"
          />
        </div>
        <div className="space-y-2">
          <Label>Limit</Label>
          <Input
            type="number"
            min="1"
            max="1000"
            value={limitFilter}
            onChange={(e) => setLimitFilter(e.target.value)}
            className="w-[100px]"
            data-testid="input-filter-limit"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3">Date/Time</th>
                    <th className="text-left px-4 py-3">Action</th>
                    <th className="text-left px-4 py-3">Entity</th>
                    <th className="text-left px-4 py-3">Entity ID</th>
                    <th className="text-left px-4 py-3">Details</th>
                    <th className="text-left px-4 py-3">Performed By</th>
                    <th className="text-left px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b" data-testid={`row-audit-${log.id}`}>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap" data-testid={`text-audit-date-${log.id}`}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 font-medium" data-testid={`text-audit-action-${log.id}`}>{log.action}</td>
                      <td className="px-4 py-2" data-testid={`text-audit-entity-${log.id}`}>{log.entity}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground" data-testid={`text-audit-entity-id-${log.id}`}>{log.entityId ?? "-"}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate text-muted-foreground" data-testid={`text-audit-details-${log.id}`}>{log.details || "-"}</td>
                      <td className="px-4 py-2" data-testid={`text-audit-performed-by-${log.id}`}>{log.performedBy || "-"}</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground" data-testid={`text-audit-ip-${log.id}`}>{log.ipAddress || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
