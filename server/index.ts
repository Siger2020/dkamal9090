import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { initializeDatabase } from "./database/index.js";
import { initializeNetlifyDatabase, isNetlify, createBasicServices, getDatabase } from "./database/netlify-setup.js";
import authRoutes from "./routes/auth.js";
import bookingsRoutes from "./routes/bookings.js";
import appointmentsCleanupRoutes from "./routes/appointments-cleanup.js";
import notificationsRoutes from "./routes/notifications.js";
import aiAnalysisRoutes from "./routes/ai-analysis.js";
import paymentsRoutes from "./routes/payments.js";
import transactionsRoutes from "./routes/transactions.js";
import {
  getDatabaseStatsHandler,
  getTablesHandler,
  getTableDataHandler,
  insertRecordHandler,
  updateRecordHandler,
  deleteRecordHandler,
  globalSearchHandler,
  createBackupHandler,
  getBackupsHandler,
  executeQueryHandler,
  bulkDataCleanupHandler,
  getPatientsHandler,
  findAppointmentHandler,
} from "./routes/database.js";

export async function createServer() {
  const app = express();

  // تهيئة قاعدة البيانات حسب البيئة
  try {
    if (isNetlify) {
      console.log("🌐 تهيئة قاعدة البيانات لبيئة Netlify");
      await initializeNetlifyDatabase();
      await createBasicServices(getDatabase());
    } else {
      console.log("🏠 تهيئة قاعدة البيانات للبيئة المحلية");
      initializeDatabase();
    }
    console.log("✅ تم تهيئة قاعدة البيانات بنجاح");
  } catch (error) {
    console.error("❌ فشل في تهيئة قاعدة البيانات:", error);
  }

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.use("/api/auth", authRoutes);

  // Bookings routes
  app.use("/api/bookings", bookingsRoutes);

  // Appointments cleanup routes
  app.use("/api/appointments", appointmentsCleanupRoutes);

  // Notifications routes
  app.use("/api/notifications", notificationsRoutes);

  // AI Analysis routes
  app.use("/api/ai-analysis", aiAnalysisRoutes);

  // Payments routes
  app.use("/api/payments", paymentsRoutes);

  // Transactions routes
  app.use("/api/transactions", transactionsRoutes);

  // Database API routes
  app.get("/api/database/stats", getDatabaseStatsHandler);
  app.get("/api/database/tables", getTablesHandler);
  app.get("/api/database/tables/:tableName", getTableDataHandler);
  app.post("/api/database/tables/:tableName", insertRecordHandler);
  app.put("/api/database/tables/:tableName/:id", updateRecordHandler);
  app.delete("/api/database/tables/:tableName/:id", deleteRecordHandler);
  app.get("/api/database/search", globalSearchHandler);
  app.post("/api/database/backup", createBackupHandler);
  app.get("/api/database/backups", getBackupsHandler);
  app.post("/api/database/query", executeQueryHandler);
  app.post("/api/database/cleanup", bulkDataCleanupHandler);
  app.get("/api/patients", getPatientsHandler);
  app.get("/api/appointments/find/:appointmentNumber", findAppointmentHandler);

  return app;
}
