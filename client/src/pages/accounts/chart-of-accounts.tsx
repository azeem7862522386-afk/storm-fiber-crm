import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChartOfAccount } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  liability: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equity: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  revenue: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expense: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("asset");
  const [description, setDescription] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: accounts = [], isLoading } = useQuery<ChartOfAccount[]>({
    queryKey: ["/api/accounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "Account created successfully" });
      setOpen(false);
      setCode("");
      setName("");
      setType("asset");
      setDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = filterType === "all" ? accounts : accounts.filter((a) => a.type === filterType);

  const grouped = filtered.reduce((acc: Record<string, ChartOfAccount[]>, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
  };

  const typeOrder = ["asset", "liability", "equity", "revenue", "expense"];

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Chart of Accounts</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="asset">Assets</SelectItem>
              <SelectItem value="liability">Liabilities</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-account">
                <Plus className="h-4 w-4 mr-1" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Account Code</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 1300" data-testid="input-account-code" />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prepaid Expenses" data-testid="input-account-name" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger data-testid="select-account-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="liability">Liability</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" data-testid="input-account-description" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate({ code, name, type, description: description || null })}
                  disabled={!code || !name || createMutation.isPending}
                  data-testid="button-save-account"
                >
                  {createMutation.isPending ? "Saving..." : "Save Account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No accounts found. Chart of accounts will be seeded automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {typeOrder.filter((t) => grouped[t]).map((t) => (
            <Card key={t}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge className={`${TYPE_COLORS[t]} no-default-hover-elevate no-default-active-elevate`}>
                    {typeLabels[t]}
                  </Badge>
                  <span className="text-muted-foreground text-sm">({grouped[t].length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="divide-y">
                  {grouped[t].map((account) => (
                    <div key={account.id} className="flex items-center justify-between gap-2 py-2" data-testid={`row-account-${account.id}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground w-12" data-testid={`text-account-code-${account.id}`}>{account.code}</span>
                        <span className="text-sm font-medium" data-testid={`text-account-name-${account.id}`}>{account.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{account.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
