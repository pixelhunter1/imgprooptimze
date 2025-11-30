# Image Optimizer Pro

<p align="center">
  <img src="public/icons/icon-512x512.png" alt="Image Optimizer Pro" width="128">
</p>

<p align="center">
  <strong>Professional Image Optimization Tool</strong><br>
  Batch processing • Format conversion • Quality controls • 100% Privacy
</p>

<p align="center">
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases/latest"><img src="https://img.shields.io/github/v/release/pixelhunter1/imgprooptimze?style=flat-square&color=10b981" alt="Release"></a>
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases"><img src="https://img.shields.io/github/downloads/pixelhunter1/imgprooptimze/total?style=flat-square&color=10b981" alt="Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/pixelhunter1/imgprooptimze?style=flat-square&color=10b981" alt="License"></a>
</p>

---

## Overview

**Image Optimizer Pro** is a powerful, privacy-focused image optimization application that runs entirely on your device.

> **No uploads. No servers. No data collection.** Your images never leave your computer.

Available for **macOS**, **Windows**, **Linux**, and as a **Web App (PWA)**.

---

## Download

### macOS

| Chip | Download |
|------|----------|
| Apple Silicon (M1/M2/M3/M4) | [Download DMG](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/Image.Optimizer.Pro-1.0.10-arm64.dmg) |
| Intel | [Download DMG](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/Image.Optimizer.Pro-1.0.10.dmg) |

### Windows

| Type | Download |
|------|----------|
| Installer (Recommended) | [Download EXE](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/Image.Optimizer.Pro.Setup.1.0.10.exe) |
| Portable (No install) | [Download EXE](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/Image.Optimizer.Pro.1.0.10.exe) |

### Linux

| Format | Download |
|--------|----------|
| AppImage (Universal) | [Download AppImage](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/Image.Optimizer.Pro-1.0.10.AppImage) |
| DEB (Debian/Ubuntu) | [Download DEB](https://github.com/pixelhunter1/imgprooptimze/releases/download/v1.0.10/imgprooptimze_1.0.10_amd64.deb) |

### System Requirements

- **macOS**: 10.13 High Sierra or later
- **Windows**: Windows 10 or later
- **Linux**: Ubuntu 18.04 or equivalent

---

## Features

### Image Optimization
- **Client-Side Processing** — All optimization happens locally on your device
- **Multiple Formats** — Convert between WebP, JPEG, and PNG
- **Quality Presets** — Small (40%), Balanced (70%), High (90%), Maximum (100%)
- **Smart Resizing** — Control max dimensions while preserving aspect ratio

### Crop Editor
- **Precise Cropping** — Visual guides and handles
- **Aspect Ratios** — 1:1, 16:9, 4:3, 3:2, and custom
- **Style Options** — Padding, rounded corners, shadows
- **Frame Effects** — Professional frames inspired by shots.so

### Batch Processing
- **Multi-File Upload** — Drag & drop multiple images
- **Batch Optimization** — Process all images with same settings
- **Batch Rename** — Apply naming patterns to multiple files
- **ZIP Download** — Package all optimized images in one file

### Before/After Comparison
- **Interactive Slider** — Drag to compare original vs optimized
- **Zoom & Pan** — Inspect details at any zoom level
- **Statistics** — See exact file size reduction

### Privacy & Security
- **100% Offline** — Works without internet connection
- **Zero Tracking** — No analytics or telemetry
- **Local Only** — Images never uploaded anywhere
- **Open Source** — Audit the code yourself

---

## How to Use

### Quick Start

```
1. UPLOAD      →  2. CONFIGURE   →  3. OPTIMIZE    →  4. DOWNLOAD
   Drop images      Set quality       Click button      Save files
```

### Step-by-Step

1. **Upload Images**
   - Drag & drop images onto the upload area
   - Or click to browse and select files
   - Supported: PNG, JPEG, WebP

2. **Configure Settings**
   - Choose output format (WebP recommended for web)
   - Set quality level (70% is balanced)
   - Set maximum dimensions if needed

3. **Optimize**
   - Click "Optimize Images" button
   - Watch progress bar for each image

4. **Review & Compare**
   - Click any image to see before/after comparison
   - Check file size reduction percentage

5. **Crop & Style** (Optional)
   - Click crop button to adjust
   - Apply aspect ratios, padding, corners

6. **Download**
   - Download individual images
   - Or download all as ZIP

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + O` | Open files |
| `Ctrl/Cmd + S` | Save current image |
| `Ctrl/Cmd + Shift + S` | Save all as ZIP |
| `Escape` | Close dialogs |

---

## Installation

### macOS

1. Download the DMG for your Mac (Intel or Apple Silicon)
2. Open the DMG file
3. Drag **Image Optimizer Pro** to **Applications**
4. Launch from Applications or Spotlight

> First launch: Right-click and select "Open" to bypass Gatekeeper

### Windows

**Installer:**
1. Download the Setup EXE
2. Run the installer
3. Follow the wizard
4. Launch from Start Menu

**Portable:**
1. Download the Portable EXE
2. Run directly — no installation needed

### Linux

**AppImage:**
```bash
chmod +x Image\ Optimizer\ Pro-1.0.10.AppImage
./Image\ Optimizer\ Pro-1.0.10.AppImage
```

**DEB (Debian/Ubuntu):**
```bash
sudo dpkg -i imgprooptimze_1.0.10_amd64.deb
```

---

## Development

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm, yarn, or pnpm

### Setup

```bash
# Clone repository
git clone https://github.com/pixelhunter1/imgprooptimze.git
cd imgprooptimze

# Install dependencies
npm install

# Start web development server
npm run dev

# Start Electron development
npm run electron:dev
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Web development server |
| `npm run build` | Build web for production |
| `npm run electron:dev` | Electron development |
| `npm run electron:dist:mac` | Build for macOS |
| `npm run electron:dist:win` | Build for Windows |
| `npm run electron:dist:linux` | Build for Linux |

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **Styling**: Tailwind CSS 4, Radix UI
- **Desktop**: Electron 39
- **Build**: electron-builder

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ for the community<br>
  <a href="https://github.com/pixelhunter1/imgprooptimze/releases">Releases</a> •
  <a href="https://github.com/pixelhunter1/imgprooptimze/issues">Report Bug</a> •
  <a href="https://github.com/pixelhunter1/imgprooptimze/issues">Request Feature</a>
</p>
