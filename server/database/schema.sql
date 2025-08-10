-- قاعدة بيانات عيادة الدكتور كمال
-- إنشاء جميع الجداول المطلوبة للنظام

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT CHECK(role IN ('patient', 'doctor', 'admin', 'receptionist')) NOT NULL DEFAULT 'patient',
    is_active BOOLEAN DEFAULT TRUE,
    profile_image TEXT,
    date_of_birth DATE,
    gender TEXT CHECK(gender IN ('male', 'female')),
    address TEXT,
    emergency_contact TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المرضى (معلومات إضافية للمرضى)
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patient_number TEXT UNIQUE NOT NULL,
    insurance_company TEXT,
    insurance_number TEXT,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    blood_type TEXT,
    weight REAL,
    height REAL,
    occupation TEXT,
    marital_status TEXT,
    preferred_language TEXT DEFAULT 'arabic',
    preferred_doctor_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_doctor_id) REFERENCES doctors(id)
);

-- جدول الأطباء
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    doctor_number TEXT UNIQUE NOT NULL,
    specialization TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    qualification TEXT,
    experience_years INTEGER DEFAULT 0,
    working_hours TEXT, -- JSON format
    consultation_fee REAL DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    bio TEXT,
    rating REAL DEFAULT 0,
    total_patients INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدو�� الخدمات
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    category TEXT,
    duration_minutes INTEGER DEFAULT 30,
    price REAL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    icon TEXT,
    requires_appointment BOOLEAN DEFAULT TRUE,
    preparation_instructions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول المواعيد
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    service_id INTEGER,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT CHECK(status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    urgency_level TEXT CHECK(urgency_level IN ('low', 'medium', 'high', 'emergency')) DEFAULT 'medium',
    chief_complaint TEXT,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول الكشوفات الطبية
CREATE TABLE IF NOT EXISTS medical_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    visit_date DATE NOT NULL,
    chief_complaint TEXT,
    clinical_examination TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    medications TEXT, -- JSON format
    recommendations TEXT,
    next_visit_date DATE,
    follow_up_instructions TEXT,
    vital_signs TEXT, -- JSON format (blood pressure, pulse, etc.)
    attachments TEXT, -- JSON format for file paths
    status TEXT CHECK(status IN ('draft', 'completed', 'reviewed')) DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- جدول خطط العلاج
CREATE TABLE IF NOT EXISTS treatment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    estimated_end_date DATE,
    total_sessions INTEGER DEFAULT 1,
    completed_sessions INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    status TEXT CHECK(status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
    success_criteria TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- جدول جلسات العلاج
CREATE TABLE IF NOT EXISTS treatment_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_number TEXT UNIQUE NOT NULL,
    treatment_plan_id INTEGER NOT NULL,
    appointment_id INTEGER,
    session_date DATE NOT NULL,
    session_number_in_plan INTEGER NOT NULL,
    procedures_performed TEXT, -- JSON format
    session_notes TEXT,
    patient_response TEXT,
    complications TEXT,
    next_session_plan TEXT,
    pain_level INTEGER CHECK(pain_level BETWEEN 0 AND 10),
    session_duration_minutes INTEGER,
    materials_used TEXT, -- JSON format
    cost REAL DEFAULT 0,
    status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- جدول المعاملات المالية
CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    treatment_session_id INTEGER,
    transaction_type TEXT CHECK(transaction_type IN ('payment', 'refund', 'charge', 'adjustment')) NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'YER',
    payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'bank_transfer', 'insurance', 'installment')),
    payment_status TEXT CHECK(payment_status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    description TEXT,
    reference_number TEXT,
    due_date DATE,
    paid_date DATE,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    insurance_covered REAL DEFAULT 0,
    notes TEXT,
    processed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (treatment_session_id) REFERENCES treatment_sessions(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining_amount REAL NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    items TEXT, -- JSON format for invoice items
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    notes TEXT,
    payment_terms TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id INTEGER NOT NULL,
    sender_id INTEGER,
    type TEXT CHECK(type IN ('appointment_reminder', 'payment_due', 'appointment_confirmation', 'treatment_update', 'system_alert')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channels TEXT, -- JSON format (sms, email, whatsapp, push)
    send_date DATETIME NOT NULL,
    sent_via TEXT, -- JSON format showing which channels were successful
    status TEXT CHECK(status IN ('pending', 'sent', 'delivered', 'failed', 'read')) DEFAULT 'pending',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    template_id INTEGER,
    metadata TEXT, -- JSON format for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- جدول قو��لب الإشعارات
CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    body_template TEXT NOT NULL,
    variables TEXT, -- JSON format for template variables
    channels TEXT, -- JSON format for supported channels
    is_active BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'arabic',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول إعدادات النظام
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    description TEXT,
    data_type TEXT CHECK(data_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, setting_key),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- جدول إعدادات البريد الإلكتروني
CREATE TABLE IF NOT EXISTS email_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enabled BOOLEAN DEFAULT FALSE,
    service TEXT NOT NULL DEFAULT 'gmail', -- gmail, outlook, yahoo, smtp
    host TEXT,
    port INTEGER DEFAULT 587,
    secure BOOLEAN DEFAULT FALSE,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT 'عيادة الدكتور كمال الملصي',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل الإشعارات الإلكترونية
CREATE TABLE IF NOT EXISTS email_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type TEXT CHECK(notification_type IN ('confirmation', 'reminder', 'cancellation', 'test')) NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    appointment_id TEXT,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    sent_at DATETIME,
    delivery_status TEXT CHECK(delivery_status IN ('pending', 'sent', 'failed', 'delivered')) DEFAULT 'pending',
    message_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata TEXT, -- JSON format لحفظ بيانات إضافية
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول إحصائيات الإشعارات
CREATE TABLE IF NOT EXISTS notification_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    notification_type TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, notification_type)
);

-- جدول المخزون والمواد
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    item_code TEXT UNIQUE,
    category TEXT,
    description TEXT,
    unit_of_measure TEXT,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER,
    unit_cost REAL DEFAULT 0,
    supplier TEXT,
    expiry_date DATE,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول حركات المخزون
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL,
    movement_type TEXT CHECK(movement_type IN ('in', 'out', 'adjustment')) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost REAL,
    total_cost REAL,
    reference_type TEXT, -- appointment, treatment_session, purchase, etc.
    reference_id INTEGER,
    notes TEXT,
    performed_by INTEGER,
    movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- جدول المعاملات المالية
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    patient_id INTEGER,
    patient_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    remaining_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول المدفوعات
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    patient_name TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    receipt_number TEXT,
    processed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- جدول تقسيطات المدفوعات
CREATE TABLE IF NOT EXISTS payment_installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    installment_number INTEGER NOT NULL,
    amount REAL NOT NULL,
    due_date DATETIME NOT NULL,
    paid_amount REAL DEFAULT 0,
    status TEXT CHECK(status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    paid_date DATETIME,
    payment_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- جدول طرق الدفع المتاحة
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    requires_reference BOOLEAN DEFAULT 0, -- For bank transfers, checks, etc.
    fees_percentage REAL DEFAULT 0,
    fees_fixed REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل النشاطات
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT, -- patients, appointments, etc.
    entity_id INTEGER,
    old_values TEXT, -- JSON format
    new_values TEXT, -- JSON format
    ip_address TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- جدول النسخ الاحتياطية
CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_name TEXT NOT NULL,
    backup_type TEXT CHECK(backup_type IN ('full', 'incremental')) DEFAULT 'full',
    file_path TEXT NOT NULL,
    file_size INTEGER,
    status TEXT CHECK(status IN ('in_progress', 'completed', 'failed')) DEFAULT 'in_progress',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_installments_transaction_id ON payment_installments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON payment_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient_id ON medical_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_patient_id ON financial_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_notifications_appointment_id ON email_notifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_email ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_notifications_delivery_status ON email_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_stats_date ON notification_stats(date);

-- إدراج البيانات الأولية
INSERT OR IGNORE INTO system_settings (category, setting_key, setting_value, description) VALUES
('clinic', 'name', 'عيادة الدكتور كمال', 'اسم العيادة'),
('clinic', 'address', 'شارع المقالح -حي الاصبحي امام سيتي ماكس', 'عنوان العيادة'),
('clinic', 'phone', '00967 777775545', 'رقم هاتف العيادة'),
('clinic', 'email', 'info@dkalmoli.com', 'البريد الإلكتروني للعيادة'),
('clinic', 'working_hours', '{"saturday_to_thursday": "09:00-21:00", "friday": "14:00-21:00"}', 'ساعات العمل'),
('clinic', 'currency', 'YER', 'الريال اليمني'),
('clinic', 'timezone', 'Asia/Aden', 'المنطقة الزمنية'),
('system', 'language', 'arabic', 'لغة النظام الافتراضية'),
('notifications', 'sms_enabled', 'false', 'تفعي�� الرسائل النصية'),
('notifications', 'email_enabled', 'true', 'تفعيل البريد الإلكتروني'),
('notifications', 'whatsapp_enabled', 'false', 'تفعيل الواتس آب'),
('email', 'auto_send_confirmation', 'true', 'إرسال تأكيد الموعد تلقائياً'),
('email', 'auto_send_reminder', 'true', 'إرسال تذكير بالموعد تلقائياً'),
('email', 'reminder_hours_before', '24', 'عدد الساعات قبل الموعد لإرسال التذكير');

-- إضافة إعدادات البريد الإلكتروني الافتراضية
INSERT OR IGNORE INTO email_settings (enabled, service, from_name) VALUES
(FALSE, 'gmail', 'عيادة الدكتور كمال الملصي');

-- إدراج الخدمات الأساسية
INSERT OR IGNORE INTO services (name, name_en, description, duration_minutes, category, is_active) VALUES
('تنظيف الأسنان', 'Teeth Cleaning', 'تنظيف شامل ومهني لأسنانك مع أحد�� التقنيات', 45, 'general', TRUE),
('حشوات الأسنان', 'Dental Fillings', 'حشوات تجميلية بأحدث المواد الطبية المعتمدة', 60, 'restorative', TRUE),
('تقويم الأسنان', 'Orthodontics', 'تقويم شامل بأحدث التقنيات الطبية المتقدمة', 90, 'orthodontics', TRUE),
('زراعة الأسنان', 'Dental Implants', 'زراعة متطورة م�� ضمان طويل المدى', 120, 'surgery', TRUE),
('تبييض الأسنان', 'Teeth Whitening', 'تبييض آمن وفعال لابتسامة مشرقة', 60, 'cosmetic', TRUE),
('علاج الجذور', 'Root Canal Treatment', 'علاج متخصص للجذور بأحدث التقنيات', 90, 'endodontics', TRUE),
('فحص دوري', 'Regular Checkup', 'فحص شامل لصحة الفم والأسنان', 30, 'general', TRUE);



-- إضافة حساب مدير النظام الوحيد
INSERT OR IGNORE INTO users (id, name, email, password, phone, role, created_at, updated_at) VALUES
(1, 'مدير النظام', 'admin@dkalmoli.com', '123456', '967777775545', 'admin', datetime('now'), datetime('now'));

-- جدول تحليلات الذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS ai_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_number TEXT UNIQUE NOT NULL,
    patient_id INTEGER,
    doctor_id INTEGER,
    analysis_type TEXT CHECK(analysis_type IN ('image', 'symptoms', 'text', 'lab_results')) NOT NULL,
    input_data TEXT NOT NULL, -- JSON format للبيانات المدخلة
    file_path TEXT, -- مسار الملف المرفوع (للصور)
    file_type TEXT, -- نوع الملف
    file_size INTEGER, -- ��جم الملف بالبايت
    ai_model_used TEXT, -- نموذج الذكاء الاصطناعي المستخدم
    confidence_score REAL, -- درجة الثقة في التحليل (0-100)
    diagnosis TEXT, -- التشخيص المقترح
    recommendations TEXT, -- JSON format للتوصيات
    severity_level TEXT CHECK(severity_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    status TEXT CHECK(status IN ('processing', 'completed', 'failed', 'reviewed')) DEFAULT 'processing',
    processing_time_ms INTEGER, -- وقت المعالجة بالميلي ثانية
    accuracy_feedback REAL, -- تقييم دقة التحليل من الطبيب (0-100)
    doctor_notes TEXT, -- ملاحظات الطبيب على التحليل
    created_by INTEGER,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- جدول تقارير التحليلات
CREATE TABLE IF NOT EXISTS ai_analysis_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    report_type TEXT CHECK(report_type IN ('detailed', 'summary', 'comparative', 'trend')) DEFAULT 'detailed',
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- محتوى التقرير
    charts_data TEXT, -- JSON format للرسوم البيانية
    insights TEXT, -- JSON format للنتائج والتحليلات
    risk_factors TEXT, -- JSON format لعوامل الخطر
    prevention_tips TEXT, -- JSON format لنصائح الوقاية
    related_conditions TEXT, -- JSON format للحالات ذات الصلة
    medical_references TEXT, -- JSON format للمراجع الطبية
    urgency_indicators TEXT, -- JSON format لمؤشرات الإلحاح
    is_public BOOLEAN DEFAULT FALSE, -- هل التقرير عام أم خاص
    language TEXT DEFAULT 'arabic',
    generated_by_ai BOOLEAN DEFAULT TRUE,
    human_reviewed BOOLEAN DEFAULT FALSE,
    review_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES ai_analyses(id) ON DELETE CASCADE
);

-- جدول نماذج الذكاء الاصطناع��
CREATE TABLE IF NOT EXISTS ai_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT UNIQUE NOT NULL,
    model_version TEXT NOT NULL,
    model_type TEXT CHECK(model_type IN ('image_classification', 'text_analysis', 'nlp', 'computer_vision', 'diagnostic')) NOT NULL,
    specialization TEXT, -- التخصص الطبي
    description TEXT,
    accuracy_rate REAL, -- معدل الدقة
    supported_inputs TEXT, -- JSON format للمدخلات المدعومة
    output_format TEXT, -- JSON format لشكل المخرجات
    training_data_info TEXT, -- معلومات عن بيانات التدريب
    model_size_mb REAL, -- حجم النموذج
    inference_time_ms REAL, -- متوسط وقت الاستنتاج
    is_active BOOLEAN DEFAULT TRUE,
    api_endpoint TEXT, -- endpoint للوصول للنموذج
    api_key_required BOOLEAN DEFAULT FALSE,
    cost_per_request REAL DEFAULT 0,
    usage_limits TEXT, -- JSON format لحدود الاستخدام
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- جدول إحصائيات استخدام الذكاء الاصطناعي
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    model_id INTEGER,
    total_requests INTEGER DEFAULT 0,
    successful_analyses INTEGER DEFAULT 0,
    failed_analyses INTEGER DEFAULT 0,
    average_confidence REAL,
    average_processing_time_ms REAL,
    total_cost REAL DEFAULT 0,
    accuracy_feedback_avg REAL, -- متوسط تقييم الدقة من الأطباء
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ai_models(id),
    UNIQUE(date, model_id)
);

-- جدول تدريب النماذج وتحسينها
CREATE TABLE IF NOT EXISTS ai_model_training (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    training_session_id TEXT UNIQUE NOT NULL,
    training_type TEXT CHECK(training_type IN ('initial', 'fine_tuning', 'retraining', 'validation')) NOT NULL,
    training_data_count INTEGER,
    validation_data_count INTEGER,
    training_accuracy REAL,
    validation_accuracy REAL,
    loss_value REAL,
    epochs_completed INTEGER,
    training_duration_minutes INTEGER,
    improvements_made TEXT, -- JSON format للتحسينات
    performance_metrics TEXT, -- JSON format لمقاييس الأداء
    status TEXT CHECK(status IN ('started', 'in_progress', 'completed', 'failed', 'aborted')) DEFAULT 'started',
    started_by INTEGER,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
    FOREIGN KEY (started_by) REFERENCES users(id)
);

-- الفهارس لتحسين الأداء في جداول الذكاء الاصطناعي
CREATE INDEX IF NOT EXISTS idx_ai_analyses_patient_id ON ai_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_doctor_id ON ai_analyses(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_status ON ai_analyses(status);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_confidence ON ai_analyses(confidence_score);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_reports_analysis_id ON ai_analysis_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_model_id ON ai_usage_stats(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_model_id ON ai_model_training(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_status ON ai_model_training(status);

-- إدراج نماذج الذكاء الاصطناعي الأساسية
INSERT OR IGNORE INTO ai_models (model_name, model_version, model_type, specialization, description, accuracy_rate, is_active) VALUES
('dental_image_classifier', '1.0', 'image_classification', 'طب الأسنان', 'تصنيف صور الأسنان وتشخيص المشاكل', 87.5, TRUE),
('symptom_analyzer', '1.2', 'nlp', 'طب عام', 'تحليل الأعراض المكتوبة وتقديم تشخيص أولي', 78.3, TRUE),
('xray_diagnostic', '2.1', 'computer_vision', 'الأشعة', 'تحليل صور الأشعة وتحديد المشاكل', 92.1, TRUE),
('lab_results_interpreter', '1.5', 'text_analysis', 'المختبر', 'تفسير نتائج التحاليل المخبرية', 85.7, TRUE);

-- بيانات أولية لطرق الدفع
INSERT OR IGNORE INTO payment_methods (name, name_ar, is_active, requires_reference, fees_percentage, fees_fixed) VALUES
('cash', 'نقداً', 1, 0, 0, 0),
('credit_card', 'بطاقة ائتمانية', 1, 0, 2.5, 0),
('debit_card', 'بطاقة خصم', 1, 0, 1.5, 0),
('bank_transfer', 'تحويل بنكي', 1, 1, 0, 5),
('check', 'شيك', 1, 1, 0, 0),
('insurance', 'تأمين طبي', 1, 1, 0, 0);

-- بيانات تجريبية للمعاملات المالية
INSERT OR IGNORE INTO transactions (id, patient_name, service_name, total_amount, paid_amount, remaining_amount, status, payment_method, transaction_date) VALUES
('TXN-001', 'أحمد محمد', 'تنظيف الأسنان', 200, 200, 0, 'paid', 'نقداً', '2024-01-15 10:30:00'),
('TXN-002', 'فاطمة أحمد', 'تقويم الأسنان', 3000, 1500, 1500, 'partial', 'بطاقة ائتمانية', '2024-01-14 14:15:00'),
('TXN-003', 'محمد علي', 'زراعة الأسنان', 2500, 0, 2500, 'pending', null, '2024-01-13 09:45:00'),
('TXN-004', 'نورا سالم', 'حشوات الأسنان', 300, 300, 0, 'paid', 'تحويل بنكي', '2024-01-12 11:45:00'),
('TXN-005', 'سارة خالد', 'تبييض الأسنان', 800, 400, 400, 'partial', 'نقداً', '2024-01-11 16:20:00');

-- بيانات تجريبية للمدفوعات
INSERT OR IGNORE INTO payments (id, transaction_id, patient_name, amount, payment_method, payment_date, notes) VALUES
('PAY-001', 'TXN-001', 'أحمد محمد', 200, 'نقداً', '2024-01-15 10:30:00', 'دفعة كاملة'),
('PAY-002', 'TXN-002', 'فاطمة أحمد', 1500, 'بطاقة ائتمانية', '2024-01-14 14:15:00', 'دفعة أولى من تقويم الأسنان'),
('PAY-003', 'TXN-004', 'نورا سالم', 300, 'تحويل بنكي', '2024-01-12 11:45:00', 'دفعة كاملة للحشوات'),
('PAY-004', 'TXN-005', 'سارة خالد', 400, 'نقداً', '2024-01-11 16:20:00', 'دفعة أولى من تبييض الأسنان');

-- تفعيل القيود الخارجية
PRAGMA foreign_keys = ON;
