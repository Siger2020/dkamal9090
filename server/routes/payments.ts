import { Router } from "express";
import { getDatabase } from "../database/index.js";

const router = Router();

// Get all payments with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 50, patient_name, transaction_id, method, date_from, date_to } = req.query;
    
    let query = `
      SELECT 
        p.*,
        t.patient_name as transaction_patient_name,
        t.service_name,
        t.total_amount as transaction_total
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (patient_name) {
      query += ` AND (p.patient_name LIKE ? OR t.patient_name LIKE ?)`;
      params.push(`%${patient_name}%`, `%${patient_name}%`);
    }
    
    if (transaction_id) {
      query += ` AND p.transaction_id = ?`;
      params.push(transaction_id);
    }
    
    if (method) {
      query += ` AND p.payment_method = ?`;
      params.push(method);
    }
    
    if (date_from) {
      query += ` AND DATE(p.payment_date) >= ?`;
      params.push(date_from);
    }
    
    if (date_to) {
      query += ` AND DATE(p.payment_date) <= ?`;
      params.push(date_to);
    }
    
    query += ` ORDER BY p.payment_date DESC`;
    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    
    const payments = db.prepare(query).all(...params);
    
    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params
    const totalResult = db.prepare(countQuery).get(...countParams) as { total: number };
    
    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / Number(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في استرجاع المدفوعات",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get payment by ID
router.get("/:id", async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    const payment = db.prepare(`
      SELECT 
        p.*,
        t.patient_name as transaction_patient_name,
        t.service_name,
        t.total_amount as transaction_total,
        t.paid_amount as transaction_paid,
        t.remaining_amount as transaction_remaining
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.id = ?
    `).get(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "الدفعة غير موجودة"
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في استرجاع الدفعة",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Create new payment
router.post("/", async (req, res) => {
  try {
    const db = getDatabase();
    const {
      transaction_id,
      patient_name,
      amount,
      payment_method,
      notes,
      service_name
    } = req.body;
    
    // Validate required fields
    if (!amount || !payment_method || !patient_name) {
      return res.status(400).json({
        success: false,
        message: "الحقول المطلوبة: المبلغ، طريقة الدفع، اسم المريض"
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "المبلغ يجب أن يكون أكبر من صفر"
      });
    }
    
    // Start transaction
    const transaction = db.transaction(() => {
      const paymentId = `PAY-${Date.now()}`;
      const paymentDate = new Date().toISOString();
      
      // Insert payment record
      const insertPayment = db.prepare(`
        INSERT INTO payments (
          id, transaction_id, patient_name, amount, payment_method, 
          notes, payment_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertPayment.run(
        paymentId,
        transaction_id || null,
        patient_name,
        amount,
        payment_method,
        notes || null,
        paymentDate,
        paymentDate,
        paymentDate
      );
      
      // If linked to existing transaction, update transaction amounts
      if (transaction_id) {
        const existingTransaction = db.prepare(`
          SELECT * FROM transactions WHERE id = ?
        `).get(transaction_id);
        
        if (existingTransaction) {
          const newPaidAmount = existingTransaction.paid_amount + amount;
          const newRemainingAmount = existingTransaction.total_amount - newPaidAmount;
          
          // Validate payment doesn't exceed remaining amount
          if (amount > existingTransaction.remaining_amount) {
            throw new Error("مبلغ الدفعة أكبر من المبلغ المتبقي");
          }
          
          // Determine new status
          let newStatus = "pending";
          if (newRemainingAmount === 0) {
            newStatus = "paid";
          } else if (newPaidAmount > 0) {
            newStatus = "partial";
          }
          
          // Update transaction
          const updateTransaction = db.prepare(`
            UPDATE transactions 
            SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = ?
            WHERE id = ?
          `);
          
          updateTransaction.run(
            newPaidAmount,
            newRemainingAmount,
            newStatus,
            paymentDate,
            transaction_id
          );
        }
      } else {
        // Create new transaction if not linked to existing one
        const transactionId = `TXN-${Date.now()}`;
        const insertTransaction = db.prepare(`
          INSERT INTO transactions (
            id, patient_name, service_name, total_amount, paid_amount, 
            remaining_amount, status, payment_method, transaction_date, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertTransaction.run(
          transactionId,
          patient_name,
          service_name || "خدمة عامة",
          amount,
          amount,
          0,
          "paid",
          payment_method,
          paymentDate,
          paymentDate,
          paymentDate
        );
        
        // Update payment with transaction_id
        const updatePayment = db.prepare(`
          UPDATE payments SET transaction_id = ? WHERE id = ?
        `);
        updatePayment.run(transactionId, paymentId);
      }
      
      return paymentId;
    });
    
    const paymentId = transaction();
    
    // Get the created payment with transaction details
    const createdPayment = db.prepare(`
      SELECT 
        p.*,
        t.patient_name as transaction_patient_name,
        t.service_name,
        t.total_amount as transaction_total
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.id = ?
    `).get(paymentId);
    
    res.status(201).json({
      success: true,
      message: "تم تسجيل الدفعة بنجاح",
      data: createdPayment
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "خطأ في تسجيل الدفعة",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Update payment
router.put("/:id", async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { amount, payment_method, notes } = req.body;
    
    // Check if payment exists
    const existingPayment = db.prepare(`
      SELECT * FROM payments WHERE id = ?
    `).get(id);
    
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: "الدفعة غير موجودة"
      });
    }
    
    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "المبلغ يجب أن يكون أكبر من صفر"
      });
    }
    
    const updatePayment = db.prepare(`
      UPDATE payments 
      SET amount = COALESCE(?, amount),
          payment_method = COALESCE(?, payment_method),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `);
    
    updatePayment.run(
      amount,
      payment_method,
      notes,
      new Date().toISOString(),
      id
    );
    
    // Get updated payment
    const updatedPayment = db.prepare(`
      SELECT 
        p.*,
        t.patient_name as transaction_patient_name,
        t.service_name,
        t.total_amount as transaction_total
      FROM payments p
      LEFT JOIN transactions t ON p.transaction_id = t.id
      WHERE p.id = ?
    `).get(id);
    
    res.json({
      success: true,
      message: "تم تحديث الدفعة بنجاح",
      data: updatedPayment
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في تحديث الدفعة",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Delete payment
router.delete("/:id", async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    // Check if payment exists and get transaction info
    const existingPayment = db.prepare(`
      SELECT * FROM payments WHERE id = ?
    `).get(id);
    
    if (!existingPayment) {
      return res.status(404).json({
        success: false,
        message: "الدفعة غير موجودة"
      });
    }
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Delete payment
      const deletePayment = db.prepare(`DELETE FROM payments WHERE id = ?`);
      deletePayment.run(id);
      
      // Update related transaction if exists
      if (existingPayment.transaction_id) {
        const updateTransaction = db.prepare(`
          UPDATE transactions 
          SET paid_amount = paid_amount - ?,
              remaining_amount = remaining_amount + ?,
              status = CASE 
                WHEN paid_amount - ? = 0 THEN 'pending'
                WHEN paid_amount - ? < total_amount THEN 'partial'
                ELSE 'paid'
              END,
              updated_at = ?
          WHERE id = ?
        `);
        
        updateTransaction.run(
          existingPayment.amount,
          existingPayment.amount,
          existingPayment.amount,
          existingPayment.amount,
          new Date().toISOString(),
          existingPayment.transaction_id
        );
      }
    });
    
    transaction();
    
    res.json({
      success: true,
      message: "تم حذف الدفعة بنجاح"
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "خطأ في حذف الدفعة",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get payment statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const db = getDatabase();
    const { date_from, date_to } = req.query;
    
    let dateFilter = "";
    const params: any[] = [];
    
    if (date_from) {
      dateFilter += " AND DATE(payment_date) >= ?";
      params.push(date_from);
    }
    
    if (date_to) {
      dateFilter += " AND DATE(payment_date) <= ?";
      params.push(date_to);
    }
    
    // Total payments
    const totalPayments = db.prepare(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments 
      WHERE 1=1 ${dateFilter}
    `).get(...params);
    
    // Payments by method
    const paymentsByMethod = db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments 
      WHERE 1=1 ${dateFilter}
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `).all(...params);
    
    // Daily payments (last 7 days if no date filter)
    const dailyQuery = date_from || date_to ? `
      SELECT 
        DATE(payment_date) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments 
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(payment_date)
      ORDER BY date DESC
    ` : `
      SELECT 
        DATE(payment_date) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments 
      WHERE DATE(payment_date) >= DATE('now', '-7 days')
      GROUP BY DATE(payment_date)
      ORDER BY date DESC
    `;
    
    const dailyPayments = db.prepare(dailyQuery).all(...(date_from || date_to ? params : []));
    
    res.json({
      success: true,
      data: {
        total_payments: totalPayments,
        payments_by_method: paymentsByMethod,
        daily_payments: dailyPayments
      }
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    res.status(500).json({
      success: false,
      message: "��طأ في استرجاع إحصائيات المدفوعات",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
