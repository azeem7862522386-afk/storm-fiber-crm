import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer, ServicePlan } from "@shared/schema";

const customerFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(3, "Address is required"),
  contact: z.string().min(10, "Enter a valid contact number"),
  cnicNumber: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  status: z.enum(["register", "active", "suspended", "terminated"]),
  planId: z.coerce.number().nullable(),
  connectionDate: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function CustomerFormPage() {
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: customer, isLoading: loadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customers", params.id],
    enabled: !!isEdit,
  });

  const { data: plans, isLoading: loadingPlans } = useQuery<ServicePlan[]>({
    queryKey: ["/api/plans"],
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    values: isEdit && customer
      ? {
          name: customer.name,
          address: customer.address,
          contact: customer.contact,
          cnicNumber: customer.cnicNumber || "",
          email: customer.email || "",
          status: customer.status,
          planId: customer.planId,
          connectionDate: customer.connectionDate || "",
        }
      : {
          name: "",
          address: "",
          contact: "",
          cnicNumber: "",
          email: "",
          status: "register",
          planId: null,
          connectionDate: "",
        },
  });

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const data = {
        ...values,
        cnicNumber: values.cnicNumber || null,
        email: values.email || null,
        connectionDate: values.connectionDate || null,
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/customers/${params.id}`, data);
      }
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", params.id] });
      }
      toast({
        title: isEdit ? "Customer Updated" : "Customer Created",
        description: `${form.getValues("name")} has been ${isEdit ? "updated" : "added"} successfully.`,
      });
      navigate(`/customers/${result.id || params.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    mutation.mutate(values);
  };

  if (isEdit && loadingCustomer) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isEdit ? `/customers/${params.id}` : "/customers")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-form-title">
            {isEdit ? "Edit Customer" : "New Customer"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update customer information" : "Register a new customer"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="03XX-XXXXXXX" {...field} data-testid="input-contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnicNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNIC Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="XXXXX-XXXXXXX-X" {...field} data-testid="input-cnic" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Full residential address" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="connectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="register">Register</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Plan</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Plan</SelectItem>
                          {loadingPlans ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            plans?.map((plan) => (
                              <SelectItem key={plan.id} value={String(plan.id)}>
                                {plan.name} - {plan.speed} (Rs. {plan.price})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(isEdit ? `/customers/${params.id}` : "/customers")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending} data-testid="button-save">
                  {mutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isEdit ? "Update Customer" : "Register Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
