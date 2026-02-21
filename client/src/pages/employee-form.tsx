import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { insertEmployeeSchema } from "@shared/schema";
import type { Employee, Department, Designation } from "@shared/schema";

const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  contact: z.string().min(1, "Contact number is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  fatherName: z.string().optional().default(""),
  gender: z.enum(["male", "female", "other"]).default("male"),
  dateOfBirth: z.string().optional().default(""),
  cnicNumber: z.string().optional().default(""),
  whatsappNumber: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default(""),
  status: z.enum(["active", "on_leave", "suspended", "terminated", "resigned"]).default("active"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  departmentId: z.coerce.number().optional().nullable(),
  designationId: z.coerce.number().optional().nullable(),
  endDate: z.string().optional().default(""),
  reportingTo: z.coerce.number().optional().nullable(),
  basicSalary: z.coerce.number().default(0),
  userRole: z.enum(["admin", "management", "accounts", "hr", "inventory", "complaints", "billing", "viewer"]).default("viewer"),
  bankName: z.string().optional().default(""),
  bankAccount: z.string().optional().default(""),
  profileImage: z.string().optional().default(""),
  agentId: z.coerce.number().optional().nullable(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeeFormPage() {
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: employee, isLoading: loadingEmployee } = useQuery<Employee>({
    queryKey: ["/api/employees", params.id],
    enabled: !!isEdit,
  });

  const { data: departments = [], isLoading: loadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: designations = [], isLoading: loadingDesignations } = useQuery<Designation[]>({
    queryKey: ["/api/designations"],
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    values: isEdit && employee
      ? {
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fatherName: employee.fatherName || "",
          gender: employee.gender,
          dateOfBirth: employee.dateOfBirth || "",
          cnicNumber: employee.cnicNumber || "",
          contact: employee.contact,
          whatsappNumber: employee.whatsappNumber || "",
          email: employee.email || "",
          address: employee.address || "",
          city: employee.city || "",
          status: employee.status,
          employmentType: employee.employmentType,
          departmentId: employee.departmentId,
          designationId: employee.designationId,
          joiningDate: employee.joiningDate,
          endDate: employee.endDate || "",
          reportingTo: employee.reportingTo,
          basicSalary: employee.basicSalary,
          userRole: employee.userRole,
          bankName: employee.bankName || "",
          bankAccount: employee.bankAccount || "",
          profileImage: employee.profileImage || "",
          agentId: employee.agentId,
        }
      : {
          employeeCode: "",
          firstName: "",
          lastName: "",
          fatherName: "",
          gender: "male",
          dateOfBirth: "",
          cnicNumber: "",
          contact: "",
          whatsappNumber: "",
          email: "",
          address: "",
          city: "",
          status: "active",
          employmentType: "full_time",
          departmentId: null,
          designationId: null,
          joiningDate: "",
          endDate: "",
          reportingTo: null,
          basicSalary: 0,
          userRole: "viewer",
          bankName: "",
          bankAccount: "",
          profileImage: "",
          agentId: null,
        },
  });

  const mutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const data = {
        ...values,
        fatherName: values.fatherName || null,
        dateOfBirth: values.dateOfBirth || null,
        cnicNumber: values.cnicNumber || null,
        whatsappNumber: values.whatsappNumber || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
        endDate: values.endDate || null,
        bankName: values.bankName || null,
        bankAccount: values.bankAccount || null,
        profileImage: values.profileImage || null,
        departmentId: values.departmentId || null,
        designationId: values.designationId || null,
        reportingTo: values.reportingTo || null,
        agentId: values.agentId || null,
      };
      if (isEdit) {
        return apiRequest("PATCH", `/api/employees/${params.id}`, data);
      }
      return apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ["/api/employees", params.id] });
      }
      toast({
        title: isEdit ? "Employee Updated" : "Employee Created",
        description: `${form.getValues("firstName")} ${form.getValues("lastName")} has been ${isEdit ? "updated" : "added"} successfully.`,
      });
      navigate("/employees");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: EmployeeFormValues) => {
    mutation.mutate(values);
  };

  if (isEdit && loadingEmployee) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          onClick={() => navigate("/employees")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-form-title">
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Update employee information" : "Register a new employee"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP-001" {...field} data-testid="input-employee-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter father name" {...field} value={field.value || ""} data-testid="input-father-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-date-of-birth" />
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
                      <FormLabel>CNIC Number</FormLabel>
                      <FormControl>
                        <Input placeholder="XXXXX-XXXXXXX-X" {...field} value={field.value || ""} data-testid="input-cnic-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="03XX-XXXXXXX" {...field} data-testid="input-contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <Input placeholder="03XX-XXXXXXX" {...field} value={field.value || ""} data-testid="input-whatsapp-number" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" type="email" {...field} value={field.value || ""} data-testid="input-email" />
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
                        <Textarea placeholder="Full residential address" {...field} value={field.value || ""} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} value={field.value || ""} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Department</SelectItem>
                          {loadingDepartments ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            departments.map((dept) => (
                              <SelectItem key={dept.id} value={String(dept.id)}>
                                {dept.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-designation">
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Designation</SelectItem>
                          {loadingDesignations ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : (
                            designations.map((desig) => (
                              <SelectItem key={desig.id} value={String(desig.id)}>
                                {desig.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employment-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-joining-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="accounts">Accounts</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="inventory">Inventory</SelectItem>
                          <SelectItem value="complaints">Complaints</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reportingTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reporting To</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-reporting-to">
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {allEmployees
                            .filter((emp) => !isEdit || String(emp.id) !== params.id)
                            .map((emp) => (
                              <SelectItem key={emp.id} value={String(emp.id)}>
                                {emp.firstName} {emp.lastName} ({emp.employeeCode})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                          <SelectItem value="resigned">Resigned</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic Salary</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          data-testid="input-basic-salary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bank name" {...field} value={field.value || ""} data-testid="input-bank-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account number" {...field} value={field.value || ""} data-testid="input-bank-account" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/employees")}
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
              {isEdit ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
