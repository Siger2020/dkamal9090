import { db } from "./index.js";

/**
 * التحقق من حالة قاعدة البيانات وإصلاح أي مشاكل
 */
export function updateDatabase() {
  console.log("🔍 فحص قاعدة البيانات...");

  try {
    // إضافة العمود المطلوب لجدول payments إذا لم يكن موجوداً
    try {
      db.exec(
        `ALTER TABLE payments ADD COLUMN service_name TEXT DEFAULT 'خدمة عامة'`,
      );
      console.log("✅ تم إضافة عمود service_name إلى جدول payments");
    } catch (error) {
      // العمود موجود بالفعل أو خطأ آخر
      console.log("ℹ️ عمود service_name موجود بالفعل في جدول payments");
    }
    // التحقق من وجود جميع الجداول المطلوبة
    const requiredTables = [
      "users",
      "patients",
      "doctors",
      "services",
      "appointments",
      "medical_reports",
      "treatment_plans",
      "treatment_sessions",
      "financial_transactions",
      "invoices",
      "notifications",
      "notification_templates",
      "system_settings",
      "inventory",
      "inventory_movements",
      "activity_logs",
      "backups",
    ];

    const existingTables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all()
      .map((table: any) => table.name);

    console.log(`📊 الجداول الموجودة: ${existingTables.length}`);
    console.log(`📋 الجداول المطلوبة: ${requiredTables.length}`);

    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table),
    );

    if (missingTables.length > 0) {
      console.log(`⚠️ جداول مفقودة: ${missingTables.join(", ")}`);
    } else {
      console.log("✅ جميع الجداول موجودة");
    }

    // التحقق من البيانات الأساسية
    checkEssentialData();

    // إضافة بيانات تجريبية إضافية إذا لزم الأمر
    seedAdditionalData();

    console.log("✅ تم فحص قاعدة البيانات بنجاح");
  } catch (error) {
    console.error("❌ خطأ في فحص قاعدة البيانات:", error);
    throw error;
  }
}

/**
 * التحقق من البيانات الأساسية المطلوبة
 */
function checkEssentialData() {
  // التحقق من وجود مدير النظام
  const adminExists = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };

  if (adminExists.count === 0) {
    console.log("⚠️ لا يوجد مدير نظام، سيتم إضافة حساب افتراضي");

    const insertAdmin = db.prepare(`
      INSERT INTO users (name, email, password, phone, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    insertAdmin.run(
      "مدير النظام",
      "admin@dkalmoli.com",
      "123456",
      "967777775545",
      "admin",
    );

    console.log("✅ تم إضافة حساب مدير النظام");
  }

  // التحقق من وجود الخدمات
  const servicesCount = db
    .prepare("SELECT COUNT(*) as count FROM services")
    .get() as { count: number };

  if (servicesCount.count === 0) {
    console.log("⚠️ لا توجد خدمات، سيتم إضافة الخدمات الأساسية");
    addBasicServices();
  }

  // التحقق من إعدادات النظام
  const settingsCount = db
    .prepare("SELECT COUNT(*) as count FROM system_settings")
    .get() as { count: number };

  if (settingsCount.count === 0) {
    console.log("⚠️ لا توجد إعدادات نظام، سيت�� إضافة الإعدادات الأساسية");
    addBasicSettings();
  }
}

/**
 * إضافة الخدمات الأساسية
 */
function addBasicServices() {
  const insertService = db.prepare(`
    INSERT INTO services (name, name_en, description, duration_minutes, category, price, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const services = [
    [
      "تنظيف الأسنان",
      "Teeth Cleaning",
      "تنظيف شامل ومهني لأسنانك مع أحدث التقنيات",
      45,
      "general",
      200,
      true,
    ],
    [
      "حشوات الأسنان",
      "Dental Fillings",
      "حشوات تجميلية بأحدث المواد الطبية المعتمدة",
      60,
      "restorative",
      300,
      true,
    ],
    [
      "تقويم الأسنان",
      "Orthodontics",
      "تقويم شامل بأحدث التقنيات الطبية المتقدمة",
      90,
      "orthodontics",
      3000,
      true,
    ],
    [
      "زراعة الأسنان",
      "Dental Implants",
      "زراعة متطورة مع ضمان طويل المدى",
      120,
      "surgery",
      2500,
      true,
    ],
    [
      "تبييض الأسنان",
      "Teeth Whitening",
      "تبييض آمن وفعال لابتسامة مشرقة",
      60,
      "cosmetic",
      800,
      true,
    ],
    [
      "علاج الجذور",
      "Root Canal Treatment",
      "علاج متخصص للجذور بأحدث التقنيات",
      90,
      "endodontics",
      600,
      true,
    ],
    [
      "طب أسنان الأطفال",
      "Pediatric Dentistry",
      "رعاية أسنان لطيفة وممتعة مصممة خصيصًا للمرضى الصغار",
      45,
      "pediatric",
      150,
      true,
    ],
    [
      "طب الأسنان الترميمي",
      "Restorative Dentistry",
      "عالج أسنانك التالفة واسترجع وظيفة ابتسامتك ومظهرها",
      75,
      "restorative",
      400,
      true,
    ],
    [
      "طب الأسنان التجميلي",
      "Cosmetic Dentistry",
      "حسّن ابتسامتك مع العلاجات التجميلية المتطورة",
      60,
      "cosmetic",
      500,
      true,
    ],
    [
      "فحص دوري",
      "Regular Checkup",
      "فحص شامل لصحة الفم والأسنان",
      30,
      "general",
      100,
      true,
    ],
  ];

  const insertTransaction = db.transaction((services) => {
    for (const service of services) {
      insertService.run(...service);
    }
  });

  insertTransaction(services);
  console.log("✅ تم إضافة الخدمات الأساسية");
}

/**
 * إضافة إعدادات النظام الأساسية
 */
function addBasicSettings() {
  const insertSetting = db.prepare(`
    INSERT INTO system_settings (category, setting_key, setting_value, description, data_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  const settings = [
    ["clinic", "name", "عيادة الدكتور كمال الملصي", "اسم العيادة", "string"],
    [
      "clinic",
      "address",
      "شارع المقالح -حي الاصبحي امام سيتي ماكس",
      "عنوان العيادة",
      "string",
    ],
    ["clinic", "phone", "00967777775545", "رقم هاتف العيادة", "string"],
    [
      "clinic",
      "email",
      "info@dkalmoli.com",
      "البريد الإلكتروني للعيادة",
      "string",
    ],
    [
      "clinic",
      "working_hours",
      '{"saturday_to_thursday": "09:00-21:00", "friday": "14:00-21:00"}',
      "ساعات العمل",
      "json",
    ],
    ["clinic", "currency", "YER", "العملة", "string"],
    ["clinic", "timezone", "Asia/Aden", "المنطقة الزمنية", "string"],
    ["system", "language", "arabic", "لغة النظام الافتراضية", "string"],
    [
      "notifications",
      "sms_enabled",
      "false",
      "تفعيل الرسائل النصية",
      "boolean",
    ],
    [
      "notifications",
      "email_enabled",
      "true",
      "تفعيل البريد الإلكتروني",
      "boolean",
    ],
    [
      "notifications",
      "whatsapp_enabled",
      "false",
      "تفعيل الواتس آب",
      "boolean",
    ],
    [
      "appointments",
      "default_duration",
      "30",
      "مدة الموعد الافتراضية بالدقائق",
      "number",
    ],
    [
      "appointments",
      "booking_advance_days",
      "30",
      "عدد الأيام المسموح حجز مواعيد مسبقاً",
      "number",
    ],
    ["financial", "tax_rate", "0", "معدل الضريبة", "number"],
    ["financial", "late_payment_fee", "0", "رسوم التأخير في الدفع", "number"],
  ];

  const insertTransaction = db.transaction((settings) => {
    for (const setting of settings) {
      insertSetting.run(...setting);
    }
  });

  insertTransaction(settings);
  console.log("✅ تم إضافة إعدادات النظام الأساسية");
}

/**
 * إضافة بيانات تجريبية إضافية
 */
function seedAdditionalData() {
  try {
    // إضافة قوالب الإشعارات
    const templateCount = db
      .prepare("SELECT COUNT(*) as count FROM notification_templates")
      .get() as { count: number };

    if (templateCount.count === 0) {
      addNotificationTemplates();
    }

    // إضافة بعض عناصر المخزون
    const inventoryCount = db
      .prepare("SELECT COUNT(*) as count FROM inventory")
      .get() as { count: number };

    if (inventoryCount.count === 0) {
      addBasicInventory();
    }
  } catch (error) {
    console.error("تحذير: خطأ في إضافة البيانات الإضافية:", error);
  }
}

/**
 * إضافة قوالب الإشعارات
 */
function addNotificationTemplates() {
  const insertTemplate = db.prepare(`
    INSERT INTO notification_templates (name, type, subject, body_template, variables, channels, language)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const templates = [
    [
      "تأكيد الموعد",
      "appointment_confirmation",
      "تأكيد موعدك في عيادة الدكتور كمال",
      "عزيزنا {patient_name}، تم تأكيد موعدك في {appointment_date} الساعة {appointment_time}. نرجو الحضور قبل 10 دقائق من الموعد.",
      '["patient_name", "appointment_date", "appointment_time"]',
      '["sms", "whatsapp"]',
      "arabic",
    ],
    [
      "تذكير بالموعد",
      "appointment_reminder",
      "تذكير بموعدك غداً",
      "عزيزنا {patient_name}، نذكركم بموعدكم غداً {appointment_date} الساعة {appointment_time} مع {doctor_name}.",
      '["patient_name", "appointment_date", "appointment_time", "doctor_name"]',
      '["sms", "whatsapp"]',
      "arabic",
    ],
  ];

  const insertTransaction = db.transaction((templates) => {
    for (const template of templates) {
      insertTemplate.run(...template);
    }
  });

  insertTransaction(templates);
  console.log("✅ تم إضافة قوالب الإشعارات");
}

/**
 * إضافة مخزون أساسي
 */
function addBasicInventory() {
  const insertInventory = db.prepare(`
    INSERT INTO inventory (item_name, item_code, category, description, unit_of_measure, current_stock, minimum_stock, unit_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const items = [
    [
      "قفازات طبية",
      "GLV001",
      "مستهلكات",
      "قفازات طبية مطاطية للاستخدام الواحد",
      "عبوة",
      50,
      10,
      25,
    ],
    [
      "كمامات طبية",
      "MSK001",
      "مستهلكات",
      "كمامات طبية للحماية",
      "عبوة",
      100,
      20,
      15,
    ],
    ["مخدر موضعي", "ANS001", "أدوية", "مخدر موضعي للأسنان", "أنبوب", 20, 5, 45],
    [
      "حشوة تجميلية",
      "FIL001",
      "مواد طبية",
      "مواد الحشو التجميلي",
      "عبوة",
      15,
      3,
      120,
    ],
    ["خيط طبي", "STH001", "مستهلكات", "خيط طبي للجراحة", "لفة", 30, 10, 18],
  ];

  const insertTransaction = db.transaction((items) => {
    for (const item of items) {
      insertInventory.run(...item);
    }
  });

  insertTransaction(items);
  console.log("✅ تم إضافة مخزون أساسي");
}

/**
 * فحص سلامة البيانات
 */
export function validateDatabaseIntegrity() {
  console.log("🔍 فحص سلامة البيانات...");

  try {
    // فحص المراجع الخارجية
    const foreignKeyCheck = db.prepare("PRAGMA foreign_key_check").all();

    if (foreignKeyCheck.length > 0) {
      console.log("⚠️ مشاكل في المراجع الخارجية:", foreignKeyCheck);
    } else {
      console.log("✅ المراجع الخارجية سليمة");
    }

    // فحص الفهارس
    const indexes = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all();

    console.log(`📊 عدد الفهارس: ${indexes.length}`);

    // إحصائيات الجداول
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `,
      )
      .all();

    console.log("📊 إحصائيات الجداول:");
    for (const table of tables) {
      const count = db
        .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
        .get() as { count: number };
      console.log(`  - ${table.name}: ${count.count} سجل`);
    }

    console.log("✅ تم فحص سلامة البيانات");
  } catch (error) {
    console.error("❌ خطأ في فحص سلامة البيانات:", error);
    throw error;
  }
}

/**
 * تحسين قاعدة البيانات
 */
export function optimizeDatabase() {
  console.log("⚡ تحسين قاعدة البيانات...");

  try {
    // تحليل الجداول لتحسين الفهارس
    db.exec("ANALYZE");

    // تنظيف قاعدة البيانات
    db.exec("VACUUM");

    // إعادة بناء الفهارس
    db.exec("REINDEX");

    console.log("✅ تم تحسين قاعدة البيانات");
  } catch (error) {
    console.error("❌ خطأ في تحسين قاعدة البيانات:", error);
  }
}
