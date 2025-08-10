import * as nodemailer from 'nodemailer';
import { TransportOptions } from 'nodemailer';

export interface EmailConfig {
  enabled: boolean;
  service: string; // 'gmail', 'outlook', 'yahoo', 'smtp'
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  password: string;
  fromName: string;
}

export interface NotificationData {
  patientName: string;
  patientEmail: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  doctorName: string;
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  notes?: string;
}

export type NotificationType = 'confirmation' | 'reminder' | 'cancellation';

interface NotificationTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  // تكوين خدمة البريد الإلكتروني
  configure(config: EmailConfig): void {
    if (!config.enabled) {
      this.transporter = null;
      this.config = null;
      return;
    }

    const transportConfig: TransportOptions = {
      service: config.service === 'smtp' ? undefined : config.service,
      host: config.host,
      port: config.port || (config.secure ? 465 : 587),
      secure: config.secure || false,
      auth: {
        user: config.user,
        pass: config.password,
      },
    };

    this.transporter = nodemailer.createTransporter(transportConfig);
    this.config = config;
  }

  // إرسال إشعار
  async sendNotification(
    type: NotificationType,
    data: NotificationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'خدمة البريد الإلكتروني غير مفعلة' };
    }

    try {
      const template = this.getTemplate(type, data);
      
      const result = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: data.patientEmail,
        subject: template.subject,
        html: template.html,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ غير معروف' 
      };
    }
  }

  // اختبار إعدادات البريد الإلكتروني
  async testConfiguration(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'خدمة البريد الإلكتروني غير مفعلة' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('Email configuration test error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في إعدادات البريد الإلكتروني' 
      };
    }
  }

  // إرسال بريد اختبار
  async sendTestEmail(toEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'خدمة البريد الإلكتروني غير مفعلة' };
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.user}>`,
        to: toEmail,
        subject: '📧 اختبار نظام الإشعارات - عيادة الدكتور كمال الملصي',
        html: this.getTestEmailTemplate(),
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Test email sending error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في إرسال بريد الاختبار' 
      };
    }
  }

  // الحصول على قالب الإشعار
  private getTemplate(type: NotificationType, data: NotificationData): NotificationTemplate {
    const baseStyle = this.getBaseEmailStyle();
    
    switch (type) {
      case 'confirmation':
        return {
          subject: `✅ تأكيد موعدك - ${data.appointmentId}`,
          html: this.getConfirmationTemplate(data, baseStyle),
        };
      case 'reminder':
        return {
          subject: `⏰ تذكير بموعدك غداً - ${data.appointmentId}`,
          html: this.getReminderTemplate(data, baseStyle),
        };
      case 'cancellation':
        return {
          subject: `❌ إلغاء مو��دك - ${data.appointmentId}`,
          html: this.getCancellationTemplate(data, baseStyle),
        };
    }
  }

  // قالب تأكيد الموعد
  private getConfirmationTemplate(data: NotificationData, baseStyle: string): string {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تأكيد موعدك</title>
      ${baseStyle}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon success">✅</div>
          <h1>تم تأكيد موعدك بنجاح!</h1>
          <p class="subtitle">شكراً لك على ثقتك في عيادتنا</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>عزيزي/عزيزتي ${data.patientName}</h2>
            <p>يسعدنا إبلاغكم بأنه تم تأكيد موعدكم بنجاح في ${data.clinicName}</p>
          </div>
          
          <div class="appointment-details">
            <h3>تفاصيل الموعد:</h3>
            <div class="detail-item">
              <strong>رقم الموعد:</strong> ${data.appointmentId}
            </div>
            <div class="detail-item">
              <strong>التاريخ:</strong> ${data.appointmentDate}
            </div>
            <div class="detail-item">
              <strong>الوقت:</strong> ${data.appointmentTime}
            </div>
            <div class="detail-item">
              <strong>الطبيب المعالج:</strong> ${data.doctorName}
            </div>
            ${data.notes ? `<div class="detail-item"><strong>ملاحظات:</strong> ${data.notes}</div>` : ''}
          </div>
          
          <div class="clinic-info">
            <h3>معلومات العيادة:</h3>
            <div class="detail-item">
              <strong>📍 العنوان:</strong> ${data.clinicAddress}
            </div>
            <div class="detail-item">
              <strong>📞 الهاتف:</strong> ${data.clinicPhone}
            </div>
          </div>
          
          <div class="instructions">
            <h3>تعليمات مهمة:</h3>
            <ul>
              <li>يرجى الحضور قبل 15 دقيقة من موعدكم</li>
              <li>أحضر معك بطاقة الهوية أو أي وثائق طبية سابقة</li>
              <li>في حالة عدم القدرة على الحضور، يرجى الاتصال بنا قبل 24 ��اعة</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${data.clinicName}</strong></p>
          <p>رعاية شاملة ومتطورة لصحة أسنانك وابتسامتك</p>
          <p>للاستفسارات: ${data.clinicPhone}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // قالب تذكير بالموعد
  private getReminderTemplate(data: NotificationData, baseStyle: string): string {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تذكير بموعدك</title>
      ${baseStyle}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon reminder">⏰</div>
          <h1>تذكير بموعدك غداً</h1>
          <p class="subtitle">نتطلع لرؤيتك في العيادة</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>عزيزي/عزيزتي ${data.patientName}</h2>
            <p>نذكرك بموعدك المحجوز غداً في ${data.clinicName}</p>
          </div>
          
          <div class="appointment-details">
            <h3>تفاصيل الموعد:</h3>
            <div class="detail-item">
              <strong>رقم الموعد:</strong> ${data.appointmentId}
            </div>
            <div class="detail-item">
              <strong>التاريخ:</strong> ${data.appointmentDate}
            </div>
            <div class="detail-item">
              <strong>الوقت:</strong> ${data.appointmentTime}
            </div>
            <div class="detail-item">
              <strong>الطبيب المعالج:</strong> ${data.doctorName}
            </div>
          </div>
          
          <div class="reminder-notes">
            <h3>تذكيرات مهمة:</h3>
            <div class="alert">
              <p><strong>⚠️ مهم:</strong> يرجى الحضور قبل 15 دقيقة من الموعد المحدد</p>
              <p><strong>📱 للإلغاء:</strong> اتصل بنا قبل 24 ساعة على الأقل</p>
              <p><strong>📍 الموقع:</strong> ${data.clinicAddress}</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${data.clinicName}</strong></p>
          <p>للاستفسارات: ${data.clinicPhone}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // قالب إلغاء الموعد
  private getCancellationTemplate(data: NotificationData, baseStyle: string): string {
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>إلغاء موعدك</title>
      ${baseStyle}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon cancellation">❌</div>
          <h1>تم إلغاء موعدك</h1>
          <p class="subtitle">نأسف لإلغاء الموعد</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>عزيزي/عزيزتي ${data.patientName}</h2>
            <p>نود إبلاغكم بأنه تم إلغاء موعدكم المحجوز في ${data.clinicName}</p>
          </div>
          
          <div class="appointment-details">
            <h3>تفاصيل الموعد المُلغى:</h3>
            <div class="detail-item">
              <strong>رقم الموعد:</strong> ${data.appointmentId}
            </div>
            <div class="detail-item">
              <strong>التاريخ:</strong> ${data.appointmentDate}
            </div>
            <div class="detail-item">
              <strong>الوقت:</strong> ${data.appointmentTime}
            </div>
            <div class="detail-item">
              <strong>الطبيب المعالج:</strong> ${data.doctorName}
            </div>
          </div>
          
          <div class="next-steps">
            <h3>الخطوات التالية:</h3>
            <ul>
              <li>يمكنك حجز موعد جديد في أي وقت</li>
              <li>اتصل بنا لمناقشة مواعيد بديلة</li>
              <li>نحن في الخدمة دائماً</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${data.clinicName}</strong></p>
          <p>للحجز والاستفسارات: ${data.clinicPhone}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // قالب بريد الاختبار
  private getTestEmailTemplate(): string {
    const baseStyle = this.getBaseEmailStyle();
    return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>اختبار نظام الإشعارات</title>
      ${baseStyle}
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon success">🧪</div>
          <h1>اختبار نظام الإشعارات</h1>
          <p class="subtitle">تم إرسال هذا البريد بنجاح!</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>مبروك! النظام يعمل بشكل ممتاز</h2>
            <p>تم إرسال هذا البريد الإلكتروني للتأكد من صحة إعدادات نظام الإشعارات</p>
          </div>
          
          <div class="appointment-details">
            <h3>معلومات الاختبار:</h3>
            <div class="detail-item">
              <strong>وقت الإرسال:</strong> ${new Date().toLocaleString('ar-EG')}
            </div>
            <div class="detail-item">
              <strong>حالة النظام:</strong> ✅ يعمل بشكل ممتاز
            </div>
            <div class="detail-item">
              <strong>النوع:</strong> بريد اختبار
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>عيادة الدكتور كمال الملصي</strong></p>
          <p>نظ��م إدارة الإشعارات</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  // الحصول على تنسيق CSS أساسي
  private getBaseEmailStyle(): string {
    return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f5f5;
        direction: rtl;
        text-align: right;
      }
      
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #ffffff;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
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
      
      .icon.success { color: #10b981; }
      .icon.reminder { color: #f59e0b; }
      .icon.cancellation { color: #ef4444; }
      
      .header h1 {
        font-size: 1.8rem;
        margin-bottom: 10px;
        font-weight: 700;
      }
      
      .subtitle {
        font-size: 1rem;
        opacity: 0.9;
        font-weight: 300;
      }
      
      .content {
        padding: 30px;
      }
      
      .greeting h2 {
        color: #1e40af;
        font-size: 1.4rem;
        margin-bottom: 15px;
      }
      
      .greeting p {
        margin-bottom: 25px;
        font-size: 1.1rem;
        line-height: 1.7;
      }
      
      .appointment-details, .clinic-info, .instructions, .reminder-notes, .next-steps {
        margin-bottom: 25px;
        padding: 20px;
        background-color: #f8fafc;
        border-radius: 8px;
        border-right: 4px solid #1e40af;
      }
      
      .appointment-details h3, .clinic-info h3, .instructions h3, .reminder-notes h3, .next-steps h3 {
        color: #1e40af;
        font-size: 1.2rem;
        margin-bottom: 15px;
        font-weight: 600;
      }
      
      .detail-item {
        margin-bottom: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #e2e8f0;
        font-size: 1rem;
      }
      
      .detail-item:last-child {
        border-bottom: none;
      }
      
      .detail-item strong {
        color: #475569;
        margin-left: 10px;
      }
      
      .instructions ul, .next-steps ul {
        margin-right: 20px;
      }
      
      .instructions li, .next-steps li {
        margin-bottom: 8px;
        color: #475569;
      }
      
      .alert {
        background-color: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 6px;
        padding: 15px;
        margin: 15px 0;
      }
      
      .alert p {
        margin-bottom: 8px;
        color: #92400e;
      }
      
      .footer {
        background-color: #1f2937;
        color: white;
        padding: 25px;
        text-align: center;
      }
      
      .footer p {
        margin-bottom: 5px;
      }
      
      .footer p:first-child {
        font-weight: 600;
        font-size: 1.1rem;
        color: #60a5fa;
      }
      
      @media only screen and (max-width: 600px) {
        .container {
          margin: 10px;
          border-radius: 5px;
        }
        
        .content {
          padding: 20px;
        }
        
        .header {
          padding: 20px 15px;
        }
        
        .header h1 {
          font-size: 1.5rem;
        }
        
        .icon {
          font-size: 2.5rem;
        }
      }
    </style>`;
  }
}

// إنشاء instance واحد للخدمة
export const emailService = new EmailService();
