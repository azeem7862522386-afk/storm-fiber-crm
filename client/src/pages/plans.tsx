import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Wifi, Trash2, Edit, Loader2, DollarSign, Zap, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServicePlan } from "@shared/schema";

const planFormSchema = z.object({
  name: z.string().min(2, "Plan name is required"),
  speed: z.string().min(1, "Speed is required"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  validity: z.string().min(1, "Validity is required"),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function PlansPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      speed: "",
      price: 0,
      validity: "30 days",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PlanFormValues) => {
      if (editingPlan) {
        return apiRequest("PATCH", `/api/plans/${editingPlan.id}`, values);
      }
      return apiRequest("POST", "/api/plans", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setEditingPlan(null);
      form.reset({ name: "", speed: "", price: 0, validity: "30 days" });
      toast({
        title: editingPlan ? "Plan Updated" : "Plan Created",
        description: `Service plan has been ${editingPlan ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Plan Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      speed: plan.speed,
      price: plan.price,
      validity: plan.validity,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingPlan(null);
    form.reset({ name: "", speed: "", price: 0, validity: "30 days" });
    setDialogOpen(true);
  };

  const totalPlans = plans?.length || 0;
  const avgPrice = totalPlans > 0 ? Math.round((plans || []).reduce((s, p) => s + p.price, 0) / totalPlans) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-auto h-full">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots)"/></svg>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Wifi className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-plans-title">Service Plans</h1>
                <p className="text-white/70 text-sm">Manage internet packages and pricing</p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm" data-testid="button-add-plan">
                  <Plus className="mr-2 h-4 w-4" /> Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPlan ? "Edit Plan" : "New Service Plan"}</DialogTitle>
                  <DialogDescription>
                    {editingPlan ? "Update the service plan details below." : "Configure a new internet service package."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Basic Internet" {...field} data-testid="input-plan-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="speed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speed</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10 Mbps" {...field} data-testid="input-plan-speed" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (Rs.)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1000" {...field} data-testid="input-plan-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="validity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validity</FormLabel>
                          <FormControl>
                            <Input placeholder="30 days" {...field} data-testid="input-plan-validity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-plan">
                        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingPlan ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Wifi className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Total Plans</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{totalPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Avg Price</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Rs. {avgPrice}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-background">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">Active Packages</p>
                <p className="text-xl font-bold text-cyan-700 dark:text-cyan-400">{totalPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wifi className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-base font-medium text-muted-foreground">No service plans yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first internet service plan
              </p>
              <Button variant="outline" className="mt-4" onClick={openNew} data-testid="button-add-first-plan">
                <Plus className="mr-2 h-4 w-4" /> Add Plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-700">
                    <TableHead className="text-white font-semibold">Plan Name</TableHead>
                    <TableHead className="text-white font-semibold">Speed</TableHead>
                    <TableHead className="text-white font-semibold">Price (Rs.)</TableHead>
                    <TableHead className="text-white font-semibold">Validity</TableHead>
                    <TableHead className="text-right text-white font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {plans.map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-plan-${plan.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Wifi className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-sm">{plan.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{plan.speed}</TableCell>
                      <TableCell className="text-sm font-medium">Rs. {plan.price}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{plan.validity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(plan)}
                            data-testid={`button-edit-plan-${plan.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(plan.id)}
                            data-testid={`button-delete-plan-${plan.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
