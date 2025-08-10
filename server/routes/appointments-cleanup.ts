import express from 'express';
import { db } from '../database/index.js';

const router = express.Router();

// تنظيف بيانات المواعيد وإعادة تطابقها
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 بدء تنظيف بيانات المواعيد...');

    // 1. حذف المواعيد التي لها patient_id غير موجود
    const deleteInvalidAppointments = db.prepare(`
      DELETE FROM appointments 
      WHERE patient_id NOT IN (SELECT id FROM patients)
    `);
    const deletedInvalid = deleteInvalidAppointments.run();
    console.log(`🗑️ تم حذف ${deletedInvalid.changes} موعد بـ patient_id خاطئ`);

    // 2. حذف المواعيد المكررة
    const deleteDuplicates = db.prepare(`
      DELETE FROM appointments 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM appointments 
        GROUP BY appointment_number
      )
    `);
    const deletedDuplicates = deleteDuplicates.run();
    console.log(`🗑️ تم حذف ${deletedDuplicates.changes} موعد مكرر`);

    // 3. الحصول على إحصائيات بعد التنظيف
    const totalAppointments = db.prepare(`
      SELECT COUNT(*) as count FROM appointments
    `).get() as { count: number };

    const validAppointments = db.prepare(`
      SELECT 
        a.appointment_number,
        u.name as patient_name,
        u.phone,
        a.status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      ORDER BY a.created_at DESC
    `).all();

    res.json({
      success: true,
      message: 'تم تنظيف بيانات المواعيد بنجاح',
      statistics: {
        deletedInvalid: deletedInvalid.changes,
        deletedDuplicates: deletedDuplicates.changes,
        totalAppointments: totalAppointments.count,
        validAppointments: validAppointments.length
      },
      validAppointments: validAppointments
    });

  } catch (error) {
    console.error('خطأ في تنظيف المواعيد:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تنظيف بيانات المواعيد'
    });
  }
});

// إعادة إنشاء المواعيد التجريبية بأسماء صحيحة
router.post('/recreate-sample', async (req, res) => {
  try {
    console.log('🔄 إعادة إنشاء المواعيد التجريبية...');

    // حذف جميع المواعيد الحالية
    db.prepare("DELETE FROM appointments").run();

    // الحصول على معرفات المرضى الصحيحة
    const patients = db.prepare(`
      SELECT p.id, u.name 
      FROM patients p 
      JOIN users u ON p.user_id = u.id 
      WHERE u.role = 'patient'
      ORDER BY p.id 
      LIMIT 3
    `).all();

    if (patients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا يوجد مرضى في النظام لإنشاء مواعيد تجريبية'
      });
    }

    const insertAppointment = db.prepare(`
      INSERT INTO appointments (
        appointment_number, 
        patient_id, 
        doctor_id, 
        service_id, 
        appointment_date, 
        appointment_time, 
        status, 
        chief_complaint,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const sampleAppointments = [
      [
        `APP${Date.now().toString().slice(-6)}01`,
        patients[0].id,
        1,
        1,
        today,
        "09:00",
        "confirmed", 
        "تنظيف دوري"
      ],
      [
        `APP${Date.now().toString().slice(-6)}02`,
        patients[Math.min(1, patients.length - 1)].id,
        1,
        2,
        tomorrow,
        "10:30",
        "scheduled",
        "فحص عام"
      ]
    ];

    if (patients.length >= 3) {
      sampleAppointments.push([
        `APP${Date.now().toString().slice(-6)}03`,
        patients[2].id,
        1,
        3,
        tomorrow,
        "14:00",
        "scheduled",
        "استشارة تقويم"
      ]);
    }

    for (const appointment of sampleAppointments) {
      insertAppointment.run(...appointment);
    }

    // التحقق من النتيجة
    const newAppointments = db.prepare(`
      SELECT 
        a.appointment_number,
        u.name as patient_name,
        a.appointment_date,
        a.appointment_time,
        a.status
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
    `).all();

    res.json({
      success: true,
      message: `تم إنشاء ${sampleAppointments.length} موعد تجريبي بأسماء صحيحة`,
      appointments: newAppointments
    });

  } catch (error) {
    console.error('خطأ في إعادة إنشاء المواعيد:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في إعادة إنشاء المواعيد التجريبية'
    });
  }
});

export default router;
