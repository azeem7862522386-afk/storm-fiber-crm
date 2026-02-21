# Storm Fiber Pattoki - CRM

## Overview
This project is a web-based Customer Relationship Management (CRM) application designed for Storm Fiber Pattoki, an Internet Service Provider. Its primary purpose is to streamline operations by managing customers, service plans, installations, billing, payments, customer interactions, and complaints. It also includes a comprehensive double-entry accounting system, an Employee Management System (EMS), and a simple Stock Management System.

## User Preferences
- Building modules one by one
- ISP-specific terminology (ONU, MAC address, GPON, OLT)
- Pakistani locale (Rs. currency, CNIC format, local addresses)
- WhatsApp integration for payment notifications
- Payment collector tracking

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (client-side)
- **State Management**: TanStack React Query

## Project Structure
```
client/          - React frontend (Vite)
  src/
    components/  - UI components (Shadcn UI)
    pages/       - Page components
    hooks/       - Custom React hooks
    lib/         - Utility functions
server/          - Express.js backend
  index.ts       - Server entry point
  routes.ts      - API routes
  storage.ts     - Database operations
  db.ts          - Database connection
  seed.ts        - Database seeding
shared/          - Shared types and schema
  schema.ts      - Drizzle ORM schema
```

## Running the App
- Dev: `npm run dev` (serves on port 5000)
- Build: `npm run build`
- DB push: `npx drizzle-kit push`

## Recent Changes
- **Feb 15, 2026**: Added Employee Salaries module in HR section with salary advance tracking. Employees can take advances which are deducted from net salary. Monthly view with salary summary per employee, advance recording dialog, Excel download and print. Database table `salary_advances` with status tracking (pending/approved/deducted/cancelled).
- **Feb 15, 2026**: Added Excel download and Print buttons to both Daily Income & Expense Entry and Month Closing Sheet pages. Uses `xlsx` library for Excel export with proper column formatting.
- **Feb 16, 2026**: Removed Daily Income & Expense module (separate module). Daily Sheet and Month Closing Sheet remain for daily entry management.
- **Feb 16, 2026**: Replaced complex 7-module Inventory system with simple Stock Management. Two new tables: `stock_items` (name, unit, quantity) and `stock_issues` (who issued, to whom, quantity, date). Remaining stock calculated automatically. Old inventory DB tables kept intact but all code references removed. Sidebar shows "Stock Management" with Stock Items and Stock Issues pages.
- **Feb 16, 2026**: Added Stock Returns module (`stock_returns` table) - employees can return stock which goes back to available inventory and deducts from their account. Also added Stock Damages module (`stock_damages` table) - track damaged stock with reason/description. Remaining quantity formula: initial - issued + returned - damaged. Sidebar now has 4 entries under Stock Management.

- **Feb 16, 2026**: Removed HR sub-modules: Designations, Recruitment, Training, Assets, Announcements. Sidebar, routes, and page files deleted. DB tables kept intact.
- **Feb 16, 2026**: Added customer search auto-fill to New Connection Request form. When creating new connection, user can search existing customers by name, mobile or CNIC. Matching customers appear in dropdown and selecting one auto-fills all customer fields (name, contact, address, CNIC).
- **Feb 16, 2026**: Enhanced Attendance with Late Fine System - auto-calculates fines based on check-in time (1hr=Rs.200, 2hr=Rs.400, 3hr+=Rs.600). Office time set to 9:00 AM. Added `late_minutes` and `fine_amount` columns to attendance table. Status auto-sets to "late" when check-in is after 9:00 AM. Fines Today stat card added to attendance page.
- **Feb 16, 2026**: Integrated Attendance Deductions into Employee Salaries page. Net Payable now = Net Salary - Advances - Late Fines - Absent Day Deduction. Per day salary = monthly/30. Added Late Fines, Absent Days, and Absent Deduction columns to salary table. Added new summary cards for Late Fines and Absent Deduction totals. Excel export updated with new columns. New API endpoint `/api/attendance/monthly-deductions` for monthly attendance deduction data.

- **Feb 16, 2026**: Added Employee Salary Slip module. Search employee by name/code/contact/CNIC, generate branded salary slip with logo, company details, all earnings (basic salary, house/transport/medical/other allowances), all deductions (tax, PF, advances, late fines, absent day deduction), net payable amount, attendance summary (working days, absent days, late days), and signature lines. Printable slip with month selector. Sidebar entry under HR section.
- **Feb 16, 2026**: Added POS Slip saving feature. When a payment slip is printed from POS, it automatically saves to `pos_slips` table in database. Previous slips now show from saved records with full details (Date, Package, Price, Discount, Received, Balance). New API endpoints: GET/POST `/api/pos/slips`.
- **Feb 16, 2026**: Added professional print layouts with company branding (logo, address, signature lines, footer) to 10+ modules: Month Closing, Stock Items, Stock Issues, Stock Returns, Stock Damages, Attendance, Employee Salaries, Complaints, Customers, Reports. All use A4 page size with inline styles.
- **Feb 16, 2026**: Added Daily Collection Record feature in POS module. "Daily Collection" button shows all payment slips for a selected date with summary cards (Total Slips, Total Collected, Total Discount, Total Balance) and detailed table. Includes printable A4 report with company branding. API endpoint: GET `/api/pos/slips?date=YYYY-MM-DD`.
- **Feb 16, 2026**: Removed duplicate modules (Billing, Payroll, Agents). Complaint assignment now uses Employees instead of separate Agents. Updated complaint-detail page and backend routes.
- **Feb 16, 2026**: Added Network Infrastructure Management module with 5 database tables (network_areas, infra_points, infra_splitters, fiber_cables, network_onus). Full CRUD for areas, infrastructure points (geometry boxes, FAT boxes, splice closures, poles, OLTs, ODBs, manholes), splitters (1:2 to 1:32 with port tracking), fiber cables (with core count, length), and ONU devices (linked to customers). Leaflet map view centered on Pattoki showing all infrastructure points with GPS markers color-coded by type. Complete network topology documentation.

- **Feb 18, 2026**: Added Agent Mobile Portal (PWA) at `/agent-portal`. Mobile-optimized web app for field agents to view assigned complaints with customer details (name, address, contact), start/complete complaints, call customers, open WhatsApp, navigate via Google Maps. Includes PWA manifest for "Add to Home Screen" installation, service worker, and auto-refresh every 30 seconds. Login screen with Storm Fiber branding.
- **Feb 18, 2026**: Added Live Agent Tracking. Agent Portal sends GPS location every 60 seconds. Admin CRM has "Agent Tracking" page with map showing online/offline agents with real-time positions. DB table: `agent_locations` (upsert per agent). Sidebar entry under Complaints.
- **Feb 18, 2026**: Added Complaint Image Upload. Agents can upload up to 5 photos (modem, device, location) when completing complaints from Agent Portal. Images stored in `/uploads/complaints/` directory. DB table: `complaint_images`. Photos visible in complaint detail page in CRM with lightbox view. Uses multer for file handling.
- **Feb 18, 2026**: Added To Do List module. Create, edit, complete, delete tasks with priority levels (low/medium/high/urgent), due dates, employee assignment. Summary cards (total, pending, completed, urgent, overdue). Filter by status and priority. Overdue task highlighting. DB table: `todos`. Sidebar entry under main menu.
- **Feb 18, 2026**: Added WhatsApp API Integration (InvoClouds). New `app_settings` table stores API token, from number, enabled flag. `server/whatsapp.ts` service utility sends messages via InvoClouds REST API with automatic fallback to wa.me links if API not configured. Settings page has WhatsApp configuration section with enable/disable toggle, token input (masked), from number, and test message button. All 10+ notification points updated: connection requests, engineer/worker assignments, connection completions, payments, complaints (register/assign/complete/reopen). Frontend shows "WhatsApp sent" toast when API sends directly, falls back to opening wa.me link if API disabled. Admin-only access for settings endpoints.

- **Feb 18, 2026**: Added Expiry Reminder System. Automatic WhatsApp reminders sent to customers 2 days before connection expires. Calculates expiry from last POS payment date + plan validity days. Scheduler runs daily at 9 AM PKT and on server start. Configurable settings: days before (1-7), message template with variables ({customerName}, {planName}, {expiryDate}). DB table: `expiry_reminders`. Manual "Check Now" button for admin. Sidebar entry under Management. Pakistan timezone-aware date handling.
- **Feb 18, 2026**: Added Connection Date field to Customers module. New `connection_date` column in customers table. Date picker in customer add/edit form. Customers list now shows Connection Date and Expiry Date columns. Expiry is calculated from last POS payment (or connection date as fallback) + plan validity days. Color-coded expiry badges: red=expired, orange=expiring within 3 days, blue=active. Customer detail page shows Connection Date, Last Payment, and Expiry Date with visual indicators. API endpoint: GET `/api/customers/expiry-data`.

- **Feb 18, 2026**: Added Overtime Tracking feature. Working hours 9 AM - 8 PM (11 hours). Checkout after 8 PM auto-calculates overtime minutes and reward (basic salary / 30 / 11 * OT hours). New columns `overtime_minutes` and `overtime_reward` in attendance table. OT Reward stat card on attendance page. Overtime Reward column in salary table, salary slips, and Excel export. Net Payable = Net Salary - Deductions + OT Reward. WhatsApp notification sent to employee when overtime is recorded.
- **Feb 18, 2026**: Added Employee Duty Chart module. Two DB tables: `duty_types` (shift definitions with name, start/end time, break minutes, color) and `duty_assignments` (employee-duty mapping with date, skills, notes). Weekly calendar view showing all employee shift assignments. Shift Types management with color-coded cards. Assign duties by clicking + on any day. Edit/delete assignments inline. Summary stat cards (Shift Types, Week Assignments, Employees Assigned, Today's Duties). Printable A4 weekly chart with company branding. Sidebar entry under HR section. User management module access added.

- **Feb 19, 2026**: Added Employee Commission system. New `employee_commissions` table (commission_name, amount, month, description). Commission added to Net Payable in Employee Salaries page. Commission column in salary table, stat card, commission records table with add/delete. Salary slip shows commissions under "Additions" section. Excel export and print updated.
- **Feb 19, 2026**: Added Update and Delete options to Complaints. Edit dialog allows changing complaint type, status, priority, and description. Delete with confirmation removes complaint along with related images and feedback. Pencil and trash icons in Actions column.
- **Feb 19, 2026**: Comprehensive UI/UX redesign of 20+ pages. Consistent modern design with gradient header banners (dot pattern overlays), frosted glass action buttons, gradient stat cards with hover animations and scale effects, dark gradient table headers (slate-800 to slate-700), responsive design. Pages: Dashboard, Customers, Complaints, POS, Attendance, Todos, Stock Items/Issues/Returns/Damages, Plans, Employees, Departments, New Connections, Expiry Reminders, Duty Chart, Settings, User Management, Salary Slip, Employee Salaries.

- **Feb 21, 2026**: Shortened WhatsApp complaint completion message - removed duplicate notification URL, kept only feedback link with concise message.
- **Feb 21, 2026**: Added Employee Feedback module. New page at `/employee-feedback` showing customer ratings and comments per employee. Aggregates feedback from both complaint feedback (agentRating) and connection feedback (fieldWorkerRating). Expandable employee cards with star ratings, customer comments, complaint/connection type badges. Summary stat cards (Total Employees, Total Feedbacks, Overall Avg Rating). Search by employee name/code. Sidebar entry under Management section. API endpoint: GET `/api/employee-feedback`.
- **Feb 21, 2026**: Fixed WhatsApp API "from" number formatting - now converts local format (03xx) to international format (923xx) for InvoClouds API compatibility.
- **Feb 21, 2026**: Added WhatsApp salary slip notification - sends complete salary breakdown (earnings, allowances, deductions, advances, commissions, OT, net payable) via WhatsApp from salary slip page.

## Default Login
- Username: admin
- Password: admin123

## Agent Portal
- URL: `/agent-portal` (share this link with agents)
- Agents login with their user credentials
- Shows only complaints assigned to them
- Can be installed as app on phone via "Add to Home Screen"
