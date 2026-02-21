import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, Send, Settings, Trash2, RefreshCw, MessageSquare, Calendar, Search, User, Loader2 } from "lucide-react";

interface CustomerResult {
  id: number;
  name: string;
  contact: string;
  address: string;
  planId: number | null;
  connectionDate: string | null;
  status: string;
}

export default function ExpiryRemindersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [daysBefore, setDaysBefore] = useState("2");
  const [template, setTemplate] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [manualResult, setManualResult] = useState<{ expiryDate: string; lastPayment: string } | null>(null);

  const { data: reminders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/expiry-reminders"],
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/expiry-reminders/settings"],
    enabled: settingsOpen,
  });

  const checkNowMutation = useMutation({
    mutationFn: async (date?: string) => {
      const res = await fetch("/api/expiry-reminders/check-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(date ? { date } : {}),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Check Complete", description: `${data.remindersSent} reminders sent` });
      queryClient.invalidateQueries({ queryKey: ["/api/expiry-reminders"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to check reminders", variant: "destructive" });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { daysBefore: string; template: string }) => {
      const res = await fetch("/api/expiry-reminders/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved" });
      setSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/expiry-reminders/settings"] });
    },
  });

  const searchCustomersMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`);
      return res.json();
    },
    onSuccess: (data: CustomerResult[]) => {
      setSearchResults(data);
      if (data.length === 0) {
        toast({ title: "No customers found", description: "Try a different name or number", variant: "destructive" });
      }
    },
  });

  const sendManualMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch("/api/expiry-reminders/send-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reminder Sent!", description: `Expiry: ${data.expiryDate} | Last Payment: ${data.lastPayment}` });
      setManualResult({ expiryDate: data.expiryDate, lastPayment: data.lastPayment });
      queryClient.invalidateQueries({ queryKey: ["/api/expiry-reminders"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expiry-reminders/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Reminder Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/expiry-reminders"] });
    },
  });

  const totalSent = reminders.length;
  const whatsappSent = reminders.filter((r: any) => r.whatsappSent).length;

  return (
    <div className="overflow-auto h-full p-4 md:p-6 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Expiry Reminders</h1>
                <p className="text-white/70 text-sm">Automated WhatsApp expiry notifications</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Dialog open={settingsOpen} onOpenChange={(open) => {
                setSettingsOpen(open);
                if (open && settings) {
                  setDaysBefore(settings.daysBefore);
                  setTemplate(settings.template);
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"><Settings className="h-4 w-4" /><span className="hidden sm:inline ml-2">Settings</span></Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Reminder Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Send reminder how many days before expiry?</Label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={daysBefore}
                        onChange={(e) => setDaysBefore(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Currently set to {daysBefore} days before expiry
                      </p>
                    </div>
                    <div>
                      <Label>Message Template</Label>
                      <Textarea
                        rows={5}
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Available variables: {"{customerName}"}, {"{planName}"}, {"{expiryDate}"}, {"{daysBefore}"}
                      </p>
                    </div>
                    <Button
                      onClick={() => saveSettingsMutation.mutate({ daysBefore, template })}
                      disabled={saveSettingsMutation.isPending}
                      className="w-full"
                    >
                      Save Settings
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={() => checkNowMutation.mutate(undefined)}
                disabled={checkNowMutation.isPending}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <RefreshCw className={`h-4 w-4 ${checkNowMutation.isPending ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline ml-2">Check Now</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Reminders Sent</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">WhatsApp Sent</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{whatsappSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform">
                <Send className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Schedule</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">Daily 9 AM</p>
                <p className="text-xs text-muted-foreground">Auto-checks every day</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Check by Date
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!customDate) {
                    toast({ title: "Please select a date", variant: "destructive" });
                    return;
                  }
                  checkNowMutation.mutate(customDate);
                }}
                disabled={checkNowMutation.isPending || !customDate}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${checkNowMutation.isPending ? "animate-spin" : ""}`} />
                Check
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Send Manual Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or contact..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualSearch.trim()) {
                      searchCustomersMutation.mutate(manualSearch.trim());
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (!manualSearch.trim()) {
                    toast({ title: "Enter a name or number", variant: "destructive" });
                    return;
                  }
                  searchCustomersMutation.mutate(manualSearch.trim());
                }}
                disabled={searchCustomersMutation.isPending}
                variant="outline"
              >
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {searchResults.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700">
                  <TableHead className="text-white font-semibold">Name</TableHead>
                  <TableHead className="text-white font-semibold">Contact</TableHead>
                  <TableHead className="text-white font-semibold">Status</TableHead>
                  <TableHead className="text-right text-white font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {searchResults.map((c) => (
                  <TableRow key={c.id} className={`hover:bg-muted/50 transition-colors ${selectedCustomer?.id === c.id ? "bg-blue-50 dark:bg-blue-950" : ""}`}>
                    <TableCell className="font-medium py-2">{c.name}</TableCell>
                    <TableCell className="py-2">{c.contact}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize text-xs">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setManualResult(null);
                          sendManualMutation.mutate(c.id);
                        }}
                        disabled={sendManualMutation.isPending && selectedCustomer?.id === c.id}
                      >
                        {sendManualMutation.isPending && selectedCustomer?.id === c.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        Send
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedCustomer && manualResult && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center gap-3 text-sm">
          <MessageSquare className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-green-700 dark:text-green-400">
            Sent to <strong>{selectedCustomer.name}</strong> ({selectedCustomer.contact}) — Expiry: <strong>{manualResult.expiryDate}</strong> | Last Payment: <strong>{manualResult.lastPayment}</strong>
          </span>
        </div>
      )}

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Sent Reminders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No reminders sent yet</p>
              <p className="text-sm mt-1">Reminders will be sent automatically when customer connections are about to expire</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700">
                  <TableHead className="text-white font-semibold">Customer</TableHead>
                  <TableHead className="text-white font-semibold">Contact</TableHead>
                  <TableHead className="text-white font-semibold">Plan</TableHead>
                  <TableHead className="text-white font-semibold">Expiry Date</TableHead>
                  <TableHead className="text-white font-semibold">Reminder Date</TableHead>
                  <TableHead className="text-white font-semibold">WhatsApp</TableHead>
                  <TableHead className="text-white font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {reminders.map((r: any) => (
                  <TableRow key={r.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{r.customerName}</TableCell>
                    <TableCell>{r.customerContact}</TableCell>
                    <TableCell>{r.planName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{r.expiryDate}</Badge>
                    </TableCell>
                    <TableCell>{r.reminderDate}</TableCell>
                    <TableCell>
                      {r.whatsappSent ? (
                        <Badge variant="default" className="bg-green-600">Sent</Badge>
                      ) : (
                        <Badge variant="secondary">Not Sent</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
