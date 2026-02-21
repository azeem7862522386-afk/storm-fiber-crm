import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Upload, FileSpreadsheet, RefreshCw, Check, X, Globe } from "lucide-react";

const NBB_FIELDS = [
  { key: "customerName", label: "Customer Name" },
  { key: "connectionId", label: "Connection ID / Username" },
  { key: "status", label: "Status" },
  { key: "speed", label: "Speed / Plan" },
  { key: "macAddress", label: "MAC Address" },
  { key: "onuSerial", label: "ONU Serial" },
] as const;

type NbbField = typeof NBB_FIELDS[number]["key"];

const HEADER_HINTS: Record<string, NbbField> = {
  "customer": "customerName", "name": "customerName", "customer name": "customerName", "subscriber": "customerName",
  "username": "connectionId", "connection id": "connectionId", "connection": "connectionId", "id": "connectionId", "user": "connectionId", "login": "connectionId",
  "status": "status", "state": "status",
  "speed": "speed", "plan": "speed", "package": "speed", "bandwidth": "speed",
  "mac": "macAddress", "mac address": "macAddress", "mac_address": "macAddress",
  "onu": "onuSerial", "onu serial": "onuSerial", "serial": "onuSerial", "onu_serial": "onuSerial", "sn": "onuSerial",
};

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs >= commas ? "\t" : ",";
}

function guessMapping(headers: string[]): Record<number, NbbField | ""> {
  const mapping: Record<number, NbbField | ""> = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().trim();
    mapping[i] = HEADER_HINTS[lower] || "";
  });
  return mapping;
}

interface NbbConnection {
  id: number;
  customerName: string;
  connectionId: string;
  status: string;
  speed: string | null;
  macAddress: string | null;
  onuSerial: string | null;
  importedAt: string;
}

export default function NbbPortalPage() {
  const { toast } = useToast();
  const [rawData, setRawData] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, NbbField | "">>({});
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<NbbConnection[]>({
    queryKey: ["/api/nbb/connections"],
  });

  const importMutation = useMutation({
    mutationFn: async (records: Record<string, string>[]) => {
      const res = await apiRequest("POST", "/api/nbb/import", { records });
      return res.json();
    },
    onSuccess: (data: { success: number; errors: number }) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/nbb/connections"] });
      toast({ title: "Import complete", description: `${data.success} imported, ${data.errors} errors` });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  function handleParse() {
    if (!rawData.trim()) {
      toast({ title: "Please paste data first", variant: "destructive" });
      return;
    }
    const delimiter = detectDelimiter(rawData);
    const lines = rawData.trim().split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast({ title: "Data must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const parsedHeaders = lines[0].split(delimiter).map((h) => h.trim());
    const parsedRows = lines.slice(1).map((line) => line.split(delimiter).map((c) => c.trim()));
    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setColumnMap(guessMapping(parsedHeaders));
    setImportResult(null);
  }

  function handleImport() {
    const mapped = rows.map((row) => {
      const record: Record<string, string> = {};
      Object.entries(columnMap).forEach(([colIdx, field]) => {
        if (field) {
          record[field] = row[Number(colIdx)] || "";
        }
      });
      return record;
    }).filter((r) => r.customerName || r.connectionId);

    if (mapped.length === 0) {
      toast({ title: "No valid records to import", description: "Map at least Customer Name or Connection ID", variant: "destructive" });
      return;
    }
    importMutation.mutate(mapped);
  }

  function updateMapping(colIndex: number, value: string) {
    setColumnMap((prev) => ({ ...prev, [colIndex]: value as NbbField | "" }));
  }

  function handleClear() {
    setRawData("");
    setHeaders([]);
    setRows([]);
    setColumnMap({});
    setImportResult(null);
  }

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);
  const usedFields = new Set(Object.values(columnMap).filter(Boolean));

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-nbb-title">
            NBB Partner Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            National Broadband partner integration and data import
          </p>
        </div>
      </div>

      <Card data-testid="card-quick-access">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Quick Access Portal
          </CardTitle>
          <CardDescription>
            Access the National Broadband partner portal to manage connections, view reports, and check customer statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.open("https://partner.nationalbroadband.pk/site/login", "_blank")}
            data-testid="button-open-nbb-portal"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open NBB Partner Portal
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-data-import">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Data Import
          </CardTitle>
          <CardDescription>
            Paste CSV or tab-separated data exported from the NBB portal. The system will auto-detect columns and let you map them before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your CSV or tab-separated data here (include header row)..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
            data-testid="textarea-paste-data"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleParse} data-testid="button-parse-data">
              <Upload className="h-4 w-4 mr-2" />
              Parse Data
            </Button>
            {headers.length > 0 && (
              <Button variant="outline" onClick={handleClear} data-testid="button-clear-data">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {headers.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2" data-testid="text-mapping-title">Column Mapping</h3>
                <p className="text-xs text-muted-foreground mb-3">Map each detected column to the appropriate field. Unmapped columns will be skipped.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {headers.map((header, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground min-w-[100px] truncate" title={header} data-testid={`text-header-${idx}`}>
                        {header}
                      </span>
                      <Select value={columnMap[idx] || "skip"} onValueChange={(v) => updateMapping(idx, v === "skip" ? "" : v)}>
                        <SelectTrigger className="flex-1" data-testid={`select-mapping-${idx}`}>
                          <SelectValue placeholder="Skip" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip</SelectItem>
                          {NBB_FIELDS.map((f) => (
                            <SelectItem
                              key={f.key}
                              value={f.key}
                              disabled={usedFields.has(f.key) && columnMap[idx] !== f.key}
                            >
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2" data-testid="text-preview-title">
                  Preview ({rows.length} rows, showing first {previewRows.length})
                </h3>
                <div className="overflow-x-auto border rounded-md">
                  <Table data-testid="table-preview">
                    <TableHeader>
                      <TableRow>
                        {headers.map((h, i) => (
                          <TableHead key={i} className="text-xs whitespace-nowrap">
                            <div>{h}</div>
                            {columnMap[i] && (
                              <Badge variant="secondary" className="mt-1 text-[10px] no-default-hover-elevate no-default-active-elevate">
                                {NBB_FIELDS.find((f) => f.key === columnMap[i])?.label}
                              </Badge>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, ri) => (
                        <TableRow key={ri} data-testid={`row-preview-${ri}`}>
                          {row.map((cell, ci) => (
                            <TableCell key={ci} className="text-xs whitespace-nowrap">
                              {cell || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={handleImport} disabled={importMutation.isPending} data-testid="button-import-data">
                  {importMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import {rows.length} Records
                </Button>
                {importResult && (
                  <div className="flex items-center gap-3 text-sm" data-testid="text-import-result">
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" /> {importResult.success} imported
                    </span>
                    {importResult.errors > 0 && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <X className="h-4 w-4" /> {importResult.errors} errors
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-connections">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            NBB Connections
          </CardTitle>
          <CardDescription>
            Previously imported connection records from the National Broadband portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {connectionsLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-loading-connections">
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-connections">
              No NBB connections imported yet. Use the data import section above to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-connections">
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Connection ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Speed / Plan</TableHead>
                    <TableHead className="hidden md:table-cell">MAC Address</TableHead>
                    <TableHead className="hidden lg:table-cell">ONU Serial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((conn) => (
                    <TableRow key={conn.id} data-testid={`row-connection-${conn.id}`}>
                      <TableCell className="font-medium" data-testid={`text-conn-name-${conn.id}`}>
                        {conn.customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-conn-id-${conn.id}`}>
                        {conn.connectionId}
                      </TableCell>
                      <TableCell>
                        <NbbStatusBadge status={conn.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-conn-speed-${conn.id}`}>
                        {conn.speed || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs" data-testid={`text-conn-mac-${conn.id}`}>
                        {conn.macAddress || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs" data-testid={`text-conn-onu-${conn.id}`}>
                        {conn.onuSerial || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NbbStatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const isActive = ["on", "active", "online"].includes(lower);
  return (
    <Badge
      variant="secondary"
      className={`no-default-hover-elevate no-default-active-elevate ${
        isActive
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      }`}
      data-testid={`badge-status-${lower}`}
    >
      {status}
    </Badge>
  );
}
