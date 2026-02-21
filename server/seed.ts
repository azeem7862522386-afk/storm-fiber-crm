import { db } from "./db";
import { servicePlans, customers, installations, customerNotes, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { log } from "./index";

async function ensureAdminUser() {
  const [existing] = await db.select().from(users).where(eq(users.username, "admin"));
  if (!existing) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      fullName: "Administrator",
      role: "admin",
      allowedModules: [],
      isActive: true,
    });
    log("Default admin user created.", "seed");
  }
}

export async function seedDatabase() {
  await ensureAdminUser();

  const existingPlans = await db.select().from(servicePlans);
  if (existingPlans.length > 0) {
    log("Database already seeded, skipping.", "seed");
    return;
  }

  log("Seeding database with initial data...", "seed");

  const plans = await db
    .insert(servicePlans)
    .values([
      { name: "Basic 2MB", speed: "2 Mbps", price: 800, validity: "30 days" },
      { name: "Standard 3MB", speed: "3 Mbps", price: 1000, validity: "30 days" },
      { name: "Standard 4MB", speed: "4 Mbps", price: 1200, validity: "30 days" },
      { name: "Plus 5MB", speed: "5 Mbps", price: 1400, validity: "30 days" },
      { name: "Premium 8MB", speed: "8 Mbps", price: 1800, validity: "30 days" },
      { name: "Premium 10MB", speed: "10 Mbps", price: 2200, validity: "30 days" },
      { name: "Ultra 15MB", speed: "15 Mbps", price: 2800, validity: "30 days" },
      { name: "Ultra 20MB", speed: "20 Mbps", price: 3500, validity: "30 days" },
      { name: "Business 25MB", speed: "25 Mbps", price: 4500, validity: "30 days" },
      { name: "Business 50MB", speed: "50 Mbps", price: 7000, validity: "30 days" },
      { name: "Enterprise 100MB", speed: "100 Mbps", price: 12000, validity: "30 days" },
    ])
    .returning();

  const seededCustomers = await db
    .insert(customers)
    .values([
      {
        name: "Ahmed Khan",
        address: "House 12, Street 5, Mohalla Islamia, Pattoki",
        contact: "0300-1234567",
        cnicNumber: "35202-1234567-1",
        email: "ahmed.khan@email.com",
        status: "active",
        planId: plans[4].id,
      },
      {
        name: "Fatima Bibi",
        address: "Shop 3, Main Bazaar, Pattoki",
        contact: "0321-9876543",
        status: "active",
        planId: plans[5].id,
      },
      {
        name: "Muhammad Usman",
        address: "House 45, Gali Masjid Wali, Pattoki",
        contact: "0333-5551234",
        cnicNumber: "35202-7654321-3",
        email: "usman.m@email.com",
        status: "suspended",
        planId: plans[2].id,
      },
      {
        name: "Ayesha Siddiqui",
        address: "Flat 2B, Al-Noor Plaza, GT Road, Pattoki",
        contact: "0345-1112233",
        status: "register",
        planId: plans[6].id,
      },
      {
        name: "Hassan Ali",
        address: "House 78, Colony Road, Near Railway Station, Pattoki",
        contact: "0312-4445566",
        cnicNumber: "35202-9998887-5",
        status: "active",
        planId: plans[9].id,
      },
    ])
    .returning();

  await db.insert(installations).values([
    {
      customerId: seededCustomers[0].id,
      connectionType: "new_connection",
      router: "TP-Link Archer C6",
      onu: "GPON-ONU-2024-001",
      macAddress: "AA:BB:CC:DD:EE:01",
      port: "OLT-1/PON-3/Port-12",
    },
    {
      customerId: seededCustomers[1].id,
      connectionType: "new_connection",
      router: "Huawei HG8145V5",
      onu: "GPON-ONU-2024-002",
      macAddress: "AA:BB:CC:DD:EE:02",
      port: "OLT-1/PON-3/Port-15",
    },
    {
      customerId: seededCustomers[4].id,
      connectionType: "upgrade",
      router: "MikroTik hAP ac3",
      onu: "GPON-ONU-2024-005",
      macAddress: "AA:BB:CC:DD:EE:05",
      port: "OLT-2/PON-1/Port-08",
    },
  ]);

  await db.insert(customerNotes).values([
    {
      customerId: seededCustomers[0].id,
      content: "Customer activated on new 8MB plan. Router installed successfully.",
    },
    {
      customerId: seededCustomers[0].id,
      content: "Customer called to inquire about plan upgrade to 15MB. Will follow up next week.",
    },
    {
      customerId: seededCustomers[2].id,
      content: "Account suspended due to non-payment. Customer informed via phone call.",
    },
    {
      customerId: seededCustomers[4].id,
      content: "Upgraded from 25MB to 50MB business plan. New router installed.",
    },
  ]);

  log("Database seeded successfully!", "seed");
}
