import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean, date, numeric, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accountStatusEnum = pgEnum("account_status", [
  "register",
  "active",
  "suspended",
  "terminated",
]);

export const connectionTypeEnum = pgEnum("connection_type", [
  "new_connection",
  "upgrade",
  "relocation",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "partial",
  "overdue",
  "void",
]);

export const billingCycleEnum = pgEnum("billing_cycle", [
  "monthly",
  "weekly",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank",
  "mobile_money",
  "online",
]);

export const servicePlans = pgTable("service_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  speed: text("speed").notNull(),
  price: integer("price").notNull(),
  validity: text("validity").notNull().default("30 days"),
});

export const servicePlansRelations = relations(servicePlans, ({ many }) => ({
  customers: many(customers),
}));

export const customers = pgTable("customers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contact: text("contact").notNull(),
  cnicNumber: text("cnic_number"),
  email: text("email"),
  status: accountStatusEnum("status").notNull().default("register"),
  planId: integer("plan_id").references(() => servicePlans.id),
  connectionDate: text("connection_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ one, many }) => ({
  plan: one(servicePlans, {
    fields: [customers.planId],
    references: [servicePlans.id],
  }),
  installation: one(installations),
  notes: many(customerNotes),
  invoices: many(invoices),
  payments: many(payments),
}));

export const installations = pgTable("installations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull()
    .unique(),
  connectionType: connectionTypeEnum("connection_type")
    .notNull()
    .default("new_connection"),
  router: text("router"),
  onu: text("onu"),
  macAddress: text("mac_address"),
  port: text("port"),
  installedAt: timestamp("installed_at").defaultNow(),
});

export const installationsRelations = relations(installations, ({ one }) => ({
  customer: one(customers, {
    fields: [installations.customerId],
    references: [customers.id],
  }),
}));

export const customerNotes = pgTable("customer_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(customers, {
    fields: [customerNotes.customerId],
    references: [customers.id],
  }),
}));

export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  planId: integer("plan_id").references(() => servicePlans.id),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  baseAmount: integer("base_amount").notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  penaltyAmount: integer("penalty_amount").notNull().default(0),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: invoiceStatusEnum("status").notNull().default("issued"),
  isProRata: boolean("is_pro_rata").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  plan: one(servicePlans, {
    fields: [invoices.planId],
    references: [servicePlans.id],
  }),
  payments: many(payments),
}));

export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id")
    .references(() => invoices.id)
    .notNull(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  amount: integer("amount").notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  collectedBy: text("collected_by").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  whatsappSent: boolean("whatsapp_sent").notNull().default(false),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}));

// ======= CONNECTION REQUESTS MODULE =======

export const connectionRequestStatusEnum = pgEnum("connection_request_status", [
  "pending",
  "assigned_engineer",
  "assigned_fieldworker",
  "in_progress",
  "completed",
  "cancelled",
]);

export const connectionRequests = pgTable("connection_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  customerWhatsapp: text("customer_whatsapp"),
  customerAddress: text("customer_address").notNull(),
  customerCnic: text("customer_cnic"),
  planId: integer("plan_id").references(() => servicePlans.id),
  customerId: integer("customer_id").references(() => customers.id),
  status: connectionRequestStatusEnum("status").notNull().default("pending"),
  engineerId: integer("engineer_id").references(() => employees.id),
  fieldWorkerId: integer("field_worker_id").references(() => employees.id),
  modemOwnership: text("modem_ownership").default("company"),
  notes: text("notes"),
  registeredBy: text("registered_by"),
  whatsappSentCustomer: boolean("whatsapp_sent_customer").notNull().default(false),
  whatsappSentEngineer: boolean("whatsapp_sent_engineer").notNull().default(false),
  whatsappSentFieldWorker: boolean("whatsapp_sent_fieldworker").notNull().default(false),
  feedbackToken: text("feedback_token"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connectionFeedback = pgTable("connection_feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  connectionRequestId: integer("connection_request_id")
    .references(() => connectionRequests.id)
    .notNull()
    .unique(),
  fieldWorkerRating: integer("field_worker_rating").notNull(),
  serviceRating: integer("service_rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const connectionFeedbackRelations = relations(connectionFeedback, ({ one }) => ({
  connectionRequest: one(connectionRequests, {
    fields: [connectionFeedback.connectionRequestId],
    references: [connectionRequests.id],
  }),
}));

export const insertConnectionFeedbackSchema = createInsertSchema(connectionFeedback).omit({
  id: true,
  createdAt: true,
});

export type ConnectionFeedback = typeof connectionFeedback.$inferSelect;
export type InsertConnectionFeedback = z.infer<typeof insertConnectionFeedbackSchema>;

export const connectionRequestsRelations = relations(connectionRequests, ({ one }) => ({
  plan: one(servicePlans, {
    fields: [connectionRequests.planId],
    references: [servicePlans.id],
  }),
  customer: one(customers, {
    fields: [connectionRequests.customerId],
    references: [customers.id],
  }),
  engineer: one(employees, {
    fields: [connectionRequests.engineerId],
    references: [employees.id],
    relationName: "engineerRequests",
  }),
  fieldWorker: one(employees, {
    fields: [connectionRequests.fieldWorkerId],
    references: [employees.id],
    relationName: "fieldWorkerRequests",
  }),
}));

export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  whatsappSentCustomer: true,
  whatsappSentEngineer: true,
  whatsappSentFieldWorker: true,
  feedbackToken: true,
});

export type ConnectionRequest = typeof connectionRequests.$inferSelect;
export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;

export type ConnectionRequestWithRelations = ConnectionRequest & {
  plan: ServicePlan | null;
  customer: Customer | null;
  engineer: Employee | null;
  fieldWorker: Employee | null;
};

// Insert schemas
export const insertServicePlanSchema = createInsertSchema(servicePlans).omit({
  id: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertInstallationSchema = createInsertSchema(installations).omit({
  id: true,
  installedAt: true,
});

export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  receivedAt: true,
});

// Types
export type ServicePlan = typeof servicePlans.$inferSelect;
export type InsertServicePlan = z.infer<typeof insertServicePlanSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Installation = typeof installations.$inferSelect;
export type InsertInstallation = z.infer<typeof insertInstallationSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type CustomerWithRelations = Customer & {
  plan: ServicePlan | null;
  installation: Installation | null;
  notes: CustomerNote[];
};

export type InvoiceWithRelations = Invoice & {
  customer: Customer;
  plan: ServicePlan | null;
  payments: Payment[];
};

// ======= ACCOUNTING MODULE =======

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const journalSourceEnum = pgEnum("journal_source", [
  "invoice",
  "payment",
  "expense",
  "adjustment",
  "opening_balance",
  "manual",
  "daily_entry",
]);

export const vendorBillStatusEnum = pgEnum("vendor_bill_status", [
  "draft",
  "received",
  "paid",
  "partial",
  "overdue",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "bandwidth",
  "infrastructure",
  "salary",
  "commission",
  "maintenance",
  "office",
  "utilities",
  "other",
]);

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  parentId: integer("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
});

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
    relationName: "parent_child",
  }),
  children: many(chartOfAccounts, { relationName: "parent_child" }),
  journalLines: many(journalLines),
}));

export const journalEntries = pgTable("journal_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entryDate: text("entry_date").notNull(),
  memo: text("memo").notNull(),
  sourceType: journalSourceEnum("source_type").notNull().default("manual"),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalLines),
}));

export const journalLines = pgTable("journal_lines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entryId: integer("entry_id")
    .references(() => journalEntries.id)
    .notNull(),
  accountId: integer("account_id")
    .references(() => chartOfAccounts.id)
    .notNull(),
  debit: integer("debit").notNull().default(0),
  credit: integer("credit").notNull().default(0),
  customerId: integer("customer_id").references(() => customers.id),
  vendorId: integer("vendor_id"),
  description: text("description"),
});

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalLines.entryId],
    references: [journalEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [journalLines.accountId],
    references: [chartOfAccounts.id],
  }),
  customer: one(customers, {
    fields: [journalLines.customerId],
    references: [customers.id],
  }),
}));

export const vendors = pgTable("vendors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  contact: text("contact"),
  address: text("address"),
  taxId: text("tax_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorsRelations = relations(vendors, ({ many }) => ({
  bills: many(vendorBills),
}));

export const vendorBills = pgTable("vendor_bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(),
  billNumber: text("bill_number"),
  billDate: text("bill_date").notNull(),
  dueDate: text("due_date").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: vendorBillStatusEnum("status").notNull().default("received"),
  description: text("description"),
  category: expenseCategoryEnum("category").notNull().default("other"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorBillsRelations = relations(vendorBills, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorBills.vendorId],
    references: [vendors.id],
  }),
}));

export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  expenseDate: text("expense_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
  reference: text("reference"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  vendor: one(vendors, {
    fields: [expenses.vendorId],
    references: [vendors.id],
  }),
}));

export const openingBalances = pgTable("opening_balances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull()
    .unique(),
  amount: integer("amount").notNull(),
  asOfDate: text("as_of_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const openingBalancesRelations = relations(openingBalances, ({ one }) => ({
  customer: one(customers, {
    fields: [openingBalances.customerId],
    references: [customers.id],
  }),
}));

// ======= ACCOUNTING INSERT SCHEMAS =======

export const insertChartOfAccountSchema = createInsertSchema(chartOfAccounts).omit({
  id: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertJournalLineSchema = createInsertSchema(journalLines).omit({
  id: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
});

export const insertVendorBillSchema = createInsertSchema(vendorBills).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertOpeningBalanceSchema = createInsertSchema(openingBalances).omit({
  id: true,
  createdAt: true,
});

// ======= ACCOUNTING TYPES =======

export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type InsertChartOfAccount = z.infer<typeof insertChartOfAccountSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalLine = typeof journalLines.$inferSelect;
export type InsertJournalLine = z.infer<typeof insertJournalLineSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type VendorBill = typeof vendorBills.$inferSelect;
export type InsertVendorBill = z.infer<typeof insertVendorBillSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type OpeningBalance = typeof openingBalances.$inferSelect;
export type InsertOpeningBalance = z.infer<typeof insertOpeningBalanceSchema>;

export type JournalEntryWithLines = JournalEntry & {
  lines: (JournalLine & { account: ChartOfAccount })[];
};

export type VendorBillWithVendor = VendorBill & {
  vendor: Vendor;
};

export type ExpenseWithVendor = Expense & {
  vendor: Vendor | null;
};

// ======= COMPLAINT MANAGEMENT MODULE =======

export const complaintTypeEnum = pgEnum("complaint_type", [
  "no_internet",
  "slow_internet",
  "red_light",
  "wire_damage",
  "modem_dead",
  "modem_replacement",
  "other",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "assigned",
  "in_progress",
  "completed",
  "closed",
]);

// ======= AGENTS =======

export const agents = pgTable("agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// ======= COMPLAINTS =======

export const complaints = pgTable("complaints", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  complaintType: complaintTypeEnum("complaint_type").notNull(),
  description: text("description"),
  status: complaintStatusEnum("status").notNull().default("open"),
  assignedTo: text("assigned_to"),
  agentId: integer("agent_id").references(() => agents.id),
  priority: text("priority").notNull().default("normal"),
  whatsappSentOpen: boolean("whatsapp_sent_open").notNull().default(false),
  whatsappSentComplete: boolean("whatsapp_sent_complete").notNull().default(false),
  feedbackToken: text("feedback_token"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complaintsRelations = relations(complaints, ({ one, many }) => ({
  customer: one(customers, {
    fields: [complaints.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [complaints.agentId],
    references: [agents.id],
  }),
  feedback: one(complaintFeedback),
}));

export const complaintFeedback = pgTable("complaint_feedback", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  complaintId: integer("complaint_id")
    .references(() => complaints.id)
    .notNull()
    .unique(),
  agentRating: integer("agent_rating").notNull(),
  serviceRating: integer("service_rating").notNull(),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complaintFeedbackRelations = relations(complaintFeedback, ({ one }) => ({
  complaint: one(complaints, {
    fields: [complaintFeedback.complaintId],
    references: [complaints.id],
  }),
}));

// ======= COMPLAINT INSERT SCHEMAS =======

export const insertComplaintSchema = createInsertSchema(complaints).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  agentId: true,
  feedbackToken: true,
});

export const insertComplaintFeedbackSchema = createInsertSchema(complaintFeedback).omit({
  id: true,
  createdAt: true,
});

// ======= COMPLAINT TYPES =======

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type ComplaintFeedback = typeof complaintFeedback.$inferSelect;
export type InsertComplaintFeedback = z.infer<typeof insertComplaintFeedbackSchema>;

export type ComplaintWithRelations = Complaint & {
  customer: Customer;
  agent: Agent | null;
  feedback: ComplaintFeedback | null;
};

export const notificationTypeEnum = pgEnum("notification_type", [
  "payment_receipt",
  "complaint_registered",
  "complaint_completed",
  "complaint_assigned",
  "connection_registered",
  "connection_assigned_engineer",
  "connection_assigned_fieldworker",
  "connection_completed",
]);

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  type: notificationTypeEnum("type").notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "management",
  "accounts",
  "hr",
  "inventory",
  "complaints",
  "billing",
  "viewer",
]);

export const moduleEnum = [
  "dashboard",
  "customers",
  "billing",
  "pos",
  "complaints",
  "agents",
  "plans",
  "settings",
  "employees",
  "departments",
  "designations",
  "attendance",
  "leave",
  "payroll",
  "performance",
  "recruitment",
  "training",
  "assets",
  "announcements",
  "policies",
  "audit_logs",
  "system_config",
  "inventory",
  "accounts",
  "user_management",
] as const;

export type ModuleName = (typeof moduleEnum)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull().default(""),
  role: userRoleEnum("role").notNull().default("viewer"),
  allowedModules: text("allowed_modules").array().notNull().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  allowedModules: true,
  isActive: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ======= EMPLOYEE MANAGEMENT SYSTEM =======

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "on_leave",
  "suspended",
  "terminated",
  "resigned",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "intern",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);


export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
  "holiday",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
  "casual",
  "sick",
  "earned",
  "unpaid",
  "maternity",
  "paternity",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const payrollStatusEnum = pgEnum("payroll_status", [
  "draft",
  "processed",
  "paid",
]);

export const performanceRatingEnum = pgEnum("performance_rating", [
  "outstanding",
  "exceeds_expectations",
  "meets_expectations",
  "needs_improvement",
  "unsatisfactory",
]);

export const recruitmentStatusEnum = pgEnum("recruitment_status", [
  "open",
  "screening",
  "interviewing",
  "offered",
  "hired",
  "closed",
]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "applied",
  "screening",
  "interview",
  "offered",
  "hired",
  "rejected",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "available",
  "assigned",
  "maintenance",
  "retired",
]);

export const trainingStatusEnum = pgEnum("training_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// ======= DEPARTMENTS =======

export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// ======= DESIGNATIONS =======

export const designations = pgTable("designations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull().unique(),
  description: text("description"),
  departmentId: integer("department_id").references(() => departments.id),
  level: integer("level").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDesignationSchema = createInsertSchema(designations).omit({
  id: true,
  createdAt: true,
});

export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;

// ======= EMPLOYEES =======

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeCode: text("employee_code").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fatherName: text("father_name"),
  gender: genderEnum("gender").notNull().default("male"),
  dateOfBirth: text("date_of_birth"),
  cnicNumber: text("cnic_number"),
  contact: text("contact").notNull(),
  whatsappNumber: text("whatsapp_number"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  status: employeeStatusEnum("status").notNull().default("active"),
  employmentType: employmentTypeEnum("employment_type").notNull().default("full_time"),
  departmentId: integer("department_id").references(() => departments.id),
  designationId: integer("designation_id").references(() => designations.id),
  joiningDate: text("joining_date").notNull(),
  endDate: text("end_date"),
  reportingTo: integer("reporting_to"),
  basicSalary: integer("basic_salary").notNull().default(0),
  userRole: userRoleEnum("user_role").notNull().default("viewer"),
  profileImage: text("profile_image"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  agentId: integer("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeesRelations = relations(employees, ({ one }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  designation: one(designations, {
    fields: [employees.designationId],
    references: [designations.id],
  }),
  reportingManager: one(employees, {
    fields: [employees.reportingTo],
    references: [employees.id],
    relationName: "reporting",
  }),
  agent: one(agents, {
    fields: [employees.agentId],
    references: [agents.id],
  }),
}));

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type EmployeeWithRelations = Employee & {
  department: Department | null;
  designation: Designation | null;
};

// ======= EMERGENCY CONTACTS =======

export const emergencyContacts = pgTable("emergency_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  contact: text("contact").notNull(),
  address: text("address"),
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
});

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;

// ======= EMPLOYEE DOCUMENTS =======

export const employeeDocuments = pgTable("employee_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;

// ======= ATTENDANCE =======

export const attendance = pgTable("attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  status: attendanceStatusEnum("status").notNull().default("present"),
  hoursWorked: numeric("hours_worked"),
  lateMinutes: integer("late_minutes").default(0),
  fineAmount: integer("fine_amount").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  overtimeReward: integer("overtime_reward").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
}));

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type AttendanceWithEmployee = Attendance & {
  employee: Employee;
};

// ======= LEAVE TYPES CONFIG =======

export const leaveTypeConfigs = pgTable("leave_type_configs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: leaveTypeEnum("type").notNull(),
  defaultDays: integer("default_days").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertLeaveTypeConfigSchema = createInsertSchema(leaveTypeConfigs).omit({
  id: true,
});

export type LeaveTypeConfig = typeof leaveTypeConfigs.$inferSelect;
export type InsertLeaveTypeConfig = z.infer<typeof insertLeaveTypeConfigSchema>;

// ======= LEAVE REQUESTS =======

export const leaveRequests = pgTable("leave_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  approvedBy: integer("approved_by").references(() => employees.id),
  approverNotes: text("approver_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
    relationName: "leave_employee",
  }),
  approver: one(employees, {
    fields: [leaveRequests.approvedBy],
    references: [employees.id],
    relationName: "leave_approver",
  }),
}));

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approverNotes: true,
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export type LeaveRequestWithEmployee = LeaveRequest & {
  employee: Employee;
};

// ======= LEAVE BALANCES =======

export const leaveBalances = pgTable("leave_balances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  year: integer("year").notNull(),
  totalDays: integer("total_days").notNull().default(0),
  usedDays: integer("used_days").notNull().default(0),
  remainingDays: integer("remaining_days").notNull().default(0),
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({
  id: true,
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;

// ======= PAYROLL =======

export const salaryStructures = pgTable("salary_structures", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull().unique(),
  basicSalary: integer("basic_salary").notNull(),
  houseAllowance: integer("house_allowance").notNull().default(0),
  transportAllowance: integer("transport_allowance").notNull().default(0),
  medicalAllowance: integer("medical_allowance").notNull().default(0),
  otherAllowances: integer("other_allowances").notNull().default(0),
  taxDeduction: integer("tax_deduction").notNull().default(0),
  pfDeduction: integer("pf_deduction").notNull().default(0),
  otherDeductions: integer("other_deductions").notNull().default(0),
  grossSalary: integer("gross_salary").notNull(),
  netSalary: integer("net_salary").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSalaryStructureSchema = createInsertSchema(salaryStructures).omit({
  id: true,
  createdAt: true,
});

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalaryStructure = z.infer<typeof insertSalaryStructureSchema>;

export const payrollRuns = pgTable("payroll_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  month: text("month").notNull(),
  year: integer("year").notNull(),
  status: payrollStatusEnum("status").notNull().default("draft"),
  totalAmount: integer("total_amount").notNull().default(0),
  employeeCount: integer("employee_count").notNull().default(0),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;

export const payslips = pgTable("payslips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payrollRunId: integer("payroll_run_id").references(() => payrollRuns.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  basicSalary: integer("basic_salary").notNull(),
  totalAllowances: integer("total_allowances").notNull().default(0),
  totalDeductions: integer("total_deductions").notNull().default(0),
  grossSalary: integer("gross_salary").notNull(),
  netSalary: integer("net_salary").notNull(),
  workingDays: integer("working_days").notNull().default(0),
  presentDays: integer("present_days").notNull().default(0),
  absentDays: integer("absent_days").notNull().default(0),
  leaveDays: integer("leave_days").notNull().default(0),
  status: payrollStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payslipsRelations = relations(payslips, ({ one }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  payrollRun: one(payrollRuns, {
    fields: [payslips.payrollRunId],
    references: [payrollRuns.id],
  }),
}));

export const insertPayslipSchema = createInsertSchema(payslips).omit({
  id: true,
  createdAt: true,
});

export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;

export type PayslipWithEmployee = Payslip & {
  employee: Employee;
};

// ======= PERFORMANCE MANAGEMENT =======

export const performanceCycles = pgTable("performance_cycles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPerformanceCycleSchema = createInsertSchema(performanceCycles).omit({
  id: true,
  createdAt: true,
});

export type PerformanceCycle = typeof performanceCycles.$inferSelect;
export type InsertPerformanceCycle = z.infer<typeof insertPerformanceCycleSchema>;

export const performanceReviews = pgTable("performance_reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cycleId: integer("cycle_id").references(() => performanceCycles.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  reviewerId: integer("reviewer_id").references(() => employees.id),
  goals: text("goals"),
  selfAssessment: text("self_assessment"),
  managerComments: text("manager_comments"),
  rating: performanceRatingEnum("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  employee: one(employees, {
    fields: [performanceReviews.employeeId],
    references: [employees.id],
    relationName: "review_employee",
  }),
  reviewer: one(employees, {
    fields: [performanceReviews.reviewerId],
    references: [employees.id],
    relationName: "review_reviewer",
  }),
  cycle: one(performanceCycles, {
    fields: [performanceReviews.cycleId],
    references: [performanceCycles.id],
  }),
}));

export const insertPerformanceReviewSchema = createInsertSchema(performanceReviews).omit({
  id: true,
  createdAt: true,
});

export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = z.infer<typeof insertPerformanceReviewSchema>;

export type PerformanceReviewWithRelations = PerformanceReview & {
  employee: Employee;
  cycle: PerformanceCycle;
};

// ======= RECRUITMENT =======

export const jobOpenings = pgTable("job_openings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  designationId: integer("designation_id").references(() => designations.id),
  description: text("description"),
  requirements: text("requirements"),
  positions: integer("positions").notNull().default(1),
  status: recruitmentStatusEnum("status").notNull().default("open"),
  postedDate: text("posted_date").notNull(),
  closingDate: text("closing_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobOpeningSchema = createInsertSchema(jobOpenings).omit({
  id: true,
  createdAt: true,
});

export type JobOpening = typeof jobOpenings.$inferSelect;
export type InsertJobOpening = z.infer<typeof insertJobOpeningSchema>;

export const candidates = pgTable("candidates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobOpeningId: integer("job_opening_id").references(() => jobOpenings.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  contact: text("contact").notNull(),
  resume: text("resume"),
  status: candidateStatusEnum("status").notNull().default("applied"),
  interviewDate: text("interview_date"),
  interviewNotes: text("interview_notes"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidatesRelations = relations(candidates, ({ one }) => ({
  jobOpening: one(jobOpenings, {
    fields: [candidates.jobOpeningId],
    references: [jobOpenings.id],
  }),
}));

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

// ======= TRAINING =======

export const trainings = pgTable("trainings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  trainer: text("trainer"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: trainingStatusEnum("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrainingSchema = createInsertSchema(trainings).omit({
  id: true,
  createdAt: true,
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = z.infer<typeof insertTrainingSchema>;

export const trainingEnrollments = pgTable("training_enrollments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  trainingId: integer("training_id").references(() => trainings.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  status: trainingStatusEnum("status").notNull().default("scheduled"),
  completionDate: text("completion_date"),
  score: integer("score"),
  feedback: text("feedback"),
});

export const trainingEnrollmentsRelations = relations(trainingEnrollments, ({ one }) => ({
  training: one(trainings, {
    fields: [trainingEnrollments.trainingId],
    references: [trainings.id],
  }),
  employee: one(employees, {
    fields: [trainingEnrollments.employeeId],
    references: [employees.id],
  }),
}));

export const insertTrainingEnrollmentSchema = createInsertSchema(trainingEnrollments).omit({
  id: true,
});

export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export type InsertTrainingEnrollment = z.infer<typeof insertTrainingEnrollmentSchema>;

// ======= ASSETS =======

export const assets = pgTable("assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assetCode: text("asset_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  purchaseDate: text("purchase_date"),
  purchaseCost: integer("purchase_cost"),
  status: assetStatusEnum("status").notNull().default("available"),
  assignedTo: integer("assigned_to").references(() => employees.id),
  assignedDate: text("assigned_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one }) => ({
  employee: one(employees, {
    fields: [assets.assignedTo],
    references: [employees.id],
  }),
}));

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type AssetWithEmployee = Asset & {
  employee: Employee | null;
};

// ======= ANNOUNCEMENTS =======

export const announcements = pgTable("announcements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  publishedBy: integer("published_by").references(() => employees.id),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// ======= POLICIES =======

export const policies = pgTable("policies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  version: text("version").notNull().default("1.0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export const policyAcknowledgements = pgTable("policy_acknowledgements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  policyId: integer("policy_id").references(() => policies.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
});

export const insertPolicyAcknowledgementSchema = createInsertSchema(policyAcknowledgements).omit({
  id: true,
  acknowledgedAt: true,
});

export type PolicyAcknowledgement = typeof policyAcknowledgements.$inferSelect;
export type InsertPolicyAcknowledgement = z.infer<typeof insertPolicyAcknowledgementSchema>;

// ======= HOLIDAY CALENDAR =======

export const holidays = pgTable("holidays", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  isOptional: boolean("is_optional").notNull().default(false),
  year: integer("year").notNull(),
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
});

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

// ======= WORKING HOURS CONFIG =======

export const workingHoursConfig = pgTable("working_hours_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("17:00"),
  isWorkingDay: boolean("is_working_day").notNull().default(true),
});

export const insertWorkingHoursConfigSchema = createInsertSchema(workingHoursConfig).omit({
  id: true,
});

export type WorkingHoursConfig = typeof workingHoursConfig.$inferSelect;
export type InsertWorkingHoursConfig = z.infer<typeof insertWorkingHoursConfigSchema>;

// ======= AUDIT LOGS =======

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  performedBy: text("performed_by"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// ======= INVENTORY MANAGEMENT SYSTEM =======

export const itemTypeEnum = pgEnum("item_type", [
  "network_device",
  "fiber",
  "consumable",
  "accessory",
  "tool",
]);

export const inventoryAssetStatusEnum = pgEnum("inv_asset_status", [
  "in_stock",
  "assigned",
  "in_repair",
  "scrapped",
  "returned",
  "reserved",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "receipt",
  "issue",
  "transfer",
  "return",
  "adjust",
  "scrap",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "released",
  "fulfilled",
  "expired",
]);

export const poStatusEnum = pgEnum("po_status", [
  "draft",
  "approved",
  "received",
  "partial",
  "closed",
  "cancelled",
]);

export const rmaStatusEnum = pgEnum("rma_status", [
  "pending",
  "in_repair",
  "replaced",
  "scrapped",
  "closed",
]);

export const stockAuditStatusEnum = pgEnum("stock_audit_status", [
  "planned",
  "in_progress",
  "completed",
  "approved",
]);

// ======= INVENTORY ITEMS (Catalog) =======

export const inventoryItems = pgTable("inventory_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  sku: text("sku"),
  type: itemTypeEnum("type").notNull().default("network_device"),
  brand: text("brand"),
  model: text("model"),
  unit: text("unit").notNull().default("pcs"),
  description: text("description"),
  hasSerialNumber: boolean("has_serial_number").notNull().default(false),
  hasMacAddress: boolean("has_mac_address").notNull().default(false),
  minStockLevel: integer("min_stock_level").default(0),
  maxStockLevel: integer("max_stock_level").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

// ======= INVENTORY ASSETS (Individual Serialized Items) =======

export const inventoryAssets = pgTable("inventory_assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  serialNumber: text("serial_number"),
  macAddress: text("mac_address"),
  assetTag: text("asset_tag"),
  status: inventoryAssetStatusEnum("status").notNull().default("in_stock"),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  purchaseDate: text("purchase_date"),
  purchaseCost: numeric("purchase_cost"),
  warrantyEnd: text("warranty_end"),
  vendorId: integer("vendor_id").references(() => vendors.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryAssetSchema = createInsertSchema(inventoryAssets).omit({
  id: true,
  createdAt: true,
});

export type InventoryAsset = typeof inventoryAssets.$inferSelect;
export type InsertInventoryAsset = z.infer<typeof insertInventoryAssetSchema>;

// ======= WAREHOUSES =======

export const warehouses = pgTable("warehouses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  location: text("location"),
  type: text("type").notNull().default("central"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

// ======= STOCK LEVELS =======

export const stockLevels = pgTable("stock_levels", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStockLevelSchema = createInsertSchema(stockLevels).omit({
  id: true,
  updatedAt: true,
});

export type StockLevel = typeof stockLevels.$inferSelect;
export type InsertStockLevel = z.infer<typeof insertStockLevelSchema>;

// ======= INVENTORY MOVEMENTS =======

export const inventoryMovements = pgTable("inventory_movements", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  assetId: integer("asset_id").references(() => inventoryAssets.id),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  warehouseFromId: integer("warehouse_from_id").references(() => warehouses.id),
  warehouseToId: integer("warehouse_to_id").references(() => warehouses.id),
  reference: text("reference"),
  notes: text("notes"),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
  id: true,
  createdAt: true,
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;

// ======= INVENTORY RESERVATIONS =======

export const inventoryReservations = pgTable("inventory_reservations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  customerId: integer("customer_id").references(() => customers.id),
  reference: text("reference"),
  status: reservationStatusEnum("status").notNull().default("active"),
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryReservationSchema = createInsertSchema(inventoryReservations).omit({
  id: true,
  createdAt: true,
});

export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type InsertInventoryReservation = z.infer<typeof insertInventoryReservationSchema>;

// ======= EQUIPMENT ASSIGNMENTS =======

export const equipmentAssignments = pgTable("equipment_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assetId: integer("asset_id").references(() => inventoryAssets.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  installationId: integer("installation_id").references(() => installations.id),
  assignedBy: text("assigned_by"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  returnedAt: timestamp("returned_at"),
  returnCondition: text("return_condition"),
  status: text("status").notNull().default("assigned"),
  notes: text("notes"),
});

export const insertEquipmentAssignmentSchema = createInsertSchema(equipmentAssignments).omit({
  id: true,
  assignedAt: true,
});

export type EquipmentAssignment = typeof equipmentAssignments.$inferSelect;
export type InsertEquipmentAssignment = z.infer<typeof insertEquipmentAssignmentSchema>;

// ======= PURCHASE ORDERS =======

export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  poNumber: text("po_number").notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  status: poStatusEnum("status").notNull().default("draft"),
  orderDate: text("order_date").notNull(),
  expectedDate: text("expected_date"),
  totalAmount: numeric("total_amount"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

// ======= PURCHASE ORDER LINES =======

export const purchaseOrderLines = pgTable("purchase_order_lines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost").notNull(),
  totalCost: numeric("total_cost"),
  receivedQuantity: integer("received_quantity").notNull().default(0),
});

export const insertPurchaseOrderLineSchema = createInsertSchema(purchaseOrderLines).omit({
  id: true,
});

export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;
export type InsertPurchaseOrderLine = z.infer<typeof insertPurchaseOrderLineSchema>;

// ======= GOODS RECEIPTS (GRN) =======

export const goodsReceipts = pgTable("goods_receipts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  grnNumber: text("grn_number").notNull(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  receivedDate: text("received_date").notNull(),
  receivedBy: text("received_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoodsReceiptSchema = createInsertSchema(goodsReceipts).omit({
  id: true,
  createdAt: true,
});

export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type InsertGoodsReceipt = z.infer<typeof insertGoodsReceiptSchema>;

// ======= GOODS RECEIPT LINES =======

export const goodsReceiptLines = pgTable("goods_receipt_lines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceipts.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  serialNumbers: text("serial_numbers"),
  notes: text("notes"),
});

export const insertGoodsReceiptLineSchema = createInsertSchema(goodsReceiptLines).omit({
  id: true,
});

export type GoodsReceiptLine = typeof goodsReceiptLines.$inferSelect;
export type InsertGoodsReceiptLine = z.infer<typeof insertGoodsReceiptLineSchema>;

// ======= RMA REQUESTS =======

export const rmaRequests = pgTable("rma_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  rmaNumber: text("rma_number").notNull(),
  assetId: integer("asset_id").references(() => inventoryAssets.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id),
  status: rmaStatusEnum("status").notNull().default("pending"),
  issueDescription: text("issue_description").notNull(),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertRmaRequestSchema = createInsertSchema(rmaRequests).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type RmaRequest = typeof rmaRequests.$inferSelect;
export type InsertRmaRequest = z.infer<typeof insertRmaRequestSchema>;

// ======= STOCK AUDITS =======

export const stockAudits = pgTable("stock_audits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id).notNull(),
  auditDate: text("audit_date").notNull(),
  status: stockAuditStatusEnum("stock_audit_status").notNull().default("planned"),
  conductedBy: text("conducted_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockAuditSchema = createInsertSchema(stockAudits).omit({
  id: true,
  createdAt: true,
});

export type StockAudit = typeof stockAudits.$inferSelect;
export type InsertStockAudit = z.infer<typeof insertStockAuditSchema>;

// ======= STOCK AUDIT LINES =======

export const stockAuditLines = pgTable("stock_audit_lines", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  auditId: integer("audit_id").references(() => stockAudits.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  systemQuantity: integer("system_quantity").notNull().default(0),
  countedQuantity: integer("counted_quantity").notNull().default(0),
  variance: integer("variance").notNull().default(0),
  notes: text("notes"),
});

export const insertStockAuditLineSchema = createInsertSchema(stockAuditLines).omit({
  id: true,
});

export type StockAuditLine = typeof stockAuditLines.$inferSelect;
export type InsertStockAuditLine = z.infer<typeof insertStockAuditLineSchema>;

// ======= DAILY INCOME & EXPENSE ENTRIES =======

export const dailyEntryTypeEnum = pgEnum("daily_entry_type", [
  "income",
  "expense",
]);

export const dailyExpenseCategoryEnum = pgEnum("daily_expense_category", [
  "fuel",
  "company_online",
  "salaries_advances",
  "bike_maintenance",
  "stock_purchase",
  "office_utilities",
  "utility_bills",
  "recoveries_losses",
  "office_rent",
  "repair_maintenance",
  "other",
]);

export const dailyIncomeCategoryEnum = pgEnum("daily_income_category", [
  "renewal",
  "new_connection",
  "extra_income",
]);

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  fuel: "Fuel",
  company_online: "Company Online",
  salaries_advances: "Salaries Advances",
  bike_maintenance: "Bike Maintenance",
  stock_purchase: "Stock Purchase",
  office_utilities: "Office Utilities",
  utility_bills: "Utility Bills",
  recoveries_losses: "Recoveries Losses",
  office_rent: "Office Rent",
  repair_maintenance: "Repair & Maintenance",
  other: "Other",
};

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  renewal: "Total Renewal",
  new_connection: "Total New Connection",
  extra_income: "Extra Income",
};

export const dailyEntries = pgTable("daily_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  type: dailyEntryTypeEnum("type").notNull(),
  category: text("category"),
  customerId: integer("customer_id").references(() => customers.id),
  userId: text("user_id"),
  amount: integer("amount").notNull().default(0),
  description: text("description"),
  entryBy: text("entry_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyEntrySchema = createInsertSchema(dailyEntries).omit({ id: true, createdAt: true });
export type InsertDailyEntry = z.infer<typeof insertDailyEntrySchema>;
export type DailyEntry = typeof dailyEntries.$inferSelect;

export type DailyEntryWithRelations = DailyEntry & {
  customer?: { id: number; name: string } | null;
};

// ======= DAILY INCOME & EXPENSE ENTRY (SEPARATE MODULE) =======

export const dailyIncomeExpenseEntries = pgTable("daily_income_expense_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  type: dailyEntryTypeEnum("type").notNull(),
  category: text("category"),
  amount: integer("amount").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyIncomeExpenseEntry = typeof dailyIncomeExpenseEntries.$inferSelect;

export const customCategories = pgTable("custom_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  type: dailyEntryTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("custom_categories_key_type_idx").on(table.key, table.type),
]);

export type CustomCategory = typeof customCategories.$inferSelect;

// ======= MONTH CLOSING SHEET =======

export const closingSideEntrySectionEnum = pgEnum("closing_side_entry_section", [
  "recovery",
  "extra_amount",
]);

export const monthClosings = pgTable("month_closings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  month: text("month").notNull().unique(),
  openingBalance: integer("opening_balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonthClosingSchema = createInsertSchema(monthClosings).omit({ id: true, createdAt: true });
export type InsertMonthClosing = z.infer<typeof insertMonthClosingSchema>;
export type MonthClosing = typeof monthClosings.$inferSelect;

export const monthClosingSideEntries = pgTable("month_closing_side_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  month: text("month").notNull(),
  section: closingSideEntrySectionEnum("section").notNull(),
  name: text("name").notNull(),
  purpose: text("purpose"),
  amount: integer("amount").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMonthClosingSideEntrySchema = createInsertSchema(monthClosingSideEntries).omit({ id: true, createdAt: true });
export type InsertMonthClosingSideEntry = z.infer<typeof insertMonthClosingSideEntrySchema>;
export type MonthClosingSideEntry = typeof monthClosingSideEntries.$inferSelect;

// ======= WITH-RELATIONS TYPES FOR INVENTORY =======

export type InventoryAssetWithRelations = InventoryAsset & {
  item?: InventoryItem;
  warehouse?: Warehouse;
};

export type StockLevelWithRelations = StockLevel & {
  item?: InventoryItem;
  warehouse?: Warehouse;
};

export type InventoryMovementWithRelations = InventoryMovement & {
  item?: InventoryItem;
  asset?: InventoryAsset;
  warehouseFrom?: Warehouse;
  warehouseTo?: Warehouse;
};

export type InventoryReservationWithRelations = InventoryReservation & {
  item?: InventoryItem;
  warehouse?: Warehouse;
  customer?: { id: number; name: string };
};

export type EquipmentAssignmentWithRelations = EquipmentAssignment & {
  asset?: InventoryAssetWithRelations;
  customer?: { id: number; name: string };
};

export type PurchaseOrderWithRelations = PurchaseOrder & {
  vendor?: { id: number; name: string };
  lines?: (PurchaseOrderLine & { item?: InventoryItem })[];
};

export type GoodsReceiptWithRelations = GoodsReceipt & {
  vendor?: { id: number; name: string };
  warehouse?: Warehouse;
  purchaseOrder?: PurchaseOrder;
  lines?: (GoodsReceiptLine & { item?: InventoryItem })[];
};

export type RmaRequestWithRelations = RmaRequest & {
  asset?: InventoryAssetWithRelations;
  vendor?: { id: number; name: string };
};

export type StockAuditWithRelations = StockAudit & {
  warehouse?: Warehouse;
  lines?: (StockAuditLine & { item?: InventoryItem })[];
};

// ======= RECEIVABLES / RECOVERY =======

export const receivableStatusEnum = pgEnum("receivable_status", [
  "pending",
  "received",
  "overdue",
  "cancelled",
]);

export const receivables = pgTable("receivables", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  personName: text("person_name").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  expectedDate: text("expected_date").notNull(),
  receivedDate: text("received_date"),
  status: receivableStatusEnum("status").notNull().default("pending"),
  contact: text("contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceivableSchema = createInsertSchema(receivables).omit({ id: true, createdAt: true });
export type InsertReceivable = z.infer<typeof insertReceivableSchema>;
export type Receivable = typeof receivables.$inferSelect;

export const receivablePayments = pgTable("receivable_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  receivableId: integer("receivable_id").notNull().references(() => receivables.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  date: text("date").notNull(),
  method: text("method").default("cash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReceivablePaymentSchema = createInsertSchema(receivablePayments).omit({ id: true, createdAt: true });
export type InsertReceivablePayment = z.infer<typeof insertReceivablePaymentSchema>;
export type ReceivablePayment = typeof receivablePayments.$inferSelect;

export type ReceivableWithPayments = Receivable & {
  payments: ReceivablePayment[];
  totalPaid: number;
  remaining: number;
};

// ======= SALARY ADVANCES =======

export const advanceStatusEnum = pgEnum("advance_status", [
  "pending",
  "approved",
  "deducted",
  "cancelled",
]);

export const salaryAdvances = pgTable("salary_advances", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  amount: integer("amount").notNull(),
  advanceDate: text("advance_date").notNull(),
  month: text("month").notNull(),
  description: text("description"),
  status: advanceStatusEnum("status").notNull().default("approved"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salaryAdvancesRelations = relations(salaryAdvances, ({ one }) => ({
  employee: one(employees, {
    fields: [salaryAdvances.employeeId],
    references: [employees.id],
  }),
}));

export const insertSalaryAdvanceSchema = createInsertSchema(salaryAdvances).omit({
  id: true,
  createdAt: true,
});

export type InsertSalaryAdvance = z.infer<typeof insertSalaryAdvanceSchema>;
export type SalaryAdvance = typeof salaryAdvances.$inferSelect;

export type SalaryAdvanceWithEmployee = SalaryAdvance & {
  employee: { firstName: string; lastName: string; employeeCode: string };
};

export const nbbConnections = pgTable("nbb_connections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerName: text("customer_name").notNull(),
  connectionId: text("connection_id").notNull(),
  status: text("status").notNull().default("unknown"),
  speed: text("speed"),
  macAddress: text("mac_address"),
  onuSerial: text("onu_serial"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNbbConnectionSchema = createInsertSchema(nbbConnections).omit({
  id: true,
  importedAt: true,
  updatedAt: true,
});

export type InsertNbbConnection = z.infer<typeof insertNbbConnectionSchema>;
export type NbbConnection = typeof nbbConnections.$inferSelect;

// ======= STOCK MANAGEMENT =======

export const stockItems = pgTable("stock_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("pcs"),
  quantity: integer("quantity").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockItemSchema = createInsertSchema(stockItems).omit({ id: true, createdAt: true });
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;
export type StockItem = typeof stockItems.$inferSelect;

export const stockIssues = pgTable("stock_issues", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stockItemId: integer("stock_item_id").references(() => stockItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  issuedTo: text("issued_to").notNull(),
  issuedBy: text("issued_by"),
  issueDate: text("issue_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockIssueSchema = createInsertSchema(stockIssues).omit({ id: true, createdAt: true });
export type InsertStockIssue = z.infer<typeof insertStockIssueSchema>;
export type StockIssue = typeof stockIssues.$inferSelect;

export type StockIssueWithItem = StockIssue & {
  stockItem: StockItem | null;
};

export const stockReturns = pgTable("stock_returns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stockItemId: integer("stock_item_id").references(() => stockItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  returnedBy: text("returned_by").notNull(),
  receivedBy: text("received_by").notNull(),
  returnDate: text("return_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockReturnSchema = createInsertSchema(stockReturns).omit({ id: true, createdAt: true });
export type InsertStockReturn = z.infer<typeof insertStockReturnSchema>;
export type StockReturn = typeof stockReturns.$inferSelect;

export type StockReturnWithItem = StockReturn & {
  stockItem: StockItem | null;
};

export const stockDamages = pgTable("stock_damages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  stockItemId: integer("stock_item_id").references(() => stockItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  reportedBy: text("reported_by").notNull(),
  damageDate: text("damage_date").notNull(),
  reason: text("reason"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockDamageSchema = createInsertSchema(stockDamages).omit({ id: true, createdAt: true });
export type InsertStockDamage = z.infer<typeof insertStockDamageSchema>;
export type StockDamage = typeof stockDamages.$inferSelect;

export type StockDamageWithItem = StockDamage & {
  stockItem: StockItem | null;
};

// ======= POS SLIPS MODULE =======

export const posSlips = pgTable("pos_slips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerCnic: text("customer_cnic"),
  planName: text("plan_name"),
  planSpeed: text("plan_speed"),
  planPrice: integer("plan_price").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  netTotal: integer("net_total").notNull().default(0),
  cashReceived: integer("cash_received").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  collectedBy: text("collected_by"),
  collectedByName: text("collected_by_name"),
  slipDate: timestamp("slip_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPosSlipSchema = createInsertSchema(posSlips).omit({ id: true, createdAt: true });
export type InsertPosSlip = z.infer<typeof insertPosSlipSchema>;
export type PosSlip = typeof posSlips.$inferSelect;

export const infraPointTypeEnum = pgEnum("infra_point_type", [
  "geometry_box",
  "fat_box",
  "splice_closure",
  "joint_closure",
  "pole",
  "olt",
  "odb",
  "manhole",
  "other",
]);

export const splitterTypeEnum = pgEnum("splitter_type", [
  "1:2",
  "1:4",
  "1:8",
  "1:16",
  "1:32",
]);

export const networkAreas = pgTable("network_areas", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  totalStreets: integer("total_streets").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const networkAreasRelations = relations(networkAreas, ({ many }) => ({
  infraPoints: many(infraPoints),
}));

export const insertNetworkAreaSchema = createInsertSchema(networkAreas).omit({ id: true, createdAt: true });
export type InsertNetworkArea = z.infer<typeof insertNetworkAreaSchema>;
export type NetworkArea = typeof networkAreas.$inferSelect;

export const infraPoints = pgTable("infra_points", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  areaId: integer("area_id").references(() => networkAreas.id),
  name: text("name").notNull(),
  type: infraPointTypeEnum("type").notNull().default("geometry_box"),
  streetName: text("street_name"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  signalDbm: text("signal_dbm"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  installedAt: text("installed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const infraPointsRelations = relations(infraPoints, ({ one, many }) => ({
  area: one(networkAreas, {
    fields: [infraPoints.areaId],
    references: [networkAreas.id],
  }),
  splitters: many(infraSplitters),
  cablesFrom: many(fiberCables, { relationName: "fromPoint" }),
  cablesTo: many(fiberCables, { relationName: "toPoint" }),
  onus: many(networkOnus),
}));

export const insertInfraPointSchema = createInsertSchema(infraPoints).omit({ id: true, createdAt: true });
export type InsertInfraPoint = z.infer<typeof insertInfraPointSchema>;
export type InfraPoint = typeof infraPoints.$inferSelect;

export const infraSplitters = pgTable("infra_splitters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  pointId: integer("point_id").references(() => infraPoints.id).notNull(),
  type: splitterTypeEnum("type").notNull(),
  totalPorts: integer("total_ports").notNull(),
  usedPorts: integer("used_ports").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const infraSplittersRelations = relations(infraSplitters, ({ one }) => ({
  point: one(infraPoints, {
    fields: [infraSplitters.pointId],
    references: [infraPoints.id],
  }),
}));

export const insertInfraSplitterSchema = createInsertSchema(infraSplitters).omit({ id: true, createdAt: true });
export type InsertInfraSplitter = z.infer<typeof insertInfraSplitterSchema>;
export type InfraSplitter = typeof infraSplitters.$inferSelect;

export const fiberCables = pgTable("fiber_cables", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  fromPointId: integer("from_point_id").references(() => infraPoints.id),
  toPointId: integer("to_point_id").references(() => infraPoints.id),
  cableType: text("cable_type"),
  coreCount: integer("core_count"),
  lengthMeters: integer("length_meters"),
  description: text("description"),
  status: text("status").notNull().default("active"),
  installedAt: text("installed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fiberCablesRelations = relations(fiberCables, ({ one }) => ({
  fromPoint: one(infraPoints, {
    fields: [fiberCables.fromPointId],
    references: [infraPoints.id],
    relationName: "fromPoint",
  }),
  toPoint: one(infraPoints, {
    fields: [fiberCables.toPointId],
    references: [infraPoints.id],
    relationName: "toPoint",
  }),
}));

export const insertFiberCableSchema = createInsertSchema(fiberCables).omit({ id: true, createdAt: true });
export type InsertFiberCable = z.infer<typeof insertFiberCableSchema>;
export type FiberCable = typeof fiberCables.$inferSelect;

export const networkOnus = pgTable("network_onus", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id").references(() => customers.id),
  pointId: integer("point_id").references(() => infraPoints.id),
  serialNumber: text("serial_number"),
  macAddress: text("mac_address"),
  model: text("model"),
  signalDbm: text("signal_dbm"),
  status: text("status").notNull().default("active"),
  installedAt: text("installed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const networkOnusRelations = relations(networkOnus, ({ one }) => ({
  customer: one(customers, {
    fields: [networkOnus.customerId],
    references: [customers.id],
  }),
  point: one(infraPoints, {
    fields: [networkOnus.pointId],
    references: [infraPoints.id],
  }),
}));

export const insertNetworkOnuSchema = createInsertSchema(networkOnus).omit({ id: true, createdAt: true });
export type InsertNetworkOnu = z.infer<typeof insertNetworkOnuSchema>;
export type NetworkOnu = typeof networkOnus.$inferSelect;

export const agentLocations = pgTable("agent_locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  fullName: text("full_name").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  accuracy: numeric("accuracy"),
  complaintId: integer("complaint_id").references(() => complaints.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentLocationSchema = createInsertSchema(agentLocations).omit({ id: true, createdAt: true });
export type InsertAgentLocation = z.infer<typeof insertAgentLocationSchema>;
export type AgentLocation = typeof agentLocations.$inferSelect;

export const complaintImages = pgTable("complaint_images", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  complaintId: integer("complaint_id").references(() => complaints.id).notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  imagePath: text("image_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complaintImagesRelations = relations(complaintImages, ({ one }) => ({
  complaint: one(complaints, {
    fields: [complaintImages.complaintId],
    references: [complaints.id],
  }),
}));

export const insertComplaintImageSchema = createInsertSchema(complaintImages).omit({ id: true, createdAt: true });
export type InsertComplaintImage = z.infer<typeof insertComplaintImageSchema>;
export type ComplaintImage = typeof complaintImages.$inferSelect;

// ======= TO DO LIST MODULE =======

export const todoPriorityEnum = pgEnum("todo_priority", ["low", "medium", "high", "urgent"]);

export const todos = pgTable("todos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  priority: todoPriorityEnum("priority").notNull().default("medium"),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to"),
  createdBy: text("created_by").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTodoSchema = createInsertSchema(todos).omit({ id: true, createdAt: true, completedAt: true });
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Todo = typeof todos.$inferSelect;

// ======= EXPIRY REMINDERS =======

export const expiryReminders = pgTable("expiry_reminders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  planName: text("plan_name"),
  expiryDate: text("expiry_date").notNull(),
  reminderDate: text("reminder_date").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"),
  whatsappSent: boolean("whatsapp_sent").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExpiryReminder = typeof expiryReminders.$inferSelect;

// ======= DUTY TYPES =======

export const dutyTypes = pgTable("duty_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakMinutes: integer("break_minutes").notNull().default(60),
  description: text("description"),
  color: text("color").default("#3b82f6"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDutyTypeSchema = createInsertSchema(dutyTypes).omit({
  id: true,
  createdAt: true,
});

export type DutyType = typeof dutyTypes.$inferSelect;
export type InsertDutyType = z.infer<typeof insertDutyTypeSchema>;

// ======= DUTY ASSIGNMENTS =======

export const dutyAssignments = pgTable("duty_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  dutyTypeId: integer("duty_type_id").references(() => dutyTypes.id).notNull(),
  date: text("date").notNull(),
  skills: text("skills"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dutyAssignmentRelations = relations(dutyAssignments, ({ one }) => ({
  employee: one(employees, {
    fields: [dutyAssignments.employeeId],
    references: [employees.id],
  }),
  dutyType: one(dutyTypes, {
    fields: [dutyAssignments.dutyTypeId],
    references: [dutyTypes.id],
  }),
}));

export const insertDutyAssignmentSchema = createInsertSchema(dutyAssignments).omit({
  id: true,
  createdAt: true,
});

export type DutyAssignment = typeof dutyAssignments.$inferSelect;
export type InsertDutyAssignment = z.infer<typeof insertDutyAssignmentSchema>;

export type DutyAssignmentWithDetails = DutyAssignment & {
  employee?: { id: number; firstName: string; lastName: string; employeeCode: string; department?: { name: string } | null };
  dutyType?: DutyType;
};

// ======= EMPLOYEE COMMISSIONS =======

export const employeeCommissions = pgTable("employee_commissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  commissionName: text("commission_name").notNull(),
  amount: integer("amount").notNull(),
  month: text("month").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employeeCommissionsRelations = relations(employeeCommissions, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeCommissions.employeeId],
    references: [employees.id],
  }),
}));

export const insertEmployeeCommissionSchema = createInsertSchema(employeeCommissions).omit({
  id: true,
  createdAt: true,
});

export type InsertEmployeeCommission = z.infer<typeof insertEmployeeCommissionSchema>;
export type EmployeeCommission = typeof employeeCommissions.$inferSelect;

export type EmployeeCommissionWithEmployee = EmployeeCommission & {
  employee: { firstName: string; lastName: string; employeeCode: string };
};

// ======= APP SETTINGS =======

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
