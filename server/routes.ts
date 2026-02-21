import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { sendWhatsAppMessage, sendWhatsAppMessageInBackground } from "./whatsapp";
import { checkAndSendExpiryReminders } from "./expiry-reminder";

async function buildAndSendSalarySummary(employeeId: number, triggerType: "advance" | "commission" | "fine", triggerDetails: string) {
  try {
    const emp = await storage.getEmployee(employeeId);
    if (!emp) return;

    const empPhone = emp.whatsappNumber || emp.contact;
    if (!empPhone) return;
    const empName = `${emp.firstName} ${emp.lastName}`;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const advances = await storage.getSalaryAdvances(currentMonth);
    const empAdvances = advances.filter(a => a.employeeId === employeeId);
    const totalAdvances = empAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

    const commissions = await storage.getEmployeeCommissions(currentMonth);
    const empCommissions = commissions.filter(c => c.employeeId === employeeId);
    const totalCommissions = empCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);

    const monthNum = String(now.getMonth() + 1);
    const yearNum = now.getFullYear();
    const deductions = await storage.getMonthlyAttendanceDeductions(monthNum, yearNum);
    const empDeduction = deductions.find(d => d.employeeId === employeeId);
    const totalFines = empDeduction?.totalFines || 0;
    const absentDays = empDeduction?.absentDays || 0;
    const lateDays = empDeduction?.lateDays || 0;
    const totalOTReward = empDeduction?.totalOvertimeReward || 0;

    const basicSalary = emp.basicSalary || 0;
    const perDaySalary = Math.round(basicSalary / 30);
    const absentDeduction = absentDays * perDaySalary;
    const totalDeductions = totalAdvances + totalFines + absentDeduction;
    const netPayable = basicSalary - totalDeductions + totalCommissions + totalOTReward;

    let triggerEmoji = "📋";
    let triggerLabel = "";
    if (triggerType === "advance") { triggerEmoji = "💰"; triggerLabel = "Salary Advance Recorded"; }
    if (triggerType === "commission") { triggerEmoji = "🎉"; triggerLabel = "Commission Added"; }
    if (triggerType === "fine") { triggerEmoji = "⚠️"; triggerLabel = "Late Fine Applied"; }

    const msg = `Assalam o Alaikum ${empName}! 👋\n\n${triggerEmoji} ${triggerLabel}\n${triggerDetails}\n\n━━━━━━━━━━━━━━━━━━━━\n📊 SALARY SUMMARY - ${monthLabel}\n━━━━━━━━━━━━━━━━━━━━\n\n💵 Basic Salary: Rs. ${basicSalary.toLocaleString()}\n\n📉 DEDUCTIONS:\n   • Advances: Rs. ${totalAdvances.toLocaleString()}${empAdvances.length > 0 ? ` (${empAdvances.length} advance${empAdvances.length > 1 ? "s" : ""})` : ""}\n   • Late Fines: Rs. ${totalFines.toLocaleString()}${lateDays > 0 ? ` (${lateDays} day${lateDays > 1 ? "s" : ""})` : ""}\n   • Absent Deduction: Rs. ${absentDeduction.toLocaleString()}${absentDays > 0 ? ` (${absentDays} day${absentDays > 1 ? "s" : ""} × Rs. ${perDaySalary})` : ""}\n   ─────────────────\n   Total Deductions: Rs. ${totalDeductions.toLocaleString()}\n\n📈 ADDITIONS:\n   • Commissions: Rs. ${totalCommissions.toLocaleString()}${empCommissions.length > 0 ? ` (${empCommissions.length} commission${empCommissions.length > 1 ? "s" : ""})` : ""}\n   • OT Reward: Rs. ${totalOTReward.toLocaleString()}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ NET PAYABLE: Rs. ${netPayable.toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━\n\nFor any queries, please contact HR.\n\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;

    sendWhatsAppMessageInBackground(empPhone, msg);
  } catch (err: any) {
    console.error("[Salary Summary WhatsApp] Error:", err.message);
  }
}

function calculateLateFine(checkInTime: string, basicSalary: number | null): { lateMinutes: number; fineAmount: number } {
  const OFFICE_START_HOUR = 9;
  const OFFICE_START_MIN = 0;
  const WORKING_HOURS_PER_DAY = 11;

  const parts = checkInTime.split(":");
  if (parts.length < 2) return { lateMinutes: 0, fineAmount: 0 };

  const ciHour = parseInt(parts[0], 10);
  const ciMin = parseInt(parts[1], 10);
  if (isNaN(ciHour) || isNaN(ciMin)) return { lateMinutes: 0, fineAmount: 0 };

  const checkInTotalMins = ciHour * 60 + ciMin;
  const startTotalMins = OFFICE_START_HOUR * 60 + OFFICE_START_MIN;

  if (checkInTotalMins <= startTotalMins) return { lateMinutes: 0, fineAmount: 0 };

  const lateMins = checkInTotalMins - startTotalMins;
  const salary = basicSalary || 0;
  const perHourRate = salary / 30 / WORKING_HOURS_PER_DAY;
  const fine = Math.round(perHourRate * (lateMins / 60));

  return { lateMinutes: lateMins, fineAmount: fine };
}

function calculateOvertime(checkOutTime: string, basicSalary: number | null): { overtimeMinutes: number; overtimeReward: number } {
  const OFFICE_END_HOUR = 20;
  const OFFICE_END_MIN = 0;
  const WORKING_HOURS_PER_DAY = 11;

  const parts = checkOutTime.split(":");
  if (parts.length < 2) return { overtimeMinutes: 0, overtimeReward: 0 };

  const coHour = parseInt(parts[0], 10);
  const coMin = parseInt(parts[1], 10);
  if (isNaN(coHour) || isNaN(coMin)) return { overtimeMinutes: 0, overtimeReward: 0 };

  const checkoutTotalMins = coHour * 60 + coMin;
  const endTotalMins = OFFICE_END_HOUR * 60 + OFFICE_END_MIN;

  if (checkoutTotalMins <= endTotalMins) return { overtimeMinutes: 0, overtimeReward: 0 };

  const otMinutes = checkoutTotalMins - endTotalMins;
  const salary = basicSalary || 0;
  const perHourRate = salary / 30 / WORKING_HOURS_PER_DAY;
  const otReward = Math.round(perHourRate * (otMinutes / 60));

  return { overtimeMinutes: otMinutes, overtimeReward: otReward };
}
import {
  insertCustomerSchema,
  insertServicePlanSchema,
  insertInstallationSchema,
  insertCustomerNoteSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertChartOfAccountSchema,
  insertJournalEntrySchema,
  insertJournalLineSchema,
  insertVendorSchema,
  insertVendorBillSchema,
  insertExpenseSchema,
  insertOpeningBalanceSchema,
  insertAgentSchema,
  insertComplaintSchema,
  insertComplaintFeedbackSchema,
  insertDepartmentSchema,
  insertDesignationSchema,
  insertEmployeeSchema,
  insertEmergencyContactSchema,
  insertEmployeeDocumentSchema,
  insertAttendanceSchema,
  insertLeaveTypeConfigSchema,
  insertLeaveRequestSchema,
  insertLeaveBalanceSchema,
  insertSalaryStructureSchema,
  insertPayrollRunSchema,
  insertPayslipSchema,
  insertPerformanceCycleSchema,
  insertPerformanceReviewSchema,
  insertJobOpeningSchema,
  insertCandidateSchema,
  insertTrainingSchema,
  insertTrainingEnrollmentSchema,
  insertAssetSchema,
  insertAnnouncementSchema,
  insertPolicySchema,
  insertPolicyAcknowledgementSchema,
  insertHolidaySchema,
  insertWorkingHoursConfigSchema,
  insertAuditLogSchema,
  insertStockItemSchema,
  insertStockIssueSchema,
  insertStockReturnSchema,
  insertStockDamageSchema,
  insertDailyEntrySchema,
  insertReceivableSchema,
  insertReceivablePaymentSchema,
  insertConnectionRequestSchema,
  insertConnectionFeedbackSchema,
  insertSalaryAdvanceSchema,
  insertEmployeeCommissionSchema,
  insertPosSlipSchema,
  insertNetworkAreaSchema,
  insertInfraPointSchema,
  insertInfraSplitterSchema,
  insertFiberCableSchema,
  insertNetworkOnuSchema,
  agentLocations,
  complaintImages,
  todos,
  appSettings,
  users,
  networkAreas,
  infraPoints,
  infraSplitters,
  fiberCables,
  networkOnus,
  connectionRequests,
  connectionFeedback,
  agents,
  customers,
  servicePlans,
  invoices,
  chartOfAccounts,
  complaints,
  complaintFeedback,
  notifications,
  departments,
  designations,
  employees,
  attendance,
  leaveRequests,
  leaveBalances,
  salaryStructures,
  payrollRuns,
  payslips,
  performanceReviews,
  jobOpenings,
  candidates,
  trainings,
  trainingEnrollments,
  assets as companyAssets,
  policyAcknowledgements,
  holidays,
  workingHoursConfig,
  auditLogs,
  expiryReminders,
} from "@shared/schema";
import { db } from "./db";

async function createNotification(
  type: "payment_receipt" | "complaint_registered" | "complaint_completed" | "complaint_assigned" | "connection_registered" | "connection_assigned_engineer" | "connection_assigned_fieldworker" | "connection_completed",
  customerName: string,
  customerContact: string | null,
  title: string,
  message: string,
  details: string | null = null
): Promise<string> {
  const token = crypto.randomBytes(24).toString("hex");
  await db.insert(notifications).values({
    token,
    type,
    customerName,
    customerContact,
    title,
    message,
    details,
  });
  return token;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getNotificationPageHtml(notification: {
  type: string;
  customerName: string;
  title: string;
  message: string;
  details: string | null;
  createdAt: Date;
}): string {
  const title = escapeHtml(notification.title);
  const message = escapeHtml(notification.message);
  const details = notification.details ? escapeHtml(notification.details) : null;

  const dateStr = new Date(notification.createdAt).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const iconMap: Record<string, string> = {
    payment_receipt: "&#x2705;",
    complaint_registered: "&#x1F4CB;",
    complaint_completed: "&#x2705;",
    complaint_assigned: "&#x1F464;",
  };
  const icon = iconMap[notification.type] || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Storm Fiber Pattoki</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="Storm Fiber Pattoki - ${title}" />
  <meta property="og:image" content="/images/slip-logo.jpg" />
  <meta property="og:type" content="website" />
  <meta name="description" content="Storm Fiber Pattoki - ${title}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
    .card { background: #fff; border-radius: 16px; max-width: 420px; width: 100%; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #075e54, #128c7e); padding: 24px 20px; text-align: center; }
    .logo { max-width: 200px; width: 80%; border-radius: 8px; margin-bottom: 8px; background: #fff; padding: 4px; }
    .company { color: #e0f7f3; font-size: 11px; margin-top: 4px; }
    .content { padding: 24px 20px; }
    .title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .date { font-size: 12px; color: #888; margin-bottom: 16px; }
    .msg { font-size: 14px; line-height: 1.7; color: #333; white-space: pre-line; margin-bottom: 16px; }
    .details-box { background: #f8f9fa; border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.8; color: #444; white-space: pre-line; border: 1px solid #e9ecef; }
    .footer { border-top: 1px solid #eee; padding: 16px 20px; text-align: center; }
    .footer p { font-size: 12px; color: #888; line-height: 1.6; }
    .footer .phones { font-weight: 600; color: #128c7e; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="/images/slip-logo.jpg" alt="Storm Fiber Pattoki" class="logo" />
      <div class="company">Basement Soneri Bank, Alama Iqbal Road, Pattoki</div>
    </div>
    <div class="content">
      <div class="title">${icon} ${title}</div>
      <div class="date">${dateStr}</div>
      <div class="msg">${message}</div>
      ${details ? `<div class="details-box">${details}</div>` : ""}
    </div>
    <div class="footer">
      <p>Thank you for choosing Storm Fiber Pattoki!</p>
      <p class="phones">0307-8844421 | 0327-0223873</p>
    </div>
  </div>
</body>
</html>`;
}
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const patchCustomerSchema = insertCustomerSchema.partial();
  const patchPlanSchema = insertServicePlanSchema.partial();
  const patchInstallationSchema = insertInstallationSchema.partial();
  const patchInvoiceSchema = insertInvoiceSchema.partial();

  // ======= GLOBAL AUTH MIDDLEWARE =======
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const fullPath = req.baseUrl + req.path;
    if (fullPath.startsWith("/api/auth/") || fullPath.startsWith("/api/public/")) {
      return next();
    }
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  });

  // ======= AUTH ROUTES =======

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "Invalid username or password" });
    if (!user.isActive) return res.status(403).json({ message: "Account is deactivated. Contact admin." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid username or password" });

    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    if (!user.isActive) return res.status(403).json({ message: "Account deactivated" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ======= USER MANAGEMENT (admin only) =======

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    next();
  }

  async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  }

  app.get("/api/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const safeUsers = allUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    const { username, password, fullName, role, allowedModules, isActive } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      fullName: fullName || username,
      role: role || "viewer",
      allowedModules: allowedModules || [],
      isActive: isActive !== false,
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { username, password, fullName, role, allowedModules, isActive } = req.body;
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (role !== undefined) updateData.role = role;
    if (allowedModules !== undefined) updateData.allowedModules = allowedModules;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await storage.updateUser(id, updateData);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const id = req.params.id;
    if (req.session.userId === id) return res.status(400).json({ message: "Cannot delete your own account" });
    await storage.deleteUser(id);
    res.status(204).send();
  });

  // ======= CONNECTION REQUESTS =======
  app.get("/api/connection-requests", async (req, res) => {
    const results = await storage.getAllConnectionRequests();
    res.json(results);
  });

  app.get("/api/connection-requests/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const result = await storage.getConnectionRequest(id);
    if (!result) return res.status(404).json({ message: "Connection request not found" });
    res.json(result);
  });

  app.patch("/api/connection-requests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const existing = await storage.getConnectionRequest(id);
      if (!existing) return res.status(404).json({ message: "Connection request not found" });

      const allowedFields = ["customerName", "customerContact", "customerWhatsapp", "customerAddress", "customerCnic", "planId", "modemOwnership", "notes"] as const;
      const updateData: Record<string, any> = {};
      for (const key of allowedFields) {
        if (key in req.body && req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const result = await storage.updateConnectionRequest(id, updateData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/connection-requests", async (req, res) => {
    try {
      const parsed = insertConnectionRequestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const request = await storage.createConnectionRequest(parsed.data);
      const full = await storage.getConnectionRequest(request.id);

      const phone = parsed.data.customerWhatsapp || parsed.data.customerContact;

      const planName = full?.plan?.name || "N/A";
      const notifToken = await createNotification(
        "connection_registered",
        parsed.data.customerName,
        phone,
        "New Connection Request Registered",
        `Assalam o Alaikum ${parsed.data.customerName},\n\nYour new internet connection request has been registered with Storm Fiber Pattoki.`,
        `Request #: ${request.id}\nPackage: ${planName}\nAddress: ${parsed.data.customerAddress}\n\nOur team will contact you shortly for installation.`
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;
      const customerMessage = `*Storm Fiber Internet Pattoki*\n\nAssalam o Alaikum ${parsed.data.customerName},\n\nYour new connection request has been registered.\n\nRequest #: ${request.id}\nPackage: ${planName}\nAddress: ${parsed.data.customerAddress}\n\nOur team will contact you shortly.\n\nDetails: ${notifUrl}`;
      const waResult = sendWhatsAppMessageInBackground(phone, customerMessage);

      res.status(201).json({ ...full, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/connection-requests/:id/assign-engineer", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { engineerId } = req.body;
      if (!engineerId) return res.status(400).json({ message: "engineerId is required" });

      const [engineer] = await db.select().from(employees).where(eq(employees.id, Number(engineerId)));
      if (!engineer) return res.status(404).json({ message: "Engineer not found" });

      const existing = await storage.getConnectionRequest(id);
      if (!existing) return res.status(404).json({ message: "Connection request not found" });

      const updateData: any = { engineerId: engineer.id };
      if (existing.status !== "completed") {
        updateData.status = "assigned_engineer" as const;
      }

      await db
        .update(connectionRequests)
        .set(updateData)
        .where(eq(connectionRequests.id, id));

      const request = await storage.getConnectionRequest(id);
      if (!request) return res.status(404).json({ message: "Connection request not found" });

      const notifToken = await createNotification(
        "connection_assigned_engineer",
        engineer.firstName + " " + engineer.lastName,
        engineer.whatsappNumber || engineer.contact,
        "New Connection Assigned",
        `Assalam o Alaikum ${engineer.firstName},\n\nA new connection request has been assigned to you.`,
        `Request #: ${request.id}\nCustomer: ${request.customerName}\nContact: ${request.customerContact}\nAddress: ${request.customerAddress}\nPackage: ${request.plan?.name || "N/A"}`
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;
      const engMessage = `*Storm Fiber Internet Pattoki*\n\nAssalam o Alaikum ${engineer.firstName},\n\nA new connection has been assigned to you.\n\nRequest #: ${request.id}\nCustomer: ${request.customerName}\nContact: ${request.customerContact}\nAddress: ${request.customerAddress}\nPackage: ${request.plan?.name || "N/A"}\n\nDetails: ${notifUrl}`;
      const waResult = sendWhatsAppMessageInBackground(engineer.whatsappNumber || engineer.contact, engMessage);

      res.json({ ...request, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/connection-requests/:id/assign-fieldworker", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const { fieldWorkerId } = req.body;
      if (!fieldWorkerId) return res.status(400).json({ message: "fieldWorkerId is required" });

      const [worker] = await db.select().from(employees).where(eq(employees.id, Number(fieldWorkerId)));
      if (!worker) return res.status(404).json({ message: "Field worker not found" });

      const existing = await storage.getConnectionRequest(id);
      if (!existing) return res.status(404).json({ message: "Connection request not found" });

      const fwUpdateData: any = { fieldWorkerId: worker.id };
      if (existing.status !== "completed") {
        fwUpdateData.status = "assigned_fieldworker" as const;
      }

      await db
        .update(connectionRequests)
        .set(fwUpdateData)
        .where(eq(connectionRequests.id, id));

      const request = await storage.getConnectionRequest(id);
      if (!request) return res.status(404).json({ message: "Connection request not found" });

      const notifToken = await createNotification(
        "connection_assigned_fieldworker",
        worker.firstName + " " + worker.lastName,
        worker.whatsappNumber || worker.contact,
        "Installation Assigned",
        `Assalam o Alaikum ${worker.firstName},\n\nAn installation task has been assigned to you.`,
        `Request #: ${request.id}\nCustomer: ${request.customerName}\nContact: ${request.customerContact}\nAddress: ${request.customerAddress}\nPackage: ${request.plan?.name || "N/A"}`
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;
      const workerMessage = `*Storm Fiber Internet Pattoki*\n\nAssalam o Alaikum ${worker.firstName},\n\nYou have been assigned an installation task.\n\nRequest #: ${request.id}\nCustomer: ${request.customerName}\nContact: ${request.customerContact}\nAddress: ${request.customerAddress}\nPackage: ${request.plan?.name || "N/A"}\n\nDetails: ${notifUrl}`;
      const waResult = sendWhatsAppMessageInBackground(worker.whatsappNumber || worker.contact, workerMessage);

      res.json({ ...request, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/connection-requests/:id/complete", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const feedbackToken = crypto.randomBytes(32).toString("hex");

      await db
        .update(connectionRequests)
        .set({ status: "completed" as const, completedAt: new Date(), feedbackToken })
        .where(eq(connectionRequests.id, id));

      const request = await storage.getConnectionRequest(id);
      if (!request) return res.status(404).json({ message: "Connection request not found" });

      if (request.customerId) {
        await db
          .update(customers)
          .set({ status: "active" as const })
          .where(eq(customers.id, request.customerId));
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const feedbackUrl = `${baseUrl}/connection-feedback/${feedbackToken}`;

      const notifToken = await createNotification(
        "connection_completed",
        request.customerName,
        request.customerContact,
        "Connection Completed",
        `Assalam o Alaikum ${request.customerName},\n\nYour internet connection has been successfully installed and activated!`,
        `Request #: ${request.id}\nPackage: ${request.plan?.name || "N/A"}\n\nPlease rate your installation experience:\n${feedbackUrl}\n\nThank you for choosing Storm Fiber Internet Pattoki.`
      );

      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;
      const customerMessage = `*Storm Fiber Internet Pattoki*\n\nAssalam o Alaikum ${request.customerName},\n\nYour internet connection has been successfully installed and activated!\n\nPackage: ${request.plan?.name || "N/A"}\n\nPlease rate your installation experience:\n${feedbackUrl}\n\nThank you for choosing Storm Fiber.\n\nDetails: ${notifUrl}`;
      const waResult = sendWhatsAppMessageInBackground(request.customerWhatsapp || request.customerContact, customerMessage);

      res.json({ ...request, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent, feedbackUrl });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/connection-requests/:id/cancel", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db
      .update(connectionRequests)
      .set({ status: "cancelled" as const })
      .where(eq(connectionRequests.id, id));
    const result = await storage.getConnectionRequest(id);
    res.json(result);
  });

  // Customers
  app.get("/api/pos/customers", async (req, res) => {
    const results = await storage.getCustomersWithPlans();
    res.json(results);
  });

  app.get("/api/pos/slips", async (req, res) => {
    if (req.query.date) {
      const slips = await storage.getPosSlipsByDate(req.query.date as string);
      return res.json(slips);
    }
    const customerId = Number(req.query.customerId);
    if (isNaN(customerId)) return res.status(400).json({ message: "Provide customerId or date" });
    const slips = await storage.getPosSlipsByCustomer(customerId);
    res.json(slips);
  });

  app.post("/api/pos/slips", async (req, res) => {
    const body = { ...req.body };
    if (typeof body.slipDate === "string") {
      body.slipDate = new Date(body.slipDate);
    }
    const parsed = insertPosSlipSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const slip = await storage.createPosSlip(parsed.data);

    const slipDate = slip.slipDate instanceof Date ? slip.slipDate : new Date(String(slip.slipDate));
    const formattedDate = `${String(slipDate.getDate()).padStart(2,"0")}-${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][slipDate.getMonth()]}-${slipDate.getFullYear()}`;

    const paymentMsg = `Assalam o Alaikum ${slip.customerName}! 😊\n\nThank you for your payment! Here are your receipt details:\n\n📅 Date: ${formattedDate}\n📦 Package: ${slip.planName || "Internet"} (${slip.planSpeed || ""})\n💰 Amount: Rs. ${slip.planPrice}\n${slip.discount > 0 ? `🏷️ Discount: Rs. ${slip.discount}\n` : ""}✅ Net Total: Rs. ${slip.netTotal}\n💵 Cash Received: Rs. ${slip.cashReceived}\n${slip.balance > 0 ? `⚠️ Balance Due: Rs. ${slip.balance}\n` : ""}\nYour internet connection has been renewed. Enjoy seamless browsing! 🌐\n\nIf you have any questions, feel free to contact us:\n📞 0307-8844421 | 0327-0223873\n\nThank you for choosing Storm Fiber Pattoki! 🙏`;

    sendWhatsAppMessageInBackground(slip.customerContact, paymentMsg);

    res.status(201).json(slip);
  });

  app.get("/api/customers", async (req, res) => {
    const search = req.query.search as string | undefined;
    if (search && search.trim()) {
      const results = await storage.searchCustomers(search.trim());
      return res.json(results);
    }
    const results = await storage.getAllCustomers();
    res.json(results);
  });

  app.get("/api/customers/expiry-data", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const data = await db.execute(sql`
      SELECT 
        c.id as customer_id,
        c.connection_date,
        (SELECT MAX(ps.slip_date) FROM pos_slips ps WHERE ps.customer_id = c.id) as last_payment_date,
        sp.validity
      FROM customers c
      LEFT JOIN service_plans sp ON c.plan_id = sp.id
      WHERE c.status IN ('active', 'register')
    `);
    const expiryMap: Record<number, { lastPayment: string; expiryDate: string; connectionDate: string }> = {};
    for (const row of data.rows) {
      const customerId = row.customer_id as number;
      const lastPayment = row.last_payment_date as string | Date | null;
      const connectionDateStr = row.connection_date as string | null;
      const validityStr = (row.validity as string) || "30 days";
      const validityDays = parseInt(validityStr) || 30;

      let startDate: Date | null = null;
      let payStr = "-";

      if (lastPayment) {
        startDate = lastPayment instanceof Date ? lastPayment : new Date(String(lastPayment));
        payStr = startDate.toISOString().split("T")[0];
      } else if (connectionDateStr) {
        startDate = new Date(connectionDateStr);
        payStr = connectionDateStr;
      }

      if (startDate) {
        const expiry = new Date(startDate);
        expiry.setDate(expiry.getDate() + validityDays);
        const expStr = expiry.toISOString().split("T")[0];
        expiryMap[customerId] = { lastPayment: payStr, expiryDate: expStr, connectionDate: connectionDateStr || "" };
      }
    }
    res.json(expiryMap);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid customer ID" });
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const customer = await storage.createCustomer(parsed.data);
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid customer ID" });
    const parsed = patchCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const customer = await storage.updateCustomer(id, parsed.data);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid customer ID" });
    await storage.deleteCustomer(id);
    res.status(204).send();
  });

  // Customer Notes
  app.post("/api/customers/:id/notes", async (req, res) => {
    const customerId = Number(req.params.id);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const parsed = insertCustomerNoteSchema.safeParse({
      ...req.body,
      customerId,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const note = await storage.createNote(parsed.data);
    res.status(201).json(note);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid note ID" });
    await storage.deleteNote(id);
    res.status(204).send();
  });

  // Service Plans
  app.get("/api/plans", async (_req, res) => {
    const plans = await storage.getAllPlans();
    res.json(plans);
  });

  app.get("/api/plans/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid plan ID" });
    const plan = await storage.getPlan(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  });

  app.post("/api/plans", async (req, res) => {
    const parsed = insertServicePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const plan = await storage.createPlan(parsed.data);
    res.status(201).json(plan);
  });

  app.patch("/api/plans/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid plan ID" });
    const parsed = patchPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const plan = await storage.updatePlan(id, parsed.data);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  });

  app.delete("/api/plans/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid plan ID" });
    await storage.deletePlan(id);
    res.status(204).send();
  });

  // Installations
  app.post("/api/installations", async (req, res) => {
    const parsed = insertInstallationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const installation = await storage.createInstallation(parsed.data);
    res.status(201).json(installation);
  });

  app.patch("/api/installations/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid installation ID" });
    const parsed = patchInstallationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const installation = await storage.updateInstallation(id, parsed.data);
    if (!installation) return res.status(404).json({ message: "Installation not found" });
    res.json(installation);
  });

  // ======= BILLING & INVOICES =======

  app.get("/api/invoices", async (req, res) => {
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const results = await storage.getAllInvoices({ status, customerId });
    res.json(results);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid invoice ID" });
    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const invoice = await storage.createInvoice(parsed.data);
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid invoice ID" });
    const parsed = patchInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const invoice = await storage.updateInvoice(id, parsed.data);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  // Generate invoices for all active customers for a given period
  app.post("/api/billing/generate", async (req, res) => {
    try {
      const { periodStart, periodEnd, billingCycle, dueDays } = req.body;
      if (!periodStart || !periodEnd || typeof periodStart !== "string" || typeof periodEnd !== "string") {
        return res.status(400).json({ message: "periodStart and periodEnd are required date strings (YYYY-MM-DD)" });
      }
      const validCycles = ["monthly", "weekly"];
      const cycle = validCycles.includes(billingCycle) ? billingCycle : "monthly";
      const dueDateDays = typeof dueDays === "number" && dueDays > 0 ? dueDays : 10;

      const allCustomers = await storage.getAllCustomers();
      const activeCustomers = allCustomers.filter((c) => c.status === "active" && c.planId);

      const generated: any[] = [];
      const skipped: string[] = [];

      for (const customer of activeCustomers) {
        // Check if invoice already exists for this customer and period
        const existingInvoices = await storage.getCustomerInvoices(customer.id);
        const alreadyBilled = existingInvoices.some(
          (inv) => inv.periodStart === periodStart && inv.periodEnd === periodEnd && inv.status !== "void"
        );

        if (alreadyBilled) {
          skipped.push(`${customer.name} - already billed`);
          continue;
        }

        const plan = await storage.getPlan(customer.planId!);
        if (!plan) {
          skipped.push(`${customer.name} - plan not found`);
          continue;
        }

        let baseAmount = plan.price;
        let isProRata = false;

        // Pro-rata calculation for mid-cycle activations
        const pStart = new Date(periodStart);
        const pEnd = new Date(periodEnd);
        const customerCreated = new Date(customer.createdAt);
        const totalDays = Math.ceil((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24));

        if (customerCreated > pStart && customerCreated <= pEnd) {
          const activeDays = Math.ceil((pEnd.getTime() - customerCreated.getTime()) / (1000 * 60 * 60 * 24));
          baseAmount = Math.round((plan.price * activeDays) / totalDays);
          isProRata = true;
        }

        const issueDate = new Date().toISOString().split("T")[0];
        const due = new Date();
        due.setDate(due.getDate() + dueDateDays);
        const dueDate = due.toISOString().split("T")[0];

        const invoice = await storage.createInvoice({
          customerId: customer.id,
          planId: customer.planId!,
          billingCycle: cycle,
          periodStart,
          periodEnd,
          issueDate,
          dueDate,
          baseAmount,
          discountAmount: 0,
          penaltyAmount: 0,
          totalAmount: baseAmount,
          paidAmount: 0,
          status: "issued",
          isProRata,
          notes: isProRata ? `Pro-rata billing for ${Math.ceil((pEnd.getTime() - customerCreated.getTime()) / (1000 * 60 * 60 * 24))} days` : null,
        });

        generated.push(invoice);
      }

      res.json({
        generated: generated.length,
        skipped: skipped.length,
        details: { generated, skipped },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mark overdue invoices and optionally suspend accounts
  app.post("/api/billing/mark-overdue", async (req, res) => {
    try {
      const { suspendAccounts } = req.body;
      const today = new Date().toISOString().split("T")[0];

      const allInvoices = await storage.getAllInvoices({ status: "issued" });
      const partialInvoices = await storage.getAllInvoices({ status: "partial" });
      const allUnpaid = [...allInvoices, ...partialInvoices];

      let markedOverdue = 0;
      let suspended = 0;

      for (const inv of allUnpaid) {
        if (inv.dueDate < today) {
          await storage.updateInvoice(inv.id, { status: "overdue" });
          markedOverdue++;

          if (suspendAccounts) {
            await storage.updateCustomer(inv.customerId, { status: "suspended" });
            suspended++;
          }
        }
      }

      res.json({ markedOverdue, suspended });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PAYMENTS =======

  app.get("/api/payments", async (req, res) => {
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const invoiceId = req.query.invoiceId ? Number(req.query.invoiceId) : undefined;

    if (invoiceId) {
      const results = await storage.getInvoicePayments(invoiceId);
      return res.json(results);
    }
    if (customerId) {
      const results = await storage.getCustomerPayments(customerId);
      return res.json(results);
    }
    res.status(400).json({ message: "Provide customerId or invoiceId" });
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const parsed = insertPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const payment = await storage.createPayment(parsed.data);

      // Update invoice paid amount and status
      const invoice = await storage.getInvoice(parsed.data.invoiceId);
      if (invoice) {
        const newPaidAmount = invoice.paidAmount + parsed.data.amount;
        const newStatus = newPaidAmount >= invoice.totalAmount ? "paid" : "partial";
        await storage.updateInvoice(invoice.id, {
          paidAmount: newPaidAmount,
          status: newStatus,
        });

        // If fully paid and customer was suspended, reactivate
        if (newStatus === "paid") {
          const customer = await storage.getCustomer(invoice.customerId);
          if (customer && customer.status === "suspended") {
            await storage.updateCustomer(invoice.customerId, { status: "active" });
          }
        }
      }

      // Generate WhatsApp link with branded notification page
      const customer = await storage.getCustomer(parsed.data.customerId);
      let whatsappLink = "";
      let whatsappSent = false;
      if (customer) {
        const methodLabel = parsed.data.method.replace("_", " ");

        const notifToken = await createNotification(
          "payment_receipt",
          customer.name,
          customer.contact,
          "Payment Received",
          `Assalam o Alaikum ${customer.name},\n\nYour payment of Rs. ${parsed.data.amount} has been received.`,
          `Payment Method: ${methodLabel}\nCollected By: ${parsed.data.collectedBy}\nInvoice #: NBB-${String(parsed.data.invoiceId).padStart(5, "0")}`
        );

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

        const message = `Assalam o Alaikum ${customer.name},\n\nYour payment of Rs. ${parsed.data.amount} has been received.\n\nPayment Method: ${methodLabel}\nCollected By: ${parsed.data.collectedBy}\n\nView receipt with details:\n${notifUrl}\n\nThank you for choosing Storm Fiber Pattoki!\n0307-8844421 | 0327-0223873`;
        const waResult = sendWhatsAppMessageInBackground(customer.contact, message);
        whatsappLink = waResult.whatsappLink || "";
        whatsappSent = waResult.sent;
      }

      res.status(201).json({ payment, whatsappLink, whatsappSent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payments/:id/whatsapp-sent", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payment ID" });

      const payment = await storage.getPayment(id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      const invoice = await storage.getInvoice(payment.invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const customer = await storage.getCustomer(payment.customerId);
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const methodLabel = payment.method.replace("_", " ");

      const notifToken = await createNotification(
        "payment_receipt",
        customer.name,
        customer.contact,
        "Payment Received",
        `Assalam o Alaikum ${customer.name},\n\nYour payment of Rs. ${payment.amount} has been received.`,
        `Payment Method: ${methodLabel}\nCollected By: ${payment.collectedBy}\nInvoice #: NBB-${String(invoice.id).padStart(5, "0")}`
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

      const message = `Assalam o Alaikum ${customer.name},\n\nYour payment of Rs. ${payment.amount} has been received.\n\nPayment Method: ${methodLabel}\nCollected By: ${payment.collectedBy}\n\nView receipt:\n${notifUrl}\n\nThank you for choosing Storm Fiber Pattoki!\n0307-8844421 | 0327-0223873`;
      const waResult = sendWhatsAppMessageInBackground(customer.contact, message);

      await storage.updatePayment(id, { whatsappSent: true });
      res.json({ payment, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add discount or penalty to invoice
  app.patch("/api/invoices/:id/adjustment", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid invoice ID" });

    const { discountAmount, penaltyAmount } = req.body;
    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const newDiscount = typeof discountAmount === "number" && discountAmount >= 0 ? discountAmount : invoice.discountAmount;
    const newPenalty = typeof penaltyAmount === "number" && penaltyAmount >= 0 ? penaltyAmount : invoice.penaltyAmount;
    const newTotal = Math.max(0, invoice.baseAmount - newDiscount + newPenalty);

    const updated = await storage.updateInvoice(id, {
      discountAmount: newDiscount,
      penaltyAmount: newPenalty,
      totalAmount: newTotal,
    });
    res.json(updated);
  });

  // Billing stats
  app.get("/api/billing/stats", async (_req, res) => {
    const stats = await storage.getBillingStats();
    res.json(stats);
  });

  // Customer invoices
  app.get("/api/customers/:id/invoices", async (req, res) => {
    const customerId = Number(req.params.id);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const customerInvoices = await storage.getCustomerInvoices(customerId);
    res.json(customerInvoices);
  });

  // Customer payments
  app.get("/api/customers/:id/payments", async (req, res) => {
    const customerId = Number(req.params.id);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const customerPayments = await storage.getCustomerPayments(customerId);
    res.json(customerPayments);
  });

  // ======= ACCOUNTING MODULE =======

  // Chart of Accounts
  app.get("/api/accounts", async (_req, res) => {
    const accounts = await storage.getAllAccounts();
    res.json(accounts);
  });

  app.get("/api/accounts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid account ID" });
    const account = await storage.getAccount(id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  });

  app.post("/api/accounts", async (req, res) => {
    const parsed = insertChartOfAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const account = await storage.createAccount(parsed.data);
      res.status(201).json(account);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/accounts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid account ID" });
    const account = await storage.updateAccount(id, req.body);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  });

  // Seed default chart of accounts
  app.post("/api/accounts/seed", async (_req, res) => {
    try {
      const existing = await storage.getAllAccounts();
      if (existing.length > 0) {
        return res.json({ message: "Chart of accounts already seeded", count: existing.length });
      }

      const defaultAccounts = [
        { code: "1000", name: "Cash", type: "asset" as const, description: "Cash on hand" },
        { code: "1010", name: "Bank Account", type: "asset" as const, description: "Bank deposits" },
        { code: "1020", name: "Mobile Money", type: "asset" as const, description: "Mobile payment accounts" },
        { code: "1100", name: "Accounts Receivable", type: "asset" as const, description: "Customer outstanding balances" },
        { code: "1200", name: "Equipment", type: "asset" as const, description: "Routers, ONU, cables, tools" },
        { code: "1210", name: "Infrastructure", type: "asset" as const, description: "Fiber cables, poles, ducts" },
        { code: "2000", name: "Accounts Payable", type: "liability" as const, description: "Vendor outstanding balances" },
        { code: "2100", name: "Tax Payable", type: "liability" as const, description: "GST/tax obligations" },
        { code: "2200", name: "Advance Payments", type: "liability" as const, description: "Customer advance payments" },
        { code: "3000", name: "Owner Equity", type: "equity" as const, description: "Owner investment" },
        { code: "3100", name: "Retained Earnings", type: "equity" as const, description: "Accumulated profits" },
        { code: "4000", name: "Internet Service Revenue", type: "revenue" as const, description: "Monthly subscription income" },
        { code: "4010", name: "Installation Revenue", type: "revenue" as const, description: "New connection charges" },
        { code: "4020", name: "Late Fee Revenue", type: "revenue" as const, description: "Penalty charges" },
        { code: "4030", name: "Other Revenue", type: "revenue" as const, description: "Miscellaneous income" },
        { code: "5000", name: "Bandwidth Cost", type: "expense" as const, description: "Internet bandwidth purchase" },
        { code: "5010", name: "Infrastructure Expense", type: "expense" as const, description: "Fiber, cables, poles maintenance" },
        { code: "5020", name: "Salary Expense", type: "expense" as const, description: "Staff salaries" },
        { code: "5030", name: "Commission Expense", type: "expense" as const, description: "Sales commissions" },
        { code: "5040", name: "Maintenance Expense", type: "expense" as const, description: "Equipment repairs & maintenance" },
        { code: "5050", name: "Office Expense", type: "expense" as const, description: "Office supplies & rent" },
        { code: "5060", name: "Utilities Expense", type: "expense" as const, description: "Electricity, water, etc." },
        { code: "5070", name: "Other Expense", type: "expense" as const, description: "Miscellaneous expenses" },
        { code: "5080", name: "Discount Allowed", type: "expense" as const, description: "Customer discounts" },
        { code: "5100", name: "Fuel Expense", type: "expense" as const, description: "Vehicle fuel costs" },
        { code: "5110", name: "Company Online Expense", type: "expense" as const, description: "Online services and subscriptions" },
        { code: "5120", name: "Salary Advances", type: "expense" as const, description: "Salary advances to employees" },
        { code: "5130", name: "Bike Maintenance", type: "expense" as const, description: "Motorcycle/bike repairs and maintenance" },
        { code: "5140", name: "Stock Purchase", type: "expense" as const, description: "Inventory stock purchases" },
        { code: "5150", name: "Office Utilities Expense", type: "expense" as const, description: "Office utility costs" },
        { code: "5160", name: "Utility Bills", type: "expense" as const, description: "Electricity, gas, water, bilty, mobile packages" },
        { code: "5170", name: "Recoveries Losses", type: "expense" as const, description: "Recovery losses and write-offs" },
        { code: "5180", name: "Office Rent", type: "expense" as const, description: "Office space rental" },
        { code: "5190", name: "Repair & Maintenance", type: "expense" as const, description: "General repairs and maintenance" },
      ];

      for (const acc of defaultAccounts) {
        await storage.createAccount(acc);
      }

      res.json({ message: "Chart of accounts seeded", count: defaultAccounts.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Journal Entries
  app.get("/api/journal-entries", async (_req, res) => {
    const entries = await storage.getAllJournalEntries();
    res.json(entries);
  });

  app.get("/api/journal-entries/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid entry ID" });
    const entry = await storage.getJournalEntry(id);
    if (!entry) return res.status(404).json({ message: "Journal entry not found" });
    res.json(entry);
  });

  app.post("/api/journal-entries", async (req, res) => {
    try {
      const { entry, lines } = req.body;
      const parsedEntry = insertJournalEntrySchema.safeParse(entry);
      if (!parsedEntry.success) return res.status(400).json({ message: parsedEntry.error.message });

      if (!Array.isArray(lines) || lines.length < 2) {
        return res.status(400).json({ message: "At least 2 journal lines required" });
      }

      const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
      const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
      if (totalDebit !== totalCredit) {
        return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit})` });
      }

      const result = await storage.createJournalEntry(parsedEntry.data, lines);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-post journal entry for an invoice
  app.post("/api/journal-entries/auto-post/invoice/:id", async (req, res) => {
    try {
      const invoiceId = Number(req.params.id);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice ID" });

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const arAccount = await storage.getAccountByCode("1100");
      const revenueAccount = await storage.getAccountByCode("4000");
      const discountAccount = await storage.getAccountByCode("5080");
      const lateFeeAccount = await storage.getAccountByCode("4020");

      if (!arAccount || !revenueAccount) {
        return res.status(400).json({ message: "Chart of accounts not seeded. Please seed accounts first." });
      }

      const lines: any[] = [
        { accountId: arAccount.id, debit: invoice.totalAmount, credit: 0, customerId: invoice.customerId, description: `Invoice #${invoice.id}` },
        { accountId: revenueAccount.id, debit: 0, credit: invoice.baseAmount, customerId: invoice.customerId, description: `Service revenue - Invoice #${invoice.id}` },
      ];

      if (invoice.discountAmount > 0 && discountAccount) {
        lines[1].credit = invoice.baseAmount - invoice.discountAmount;
        lines.push({ accountId: discountAccount.id, debit: invoice.discountAmount, credit: 0, description: `Discount on Invoice #${invoice.id}` });
        lines[1].credit = invoice.baseAmount;
        lines.splice(2, 0, { accountId: discountAccount.id, debit: 0, credit: 0 });
        lines[0].debit = invoice.totalAmount;
        lines[1].credit = invoice.totalAmount;
        lines.splice(2);
      }

      if (invoice.penaltyAmount > 0 && lateFeeAccount) {
        lines.push({ accountId: lateFeeAccount.id, debit: 0, credit: invoice.penaltyAmount, description: `Late fee - Invoice #${invoice.id}` });
        lines[1].credit = invoice.baseAmount - invoice.discountAmount;
      }

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      if (totalDebit !== totalCredit) {
        const diff = totalDebit - totalCredit;
        if (diff > 0) lines[1].credit += diff;
        else lines[0].debit += Math.abs(diff);
      }

      const result = await storage.createJournalEntry(
        { entryDate: invoice.issueDate, memo: `Invoice #${invoice.id} - ${invoice.customer.name}`, sourceType: "invoice", sourceId: invoice.id },
        lines
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-post journal entry for a payment
  app.post("/api/journal-entries/auto-post/payment/:id", async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      if (isNaN(paymentId)) return res.status(400).json({ message: "Invalid payment ID" });

      const allPayments = await storage.getCustomerPayments(0);
      let payment: any = null;
      const allCustomers = await storage.getAllCustomers();
      for (const c of allCustomers) {
        const cp = await storage.getCustomerPayments(c.id);
        const found = cp.find((p) => p.id === paymentId);
        if (found) { payment = found; break; }
      }

      if (!payment) return res.status(404).json({ message: "Payment not found" });

      const arAccount = await storage.getAccountByCode("1100");
      const methodAccountCode = payment.method === "cash" ? "1000" : payment.method === "bank" ? "1010" : payment.method === "mobile_money" ? "1020" : "1000";
      const cashAccount = await storage.getAccountByCode(methodAccountCode);

      if (!arAccount || !cashAccount) {
        return res.status(400).json({ message: "Chart of accounts not seeded" });
      }

      const customer = await storage.getCustomer(payment.customerId);
      const result = await storage.createJournalEntry(
        { entryDate: new Date(payment.receivedAt).toISOString().split("T")[0], memo: `Payment #${payment.id} - ${customer?.name || "Unknown"}`, sourceType: "payment", sourceId: payment.id },
        [
          { accountId: cashAccount.id, debit: payment.amount, credit: 0, customerId: payment.customerId, description: `Payment received - ${payment.method}` },
          { accountId: arAccount.id, debit: 0, credit: payment.amount, customerId: payment.customerId, description: `Payment applied to Invoice #${payment.invoiceId}` },
        ]
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Vendors
  app.get("/api/vendors", async (_req, res) => {
    const allVendors = await storage.getAllVendors();
    res.json(allVendors);
  });

  app.get("/api/vendors/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });
    const vendor = await storage.getVendor(id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  });

  app.post("/api/vendors", async (req, res) => {
    const parsed = insertVendorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const vendor = await storage.createVendor(parsed.data);
    res.status(201).json(vendor);
  });

  app.patch("/api/vendors/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid vendor ID" });
    const vendor = await storage.updateVendor(id, req.body);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  });

  // Vendor Bills
  app.get("/api/vendor-bills", async (_req, res) => {
    const bills = await storage.getAllVendorBills();
    res.json(bills);
  });

  app.post("/api/vendor-bills", async (req, res) => {
    const parsed = insertVendorBillSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const bill = await storage.createVendorBill(parsed.data);
    res.status(201).json(bill);
  });

  app.patch("/api/vendor-bills/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid bill ID" });
    const bill = await storage.updateVendorBill(id, req.body);
    if (!bill) return res.status(404).json({ message: "Vendor bill not found" });
    res.json(bill);
  });

  // Pay vendor bill
  app.post("/api/vendor-bills/:id/pay", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid bill ID" });
      const { amount, paymentMethod } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid payment amount" });

      const bill = await storage.getVendorBill(id);
      if (!bill) return res.status(404).json({ message: "Vendor bill not found" });

      const newPaid = bill.paidAmount + amount;
      const newStatus = newPaid >= bill.totalAmount ? "paid" : "partial";
      await storage.updateVendorBill(id, { paidAmount: newPaid, status: newStatus });

      const apAccount = await storage.getAccountByCode("2000");
      const methodCode = paymentMethod === "bank" ? "1010" : paymentMethod === "mobile_money" ? "1020" : "1000";
      const cashAccount = await storage.getAccountByCode(methodCode);

      if (apAccount && cashAccount) {
        await storage.createJournalEntry(
          { entryDate: new Date().toISOString().split("T")[0], memo: `Vendor bill payment - ${bill.vendor.name}`, sourceType: "expense", sourceId: id },
          [
            { accountId: apAccount.id, debit: amount, credit: 0, vendorId: bill.vendorId, description: `Payment to ${bill.vendor.name}` },
            { accountId: cashAccount.id, debit: 0, credit: amount, description: `Vendor payment - ${paymentMethod || "cash"}` },
          ]
        );
      }

      const updated = await storage.getVendorBill(id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Expenses
  app.get("/api/expenses", async (_req, res) => {
    const allExpenses = await storage.getAllExpenses();
    res.json(allExpenses);
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const parsed = insertExpenseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const expense = await storage.createExpense(parsed.data);

      const categoryToAccountCode: Record<string, string> = {
        bandwidth: "5000",
        infrastructure: "5010",
        salary: "5020",
        commission: "5030",
        maintenance: "5040",
        office: "5050",
        utilities: "5060",
        other: "5070",
      };

      const expenseAccountCode = categoryToAccountCode[parsed.data.category] || "5070";
      const expenseAccount = await storage.getAccountByCode(expenseAccountCode);
      const methodCode = parsed.data.paymentMethod === "bank" ? "1010" : parsed.data.paymentMethod === "mobile_money" ? "1020" : "1000";
      const cashAccount = await storage.getAccountByCode(methodCode);

      if (expenseAccount && cashAccount) {
        await storage.createJournalEntry(
          { entryDate: parsed.data.expenseDate, memo: `Expense: ${parsed.data.description}`, sourceType: "expense", sourceId: expense.id },
          [
            { accountId: expenseAccount.id, debit: parsed.data.amount, credit: 0, description: parsed.data.description },
            { accountId: cashAccount.id, debit: 0, credit: parsed.data.amount, description: `Expense payment - ${parsed.data.paymentMethod || "cash"}` },
          ]
        );
      }

      res.status(201).json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid expense ID" });
    await storage.deleteExpense(id);
    res.status(204).send();
  });

  // Opening Balances
  app.get("/api/opening-balances/:customerId", async (req, res) => {
    const customerId = Number(req.params.customerId);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const balance = await storage.getOpeningBalance(customerId);
    res.json(balance || { customerId, amount: 0 });
  });

  app.post("/api/opening-balances", async (req, res) => {
    const parsed = insertOpeningBalanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const balance = await storage.setOpeningBalance(parsed.data);
    res.status(201).json(balance);
  });

  // Customer Ledger
  app.get("/api/customer-ledger/:customerId", async (req, res) => {
    const customerId = Number(req.params.customerId);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const ledger = await storage.getCustomerLedger(customerId);
    res.json(ledger);
  });

  // Financial Reports
  app.get("/api/reports/trial-balance", async (_req, res) => {
    const report = await storage.getTrialBalance();
    res.json(report);
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    const startDate = (req.query.startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split("T")[0];
    const report = await storage.getProfitAndLoss(startDate, endDate);
    res.json(report);
  });

  app.get("/api/reports/balance-sheet", async (_req, res) => {
    const report = await storage.getBalanceSheet();
    res.json(report);
  });

  app.get("/api/reports/aging", async (_req, res) => {
    const report = await storage.getAgingReport();
    res.json(report);
  });

  // ======= AGENTS =======

  app.get("/api/agents", async (_req, res) => {
    const allAgents = await storage.getAllAgents();
    res.json(allAgents);
  });

  app.get("/api/agents/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid agent ID" });
    const agent = await storage.getAgent(id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  });

  app.post("/api/agents", async (req, res) => {
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const agent = await storage.createAgent(parsed.data);
    res.status(201).json(agent);
  });

  app.patch("/api/agents/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid agent ID" });
    const agent = await storage.updateAgent(id, req.body);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  });

  app.delete("/api/agents/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid agent ID" });
    await storage.deleteAgent(id);
    res.json({ message: "Agent deleted" });
  });

  app.get("/api/agents/:id/performance", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid agent ID" });
      const agent = await storage.getAgent(id);
      if (!agent) return res.status(404).json({ message: "Agent not found" });

      const agentComplaints = await db.select().from(complaints).where(eq(complaints.agentId, id));

      const complaintDetails = [];
      let totalAgentRating = 0;
      let totalServiceRating = 0;
      let feedbackCount = 0;

      for (const c of agentComplaints) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, c.customerId));
        const [feedback] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, c.id));

        if (feedback) {
          totalAgentRating += feedback.agentRating;
          totalServiceRating += feedback.serviceRating;
          feedbackCount++;
        }

        complaintDetails.push({
          id: c.id,
          complaintType: c.complaintType,
          status: c.status,
          priority: c.priority,
          customerName: customer?.name || "Unknown",
          customerContact: customer?.contact || "",
          createdAt: c.createdAt,
          resolvedAt: c.resolvedAt,
          feedback: feedback ? {
            agentRating: feedback.agentRating,
            serviceRating: feedback.serviceRating,
            comments: feedback.comments,
            createdAt: feedback.createdAt,
          } : null,
        });
      }

      res.json({
        agent,
        totalComplaints: agentComplaints.length,
        completedComplaints: agentComplaints.filter(c => c.status === "completed" || c.status === "closed").length,
        openComplaints: agentComplaints.filter(c => c.status === "open" || c.status === "assigned" || c.status === "in_progress").length,
        feedbackCount,
        avgAgentRating: feedbackCount > 0 ? Math.round((totalAgentRating / feedbackCount) * 10) / 10 : 0,
        avgServiceRating: feedbackCount > 0 ? Math.round((totalServiceRating / feedbackCount) * 10) / 10 : 0,
        complaints: complaintDetails,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= EMPLOYEE FEEDBACK =======

  app.get("/api/employee-feedback", async (req, res) => {
    try {
      const allEmployees = await storage.getAllEmployees();
      const allComplaints = await db.select().from(complaints);
      const allConnectionRequests = await db.select().from(connectionRequests);

      const results = [];

      for (const emp of allEmployees) {
        const empName = `${emp.firstName} ${emp.lastName}`;

        const empComplaints = allComplaints.filter(c => c.assignedTo === empName);
        let complaintFeedbacks: any[] = [];
        for (const c of empComplaints) {
          const [fb] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, c.id));
          if (fb) {
            const [cust] = await db.select().from(customers).where(eq(customers.id, c.customerId));
            complaintFeedbacks.push({
              id: fb.id,
              type: "complaint",
              complaintId: c.id,
              complaintType: c.complaintType,
              customerName: cust?.name || "Unknown",
              agentRating: fb.agentRating,
              serviceRating: fb.serviceRating,
              comments: fb.comments,
              createdAt: fb.createdAt,
            });
          }
        }

        const empConnections = allConnectionRequests.filter(cr => cr.fieldWorkerId === emp.id);
        let connectionFeedbacks: any[] = [];
        for (const cr of empConnections) {
          const [cfb] = await db.select().from(connectionFeedback).where(eq(connectionFeedback.connectionRequestId, cr.id));
          if (cfb) {
            connectionFeedbacks.push({
              id: cfb.id,
              type: "connection",
              connectionRequestId: cr.id,
              customerName: cr.customerName,
              fieldWorkerRating: cfb.fieldWorkerRating,
              serviceRating: cfb.serviceRating,
              comments: cfb.comments,
              createdAt: cfb.createdAt,
            });
          }
        }

        const allFeedbacks = [...complaintFeedbacks, ...connectionFeedbacks];
        if (allFeedbacks.length === 0 && empComplaints.length === 0 && empConnections.length === 0) continue;

        const totalRatings = complaintFeedbacks.reduce((sum, f) => sum + f.agentRating, 0)
          + connectionFeedbacks.reduce((sum, f) => sum + f.fieldWorkerRating, 0);
        const totalServiceRatings = allFeedbacks.reduce((sum, f) => sum + f.serviceRating, 0);
        const feedbackCount = allFeedbacks.length;

        results.push({
          employeeId: emp.id,
          employeeName: empName,
          employeeCode: emp.employeeCode,
          totalComplaints: empComplaints.length,
          totalConnections: empConnections.length,
          feedbackCount,
          avgRating: feedbackCount > 0 ? Math.round((totalRatings / feedbackCount) * 10) / 10 : 0,
          avgServiceRating: feedbackCount > 0 ? Math.round((totalServiceRatings / feedbackCount) * 10) / 10 : 0,
          feedbacks: allFeedbacks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        });
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= COMPLAINT MANAGEMENT =======

  app.get("/api/complaints", async (req, res) => {
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const results = await storage.getAllComplaints({ status, customerId });
    res.json(results);
  });

  app.get("/api/complaints/stats", async (_req, res) => {
    const stats = await storage.getComplaintStats();
    res.json(stats);
  });

  app.get("/api/complaints/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });
    const complaint = await storage.getComplaint(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json(complaint);
  });

  app.post("/api/complaints", async (req, res) => {
    try {
      const parsed = insertComplaintSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const complaint = await storage.createComplaint(parsed.data);

      const customer = await storage.getCustomer(complaint.customerId);
      let whatsappLink = "";
      let whatsappSent = false;
      if (customer) {
        const typeLabels: Record<string, string> = {
          no_internet: "No Internet",
          slow_internet: "Slow Internet",
          red_light: "Red Light",
          wire_damage: "Wire Damage",
          modem_dead: "Modem Dead",
          modem_replacement: "Modem Replacement",
          other: "Other",
        };
        const typeName = typeLabels[complaint.complaintType] || complaint.complaintType;

        const notifToken = await createNotification(
          "complaint_registered",
          customer.name,
          customer.contact,
          "Complaint Registered",
          `Assalam o Alaikum ${customer.name}! 😊\n\nThank you for reaching out! Your complaint has been successfully registered.`,
          `Complaint #: ${complaint.id}\nType: ${typeName}${complaint.description ? `\nDetails: ${complaint.description}` : ""}\n\nWe're working to get this sorted out for you as quickly as possible.`
        );

        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

        const message = `Assalam o Alaikum ${customer.name}! 😊\n\nThank you for reaching out to us. We want you to know that your complaint has been successfully registered and our team is already on it!\n\nComplaint #: ${complaint.id}\nType: ${typeName}\n${complaint.description ? `Details: ${complaint.description}\n` : ""}\nView details:\n${notifUrl}\n\nWe understand how important your internet connection is, and we're working to get this sorted out for you as quickly as possible. You'll receive an update once it's resolved.\n\nIf you need any help in the meantime, feel free to contact us:\n📞 0307-8844421 | 0327-0223873\n\nThank you for your patience! 🙏\nStorm Fiber Pattoki`;
        const waResult = sendWhatsAppMessageInBackground(customer.contact, message);
        whatsappLink = waResult.whatsappLink || "";
        whatsappSent = waResult.sent;
      }

      res.status(201).json({ complaint, whatsappLink, whatsappSent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/complaints/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });

    if (req.body.status === "in_progress") {
      await db
        .update(complaints)
        .set({ startedAt: new Date() })
        .where(eq(complaints.id, id));
    }

    const complaint = await storage.updateComplaint(id, req.body);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json(complaint);
  });

  app.delete("/api/complaints/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });
      const deleted = await storage.deleteComplaint(id);
      if (!deleted) return res.status(404).json({ message: "Complaint not found" });
      res.json({ message: "Complaint deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/complaints/:id/assign", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });
      const { employeeId } = req.body;
      if (!employeeId) return res.status(400).json({ message: "employeeId is required" });

      const employee = await storage.getEmployee(Number(employeeId));
      if (!employee) return res.status(404).json({ message: "Employee not found" });

      const employeeName = `${employee.firstName} ${employee.lastName}`;
      const employeePhone = employee.whatsappNumber || employee.contact;

      await db
        .update(complaints)
        .set({ assignedTo: employeeName, status: "assigned" as const })
        .where(eq(complaints.id, id));

      const complaint = await storage.getComplaint(id);
      if (!complaint) return res.status(404).json({ message: "Complaint not found" });

      const customer = complaint.customer;
      const typeLabels: Record<string, string> = {
        no_internet: "No Internet",
        slow_internet: "Slow Internet",
        red_light: "Red Light",
        wire_damage: "Wire Damage",
        modem_dead: "Modem Dead",
        modem_replacement: "Modem Replacement",
        other: "Other",
      };
      const typeName = typeLabels[complaint.complaintType] || complaint.complaintType;

      const notifToken = await createNotification(
        "complaint_assigned",
        employeeName,
        employeePhone,
        "Complaint Assigned",
        `Assalam o Alaikum ${employeeName}! 👋\n\nA new complaint has been assigned to you.`,
        `Complaint #: ${complaint.id}\nType: ${typeName}\nPriority: ${complaint.priority}${complaint.description ? `\nDetails: ${complaint.description}` : ""}\n\nCustomer: ${customer.name}\nContact: ${customer.contact}\nAddress: ${customer.address}`
      );

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

      const empMessage = `Assalam o Alaikum ${employeeName}! 👋\n\nA new complaint has been assigned to you. Please check the details below:\n\nComplaint #: ${complaint.id}\nType: ${typeName}\nPriority: ${complaint.priority}\n${complaint.description ? `Details: ${complaint.description}\n` : ""}\nCustomer: ${customer.name}\nContact: ${customer.contact}\nAddress: ${customer.address}\n\nView details:\n${notifUrl}\n\nPlease resolve this at your earliest convenience. Thank you for your hard work! 💪\nStorm Fiber Pattoki\n0307-8844421 | 0327-0223873`;
      const waResult = sendWhatsAppMessageInBackground(employeePhone, empMessage);

      res.json({ complaint, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/complaints/:id/complete", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });
      const { resolutionNotes } = req.body;

      const existingComplaint = await storage.getComplaint(id);
      if (!existingComplaint) return res.status(404).json({ message: "Complaint not found" });

      const feedbackToken = existingComplaint.feedbackToken || crypto.randomBytes(16).toString("hex");

      const updated = await storage.updateComplaint(id, {
        status: "completed",
        resolutionNotes: resolutionNotes || null,
      });

      await db
        .update(complaints)
        .set({ resolvedAt: new Date(), completedAt: new Date(), feedbackToken })
        .where(eq(complaints.id, id));

      const complaint = await storage.getComplaint(id);
      let whatsappLink = "";
      let whatsappSent = false;
      if (complaint && complaint.customer) {
        const typeLabels: Record<string, string> = {
          no_internet: "No Internet",
          slow_internet: "Slow Internet",
          red_light: "Red Light",
          wire_damage: "Wire Damage",
          modem_dead: "Modem Dead",
          modem_replacement: "Modem Replacement",
          other: "Other",
        };
        const typeName = typeLabels[complaint.complaintType] || complaint.complaintType;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const feedbackUrl = `${baseUrl}/feedback/${feedbackToken}`;

        const notifToken = await createNotification(
          "complaint_completed",
          complaint.customer.name,
          complaint.customer.contact,
          "Complaint Resolved",
          `Assalam o Alaikum ${complaint.customer.name}! 😊\n\nGreat news! Your complaint #${complaint.id} (${typeName}) has been successfully resolved. ✅`,
          `${complaint.assignedTo ? `Resolved by: ${complaint.assignedTo}` : ""}${resolutionNotes ? `\nNotes: ${resolutionNotes}` : ""}\n\nWe'd love to hear how we did! Please share your feedback:\n${feedbackUrl}`
        );

        const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

        const message = `Assalam o Alaikum ${complaint.customer.name}! 😊\n\nGreat news! Your complaint #${complaint.id} (${typeName}) has been resolved. ✅\n${complaint.assignedTo ? `Resolved by: ${complaint.assignedTo}\n` : ""}${resolutionNotes ? `Notes: ${resolutionNotes}\n` : ""}\nPlease rate our service:\n${feedbackUrl}\n\nThank you! 🙏\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;
        const waResult = sendWhatsAppMessageInBackground(complaint.customer.contact, message);
        whatsappLink = waResult.whatsappLink || "";
        whatsappSent = waResult.sent;
      }

      res.json({ complaint, whatsappLink, whatsappSent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/complaints/:id/whatsapp-open", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });

    const complaint = await storage.getComplaint(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const customer = complaint.customer;
    if (!customer) return res.status(400).json({ message: "Customer not found" });

    const typeLabels: Record<string, string> = {
      no_internet: "No Internet",
      slow_internet: "Slow Internet",
      red_light: "Red Light",
      wire_damage: "Wire Damage",
      modem_dead: "Modem Dead",
      modem_replacement: "Modem Replacement",
      other: "Other",
    };
    const typeName = typeLabels[complaint.complaintType] || complaint.complaintType;

    const notifToken = await createNotification(
      "complaint_registered",
      customer.name,
      customer.contact,
      "Complaint Reopened",
      `Assalam o Alaikum ${customer.name}! 😊\n\nWe're sorry your issue wasn't fully resolved. Your complaint has been reopened.`,
      `Complaint #: ${complaint.id}\nType: ${typeName}${complaint.description ? `\nDetails: ${complaint.description}` : ""}\n\nOur team will take care of it right away and make sure it's fixed properly this time.`
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const notifUrl = `${baseUrl}/api/public/notification/${notifToken}`;

    const message = `Assalam o Alaikum ${customer.name}! 😊\n\nWe're sorry to hear that your issue wasn't fully resolved. Your complaint has been reopened and our team will take care of it right away.\n\nComplaint #: ${complaint.id}\nType: ${typeName}\n\nView details:\n${notifUrl}\n\nWe appreciate your patience and we'll make sure this gets fixed properly this time. You'll receive an update once it's done.\n\nNeed any help? Contact us anytime:\n📞 0307-8844421 | 0327-0223873\n\nThank you! 🙏\nStorm Fiber Pattoki`;
    const waResult = sendWhatsAppMessageInBackground(customer.contact, message);

    await storage.updateComplaint(id, { whatsappSentOpen: true });
    res.json({ complaint, whatsappLink: waResult.whatsappLink || "", whatsappSent: waResult.sent });
  });

  app.patch("/api/complaints/:id/whatsapp-complete", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid complaint ID" });
    const complaint = await storage.updateComplaint(id, { whatsappSentComplete: true });
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json(complaint);
  });

  // Complaint Feedback
  app.post("/api/complaints/:id/feedback", async (req, res) => {
    try {
      const complaintId = Number(req.params.id);
      if (isNaN(complaintId)) return res.status(400).json({ message: "Invalid complaint ID" });

      const existing = await storage.getComplaintFeedback(complaintId);
      if (existing) return res.status(400).json({ message: "Feedback already submitted for this complaint" });

      const parsed = insertComplaintFeedbackSchema.safeParse({
        ...req.body,
        complaintId,
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const feedback = await storage.createComplaintFeedback(parsed.data);

      await storage.updateComplaint(complaintId, { status: "closed" });

      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Customer complaints
  app.get("/api/customers/:id/complaints", async (req, res) => {
    const customerId = Number(req.params.id);
    if (isNaN(customerId)) return res.status(400).json({ message: "Invalid customer ID" });
    const customerComplaints = await storage.getCustomerComplaints(customerId);
    res.json(customerComplaints);
  });

  // ======= PUBLIC FEEDBACK ROUTES (no auth) =======

  app.get("/api/public/feedback/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [row] = await db.select().from(complaints).where(eq(complaints.feedbackToken, token));
      if (!row) return res.status(404).json({ message: "Feedback link not found or expired" });

      const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId));
      const [feedback] = await db.select().from(complaintFeedback).where(eq(complaintFeedback.complaintId, row.id));

      res.json({
        complaintId: row.id,
        complaintType: row.complaintType,
        customerName: customer?.name || "Customer",
        assignedTo: row.assignedTo,
        resolutionNotes: row.resolutionNotes,
        hasFeedback: !!feedback,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/public/feedback/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [row] = await db.select().from(complaints).where(eq(complaints.feedbackToken, token));
      if (!row) return res.status(404).json({ message: "Feedback link not found or expired" });

      if (row.status !== "completed") {
        return res.status(400).json({ message: "Feedback can only be submitted for completed complaints" });
      }

      const existing = await storage.getComplaintFeedback(row.id);
      if (existing) return res.status(400).json({ message: "Feedback already submitted for this complaint" });

      const parsed = insertComplaintFeedbackSchema.safeParse({
        complaintId: row.id,
        agentRating: Number(req.body.agentRating),
        serviceRating: Number(req.body.serviceRating),
        comments: req.body.comments || null,
      });
      if (!parsed.success) return res.status(400).json({ message: "Please provide valid agent and service ratings (1-5)" });

      const feedback = await storage.createComplaintFeedback(parsed.data);

      await storage.updateComplaint(row.id, { status: "closed" });

      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PUBLIC CONNECTION FEEDBACK =======

  app.get("/api/public/connection-feedback/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [row] = await db.select().from(connectionRequests).where(eq(connectionRequests.feedbackToken, token));
      if (!row) return res.status(404).json({ message: "Feedback link not found or expired" });

      const existing = await storage.getConnectionFeedback(row.id);

      let fieldWorkerName = null;
      if (row.fieldWorkerId) {
        const [fw] = await db.select().from(employees).where(eq(employees.id, row.fieldWorkerId));
        if (fw) fieldWorkerName = `${fw.firstName} ${fw.lastName}`;
      }

      res.json({
        connectionRequestId: row.id,
        customerName: row.customerName,
        fieldWorkerName,
        hasFeedback: !!existing,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/public/connection-feedback/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [row] = await db.select().from(connectionRequests).where(eq(connectionRequests.feedbackToken, token));
      if (!row) return res.status(404).json({ message: "Feedback link not found or expired" });

      if (row.status !== "completed") {
        return res.status(400).json({ message: "Feedback can only be submitted for completed connections" });
      }

      const existing = await storage.getConnectionFeedback(row.id);
      if (existing) return res.status(400).json({ message: "Feedback already submitted for this connection" });

      const parsed = insertConnectionFeedbackSchema.safeParse({
        connectionRequestId: row.id,
        fieldWorkerRating: Number(req.body.fieldWorkerRating),
        serviceRating: Number(req.body.serviceRating),
        comments: req.body.comments || null,
      });
      if (!parsed.success) return res.status(400).json({ message: "Please provide valid field worker and service ratings (1-5)" });

      const feedback = await storage.createConnectionFeedback(parsed.data);
      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PUBLIC NOTIFICATION PAGE =======

  app.get("/api/public/notification/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.token, token));
      if (!notification) {
        return res.status(404).send("<h1>Notification not found</h1>");
      }
      res.setHeader("Content-Type", "text/html");
      res.send(getNotificationPageHtml(notification));
    } catch (error: any) {
      res.status(500).send("<h1>Error</h1>");
    }
  });

  // ======= EMPLOYEE MANAGEMENT SYSTEM =======

  // ======= DEPARTMENTS =======

  app.get("/api/departments", async (_req, res) => {
    try {
      const results = await storage.getAllDepartments();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/departments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid department ID" });
      const dept = await storage.getDepartment(id);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      res.json(dept);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const parsed = insertDepartmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const dept = await storage.createDepartment(parsed.data);
      res.status(201).json(dept);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/departments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid department ID" });
      const parsed = insertDepartmentSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const dept = await storage.updateDepartment(id, parsed.data);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      res.json(dept);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid department ID" });
      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= DESIGNATIONS =======

  app.get("/api/designations", async (_req, res) => {
    try {
      const results = await storage.getAllDesignations();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/designations/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid designation ID" });
      const desig = await storage.getDesignation(id);
      if (!desig) return res.status(404).json({ message: "Designation not found" });
      res.json(desig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/designations", async (req, res) => {
    try {
      const parsed = insertDesignationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const desig = await storage.createDesignation(parsed.data);
      res.status(201).json(desig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/designations/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid designation ID" });
      const parsed = insertDesignationSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const desig = await storage.updateDesignation(id, parsed.data);
      if (!desig) return res.status(404).json({ message: "Designation not found" });
      res.json(desig);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/designations/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid designation ID" });
      await storage.deleteDesignation(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= EMPLOYEES =======

  app.get("/api/employees", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      if (search && search.trim()) {
        const results = await storage.searchEmployees(search.trim());
        return res.json(results);
      }
      const results = await storage.getAllEmployees();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employees/stats", async (_req, res) => {
    try {
      const stats = await storage.getEmployeeStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid employee ID" });
      const emp = await storage.getEmployee(id);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      res.json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const parsed = insertEmployeeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const emp = await storage.createEmployee(parsed.data);
      res.status(201).json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid employee ID" });
      const parsed = insertEmployeeSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const emp = await storage.updateEmployee(id, parsed.data);
      if (!emp) return res.status(404).json({ message: "Employee not found" });
      res.json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid employee ID" });
      await storage.deleteEmployee(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= EMERGENCY CONTACTS =======

  app.get("/api/employees/:employeeId/emergency-contacts", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const contacts = await storage.getEmployeeEmergencyContacts(employeeId);
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employees/:employeeId/emergency-contacts", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const parsed = insertEmergencyContactSchema.safeParse({ ...req.body, employeeId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const contact = await storage.createEmergencyContact(parsed.data);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/employees/:employeeId/emergency-contacts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid contact ID" });
      await storage.deleteEmergencyContact(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= EMPLOYEE DOCUMENTS =======

  app.get("/api/employees/:employeeId/documents", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const docs = await storage.getEmployeeDocuments(employeeId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employees/:employeeId/documents", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const parsed = insertEmployeeDocumentSchema.safeParse({ ...req.body, employeeId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const doc = await storage.createEmployeeDocument(parsed.data);
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/employees/:employeeId/documents/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });
      await storage.deleteEmployeeDocument(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= ATTENDANCE =======

  app.get("/api/attendance", async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      if (!date) return res.status(400).json({ message: "date query parameter is required" });
      const results = await storage.getAttendanceByDate(date);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/attendance/stats", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      if (!month || !year || isNaN(year)) return res.status(400).json({ message: "month and year query parameters are required" });
      const stats = await storage.getAttendanceStats(month, year);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/attendance/monthly-deductions", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      if (!month || !year || isNaN(year)) return res.status(400).json({ message: "month and year query parameters are required" });
      const deductions = await storage.getMonthlyAttendanceDeductions(month, year);
      res.json(deductions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/attendance/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const results = await storage.getEmployeeAttendance(employeeId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const parsed = insertAttendanceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const attData = { ...parsed.data };
      const emp = await storage.getEmployee(attData.employeeId);
      if (emp) {
        if (attData.checkIn && attData.status === "late") {
          const lateCalc = calculateLateFine(attData.checkIn, emp.basicSalary);
          attData.lateMinutes = lateCalc.lateMinutes;
          attData.fineAmount = lateCalc.fineAmount;
        }
        if (attData.checkOut) {
          const otCalc = calculateOvertime(attData.checkOut, emp.basicSalary);
          attData.overtimeMinutes = otCalc.overtimeMinutes;
          attData.overtimeReward = otCalc.overtimeReward;
        }
      }

      const att = await storage.markAttendance(attData);

      if (emp) {
        const empPhone = emp.whatsappNumber || emp.contact;
        const empName = `${emp.firstName} ${emp.lastName}`;

        if (att.status === "late" && att.fineAmount && att.fineAmount > 0) {
          const fineDetails = `📅 Date: ${att.date}\n⏰ Check-in: ${att.checkIn || "N/A"}\n⏱️ Late by: ${att.lateMinutes} minutes\n💸 Fine Amount: Rs. ${att.fineAmount}\n\nOffice time is 9:00 AM. Please arrive on time to avoid fines.`;
          buildAndSendSalarySummary(att.employeeId, "fine", fineDetails);
        } else if (att.status === "absent") {
          const absentMsg = `Assalam o Alaikum ${empName}! 👋\n\nThis is to inform you that you have been marked absent today without prior permission.\n\n📅 Date: ${att.date}\n❌ Status: Absent\n\nPlease note that unauthorized absences will result in salary deduction (1 day salary). If this was an emergency, please contact HR immediately.\n\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;
          sendWhatsAppMessageInBackground(empPhone, absentMsg);
        }

        if (att.overtimeMinutes && att.overtimeMinutes > 0 && att.overtimeReward && att.overtimeReward > 0) {
          const otHrs = Math.floor(att.overtimeMinutes / 60);
          const otMins = att.overtimeMinutes % 60;
          const otMsg = `Assalam o Alaikum ${empName}! 🌟\n\nGreat job! You worked overtime today and earned an extra reward.\n\n📅 Date: ${att.date}\n⏰ Check-out: ${att.checkOut || "N/A"}\n⏱️ Overtime: ${otHrs > 0 ? `${otHrs} hr ` : ""}${otMins} min\n💰 Overtime Reward: Rs. ${att.overtimeReward}\n\nThis will be added to your monthly salary. Thank you for your dedication! 💪\n\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;
          sendWhatsAppMessageInBackground(empPhone, otMsg);
        }
      }

      res.status(201).json(att);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/attendance/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid attendance ID" });
      const parsed = insertAttendanceSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const updateData = { ...parsed.data };
      const existingAtt = await storage.getAttendanceById(id);
      if (existingAtt) {
        const emp = await storage.getEmployee(existingAtt.employeeId);
        if (emp) {
          const checkInVal = updateData.checkIn || existingAtt.checkIn;
          const statusVal = updateData.status || existingAtt.status;
          if (checkInVal && statusVal === "late") {
            const lateCalc = calculateLateFine(checkInVal, emp.basicSalary);
            updateData.lateMinutes = lateCalc.lateMinutes;
            updateData.fineAmount = lateCalc.fineAmount;
          }
          if (updateData.checkOut) {
            const otCalc = calculateOvertime(updateData.checkOut, emp.basicSalary);
            updateData.overtimeMinutes = otCalc.overtimeMinutes;
            updateData.overtimeReward = otCalc.overtimeReward;
          }
        }
      }

      const att = await storage.updateAttendance(id, updateData);
      if (!att) return res.status(404).json({ message: "Attendance record not found" });

      if (att.overtimeMinutes && att.overtimeMinutes > 0 && att.overtimeReward && att.overtimeReward > 0) {
        const emp = await storage.getEmployee(att.employeeId);
        if (emp) {
          const empPhone = emp.whatsappNumber || emp.contact;
          const empName = `${emp.firstName} ${emp.lastName}`;
          const otHrs = Math.floor(att.overtimeMinutes / 60);
          const otMins = att.overtimeMinutes % 60;
          const otMsg = `Assalam o Alaikum ${empName}! 🌟\n\nGreat job! You worked overtime today and earned an extra reward.\n\n📅 Date: ${att.date}\n⏰ Check-out: ${att.checkOut || "N/A"}\n⏱️ Overtime: ${otHrs > 0 ? `${otHrs} hr ` : ""}${otMins} min\n💰 Overtime Reward: Rs. ${att.overtimeReward}\n\nThis will be added to your monthly salary. Thank you for your dedication! 💪\n\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;
          sendWhatsAppMessageInBackground(empPhone, otMsg);
        }
      }

      res.json(att);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid attendance ID" });
      const existing = await storage.getAttendanceById(id);
      if (!existing) return res.status(404).json({ message: "Attendance record not found" });
      await storage.deleteAttendance(id);
      res.json({ message: "Attendance record deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= LEAVE TYPE CONFIGS =======

  app.get("/api/leave-types", async (_req, res) => {
    try {
      const results = await storage.getAllLeaveTypeConfigs();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-types", async (req, res) => {
    try {
      const parsed = insertLeaveTypeConfigSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const config = await storage.createLeaveTypeConfig(parsed.data);
      res.status(201).json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leave-types/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid leave type ID" });
      const parsed = insertLeaveTypeConfigSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const config = await storage.updateLeaveTypeConfig(id, parsed.data);
      if (!config) return res.status(404).json({ message: "Leave type config not found" });
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= LEAVE REQUESTS =======

  app.get("/api/leave-requests", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
      const results = await storage.getAllLeaveRequests({ status, employeeId });
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leave-requests/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const results = await storage.getEmployeeLeaveRequests(employeeId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leave-requests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid leave request ID" });
      const request = await storage.getLeaveRequest(id);
      if (!request) return res.status(404).json({ message: "Leave request not found" });
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-requests", async (req, res) => {
    try {
      const parsed = insertLeaveRequestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const request = await storage.createLeaveRequest(parsed.data);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leave-requests/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid leave request ID" });
      const parsed = insertLeaveRequestSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const request = await storage.updateLeaveRequest(id, parsed.data);
      if (!request) return res.status(404).json({ message: "Leave request not found" });
      res.json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= LEAVE BALANCES =======

  app.get("/api/leave-balances/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const year = req.query.year ? Number(req.query.year) : undefined;
      if (!year || isNaN(year)) return res.status(400).json({ message: "year query parameter is required" });
      const balances = await storage.getEmployeeLeaveBalances(employeeId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-balances", async (req, res) => {
    try {
      const parsed = insertLeaveBalanceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const balance = await storage.createLeaveBalance(parsed.data);
      res.status(201).json(balance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leave-balances/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid leave balance ID" });
      const parsed = insertLeaveBalanceSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const balance = await storage.updateLeaveBalance(id, parsed.data);
      if (!balance) return res.status(404).json({ message: "Leave balance not found" });
      res.json(balance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= SALARY STRUCTURES =======

  app.get("/api/salary-structures/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const structure = await storage.getSalaryStructure(employeeId);
      if (!structure) return res.status(404).json({ message: "Salary structure not found" });
      res.json(structure);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/salary-structures", async (req, res) => {
    try {
      const parsed = insertSalaryStructureSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const structure = await storage.createSalaryStructure(parsed.data);
      res.status(201).json(structure);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/salary-structures/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid salary structure ID" });
      const parsed = insertSalaryStructureSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const structure = await storage.updateSalaryStructure(id, parsed.data);
      if (!structure) return res.status(404).json({ message: "Salary structure not found" });
      res.json(structure);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PAYROLL =======

  app.get("/api/payroll", async (_req, res) => {
    try {
      const runs = await storage.getAllPayrollRuns();
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payroll run ID" });
      const run = await storage.getPayrollRun(id);
      if (!run) return res.status(404).json({ message: "Payroll run not found" });
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payroll", async (req, res) => {
    try {
      const parsed = insertPayrollRunSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const run = await storage.createPayrollRun(parsed.data);
      res.status(201).json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payroll/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payroll run ID" });
      const parsed = insertPayrollRunSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const run = await storage.updatePayrollRun(id, parsed.data);
      if (!run) return res.status(404).json({ message: "Payroll run not found" });
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payroll/:id/payslips", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payroll run ID" });
      const slips = await storage.getPayrollPayslips(id);
      res.json(slips);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PAYSLIPS =======

  app.get("/api/payslips/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const slips = await storage.getEmployeePayslips(employeeId);
      res.json(slips);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payslips", async (req, res) => {
    try {
      const parsed = insertPayslipSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const slip = await storage.createPayslip(parsed.data);
      res.status(201).json(slip);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/payslips/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid payslip ID" });
      const parsed = insertPayslipSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const slip = await storage.updatePayslip(id, parsed.data);
      if (!slip) return res.status(404).json({ message: "Payslip not found" });
      res.json(slip);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= SALARY ADVANCES =======

  app.get("/api/salary-advances", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const advances = await storage.getSalaryAdvances(month);
      res.json(advances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/salary-advances/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const month = req.query.month as string | undefined;
      const advances = await storage.getEmployeeSalaryAdvances(employeeId, month);
      res.json(advances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/salary-advances", async (req, res) => {
    try {
      const parsed = insertSalaryAdvanceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const advance = await storage.createSalaryAdvance(parsed.data);

      const advDetails = `📅 Date: ${advance.advanceDate}\n💰 Advance Amount: Rs. ${(advance.amount || 0).toLocaleString()}${advance.description ? `\n📝 Note: ${advance.description}` : ""}`;
      buildAndSendSalarySummary(advance.employeeId, "advance", advDetails);

      res.status(201).json(advance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/salary-advances/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid advance ID" });
      const parsed = insertSalaryAdvanceSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const advance = await storage.updateSalaryAdvance(id, parsed.data);
      if (!advance) return res.status(404).json({ message: "Advance not found" });
      res.json(advance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/salary-advances/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid advance ID" });
      await storage.deleteSalaryAdvance(id);
      res.json({ message: "Advance deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= EMPLOYEE COMMISSIONS =======

  app.get("/api/employee-commissions", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const commissions = await storage.getEmployeeCommissions(month);
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employee-commissions", async (req, res) => {
    try {
      const parsed = insertEmployeeCommissionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const commission = await storage.createEmployeeCommission(parsed.data);

      const commDetails = `🏷️ Commission: ${commission.commissionName}\n💰 Amount: Rs. ${(commission.amount || 0).toLocaleString()}${commission.description ? `\n📝 Note: ${commission.description}` : ""}`;
      buildAndSendSalarySummary(commission.employeeId, "commission", commDetails);

      res.status(201).json(commission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/employee-commissions/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid commission ID" });
      await storage.deleteEmployeeCommission(id);
      res.json({ message: "Commission deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= SALARY SLIP WHATSAPP =======

  const salarySlipWhatsAppSchema = z.object({
    employeeId: z.number({ coerce: true }).int().positive(),
    month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  });

  app.post("/api/salary-slip/send-whatsapp", async (req, res) => {
    try {
      const parsed = salarySlipWhatsAppSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const { employeeId, month } = parsed.data;

      const emp = await storage.getEmployee(employeeId);
      if (!emp) return res.status(404).json({ message: "Employee not found" });

      const empPhone = emp.whatsappNumber || emp.contact;
      if (!empPhone) return res.status(400).json({ message: "Employee has no phone number" });

      const empName = `${emp.firstName} ${emp.lastName}`;
      const [yearStr, monthStr] = month.split("-");
      const yearNum = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const monthLabel = new Date(yearNum, monthNum - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

      const salaryStruct = await storage.getSalaryStructure(employeeId);
      const basicSalary = salaryStruct?.basicSalary || emp.basicSalary || 0;
      const grossSalary = salaryStruct?.grossSalary || basicSalary;
      const houseAllowance = salaryStruct?.houseAllowance || 0;
      const transportAllowance = salaryStruct?.transportAllowance || 0;
      const medicalAllowance = salaryStruct?.medicalAllowance || 0;
      const otherAllowances = salaryStruct?.otherAllowances || 0;
      const taxDeduction = salaryStruct?.taxDeduction || 0;
      const pfDeduction = salaryStruct?.pfDeduction || 0;
      const otherDeductions = salaryStruct?.otherDeductions || 0;
      const netSalary = salaryStruct?.netSalary || basicSalary;

      const advances = await storage.getSalaryAdvances(month);
      const empAdvances = advances.filter(a => a.employeeId === employeeId && (a as any).status !== "cancelled");
      const totalAdvances = empAdvances.reduce((sum, a) => sum + (a.amount || 0), 0);

      const commissions = await storage.getEmployeeCommissions(month);
      const empCommissions = commissions.filter(c => c.employeeId === employeeId);
      const totalCommissions = empCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);

      const deductions = await storage.getMonthlyAttendanceDeductions(String(monthNum), yearNum);
      const empDeduction = deductions.find(d => d.employeeId === employeeId);
      const totalFines = empDeduction?.totalFines || 0;
      const absentDays = empDeduction?.absentDays || 0;
      const lateDays = empDeduction?.lateDays || 0;
      const totalOTReward = empDeduction?.totalOvertimeReward || 0;

      const perDaySalary = Math.round(netSalary / 30);
      const absentDeduction = absentDays * perDaySalary;
      const totalDeductionsAmt = totalAdvances + totalFines + absentDeduction + taxDeduction + pfDeduction + otherDeductions;
      const netPayable = grossSalary - totalDeductionsAmt + totalCommissions + totalOTReward;

      let earningsSection = `💵 Basic Salary: Rs. ${basicSalary.toLocaleString()}`;
      if (houseAllowance > 0) earningsSection += `\n   • House Allowance: Rs. ${houseAllowance.toLocaleString()}`;
      if (transportAllowance > 0) earningsSection += `\n   • Transport Allowance: Rs. ${transportAllowance.toLocaleString()}`;
      if (medicalAllowance > 0) earningsSection += `\n   • Medical Allowance: Rs. ${medicalAllowance.toLocaleString()}`;
      if (otherAllowances > 0) earningsSection += `\n   • Other Allowances: Rs. ${otherAllowances.toLocaleString()}`;
      earningsSection += `\n   Gross Salary: Rs. ${grossSalary.toLocaleString()}`;

      let deductionLines = "";
      if (taxDeduction > 0) deductionLines += `   • Tax: Rs. ${taxDeduction.toLocaleString()}\n`;
      if (pfDeduction > 0) deductionLines += `   • PF: Rs. ${pfDeduction.toLocaleString()}\n`;
      if (otherDeductions > 0) deductionLines += `   • Other: Rs. ${otherDeductions.toLocaleString()}\n`;

      let commissionLines = "";
      if (empCommissions.length > 0) {
        commissionLines = empCommissions.map(c => `      • ${c.commissionName}: Rs. ${(c.amount || 0).toLocaleString()}`).join("\n");
      }

      const msg = `Assalam o Alaikum ${empName}! 👋\n\n📄 SALARY SLIP - ${monthLabel}\n━━━━━━━━━━━━━━━━━━━━\n\n${earningsSection}\n\n📉 DEDUCTIONS:\n${deductionLines}   • Advances: Rs. ${totalAdvances.toLocaleString()}${empAdvances.length > 0 ? ` (${empAdvances.length} advance${empAdvances.length > 1 ? "s" : ""})` : ""}\n   • Late Fines: Rs. ${totalFines.toLocaleString()}${lateDays > 0 ? ` (${lateDays} day${lateDays > 1 ? "s" : ""})` : ""}\n   • Absent Deduction: Rs. ${absentDeduction.toLocaleString()}${absentDays > 0 ? ` (${absentDays} day${absentDays > 1 ? "s" : ""} × Rs. ${perDaySalary})` : ""}\n   ─────────────────\n   Total Deductions: Rs. ${totalDeductionsAmt.toLocaleString()}\n\n📈 ADDITIONS:\n   • Commissions: Rs. ${totalCommissions.toLocaleString()}${empCommissions.length > 0 ? ` (${empCommissions.length})` : ""}\n${commissionLines ? commissionLines + "\n" : ""}   • OT Reward: Rs. ${totalOTReward.toLocaleString()}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ NET PAYABLE: Rs. ${netPayable.toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━\n\nThis is your salary slip for ${monthLabel}.\nFor any queries, please contact HR.\n\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;

      const result = await sendWhatsAppMessage(empPhone, msg);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= PERFORMANCE =======

  app.get("/api/performance/cycles", async (_req, res) => {
    try {
      const cycles = await storage.getAllPerformanceCycles();
      res.json(cycles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/performance/cycles", async (req, res) => {
    try {
      const parsed = insertPerformanceCycleSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const cycle = await storage.createPerformanceCycle(parsed.data);
      res.status(201).json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/performance/cycles/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid performance cycle ID" });
      const parsed = insertPerformanceCycleSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const cycle = await storage.updatePerformanceCycle(id, parsed.data);
      if (!cycle) return res.status(404).json({ message: "Performance cycle not found" });
      res.json(cycle);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/performance/reviews", async (req, res) => {
    try {
      const cycleId = req.query.cycleId ? Number(req.query.cycleId) : undefined;
      const reviews = await storage.getPerformanceReviews(cycleId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/performance/reviews/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = Number(req.params.employeeId);
      if (isNaN(employeeId)) return res.status(400).json({ message: "Invalid employee ID" });
      const reviews = await storage.getEmployeeReviews(employeeId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/performance/reviews", async (req, res) => {
    try {
      const parsed = insertPerformanceReviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const review = await storage.createPerformanceReview(parsed.data);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/performance/reviews/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid performance review ID" });
      const parsed = insertPerformanceReviewSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const review = await storage.updatePerformanceReview(id, parsed.data);
      if (!review) return res.status(404).json({ message: "Performance review not found" });
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= RECRUITMENT - JOB OPENINGS =======

  app.get("/api/recruitment/jobs", async (_req, res) => {
    try {
      const jobs = await storage.getAllJobOpenings();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recruitment/jobs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid job opening ID" });
      const job = await storage.getJobOpening(id);
      if (!job) return res.status(404).json({ message: "Job opening not found" });
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recruitment/jobs", async (req, res) => {
    try {
      const parsed = insertJobOpeningSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const job = await storage.createJobOpening(parsed.data);
      res.status(201).json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/recruitment/jobs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid job opening ID" });
      const parsed = insertJobOpeningSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const job = await storage.updateJobOpening(id, parsed.data);
      if (!job) return res.status(404).json({ message: "Job opening not found" });
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= RECRUITMENT - CANDIDATES =======

  app.get("/api/recruitment/candidates", async (req, res) => {
    try {
      const jobOpeningId = req.query.jobOpeningId ? Number(req.query.jobOpeningId) : undefined;
      const results = await storage.getCandidates(jobOpeningId);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recruitment/candidates/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid candidate ID" });
      const candidate = await storage.getCandidate(id);
      if (!candidate) return res.status(404).json({ message: "Candidate not found" });
      res.json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/recruitment/candidates", async (req, res) => {
    try {
      const parsed = insertCandidateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const candidate = await storage.createCandidate(parsed.data);
      res.status(201).json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/recruitment/candidates/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid candidate ID" });
      const parsed = insertCandidateSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const candidate = await storage.updateCandidate(id, parsed.data);
      if (!candidate) return res.status(404).json({ message: "Candidate not found" });
      res.json(candidate);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= TRAINING =======

  app.get("/api/training", async (_req, res) => {
    try {
      const results = await storage.getAllTrainings();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training/enrollments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid enrollment ID" });
      res.status(200).json({ id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/training/enrollments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid enrollment ID" });
      const parsed = insertTrainingEnrollmentSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const enrollment = await storage.updateTrainingEnrollment(id, parsed.data);
      if (!enrollment) return res.status(404).json({ message: "Training enrollment not found" });
      res.json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid training ID" });
      const training = await storage.getTraining(id);
      if (!training) return res.status(404).json({ message: "Training not found" });
      res.json(training);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/training", async (req, res) => {
    try {
      const parsed = insertTrainingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const training = await storage.createTraining(parsed.data);
      res.status(201).json(training);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/training/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid training ID" });
      const parsed = insertTrainingSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const training = await storage.updateTraining(id, parsed.data);
      if (!training) return res.status(404).json({ message: "Training not found" });
      res.json(training);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/training/:id/enrollments", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid training ID" });
      const enrollments = await storage.getTrainingEnrollments(id);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/training/:id/enrollments", async (req, res) => {
    try {
      const trainingId = Number(req.params.id);
      if (isNaN(trainingId)) return res.status(400).json({ message: "Invalid training ID" });
      const parsed = insertTrainingEnrollmentSchema.safeParse({ ...req.body, trainingId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const enrollment = await storage.createTrainingEnrollment(parsed.data);
      res.status(201).json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= ASSETS =======

  app.get("/api/assets", async (_req, res) => {
    try {
      const results = await storage.getAllAssets();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid asset ID" });
      const asset = await storage.getAsset(id);
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const parsed = insertAssetSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const asset = await storage.createAsset(parsed.data);
      res.status(201).json(asset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid asset ID" });
      const parsed = insertAssetSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const asset = await storage.updateAsset(id, parsed.data);
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      res.json(asset);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= ANNOUNCEMENTS =======

  app.get("/api/announcements", async (_req, res) => {
    try {
      const results = await storage.getAllAnnouncements();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    try {
      const parsed = insertAnnouncementSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const announcement = await storage.createAnnouncement(parsed.data);
      res.status(201).json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid announcement ID" });
      const parsed = insertAnnouncementSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const announcement = await storage.updateAnnouncement(id, parsed.data);
      if (!announcement) return res.status(404).json({ message: "Announcement not found" });
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid announcement ID" });
      await storage.deleteAnnouncement(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= POLICIES =======

  app.get("/api/policies", async (_req, res) => {
    try {
      const results = await storage.getAllPolicies();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/policies/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid policy ID" });
      const policy = await storage.getPolicy(id);
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/policies", async (req, res) => {
    try {
      const parsed = insertPolicySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const policy = await storage.createPolicy(parsed.data);
      res.status(201).json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/policies/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid policy ID" });
      const parsed = insertPolicySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const policy = await storage.updatePolicy(id, parsed.data);
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/policies/:id/acknowledgements", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid policy ID" });
      const acks = await storage.getPolicyAcknowledgements(id);
      res.json(acks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/policies/:id/acknowledgements", async (req, res) => {
    try {
      const policyId = Number(req.params.id);
      if (isNaN(policyId)) return res.status(400).json({ message: "Invalid policy ID" });
      const parsed = insertPolicyAcknowledgementSchema.safeParse({ ...req.body, policyId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const ack = await storage.createPolicyAcknowledgement(parsed.data);
      res.status(201).json(ack);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= HOLIDAYS =======

  app.get("/api/holidays", async (req, res) => {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined;
      const results = await storage.getHolidays(year);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const parsed = insertHolidaySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const holiday = await storage.createHoliday(parsed.data);
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/holidays/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid holiday ID" });
      const parsed = insertHolidaySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const holiday = await storage.updateHoliday(id, parsed.data);
      if (!holiday) return res.status(404).json({ message: "Holiday not found" });
      res.json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid holiday ID" });
      await storage.deleteHoliday(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= WORKING HOURS =======

  app.get("/api/working-hours", async (_req, res) => {
    try {
      const config = await storage.getWorkingHoursConfig();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/working-hours", async (req, res) => {
    try {
      const parsed = insertWorkingHoursConfigSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const config = await storage.upsertWorkingHoursConfig(parsed.data);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= AUDIT LOGS =======

  app.get("/api/audit-logs", async (req, res) => {
    try {
      const entity = req.query.entity as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const logs = await storage.getAuditLogs({ entity, limit });
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const parsed = insertAuditLogSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const log = await storage.createAuditLog(parsed.data);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ======= STOCK MANAGEMENT ROUTES =======

  app.get("/api/stock-items", async (req, res) => {
    const items = await storage.getAllStockItems();
    res.json(items);
  });

  app.get("/api/stock-items/:id", async (req, res) => {
    const item = await storage.getStockItem(parseInt(req.params.id));
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.post("/api/stock-items", async (req, res) => {
    const parsed = insertStockItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const item = await storage.createStockItem(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/stock-items/:id", async (req, res) => {
    const item = await storage.updateStockItem(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json(item);
  });

  app.delete("/api/stock-items/:id", async (req, res) => {
    await storage.deleteStockItem(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/stock-issues", async (req, res) => {
    const stockItemId = req.query.stockItemId ? parseInt(req.query.stockItemId as string) : undefined;
    const issues = await storage.getAllStockIssues(stockItemId);
    res.json(issues);
  });

  app.post("/api/stock-issues", async (req, res) => {
    const parsed = insertStockIssueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const stockItem = await storage.getStockItem(parsed.data.stockItemId);
    if (!stockItem) return res.status(404).json({ message: "Stock item not found" });
    if (stockItem.remainingQuantity < parsed.data.quantity) {
      return res.status(400).json({ message: `Not enough stock. Available: ${stockItem.remainingQuantity}` });
    }
    const issue = await storage.createStockIssue(parsed.data);
    res.status(201).json(issue);
  });

  app.delete("/api/stock-issues/:id", async (req, res) => {
    await storage.deleteStockIssue(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= STOCK RETURNS =======

  app.get("/api/stock-returns", async (req, res) => {
    const stockItemId = req.query.stockItemId ? parseInt(req.query.stockItemId as string) : undefined;
    const returns = await storage.getAllStockReturns(stockItemId);
    res.json(returns);
  });

  app.post("/api/stock-returns", async (req, res) => {
    const parsed = insertStockReturnSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const stockItem = await storage.getStockItem(parsed.data.stockItemId);
    if (!stockItem) return res.status(404).json({ message: "Stock item not found" });
    const ret = await storage.createStockReturn(parsed.data);
    res.status(201).json(ret);
  });

  app.delete("/api/stock-returns/:id", async (req, res) => {
    await storage.deleteStockReturn(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= STOCK DAMAGES =======

  app.get("/api/stock-damages", async (req, res) => {
    const stockItemId = req.query.stockItemId ? parseInt(req.query.stockItemId as string) : undefined;
    const damages = await storage.getAllStockDamages(stockItemId);
    res.json(damages);
  });

  app.post("/api/stock-damages", async (req, res) => {
    const parsed = insertStockDamageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const stockItem = await storage.getStockItem(parsed.data.stockItemId);
    if (!stockItem) return res.status(404).json({ message: "Stock item not found" });
    const damage = await storage.createStockDamage(parsed.data);
    res.status(201).json(damage);
  });

  app.delete("/api/stock-damages/:id", async (req, res) => {
    await storage.deleteStockDamage(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= DAILY INCOME & EXPENSE ENTRIES =======

  app.get("/api/daily-entries", async (req, res) => {
    const filters: any = {};
    if (req.query.date) filters.date = req.query.date as string;
    if (req.query.type) filters.type = req.query.type as string;
    const entries = await storage.getDailyEntries(filters);
    res.json(entries);
  });

  app.get("/api/daily-entries/report", async (req, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: "Date is required" });
    const report = await storage.getDailyReport(date);
    res.json(report);
  });

  app.post("/api/daily-entries", async (req, res) => {
    const parsed = insertDailyEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const entry = await storage.createDailyEntry(parsed.data);
    res.status(201).json(entry);
  });

  const EXPENSE_CATEGORY_ACCOUNT_MAP: Record<string, string> = {
    fuel: "5100",
    company_online: "5110",
    salaries_advances: "5120",
    bike_maintenance: "5130",
    stock_purchase: "5140",
    office_utilities: "5150",
    utility_bills: "5160",
    recoveries_losses: "5170",
    office_rent: "5180",
    repair_maintenance: "5190",
    other: "5070",
  };

  const INCOME_CATEGORY_ACCOUNT_MAP: Record<string, string> = {
    renewal: "4000",
    new_connection: "4010",
    extra_income: "4030",
  };

  app.patch("/api/daily-entries/:id", async (req, res) => {
    const entry = await storage.updateDailyEntry(parseInt(req.params.id), req.body);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  });

  app.delete("/api/daily-entries/:id", async (req, res) => {
    await storage.deleteDailyEntry(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= MONTH CLOSING SHEET =======

  app.get("/api/month-closing/:month", async (req, res) => {
    const month = req.params.month;
    const closing = await storage.getMonthClosing(month);
    res.json(closing || { month, openingBalance: 0 });
  });

  app.post("/api/month-closing", async (req, res) => {
    const { month, openingBalance } = req.body;
    if (!month) return res.status(400).json({ message: "Month is required" });
    const result = await storage.upsertMonthClosing({ month, openingBalance: openingBalance ?? 0 });
    res.json(result);
  });

  app.get("/api/month-closing/:month/summary", async (req, res) => {
    const month = req.params.month;
    const dailySummary = await storage.getMonthDailySummary(month);
    res.json(dailySummary);
  });

  app.get("/api/month-closing/:month/side-entries", async (req, res) => {
    const month = req.params.month;
    const entries = await storage.getMonthClosingSideEntries(month);
    res.json(entries);
  });

  app.post("/api/month-closing/side-entries", async (req, res) => {
    const { month, section, name, purpose, amount } = req.body;
    if (!month || !section || !name) return res.status(400).json({ message: "Month, section, and name are required" });
    const entry = await storage.createMonthClosingSideEntry({ month, section, name, purpose: purpose || null, amount: amount ?? 0 });
    res.status(201).json(entry);
  });

  app.delete("/api/month-closing/side-entries/:id", async (req, res) => {
    await storage.deleteMonthClosingSideEntry(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= RECEIVABLES / RECOVERY =======

  app.get("/api/receivables", async (req, res) => {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status as string;
    const items = await storage.getAllReceivables(filters);
    res.json(items);
  });

  app.get("/api/receivables/:id", async (req, res) => {
    const item = await storage.getReceivable(parseInt(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/receivables", async (req, res) => {
    const parsed = insertReceivableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const item = await storage.createReceivable(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/receivables/:id", async (req, res) => {
    const item = await storage.updateReceivable(parseInt(req.params.id), req.body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.delete("/api/receivables/:id", async (req, res) => {
    await storage.deleteReceivable(parseInt(req.params.id));
    res.status(204).send();
  });

  // ======= RECEIVABLE PAYMENTS =======

  app.get("/api/receivables/:id/payments", async (req, res) => {
    const payments = await storage.getReceivablePayments(parseInt(req.params.id));
    res.json(payments);
  });

  app.post("/api/receivables/:id/payments", async (req, res) => {
    const receivableId = parseInt(req.params.id);
    const receivable = await storage.getReceivable(receivableId);
    if (!receivable) return res.status(404).json({ message: "Receivable not found" });
    const payAmount = parseInt(req.body.amount);
    if (!payAmount || payAmount <= 0) return res.status(400).json({ message: "Amount must be greater than 0" });
    if (payAmount > receivable.remaining) return res.status(400).json({ message: `Amount exceeds remaining balance (Rs. ${receivable.remaining.toLocaleString()})` });
    const parsed = insertReceivablePaymentSchema.safeParse({ ...req.body, receivableId });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const payment = await storage.createReceivablePayment(parsed.data);
    const updated = await storage.getReceivable(receivableId);
    if (updated && updated.remaining <= 0 && updated.status !== "received") {
      await storage.updateReceivable(receivableId, { status: "received", receivedDate: req.body.date || new Date().toISOString().split("T")[0] });
    }
    res.status(201).json(payment);
  });

  app.delete("/api/receivable-payments/:id", async (req, res) => {
    const paymentId = parseInt(req.params.id);
    const payments = await storage.getReceivablePayments(0);
    const allReceivables = await storage.getAllReceivables();
    let receivableId: number | null = null;
    for (const rec of allReceivables) {
      const p = rec.payments.find(p => p.id === paymentId);
      if (p) { receivableId = rec.id; break; }
    }
    await storage.deleteReceivablePayment(paymentId);
    if (receivableId) {
      const updated = await storage.getReceivable(receivableId);
      if (updated && updated.remaining > 0 && updated.status === "received") {
        await storage.updateReceivable(receivableId, { status: "pending", receivedDate: null });
      }
    }
    res.status(204).send();
  });

  // ======= NBB CONNECTIONS =======

  app.get("/api/nbb/connections", async (_req, res) => {
    const connections = await storage.getNbbConnections();
    res.json(connections);
  });

  app.post("/api/nbb/import", async (req, res) => {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "No records provided" });
    }

    let success = 0;
    let errors = 0;

    for (const record of records) {
      try {
        await storage.upsertNbbConnection({
          customerName: record.customerName || "Unknown",
          connectionId: record.connectionId || `unknown-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: record.status || "unknown",
          speed: record.speed || null,
          macAddress: record.macAddress || null,
          onuSerial: record.onuSerial || null,
        });
        success++;
      } catch (e) {
        errors++;
      }
    }

    res.json({ success, errors });
  });

  app.delete("/api/nbb/connections/:id", async (req, res) => {
    await storage.deleteNbbConnection(parseInt(req.params.id));
    res.status(204).send();
  });

  app.get("/api/network/areas", async (_req, res) => {
    const areas = await db.select().from(networkAreas).orderBy(networkAreas.name);
    res.json(areas);
  });

  app.post("/api/network/areas", async (req, res) => {
    const parsed = insertNetworkAreaSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [area] = await db.insert(networkAreas).values(parsed.data).returning();
    res.status(201).json(area);
  });

  app.patch("/api/network/areas/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [area] = await db.update(networkAreas).set(req.body).where(eq(networkAreas.id, id)).returning();
    res.json(area);
  });

  app.delete("/api/network/areas/:id", async (req, res) => {
    const areaId = Number(req.params.id);
    const points = await db.select({ id: infraPoints.id }).from(infraPoints).where(eq(infraPoints.areaId, areaId));
    const pointIds = points.map(p => p.id);
    for (const pointId of pointIds) {
      await db.delete(infraSplitters).where(eq(infraSplitters.pointId, pointId));
      await db.delete(networkOnus).where(eq(networkOnus.pointId, pointId));
      await db.delete(fiberCables).where(eq(fiberCables.fromPointId, pointId));
      await db.delete(fiberCables).where(eq(fiberCables.toPointId, pointId));
    }
    await db.delete(infraPoints).where(eq(infraPoints.areaId, areaId));
    await db.delete(networkAreas).where(eq(networkAreas.id, areaId));
    res.status(204).send();
  });

  app.get("/api/network/infra-points", async (req, res) => {
    const rows = await db.query.infraPoints.findMany({
      with: { area: true, splitters: true, onus: true },
      orderBy: [infraPoints.name],
    });
    res.json(rows);
  });

  app.get("/api/network/infra-points/:id", async (req, res) => {
    const row = await db.query.infraPoints.findFirst({
      where: eq(infraPoints.id, Number(req.params.id)),
      with: { area: true, splitters: true, onus: { with: { customer: true } }, cablesFrom: true, cablesTo: true },
    });
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  });

  app.post("/api/network/infra-points", async (req, res) => {
    const parsed = insertInfraPointSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [point] = await db.insert(infraPoints).values(parsed.data).returning();
    res.json(point);
  });

  app.patch("/api/network/infra-points/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [point] = await db.update(infraPoints).set(req.body).where(eq(infraPoints.id, id)).returning();
    res.json(point);
  });

  app.delete("/api/network/infra-points/:id", async (req, res) => {
    const id = Number(req.params.id);
    await db.delete(infraSplitters).where(eq(infraSplitters.pointId, id));
    await db.delete(networkOnus).where(eq(networkOnus.pointId, id));
    await db.delete(fiberCables).where(eq(fiberCables.fromPointId, id));
    await db.delete(fiberCables).where(eq(fiberCables.toPointId, id));
    await db.delete(infraPoints).where(eq(infraPoints.id, id));
    res.status(204).send();
  });

  app.post("/api/network/splitters", async (req, res) => {
    const parsed = insertInfraSplitterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [splitter] = await db.insert(infraSplitters).values(parsed.data).returning();
    res.json(splitter);
  });

  app.patch("/api/network/splitters/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [splitter] = await db.update(infraSplitters).set(req.body).where(eq(infraSplitters.id, id)).returning();
    res.json(splitter);
  });

  app.delete("/api/network/splitters/:id", async (req, res) => {
    await db.delete(infraSplitters).where(eq(infraSplitters.id, Number(req.params.id)));
    res.status(204).send();
  });

  app.get("/api/network/fiber-cables", async (_req, res) => {
    const rows = await db.query.fiberCables.findMany({
      with: { fromPoint: true, toPoint: true },
    });
    res.json(rows);
  });

  app.post("/api/network/fiber-cables", async (req, res) => {
    const parsed = insertFiberCableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [cable] = await db.insert(fiberCables).values(parsed.data).returning();
    res.json(cable);
  });

  app.patch("/api/network/fiber-cables/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [cable] = await db.update(fiberCables).set(req.body).where(eq(fiberCables.id, id)).returning();
    res.json(cable);
  });

  app.delete("/api/network/fiber-cables/:id", async (req, res) => {
    await db.delete(fiberCables).where(eq(fiberCables.id, Number(req.params.id)));
    res.status(204).send();
  });

  app.get("/api/network/onus", async (_req, res) => {
    const rows = await db.query.networkOnus.findMany({
      with: { customer: true, point: true },
    });
    res.json(rows);
  });

  app.post("/api/network/onus", async (req, res) => {
    const parsed = insertNetworkOnuSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const [onu] = await db.insert(networkOnus).values(parsed.data).returning();
    res.json(onu);
  });

  app.patch("/api/network/onus/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [onu] = await db.update(networkOnus).set(req.body).where(eq(networkOnus.id, id)).returning();
    res.json(onu);
  });

  app.delete("/api/network/onus/:id", async (req, res) => {
    await db.delete(networkOnus).where(eq(networkOnus.id, Number(req.params.id)));
    res.status(204).send();
  });

  app.get("/api/network/stats", async (_req, res) => {
    const areasCount = await db.select({ count: sql<number>`count(*)` }).from(networkAreas);
    const pointsCount = await db.select({ count: sql<number>`count(*)` }).from(infraPoints);
    const cablesCount = await db.select({ count: sql<number>`count(*)` }).from(fiberCables);
    const onusCount = await db.select({ count: sql<number>`count(*)` }).from(networkOnus);
    const splittersCount = await db.select({ count: sql<number>`count(*)` }).from(infraSplitters);
    res.json({
      areas: Number(areasCount[0].count),
      infraPoints: Number(pointsCount[0].count),
      fiberCables: Number(cablesCount[0].count),
      onus: Number(onusCount[0].count),
      splitters: Number(splittersCount[0].count),
    });
  });

  // === Agent Location Tracking ===
  app.post("/api/agent-locations", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const { latitude, longitude, accuracy, complaintId } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ message: "Latitude and longitude required" });

    const existing = await db.select().from(agentLocations).where(eq(agentLocations.userId, user.id));
    
    if (existing.length > 0) {
      const [updated] = await db.update(agentLocations)
        .set({
          latitude: String(latitude),
          longitude: String(longitude),
          accuracy: accuracy ? String(accuracy) : null,
          complaintId: complaintId || null,
          fullName: user.fullName,
          updatedAt: new Date(),
        })
        .where(eq(agentLocations.userId, user.id))
        .returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(agentLocations).values({
        userId: user.id,
        fullName: user.fullName,
        latitude: String(latitude),
        longitude: String(longitude),
        accuracy: accuracy ? String(accuracy) : null,
        complaintId: complaintId || null,
        updatedAt: new Date(),
      }).returning();
      return res.json(created);
    }
  });

  app.get("/api/agent-locations", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const locations = await db.select().from(agentLocations);
    
    const locationsWithStatus = locations.map(loc => ({
      ...loc,
      isOnline: new Date(loc.updatedAt) > fiveMinutesAgo,
    }));
    
    res.json(locationsWithStatus);
  });

  // === Complaint Image Upload ===
  const uploadsDir = path.resolve(process.cwd(), "uploads", "complaints");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"));
      }
    },
  });

  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.post("/api/complaints/:id/images", upload.array("images", 5), async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    const complaintId = Number(req.params.id);
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ message: "No images uploaded" });

    const caption = req.body.caption || null;
    const inserted = [];

    for (const file of files) {
      const imagePath = `/uploads/complaints/${file.filename}`;
      const [img] = await db.insert(complaintImages).values({
        complaintId,
        uploadedBy: user.fullName,
        imagePath,
        caption,
      }).returning();
      inserted.push(img);
    }

    res.json(inserted);
  });

  app.get("/api/complaints/:id/images", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const complaintId = Number(req.params.id);
    const images = await db.select().from(complaintImages).where(eq(complaintImages.complaintId, complaintId));
    res.json(images);
  });

  // ======= APP SETTINGS ROUTES =======

  app.get("/api/settings", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const all = await db.select().from(appSettings);
    const settings: Record<string, string> = {};
    for (const row of all) {
      if (row.key === "whatsapp_token" && row.value) {
        settings[row.key] = row.value.length > 8 ? row.value.slice(0, 4) + "****" + row.value.slice(-4) : "****";
      } else {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  });

  app.post("/api/settings", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    if (!user[0] || user[0].role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const entries = Object.entries(req.body) as [string, string][];
    for (const [key, value] of entries) {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
      if (existing.length > 0) {
        await db.update(appSettings).set({ value: String(value), updatedAt: new Date() }).where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({ key, value: String(value) });
      }
    }
    res.json({ success: true });
  });

  app.post("/api/settings/test-whatsapp", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Phone number required" });
    const result = sendWhatsAppMessageInBackground(to, "Assalam o Alaikum! This is a test message from Storm Fiber Pattoki CRM. Your WhatsApp API integration is working correctly.");
    res.json(result);
  });

  // ======= TO DO LIST ROUTES =======

  app.get("/api/todos", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const allTodos = await db.select().from(todos).orderBy(desc(todos.createdAt));
    res.json(allTodos);
  });

  app.post("/api/todos", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
    const createdBy = user[0]?.fullName || user[0]?.username || "Unknown";
    const { title, description, priority, dueDate, assignedTo } = req.body;
    const [todo] = await db.insert(todos).values({
      title,
      description: description || null,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      createdBy,
    }).returning();
    res.json(todo);
  });

  app.patch("/api/todos/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const updateData: any = { ...req.body };
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);
    if (updateData.completed === true) updateData.completedAt = new Date();
    if (updateData.completed === false) updateData.completedAt = null;

    const [updated] = await db.update(todos).set(updateData).where(eq(todos.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Todo not found" });
    res.json(updated);
  });

  app.delete("/api/todos/:id", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db.delete(todos).where(eq(todos.id, id));
    res.json({ success: true });
  });

  // ======= EXPIRY REMINDERS =======

  app.get("/api/expiry-reminders", async (req: Request, res: Response) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Not authenticated" });
    const reminders = await db.select().from(expiryReminders).orderBy(desc(expiryReminders.createdAt));
    res.json(reminders);
  });

  app.post("/api/expiry-reminders/check-now", requireAdmin, async (req: Request, res: Response) => {
    const customDate = req.body?.date as string | undefined;
    const count = await checkAndSendExpiryReminders(customDate);
    res.json({ success: true, remindersSent: count });
  });

  app.get("/api/expiry-reminders/settings", requireAdmin, async (_req: Request, res: Response) => {
    const daysRow = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_days_before"));
    const templateRow = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_template"));
    res.json({
      daysBefore: daysRow[0]?.value || "2",
      template: templateRow[0]?.value || "السلام علیکم {customerName}!\n\nآپ کے Storm Fiber انٹرنیٹ کنکشن ({planName}) کی میعاد {expiryDate} کو ختم ہو رہی ہے۔\n\nبراہ کرم اپنے کنکشن کی پیمنٹ کریں تاکہ سروس میں رکاوٹ نہ ہو۔\n\nآپ ان نمبرز پر پیمنٹ کر سکتے ہیں:\n\n📱 Fuqan Ali: 03004111272\n(JazzCash / EasyPaisa)\n\n📱 Fahad Iqbal: 03270223873\n(JazzCash)\n\nشکریہ - Storm Fiber Pattoki",
    });
  });

  app.post("/api/expiry-reminders/settings", requireAdmin, async (req: Request, res: Response) => {
    const { daysBefore, template } = req.body;
    if (daysBefore !== undefined) {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_days_before"));
      if (existing.length > 0) {
        await db.update(appSettings).set({ value: String(daysBefore), updatedAt: new Date() }).where(eq(appSettings.key, "reminder_days_before"));
      } else {
        await db.insert(appSettings).values({ key: "reminder_days_before", value: String(daysBefore), updatedAt: new Date() });
      }
    }
    if (template !== undefined) {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_template"));
      if (existing.length > 0) {
        await db.update(appSettings).set({ value: template, updatedAt: new Date() }).where(eq(appSettings.key, "reminder_template"));
      } else {
        await db.insert(appSettings).values({ key: "reminder_template", value: template, updatedAt: new Date() });
      }
    }
    res.json({ success: true });
  });

  app.post("/api/expiry-reminders/send-manual", requireAdmin, async (req: Request, res: Response) => {
    const { customerId } = req.body;
    if (!customerId) return res.status(400).json({ message: "Customer ID required" });

    const customer = await db.select().from(customers).where(eq(customers.id, customerId));
    if (!customer.length) return res.status(404).json({ message: "Customer not found" });
    const c = customer[0];

    let plan: any = null;
    if (c.planId) {
      const plans = await db.select().from(servicePlans).where(eq(servicePlans.id, c.planId));
      plan = plans[0] || null;
    }

    const validityDays = plan ? (parseInt(plan.validity) || 30) : 30;
    const planName = plan ? plan.name : "Internet Package";

    const latestSlip = await db.execute(sql`
      SELECT slip_date FROM pos_slips WHERE customer_id = ${customerId} ORDER BY slip_date DESC LIMIT 1
    `);

    let startDate: string | null = null;
    if (latestSlip.rows.length > 0) {
      const d = latestSlip.rows[0].slip_date;
      if (d instanceof Date) {
        startDate = d.toISOString().split("T")[0];
      } else {
        const ds = String(d).replace(/[T ].*/,"");
        startDate = ds;
      }
    } else if (c.connectionDate) {
      startDate = String(c.connectionDate).replace(/[T ].*/,"");
    }

    if (!startDate) {
      return res.status(400).json({ message: "No payment or connection date found for this customer" });
    }

    const parts = startDate.split("-");
    const expDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    expDate.setDate(expDate.getDate() + validityDays);
    const expiryDateStr = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, "0")}-${String(expDate.getDate()).padStart(2, "0")}`;

    const [y2, m2, d2] = expiryDateStr.split("-");
    const formattedExpiry = `${d2}-${["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m2)]}-${y2}`;

    const templateRows = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_template"));
    const templateVal = templateRows[0]?.value || "السلام علیکم {customerName}!\n\nآپ کے Storm Fiber انٹرنیٹ کنکشن ({planName}) کی میعاد {expiryDate} کو ختم ہو رہی ہے۔\n\nبراہ کرم اپنے کنکشن کی پیمنٹ کریں تاکہ سروس میں رکاوٹ نہ ہو۔\n\nآپ ان نمبرز پر پیمنٹ کر سکتے ہیں:\n\n📱 Fuqan Ali: 03004111272\n(JazzCash / EasyPaisa)\n\n📱 Fahad Iqbal: 03270223873\n(JazzCash)\n\nشکریہ - Storm Fiber Pattoki";

    const daysRows = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_days_before"));
    const daysBeforeVal = daysRows[0]?.value || "2";

    const message = templateVal
      .replace("{customerName}", c.name)
      .replace("{planName}", planName)
      .replace("{expiryDate}", formattedExpiry)
      .replace("{daysBefore}", daysBeforeVal);

    const todayStr = new Date().toISOString().split("T")[0];

    sendWhatsAppMessageInBackground(c.contact, message);

    await db.insert(expiryReminders).values({
      customerId: c.id,
      customerName: c.name,
      customerContact: c.contact,
      planName,
      expiryDate: expiryDateStr,
      reminderDate: todayStr,
      message,
      status: "sent",
      whatsappSent: true,
    });

    res.json({ success: true, expiryDate: expiryDateStr, lastPayment: startDate, message });
  });

  app.delete("/api/expiry-reminders/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db.delete(expiryReminders).where(eq(expiryReminders.id, id));
    res.json({ success: true });
  });

  // ======= DUTY TYPES =======

  app.get("/api/duty-types", requireAuth, async (_req: Request, res: Response) => {
    const result = await storage.getAllDutyTypes();
    res.json(result);
  });

  app.post("/api/duty-types", requireAdmin, async (req: Request, res: Response) => {
    const result = await storage.createDutyType(req.body);
    res.json(result);
  });

  app.put("/api/duty-types/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const result = await storage.updateDutyType(id, req.body);
    if (!result) return res.status(404).json({ message: "Duty type not found" });
    res.json(result);
  });

  app.delete("/api/duty-types/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteDutyType(id);
    res.json({ success: true });
  });

  // ======= DUTY ASSIGNMENTS =======

  app.get("/api/duty-assignments", requireAuth, async (req: Request, res: Response) => {
    const startDate = req.query.startDate as string || new Date().toISOString().split("T")[0];
    const endDate = req.query.endDate as string || startDate;
    const result = await storage.getDutyAssignmentsByDateRange(startDate, endDate);
    res.json(result);
  });

  app.post("/api/duty-assignments", requireAdmin, async (req: Request, res: Response) => {
    const result = await storage.createDutyAssignment(req.body);

    try {
      const emp = await storage.getEmployee(req.body.employeeId);
      const dutyType = await storage.getDutyType(req.body.dutyTypeId);
      if (emp && dutyType) {
        const phone = emp.whatsappNumber || emp.contact;
        if (phone) {
          const dateStr = req.body.date;
          const dutyDate = new Date(dateStr + "T00:00:00");
          const formattedDate = dutyDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
          const msg = `Assalam o Alaikum ${emp.firstName} ${emp.lastName}! 👋\n\nYou have been assigned a new duty:\n\n📋 Shift: ${dutyType.name}\n🕐 Time: ${dutyType.startTime} - ${dutyType.endTime}\n📅 Date: ${formattedDate}\n${req.body.notes ? `📝 Notes: ${req.body.notes}\n` : ""}\nPlease be on time. Thank you! 💪\nStorm Fiber Pattoki\n📞 0307-8844421 | 0327-0223873`;
          sendWhatsAppMessageInBackground(phone, msg);
        }
      }
    } catch (e) {
      console.error("[Duty WhatsApp] Error:", e);
    }

    res.json(result);
  });

  app.put("/api/duty-assignments/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const result = await storage.updateDutyAssignment(id, req.body);
    if (!result) return res.status(404).json({ message: "Duty assignment not found" });
    res.json(result);
  });

  app.delete("/api/duty-assignments/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteDutyAssignment(id);
    res.json({ success: true });
  });

  return httpServer;
}
