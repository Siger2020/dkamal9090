import express from "express";
import multer from "multer";
import { db } from "../database/index.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = join(__dirname, "../../uploads/ai-analysis");
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${timestamp}_${originalName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم"));
    }
  },
});

// تحليل الصور الطبية
router.post("/analyze-image", upload.single("image"), async (req, res) => {
  console.log("AI Analysis - Image upload started");
  console.log("File received:", req.file ? "Yes" : "No");
  console.log("Request body:", req.body);

  try {
    if (!req.file) {
      console.log("Error: No file uploaded");
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    console.log("File details:", {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
    });

    const { patientId, doctorId } = req.body;

    // إنشاء رقم تحليل فريد
    const analysisNumber = `AI${Date.now()}`;

    console.log("Starting AI analysis simulation...");
    // محاكاة تحليل الذكاء الاصطناعي
    const mockAIAnalysis = await simulateImageAnalysis(req.file);
    console.log("AI analysis completed:", mockAIAnalysis);

    // حفظ التحليل في قاعدة البيانات
    console.log("Preparing database insert...");
    const insertAnalysis = db.prepare(`
      INSERT INTO ai_analyses (
        analysis_number, patient_id, doctor_id, analysis_type,
        input_data, file_path, file_type, file_size,
        ai_model_used, confidence_score, diagnosis,
        recommendations, severity_level, status,
        processing_time_ms, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    console.log("Executing database insert with data:", {
      analysisNumber,
      patientId: patientId || null,
      doctorId: doctorId || null,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      diagnosis: mockAIAnalysis.diagnosis,
      confidence: mockAIAnalysis.confidence,
    });

    const analysisResult = insertAnalysis.run(
      analysisNumber,
      patientId || null,
      doctorId || null,
      "image",
      JSON.stringify({
        fileName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
      }),
      req.file.path,
      req.file.mimetype,
      req.file.size,
      "dental_image_classifier",
      mockAIAnalysis.confidence,
      mockAIAnalysis.diagnosis,
      JSON.stringify(mockAIAnalysis.recommendations),
      mockAIAnalysis.severity,
      "completed",
      mockAIAnalysis.processingTime,
      1, // مستخدم النظام
    );

    console.log("Database insert result:", analysisResult);

    // إنشاء تقرير مفصل
    const insertReport = db.prepare(`
      INSERT INTO ai_analysis_reports (
        analysis_id, report_type, title, content, 
        insights, risk_factors, prevention_tips,
        urgency_indicators, generated_by_ai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReport.run(
      analysisResult.lastInsertRowid,
      "detailed",
      "تقرير تحليل الصورة الطبية",
      mockAIAnalysis.detailedReport,
      JSON.stringify(mockAIAnalysis.insights),
      JSON.stringify(mockAIAnalysis.riskFactors),
      JSON.stringify(mockAIAnalysis.preventionTips),
      JSON.stringify(mockAIAnalysis.urgencyIndicators),
      true,
    );

    res.json({
      success: true,
      analysis: {
        id: analysisResult.lastInsertRowid,
        analysisNumber: analysisNumber,
        diagnosis: mockAIAnalysis.diagnosis,
        confidence: mockAIAnalysis.confidence,
        recommendations: mockAIAnalysis.recommendations,
        severity: mockAIAnalysis.severity,
        processingTime: mockAIAnalysis.processingTime,
      },
    });
  } catch (error) {
    console.error("خطأ في تحليل الصورة - Full error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء تحليل الصورة: " + error.message,
    });
  }
});

// تحليل الأعراض النصية
router.post("/analyze-symptoms", async (req, res) => {
  try {
    const { symptoms, patientAge, patientGender, patientId, doctorId } =
      req.body;

    if (!symptoms || symptoms.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "يرجى كتابة الأعراض",
      });
    }

    // إنشاء رقم تحليل فريد
    const analysisNumber = `SYM${Date.now()}`;

    // محاكاة تحليل الأعراض
    const mockAIAnalysis = await simulateSymptomsAnalysis(
      symptoms,
      patientAge,
      patientGender,
    );

    // حفظ التحليل في قاعدة البيانات
    const insertAnalysis = db.prepare(`
      INSERT INTO ai_analyses (
        analysis_number, patient_id, doctor_id, analysis_type, 
        input_data, ai_model_used, confidence_score, diagnosis, 
        recommendations, severity_level, status,
        processing_time_ms, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const analysisResult = insertAnalysis.run(
      analysisNumber,
      patientId || null,
      doctorId || null,
      "symptoms",
      JSON.stringify({
        symptoms: symptoms,
        patientAge: patientAge,
        patientGender: patientGender,
        analyzedAt: new Date().toISOString(),
      }),
      "symptom_analyzer",
      mockAIAnalysis.confidence,
      mockAIAnalysis.diagnosis,
      JSON.stringify(mockAIAnalysis.recommendations),
      mockAIAnalysis.severity,
      "completed",
      mockAIAnalysis.processingTime,
      1,
    );

    // إنشاء تقرير مفصل
    const insertReport = db.prepare(`
      INSERT INTO ai_analysis_reports (
        analysis_id, report_type, title, content, 
        insights, risk_factors, prevention_tips,
        related_conditions, urgency_indicators, generated_by_ai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertReport.run(
      analysisResult.lastInsertRowid,
      "detailed",
      "تقرير تحليل الأعراض",
      mockAIAnalysis.detailedReport,
      JSON.stringify(mockAIAnalysis.insights),
      JSON.stringify(mockAIAnalysis.riskFactors),
      JSON.stringify(mockAIAnalysis.preventionTips),
      JSON.stringify(mockAIAnalysis.relatedConditions),
      JSON.stringify(mockAIAnalysis.urgencyIndicators),
      true,
    );

    res.json({
      success: true,
      analysis: {
        id: analysisResult.lastInsertRowid,
        analysisNumber: analysisNumber,
        diagnosis: mockAIAnalysis.diagnosis,
        confidence: mockAIAnalysis.confidence,
        recommendations: mockAIAnalysis.recommendations,
        severity: mockAIAnalysis.severity,
        processingTime: mockAIAnalysis.processingTime,
        relatedConditions: mockAIAnalysis.relatedConditions,
      },
    });
  } catch (error) {
    console.error("خطأ في تحليل الأعراض:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء تحليل الأعراض",
    });
  }
});

// الحصول على تحليلات مريض معين
router.get("/patient/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;

    const analyses = db
      .prepare(
        `
      SELECT 
        a.*,
        p.patient_number,
        u.name as patient_name,
        d.doctor_number,
        du.name as doctor_name
      FROM ai_analyses a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE a.patient_id = ?
      ORDER BY a.created_at DESC
    `,
      )
      .all(patientId);

    res.json({
      success: true,
      analyses: analyses.map((analysis) => ({
        ...analysis,
        input_data: JSON.parse(analysis.input_data || "{}"),
        recommendations: JSON.parse(analysis.recommendations || "[]"),
      })),
    });
  } catch (error) {
    console.error("خطأ في جلب التحليلات:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء جلب التحليلات",
    });
  }
});

// الحصول على تقرير تحليل محدد
router.get("/report/:analysisId", async (req, res) => {
  try {
    const { analysisId } = req.params;

    const report = db
      .prepare(
        `
      SELECT 
        r.*,
        a.analysis_number,
        a.diagnosis,
        a.confidence_score,
        a.severity_level
      FROM ai_analysis_reports r
      JOIN ai_analyses a ON r.analysis_id = a.id
      WHERE r.analysis_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1
    `,
      )
      .get(analysisId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: "التقرير غير موجود",
      });
    }

    res.json({
      success: true,
      report: {
        ...report,
        insights: JSON.parse(report.insights || "[]"),
        risk_factors: JSON.parse(report.risk_factors || "[]"),
        prevention_tips: JSON.parse(report.prevention_tips || "[]"),
        related_conditions: JSON.parse(report.related_conditions || "[]"),
        urgency_indicators: JSON.parse(report.urgency_indicators || "[]"),
      },
    });
  } catch (error) {
    console.error("خطأ في جلب التقرير:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء جلب التقرير",
    });
  }
});

// إحصائيات التحليلات
router.get("/statistics", async (req, res) => {
  try {
    const stats = {
      totalAnalyses: db
        .prepare("SELECT COUNT(*) as count FROM ai_analyses")
        .get().count,
      todayAnalyses: db
        .prepare(
          `
        SELECT COUNT(*) as count FROM ai_analyses 
        WHERE DATE(created_at) = DATE('now')
      `,
        )
        .get().count,
      completedAnalyses: db
        .prepare(
          `
        SELECT COUNT(*) as count FROM ai_analyses 
        WHERE status = 'completed'
      `,
        )
        .get().count,
      averageConfidence:
        db
          .prepare(
            `
        SELECT AVG(confidence_score) as avg FROM ai_analyses 
        WHERE status = 'completed'
      `,
          )
          .get().avg || 0,
      byType: db
        .prepare(
          `
        SELECT analysis_type, COUNT(*) as count 
        FROM ai_analyses 
        GROUP BY analysis_type
      `,
        )
        .all(),
      bySeverity: db
        .prepare(
          `
        SELECT severity_level, COUNT(*) as count 
        FROM ai_analyses 
        WHERE status = 'completed'
        GROUP BY severity_level
      `,
        )
        .all(),
    };

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    console.error("خطأ في جلب الإحصائيات:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء جلب الإحصائيات",
    });
  }
});

// محاكاة تحليل الصور
async function simulateImageAnalysis(file) {
  // محاكاة وقت المعالجة
  const processingTime = Math.floor(Math.random() * 3000) + 1000;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const mockResults = [
    {
      diagnosis: "التهاب اللثة المتوسط",
      confidence: 87.3,
      severity: "medium",
      recommendations: [
        "تنظيف عميق للأسنان واللثة",
        "ا��تخدام غسول فم مطهر مرتين يومياً",
        "تحسين تقنية تنظيف الأسنان",
        "مراجعة طبيب الأسنان خلال أسبوعين",
      ],
      riskFactors: ["إهمال تنظيف الأسنان", "تراكم الجير", "التدخين"],
      preventionTips: [
        "تنظيف الأسنان مرتين يومياً",
        "استخدام خيط الأسنان",
        "المراجعة الدورية",
      ],
    },
    {
      diagnosis: "تسوس أسنان مبكر",
      confidence: 92.1,
      severity: "low",
      recommendations: [
        "حشوة تجميلية للسن المصاب",
        "تطبيق الفلورايد",
        "تقليل السكريات في النظام الغذائي",
        "المراجعة خلال شهر",
      ],
      riskFactors: ["تناول السكريات بكثرة", "ضعف التنظيف", "جفاف الفم"],
      preventionTips: [
        "تقليل السكريات",
        "شرب الماء بكثرة",
        "استخدام معجون يحتوي على الفلورايد",
      ],
    },
  ];

  const result = mockResults[Math.floor(Math.random() * mockResults.length)];

  return {
    ...result,
    processingTime,
    detailedReport: `تم تحليل الصورة الطبية باستخدام تقنيات الذكاء الاصطناعي المتقدمة. التشخيص المقترح: ${result.diagnosis} بمستوى ثقة ${result.confidence}%. يُنصح بمتابعة التوصيات المذكورة للحصول على أفضل النتائج.`,
    insights: [
      "تم تحديد المشكلة بدقة عالية",
      "التدخل المبكر يحسن من نتائج العلاج",
      "المتابعة الدورية ضرورية لمنع تفاقم الحالة",
    ],
    urgencyIndicators:
      result.severity === "high"
        ? ["يتطلب تدخل فوري"]
        : ["يمكن معالجتها ضمن الخطة العادية"],
  };
}

// محاكاة تحليل الأعراض
async function simulateSymptomsAnalysis(symptoms, age, gender) {
  const processingTime = Math.floor(Math.random() * 2000) + 500;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  // تحليل الأعراض وتحديد التشخيص المحتمل
  const symptomKeywords = symptoms.toLowerCase();

  let diagnosis, confidence, severity, recommendations, relatedConditions;

  if (
    symptomKeywords.includes("صداع") ||
    symptomKeywords.includes("ألم الرأس")
  ) {
    diagnosis = "صداع توتري محتمل";
    confidence = 78.5;
    severity = "low";
    recommendations = [
      "الراحة في مكان هادئ",
      "شرب كمية كافية من الماء",
      "تجنب الشاشات لفترات طويلة",
      "مراجعة الطبيب إذا استمر الصداع أكثر من 3 أيام",
    ];
    relatedConditions = [
      "الصداع النصفي",
      "صداع الجيوب الأنفية",
      "التوتر والقلق",
    ];
  } else if (
    symptomKeywords.includes("حمى") ||
    symptomKeywords.includes("حرارة")
  ) {
    diagnosis = "عدوى فيروسية محتملة";
    confidence = 82.3;
    severity = "medium";
    recommendations = [
      "الراحة التامة",
      "شرب السوائل بكثرة",
      "مراقبة درجة الحرارة",
      "مراجعة الطبيب إذا استمرت الحمى أكثر من 48 ساعة",
    ];
    relatedConditions = ["نزلة البرد", "الإنفلونزا", "التهاب الحلق"];
  } else if (
    symptomKeywords.includes("ألم البطن") ||
    symptomKeywords.includes("معدة")
  ) {
    diagnosis = "اضطراب معدي معوي";
    confidence = 75.8;
    severity = "medium";
    recommendations = [
      "تناول وجبات خفيفة",
      "تجنب الأطعمة الدهنية والحارة",
      "شرب شاي البابونج",
      "مراجعة الطبيب إذا استمر الألم أو ازداد شدة",
    ];
    relatedConditions = [
      "متلازمة القولون العصبي",
      "التهاب المعدة",
      "عسر الهضم",
    ];
  } else {
    diagnosis = "أعراض عامة تحتاج تقييم طبي";
    confidence = 65.2;
    severity = "medium";
    recommendations = [
      "المراقبة الدقيقة للأعراض",
      "الراحة والاسترخاء",
      "تسجيل تطور الأعراض",
      "مراجعة طبيب مختص للتشخيص الدقيق",
    ];
    relatedConditions = ["حالات طبية متنوعة", "اضطرابات نفسية جسدية"];
  }

  return {
    diagnosis,
    confidence,
    severity,
    recommendations,
    relatedConditions,
    processingTime,
    detailedReport: `بناءً على تحليل الأعراض المذكورة، تشير النتائج إلى ${diagnosis}. مستوى الثقة في التشخيص ${confidence}%. هذا تحليل أولي ولا يغ��ي عن استشارة طبيب مختص.`,
    insights: [
      "تم تحليل الأعراض باستخدام خوارزميات متقدمة",
      "التشخيص الأولي ي��اعد في توجيه الرعاية",
      "المتابعة الطبية ضرورية للتأكد من التشخيص",
    ],
    riskFactors: ["عدم المتابعة الطبية", "إهمال الأعراض", "التأخير في العلاج"],
    preventionTips: [
      "نمط حياة صحي",
      "التغذية المتوازنة",
      "ممارسة الرياضة",
      "إدارة التوتر",
    ],
    urgencyIndicators:
      severity === "high"
        ? ["يتطلب عناية طبية فورية"]
        : ["متابعة طبية عادية مطلوبة"],
  };
}

export default router;
