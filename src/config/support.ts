// Support configuration
// Update these values with your actual contact information

export const SUPPORT_CONFIG = {
  // Email addresses
  bugReportEmail: 'geral@pixelhunter.pt',
  feedbackEmail: 'geral@pixelhunter.pt',
  supportEmail: 'geral@pixelhunter.pt',

  // PayPal donation link
  buyMeCoffeeUrl: 'https://www.paypal.com/donate/?hosted_button_id=JW6PN4XH4CHR8',
  
  // Alternative donation platforms (uncomment to use)
  // kofiUrl: 'https://ko-fi.com/imageprooptimizer',
  // paypalUrl: 'https://paypal.me/imageprooptimizer',
  // githubSponsorsUrl: 'https://github.com/sponsors/yourusername',
  
  // Social links (optional)
  githubUrl: 'https://github.com/yourusername/image-pro-optimizer',
  twitterUrl: 'https://twitter.com/imageproopt',
  
  // App information
  appName: 'Image Pro Optimizer',
  version: '1.0.0',
  
  // Feature flags
  showBugReport: true,
  showFeedback: false,
  showBuyCoffee: true,
  showSocialLinks: false,
} as const;

// Email templates
export const EMAIL_TEMPLATES = {
  bugReport: {
    subject: (appName: string) => `[BUG REPORT] ${appName}`,
    body: (userAgent: string, screenSize: string, deviceType: string) => `Ola,

Encontrei um problema no ${SUPPORT_CONFIG.appName}:

DESCRICAO DO BUG:
[Por favor descreva o que aconteceu]

PASSOS PARA REPRODUZIR:
1. [Primeiro passo]
2. [Segundo passo]
3. [O que aconteceu]

COMPORTAMENTO ESPERADO:
[O que deveria ter acontecido]

INFORMACOES TECNICAS:
- Browser: ${userAgent}
- Ecra: ${screenSize}
- Dispositivo: ${deviceType}
- Data: ${new Date().toLocaleString('pt-PT')}

INFORMACOES ADICIONAIS:
[Qualquer outra informacao relevante]

Obrigado por ajudar a melhorar a aplicacao!`
  },
  
  feedback: {
    subject: (appName: string) => `Feedback - ${appName}`,
    body: (appName: string) => `
Hi!

I'd like to share some feedback about ${appName}:

**What I love:**
[What works well for you]

**Suggestions for improvement:**
[What could be better]

**Feature requests:**
[Any new features you'd like to see]

**Overall experience:**
[Your general thoughts]

Thanks for creating this tool!
    `.trim()
  }
};

// Utility functions
export const createEmailUrl = (email: string, subject: string, body: string) => {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
};

export const getBrowserInfo = () => {
  return {
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
    language: navigator.language,
  };
};
