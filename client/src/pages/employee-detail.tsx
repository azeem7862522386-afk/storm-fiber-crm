import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  User,
  Phone,
  Briefcase,
  Wallet,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Clock,
  CalendarDays,
  Receipt,
  ShieldAlert,
  Pencil,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  EmployeeWithRelations,
  EmergencyContact,
  EmployeeDocument,
  Attendance,
  LeaveRequest,
  Payslip,
} from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-600 text-white hover:bg-green-600" },
  on_leave: { label: "On Leave", className: "bg-yellow-500 text-white hover:bg-yellow-500" },
  suspended: { label: "Suspended", className: "bg-red-600 text-white hover:bg-red-600" },
  terminated: { label: "Terminated", className: "bg-gray-500 text-white hover:bg-gray-500" },
  resigned: { label: "Resigned", className: "bg-gray-500 text-white hover:bg-gray-500" },
};

const attendanceStatusConfig: Record<string, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-green-600 text-white hover:bg-green-600" },
  absent: { label: "Absent", className: "bg-red-600 text-white hover:bg-red-600" },
  late: { label: "Late", className: "bg-yellow-500 text-white hover:bg-yellow-500" },
  half_day: { label: "Half Day", className: "bg-orange-500 text-white hover:bg-orange-500" },
  on_leave: { label: "On Leave", className: "bg-blue-500 text-white hover:bg-blue-500" },
  holiday: { label: "Holiday", className: "bg-purple-500 text-white hover:bg-purple-500" },
};

const leaveStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500 text-white hover:bg-yellow-500" },
  approved: { label: "Approved", className: "bg-green-600 text-white hover:bg-green-600" },
  rejected: { label: "Rejected", className: "bg-red-600 text-white hover:bg-red-600" },
  cancelled: { label: "Cancelled", className: "bg-gray-500 text-white hover:bg-gray-500" },
};

const payrollStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-500 text-white hover:bg-gray-500" },
  processed: { label: "Processed", className: "bg-blue-500 text-white hover:bg-blue-500" },
  paid: { label: "Paid", className: "bg-green-600 text-white hover:bg-green-600" },
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right" data-testid={`text-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value || "—"}
      </span>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", relationship: "", contact: "", address: "" });
  const [documentForm, setDocumentForm] = useState({ documentType: "", documentName: "", notes: "" });

  const { data: employee, isLoading } = useQuery<EmployeeWithRelations>({
    queryKey: ["/api/employees", params.id],
  });

  const { data: emergencyContacts = [], isLoading: contactsLoading } = useQuery<EmergencyContact[]>({
    queryKey: ["/api/employees", params.id, "emergency-contacts"],
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<EmployeeDocument[]>({
    queryKey: ["/api/employees", params.id, "documents"],
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/employee", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/employee/${params.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load attendance");
      return res.json();
    },
  });

  const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests/employee", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/leave-requests/employee/${params.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load leave requests");
      return res.json();
    },
  });

  const { data: payslips = [], isLoading: payslipsLoading } = useQuery<Payslip[]>({
    queryKey: ["/api/payslips/employee", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/payslips/employee/${params.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load payslips");
      return res.json();
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/employees/${params.id}/emergency-contacts`, {
        ...contactForm,
        employeeId: Number(params.id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params.id, "emergency-contacts"] });
      setContactForm({ name: "", relationship: "", contact: "", address: "" });
      setContactDialogOpen(false);
      toast({ title: "Contact Added", description: "Emergency contact has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest("DELETE", `/api/employees/${params.id}/emergency-contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params.id, "emergency-contacts"] });
      toast({ title: "Contact Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/employees/${params.id}/documents`, {
        ...documentForm,
        employeeId: Number(params.id),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params.id, "documents"] });
      setDocumentForm({ documentType: "", documentName: "", notes: "" });
      setDocumentDialogOpen(false);
      toast({ title: "Document Added", description: "Document has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return apiRequest("DELETE", `/api/employees/${params.id}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees", params.id, "documents"] });
      toast({ title: "Document Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/employees/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees/stats"] });
      toast({ title: "Employee Deleted", description: "Employee has been removed successfully." });
      navigate("/employees");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center h-full">
        <User className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Employee not found</p>
        <Link href="/employees">
          <Button variant="outline" className="mt-4" data-testid="button-back-not-found">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[employee.status] || { label: employee.status, className: "" };
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/employees">
            <Button variant="ghost" size="icon" data-testid="button-back-to-employees">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-employee-name">
            {fullName}
          </h1>
          <Badge className={status.className} data-testid={`badge-status-${employee.status}`}>
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/employees/${params.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="mr-2 h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency-contacts">
            <ShieldAlert className="mr-2 h-4 w-4" /> Emergency Contacts
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            <FileText className="mr-2 h-4 w-4" /> Documents
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">
            <Clock className="mr-2 h-4 w-4" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" data-testid="tab-leave">
            <CalendarDays className="mr-2 h-4 w-4" /> Leave
          </TabsTrigger>
          <TabsTrigger value="payslips" data-testid="tab-payslips">
            <Receipt className="mr-2 h-4 w-4" /> Payslips
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Code" value={employee.employeeCode} />
                <InfoRow label="Full Name" value={fullName} />
                <InfoRow label="Father Name" value={employee.fatherName} />
                <InfoRow label="Gender" value={employee.gender} />
                <InfoRow label="DOB" value={employee.dateOfBirth} />
                <InfoRow label="CNIC" value={employee.cnicNumber} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Phone" value={employee.contact} />
                <InfoRow label="WhatsApp" value={employee.whatsappNumber} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Address" value={employee.address} />
                <InfoRow label="City" value={employee.city} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Employment Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Department" value={employee.department?.name} />
                <InfoRow label="Designation" value={employee.designation?.title} />
                <InfoRow label="Type" value={employee.employmentType?.replace("_", " ")} />
                <InfoRow label="Joining Date" value={employee.joiningDate} />
                <InfoRow label="End Date" value={employee.endDate} />
                <InfoRow label="Reporting To" value={employee.reportingTo?.toString()} />
                <InfoRow label="Role" value={employee.userRole} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Financial Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Basic Salary" value={employee.basicSalary ? `Rs. ${employee.basicSalary.toLocaleString()}` : null} />
                <InfoRow label="Bank Name" value={employee.bankName} />
                <InfoRow label="Bank Account" value={employee.bankAccount} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Emergency Contacts</CardTitle>
              <Button size="sm" onClick={() => setContactDialogOpen(true)} data-testid="button-add-contact">
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : emergencyContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShieldAlert className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emergencyContacts.map((c) => (
                        <TableRow key={c.id} data-testid={`row-contact-${c.id}`}>
                          <TableCell data-testid={`text-contact-name-${c.id}`}>{c.name}</TableCell>
                          <TableCell>{c.relationship}</TableCell>
                          <TableCell>{c.contact}</TableCell>
                          <TableCell>{c.address || "—"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteContactMutation.mutate(c.id)}
                              data-testid={`button-delete-contact-${c.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Documents</CardTitle>
              <Button size="sm" onClick={() => setDocumentDialogOpen(true)} data-testid="button-add-document">
                <Plus className="mr-2 h-4 w-4" /> Add Document
              </Button>
            </CardHeader>
            <CardContent>
              {docsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell data-testid={`text-doc-type-${doc.id}`}>{doc.documentType}</TableCell>
                          <TableCell>{doc.documentName}</TableCell>
                          <TableCell>{doc.notes || "—"}</TableCell>
                          <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteDocumentMutation.mutate(doc.id)}
                              data-testid={`button-delete-document-${doc.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No attendance records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((att) => {
                        const attStatus = attendanceStatusConfig[att.status] || { label: att.status, className: "" };
                        return (
                          <TableRow key={att.id} data-testid={`row-attendance-${att.id}`}>
                            <TableCell data-testid={`text-att-date-${att.id}`}>{att.date}</TableCell>
                            <TableCell>{att.checkIn || "—"}</TableCell>
                            <TableCell>{att.checkOut || "—"}</TableCell>
                            <TableCell>
                              <Badge className={attStatus.className} data-testid={`badge-att-status-${att.id}`}>
                                {attStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{att.hoursWorked || "—"}</TableCell>
                            <TableCell>{att.notes || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No leave requests found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((lr) => {
                        const lrStatus = leaveStatusConfig[lr.status] || { label: lr.status, className: "" };
                        return (
                          <TableRow key={lr.id} data-testid={`row-leave-${lr.id}`}>
                            <TableCell data-testid={`text-leave-type-${lr.id}`}>{lr.leaveType}</TableCell>
                            <TableCell>{lr.startDate}</TableCell>
                            <TableCell>{lr.endDate}</TableCell>
                            <TableCell>{lr.totalDays}</TableCell>
                            <TableCell>
                              <Badge className={lrStatus.className} data-testid={`badge-leave-status-${lr.id}`}>
                                {lrStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{lr.reason || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payslips</CardTitle>
            </CardHeader>
            <CardContent>
              {payslipsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : payslips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No payslips found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payslips.map((ps) => {
                        const psStatus = payrollStatusConfig[ps.status] || { label: ps.status, className: "" };
                        return (
                          <TableRow key={ps.id} data-testid={`row-payslip-${ps.id}`}>
                            <TableCell data-testid={`text-payslip-period-${ps.id}`}>
                              {ps.payrollRunId}
                            </TableCell>
                            <TableCell>Rs. {ps.basicSalary.toLocaleString()}</TableCell>
                            <TableCell>Rs. {ps.totalAllowances.toLocaleString()}</TableCell>
                            <TableCell>Rs. {ps.totalDeductions.toLocaleString()}</TableCell>
                            <TableCell>Rs. {ps.netSalary.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={psStatus.className} data-testid={`badge-payslip-status-${ps.id}`}>
                                {psStatus.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={contactForm.name}
                onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-relationship">Relationship</Label>
              <Input
                id="contact-relationship"
                value={contactForm.relationship}
                onChange={(e) => setContactForm((p) => ({ ...p, relationship: e.target.value }))}
                placeholder="e.g. Father, Mother, Spouse"
                data-testid="input-contact-relationship"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact</Label>
              <Input
                id="contact-phone"
                value={contactForm.contact}
                onChange={(e) => setContactForm((p) => ({ ...p, contact: e.target.value }))}
                placeholder="Phone number"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-address">Address</Label>
              <Input
                id="contact-address"
                value={contactForm.address}
                onChange={(e) => setContactForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Address (optional)"
                data-testid="input-contact-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addContactMutation.mutate()}
              disabled={!contactForm.name || !contactForm.relationship || !contactForm.contact || addContactMutation.isPending}
              data-testid="button-save-contact"
            >
              {addContactMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Input
                id="doc-type"
                value={documentForm.documentType}
                onChange={(e) => setDocumentForm((p) => ({ ...p, documentType: e.target.value }))}
                placeholder="e.g. CNIC, Passport, Certificate"
                data-testid="input-document-type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                value={documentForm.documentName}
                onChange={(e) => setDocumentForm((p) => ({ ...p, documentName: e.target.value }))}
                placeholder="Document name"
                data-testid="input-document-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-notes">Notes</Label>
              <Input
                id="doc-notes"
                value={documentForm.notes}
                onChange={(e) => setDocumentForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)"
                data-testid="input-document-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => addDocumentMutation.mutate()}
              disabled={!documentForm.documentType || !documentForm.documentName || addDocumentMutation.isPending}
              data-testid="button-save-document"
            >
              {addDocumentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fullName}</strong>? This action cannot be undone and will remove all related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteEmployeeMutation.mutate()}
            >
              {deleteEmployeeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
