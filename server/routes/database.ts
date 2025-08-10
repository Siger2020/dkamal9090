import { RequestHandler } from "express";
import {
  db,
  getDatabaseStats,
  createBackup,
  globalSearch,
} from "../database/index.js";

// الحصول على إحصائيات قاعدة البيانات
export const getDatabaseStatsHandler: RequestHandler = (req, res) => {
  try {
    const stats = getDatabaseStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في الحصول على إحصائيات قاعدة البيانات",
    });
  }
};

// عرض جميع الجداول
export const getTablesHandler: RequestHandler = (req, res) => {
  try {
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `,
      )
      .all();

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في الحصول على قائمة الجداول",
    });
  }
};

// عرض محتويات جدول محدد
export const getTableDataHandler: RequestHandler = (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 20, search = "" } = req.query;

    // التحقق من صحة اسم الجدول
    const validTables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()
      .map((t: any) => t.name);

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: "اسم الجدول غير صالح",
      });
    }

    // الحصول على معلومات الأعمدة
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

    // إعداد البحث
    let whereClause = "";
    let searchValues: any[] = [];

    if (search) {
      const searchableColumns = columns
        .filter(
          (col: any) =>
            col.type.includes("TEXT") || col.type.includes("VARCHAR"),
        )
        .map((col: any) => `${col.name} LIKE ?`);

      if (searchableColumns.length > 0) {
        whereClause = `WHERE ${searchableColumns.join(" OR ")}`;
        searchValues = new Array(searchableColumns.length).fill(`%${search}%`);
      }
    }

    // حساب إجمالي الصفوف
    const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const totalRows = db.prepare(countQuery).get(...searchValues) as {
      total: number;
    };

    // الحصول على البيانات مع التصفح
    const offset = (Number(page) - 1) * Number(limit);
    const dataQuery = `
      SELECT * FROM ${tableName} 
      ${whereClause}
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;

    const rows = db
      .prepare(dataQuery)
      .all(...searchValues, Number(limit), offset);

    res.json({
      success: true,
      data: {
        tableName,
        columns,
        rows,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalRows.total / Number(limit)),
          totalRows: totalRows.total,
          limit: Number(limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في الحصول على بيانات الجدول",
    });
  }
};

// إضافة سجل جديد
export const insertRecordHandler: RequestHandler = (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;

    // التحقق من صحة اسم الجدول
    const validTables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()
      .map((t: any) => t.name);

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: "اسم الجدول غير صالح",
      });
    }

    // الحصول على معلومات الأعمدة
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

    // تصفية البيانات المرسلة لتشمل الأعمدة الموجودة فقط
    const validColumns = columns
      .filter(
        (col: any) =>
          col.name !== "id" &&
          col.name !== "created_at" &&
          col.name !== "updated_at",
      )
      .map((col: any) => col.name);

    const filteredData: any = {};
    validColumns.forEach((col) => {
      if (data[col] !== undefined) {
        filteredData[col] = data[col];
      }
    });

    // إنشاء استعلام الإدراج
    const columnNames = Object.keys(filteredData);
    const placeholders = columnNames.map(() => "?").join(", ");
    const values = Object.values(filteredData);

    const insertQuery = `
      INSERT INTO ${tableName} (${columnNames.join(", ")}) 
      VALUES (${placeholders})
    `;

    const result = db.prepare(insertQuery).run(...values);

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        insertedData: filteredData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في إضافة السجل",
    });
  }
};

// تحديث سجل
export const updateRecordHandler: RequestHandler = (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;

    // التحقق من صحة اسم الجدول
    const validTables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()
      .map((t: any) => t.name);

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: "اسم الجدول غير صالح",
      });
    }

    // الحصول على معلومات الأعمدة
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

    // تصفية البيانات المرسلة
    const validColumns = columns
      .filter((col: any) => col.name !== "id" && col.name !== "created_at")
      .map((col: any) => col.name);

    const filteredData: any = {};
    validColumns.forEach((col) => {
      if (data[col] !== undefined) {
        filteredData[col] = data[col];
      }
    });

    // إضافة updated_at إذا كان العمود موجوداً
    if (columns.some((col: any) => col.name === "updated_at")) {
      filteredData.updated_at = new Date().toISOString();
    }

    // إنشاء استعلام التحديث
    const columnNames = Object.keys(filteredData);
    const setClause = columnNames.map((col) => `${col} = ?`).join(", ");
    const values = Object.values(filteredData);

    const updateQuery = `
      UPDATE ${tableName} 
      SET ${setClause} 
      WHERE id = ?
    `;

    const result = db.prepare(updateQuery).run(...values, id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "السجل غير موجود",
      });
    }

    res.json({
      success: true,
      data: {
        id: Number(id),
        updatedData: filteredData,
        changes: result.changes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في تحديث السجل",
    });
  }
};

// حذف سجل
export const deleteRecordHandler: RequestHandler = (req, res) => {
  try {
    const { tableName, id } = req.params;

    // التحقق من صحة اسم الجدول
    const validTables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all()
      .map((t: any) => t.name);

    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: "اسم الجدول غير صالح",
      });
    }

    const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;
    const result = db.prepare(deleteQuery).run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: "السجل غير موجود",
      });
    }

    res.json({
      success: true,
      data: {
        id: Number(id),
        changes: result.changes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في حذف السجل",
    });
  }
};

// البحث الشامل
export const globalSearchHandler: RequestHandler = (req, res) => {
  try {
    const { q: query, limit = 50 } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "نص البحث مطلوب",
      });
    }

    const results = globalSearch(query, Number(limit));

    res.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ ف�� البحث",
    });
  }
};

// إنشاء نسخة احتياطية
export const createBackupHandler: RequestHandler = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await createBackup(name);

    if (result.success) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في إنشاء النسخة الاحتياطية",
    });
  }
};

// الحصول على قائمة النسخ الاحتياطية
export const getBackupsHandler: RequestHandler = (req, res) => {
  try {
    const backups = db
      .prepare(
        `
      SELECT id, backup_name, backup_type, file_size, status, created_at, completed_at
      FROM backups 
      ORDER BY created_at DESC
    `,
      )
      .all();

    res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "خطأ في الحصول على قائمة النسخ الاحتياطية",
    });
  }
};

// تنفيذ استعلام SQL مخصص (للمطورين فقط)
export const executeQueryHandler: RequestHandler = (req, res) => {
  try {
    const { query, params = [] } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        success: false,
        error: "الاستعلام مطلوب",
      });
    }

    // منع استعلامات خطيرة
    const dangerousKeywords = [
      "DROP",
      "DELETE",
      "TRUNCATE",
      "ALTER",
      "CREATE",
      "INSERT",
      "UPDATE",
    ];
    const upperQuery = query.toUpperCase();

    // السماح فقط بـ SELECT
    if (!upperQuery.trim().startsWith("SELECT")) {
      return res.status(403).json({
        success: false,
        error: "مسموح فقط باستعلامات SELECT",
      });
    }

    const stmt = db.prepare(query);
    const result = stmt.all(...params);

    res.json({
      success: true,
      data: {
        query,
        results: result,
        count: result.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `خطأ في تنفيذ الاستعلام: ${error.message}`,
    });
  }
};

// البحث عن موعد محدد
export const findAppointmentHandler: RequestHandler = (req, res) => {
  try {
    const { appointmentNumber } = req.params;

    console.log(`🔍 البحث عن الموعد: ${appointmentNumber}`);

    // البحث في جدول المواعيد
    const appointment = db.prepare(`
      SELECT
        a.*,
        u.name as patient_name,
        u.phone,
        u.email
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE a.appointment_number = ?
    `).get(appointmentNumber);

    if (appointment) {
      console.log(`✅ تم العثور على الموعد:`, appointment);
    } else {
      console.log(`❌ لم يتم العثور على الموعد: ${appointmentNumber}`);

      // فحص إذا كان هناك أي مواعيد في النظام
      const allAppointments = db.prepare(`
        SELECT appointment_number, patient_id, created_at
        FROM appointments
        ORDER BY created_at DESC
        LIMIT 10
      `).all();

      console.log(`📊 جميع المواعيد في النظام:`, allAppointments);
    }

    res.json({
      success: true,
      data: {
        appointment,
        found: !!appointment
      }
    });

  } catch (error) {
    console.error("❌ خطأ في البحث عن الموعد:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في البحث عن الموعد",
    });
  }
};

// الحصول على المرضى مع بيانات المستخدمين
export const getPatientsHandler: RequestHandler = (req, res) => {
  try {
    const patients = db.prepare(`
      SELECT
        p.*,
        u.name,
        u.email,
        u.phone,
        u.address,
        u.gender,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at
      FROM patients p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();

    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    console.error("❌ خطأ في الحصول على بيانات المرضى:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الحصول على بيانات المرضى",
    });
  }
};

// حذف جميع البيانات ماعدا حساب المدير
export const bulkDataCleanupHandler: RequestHandler = (req, res) => {
  try {
    console.log("�� بدء عملية تنظيف البيانات...");

    // إيقاف foreign key constraints مؤقتاً لضمان نجاح الح��ف
    db.pragma("foreign_keys = OFF");

    const transaction = db.transaction(() => {
      // الحصول على معرف حساب المدير
      const adminUser = db.prepare(`
        SELECT id FROM users
        WHERE email = 'admin@dkalmoli.com' AND role = 'admin'
        LIMIT 1
      `).get() as { id: number } | undefined;

      if (!adminUser) {
        throw new Error("حساب المدير غير موجود");
      }

      console.log(`📋 معرف حساب المدير: ${adminUser.id}`);

      // 1. حذف جميع المواعيد
      const deletedAppointments = db.prepare("DELETE FROM appointments").run();
      console.log(`✅ تم حذف ${deletedAppointments.changes} موعد`);

      // 2. حذف جميع المرضى (سيؤدي إلى حذف البيانات المرتبطة تلقائياً)
      const deletedPatients = db.prepare("DELETE FROM patients").run();
      console.log(`✅ تم حذف ${deletedPatients.changes} مريض`);

      // 3. حذف جميع الأطباء ماعدا الذين مرتبطين بحساب المدير
      const deletedDoctors = db.prepare(`
        DELETE FROM doctors
        WHERE user_id != ?
      `).run(adminUser.id);
      console.log(`✅ تم حذف ${deletedDoctors.changes} طبيب`);

      // 4. حذف جميع المعاملات المالية
      const deletedTransactions = db.prepare("DELETE FROM financial_transactions").run();
      console.log(`✅ تم حذف ${deletedTransactions.changes} معاملة مالية`);

      // 5. حذف جميع الفواتير
      const deletedInvoices = db.prepare("DELETE FROM invoices").run();
      console.log(`✅ تم حذف ${deletedInvoices.changes} فاتورة`);

      // 6. حذف جميع التقارير الطبية
      const deletedReports = db.prepare("DELETE FROM medical_reports").run();
      console.log(`✅ تم حذف ${deletedReports.changes} تقرير طبي`);

      // 7. حذف جميع خطط العلاج
      const deletedPlans = db.prepare("DELETE FROM treatment_plans").run();
      console.log(`✅ تم حذف ${deletedPlans.changes} خطة علاج`);

      // 8. حذف جميع جلسات العلاج
      const deletedSessions = db.prepare("DELETE FROM treatment_sessions").run();
      console.log(`✅ تم حذف ${deletedSessions.changes} جلسة علاج`);

      // 9. حذف جميع الإشعارات
      const deletedNotifications = db.prepare("DELETE FROM notifications").run();
      console.log(`✅ تم حذف ${deletedNotifications.changes} إشعار`);

      // 10. حذف جميع سجلات النشاط
      const deletedActivityLogs = db.prepare("DELETE FROM activity_logs").run();
      console.log(`✅ تم حذف ${deletedActivityLogs.changes} سجل نشاط`);

      // 11. حذف جميع المستخدمين ماعدا حساب المدير
      const deletedUsers = db.prepare(`
        DELETE FROM users
        WHERE id != ? AND email != 'admin@dkalmoli.com'
      `).run(adminUser.id);
      console.log(`✅ تم حذف ${deletedUsers.changes} مستخدم`);

      // التأكد من بقاء حساب المدير فقط
      const remainingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
      const remainingAdmin = db.prepare(`
        SELECT id, name, email, role FROM users
        WHERE email = 'admin@dkalmoli.com'
      `).get();

      console.log(`📊 عدد المستخدمين المتبقيين: ${remainingUsers.count}`);
      console.log("📊 حساب المدير المتبقي:", remainingAdmin);

      if (remainingUsers.count !== 1 || !remainingAdmin) {
        throw new Error("فشل في الحفاظ على حساب المدير");
      }

      return {
        deletedAppointments: deletedAppointments.changes,
        deletedPatients: deletedPatients.changes,
        deletedDoctors: deletedDoctors.changes,
        deletedTransactions: deletedTransactions.changes,
        deletedInvoices: deletedInvoices.changes,
        deletedReports: deletedReports.changes,
        deletedPlans: deletedPlans.changes,
        deletedSessions: deletedSessions.changes,
        deletedNotifications: deletedNotifications.changes,
        deletedActivityLogs: deletedActivityLogs.changes,
        deletedUsers: deletedUsers.changes,
        remainingUsers: remainingUsers.count,
        adminUser: remainingAdmin
      };
    });

    const result = transaction();

    // إعادة تفعيل foreign key constraints
    db.pragma("foreign_keys = ON");

    console.log("✅ تم تنظيف جميع البيانات بنجاح");

    res.json({
      success: true,
      message: "تم حذف جميع البيانات بنجاح ماعدا حساب مدير النظام",
      data: result,
    });

  } catch (error) {
    // إعادة تفعيل foreign key constraints في حالة الخطأ
    db.pragma("foreign_keys = ON");

    console.error("❌ خطأ في تنظيف البيانات:", error);
    res.status(500).json({
      success: false,
      error: `خطأ في تنظيف البيانات: ${error.message}`,
    });
  }
};
