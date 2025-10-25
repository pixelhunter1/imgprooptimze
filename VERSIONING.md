# 🔢 Sistema de Versionamento Automático

## 📋 Visão Geral

O projeto agora inclui um sistema de versionamento automático que incrementa a versão no `package.json` antes de cada build de produção. Isso garante que os utilizadores sempre recebam notificações de atualização.

## 🚀 Como Usar

### Builds com Auto-Incremento

Use estes comandos para fazer build **E incrementar a versão automaticamente**:

```bash
# Build com incremento PATCH (1.0.9 → 1.0.10)
npm run build:patch

# Build com incremento MINOR (1.0.9 → 1.1.0)
npm run build:minor

# Build com incremento MAJOR (1.0.9 → 2.0.0)
npm run build:major
```

### Incrementar Versão Sem Build

Para apenas incrementar a versão (sem fazer build):

```bash
# Incrementar PATCH
npm run version:patch

# Incrementar MINOR
npm run version:minor

# Incrementar MAJOR
npm run version:major
```

### Build Normal (Sem Auto-Incremento)

Se preferir **NÃO** incrementar a versão:

```bash
npm run build
```

## 📦 Tipos de Versão (Semantic Versioning)

Seguindo o padrão **MAJOR.MINOR.PATCH** (ex: 1.0.9):

### 🔴 MAJOR (1.0.9 → 2.0.0)
Use quando fizer alterações **incompatíveis** na API:
- Mudanças que quebram funcionalidade existente
- Remoção de features
- Reestruturação completa da interface
- **Força atualização obrigatória** para os utilizadores

```bash
npm run build:major
```

### 🟡 MINOR (1.0.9 → 1.1.0)
Use quando adicionar funcionalidade **compatível** com versões anteriores:
- Novas features
- Melhorias de funcionalidades existentes
- Novos componentes ou opções
- Mudanças visíveis mas não-críticas

```bash
npm run build:minor
```

### 🟢 PATCH (1.0.9 → 1.0.10)
Use para **bug fixes** e melhorias menores:
- Correção de bugs
- Pequenos ajustes de UI
- Melhorias de performance
- Correções de texto/tradução
- **Uso mais comum no dia-a-dia**

```bash
npm run build:patch
```

## ⚙️ Como Funciona

### 1. Script de Auto-Incremento (`scripts/auto-version.js`)

```javascript
// Lê package.json
// Incrementa versão baseado no tipo (patch/minor/major)
// Guarda nova versão no package.json
```

### 2. Build Process

Quando executam `npm run build:patch`:

1. ✅ **Auto-Version**: Incrementa versão (1.0.9 → 1.0.10)
2. ✅ **PreBuild**: Gera `version.json` com nova versão
3. ✅ **Build**: Compila a aplicação
4. ✅ **PostBuild**: Copia `version.json` para `dist/`

### 3. Detecção de Atualização

Quando fazem deploy da nova versão:

1. Utilizadores com app aberta recebem verificação automática (a cada 30 min)
2. Sistema compara `version.json` do servidor vs local
3. Se for diferente → mostra notificação de update
4. User clica "Update Now" → página recarrega com nova versão

## 📝 Workflow Recomendado

### Para Desenvolvimento Diário

```bash
# Desenvolver features
git add .
git commit -m "feat: nova funcionalidade"

# Fazer build com auto-incremento patch
npm run build:patch

# Deploy
# (o utilizador será notificado automaticamente)
```

### Para Features Importantes

```bash
# Desenvolver feature grande
git add .
git commit -m "feat: novo sistema de exportação"

# Incrementar MINOR version
npm run build:minor

# Deploy
```

### Para Mudanças Críticas

```bash
# Fazer mudanças incompatíveis
git add .
git commit -m "BREAKING CHANGE: nova API"

# Incrementar MAJOR version (força update)
npm run build:major

# Deploy
```

## 🎯 Vantagens

✅ **Automático**: Não precisam lembrar de incrementar versão manualmente
✅ **Consistente**: Sempre segue semantic versioning
✅ **Notificações**: Utilizadores sempre recebem updates
✅ **Flexível**: Podem escolher tipo de incremento ou não incrementar
✅ **Rastreável**: Cada build tem versão única

## ⚠️ Notas Importantes

### Commits e Git

O script **NÃO faz commit** automático da versão. Têm duas opções:

**Opção 1: Commit manual**
```bash
npm run build:patch
git add package.json
git commit -m "chore: bump version to 1.0.10"
git push
```

**Opção 2: Incrementar antes do commit**
```bash
npm run version:patch
git add package.json
git commit -m "chore: bump version to 1.0.10"
npm run build
git push
```

### Build Normal vs Build com Auto-Incremento

- `npm run build` → **NÃO incrementa** versão (seguro para testar)
- `npm run build:patch` → **Incrementa** versão (usar para deploy)

### Verificar Versão Atual

```bash
# Ver versão no package.json
grep version package.json

# Ver versão gerada
cat public/version.json
```

## 🐛 Troubleshooting

### Versão não está a incrementar

Verificar se o script tem permissões:
```bash
chmod +x scripts/auto-version.js
```

### Utilizadores não recebem notificação

1. Verificar se incrementaram a versão antes do build
2. Confirmar que `dist/version.json` foi deployado
3. Limpar cache do browser e service worker

### Ver versão na app

Abrir DevTools Console:
```javascript
// Ver versão local
localStorage.getItem('app_version')

// Forçar verificação de update
import { checkForUpdates } from '@/lib/version';
await checkForUpdates()
```

## 📚 Recursos

- [Semantic Versioning](https://semver.org/)
- [UPDATE_SYSTEM.md](./UPDATE_SYSTEM.md) - Documentação completa do sistema de updates
- [package.json](./package.json) - Scripts disponíveis

---

**🚀 Com este sistema, nunca mais os utilizadores ficarão com versões antigas da app!**
