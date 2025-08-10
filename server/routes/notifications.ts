import { Router } from "express";
import Database from "better-sqlite3";
import {
  emailService,
  EmailConfig,
  NotificationData,
  NotificationType,
} from "../services/emailService.js";

const router = Router();
const db = new Database("clinic_database.sqlite");

// إعداد العروض المحضرة لقاعدة البيانات
const getEmailSettings = db.prepare(
  "SELECT * FROM email_settings ORDER BY id DESC LIMIT 1",
);
const updateEmailSettings = db.prepare(`
  UPDATE email_settings SET 
    enabled = ?, service = ?, host = ?, port = ?, secure = ?, 
    username = ?, password = ?, from_name = ?, updated_at = datetime('now')
  WHERE id = ?
`);
const insertEmailSettings = db.prepare(`
  INSERT INTO email_settings (enabled, service, host, port, secure, username, password, from_name)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertNotificationLog = db.prepare(`
  INSERT INTO email_notifications 
  (notification_type, recipient_email, recipient_name, appointment_id, subject, html_content, 
   sent_at, delivery_status, message_id, error_message, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getNotificationLogs = db.prepare(`
  SELECT * FROM email_notifications 
  ORDER BY created_at DESC 
  LIMIT ? OFFSET ?
`);

const getNotificationStats = db.prepare(`
  SELECT 
    notification_type,
    COUNT(*) as total,
    SUM(CASE WHEN delivery_status = 'sent' OR delivery_status = 'delivered' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending
  FROM email_notifications 
  WHERE created_at >= date('now', '-30 days')
  GROUP BY notification_type
`);

const updateNotificationStats = db.prepare(`
  INSERT OR REPLACE INTO notification_stats (date, notification_type, total_sent, total_delivered, total_failed)
  VALUES (?, ?, 
    COALESCE((SELECT total_sent FROM notification_stats WHERE date = ? AND notification_type = ?), 0) + 1,
    COALESCE((SELECT total_delivered FROM notification_stats WHERE date = ? AND notification_type = ?), 0) + ?,
    COALESCE((SELECT total_failed FROM notification_stats WHERE date = ? AND notification_type = ?), 0) + ?
  )
`);

// الحصول على إعدادات البريد الإلكتروني
router.get("/email-settings", (req, res) => {
  try {
    const settings = getEmailSettings.get() as any;

    if (settings) {
      // إخفاء كلمة المرور لأغراض الأمان
      const { password, ...safeSettings } = settings;
      res.json({
        success: true,
        data: {
          ...safeSettings,
          hasPassword: !!password,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          enabled: false,
          service: "gmail",
          host: "",
          port: 587,
          secure: false,
          username: "",
          from_name: "عيادة الدكتور كمال الملصي",
          hasPassword: false,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching email settings:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في جلب إعدادات البريد الإلكتروني" });
  }
});

// تحديث إعدادات البريد الإلكتروني
router.post("/email-settings", (req, res) => {
  try {
    const {
      enabled,
      service,
      host,
      port,
      secure,
      username,
      password,
      from_name,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!username || !from_name) {
      return res.status(400).json({
        success: false,
        error: "اسم المستخدم واسم المرسل مطلوبان",
      });
    }

    const settings = getEmailSettings.get() as any;

    if (settings) {
      // تحديث الإعدادات الموجودة
      const finalPassword = password || settings.password; // استخدام كلمة المرور القديمة إذا لم يتم تقديم واحدة جديدة
      updateEmailSettings.run(
        enabled,
        service,
        host,
        port,
        secure,
        username,
        finalPassword,
        from_name,
        settings.id,
      );
    } else {
      // إنشاء ��عدادات جديدة
      if (!password) {
        return res.status(400).json({
          success: false,
          error: "كلمة المرور مطلوبة لإعداد جديد",
        });
      }
      insertEmailSettings.run(
        enabled,
        service,
        host,
        port,
        secure,
        username,
        password,
        from_name,
      );
    }

    // تكوين خدمة البريد الإلكتروني
    if (enabled) {
      const config: EmailConfig = {
        enabled,
        service,
        host,
        port,
        secure,
        user: username,
        password: password || settings?.password,
        fromName: from_name,
      };

      emailService.configure(config);
    } else {
      emailService.configure({ enabled: false } as EmailConfig);
    }

    res.json({
      success: true,
      message: "تم حفظ إعدادات البريد الإلكتروني بنجاح",
    });
  } catch (error) {
    console.error("Error updating email settings:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في حفظ إعدادات البريد الإلكتروني" });
  }
});

// اختبار إعدادات البريد الإلكتروني
router.post("/test-email-settings", async (req, res) => {
  try {
    const result = await emailService.testConfiguration();

    if (result.success) {
      res.json({ success: true, message: "إعدادات البريد الإلكتروني صح��حة" });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("Error testing email settings:", error);
    res
      .status(500)
      .json({
        success: false,
        error: "خطأ في اختبار إعدادات البريد الإلكتروني",
      });
  }
});

// إرسال بريد اختبار
router.post("/send-test-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "البريد الإلكتروني مطلوب" });
    }

    const result = await emailService.sendTestEmail(email);

    // تسجيل النتيجة في قاعدة البيانات
    const today = new Date().toISOString().split("T")[0];
    insertNotificationLog.run(
      "test",
      email,
      "مستخدم اختبار",
      null,
      "📧 اختبار نظام الإشعارات",
      "بريد اختبار",
      result.success ? new Date().toISOString() : null,
      result.success ? "sent" : "failed",
      result.messageId || null,
      result.error || null,
      JSON.stringify({ testEmail: true }),
    );

    // تحديث الإحصائيات
    updateNotificationStats.run(
      today,
      "test",
      today,
      "test",
      today,
      "test",
      result.success ? 1 : 0,
      today,
      "test",
      result.success ? 0 : 1,
    );

    if (result.success) {
      res.json({
        success: true,
        message: "تم إرسال بريد الاختبار بنجاح",
        messageId: result.messageId,
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في إرسال بريد الاختبار" });
  }
});

// إرسال إشعار موعد
router.post("/send-appointment-notification", async (req, res) => {
  try {
    const {
      type,
      appointmentId,
      patientEmail,
      patientName,
      appointmentDate,
      appointmentTime,
      doctorName,
      notes,
    } = req.body;

    if (!type || !appointmentId || !patientEmail || !patientName) {
      return res.status(400).json({
        success: false,
        error:
          "البيانات المطلوبة: نوع الإشعار، رقم الموعد، بريد المريض، اسم المريض",
      });
    }

    const notificationData: NotificationData = {
      patientName,
      patientEmail,
      appointmentId,
      appointmentDate,
      appointmentTime,
      doctorName: doctorName || "الدكتور كمال الملصي",
      clinicName: "عيادة الدكتور كمال الملصي",
      clinicPhone: "+967 777 775 545",
      clinicAddress: "شارع المقالح -حي الاصبحي امام سيتي ماكس",
      notes,
    };

    const result = await emailService.sendNotification(
      type as NotificationType,
      notificationData,
    );

    // تسجيل النتيجة في قاعدة البيانات
    const today = new Date().toISOString().split("T")[0];
    let subject = "";
    switch (type) {
      case "confirmation":
        subject = `✅ تأكيد موعدك - ${appointmentId}`;
        break;
      case "reminder":
        subject = `⏰ تذكير بموعدك غداً - ${appointmentId}`;
        break;
      case "cancellation":
        subject = `❌ إلغاء موعدك - ${appointmentId}`;
        break;
    }

    insertNotificationLog.run(
      type,
      patientEmail,
      patientName,
      appointmentId,
      subject,
      "HTML content generated",
      result.success ? new Date().toISOString() : null,
      result.success ? "sent" : "failed",
      result.messageId || null,
      result.error || null,
      JSON.stringify(notificationData),
    );

    // تحديث الإحصائيات
    updateNotificationStats.run(
      today,
      type,
      today,
      type,
      today,
      type,
      result.success ? 1 : 0,
      today,
      type,
      result.success ? 0 : 1,
    );

    if (result.success) {
      res.json({
        success: true,
        message: "تم إرسال الإشعار بنجاح",
        messageId: result.messageId,
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("Error sending appointment notification:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في إرسال إشعار الموعد" });
  }
});

// الحصول على سجل الإشعارات
router.get("/logs", (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = getNotificationLogs.all(limit, offset);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: logs.length,
      },
    });
  } catch (error) {
    console.error("Error fetching notification logs:", error);
    res.status(500).json({ success: false, error: "خطأ في جلب سجل الإشعارات" });
  }
});

// الحصول عل�� إحصائيات الإشعارات
router.get("/stats", (req, res) => {
  try {
    const stats = getNotificationStats.all();

    const summary = {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      byType: stats,
    };

    stats.forEach((stat) => {
      summary.total += stat.total;
      summary.successful += stat.successful;
      summary.failed += stat.failed;
      summary.pending += stat.pending;
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في جلب إحصائيات الإشعارات" });
  }
});

// اختبار سريع للإشعارات - محاكاة حجز
router.post("/test-booking-notification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "البريد الإلكتروني مطلوب" });
    }

    // بيانات اختبار للحجز
    const testData: NotificationData = {
      patientName: "أحمد محمد (اختبار)",
      patientEmail: email,
      appointmentId: "TEST" + Math.floor(Math.random() * 10000),
      appointmentDate: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toLocaleDateString("ar-EG"),
      appointmentTime: "10:00 ص",
      doctorName: "د. كمال الملصي",
      clinicName: "عيادة الدكتور كمال الملصي",
      clinicPhone: "+967 777 775 545",
      clinicAddress: "شارع المقالح -حي الاصبحي امام سيتي ماكس",
      notes: "هذا اختبار لنظام الإشعارات",
    };

    const result = await emailService.sendNotification(
      "confirmation",
      testData,
    );

    // تسجيل النتيجة في قاعدة البيانات
    const today = new Date().toISOString().split("T")[0];
    insertNotificationLog.run(
      "confirmation",
      email,
      "أحمد محمد (اختبار)",
      testData.appointmentId,
      `✅ تأكيد موعدك - ${testData.appointmentId}`,
      "Test booking notification",
      result.success ? new Date().toISOString() : null,
      result.success ? "sent" : "failed",
      result.messageId || null,
      result.error || null,
      JSON.stringify({ ...testData, isTest: true }),
    );

    // تحديث الإحصائيات
    updateNotificationStats.run(
      today,
      "confirmation",
      today,
      "confirmation",
      today,
      "confirmation",
      result.success ? 1 : 0,
      today,
      "confirmation",
      result.success ? 0 : 1,
    );

    if (result.success) {
      res.json({
        success: true,
        message: "تم إرسال إشعار تأكيد الحجز التجريبي بنجاح!",
        messageId: result.messageId,
        appointmentId: testData.appointmentId,
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error("Error sending test booking notification:", error);
    res
      .status(500)
      .json({ success: false, error: "خطأ في إرسال الإشعار التجريبي" });
  }
});

// تهيئة خدمة البريد الإلكتروني عند بدء التشغيل
const initializeEmailService = () => {
  try {
    const settings = getEmailSettings.get() as any;

    if (settings && settings.enabled) {
      const config: EmailConfig = {
        enabled: settings.enabled,
        service: settings.service,
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        user: settings.username,
        password: settings.password,
        fromName: settings.from_name,
      };

      emailService.configure(config);
      console.log("✅ Email service initialized successfully");
    } else {
      console.log("ℹ️ Email service is disabled");
    }
  } catch (error) {
    console.error("❌ Error initializing email service:", error);
  }
};

// تهيئة الخدمة عند تحميل الوحدة
initializeEmailService();

export default router;
