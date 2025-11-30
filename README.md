<p align="center">
  <img src="public/icons/icon-512x512.png" alt="Image Optimizer Pro" width="128" height="128">
</p>

<h1 align="center">Image Optimizer Pro</h1>

<p align="center">
  <strong>Professional image optimization tool with batch processing, format conversion, and quality controls.</strong>
</p>

<p align="center">
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases/latest">
    <img src="https://img.shields.io/github/v/release/pixelhunter1/imgprooptimze?style=flat-square&color=10b981" alt="Latest Release">
  </a>
  <a href="https://github.com/pixelhunter1/imgprooptimze/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/pixelhunter1/imgprooptimze?style=flat-square&color=10b981" alt="License">
  </a>
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases">
    <img src="https://img.shields.io/github/downloads/pixelhunter1/imgprooptimze/total?style=flat-square&color=10b981" alt="Downloads">
  </a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-download">Download</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-how-to-use">How to Use</a> •
  <a href="#-development">Development</a>
</p>

---

## Overview

**Image Optimizer Pro** is a powerful, privacy-focused image optimization application that runs entirely on your device. No uploads, no servers, no data collection — your images never leave your computer.

Available as a **desktop application** (macOS, Windows, Linux) and as a **web application** (PWA).

<p align="center">
  <img src="docs/screenshot.png" alt="Image Optimizer Pro Screenshot" width="800">
</p>

---

## ✨ Features

### Image Optimization
- **Client-Side Processing** — All optimization happens locally on your device
- **Multiple Formats** — Convert between WebP, JPEG, and PNG
- **Quality Presets** — Small (40%), Balanced (70%), High (90%), Maximum (100%)
- **Smart Resizing** — Control maximum dimensions while preserving aspect ratio
- **Preserve Quality Mode** — Prioritize quality over file size when needed

### Crop Editor
- **Advanced Cropping** — Precise image cropping with visual guides
- **Aspect Ratio Presets** — 1:1, 16:9, 4:3, 3:2, and custom ratios
- **Style Options** — Add padding, rounded corners, background colors
- **Frame Styles** — Professional frame effects inspired by shots.so
- **Real-time Preview** — See changes as you make them

### Batch Processing
- **Multi-File Upload** — Drag & drop multiple images at once
- **Batch Optimization** — Process all images with same settings
- **Batch Rename** — Apply naming patterns to multiple files
- **ZIP Download** — Package all optimized images in one file

### Before/After Comparison
- **Side-by-Side View** — Compare original and optimized images
- **Interactive Slider** — Slide to reveal differences
- **Zoom & Pan** — Inspect details at any zoom level
- **Size Statistics** — See exact file size reduction

### Desktop App Features
- **Native Performance** — Fast, responsive desktop experience
- **File Associations** — Open images directly with Image Optimizer Pro
- **Native Dialogs** — System save dialogs for better integration
- **Menu Bar** — Full application menu with keyboard shortcuts

### Privacy & Security
- **100% Offline** — Works without internet connection
- **No Data Collection** — Zero analytics, tracking, or telemetry
- **Local Processing** — Images never leave your device
- **Open Source** — Full transparency, audit the code yourself

---

## 📥 Download

### Desktop Application

| Platform | Download | Architecture |
|----------|----------|--------------|
| **macOS** | [DMG Installer](https://github.com/pixelhunter1/imgprooptimze/releases/latest) | Intel & Apple Silicon |
| **Windows** | [Setup Installer](https://github.com/pixelhunter1/imgprooptimze/releases/latest) | x64 & x86 |
| **Windows** | [Portable EXE](https://github.com/pixelhunter1/imgprooptimze/releases/latest) | x64 (no install) |
| **Linux** | [AppImage](https://github.com/pixelhunter1/imgprooptimze/releases/latest) | x64 |
| **Linux** | [DEB Package](https://github.com/pixelhunter1/imgprooptimze/releases/latest) | x64 (Debian/Ubuntu) |

### System Requirements

| Platform | Minimum Version |
|----------|-----------------|
| macOS | 10.13 High Sierra or later |
| Windows | Windows 10 or later |
| Linux | Ubuntu 18.04 or equivalent |

### Web Application

Use Image Optimizer Pro directly in your browser — no installation required:

**[Launch Web App →](https://imgoptimizerpro.com)**

The web version is a Progressive Web App (PWA) that can be installed on any device.

---

## 🚀 Quick Start

### macOS

1. Download the `.dmg` file for your Mac:
   - **Intel Mac**: `Image Optimizer Pro-x.x.x.dmg`
   - **Apple Silicon (M1/M2/M3)**: `Image Optimizer Pro-x.x.x-arm64.dmg`
2. Open the DMG file
3. Drag **Image Optimizer Pro** to the **Applications** folder
4. Launch from Applications or Spotlight

> **Note**: On first launch, you may need to right-click and select "Open" to bypass Gatekeeper.

### Windows

**Installer (Recommended)**:
1. Download `Image Optimizer Pro Setup x.x.x.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

**Portable Version**:
1. Download `Image Optimizer Pro x.x.x.exe`
2. Run directly — no installation needed
3. Keep on a USB drive for use on any computer

### Linux

**AppImage (Universal)**:
```bash
chmod +x "Image Optimizer Pro-x.x.x.AppImage"
./"Image Optimizer Pro-x.x.x.AppImage"
```

**Debian/Ubuntu**:
```bash
sudo dpkg -i imgprooptimze_x.x.x_amd64.deb
```

---

## 📖 How to Use

### Basic Workflow

```
1. UPLOAD     →     2. CONFIGURE     →     3. OPTIMIZE     →     4. DOWNLOAD
   Drop images         Set quality           Click button          Save files
```

### Step-by-Step Guide

#### 1. Upload Images

- **Drag & Drop**: Drag images directly onto the upload area
- **Click to Browse**: Click the upload area to select files
- **Supported Formats**: PNG, JPEG, WebP

#### 2. Configure Settings

| Setting | Description | Recommended |
|---------|-------------|-------------|
| **Format** | Output format (WebP, JPEG, PNG) | WebP for web |
| **Quality** | Compression level (40-100%) | 70% balanced |
| **Max Dimensions** | Maximum width/height | Based on use case |
| **Preserve Quality** | Prioritize quality over size | For photography |

#### 3. Optimize Images

Click **"Optimize Images"** to process all uploaded images. Watch the progress bar as each image is optimized.

#### 4. Review Results

For each image, you'll see:
- **Before/After Comparison** — Click to compare visually
- **Size Reduction** — Original vs optimized file size
- **Compression Ratio** — Percentage of size saved

#### 5. Crop & Edit (Optional)

Click the **Crop** button on any image to:
- Adjust the crop area
- Apply aspect ratio presets
- Add padding and rounded corners
- Apply background colors or effects

#### 6. Download

- **Individual Download**: Click the download button on each image
- **Download All as ZIP**: Click "Download All" to get a ZIP file
- **Custom Filenames**: Rename files before downloading

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + O` | Open files |
| `Ctrl/Cmd + S` | Save current image |
| `Ctrl/Cmd + Shift + S` | Save all as ZIP |
| `Ctrl/Cmd + R` | Reset project |
| `Escape` | Close dialogs |

### Tips & Best Practices

**For Web Images:**
- Use **WebP** format for best compression
- Set quality to **70%** for balanced results
- Limit dimensions to **1920px** max width

**For Social Media:**
- Use platform-recommended dimensions
- Quality of **80%** maintains good visual quality
- WebP or JPEG depending on platform support

**For Print:**
- Use **PNG** for lossless quality
- Set quality to **100%**
- Keep original dimensions

**For E-commerce:**
- Consistent dimensions (e.g., 1000x1000)
- White background for products
- WebP with JPEG fallback

---

## 🛠️ Development

### Prerequisites

- **Node.js** 20.19+ or 22.12+
- **npm**, **yarn**, or **pnpm**

### Installation

```bash
# Clone the repository
git clone https://github.com/pixelhunter1/imgprooptimze.git
cd imgprooptimze

# Install dependencies
npm install

# Start development server (web)
npm run dev

# Start development server (Electron)
npm run electron:dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web development server |
| `npm run build` | Build web app for production |
| `npm run electron:dev` | Start Electron in development |
| `npm run electron:build` | Build Electron app |
| `npm run electron:dist:mac` | Build for macOS |
| `npm run electron:dist:win` | Build for Windows |
| `npm run electron:dist:linux` | Build for Linux |
| `npm run electron:dist:all` | Build for all platforms |

### Project Structure

```
imgprooptimze/
├── electron/                 # Electron main process
│   ├── main/                 # Main process code
│   └── preload/              # Preload scripts
├── public/                   # Static assets
│   ├── icons/                # App icons
│   ├── manifest.json         # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── components/           # React components
│   │   ├── ui/               # Base UI components
│   │   ├── crop/             # Crop editor
│   │   ├── dialogs/          # Modal dialogs
│   │   ├── file-upload/      # File upload
│   │   └── optimization/     # Optimization UI
│   ├── lib/                  # Utilities
│   │   ├── imageProcessor.ts # Image processing logic
│   │   └── utils.ts          # Helper functions
│   └── types/                # TypeScript definitions
├── electron-builder.yml      # Electron Builder config
└── package.json
```

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19, TypeScript |
| **Build Tool** | Vite 7 |
| **Desktop** | Electron 39 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | Radix UI, shadcn/ui |
| **Image Processing** | browser-image-compression, Canvas API |
| **Packaging** | electron-builder |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) — Desktop app framework
- [React](https://react.dev/) — UI library
- [Tailwind CSS](https://tailwindcss.com/) — CSS framework
- [Radix UI](https://www.radix-ui.com/) — Accessible components
- [Lucide](https://lucide.dev/) — Beautiful icons
- [browser-image-compression](https://github.com/nickorlow/browser-image-compression) — Image compression

---

<p align="center">
  Made with ❤️ by the Image Optimizer Pro team
</p>

<p align="center">
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases">Releases</a> •
  <a href="https://github.com/pixelhunter1/imgprooptimze/issues">Report Bug</a> •
  <a href="https://github.com/pixelhunter1/imgprooptimze/issues">Request Feature</a>
</p>
