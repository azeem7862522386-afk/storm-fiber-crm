import { db } from "./db";
import { posSlips, customers, servicePlans, expiryReminders, appSettings } from "../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { sendWhatsAppMessageInBackground } from "./whatsapp";

function getPKDateString(date: Date): string {
  const pkOffset = 5 * 60;
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const pkDate = new Date(utcMs + pkOffset * 60000);
  const y = pkDate.getFullYear();
  const m = String(pkDate.getMonth() + 1).padStart(2, "0");
  const d = String(pkDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getReminderDaysSetting(): Promise<number> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_days_before"));
  return rows[0] ? parseInt(rows[0].value) || 2 : 2;
}

async function getReminderTemplate(): Promise<string> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, "reminder_template"));
  return rows[0]?.value || "السلام علیکم {customerName}!\n\nآپ کے Storm Fiber انٹرنیٹ کنکشن ({planName}) کی میعاد {expiryDate} کو ختم ہو رہی ہے۔\n\nبراہ کرم اپنے کنکشن کی پیمنٹ کریں تاکہ سروس میں رکاوٹ نہ ہو۔\n\nآپ ان نمبرز پر پیمنٹ کر سکتے ہیں:\n\n📱 Fuqan Ali: 03004111272\n(JazzCash / EasyPaisa)\n\n📱 Fahad Iqbal: 03270223873\n(JazzCash)\n\nشکریہ - Storm Fiber Pattoki";
}

export async function checkAndSendExpiryReminders(customDate?: string) {
  try {
    const daysBefore = await getReminderDaysSetting();
    const template = await getReminderTemplate();
    
    const todayStr = customDate || getPKDateString(new Date());
    const targetDateStr = addDaysToDateString(todayStr, daysBefore);

    console.log(`[Expiry Reminder] Today (PK): ${todayStr}, checking for connections expiring on ${targetDateStr} (${daysBefore} days from now)`);

    const latestSlips = await db.execute(sql`
      SELECT DISTINCT ON (ps.customer_id)
        ps.customer_id,
        ps.customer_name,
        ps.customer_contact,
        ps.plan_name,
        ps.slip_date,
        sp.validity,
        c.plan_id
      FROM pos_slips ps
      JOIN customers c ON ps.customer_id = c.id
      LEFT JOIN service_plans sp ON c.plan_id = sp.id
      WHERE c.status IN ('active', 'register')
      ORDER BY ps.customer_id, ps.slip_date DESC
    `);

    let remindersSent = 0;

    for (const slip of latestSlips.rows) {
      const validityStr = (slip.validity as string) || "30 days";
      const validityDays = parseInt(validityStr) || 30;

      const slipDateRaw = slip.slip_date as string | Date;
      const slipDateStr = slipDateRaw instanceof Date
        ? getPKDateString(slipDateRaw)
        : String(slipDateRaw).split("T")[0].split(" ")[0];
      
      const expiryDateStr = addDaysToDateString(slipDateStr, validityDays);

      if (expiryDateStr !== targetDateStr) {
        continue;
      }

      const customerId = slip.customer_id as number;
      const customerName = slip.customer_name as string;
      const customerContact = slip.customer_contact as string;
      const planName = (slip.plan_name as string) || "Internet Package";

      const existingReminder = await db.select().from(expiryReminders).where(
        and(
          eq(expiryReminders.customerId, customerId),
          eq(expiryReminders.expiryDate, expiryDateStr)
        )
      );

      if (existingReminder.length > 0) {
        console.log(`[Expiry Reminder] Already sent reminder to ${customerName} for expiry ${expiryDateStr}`);
        continue;
      }

      const [y, m, d] = expiryDateStr.split("-");
      const formattedExpiry = `${d}-${["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m)]}-${y}`;

      const message = template
        .replace("{customerName}", customerName)
        .replace("{planName}", planName)
        .replace("{expiryDate}", formattedExpiry)
        .replace("{daysBefore}", String(daysBefore));

      sendWhatsAppMessageInBackground(customerContact, message);

      await db.insert(expiryReminders).values({
        customerId,
        customerName,
        customerContact,
        planName,
        expiryDate: expiryDateStr,
        reminderDate: todayStr,
        message,
        status: "sent",
        whatsappSent: true,
      });

      remindersSent++;
      console.log(`[Expiry Reminder] Sent reminder to ${customerName} (${customerContact}) - expires ${expiryDateStr}`);
    }

    console.log(`[Expiry Reminder] Check complete. ${remindersSent} reminders sent.`);
    return remindersSent;
  } catch (error: any) {
    console.error("[Expiry Reminder] Error:", error.message);
    return 0;
  }
}

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startExpiryReminderScheduler() {
  checkAndSendExpiryReminders();

  reminderInterval = setInterval(() => {
    const now = new Date();
    const pkHour = (now.getUTCHours() + 5) % 24;
    if (pkHour === 9) {
      console.log("[Expiry Reminder] Running scheduled check at 9 AM PKT...");
      checkAndSendExpiryReminders();
    }
  }, 60 * 60 * 1000);

  console.log("[Expiry Reminder] Scheduler started - will check daily at 9 AM PKT and on server start");
}

export function stopExpiryReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log("[Expiry Reminder] Scheduler stopped");
  }
}
