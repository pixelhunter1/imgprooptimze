# 🎯 Support & Feedback Setup Guide

## 📧 **Configuração de Emails**

### **1. Atualizar Emails de Contacto**
Edite o ficheiro `src/config/support.ts`:

```typescript
export const SUPPORT_CONFIG = {
  // Substitua pelos seus emails reais
  bugReportEmail: 'bugs@seudominio.com',
  feedbackEmail: 'feedback@seudominio.com',
  supportEmail: 'support@seudominio.com',
  
  // Outros campos...
}
```

### **2. Configurar Buy Me a Coffee**
1. **Criar conta:** https://buymeacoffee.com/
2. **Obter link:** https://buymeacoffee.com/seunome
3. **Atualizar configuração:**
```typescript
buyMeCoffeeUrl: 'https://buymeacoffee.com/seunome',
```

### **3. Plataformas Alternativas de Doação**
```typescript
// Descomente e configure conforme necessário
kofiUrl: 'https://ko-fi.com/seunome',
paypalUrl: 'https://paypal.me/seunome',
githubSponsorsUrl: 'https://github.com/sponsors/seunome',
```

## 🎛️ **Personalização de Funcionalidades**

### **Ativar/Desativar Opções**
```typescript
// Feature flags
showBugReport: true,     // Mostrar botão de reportar bugs
showFeedback: true,      // Mostrar botão de feedback
showBuyCoffee: true,     // Mostrar botão de doação
showSocialLinks: false,  // Mostrar links sociais
```

### **Personalizar Templates de Email**
Edite `EMAIL_TEMPLATES` em `src/config/support.ts`:

```typescript
bugReport: {
  subject: (appName: string) => `Bug Report - ${appName}`,
  body: (userAgent: string, screenSize: string, deviceType: string) => `
    // Seu template personalizado aqui
  `
}
```

## 🎨 **Estilos e Aparência**

### **Cores do Botão Flutuante**
Em `src/components/support/FloatingSupport.tsx`:

```typescript
// Cores dos botões de ação
color: 'bg-red-500',        // Bug report (vermelho)
color: 'bg-amber-500',      // Buy coffee (âmbar)
color: 'bg-pink-500',       // Feedback (rosa)

// Cores hover
hoverColor: 'hover:bg-red-600',
```

### **Posição do Botão**
```css
/* Em FloatingSupport.tsx */
className="fixed bottom-6 right-6 z-50"

/* Opções de posição: */
bottom-6 left-6    /* Canto inferior esquerdo */
top-6 right-6      /* Canto superior direito */
bottom-6 right-6   /* Canto inferior direito (atual) */
```

## 🔧 **Configurações Avançadas**

### **Informações do Browser**
A função `getBrowserInfo()` coleta automaticamente:
- User Agent
- Tamanho da tela
- Tipo de dispositivo
- Idioma
- Plataforma

### **Personalizar Informações Coletadas**
```typescript
export const getBrowserInfo = () => {
  return {
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
    // Adicione mais campos conforme necessário
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };
};
```

## 📱 **Versão Minimalista**

Se preferir uma versão mais simples, use `SupportButton.tsx`:

```typescript
// Em App.tsx, substitua:
import FloatingSupport from '@/components/support/FloatingSupport';

// Por:
import SupportButton from '@/components/support/SupportButton';
```

## 🚀 **Deploy e Produção**

### **Antes do Deploy:**
1. ✅ Atualizar todos os emails para os reais
2. ✅ Configurar Buy Me a Coffee com link real
3. ✅ Testar todos os botões
4. ✅ Verificar templates de email
5. ✅ Confirmar que emails chegam corretamente

### **Teste Local:**
```bash
npm run dev
```
1. Abrir http://localhost:3001/
2. Clicar no botão flutuante (canto inferior direito)
3. Testar cada opção (Bug Report, Buy Coffee, Feedback)
4. Verificar se emails abrem corretamente

## 🎯 **Exemplos de Uso**

### **Bug Report Email:**
- **Para:** bugs@seudominio.com
- **Assunto:** Bug Report - Image Pro Optimizer
- **Corpo:** Template com informações do browser

### **Feedback Email:**
- **Para:** feedback@seudominio.com
- **Assunto:** Feedback - Image Pro Optimizer
- **Corpo:** Template para sugestões

### **Buy Me a Coffee:**
- **Abre:** Link externo para plataforma de doação
- **Comportamento:** Nova aba/janela

## 🔒 **Privacidade**

### **Dados Coletados:**
- ✅ User Agent (para debug)
- ✅ Resolução de tela (para debug)
- ✅ Tipo de dispositivo (para debug)
- ❌ Nenhum dado pessoal
- ❌ Nenhum tracking

### **GDPR Compliance:**
- Dados são enviados apenas quando utilizador clica
- Nenhum tracking automático
- Informações técnicas apenas para debug
- Utilizador controla quando e o que envia

## 📞 **Suporte**

Se precisar de ajuda com a configuração:
1. Verificar `src/config/support.ts`
2. Testar localmente antes do deploy
3. Confirmar que emails funcionam
4. Verificar console do browser para erros
