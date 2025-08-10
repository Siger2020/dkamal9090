# 🔧 دليل حل مشاكل EmailJS السريع

## ❌ المشكلة: "فشل في الإرسال"

### أسباب محتملة وحلولها:

#### 1. Service ID غير صحيح

**العرض:** `Service ID غير صحيح أو غير موجود`

**الحل:**

- اذهب إلى https://www.emailjs.com
- سجل دخول في حسابك
- اذهب لـ "Email Services"
- انسخ Service ID (يبدأ بـ `service_`)

#### 2. Template ID غير صحيح

**العرض:** `Template ID غير صحيح أو غير موجود`

**الحل:**

- في لوحة تحكم EmailJS، اذهب لـ "Email Templates"
- تأكد من وجود قالب منشئ
- انسخ Template ID (يبدأ بـ `template_`)

#### 3. Public Key غير صحيح

**العرض:** `خطأ في الصلاحية - تحق�� من صحة Public Key`

**الحل:**

- اذهب إلى Account > API Keys
- انسخ Public Key (يبدأ بـ `user_`)

#### 4. خدمة البريد الإلكتروني غير مفعلة

**العرض:** `خطأ في الاتصال مع خدمة البريد`

**الحل:**

- في "Email Services"، تأكد من أن خدمتك (Gmail, Outlook, إلخ) مفعلة
- إذا كنت تستخدم Gmail، قد تحتاج لتفعيل "Less secure app access"

#### 5. القالب لا يحتوي على المتغيرات المطلوبة

**العرض:** `بيانات الطلب غير صحيحة`

**الحل:**
تأكد من أن قالب EmailJS يحتوي على هذه المتغيرات:

```
{{to_email}}
{{to_name}}
{{from_name}}
{{subject}}
{{message}}
{{icon}}
{{notification_type}}
{{instructions}}
{{appointment_id}}
{{appointment_date}}
{{appointment_time}}
{{doctor_name}}
{{clinic_name}}
{{clinic_phone}}
{{clinic_address}}
{{notes}}
{{current_time}}
```

---

## 🚀 الحل السريع (خطوة بخطوة):

### الخطوة 1: تحقق من الأساسيات

```
✓ هل Service ID يبدأ بـ service_؟
✓ هل Template ID يبدأ بـ template_؟
✓ هل Public Key يبدأ بـ user_؟
✓ هل البريد الإلكتروني صحيح؟
```

### ��لخطوة 2: اختبر في EmailJS مباشرة

1. اذهب إلى EmailJS > Email Templates
2. اختر قالبك
3. اضغط "Test"
4. إذا فشل هنا، فالمشكلة في القالب أو الخدمة

### الخطوة 3: تحقق من Console

1. افتح Developer Tools (F12)
2. اذهب لتبويب Console
3. حاول إرسال رسالة اختبار
4. ابحث عن رسائل الخطأ الحمراء

### الخطوة 4: قالب تجريبي بسيط

استخدم هذا القالب البسيط للاختبار:

**Subject:**

```
{{subject}}
```

**Body:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
  </head>
  <body>
    <h1>{{subject}}</h1>
    <p>مرحباً {{to_name}}</p>
    <p>{{message}}</p>
    <p>من: {{from_name}}</p>
    <p>الوقت: {{current_time}}</p>
  </body>
</html>
```

---

## 🔍 فحص متقدم:

### تشغيل الفحص التشخيصي:

1. في صفحة الإشعارات، اذهب لتبويب "الاختبار"
2. إذا ظهر خطأ، اضغط "فحص تشخيصي"
3. افتح Console (F12) لرؤية النتائج

### اختبار مباشر من Console:

```javascript
// افتح Console (F12) واكتب:
emailjs
  .send("SERVICE_ID", "TEMPLATE_ID", {
    to_email: "test@example.com",
    to_name: "اختبار",
    subject: "اختبار",
    message: "هذا اختبار",
  })
  .then(
    function (response) {
      console.log("SUCCESS!", response.status, response.text);
    },
    function (error) {
      console.log("FAILED...", error);
    },
  );
```

---

## 📞 الحصول على المساعدة:

### 1. وثائق EmailJS:

- https://www.emailjs.com/docs/

### 2. أخطاء شائعة:

- **Unauthorized (401):** Public Key خطأ
- **Not Found (404):** Service ID أو Template ID خطأ
- **Bad Request (400):** بيانات القالب ناقصة

### 3. تحقق من الحدود:

- الحساب المجاني: 200 بريد/شهر
- إذا تجاوزت الحد، ستحتاج ترقية

---

## ✅ نصائح للنجاح:

1. **ابدأ بقالب بسيط** ثم أضف التعقيدات تدريجياً
2. **اختبر في EmailJS أولاً** قبل تجربة النظام
3. **احفظ نسخة احتياطية** من معرفات EmailJS
4. **راقب Console دائماً** للأخطاء
5. **تأكد من الاتصال بالإنترنت** قبل الاختبار

---

## 🎯 اختبار سريع:

إذا كل شيء مُعد بشكل صحيح، يجب أن ترى:

- ✅ حالة الاتصال: "متصل ويعمل"
- ✅ نجاح ��رسال رسائل الاختبار
- ✅ عدم وجود أخطاء في Console

**إذا لم تنجح هذه الخطوات، راجع إعدادات EmailJS أو تواصل مع الدعم الفني.**
