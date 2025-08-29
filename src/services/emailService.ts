import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_CONFIG = {
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
};

// Initialize EmailJS
const initEmailJS = () => {
  if (!EMAILJS_CONFIG.publicKey) {
    console.warn('⚠️ EmailJS Public Key not configured');
    return false;
  }
  
  try {
    emailjs.init(EMAILJS_CONFIG.publicKey);
    console.log('✅ EmailJS initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize EmailJS:', error);
    return false;
  }
};

// Check if EmailJS is properly configured
export const isEmailJSConfigured = (): boolean => {
  return !!(
    EMAILJS_CONFIG.publicKey && 
    EMAILJS_CONFIG.serviceId && 
    EMAILJS_CONFIG.templateId
  );
};

// Bug report email interface
export interface BugReportData {
  user_email: string;
  subject: string;
  message: string;
  browser_info: string;
  screen_size: string;
  device_type: string;
  timestamp: string;
  app_version: string;
}

// Send bug report via EmailJS
export const sendBugReport = async (data: BugReportData): Promise<boolean> => {
  if (!isEmailJSConfigured()) {
    console.warn('⚠️ EmailJS not configured, falling back to mailto');
    return false;
  }

  if (!initEmailJS()) {
    return false;
  }

  try {
    console.log('📧 Sending bug report via EmailJS...');
    
    const templateParams = {
      to_email: 'geral@pixelhunter.pt',
      from_name: data.user_email,
      subject: data.subject,
      message: data.message,
      browser_info: data.browser_info,
      screen_size: data.screen_size,
      device_type: data.device_type,
      timestamp: data.timestamp,
      app_version: data.app_version,
      // Additional fields for the template
      reply_to: data.user_email,
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId!,
      EMAILJS_CONFIG.templateId!,
      templateParams
    );

    if (response.status === 200) {
      console.log('✅ Bug report sent successfully:', response);
      return true;
    } else {
      console.error('❌ Failed to send bug report:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending bug report:', error);
    return false;
  }
};

// Fallback mailto function
export const openMailtoFallback = (data: BugReportData): void => {
  const subject = encodeURIComponent(data.subject);
  const body = encodeURIComponent(`
${data.message}

---
Informações Técnicas:
- Browser: ${data.browser_info}
- Ecrã: ${data.screen_size}
- Dispositivo: ${data.device_type}
- Data: ${data.timestamp}
- Versão: ${data.app_version}
  `.trim());

  const mailtoUrl = `mailto:geral@pixelhunter.pt?subject=${subject}&body=${body}`;
  
  try {
    window.location.href = mailtoUrl;
    console.log('📧 Opened mailto fallback');
  } catch (error) {
    console.error('❌ Failed to open mailto:', error);
    // Final fallback: copy to clipboard
    const emailText = `Para: geral@pixelhunter.pt\nAssunto: ${data.subject}\n\n${data.message}`;
    navigator.clipboard.writeText(emailText).then(() => {
      alert('Informações copiadas para clipboard. Cole no seu cliente de email.');
    }).catch(() => {
      alert(`Por favor envie email para: geral@pixelhunter.pt\nAssunto: ${data.subject}`);
    });
  }
};

// Main function to send bug report (tries EmailJS first, then mailto)
export const submitBugReport = async (data: BugReportData): Promise<{ success: boolean; method: 'emailjs' | 'mailto' | 'failed' }> => {
  // Try EmailJS first
  if (isEmailJSConfigured()) {
    const emailjsSuccess = await sendBugReport(data);
    if (emailjsSuccess) {
      return { success: true, method: 'emailjs' };
    }
  }

  // Fallback to mailto
  try {
    openMailtoFallback(data);
    return { success: true, method: 'mailto' };
  } catch (error) {
    console.error('❌ All email methods failed:', error);
    return { success: false, method: 'failed' };
  }
};
