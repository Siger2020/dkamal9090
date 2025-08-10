# دليل إعداد نظام الإشعارات الحقيقية - EmailJS

## 🎯 نظرة عامة

تم تحديث نظام الإشعارات ليستخدم **EmailJS** لإرسال رسائل بريد إلكتروني حقيقية بدلاً من النظام الوهمي السابق.

### ✨ المزايا الجديدة:

- ✅ **إشعارات حقيقية** تصل فعلياً للمرضى
- ✅ **لا يتطلب خادم خلفي** معقد لإرسال البريد
- ✅ **آمن ومجاني** حتى 200 بريد شهرياً
- ✅ **سهل الإعداد** في دقائق قليلة
- ✅ **دعم جميع مقدمي الخدمة** (Gmail, Outlook, Yahoo, إلخ)

---

## 📋 خطوات الإعداد التفصيلية

### الخطوة 1: إنشاء حساب EmailJS

1. **زيارة موقع EmailJS**

   ```
   https://www.emailjs.com
   ```

2. **التسجيل المجاني**

   - اضغط على "Sign Up"
   - أدخل بريدك الإلكتروني وكلمة مرور
   - فعّل حسابك من بريدك الإلكتروني

3. **تسجيل الدخول**
   - ستنتقل لوحة التحكم الرئيسية

---

### الخطوة 2: إضافة خدمة البريد الإلكتروني

1. **الذهاب لقسم Email Services**

   - في لوحة التحكم، اضغط على "Email Services"
   - اضغط "Add New Service"

2. **اختيار نوع الخدمة**

   **لـ Gmail:**

   - اختر "Gmail"
   - سجل دخول بحساب Gmail الخاص بعيادتك
   - وافق على الأذونات

   **لـ Outlook/Hotmail:**

   - اختر "Outlook"
   - سجل دخول بحساب Microsoft
   - وافق على الأذونات

   **لـ Yahoo:**

   - اختر "Yahoo"
   - سجل دخول بحساب Yahoo
   - وافق على الأذونات

   **لـ SMTP مخصص:**

   - اختر "Custom SMTP"
   - أدخل إعدادات SMTP الخاصة بك

3. **حفظ Service ID**
   ```
   مثال: service_abc123xyz
   ```
   ⚠️ **مهم:** احفظ هذا المعرف - ستحتاجه لاحقاً

---

### الخطوة 3: إنشاء قالب البريد الإلكتروني

1. **الذهاب لقسم Email Templates**

   - اضغط على "Email Templates"
   - اضغط "Create New Template"

2. **إعداد القالب الأساسي**

   **Subject (موضوع الرسالة):**

   ```
   {{subject}}
   ```

   **Body (محتوى الرسالة) - HTML:**

   ```html
   <!DOCTYPE html>
   <html dir="rtl" lang="ar">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>{{subject}}</title>
       <style>
         body {
           font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
           line-height: 1.6;
           color: #333;
           direction: rtl;
           text-align: right;
         }
         .container {
           max-width: 600px;
           margin: 20px auto;
           background-color: #ffffff;
           border-radius: 10px;
           box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
           overflow: hidden;
         }
         .header {
           background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
           color: white;
           padding: 30px 20px;
           text-align: center;
         }
         .icon {
           font-size: 3rem;
           margin-bottom: 15px;
           display: block;
         }
         .content {
           padding: 30px;
         }
         .detail-item {
           margin-bottom: 10px;
           padding: 8px 0;
           border-bottom: 1px solid #e2e8f0;
         }
         .footer {
           background-color: #1f2937;
           color: white;
           padding: 25px;
           text-align: center;
         }
       </style>
     </head>
     <body>
       <div class="container">
         <div class="header">
           <div class="icon">{{icon}}</div>
           <h1>{{notification_type}}</h1>
           <p>{{message}}</p>
         </div>

         <div class="content">
           <h2>عزيزي/عزيزتي {{to_name}}</h2>

           <div class="detail-item">
             <strong>رقم الموعد:</strong> {{appointment_id}}
           </div>
           <div class="detail-item">
             <strong>التاريخ:</strong> {{appointment_date}}
           </div>
           <div class="detail-item">
             <strong>الوقت:</strong> {{appointment_time}}
           </div>
           <div class="detail-item">
             <strong>الطبيب المعالج:</strong> {{doctor_name}}
           </div>
           <div class="detail-item">
             <strong>العيادة:</strong> {{clinic_name}}
           </div>
           <div class="detail-item">
             <strong>الهاتف:</strong> {{clinic_phone}}
           </div>
           <div class="detail-item">
             <strong>العنوان:</strong> {{clinic_address}}
           </div>

           <p><strong>تعليمات:</strong> {{instructions}}</p>
           {{#notes}}
           <p><strong>ملاحظات:</strong> {{notes}}</p>
           {{/notes}}
         </div>

         <div class="footer">
           <p><strong>{{clinic_name}}</strong></p>
           <p>{{from_name}}</p>
           <p>وقت الإرسال: {{current_time}}</p>
         </div>
       </div>
     </body>
   </html>
   ```

3. **إعداد المتغيرات المطلوبة**
   تأكد من تفعيل هذه المتغيرات في الإعدادات:

   ```
   to_email, to_name, from_name, subject, icon, notification_type,
   message, instructions, patient_name, appointment_id, appointment_date,
   appointment_time, doctor_name, clinic_name, clinic_phone,
   clinic_address, notes, current_time
   ```

4. **حفظ Template ID**
   ```
   مثال: template_xyz789abc
   ```

---

### الخطوة 4: الحصول على Public Key

1. **الذهاب لإعدادات الحساب**

   - اضغط على اسم المستخدم (أعلى اليمين)
   - اختر "API Keys"

2. **نسخ Public Key**
   ```
   مثال: user_1234567890abcdef
   ```

---

### الخطوة 5: إدخال الإعدادات في النظام

1. **الذهاب لصفحة إعدادات الإشعارات**

   - في النظام، اذهب إلى "إدارة الإشعارات"
   - اختر تبويب "إعدادات EmailJS"

2. **إدخال البيانات المطلوبة**

   ```
   Service ID: service_abc123xyz
   Template ID: template_xyz789abc
   Public Key: user_1234567890abcdef
   اسم المرسل: عيادة الدكتور كمال الملصي
   بريد المرسل: info@clinic.com
   ```

3. **تفعيل النظام**

   - فعّل مفتاح "تفعيل نظام الإشعارات الحقيقية"
   - اضغط "حفظ الإعدادات"

4. **اختبار الاتصال**
   - اضغط "اختبار الاتصال"
   - انتظر رسالة التأكيد

---

## 🧪 اختبار النظام

### اختبار بسيط

1. اذهب لتبويب "الاختبار"
2. أدخل ��ريدك الإلكتروني
3. اضغط "اختبار بسيط"
4. تحقق من وصول البريد

### اختبار متقدم - محاكاة حجز

1. أدخل بريدك الإلكتروني
2. اضغط "اختبار تأكيد حجز"
3. ستصلك رسالة تأكيد كاملة بجميع التفاصيل

---

## ❗ استكشاف الأخطاء

### مشكلة: "فشل في إرسال البريد"

**الحلول:**

1. تأكد من صحة Service ID
2. تأكد من صحة Template ID
3. تأكد من صحة Public Key
4. تحقق من حالة خدمة البريد في EmailJS
5. راجع console المتصفح للأخطاء

### مشكلة: "البريد لا يصل"

**الحلول:**

1. تحقق من مجلد Spam/Junk
2. تأكد من صحة عنوان البريد
3. اختبر من بريد مختلف
4. راجع سجل الإرسال في EmailJS

### مشكلة: "متغيرات القالب فارغة"

**الحلول:**

1. تأكد من كتابة المتغيرات بالشكل الصحيح `{{variable_name}}`
2. تحقق من تفعيل المتغيرات في إعدادات القالب
3. اختبر القالب مباشرة من EmailJS

---

## 🔐 الأمان والخصوصية

### بيانات آمنة تماماً

- ✅ جميع الإعدادات تُحفظ محلياً في متصفحك فقط
- ✅ لا تُرسل كلمات مرور أو بيانات حساسة لأي خادم
- ✅ EmailJS يستخدم OAuth الآمن لربط الحسابات
- ✅ Public Key ليس سرياً ويمكن استخدامه بأمان

### حدود الاستخدام المجانية

- 📧 **200 بريد شهرياً** مجاناً
- 🚀 **خطط مدفوعة متاحة** للاستخدام الأكبر
- 📈 **تتبع كامل للإحصائيات** في لوحة تحكم EmailJS

---

## 🆘 الدعم والمساعدة

### إذا واجهت مشكلة:

1. راجع دليل الإعداد أعلاه خطوة بخطوة
2. تحقق من تبويب "استكشاف الأخطاء"
3. اختبر الإعدادات مباشرة من موقع EmailJS
4. راجع وثائق EmailJS: https://www.emailjs.com/docs/

### نصائح مهمة:

- 💡 ابدأ بقالب بسيط واختبره قبل التعقيد
- 💡 احفظ نسخة احتياطية من معرفات EmailJS
- 💡 اختبر مع بريد مختلف للتأكد من الوصول
- 💡 راقب حدود الاستخدام المجانية

---

## ✅ تأكيد الإعداد الناجح

عند الإعداد بنجاح، ستحصل على:

1. ✅ **مؤشر "متصل ويعمل"** في أعلى الصفحة
2. ✅ **رسائل اختبار تصل بنجاح** لبريدك
3. ✅ **إشعارات حقيقية عند الحجز** للمرضى
4. ✅ **تأكيدات فورية** في واجهة النظام

**تهانينا! نظام الإشعارات الحقيقية جاهز للاستخدام! 🎉**
