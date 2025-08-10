import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// تحديد بيئة التشغيل
export const isNetlify = process.env.NETLIFY === 'true';

let dbInstance: Database.Database | null = null;

// إنشاء اتصال قاعدة البيانات مناسب للبيئة
export function createDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (isNetlify) {
    // في بيئة Netlify، استخدم قاعدة بيانات في الذاكرة
    console.log("🌐 تشغيل في بيئة Netlify - استخدام ق��عدة بيانات في الذاكرة");
    dbInstance = new Database(':memory:');
  } else {
    // في بيئة التطوير المحلية، استخدم ملف قاعدة البيانات
    const dbPath = join(__dirname, "../../clinic_database.sqlite");
    dbInstance = new Database(dbPath);
  }

  // تكوين قاعدة البيانات
  if (!isNetlify) {
    dbInstance.pragma("journal_mode = WAL");
  }
  dbInstance.pragma("foreign_keys = ON");

  return dbInstance;
}

// الحصول على قاعدة البيانات
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

// تهيئة قاعدة البيانات مع البيانات الأساسية
export async function initializeNetlifyDatabase() {
  try {
    const db = getDatabase();
    
    console.log(`🔧 تهيئة قاعدة البيانات (بيئة: ${isNetlify ? 'Netlify' : 'محلية'})`);
    
    // قراءة وتطبيق Schema
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);
    console.log("✅ تم تهيئة قاعدة البيانات بنجاح");

    // إنشاء حساب مدير أساسي
    await createNetlifyAdminAccount(db);

    console.log("���� قاعدة البيانات جاهزة للاستخدام!");
    
    return db;
  } catch (error) {
    console.error("❌ خطأ في تهيئة قاعدة البيانات:", error);
    throw error;
  }
}

// إنشاء حساب مدير للبيئة السحابية
async function createNetlifyAdminAccount(db: Database.Database) {
  try {
    console.log("👤 إنشاء حساب مدير أساسي...");

    // التحقق من وجود مستخدمين
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

    if (userCount.count === 0) {
      // إنشاء حساب مدير بسيط
      const insertAdmin = db.prepare(`
        INSERT INTO users (name, email, password, phone, role, gender, address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      insertAdmin.run(
        "مدير النظام",
        "admin@clinic.com",
        "admin123",
        "00967777000000",
        "admin",
        "male",
        "عيادة الأسنان"
      );

      console.log("✅ تم إنشاء حساب المدير الأساسي:");
      console.log("📧 البريد الإلكتروني: admin@clinic.com");
      console.log("🔑 كلمة المرور: admin123");
      console.log("⚠️ يُنصح بتغيير كلمة المرور بعد أول تسجيل دخول");

    } else {
      console.log(`👥 يوجد ${userCount.count} مستخدم في النظام`);
    }

  } catch (error) {
    console.error("❌ خطأ في إنشاء حساب المدير الأساسي:", error);
  }
}

// إنشاء خدمات أساسية للعيادة
export async function createBasicServices(db: Database.Database) {
  try {
    console.log("🏥 إضافة الخدمات الأساسية للعيادة...");

    const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services").get() as { count: number };

    if (serviceCount.count === 0) {
      const insertService = db.prepare(`
        INSERT INTO services (name, description, base_price, duration_minutes, category, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      const services = [
        ["فحص دوري", "فحص دوري شامل للأسنان", 30, 30, "عام", 1],
        ["تنظيف الأسنان", "تنظيف وتلميع الأسنان", 50, 45, "وقائي", 1],
        ["حشو عادي", "حشو سن واحد بمادة عادية", 80, 60, "علاجي", 1],
        ["حشو تجميلي", "حشو سن واحد بمادة تجميلية", 120, 75, "تجميلي", 1],
        ["خلع سن", "خلع سن بسيط", 40, 30, "جراحي", 1],
        ["تبييض الأسنان", "جلسة تبييض أسنان", 200, 90, "تجميلي", 1]
      ];

      for (const service of services) {
        insertService.run(...service);
      }

      console.log(`✅ تم إضافة ${services.length} خدمة أساسية`);
    }
  } catch (error) {
    console.error("❌ خطأ في إضافة الخدمات الأساسية:", error);
  }
}

export { dbInstance as db };
