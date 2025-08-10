import { Router } from "express";
import { getDatabase } from "../database/index.js";

const router = Router();

// Get all transactions (compatible with TransactionsSimple component)
router.get("/", async (req, res) => {
  try {
    const db = getDatabase();

    // Get transactions data from both payments and transactions tables
    const transactions = db
      .prepare(
        `
      SELECT
        id,
        patient_name,
        amount,
        payment_method,
        payment_date as date,
        'income' as type,
        'completed' as status,
        notes as description,
        COALESCE(service_name, 'خدمة عامة') as category,
        COALESCE(service_name, 'خدمة عامة') as service_type
      FROM payments
      ORDER BY payment_date DESC
      LIMIT 100
    `,
      )
      .all();

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في استرجاع المعاملات",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get transaction statistics (compatible with TransactionsSimple component)
router.get("/stats", async (req, res) => {
  try {
    const db = getDatabase();

    // Get total revenue from payments
    const totalRevenue = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) as total FROM payments
    `,
      )
      .get() as { total: number };

    // Get monthly revenue (current month)
    const monthlyRevenue = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE DATE(payment_date) >= DATE('now', 'start of month')
    `,
      )
      .get() as { total: number };

    // Get payment counts
    const paymentCounts = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN DATE(payment_date) >= DATE('now', '-30 days') THEN 1 END) as recent_payments
      FROM payments
    `,
      )
      .get() as { total_payments: number; recent_payments: number };

    const stats = {
      total_revenue: totalRevenue.total,
      total_expenses: 0, // No expenses in current structure
      pending_payments: 0, // All payments are completed in current structure
      completed_payments: paymentCounts.total_payments,
      monthly_revenue: monthlyRevenue.total,
      monthly_expenses: 0,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في استرجاع إحصائيات المعاملات",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create new transaction (compatible with TransactionsSimple component)
router.post("/", async (req, res) => {
  try {
    const db = getDatabase();
    const {
      patient_name,
      service_type,
      amount,
      payment_method,
      description,
      type = "income",
    } = req.body;

    // Validate required fields
    if (!patient_name || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "الحقول المطلوبة: اسم المريض، المبلغ، طريقة الدفع",
      });
    }

    const paymentId = `PAY-${Date.now()}`;
    const paymentDate = new Date().toISOString();

    // Insert into payments table
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, patient_name, amount, payment_method,
        notes, payment_date, created_at, updated_at, service_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPayment.run(
      paymentId,
      patient_name,
      amount,
      payment_method,
      description || null,
      paymentDate,
      paymentDate,
      paymentDate,
      service_type || "خدمة عامة",
    );

    // Return the created transaction in the expected format
    const createdTransaction = {
      id: paymentId,
      patient_name,
      amount: parseFloat(amount),
      payment_method,
      date: paymentDate,
      type,
      status: "completed",
      description: description || "",
      category: service_type || "خدمة عامة",
      service_type: service_type || "خدمة عامة",
    };

    res.status(201).json(createdTransaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في إنشاء المعاملة",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
