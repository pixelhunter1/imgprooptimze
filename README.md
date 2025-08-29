# 🖼️ Image Optimizer Pro

Uma aplicação web moderna e minimalista para otimização de imagens com processamento client-side, conversão de formatos e capacidades de processamento em lote.

## ✨ Funcionalidades Principais

### 🚀 Otimização de Imagens
- **Processamento Client-Side**: Toda a otimização é feita no browser, sem necessidade de servidor
- **Múltiplos Formatos**: Conversão entre WebP, JPEG e PNG
- **Controlo de Qualidade**: Ajuste preciso da qualidade com presets (Small, Balanced, High, Maximum)
- **Redimensionamento Inteligente**: Controlo de dimensões máximas mantendo proporções
- **Modo Preservar Qualidade**: Prioriza qualidade sobre tamanho do ficheiro

### 📁 Gestão de Ficheiros
- **Upload por Drag & Drop**: Interface intuitiva para carregar imagens
- **Processamento em Lote**: Otimiza múltiplas imagens simultaneamente
- **Pré-visualização**: Comparação lado-a-lado antes/depois da otimização
- **Estatísticas Detalhadas**: Mostra tamanho original, otimizado e taxa de compressão

### 🏷️ Sistema de Renomeação
- **Renomeação Individual**: Edita nomes de ficheiros um por um
- **Renomeação em Lote**: Aplica padrões a múltiplas imagens
- **Padrões Flexíveis**: Prefixos, sufixos, numeração automática
- **Pré-visualização**: Vê como ficam os nomes antes de aplicar

### 📦 Download e Exportação
- **Download Individual**: Baixa imagens otimizadas uma por uma
- **Download ZIP**: Empacota todas as imagens num ficheiro ZIP
- **Nomes Personalizados**: Mantém os nomes definidos pelo utilizador
- **Progresso Visual**: Barra de progresso durante criação do ZIP

### 📱 PWA (Progressive Web App)
- **Instalável**: Adiciona ao ecrã principal como app nativa
- **Offline Ready**: Service Worker para funcionamento offline
- **Ícones Adaptativos**: Suporte para diferentes tamanhos e formatos
- **Notificações**: Alertas quando otimização está completa

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** - Framework principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS v4** - Styling moderno e responsivo

### UI/UX
- **Shadcn/ui** - Componentes de interface consistentes
- **Radix UI** - Componentes acessíveis e primitivos
- **Lucide React** - Ícones modernos e consistentes
- **Class Variance Authority** - Gestão de variantes de componentes

### Processamento de Imagens
- **browser-image-compression** - Compressão de imagens no browser
- **Canvas API** - Manipulação de imagens para alta qualidade
- **JSZip** - Criação de ficheiros ZIP no client-side

### PWA
- **Service Worker** - Cache e funcionamento offline
- **Web App Manifest** - Configuração de instalação
- **Workbox** (implícito) - Estratégias de cache

## 🎨 Interface do Utilizador

### Layout Responsivo
- **Duas Colunas**: Upload/configurações à esquerda, resultados à direita
- **Design Minimalista**: Interface limpa e focada na funcionalidade
- **Sticky Sidebar**: Controlos sempre visíveis durante scroll
- **Mobile-First**: Totalmente responsivo para todos os dispositivos

### Componentes Principais
- **ImageUpload**: Zona de upload com drag & drop
- **OptimizationControls**: Painel de configurações de otimização
- **ImagePreview**: Pré-visualização com estatísticas e ações
- **Dialogs**: Modais para ZIP download, renomeação e reset

## 🔧 Configurações de Otimização

### Formatos Suportados
- **WebP**: Formato moderno com melhor compressão
- **JPEG**: Formato universal para fotografias
- **PNG**: Formato com transparência

### Presets de Qualidade
- **Small (40%)**: Máxima compressão, menor qualidade
- **Balanced (70%)**: Equilíbrio entre tamanho e qualidade
- **High (90%)**: Alta qualidade, compressão moderada
- **Maximum (100%)**: Qualidade máxima, sem compressão

### Opções Avançadas
- **Preservar Qualidade**: Prioriza qualidade sobre tamanho
- **Dimensões Máximas**: Controlo de largura/altura máxima
- **Compressão Adaptativa**: Ajusta automaticamente baseado na qualidade

## 📊 Métricas e Estatísticas

### Por Imagem
- Tamanho original vs otimizado
- Taxa de compressão (%)
- Formato original e final
- Dimensões da imagem
- Qualidade aplicada

### Globais
- Total de imagens processadas
- Poupança total de espaço
- Progresso do processamento
- Tempo estimado de conclusão

## 🚀 Como Usar

1. **Upload**: Arrasta imagens para a zona de upload ou clica para selecionar
2. **Configurar**: Escolhe formato, qualidade e outras opções
3. **Otimizar**: Clica em "Optimize Images" para processar
4. **Pré-visualizar**: Vê os resultados e estatísticas
5. **Renomear** (opcional): Personaliza nomes dos ficheiros
6. **Download**: Baixa individualmente ou em ZIP

## 💾 Instalação como PWA

1. Abre a aplicação no browser
2. Procura o ícone de instalação na barra de endereços
3. Clica em "Instalar" ou "Adicionar ao Ecrã Principal"
4. A app fica disponível como aplicação nativa

## 🔒 Privacidade e Segurança

- **Processamento Local**: Todas as imagens são processadas no browser
- **Sem Upload**: Nenhuma imagem é enviada para servidores
- **Dados Privados**: Informações nunca saem do dispositivo
- **HTTPS Ready**: Suporte para conexões seguras

## 🎯 Casos de Uso

- **Web Development**: Otimizar imagens para websites
- **E-commerce**: Preparar fotos de produtos
- **Social Media**: Reduzir tamanho para upload rápido
- **Email Marketing**: Comprimir imagens para newsletters
- **Mobile Apps**: Preparar assets para aplicações
- **SEO**: Melhorar velocidade de carregamento de páginas

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 20.19+ ou 22.12+
- npm, yarn ou pnpm

### Instalação
```bash
# Clonar repositório
git clone [repository-url]
cd imgprooptimze

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Pré-visualizar build
npm run preview
```

### Scripts Disponíveis
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Pré-visualizar build
- `npm run lint` - Verificar código

### Estrutura do Projeto
```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── file-upload/    # Upload de ficheiros
│   ├── optimization/   # Controlos e pré-visualização
│   ├── dialogs/        # Modais e dialogs
│   └── pwa/           # Componentes PWA
├── lib/               # Utilitários e lógica
│   ├── imageProcessor.ts  # Processamento de imagens
│   └── utils.ts       # Funções auxiliares
└── types/             # Definições TypeScript

public/
├── icons/             # Ícones PWA
├── manifest.json      # Manifest PWA
├── sw.js             # Service Worker
└── app-icon.svg      # Ícone principal
```

---

**Image Optimizer Pro** - Otimização de imagens profissional, simples e privada. 🚀
