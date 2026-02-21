import {
  customers,
  servicePlans,
  installations,
  customerNotes,
  invoices,
  payments,
  chartOfAccounts,
  journalEntries,
  journalLines,
  vendors,
  vendorBills,
  expenses,
  openingBalances,
  agents,
  complaints,
  complaintFeedback,
  complaintImages,
  departments,
  designations,
  employees,
  emergencyContacts,
  employeeDocuments,
  attendance,
  leaveTypeConfigs,
  leaveRequests,
  leaveBalances,
  salaryStructures,
  payrollRuns,
  payslips,
  performanceCycles,
  performanceReviews,
  jobOpenings,
  candidates,
  trainings,
  trainingEnrollments,
  assets,
  announcements,
  policies,
  policyAcknowledgements,
  holidays,
  workingHoursConfig,
  auditLogs,
  stockItems,
  stockIssues,
  stockReturns,
  stockDamages,
  nbbConnections,
  type NbbConnection,
  type InsertNbbConnection,
  receivables,
  receivablePayments,
  type Receivable,
  type InsertReceivable,
  type ReceivablePayment,
  type InsertReceivablePayment,
  type ReceivableWithPayments,
  connectionRequests,
  connectionFeedback,
  type ConnectionRequest,
  type InsertConnectionRequest,
  type ConnectionRequestWithRelations,
  type ConnectionFeedback,
  type InsertConnectionFeedback,
  type Customer,
  type InsertCustomer,
  type ServicePlan,
  type InsertServicePlan,
  type Installation,
  type InsertInstallation,
  type CustomerNote,
  type InsertCustomerNote,
  type CustomerWithRelations,
  type Invoice,
  type InsertInvoice,
  type InvoiceWithRelations,
  type Payment,
  type InsertPayment,
  type User,
  type InsertUser,
  type ChartOfAccount,
  type InsertChartOfAccount,
  type JournalEntry,
  type InsertJournalEntry,
  type JournalLine,
  type InsertJournalLine,
  type JournalEntryWithLines,
  type Vendor,
  type InsertVendor,
  type VendorBill,
  type InsertVendorBill,
  type VendorBillWithVendor,
  type Expense,
  type InsertExpense,
  type ExpenseWithVendor,
  type OpeningBalance,
  type InsertOpeningBalance,
  type Agent,
  type InsertAgent,
  type Complaint,
  type InsertComplaint,
  type ComplaintFeedback,
  type InsertComplaintFeedback,
  type ComplaintWithRelations,
  type Department,
  type InsertDepartment,
  type Designation,
  type InsertDesignation,
  type Employee,
  type InsertEmployee,
  type EmployeeWithRelations,
  type EmergencyContact,
  type InsertEmergencyContact,
  type EmployeeDocument,
  type InsertEmployeeDocument,
  type Attendance,
  type InsertAttendance,
  type AttendanceWithEmployee,
  type LeaveTypeConfig,
  type InsertLeaveTypeConfig,
  type LeaveRequest,
  type InsertLeaveRequest,
  type LeaveRequestWithEmployee,
  type LeaveBalance,
  type InsertLeaveBalance,
  type SalaryStructure,
  type InsertSalaryStructure,
  type PayrollRun,
  type InsertPayrollRun,
  type Payslip,
  type InsertPayslip,
  type PayslipWithEmployee,
  type PerformanceCycle,
  type InsertPerformanceCycle,
  type PerformanceReview,
  type InsertPerformanceReview,
  type PerformanceReviewWithRelations,
  type JobOpening,
  type InsertJobOpening,
  type Candidate,
  type InsertCandidate,
  type Training,
  type InsertTraining,
  type TrainingEnrollment,
  type InsertTrainingEnrollment,
  type Asset,
  type InsertAsset,
  type AssetWithEmployee,
  type Announcement,
  type InsertAnnouncement,
  type Policy,
  type InsertPolicy,
  type PolicyAcknowledgement,
  type InsertPolicyAcknowledgement,
  type Holiday,
  type InsertHoliday,
  type WorkingHoursConfig,
  type InsertWorkingHoursConfig,
  type AuditLog,
  type InsertAuditLog,
  type StockItem,
  type InsertStockItem,
  type StockIssue,
  type InsertStockIssue,
  type StockIssueWithItem,
  type StockReturn,
  type InsertStockReturn,
  type StockReturnWithItem,
  type StockDamage,
  type InsertStockDamage,
  type StockDamageWithItem,
  dutyTypes,
  dutyAssignments,
  type DutyType,
  type InsertDutyType,
  type DutyAssignment,
  type InsertDutyAssignment,
  type DutyAssignmentWithDetails,
  dailyEntries,
  type DailyEntry,
  type InsertDailyEntry,
  type DailyEntryWithRelations,
  monthClosings,
  monthClosingSideEntries,
  type MonthClosing,
  type InsertMonthClosing,
  type MonthClosingSideEntry,
  type InsertMonthClosingSideEntry,
  users,
  salaryAdvances,
  type SalaryAdvance,
  type InsertSalaryAdvance,
  type SalaryAdvanceWithEmployee,
  employeeCommissions,
  type EmployeeCommission,
  type InsertEmployeeCommission,
  type EmployeeCommissionWithEmployee,
  posSlips,
  type PosSlip,
  type InsertPosSlip,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, sql, gte, lte, asc, sum } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getAllCustomers(): Promise<Customer[]>;
  getCustomersWithPlans(): Promise<(Customer & { plan: ServicePlan | null })[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<CustomerWithRelations | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;

  getAllPlans(): Promise<ServicePlan[]>;
  getPlan(id: number): Promise<ServicePlan | undefined>;
  createPlan(plan: InsertServicePlan): Promise<ServicePlan>;
  updatePlan(id: number, plan: Partial<InsertServicePlan>): Promise<ServicePlan | undefined>;
  deletePlan(id: number): Promise<void>;

  getAllConnectionRequests(): Promise<ConnectionRequestWithRelations[]>;
  getConnectionRequest(id: number): Promise<ConnectionRequestWithRelations | undefined>;
  createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest>;
  updateConnectionRequest(id: number, data: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined>;
  getConnectionFeedback(connectionRequestId: number): Promise<ConnectionFeedback | undefined>;
  createConnectionFeedback(feedback: InsertConnectionFeedback): Promise<ConnectionFeedback>;

  getInstallation(customerId: number): Promise<Installation | undefined>;
  createInstallation(installation: InsertInstallation): Promise<Installation>;
  updateInstallation(id: number, installation: Partial<InsertInstallation>): Promise<Installation | undefined>;

  getCustomerNotes(customerId: number): Promise<CustomerNote[]>;
  createNote(note: InsertCustomerNote): Promise<CustomerNote>;
  deleteNote(id: number): Promise<void>;

  getAllInvoices(filters?: { status?: string; customerId?: number }): Promise<InvoiceWithRelations[]>;
  getInvoice(id: number): Promise<InvoiceWithRelations | undefined>;
  getCustomerInvoices(customerId: number): Promise<InvoiceWithRelations[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  getPayment(id: number): Promise<Payment | undefined>;
  getInvoicePayments(invoiceId: number): Promise<Payment[]>;
  getCustomerPayments(customerId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;

  getBillingStats(): Promise<{
    totalDue: number;
    totalCollected: number;
    overdueCount: number;
    collectedThisMonth: number;
  }>;

  // Chart of Accounts
  getAllAccounts(): Promise<ChartOfAccount[]>;
  getAccount(id: number): Promise<ChartOfAccount | undefined>;
  getAccountByCode(code: string): Promise<ChartOfAccount | undefined>;
  createAccount(account: InsertChartOfAccount): Promise<ChartOfAccount>;
  updateAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined>;

  // Journal Entries
  getAllJournalEntries(): Promise<JournalEntryWithLines[]>;
  getJournalEntry(id: number): Promise<JournalEntryWithLines | undefined>;
  createJournalEntry(entry: InsertJournalEntry, lines: InsertJournalLine[]): Promise<JournalEntryWithLines>;

  // Vendors
  getAllVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;

  // Vendor Bills
  getAllVendorBills(): Promise<VendorBillWithVendor[]>;
  getVendorBill(id: number): Promise<VendorBillWithVendor | undefined>;
  createVendorBill(bill: InsertVendorBill): Promise<VendorBill>;
  updateVendorBill(id: number, bill: Partial<InsertVendorBill>): Promise<VendorBill | undefined>;

  // Expenses
  getAllExpenses(): Promise<ExpenseWithVendor[]>;
  getExpense(id: number): Promise<ExpenseWithVendor | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;

  // Opening Balances
  getOpeningBalance(customerId: number): Promise<OpeningBalance | undefined>;
  setOpeningBalance(balance: InsertOpeningBalance): Promise<OpeningBalance>;

  // Customer Ledger
  getCustomerLedger(customerId: number): Promise<{ entries: any[]; balance: number }>;

  // Reports
  getTrialBalance(): Promise<{ accounts: { id: number; code: string; name: string; type: string; debit: number; credit: number }[] }>;
  getProfitAndLoss(startDate: string, endDate: string): Promise<{ revenue: any[]; expenses: any[]; totalRevenue: number; totalExpenses: number; netIncome: number }>;
  getBalanceSheet(): Promise<{ assets: any[]; liabilities: any[]; equity: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number }>;
  getAgingReport(): Promise<any[]>;

  // Agents
  getAllAgents(): Promise<Agent[]>;
  getAgent(id: number): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number): Promise<void>;

  // Complaints
  getAllComplaints(filters?: { status?: string; customerId?: number }): Promise<ComplaintWithRelations[]>;
  getComplaint(id: number): Promise<ComplaintWithRelations | undefined>;
  getCustomerComplaints(customerId: number): Promise<ComplaintWithRelations[]>;
  createComplaint(complaint: InsertComplaint): Promise<Complaint>;
  updateComplaint(id: number, complaint: Partial<InsertComplaint>): Promise<Complaint | undefined>;
  deleteComplaint(id: number): Promise<boolean>;

  // Complaint Feedback
  getComplaintFeedback(complaintId: number): Promise<ComplaintFeedback | undefined>;
  createComplaintFeedback(feedback: InsertComplaintFeedback): Promise<ComplaintFeedback>;

  // Complaint Stats
  getComplaintStats(): Promise<{
    totalOpen: number;
    totalAssigned: number;
    totalInProgress: number;
    totalCompleted: number;
    totalClosed: number;
    avgAgentRating: number;
    avgServiceRating: number;
  }>;

  // ======= EMPLOYEE MANAGEMENT SYSTEM =======

  // Departments
  getAllDepartments(): Promise<Department[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, dept: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<void>;

  // Designations
  getAllDesignations(): Promise<Designation[]>;
  getDesignation(id: number): Promise<Designation | undefined>;
  createDesignation(desig: InsertDesignation): Promise<Designation>;
  updateDesignation(id: number, desig: Partial<InsertDesignation>): Promise<Designation | undefined>;
  deleteDesignation(id: number): Promise<void>;

  // Employees
  getAllEmployees(): Promise<EmployeeWithRelations[]>;
  searchEmployees(query: string): Promise<EmployeeWithRelations[]>;
  getEmployee(id: number): Promise<EmployeeWithRelations | undefined>;
  createEmployee(emp: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, emp: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  getEmployeeStats(): Promise<{ totalActive: number; totalOnLeave: number; totalByDepartment: { name: string; count: number }[] }>;

  // Emergency Contacts
  getEmployeeEmergencyContacts(employeeId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  deleteEmergencyContact(id: number): Promise<void>;

  // Employee Documents
  getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]>;
  createEmployeeDocument(doc: InsertEmployeeDocument): Promise<EmployeeDocument>;
  deleteEmployeeDocument(id: number): Promise<void>;

  // Attendance
  getAttendanceByDate(date: string): Promise<AttendanceWithEmployee[]>;
  getAttendanceById(id: number): Promise<Attendance | undefined>;
  getEmployeeAttendance(employeeId: number, startDate?: string, endDate?: string): Promise<Attendance[]>;
  markAttendance(att: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, att: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<void>;
  getAttendanceStats(month: string, year: number): Promise<{ totalPresent: number; totalAbsent: number; totalLate: number; totalHalfDay: number }>;
  getMonthlyAttendanceDeductions(month: string, year: number): Promise<Array<{ employeeId: number; totalFines: number; absentDays: number; lateDays: number; totalOvertimeReward: number }>>;

  // Leave Type Configs
  getAllLeaveTypeConfigs(): Promise<LeaveTypeConfig[]>;
  createLeaveTypeConfig(config: InsertLeaveTypeConfig): Promise<LeaveTypeConfig>;
  updateLeaveTypeConfig(id: number, config: Partial<InsertLeaveTypeConfig>): Promise<LeaveTypeConfig | undefined>;

  // Leave Requests
  getAllLeaveRequests(filters?: { status?: string; employeeId?: number }): Promise<LeaveRequestWithEmployee[]>;
  getLeaveRequest(id: number): Promise<LeaveRequestWithEmployee | undefined>;
  getEmployeeLeaveRequests(employeeId: number): Promise<LeaveRequest[]>;
  createLeaveRequest(req: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, req: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;

  // Leave Balances
  getEmployeeLeaveBalances(employeeId: number, year: number): Promise<LeaveBalance[]>;
  createLeaveBalance(bal: InsertLeaveBalance): Promise<LeaveBalance>;
  updateLeaveBalance(id: number, bal: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined>;

  // Salary Structures
  getSalaryStructure(employeeId: number): Promise<SalaryStructure | undefined>;
  createSalaryStructure(struct: InsertSalaryStructure): Promise<SalaryStructure>;
  updateSalaryStructure(id: number, struct: Partial<InsertSalaryStructure>): Promise<SalaryStructure | undefined>;

  // Payroll Runs
  getAllPayrollRuns(): Promise<PayrollRun[]>;
  getPayrollRun(id: number): Promise<PayrollRun | undefined>;
  createPayrollRun(run: InsertPayrollRun): Promise<PayrollRun>;
  updatePayrollRun(id: number, run: Partial<InsertPayrollRun>): Promise<PayrollRun | undefined>;

  // Payslips
  getPayrollPayslips(payrollRunId: number): Promise<PayslipWithEmployee[]>;
  getEmployeePayslips(employeeId: number): Promise<PayslipWithEmployee[]>;
  createPayslip(slip: InsertPayslip): Promise<Payslip>;
  updatePayslip(id: number, slip: Partial<InsertPayslip>): Promise<Payslip | undefined>;

  // Salary Advances
  getSalaryAdvances(month?: string): Promise<SalaryAdvanceWithEmployee[]>;
  getEmployeeSalaryAdvances(employeeId: number, month?: string): Promise<SalaryAdvance[]>;
  createSalaryAdvance(advance: InsertSalaryAdvance): Promise<SalaryAdvance>;
  updateSalaryAdvance(id: number, advance: Partial<InsertSalaryAdvance>): Promise<SalaryAdvance | undefined>;
  deleteSalaryAdvance(id: number): Promise<void>;

  getEmployeeCommissions(month?: string): Promise<EmployeeCommissionWithEmployee[]>;
  createEmployeeCommission(commission: InsertEmployeeCommission): Promise<EmployeeCommission>;
  deleteEmployeeCommission(id: number): Promise<void>;

  // Performance Cycles
  getAllPerformanceCycles(): Promise<PerformanceCycle[]>;
  createPerformanceCycle(cycle: InsertPerformanceCycle): Promise<PerformanceCycle>;
  updatePerformanceCycle(id: number, cycle: Partial<InsertPerformanceCycle>): Promise<PerformanceCycle | undefined>;

  // Performance Reviews
  getPerformanceReviews(cycleId?: number): Promise<PerformanceReviewWithRelations[]>;
  getEmployeeReviews(employeeId: number): Promise<PerformanceReviewWithRelations[]>;
  createPerformanceReview(review: InsertPerformanceReview): Promise<PerformanceReview>;
  updatePerformanceReview(id: number, review: Partial<InsertPerformanceReview>): Promise<PerformanceReview | undefined>;

  // Job Openings
  getAllJobOpenings(): Promise<JobOpening[]>;
  getJobOpening(id: number): Promise<JobOpening | undefined>;
  createJobOpening(opening: InsertJobOpening): Promise<JobOpening>;
  updateJobOpening(id: number, opening: Partial<InsertJobOpening>): Promise<JobOpening | undefined>;

  // Candidates
  getCandidates(jobOpeningId?: number): Promise<(Candidate & { jobOpening: JobOpening })[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  createCandidate(cand: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, cand: Partial<InsertCandidate>): Promise<Candidate | undefined>;

  // Trainings
  getAllTrainings(): Promise<Training[]>;
  getTraining(id: number): Promise<Training | undefined>;
  createTraining(training: InsertTraining): Promise<Training>;
  updateTraining(id: number, training: Partial<InsertTraining>): Promise<Training | undefined>;

  // Training Enrollments
  getTrainingEnrollments(trainingId: number): Promise<(TrainingEnrollment & { employee: Employee })[]>;
  createTrainingEnrollment(enrollment: InsertTrainingEnrollment): Promise<TrainingEnrollment>;
  updateTrainingEnrollment(id: number, enrollment: Partial<InsertTrainingEnrollment>): Promise<TrainingEnrollment | undefined>;

  // Assets
  getAllAssets(): Promise<AssetWithEmployee[]>;
  getAsset(id: number): Promise<AssetWithEmployee | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;

  // Announcements
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(ann: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, ann: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<void>;

  // Policies
  getAllPolicies(): Promise<Policy[]>;
  getPolicy(id: number): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined>;

  // Policy Acknowledgements
  getPolicyAcknowledgements(policyId: number): Promise<(PolicyAcknowledgement & { employee: Employee })[]>;
  createPolicyAcknowledgement(ack: InsertPolicyAcknowledgement): Promise<PolicyAcknowledgement>;

  // Holidays
  getHolidays(year?: number): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;

  // Working Hours Config
  getWorkingHoursConfig(): Promise<WorkingHoursConfig[]>;
  upsertWorkingHoursConfig(config: InsertWorkingHoursConfig): Promise<WorkingHoursConfig>;

  // Audit Logs
  getAuditLogs(filters?: { entity?: string; limit?: number }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // ======= STOCK MANAGEMENT =======
  getAllStockItems(): Promise<(StockItem & { remainingQuantity: number })[]>;
  getStockItem(id: number): Promise<(StockItem & { remainingQuantity: number }) | undefined>;
  createStockItem(item: InsertStockItem): Promise<StockItem>;
  updateStockItem(id: number, item: Partial<InsertStockItem>): Promise<StockItem | undefined>;
  deleteStockItem(id: number): Promise<void>;
  getAllStockIssues(stockItemId?: number): Promise<StockIssueWithItem[]>;
  createStockIssue(issue: InsertStockIssue): Promise<StockIssue>;
  deleteStockIssue(id: number): Promise<void>;
  getAllStockReturns(stockItemId?: number): Promise<StockReturnWithItem[]>;
  createStockReturn(ret: InsertStockReturn): Promise<StockReturn>;
  deleteStockReturn(id: number): Promise<void>;
  getAllStockDamages(stockItemId?: number): Promise<StockDamageWithItem[]>;
  createStockDamage(damage: InsertStockDamage): Promise<StockDamage>;
  deleteStockDamage(id: number): Promise<void>;

  // Daily Income & Expense Entries
  getDailyEntries(filters?: { date?: string; type?: string }): Promise<DailyEntryWithRelations[]>;
  createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry>;
  updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined>;
  deleteDailyEntry(id: number): Promise<void>;
  getDailyReport(date: string): Promise<{ totalIncome: number; totalExpense: number; entries: DailyEntryWithRelations[] }>;

  // Month Closing Sheet
  getMonthClosing(month: string): Promise<MonthClosing | undefined>;
  upsertMonthClosing(data: InsertMonthClosing): Promise<MonthClosing>;
  getMonthClosingSideEntries(month: string): Promise<MonthClosingSideEntry[]>;
  createMonthClosingSideEntry(entry: InsertMonthClosingSideEntry): Promise<MonthClosingSideEntry>;
  deleteMonthClosingSideEntry(id: number): Promise<void>;
  getMonthDailySummary(month: string): Promise<{ date: string; income: number; expense: number }[]>;

  // Receivables / Recovery
  getAllReceivables(filters?: { status?: string }): Promise<ReceivableWithPayments[]>;
  getReceivable(id: number): Promise<ReceivableWithPayments | undefined>;
  createReceivable(data: InsertReceivable): Promise<Receivable>;
  updateReceivable(id: number, data: Partial<InsertReceivable>): Promise<Receivable | undefined>;
  deleteReceivable(id: number): Promise<void>;

  // Receivable Payments
  getReceivablePayments(receivableId: number): Promise<ReceivablePayment[]>;
  createReceivablePayment(data: InsertReceivablePayment): Promise<ReceivablePayment>;
  deleteReceivablePayment(id: number): Promise<void>;

  // NBB Connections
  getNbbConnections(): Promise<NbbConnection[]>;
  createNbbConnection(conn: InsertNbbConnection): Promise<NbbConnection>;
  upsertNbbConnection(conn: InsertNbbConnection): Promise<NbbConnection>;
  deleteNbbConnection(id: number): Promise<void>;

  // POS Slips
  getPosSlipsByCustomer(customerId: number): Promise<PosSlip[]>;
  getPosSlipsByDate(date: string): Promise<PosSlip[]>;
  createPosSlip(data: InsertPosSlip): Promise<PosSlip>;

  // Duty Types
  getAllDutyTypes(): Promise<DutyType[]>;
  getDutyType(id: number): Promise<DutyType | undefined>;
  createDutyType(data: InsertDutyType): Promise<DutyType>;
  updateDutyType(id: number, data: Partial<InsertDutyType>): Promise<DutyType | undefined>;
  deleteDutyType(id: number): Promise<void>;

  // Duty Assignments
  getDutyAssignmentsByDateRange(startDate: string, endDate: string): Promise<DutyAssignmentWithDetails[]>;
  createDutyAssignment(data: InsertDutyAssignment): Promise<DutyAssignment>;
  updateDutyAssignment(id: number, data: Partial<InsertDutyAssignment>): Promise<DutyAssignment | undefined>;
  deleteDutyAssignment(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.username));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomersWithPlans(): Promise<(Customer & { plan: ServicePlan | null })[]> {
    const rows = await db
      .select({
        customer: customers,
        plan: servicePlans,
      })
      .from(customers)
      .leftJoin(servicePlans, eq(customers.planId, servicePlans.id))
      .orderBy(desc(customers.createdAt));

    return rows.map((r) => ({
      ...r.customer,
      plan: r.plan,
    }));
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const pattern = `%${query}%`;
    return db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.name, pattern),
          ilike(customers.contact, pattern),
          ilike(customers.address, pattern),
          ilike(customers.cnicNumber, pattern)
        )
      )
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<CustomerWithRelations | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    if (!customer) return undefined;

    const plan = customer.planId
      ? (await db.select().from(servicePlans).where(eq(servicePlans.id, customer.planId)))[0] || null
      : null;

    const [installation] = await db
      .select()
      .from(installations)
      .where(eq(installations.customerId, id));

    const notes = await db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, id))
      .orderBy(desc(customerNotes.createdAt));

    return {
      ...customer,
      plan,
      installation: installation || null,
      notes,
    };
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [result] = await db.insert(customers).values(customer).returning();
    return result;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [result] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return result || undefined;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.customerId, id));
    await db.delete(invoices).where(eq(invoices.customerId, id));
    await db.delete(customerNotes).where(eq(customerNotes.customerId, id));
    await db.delete(installations).where(eq(installations.customerId, id));
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getAllPlans(): Promise<ServicePlan[]> {
    return db.select().from(servicePlans).orderBy(servicePlans.price);
  }

  async getPlan(id: number): Promise<ServicePlan | undefined> {
    const [plan] = await db.select().from(servicePlans).where(eq(servicePlans.id, id));
    return plan || undefined;
  }

  async createPlan(plan: InsertServicePlan): Promise<ServicePlan> {
    const [result] = await db.insert(servicePlans).values(plan).returning();
    return result;
  }

  async updatePlan(id: number, plan: Partial<InsertServicePlan>): Promise<ServicePlan | undefined> {
    const [result] = await db
      .update(servicePlans)
      .set(plan)
      .where(eq(servicePlans.id, id))
      .returning();
    return result || undefined;
  }

  async deletePlan(id: number): Promise<void> {
    await db.delete(servicePlans).where(eq(servicePlans.id, id));
  }

  async getAllConnectionRequests(): Promise<ConnectionRequestWithRelations[]> {
    const rows = await db
      .select({
        request: connectionRequests,
        plan: servicePlans,
        customer: customers,
        engineer: employees,
      })
      .from(connectionRequests)
      .leftJoin(servicePlans, eq(connectionRequests.planId, servicePlans.id))
      .leftJoin(customers, eq(connectionRequests.customerId, customers.id))
      .leftJoin(employees, eq(connectionRequests.engineerId, employees.id))
      .orderBy(desc(connectionRequests.createdAt));

    const allEmployees = await db.select().from(employees);
    return rows.map((r) => ({
      ...r.request,
      plan: r.plan,
      customer: r.customer,
      engineer: r.engineer,
      fieldWorker: r.request.fieldWorkerId
        ? allEmployees.find((e) => e.id === r.request.fieldWorkerId) || null
        : null,
    }));
  }

  async getConnectionRequest(id: number): Promise<ConnectionRequestWithRelations | undefined> {
    const [row] = await db
      .select({
        request: connectionRequests,
        plan: servicePlans,
        customer: customers,
      })
      .from(connectionRequests)
      .leftJoin(servicePlans, eq(connectionRequests.planId, servicePlans.id))
      .leftJoin(customers, eq(connectionRequests.customerId, customers.id))
      .where(eq(connectionRequests.id, id));

    if (!row) return undefined;

    const engineer = row.request.engineerId
      ? (await db.select().from(employees).where(eq(employees.id, row.request.engineerId)))[0] || null
      : null;
    const fieldWorker = row.request.fieldWorkerId
      ? (await db.select().from(employees).where(eq(employees.id, row.request.fieldWorkerId)))[0] || null
      : null;

    return {
      ...row.request,
      plan: row.plan,
      customer: row.customer,
      engineer,
      fieldWorker,
    };
  }

  async createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest> {
    const [result] = await db.insert(connectionRequests).values(request).returning();
    return result;
  }

  async updateConnectionRequest(id: number, data: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined> {
    const [result] = await db
      .update(connectionRequests)
      .set(data)
      .where(eq(connectionRequests.id, id))
      .returning();
    return result || undefined;
  }

  async getConnectionFeedback(connectionRequestId: number): Promise<ConnectionFeedback | undefined> {
    const [result] = await db.select().from(connectionFeedback).where(eq(connectionFeedback.connectionRequestId, connectionRequestId));
    return result || undefined;
  }

  async createConnectionFeedback(feedback: InsertConnectionFeedback): Promise<ConnectionFeedback> {
    const [result] = await db.insert(connectionFeedback).values(feedback).returning();
    return result;
  }

  async getInstallation(customerId: number): Promise<Installation | undefined> {
    const [result] = await db
      .select()
      .from(installations)
      .where(eq(installations.customerId, customerId));
    return result || undefined;
  }

  async createInstallation(installation: InsertInstallation): Promise<Installation> {
    const [result] = await db.insert(installations).values(installation).returning();
    return result;
  }

  async updateInstallation(
    id: number,
    installation: Partial<InsertInstallation>
  ): Promise<Installation | undefined> {
    const [result] = await db
      .update(installations)
      .set(installation)
      .where(eq(installations.id, id))
      .returning();
    return result || undefined;
  }

  async getCustomerNotes(customerId: number): Promise<CustomerNote[]> {
    return db
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.customerId, customerId))
      .orderBy(desc(customerNotes.createdAt));
  }

  async createNote(note: InsertCustomerNote): Promise<CustomerNote> {
    const [result] = await db.insert(customerNotes).values(note).returning();
    return result;
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(customerNotes).where(eq(customerNotes.id, id));
  }

  // Invoices
  async getAllInvoices(filters?: { status?: string; customerId?: number }): Promise<InvoiceWithRelations[]> {
    const conditions = [];
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(invoices.status, filters.status as any));
    }
    if (filters?.customerId) {
      conditions.push(eq(invoices.customerId, filters.customerId));
    }

    const invoiceRows = conditions.length > 0
      ? await db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt))
      : await db.select().from(invoices).orderBy(desc(invoices.createdAt));

    const results: InvoiceWithRelations[] = [];
    for (const inv of invoiceRows) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
      const plan = inv.planId
        ? (await db.select().from(servicePlans).where(eq(servicePlans.id, inv.planId)))[0] || null
        : null;
      const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, inv.id));
      results.push({ ...inv, customer, plan, payments: paymentRows });
    }
    return results;
  }

  async getInvoice(id: number): Promise<InvoiceWithRelations | undefined> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) return undefined;

    const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
    const plan = inv.planId
      ? (await db.select().from(servicePlans).where(eq(servicePlans.id, inv.planId)))[0] || null
      : null;
    const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, inv.id));
    return { ...inv, customer, plan, payments: paymentRows };
  }

  async getCustomerInvoices(customerId: number): Promise<InvoiceWithRelations[]> {
    const invoiceRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.createdAt));

    const results: InvoiceWithRelations[] = [];
    for (const inv of invoiceRows) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
      const plan = inv.planId
        ? (await db.select().from(servicePlans).where(eq(servicePlans.id, inv.planId)))[0] || null
        : null;
      const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, inv.id));
      results.push({ ...inv, customer, plan, payments: paymentRows });
    }
    return results;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [result] = await db.insert(invoices).values(invoice).returning();
    return result;
  }

  async updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [result] = await db
      .update(invoices)
      .set(invoice)
      .where(eq(invoices.id, id))
      .returning();
    return result || undefined;
  }

  // Payments
  async getPayment(id: number): Promise<Payment | undefined> {
    const [result] = await db.select().from(payments).where(eq(payments.id, id));
    return result;
  }

  async getInvoicePayments(invoiceId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(desc(payments.receivedAt));
  }

  async getCustomerPayments(customerId: number): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(desc(payments.receivedAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db.insert(payments).values(payment).returning();
    return result;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [result] = await db
      .update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    return result || undefined;
  }

  async getBillingStats(): Promise<{
    totalDue: number;
    totalCollected: number;
    overdueCount: number;
    collectedThisMonth: number;
  }> {
    const allInvoices = await db.select().from(invoices);
    const allPayments = await db.select().from(payments);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalDue = allInvoices
      .filter((i) => i.status === "issued" || i.status === "partial" || i.status === "overdue")
      .reduce((sum, i) => sum + i.totalAmount - i.paidAmount, 0);

    const totalCollected = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const overdueCount = allInvoices.filter((i) => i.status === "overdue").length;

    const collectedThisMonth = allPayments
      .filter((p) => new Date(p.receivedAt) >= monthStart)
      .reduce((sum, p) => sum + p.amount, 0);

    return { totalDue, totalCollected, overdueCount, collectedThisMonth };
  }

  // ======= ACCOUNTING METHODS =======

  // Chart of Accounts
  async getAllAccounts(): Promise<ChartOfAccount[]> {
    return db.select().from(chartOfAccounts).orderBy(asc(chartOfAccounts.code));
  }

  async getAccount(id: number): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, id));
    return account || undefined;
  }

  async getAccountByCode(code: string): Promise<ChartOfAccount | undefined> {
    const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.code, code));
    return account || undefined;
  }

  async createAccount(account: InsertChartOfAccount): Promise<ChartOfAccount> {
    const [result] = await db.insert(chartOfAccounts).values(account).returning();
    return result;
  }

  async updateAccount(id: number, account: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
    const [result] = await db.update(chartOfAccounts).set(account).where(eq(chartOfAccounts.id, id)).returning();
    return result || undefined;
  }

  // Journal Entries
  async getAllJournalEntries(): Promise<JournalEntryWithLines[]> {
    const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
    const results: JournalEntryWithLines[] = [];
    for (const entry of entries) {
      const lines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.entryId, entry.id));
      const linesWithAccounts = [];
      for (const line of lines) {
        const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, line.accountId));
        linesWithAccounts.push({ ...line, account });
      }
      results.push({ ...entry, lines: linesWithAccounts });
    }
    return results;
  }

  async getJournalEntry(id: number): Promise<JournalEntryWithLines | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    if (!entry) return undefined;
    const lines = await db.select().from(journalLines).where(eq(journalLines.entryId, entry.id));
    const linesWithAccounts = [];
    for (const line of lines) {
      const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, line.accountId));
      linesWithAccounts.push({ ...line, account });
    }
    return { ...entry, lines: linesWithAccounts };
  }

  async createJournalEntry(entry: InsertJournalEntry, lines: InsertJournalLine[]): Promise<JournalEntryWithLines> {
    const [created] = await db.insert(journalEntries).values(entry).returning();
    const linesWithAccounts = [];
    for (const line of lines) {
      const [createdLine] = await db.insert(journalLines).values({ ...line, entryId: created.id }).returning();
      const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, createdLine.accountId));
      linesWithAccounts.push({ ...createdLine, account });
    }
    return { ...created, lines: linesWithAccounts };
  }

  // Vendors
  async getAllVendors(): Promise<Vendor[]> {
    return db.select().from(vendors).orderBy(desc(vendors.createdAt));
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendors).values(vendor).returning();
    return result;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [result] = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return result || undefined;
  }

  // Vendor Bills
  async getAllVendorBills(): Promise<VendorBillWithVendor[]> {
    const bills = await db.select().from(vendorBills).orderBy(desc(vendorBills.createdAt));
    const results: VendorBillWithVendor[] = [];
    for (const bill of bills) {
      const [vendor] = await db.select().from(vendors).where(eq(vendors.id, bill.vendorId));
      results.push({ ...bill, vendor });
    }
    return results;
  }

  async getVendorBill(id: number): Promise<VendorBillWithVendor | undefined> {
    const [bill] = await db.select().from(vendorBills).where(eq(vendorBills.id, id));
    if (!bill) return undefined;
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, bill.vendorId));
    return { ...bill, vendor };
  }

  async createVendorBill(bill: InsertVendorBill): Promise<VendorBill> {
    const [result] = await db.insert(vendorBills).values(bill).returning();
    return result;
  }

  async updateVendorBill(id: number, bill: Partial<InsertVendorBill>): Promise<VendorBill | undefined> {
    const [result] = await db.update(vendorBills).set(bill).where(eq(vendorBills.id, id)).returning();
    return result || undefined;
  }

  // Expenses
  async getAllExpenses(): Promise<ExpenseWithVendor[]> {
    const expenseRows = await db.select().from(expenses).orderBy(desc(expenses.createdAt));
    const results: ExpenseWithVendor[] = [];
    for (const exp of expenseRows) {
      const vendor = exp.vendorId
        ? (await db.select().from(vendors).where(eq(vendors.id, exp.vendorId)))[0] || null
        : null;
      results.push({ ...exp, vendor });
    }
    return results;
  }

  async getExpense(id: number): Promise<ExpenseWithVendor | undefined> {
    const [exp] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!exp) return undefined;
    const vendor = exp.vendorId
      ? (await db.select().from(vendors).where(eq(vendors.id, exp.vendorId)))[0] || null
      : null;
    return { ...exp, vendor };
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [result] = await db.insert(expenses).values(expense).returning();
    return result;
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [result] = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
    return result || undefined;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Opening Balances
  async getOpeningBalance(customerId: number): Promise<OpeningBalance | undefined> {
    const [result] = await db.select().from(openingBalances).where(eq(openingBalances.customerId, customerId));
    return result || undefined;
  }

  async setOpeningBalance(balance: InsertOpeningBalance): Promise<OpeningBalance> {
    const existing = await this.getOpeningBalance(balance.customerId);
    if (existing) {
      const [result] = await db
        .update(openingBalances)
        .set(balance)
        .where(eq(openingBalances.customerId, balance.customerId))
        .returning();
      return result;
    }
    const [result] = await db.insert(openingBalances).values(balance).returning();
    return result;
  }

  // Customer Ledger
  async getCustomerLedger(customerId: number): Promise<{ entries: any[]; balance: number }> {
    const ob = await this.getOpeningBalance(customerId);
    const customerInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(asc(invoices.createdAt));
    const customerPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy(asc(payments.receivedAt));

    const ledgerEntries: any[] = [];
    let runningBalance = ob ? ob.amount : 0;

    if (ob && ob.amount !== 0) {
      ledgerEntries.push({
        date: ob.asOfDate,
        type: "opening_balance",
        description: "Opening Balance",
        debit: ob.amount > 0 ? ob.amount : 0,
        credit: ob.amount < 0 ? Math.abs(ob.amount) : 0,
        balance: runningBalance,
        referenceId: null,
      });
    }

    const allEntries = [
      ...customerInvoices.map((inv) => ({
        date: inv.issueDate,
        sortDate: new Date(inv.createdAt),
        type: "invoice" as const,
        description: `Invoice #${inv.id} - ${inv.periodStart} to ${inv.periodEnd}`,
        amount: inv.totalAmount,
        referenceId: inv.id,
      })),
      ...customerPayments.map((pay) => ({
        date: new Date(pay.receivedAt).toISOString().split("T")[0],
        sortDate: new Date(pay.receivedAt),
        type: "payment" as const,
        description: `Payment - ${pay.method} (${pay.collectedBy})`,
        amount: pay.amount,
        referenceId: pay.id,
      })),
    ].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    for (const entry of allEntries) {
      if (entry.type === "invoice") {
        runningBalance += entry.amount;
        ledgerEntries.push({
          date: entry.date,
          type: "invoice",
          description: entry.description,
          debit: entry.amount,
          credit: 0,
          balance: runningBalance,
          referenceId: entry.referenceId,
        });
      } else {
        runningBalance -= entry.amount;
        ledgerEntries.push({
          date: entry.date,
          type: "payment",
          description: entry.description,
          debit: 0,
          credit: entry.amount,
          balance: runningBalance,
          referenceId: entry.referenceId,
        });
      }
    }

    return { entries: ledgerEntries, balance: runningBalance };
  }

  // Reports
  async getTrialBalance(): Promise<{ accounts: { id: number; code: string; name: string; type: string; debit: number; credit: number }[] }> {
    const accounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.isActive, true)).orderBy(asc(chartOfAccounts.code));
    const result = [];

    for (const account of accounts) {
      const lines = await db.select().from(journalLines).where(eq(journalLines.accountId, account.id));
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      if (totalDebit !== 0 || totalCredit !== 0) {
        result.push({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: totalDebit,
          credit: totalCredit,
        });
      }
    }

    return { accounts: result };
  }

  async getProfitAndLoss(startDate: string, endDate: string): Promise<{ revenue: any[]; expenses: any[]; totalRevenue: number; totalExpenses: number; netIncome: number }> {
    const accounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.isActive, true)).orderBy(asc(chartOfAccounts.code));
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(gte(journalEntries.entryDate, startDate), lte(journalEntries.entryDate, endDate)));
    const entryIds = entries.map((e) => e.id);

    const revenueAccounts: any[] = [];
    const expenseAccounts: any[] = [];

    for (const account of accounts) {
      if (account.type !== "revenue" && account.type !== "expense") continue;
      const lines = entryIds.length > 0
        ? (await db.select().from(journalLines).where(eq(journalLines.accountId, account.id)))
            .filter((l) => entryIds.includes(l.entryId))
        : [];
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      const net = account.type === "revenue" ? totalCredit - totalDebit : totalDebit - totalCredit;
      if (net !== 0) {
        const item = { id: account.id, code: account.code, name: account.name, amount: net };
        if (account.type === "revenue") revenueAccounts.push(item);
        else expenseAccounts.push(item);
      }
    }

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.amount, 0);

    return {
      revenue: revenueAccounts,
      expenses: expenseAccounts,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  async getBalanceSheet(): Promise<{ assets: any[]; liabilities: any[]; equity: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number }> {
    const accounts = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.isActive, true)).orderBy(asc(chartOfAccounts.code));

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];

    for (const account of accounts) {
      if (account.type !== "asset" && account.type !== "liability" && account.type !== "equity") continue;
      const lines = await db.select().from(journalLines).where(eq(journalLines.accountId, account.id));
      const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
      const balance = account.type === "asset" ? totalDebit - totalCredit : totalCredit - totalDebit;
      if (balance !== 0) {
        const item = { id: account.id, code: account.code, name: account.name, balance };
        if (account.type === "asset") assets.push(item);
        else if (account.type === "liability") liabilities.push(item);
        else equity.push(item);
      }
    }

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, a) => sum + a.balance, 0),
      totalLiabilities: liabilities.reduce((sum, a) => sum + a.balance, 0),
      totalEquity: equity.reduce((sum, a) => sum + a.balance, 0),
    };
  }

  async getAgingReport(): Promise<any[]> {
    const allInvoices = await db.select().from(invoices).where(
      or(
        eq(invoices.status, "issued"),
        eq(invoices.status, "partial"),
        eq(invoices.status, "overdue")
      )
    );

    const today = new Date();
    const agingBuckets: Record<number, { customerName: string; current: number; days30: number; days60: number; days90: number; over90: number; total: number }> = {};

    for (const inv of allInvoices) {
      const outstanding = inv.totalAmount - inv.paidAmount;
      if (outstanding <= 0) continue;

      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      if (!agingBuckets[inv.customerId]) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
        agingBuckets[inv.customerId] = {
          customerName: customer?.name || "Unknown",
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          over90: 0,
          total: 0,
        };
      }

      const bucket = agingBuckets[inv.customerId];
      if (daysOverdue <= 0) bucket.current += outstanding;
      else if (daysOverdue <= 30) bucket.days30 += outstanding;
      else if (daysOverdue <= 60) bucket.days60 += outstanding;
      else if (daysOverdue <= 90) bucket.days90 += outstanding;
      else bucket.over90 += outstanding;
      bucket.total += outstanding;
    }

    return Object.entries(agingBuckets).map(([customerId, data]) => ({
      customerId: Number(customerId),
      ...data,
    }));
  }

  // ======= AGENT METHODS =======

  async getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(agents.name);
  }

  async getAgent(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [result] = await db.insert(agents).values(agent).returning();
    return result;
  }

  async updateAgent(id: number, agent: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [result] = await db
      .update(agents)
      .set(agent)
      .where(eq(agents.id, id))
      .returning();
    return result || undefined;
  }

  async deleteAgent(id: number): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }

  // ======= COMPLAINT METHODS =======

  async getAllComplaints(filters?: { status?: string; customerId?: number }): Promise<ComplaintWithRelations[]> {
    const conditions = [];
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(complaints.status, filters.status as any));
    }
    if (filters?.customerId) {
      conditions.push(eq(complaints.customerId, filters.customerId));
    }

    const rows = conditions.length > 0
      ? await db.select().from(complaints).where(and(...conditions)).orderBy(desc(complaints.createdAt))
      : await db.select().from(complaints).orderBy(desc(complaints.createdAt));

    const results: ComplaintWithRelations[] = [];
    for (const row of rows) {
      const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId));
      const [feedback] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, row.id));
      const agent = row.agentId ? (await db.select().from(agents).where(eq(agents.id, row.agentId)))[0] || null : null;
      results.push({ ...row, customer, agent, feedback: feedback || null });
    }
    return results;
  }

  async getComplaint(id: number): Promise<ComplaintWithRelations | undefined> {
    const [row] = await db.select().from(complaints).where(eq(complaints.id, id));
    if (!row) return undefined;
    const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId));
    const [feedback] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, row.id));
    const agent = row.agentId ? (await db.select().from(agents).where(eq(agents.id, row.agentId)))[0] || null : null;
    return { ...row, customer, agent, feedback: feedback || null };
  }

  async getCustomerComplaints(customerId: number): Promise<ComplaintWithRelations[]> {
    return this.getAllComplaints({ customerId });
  }

  async createComplaint(complaint: InsertComplaint): Promise<Complaint> {
    const [result] = await db.insert(complaints).values(complaint).returning();
    return result;
  }

  async updateComplaint(id: number, complaint: Partial<InsertComplaint>): Promise<Complaint | undefined> {
    const [result] = await db
      .update(complaints)
      .set(complaint)
      .where(eq(complaints.id, id))
      .returning();
    return result || undefined;
  }

  async deleteComplaint(id: number): Promise<boolean> {
    await db.delete(complaintImages).where(eq(complaintImages.complaintId, id));
    await db.delete(complaintFeedback).where(eq(complaintFeedback.complaintId, id));
    const result = await db.delete(complaints).where(eq(complaints.id, id)).returning();
    return result.length > 0;
  }

  async getComplaintFeedback(complaintId: number): Promise<ComplaintFeedback | undefined> {
    const [result] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, complaintId));
    return result || undefined;
  }

  async createComplaintFeedback(feedback: InsertComplaintFeedback): Promise<ComplaintFeedback> {
    const [result] = await db.insert(complaintFeedback).values(feedback).returning();
    return result;
  }

  async getComplaintStats(): Promise<{
    totalOpen: number;
    totalAssigned: number;
    totalInProgress: number;
    totalCompleted: number;
    totalClosed: number;
    avgAgentRating: number;
    avgServiceRating: number;
  }> {
    const allComplaints = await db.select().from(complaints);
    const allFeedback = await db.select().from(complaintFeedback);

    const totalOpen = allComplaints.filter((c) => c.status === "open").length;
    const totalAssigned = allComplaints.filter((c) => c.status === "assigned").length;
    const totalInProgress = allComplaints.filter((c) => c.status === "in_progress").length;
    const totalCompleted = allComplaints.filter((c) => c.status === "completed").length;
    const totalClosed = allComplaints.filter((c) => c.status === "closed").length;

    const avgAgentRating = allFeedback.length > 0
      ? Math.round((allFeedback.reduce((sum, f) => sum + f.agentRating, 0) / allFeedback.length) * 10) / 10
      : 0;
    const avgServiceRating = allFeedback.length > 0
      ? Math.round((allFeedback.reduce((sum, f) => sum + f.serviceRating, 0) / allFeedback.length) * 10) / 10
      : 0;

    return { totalOpen, totalAssigned, totalInProgress, totalCompleted, totalClosed, avgAgentRating, avgServiceRating };
  }

  // ======= DEPARTMENT METHODS =======

  async getAllDepartments(): Promise<Department[]> {
    return db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [result] = await db.select().from(departments).where(eq(departments.id, id));
    return result || undefined;
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [result] = await db.insert(departments).values(dept).returning();
    return result;
  }

  async updateDepartment(id: number, dept: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [result] = await db.update(departments).set(dept).where(eq(departments.id, id)).returning();
    return result || undefined;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // ======= DESIGNATION METHODS =======

  async getAllDesignations(): Promise<Designation[]> {
    return db.select().from(designations).orderBy(designations.title);
  }

  async getDesignation(id: number): Promise<Designation | undefined> {
    const [result] = await db.select().from(designations).where(eq(designations.id, id));
    return result || undefined;
  }

  async createDesignation(desig: InsertDesignation): Promise<Designation> {
    const [result] = await db.insert(designations).values(desig).returning();
    return result;
  }

  async updateDesignation(id: number, desig: Partial<InsertDesignation>): Promise<Designation | undefined> {
    const [result] = await db.update(designations).set(desig).where(eq(designations.id, id)).returning();
    return result || undefined;
  }

  async deleteDesignation(id: number): Promise<void> {
    await db.delete(designations).where(eq(designations.id, id));
  }

  // ======= EMPLOYEE METHODS =======

  private async enrichEmployeeWithRelations(emp: Employee): Promise<EmployeeWithRelations> {
    const department = emp.departmentId
      ? (await db.select().from(departments).where(eq(departments.id, emp.departmentId)))[0] || null
      : null;
    const designation = emp.designationId
      ? (await db.select().from(designations).where(eq(designations.id, emp.designationId)))[0] || null
      : null;
    return { ...emp, department, designation };
  }

  async getAllEmployees(): Promise<EmployeeWithRelations[]> {
    const rows = await db.select().from(employees).orderBy(desc(employees.createdAt));
    const results: EmployeeWithRelations[] = [];
    for (const row of rows) {
      results.push(await this.enrichEmployeeWithRelations(row));
    }
    return results;
  }

  async searchEmployees(query: string): Promise<EmployeeWithRelations[]> {
    const pattern = `%${query}%`;
    const rows = await db
      .select()
      .from(employees)
      .where(
        or(
          ilike(employees.firstName, pattern),
          ilike(employees.lastName, pattern),
          ilike(employees.employeeCode, pattern),
          ilike(employees.contact, pattern),
          ilike(employees.email, pattern)
        )
      )
      .orderBy(desc(employees.createdAt));
    const results: EmployeeWithRelations[] = [];
    for (const row of rows) {
      results.push(await this.enrichEmployeeWithRelations(row));
    }
    return results;
  }

  async getEmployee(id: number): Promise<EmployeeWithRelations | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    if (!emp) return undefined;
    return this.enrichEmployeeWithRelations(emp);
  }

  async createEmployee(emp: InsertEmployee): Promise<Employee> {
    const [result] = await db.insert(employees).values(emp).returning();
    return result;
  }

  async updateEmployee(id: number, emp: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [result] = await db.update(employees).set(emp).where(eq(employees.id, id)).returning();
    return result || undefined;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(emergencyContacts).where(eq(emergencyContacts.employeeId, id));
    await db.delete(employeeDocuments).where(eq(employeeDocuments.employeeId, id));
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getEmployeeStats(): Promise<{ totalActive: number; totalOnLeave: number; totalByDepartment: { name: string; count: number }[] }> {
    const allEmployees = await db.select().from(employees);
    const totalActive = allEmployees.filter((e) => e.status === "active").length;
    const totalOnLeave = allEmployees.filter((e) => e.status === "on_leave").length;

    const deptCounts: Record<number, number> = {};
    for (const emp of allEmployees) {
      if (emp.departmentId) {
        deptCounts[emp.departmentId] = (deptCounts[emp.departmentId] || 0) + 1;
      }
    }

    const totalByDepartment: { name: string; count: number }[] = [];
    for (const [deptId, count] of Object.entries(deptCounts)) {
      const [dept] = await db.select().from(departments).where(eq(departments.id, Number(deptId)));
      if (dept) {
        totalByDepartment.push({ name: dept.name, count });
      }
    }

    return { totalActive, totalOnLeave, totalByDepartment };
  }

  // ======= EMERGENCY CONTACT METHODS =======

  async getEmployeeEmergencyContacts(employeeId: number): Promise<EmergencyContact[]> {
    return db.select().from(emergencyContacts).where(eq(emergencyContacts.employeeId, employeeId));
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const [result] = await db.insert(emergencyContacts).values(contact).returning();
    return result;
  }

  async deleteEmergencyContact(id: number): Promise<void> {
    await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  }

  // ======= EMPLOYEE DOCUMENT METHODS =======

  async getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    return db.select().from(employeeDocuments).where(eq(employeeDocuments.employeeId, employeeId)).orderBy(desc(employeeDocuments.uploadedAt));
  }

  async createEmployeeDocument(doc: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [result] = await db.insert(employeeDocuments).values(doc).returning();
    return result;
  }

  async deleteEmployeeDocument(id: number): Promise<void> {
    await db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
  }

  // ======= ATTENDANCE METHODS =======

  async getAttendanceById(id: number): Promise<Attendance | undefined> {
    const [result] = await db.select().from(attendance).where(eq(attendance.id, id));
    return result || undefined;
  }

  async getAttendanceByDate(date: string): Promise<AttendanceWithEmployee[]> {
    const rows = await db.select().from(attendance).where(eq(attendance.date, date));
    const results: AttendanceWithEmployee[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async getEmployeeAttendance(employeeId: number, startDate?: string, endDate?: string): Promise<Attendance[]> {
    const conditions = [eq(attendance.employeeId, employeeId)];
    if (startDate) conditions.push(gte(attendance.date, startDate));
    if (endDate) conditions.push(lte(attendance.date, endDate));
    return db.select().from(attendance).where(and(...conditions)).orderBy(desc(attendance.date));
  }

  async markAttendance(att: InsertAttendance): Promise<Attendance> {
    const [result] = await db.insert(attendance).values(att).returning();
    return result;
  }

  async updateAttendance(id: number, att: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [result] = await db.update(attendance).set(att).where(eq(attendance.id, id)).returning();
    return result || undefined;
  }

  async deleteAttendance(id: number): Promise<void> {
    await db.delete(attendance).where(eq(attendance.id, id));
  }

  async getAttendanceStats(month: string, year: number): Promise<{ totalPresent: number; totalAbsent: number; totalLate: number; totalHalfDay: number }> {
    const monthStr = month.padStart(2, "0");
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;
    const rows = await db
      .select()
      .from(attendance)
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const totalPresent = rows.filter((r) => r.status === "present").length;
    const totalAbsent = rows.filter((r) => r.status === "absent").length;
    const totalLate = rows.filter((r) => r.status === "late").length;
    const totalHalfDay = rows.filter((r) => r.status === "half_day").length;

    return { totalPresent, totalAbsent, totalLate, totalHalfDay };
  }

  async getMonthlyAttendanceDeductions(month: string, year: number): Promise<Array<{ employeeId: number; totalFines: number; absentDays: number; lateDays: number; totalOvertimeReward: number }>> {
    const monthStr = month.padStart(2, "0");
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;
    const rows = await db
      .select()
      .from(attendance)
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const empMap: Record<number, { totalFines: number; absentDays: number; lateDays: number; totalOvertimeReward: number }> = {};
    for (const row of rows) {
      if (!empMap[row.employeeId]) {
        empMap[row.employeeId] = { totalFines: 0, absentDays: 0, lateDays: 0, totalOvertimeReward: 0 };
      }
      if (row.status === "absent") {
        empMap[row.employeeId].absentDays++;
      }
      if (row.status === "late") {
        empMap[row.employeeId].lateDays++;
        empMap[row.employeeId].totalFines += (row.fineAmount || 0);
      }
      empMap[row.employeeId].totalOvertimeReward += (row.overtimeReward || 0);
    }

    return Object.entries(empMap).map(([empId, data]) => ({
      employeeId: Number(empId),
      ...data,
    }));
  }

  // ======= LEAVE TYPE CONFIG METHODS =======

  async getAllLeaveTypeConfigs(): Promise<LeaveTypeConfig[]> {
    return db.select().from(leaveTypeConfigs);
  }

  async createLeaveTypeConfig(config: InsertLeaveTypeConfig): Promise<LeaveTypeConfig> {
    const [result] = await db.insert(leaveTypeConfigs).values(config).returning();
    return result;
  }

  async updateLeaveTypeConfig(id: number, config: Partial<InsertLeaveTypeConfig>): Promise<LeaveTypeConfig | undefined> {
    const [result] = await db.update(leaveTypeConfigs).set(config).where(eq(leaveTypeConfigs.id, id)).returning();
    return result || undefined;
  }

  // ======= LEAVE REQUEST METHODS =======

  async getAllLeaveRequests(filters?: { status?: string; employeeId?: number }): Promise<LeaveRequestWithEmployee[]> {
    const conditions = [];
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(leaveRequests.status, filters.status as any));
    }
    if (filters?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, filters.employeeId));
    }

    const rows = conditions.length > 0
      ? await db.select().from(leaveRequests).where(and(...conditions)).orderBy(desc(leaveRequests.createdAt))
      : await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));

    const results: LeaveRequestWithEmployee[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async getLeaveRequest(id: number): Promise<LeaveRequestWithEmployee | undefined> {
    const [row] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    if (!row) return undefined;
    const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
    if (!employee) return undefined;
    return { ...row, employee };
  }

  async getEmployeeLeaveRequests(employeeId: number): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId)).orderBy(desc(leaveRequests.createdAt));
  }

  async createLeaveRequest(req: InsertLeaveRequest): Promise<LeaveRequest> {
    const [result] = await db.insert(leaveRequests).values(req).returning();
    return result;
  }

  async updateLeaveRequest(id: number, req: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [result] = await db.update(leaveRequests).set(req).where(eq(leaveRequests.id, id)).returning();
    return result || undefined;
  }

  // ======= LEAVE BALANCE METHODS =======

  async getEmployeeLeaveBalances(employeeId: number, year: number): Promise<LeaveBalance[]> {
    return db.select().from(leaveBalances).where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)));
  }

  async createLeaveBalance(bal: InsertLeaveBalance): Promise<LeaveBalance> {
    const [result] = await db.insert(leaveBalances).values(bal).returning();
    return result;
  }

  async updateLeaveBalance(id: number, bal: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined> {
    const [result] = await db.update(leaveBalances).set(bal).where(eq(leaveBalances.id, id)).returning();
    return result || undefined;
  }

  // ======= SALARY STRUCTURE METHODS =======

  async getSalaryStructure(employeeId: number): Promise<SalaryStructure | undefined> {
    const [result] = await db.select().from(salaryStructures).where(eq(salaryStructures.employeeId, employeeId));
    return result || undefined;
  }

  async createSalaryStructure(struct: InsertSalaryStructure): Promise<SalaryStructure> {
    const [result] = await db.insert(salaryStructures).values(struct).returning();
    return result;
  }

  async updateSalaryStructure(id: number, struct: Partial<InsertSalaryStructure>): Promise<SalaryStructure | undefined> {
    const [result] = await db.update(salaryStructures).set(struct).where(eq(salaryStructures.id, id)).returning();
    return result || undefined;
  }

  // ======= PAYROLL RUN METHODS =======

  async getAllPayrollRuns(): Promise<PayrollRun[]> {
    return db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt));
  }

  async getPayrollRun(id: number): Promise<PayrollRun | undefined> {
    const [result] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return result || undefined;
  }

  async createPayrollRun(run: InsertPayrollRun): Promise<PayrollRun> {
    const [result] = await db.insert(payrollRuns).values(run).returning();
    return result;
  }

  async updatePayrollRun(id: number, run: Partial<InsertPayrollRun>): Promise<PayrollRun | undefined> {
    const [result] = await db.update(payrollRuns).set(run).where(eq(payrollRuns.id, id)).returning();
    return result || undefined;
  }

  // ======= PAYSLIP METHODS =======

  async getPayrollPayslips(payrollRunId: number): Promise<PayslipWithEmployee[]> {
    const rows = await db.select().from(payslips).where(eq(payslips.payrollRunId, payrollRunId));
    const results: PayslipWithEmployee[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async getEmployeePayslips(employeeId: number): Promise<PayslipWithEmployee[]> {
    const rows = await db.select().from(payslips).where(eq(payslips.employeeId, employeeId)).orderBy(desc(payslips.createdAt));
    const results: PayslipWithEmployee[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async createPayslip(slip: InsertPayslip): Promise<Payslip> {
    const [result] = await db.insert(payslips).values(slip).returning();
    return result;
  }

  async updatePayslip(id: number, slip: Partial<InsertPayslip>): Promise<Payslip | undefined> {
    const [result] = await db.update(payslips).set(slip).where(eq(payslips.id, id)).returning();
    return result || undefined;
  }

  // ======= PERFORMANCE CYCLE METHODS =======

  async getAllPerformanceCycles(): Promise<PerformanceCycle[]> {
    return db.select().from(performanceCycles).orderBy(desc(performanceCycles.createdAt));
  }

  async createPerformanceCycle(cycle: InsertPerformanceCycle): Promise<PerformanceCycle> {
    const [result] = await db.insert(performanceCycles).values(cycle).returning();
    return result;
  }

  async updatePerformanceCycle(id: number, cycle: Partial<InsertPerformanceCycle>): Promise<PerformanceCycle | undefined> {
    const [result] = await db.update(performanceCycles).set(cycle).where(eq(performanceCycles.id, id)).returning();
    return result || undefined;
  }

  // ======= PERFORMANCE REVIEW METHODS =======

  private async enrichReviewWithRelations(review: PerformanceReview): Promise<PerformanceReviewWithRelations> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, review.employeeId));
    const [cycle] = await db.select().from(performanceCycles).where(eq(performanceCycles.id, review.cycleId));
    return { ...review, employee, cycle };
  }

  async getPerformanceReviews(cycleId?: number): Promise<PerformanceReviewWithRelations[]> {
    const rows = cycleId
      ? await db.select().from(performanceReviews).where(eq(performanceReviews.cycleId, cycleId)).orderBy(desc(performanceReviews.createdAt))
      : await db.select().from(performanceReviews).orderBy(desc(performanceReviews.createdAt));

    const results: PerformanceReviewWithRelations[] = [];
    for (const row of rows) {
      results.push(await this.enrichReviewWithRelations(row));
    }
    return results;
  }

  async getEmployeeReviews(employeeId: number): Promise<PerformanceReviewWithRelations[]> {
    const rows = await db.select().from(performanceReviews).where(eq(performanceReviews.employeeId, employeeId)).orderBy(desc(performanceReviews.createdAt));
    const results: PerformanceReviewWithRelations[] = [];
    for (const row of rows) {
      results.push(await this.enrichReviewWithRelations(row));
    }
    return results;
  }

  async createPerformanceReview(review: InsertPerformanceReview): Promise<PerformanceReview> {
    const [result] = await db.insert(performanceReviews).values(review).returning();
    return result;
  }

  async updatePerformanceReview(id: number, review: Partial<InsertPerformanceReview>): Promise<PerformanceReview | undefined> {
    const [result] = await db.update(performanceReviews).set(review).where(eq(performanceReviews.id, id)).returning();
    return result || undefined;
  }

  // ======= JOB OPENING METHODS =======

  async getAllJobOpenings(): Promise<JobOpening[]> {
    return db.select().from(jobOpenings).orderBy(desc(jobOpenings.createdAt));
  }

  async getJobOpening(id: number): Promise<JobOpening | undefined> {
    const [result] = await db.select().from(jobOpenings).where(eq(jobOpenings.id, id));
    return result || undefined;
  }

  async createJobOpening(opening: InsertJobOpening): Promise<JobOpening> {
    const [result] = await db.insert(jobOpenings).values(opening).returning();
    return result;
  }

  async updateJobOpening(id: number, opening: Partial<InsertJobOpening>): Promise<JobOpening | undefined> {
    const [result] = await db.update(jobOpenings).set(opening).where(eq(jobOpenings.id, id)).returning();
    return result || undefined;
  }

  // ======= CANDIDATE METHODS =======

  async getCandidates(jobOpeningId?: number): Promise<(Candidate & { jobOpening: JobOpening })[]> {
    const rows = jobOpeningId
      ? await db.select().from(candidates).where(eq(candidates.jobOpeningId, jobOpeningId)).orderBy(desc(candidates.createdAt))
      : await db.select().from(candidates).orderBy(desc(candidates.createdAt));

    const results: (Candidate & { jobOpening: JobOpening })[] = [];
    for (const row of rows) {
      const [jobOpening] = await db.select().from(jobOpenings).where(eq(jobOpenings.id, row.jobOpeningId));
      if (jobOpening) {
        results.push({ ...row, jobOpening });
      }
    }
    return results;
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [result] = await db.select().from(candidates).where(eq(candidates.id, id));
    return result || undefined;
  }

  async createCandidate(cand: InsertCandidate): Promise<Candidate> {
    const [result] = await db.insert(candidates).values(cand).returning();
    return result;
  }

  async updateCandidate(id: number, cand: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [result] = await db.update(candidates).set(cand).where(eq(candidates.id, id)).returning();
    return result || undefined;
  }

  // ======= TRAINING METHODS =======

  async getAllTrainings(): Promise<Training[]> {
    return db.select().from(trainings).orderBy(desc(trainings.createdAt));
  }

  async getTraining(id: number): Promise<Training | undefined> {
    const [result] = await db.select().from(trainings).where(eq(trainings.id, id));
    return result || undefined;
  }

  async createTraining(training: InsertTraining): Promise<Training> {
    const [result] = await db.insert(trainings).values(training).returning();
    return result;
  }

  async updateTraining(id: number, training: Partial<InsertTraining>): Promise<Training | undefined> {
    const [result] = await db.update(trainings).set(training).where(eq(trainings.id, id)).returning();
    return result || undefined;
  }

  // ======= TRAINING ENROLLMENT METHODS =======

  async getTrainingEnrollments(trainingId: number): Promise<(TrainingEnrollment & { employee: Employee })[]> {
    const rows = await db.select().from(trainingEnrollments).where(eq(trainingEnrollments.trainingId, trainingId));
    const results: (TrainingEnrollment & { employee: Employee })[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async createTrainingEnrollment(enrollment: InsertTrainingEnrollment): Promise<TrainingEnrollment> {
    const [result] = await db.insert(trainingEnrollments).values(enrollment).returning();
    return result;
  }

  async updateTrainingEnrollment(id: number, enrollment: Partial<InsertTrainingEnrollment>): Promise<TrainingEnrollment | undefined> {
    const [result] = await db.update(trainingEnrollments).set(enrollment).where(eq(trainingEnrollments.id, id)).returning();
    return result || undefined;
  }

  // ======= ASSET METHODS =======

  async getAllAssets(): Promise<AssetWithEmployee[]> {
    const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));
    const results: AssetWithEmployee[] = [];
    for (const row of rows) {
      const employee = row.assignedTo
        ? (await db.select().from(employees).where(eq(employees.id, row.assignedTo)))[0] || null
        : null;
      results.push({ ...row, employee });
    }
    return results;
  }

  async getAsset(id: number): Promise<AssetWithEmployee | undefined> {
    const [row] = await db.select().from(assets).where(eq(assets.id, id));
    if (!row) return undefined;
    const employee = row.assignedTo
      ? (await db.select().from(employees).where(eq(employees.id, row.assignedTo)))[0] || null
      : null;
    return { ...row, employee };
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [result] = await db.insert(assets).values(asset).returning();
    return result;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [result] = await db.update(assets).set(asset).where(eq(assets.id, id)).returning();
    return result || undefined;
  }

  // ======= ANNOUNCEMENT METHODS =======

  async getAllAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(ann: InsertAnnouncement): Promise<Announcement> {
    const [result] = await db.insert(announcements).values(ann).returning();
    return result;
  }

  async updateAnnouncement(id: number, ann: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [result] = await db.update(announcements).set(ann).where(eq(announcements.id, id)).returning();
    return result || undefined;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // ======= POLICY METHODS =======

  async getAllPolicies(): Promise<Policy[]> {
    return db.select().from(policies).orderBy(desc(policies.createdAt));
  }

  async getPolicy(id: number): Promise<Policy | undefined> {
    const [result] = await db.select().from(policies).where(eq(policies.id, id));
    return result || undefined;
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [result] = await db.insert(policies).values(policy).returning();
    return result;
  }

  async updatePolicy(id: number, policy: Partial<InsertPolicy>): Promise<Policy | undefined> {
    const [result] = await db.update(policies).set(policy).where(eq(policies.id, id)).returning();
    return result || undefined;
  }

  // ======= POLICY ACKNOWLEDGEMENT METHODS =======

  async getPolicyAcknowledgements(policyId: number): Promise<(PolicyAcknowledgement & { employee: Employee })[]> {
    const rows = await db.select().from(policyAcknowledgements).where(eq(policyAcknowledgements.policyId, policyId));
    const results: (PolicyAcknowledgement & { employee: Employee })[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      if (employee) {
        results.push({ ...row, employee });
      }
    }
    return results;
  }

  async createPolicyAcknowledgement(ack: InsertPolicyAcknowledgement): Promise<PolicyAcknowledgement> {
    const [result] = await db.insert(policyAcknowledgements).values(ack).returning();
    return result;
  }

  // ======= HOLIDAY METHODS =======

  async getHolidays(year?: number): Promise<Holiday[]> {
    if (year) {
      return db.select().from(holidays).where(eq(holidays.year, year)).orderBy(holidays.date);
    }
    return db.select().from(holidays).orderBy(holidays.date);
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [result] = await db.insert(holidays).values(holiday).returning();
    return result;
  }

  async updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [result] = await db.update(holidays).set(holiday).where(eq(holidays.id, id)).returning();
    return result || undefined;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // ======= WORKING HOURS CONFIG METHODS =======

  async getWorkingHoursConfig(): Promise<WorkingHoursConfig[]> {
    return db.select().from(workingHoursConfig).orderBy(workingHoursConfig.dayOfWeek);
  }

  async upsertWorkingHoursConfig(config: InsertWorkingHoursConfig): Promise<WorkingHoursConfig> {
    const [existing] = await db.select().from(workingHoursConfig).where(eq(workingHoursConfig.dayOfWeek, config.dayOfWeek));
    if (existing) {
      const [result] = await db.update(workingHoursConfig).set(config).where(eq(workingHoursConfig.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(workingHoursConfig).values(config).returning();
    return result;
  }

  // ======= AUDIT LOG METHODS =======

  async getAuditLogs(filters?: { entity?: string; limit?: number }): Promise<AuditLog[]> {
    const conditions = [];
    if (filters?.entity) {
      conditions.push(eq(auditLogs.entity, filters.entity));
    }

    let query = conditions.length > 0
      ? db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt))
      : db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return query;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }

  // ======= STOCK MANAGEMENT METHODS =======

  async getAllStockItems(): Promise<(StockItem & { remainingQuantity: number })[]> {
    const items = await db.select().from(stockItems).orderBy(stockItems.name);
    const results = [];
    for (const item of items) {
      const issues = await db.select({ total: sql<number>`COALESCE(SUM(${stockIssues.quantity}), 0)` }).from(stockIssues).where(eq(stockIssues.stockItemId, item.id));
      const returns = await db.select({ total: sql<number>`COALESCE(SUM(${stockReturns.quantity}), 0)` }).from(stockReturns).where(eq(stockReturns.stockItemId, item.id));
      const damages = await db.select({ total: sql<number>`COALESCE(SUM(${stockDamages.quantity}), 0)` }).from(stockDamages).where(eq(stockDamages.stockItemId, item.id));
      const totalIssued = Number(issues[0]?.total || 0);
      const totalReturned = Number(returns[0]?.total || 0);
      const totalDamaged = Number(damages[0]?.total || 0);
      results.push({ ...item, remainingQuantity: item.quantity - totalIssued + totalReturned - totalDamaged });
    }
    return results;
  }

  async getStockItem(id: number): Promise<(StockItem & { remainingQuantity: number }) | undefined> {
    const [item] = await db.select().from(stockItems).where(eq(stockItems.id, id));
    if (!item) return undefined;
    const issues = await db.select({ total: sql<number>`COALESCE(SUM(${stockIssues.quantity}), 0)` }).from(stockIssues).where(eq(stockIssues.stockItemId, id));
    const returns = await db.select({ total: sql<number>`COALESCE(SUM(${stockReturns.quantity}), 0)` }).from(stockReturns).where(eq(stockReturns.stockItemId, id));
    const damages = await db.select({ total: sql<number>`COALESCE(SUM(${stockDamages.quantity}), 0)` }).from(stockDamages).where(eq(stockDamages.stockItemId, id));
    const totalIssued = Number(issues[0]?.total || 0);
    const totalReturned = Number(returns[0]?.total || 0);
    const totalDamaged = Number(damages[0]?.total || 0);
    return { ...item, remainingQuantity: item.quantity - totalIssued + totalReturned - totalDamaged };
  }

  async createStockItem(item: InsertStockItem): Promise<StockItem> {
    const [result] = await db.insert(stockItems).values(item).returning();
    return result;
  }

  async updateStockItem(id: number, item: Partial<InsertStockItem>): Promise<StockItem | undefined> {
    const [result] = await db.update(stockItems).set(item).where(eq(stockItems.id, id)).returning();
    return result || undefined;
  }

  async deleteStockItem(id: number): Promise<void> {
    await db.delete(stockIssues).where(eq(stockIssues.stockItemId, id));
    await db.delete(stockReturns).where(eq(stockReturns.stockItemId, id));
    await db.delete(stockDamages).where(eq(stockDamages.stockItemId, id));
    await db.delete(stockItems).where(eq(stockItems.id, id));
  }

  async getAllStockIssues(stockItemId?: number): Promise<StockIssueWithItem[]> {
    const rows = stockItemId
      ? await db.select().from(stockIssues).where(eq(stockIssues.stockItemId, stockItemId)).orderBy(desc(stockIssues.createdAt))
      : await db.select().from(stockIssues).orderBy(desc(stockIssues.createdAt));
    const results: StockIssueWithItem[] = [];
    for (const row of rows) {
      const [item] = await db.select().from(stockItems).where(eq(stockItems.id, row.stockItemId));
      results.push({ ...row, stockItem: item || null });
    }
    return results;
  }

  async createStockIssue(issue: InsertStockIssue): Promise<StockIssue> {
    const [result] = await db.insert(stockIssues).values(issue).returning();
    return result;
  }

  async deleteStockIssue(id: number): Promise<void> {
    await db.delete(stockIssues).where(eq(stockIssues.id, id));
  }

  async getAllStockReturns(stockItemId?: number): Promise<StockReturnWithItem[]> {
    const rows = stockItemId
      ? await db.select().from(stockReturns).where(eq(stockReturns.stockItemId, stockItemId)).orderBy(desc(stockReturns.createdAt))
      : await db.select().from(stockReturns).orderBy(desc(stockReturns.createdAt));
    const results: StockReturnWithItem[] = [];
    for (const row of rows) {
      const [item] = await db.select().from(stockItems).where(eq(stockItems.id, row.stockItemId));
      results.push({ ...row, stockItem: item || null });
    }
    return results;
  }

  async createStockReturn(ret: InsertStockReturn): Promise<StockReturn> {
    const [result] = await db.insert(stockReturns).values(ret).returning();
    return result;
  }

  async deleteStockReturn(id: number): Promise<void> {
    await db.delete(stockReturns).where(eq(stockReturns.id, id));
  }

  async getAllStockDamages(stockItemId?: number): Promise<StockDamageWithItem[]> {
    const rows = stockItemId
      ? await db.select().from(stockDamages).where(eq(stockDamages.stockItemId, stockItemId)).orderBy(desc(stockDamages.createdAt))
      : await db.select().from(stockDamages).orderBy(desc(stockDamages.createdAt));
    const results: StockDamageWithItem[] = [];
    for (const row of rows) {
      const [item] = await db.select().from(stockItems).where(eq(stockItems.id, row.stockItemId));
      results.push({ ...row, stockItem: item || null });
    }
    return results;
  }

  async createStockDamage(damage: InsertStockDamage): Promise<StockDamage> {
    const [result] = await db.insert(stockDamages).values(damage).returning();
    return result;
  }

  async deleteStockDamage(id: number): Promise<void> {
    await db.delete(stockDamages).where(eq(stockDamages.id, id));
  }

  // Daily Income & Expense Entries
  async getDailyEntries(filters?: { date?: string; type?: string }): Promise<DailyEntryWithRelations[]> {
    const conditions = [];
    if (filters?.date) conditions.push(eq(dailyEntries.date, filters.date));
    if (filters?.type) conditions.push(eq(dailyEntries.type, filters.type as any));
    const entries = conditions.length > 0
      ? await db.select().from(dailyEntries).where(and(...conditions)).orderBy(desc(dailyEntries.createdAt))
      : await db.select().from(dailyEntries).orderBy(desc(dailyEntries.createdAt));
    const allCustomers = await db.select({ id: customers.id, name: customers.name }).from(customers);
    const customerMap = new Map(allCustomers.map(c => [c.id, c]));
    return entries.map(e => ({
      ...e,
      customer: e.customerId ? customerMap.get(e.customerId) || null : null,
    }));
  }

  async createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry> {
    const [result] = await db.insert(dailyEntries).values(entry).returning();
    return result;
  }

  async updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined> {
    const [result] = await db.update(dailyEntries).set(entry).where(eq(dailyEntries.id, id)).returning();
    return result || undefined;
  }

  async deleteDailyEntry(id: number): Promise<void> {
    await db.delete(dailyEntries).where(eq(dailyEntries.id, id));
  }

  async getDailyReport(date: string): Promise<{ totalIncome: number; totalExpense: number; entries: DailyEntryWithRelations[] }> {
    const entries = await this.getDailyEntries({ date });
    const totalIncome = entries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    return { totalIncome, totalExpense, entries };
  }

  // ======= MONTH CLOSING SHEET =======

  async getMonthClosing(month: string): Promise<MonthClosing | undefined> {
    const [result] = await db.select().from(monthClosings).where(eq(monthClosings.month, month));
    return result || undefined;
  }

  async upsertMonthClosing(data: InsertMonthClosing): Promise<MonthClosing> {
    const existing = await this.getMonthClosing(data.month);
    if (existing) {
      const [result] = await db.update(monthClosings).set(data).where(eq(monthClosings.month, data.month)).returning();
      return result;
    }
    const [result] = await db.insert(monthClosings).values(data).returning();
    return result;
  }

  async getMonthClosingSideEntries(month: string): Promise<MonthClosingSideEntry[]> {
    return db.select().from(monthClosingSideEntries).where(eq(monthClosingSideEntries.month, month)).orderBy(asc(monthClosingSideEntries.id));
  }

  async createMonthClosingSideEntry(entry: InsertMonthClosingSideEntry): Promise<MonthClosingSideEntry> {
    const [result] = await db.insert(monthClosingSideEntries).values(entry).returning();
    return result;
  }

  async deleteMonthClosingSideEntry(id: number): Promise<void> {
    await db.delete(monthClosingSideEntries).where(eq(monthClosingSideEntries.id, id));
  }

  async getMonthDailySummary(month: string): Promise<{ date: string; income: number; expense: number }[]> {
    const startDate = `${month}-01`;
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    const rows = await db
      .select({
        date: dailyEntries.date,
        type: dailyEntries.type,
        total: sum(dailyEntries.amount),
      })
      .from(dailyEntries)
      .where(and(gte(dailyEntries.date, startDate), lte(dailyEntries.date, endDate)))
      .groupBy(dailyEntries.date, dailyEntries.type)
      .orderBy(asc(dailyEntries.date));

    const dateMap = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      if (!dateMap.has(row.date)) {
        dateMap.set(row.date, { income: 0, expense: 0 });
      }
      const entry = dateMap.get(row.date)!;
      if (row.type === "income") entry.income = Number(row.total) || 0;
      else entry.expense = Number(row.total) || 0;
    }

    return Array.from(dateMap.entries())
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getNbbConnections(): Promise<NbbConnection[]> {
    return db.select().from(nbbConnections).orderBy(desc(nbbConnections.importedAt));
  }

  async createNbbConnection(conn: InsertNbbConnection): Promise<NbbConnection> {
    const [result] = await db.insert(nbbConnections).values(conn).returning();
    return result;
  }

  async upsertNbbConnection(conn: InsertNbbConnection): Promise<NbbConnection> {
    const existing = conn.connectionId
      ? await db.select().from(nbbConnections).where(eq(nbbConnections.connectionId, conn.connectionId))
      : [];
    if (existing.length > 0) {
      const [result] = await db.update(nbbConnections)
        .set({ ...conn, updatedAt: new Date() })
        .where(eq(nbbConnections.id, existing[0].id))
        .returning();
      return result;
    }
    return this.createNbbConnection(conn);
  }

  async deleteNbbConnection(id: number): Promise<void> {
    await db.delete(nbbConnections).where(eq(nbbConnections.id, id));
  }

  // Receivables / Recovery
  private async enrichReceivableWithPayments(rec: Receivable): Promise<ReceivableWithPayments> {
    const payments = await db.select().from(receivablePayments)
      .where(eq(receivablePayments.receivableId, rec.id))
      .orderBy(desc(receivablePayments.createdAt));
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    return { ...rec, payments, totalPaid, remaining: rec.amount - totalPaid };
  }

  async getAllReceivables(filters?: { status?: string }): Promise<ReceivableWithPayments[]> {
    const conditions = [];
    if (filters?.status) conditions.push(eq(receivables.status, filters.status as any));
    let rows: Receivable[];
    if (conditions.length > 0) {
      rows = await db.select().from(receivables).where(and(...conditions)).orderBy(desc(receivables.createdAt));
    } else {
      rows = await db.select().from(receivables).orderBy(desc(receivables.createdAt));
    }
    return Promise.all(rows.map(r => this.enrichReceivableWithPayments(r)));
  }

  async getReceivable(id: number): Promise<ReceivableWithPayments | undefined> {
    const [result] = await db.select().from(receivables).where(eq(receivables.id, id));
    if (!result) return undefined;
    return this.enrichReceivableWithPayments(result);
  }

  async createReceivable(data: InsertReceivable): Promise<Receivable> {
    const [result] = await db.insert(receivables).values(data).returning();
    return result;
  }

  async updateReceivable(id: number, data: Partial<InsertReceivable>): Promise<Receivable | undefined> {
    const [result] = await db.update(receivables).set(data).where(eq(receivables.id, id)).returning();
    return result || undefined;
  }

  async deleteReceivable(id: number): Promise<void> {
    await db.delete(receivables).where(eq(receivables.id, id));
  }

  // Receivable Payments
  async getReceivablePayments(receivableId: number): Promise<ReceivablePayment[]> {
    return db.select().from(receivablePayments)
      .where(eq(receivablePayments.receivableId, receivableId))
      .orderBy(desc(receivablePayments.createdAt));
  }

  async createReceivablePayment(data: InsertReceivablePayment): Promise<ReceivablePayment> {
    const [result] = await db.insert(receivablePayments).values(data).returning();
    return result;
  }

  async deleteReceivablePayment(id: number): Promise<void> {
    await db.delete(receivablePayments).where(eq(receivablePayments.id, id));
  }

  // Salary Advances
  async getSalaryAdvances(month?: string): Promise<SalaryAdvanceWithEmployee[]> {
    const conditions = month ? [eq(salaryAdvances.month, month)] : [];
    const rows = await db
      .select({
        id: salaryAdvances.id,
        employeeId: salaryAdvances.employeeId,
        amount: salaryAdvances.amount,
        advanceDate: salaryAdvances.advanceDate,
        month: salaryAdvances.month,
        description: salaryAdvances.description,
        status: salaryAdvances.status,
        approvedBy: salaryAdvances.approvedBy,
        createdAt: salaryAdvances.createdAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeCode,
      })
      .from(salaryAdvances)
      .leftJoin(employees, eq(salaryAdvances.employeeId, employees.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(salaryAdvances.createdAt));

    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      amount: r.amount,
      advanceDate: r.advanceDate,
      month: r.month,
      description: r.description,
      status: r.status,
      approvedBy: r.approvedBy,
      createdAt: r.createdAt,
      employee: {
        firstName: r.employeeFirstName || "",
        lastName: r.employeeLastName || "",
        employeeCode: r.employeeCode || "",
      },
    }));
  }

  async getEmployeeSalaryAdvances(employeeId: number, month?: string): Promise<SalaryAdvance[]> {
    const conditions = [eq(salaryAdvances.employeeId, employeeId)];
    if (month) conditions.push(eq(salaryAdvances.month, month));
    return db.select().from(salaryAdvances)
      .where(and(...conditions))
      .orderBy(desc(salaryAdvances.createdAt));
  }

  async createSalaryAdvance(advance: InsertSalaryAdvance): Promise<SalaryAdvance> {
    const [result] = await db.insert(salaryAdvances).values(advance).returning();
    return result;
  }

  async updateSalaryAdvance(id: number, advance: Partial<InsertSalaryAdvance>): Promise<SalaryAdvance | undefined> {
    const [result] = await db.update(salaryAdvances).set(advance).where(eq(salaryAdvances.id, id)).returning();
    return result;
  }

  async deleteSalaryAdvance(id: number): Promise<void> {
    await db.delete(salaryAdvances).where(eq(salaryAdvances.id, id));
  }

  async getEmployeeCommissions(month?: string): Promise<EmployeeCommissionWithEmployee[]> {
    const conditions = month ? [eq(employeeCommissions.month, month)] : [];
    const rows = await db
      .select({
        id: employeeCommissions.id,
        employeeId: employeeCommissions.employeeId,
        commissionName: employeeCommissions.commissionName,
        amount: employeeCommissions.amount,
        month: employeeCommissions.month,
        description: employeeCommissions.description,
        createdAt: employeeCommissions.createdAt,
        employeeFirstName: employees.firstName,
        employeeLastName: employees.lastName,
        employeeCode: employees.employeeCode,
      })
      .from(employeeCommissions)
      .leftJoin(employees, eq(employeeCommissions.employeeId, employees.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(employeeCommissions.createdAt));

    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      commissionName: r.commissionName,
      amount: r.amount,
      month: r.month,
      description: r.description,
      createdAt: r.createdAt,
      employee: {
        firstName: r.employeeFirstName || "",
        lastName: r.employeeLastName || "",
        employeeCode: r.employeeCode || "",
      },
    }));
  }

  async createEmployeeCommission(commission: InsertEmployeeCommission): Promise<EmployeeCommission> {
    const [result] = await db.insert(employeeCommissions).values(commission).returning();
    return result;
  }

  async deleteEmployeeCommission(id: number): Promise<void> {
    await db.delete(employeeCommissions).where(eq(employeeCommissions.id, id));
  }

  async getPosSlipsByCustomer(customerId: number): Promise<PosSlip[]> {
    return db.select().from(posSlips).where(eq(posSlips.customerId, customerId)).orderBy(desc(posSlips.slipDate));
  }

  async getPosSlipsByDate(date: string): Promise<PosSlip[]> {
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");
    return db.select().from(posSlips)
      .where(and(gte(posSlips.slipDate, startOfDay), lte(posSlips.slipDate, endOfDay)))
      .orderBy(desc(posSlips.createdAt));
  }

  async createPosSlip(data: InsertPosSlip): Promise<PosSlip> {
    const [result] = await db.insert(posSlips).values(data).returning();
    return result;
  }

  // ======= DUTY TYPES =======

  async getAllDutyTypes(): Promise<DutyType[]> {
    return db.select().from(dutyTypes).orderBy(dutyTypes.name);
  }

  async getDutyType(id: number): Promise<DutyType | undefined> {
    const [result] = await db.select().from(dutyTypes).where(eq(dutyTypes.id, id));
    return result;
  }

  async createDutyType(data: InsertDutyType): Promise<DutyType> {
    const [result] = await db.insert(dutyTypes).values(data).returning();
    return result;
  }

  async updateDutyType(id: number, data: Partial<InsertDutyType>): Promise<DutyType | undefined> {
    const [result] = await db.update(dutyTypes).set(data).where(eq(dutyTypes.id, id)).returning();
    return result || undefined;
  }

  async deleteDutyType(id: number): Promise<void> {
    await db.delete(dutyTypes).where(eq(dutyTypes.id, id));
  }

  // ======= DUTY ASSIGNMENTS =======

  async getDutyAssignmentsByDateRange(startDate: string, endDate: string): Promise<DutyAssignmentWithDetails[]> {
    const rows = await db.select().from(dutyAssignments)
      .where(and(gte(dutyAssignments.date, startDate), lte(dutyAssignments.date, endDate)))
      .orderBy(dutyAssignments.date);

    const results: DutyAssignmentWithDetails[] = [];
    for (const row of rows) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, row.employeeId));
      const [dutyType] = await db.select().from(dutyTypes).where(eq(dutyTypes.id, row.dutyTypeId));
      let dept = null;
      if (employee?.departmentId) {
        const [d] = await db.select().from(departments).where(eq(departments.id, employee.departmentId));
        dept = d || null;
      }
      results.push({
        ...row,
        employee: employee ? {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          department: dept ? { name: dept.name } : null,
        } : undefined,
        dutyType: dutyType || undefined,
      });
    }
    return results;
  }

  async createDutyAssignment(data: InsertDutyAssignment): Promise<DutyAssignment> {
    const [result] = await db.insert(dutyAssignments).values(data).returning();
    return result;
  }

  async updateDutyAssignment(id: number, data: Partial<InsertDutyAssignment>): Promise<DutyAssignment | undefined> {
    const [result] = await db.update(dutyAssignments).set(data).where(eq(dutyAssignments.id, id)).returning();
    return result || undefined;
  }

  async deleteDutyAssignment(id: number): Promise<void> {
    await db.delete(dutyAssignments).where(eq(dutyAssignments.id, id));
  }
}

export const storage = new DatabaseStorage();
