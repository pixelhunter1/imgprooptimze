# 📧 EmailJS Template Configuration

## 🎯 **Template para Bug Reports**

### **Template ID:** `template_02zui7a`

### **Variáveis do Template:**

## 📧 **Template HTML para EmailJS Dashboard**

### **Subject Field:**
```
{{subject}}
```

### **Email Body (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🐛 Bug Report - Image Pro Optimizer</h1>
  </div>

  <!-- User Info -->
  <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
    <p style="margin: 5px 0; color: #374151;"><strong>From:</strong> {{from_name}}</p>
    <p style="margin: 5px 0; color: #374151;"><strong>Reply to:</strong> {{reply_to}}</p>
  </div>

  <!-- Problem Description -->
  <div style="margin-bottom: 25px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">📝 Problem Description</h2>
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap; font-family: 'Courier New', monospace; color: #374151;">{{message}}</div>
  </div>

  <!-- Technical Information -->
  <div style="margin-bottom: 25px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">🔧 Technical Information</h2>
    <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
      <tr style="background-color: #f3f4f6;">
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 30%;">Browser:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-family: 'Courier New', monospace; font-size: 12px;">{{browser_info}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Resolution:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{screen_size}}</td>
      </tr>
      <tr style="background-color: #f3f4f6;">
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Device:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{device_type}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Date/Time:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">{{timestamp}}</td>
      </tr>
      <tr style="background-color: #f3f4f6;">
        <td style="padding: 10px; font-weight: bold; color: #374151;">App Version:</td>
        <td style="padding: 10px; color: #6b7280;">{{app_version}}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; text-align: center; border-top: 3px solid #3b82f6;">
    <p style="margin: 0; color: #64748b; font-size: 14px; font-style: italic;">
      This email was sent automatically through the Image Pro Optimizer bug report system.
    </p>
  </div>

</div>
```

## ⚙️ **Configuração no EmailJS Dashboard**

### **🚨 IMPORTANTE: Como configurar corretamente**

#### **1. Acesse o EmailJS Dashboard:**
- **URL:** https://dashboard.emailjs.com/
- **Login** com sua conta

#### **2. Edite o Template (`template_02zui7a`):**
1. **Vá para:** Templates → template_02zui7a
2. **Subject:** Cole apenas: `{{subject}}`
3. **Content:** Cole todo o HTML acima (sem as ```html tags)
4. **Settings:**
   - **To Email:** `geral@pixelhunter.pt`
   - **From Name:** `{{from_name}}`
   - **Reply To:** `{{reply_to}}`

#### **3. ⚠️ Problemas Comuns:**
- **Não cole** as tags ```html
- **Cole apenas** o conteúdo HTML puro
- **Certifique-se** que as variáveis {{}} estão corretas
- **Teste** o template antes de salvar

### **3. Variáveis Enviadas pela App:**

```typescript
const templateParams = {
  to_email: 'geral@pixelhunter.pt',
  from_name: 'Utilizador Anónimo', // ou email do user
  subject: '[BUG REPORT] Image Pro Optimizer',
  message: 'Descrição do bug...',
  browser_info: 'Chrome 119.0.0.0',
  screen_size: '1920x1080',
  device_type: 'Desktop',
  timestamp: '29/08/2025, 22:30:15',
  app_version: '1.0.0',
  reply_to: 'user@email.com', // ou noreply
};
```

## 🧪 **Como Testar**

### **1. Teste Local:**
1. Abrir: http://localhost:3001/
2. Clicar no botão flutuante (canto inferior direito)
3. Clicar "Report Bug"
4. Deve aparecer loading spinner
5. Aguardar confirmação de sucesso

### **2. Verificar Email:**
- Verificar inbox de `geral@pixelhunter.pt`
- Email deve chegar em poucos segundos
- Verificar se todas as variáveis foram preenchidas

### **3. Debug no Console:**
```
✅ EmailJS initialized successfully
📧 Sending bug report via EmailJS...
✅ Bug report sent successfully: {status: 200, text: "OK"}
```

## 🔧 **Troubleshooting**

### **Erro: "EmailJS not configured"**
- Verificar se `.env.local` tem as 3 variáveis
- Reiniciar servidor de desenvolvimento

### **Erro: "Failed to send"**
- Verificar se Service ID está correto
- Verificar se Template ID existe
- Verificar quota do EmailJS (200 emails/mês grátis)

### **Email não chega:**
- Verificar spam folder
- Verificar se template está ativo no EmailJS
- Verificar configuração do serviço de email

## 📊 **Limites EmailJS (Plano Gratuito)**

- **200 emails/mês** grátis
- **Após limite:** Fallback automático para mailto
- **Upgrade:** $15/mês para 1000 emails

## 🔒 **Segurança**

### **✅ Seguro (Frontend):**
- Public Key
- Service ID  
- Template ID

### **❌ Nunca expor:**
- Private Key (fica no EmailJS dashboard)
- Credenciais de email
- Senhas

## 🎯 **Resultado Final**

### **Fluxo Completo:**
1. **User clica "Report Bug"**
2. **App tenta EmailJS primeiro**
3. **Se sucesso:** Mostra "✅ Enviado com sucesso!"
4. **Se falha:** Fallback para mailto
5. **Se mailto falha:** Copia para clipboard

### **Experiência do Utilizador:**
- **Melhor caso:** Email enviado automaticamente
- **Caso médio:** Abre cliente de email
- **Pior caso:** Copia informações para clipboard

**Sistema robusto com múltiplos fallbacks! 🎉**
