# 🔄 Automatic Update System

## Overview

The Image Optimizer Pro now includes a comprehensive automatic update system that ensures users always receive the latest version without manual browser cache clearing. The system handles version detection, cache invalidation, service worker updates, and user notifications seamlessly.

## ✨ Features

### 🎯 **Automatic Update Detection**
- **Periodic Checks**: Automatically checks for updates every 30 minutes
- **Visibility-Based Checks**: Checks when the page becomes visible
- **Focus-Based Checks**: Checks when the window gains focus
- **Service Worker Integration**: Detects service worker updates
- **Network-Aware**: Checks when coming back online

### 🚀 **Cache Busting Strategies**
- **Content-Based Hashing**: Files are hashed based on content for cache invalidation
- **Version-Based Cache Names**: Service worker caches include version information
- **Proper Cache Headers**: Optimized cache control headers for different file types
- **Immutable Assets**: Long-term caching for versioned assets

### 🔔 **User Experience**
- **Non-Intrusive Notifications**: Update prompts appear in the top-right corner
- **Forced Updates**: Critical updates (major versions) require immediate action
- **Dismissible Updates**: Minor updates can be dismissed temporarily
- **Progress Indicators**: Visual feedback during update process
- **Seamless Updates**: Automatic page reload after successful update

### 🛡️ **Reliability**
- **Fallback Mechanisms**: Multiple strategies for update detection
- **Error Handling**: Graceful degradation when update checks fail
- **Offline Support**: Works with cached versions when offline
- **Cross-Browser Compatibility**: Works across all modern browsers

## 🏗️ Architecture

### Core Components

#### 1. **Version Management (`src/lib/version.ts`)**
```typescript
// Key functions
getCurrentVersion()     // Get current app version info
checkForUpdates()      // Check server for new versions
applyUpdate()          // Apply update and reload
hasAppUpdated()        // Detect if app was updated
```

#### 2. **Enhanced Service Worker (`public/sw.js`)**
- Version-based cache naming
- Automatic cache cleanup
- Update detection and notification
- Network-first strategy for HTML files

#### 3. **Update Notification (`src/components/updates/UpdateNotification.tsx`)**
- Visual update prompts
- Update progress tracking
- Dismissal handling
- Forced update support

#### 4. **Auto-Update Hook (`src/hooks/useAutoUpdate.ts`)**
- Automatic update checking
- Event-based triggers
- State management
- Configuration options

### Build System Integration

#### **Version Injection**
- Build timestamp and git hash injection
- Automatic version.json generation
- Service worker version updates
- Asset fingerprinting

#### **Cache Headers**
- HTML: No cache (always fresh)
- Assets: Long-term cache with immutable flag
- Service Worker: No cache (immediate updates)
- Version file: No cache (fresh version checks)

## 🚀 Usage

### Basic Integration

The update system is automatically integrated into the main App component:

```tsx
import UpdateNotification from '@/components/updates/UpdateNotification';
import VersionDisplay from '@/components/updates/VersionDisplay';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Update notification */}
      <UpdateNotification />
      
      {/* Version display */}
      <VersionDisplay showUpdateButton />
    </div>
  );
}
```

### Manual Update Checking

```tsx
import { useUpdateChecker } from '@/components/updates/UpdateNotification';

function MyComponent() {
  const { isChecking, updateInfo, checkForUpdates, applyUpdate } = useUpdateChecker();
  
  const handleCheckUpdate = async () => {
    const result = await checkForUpdates();
    if (result?.updateAvailable) {
      await applyUpdate();
    }
  };
  
  return (
    <button onClick={handleCheckUpdate} disabled={isChecking}>
      {isChecking ? 'Checking...' : 'Check for Updates'}
    </button>
  );
}
```

### Custom Auto-Update Configuration

```tsx
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

function MyComponent() {
  const { updateInfo, hasUpdate, checkNow } = useAutoUpdate({
    checkInterval: 15 * 60 * 1000, // 15 minutes
    enableAutoCheck: true,
    enableVisibilityCheck: true,
    enableFocusCheck: false
  });
  
  // Component logic
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Automatically injected at build time
VITE_APP_VERSION=1.0.0
VITE_BUILD_TIMESTAMP=1234567890
VITE_BUILD_HASH=abc123def456
```

### Update Check Intervals

```typescript
// Default: 30 minutes
const checkInterval = 30 * 60 * 1000;

// Custom intervals
<UpdateNotification checkInterval={15 * 60 * 1000} /> // 15 minutes
```

### Cache Headers Configuration

Edit `public/_headers` (Netlify) or `public/.htaccess` (Apache) for custom cache control.

## 🚀 Deployment

### Build Process

```bash
# Development
npm run dev

# Production build
npm run build  # Automatically runs version injection

# Preview build
npm run preview
```

### Version File Generation

The build process automatically:
1. Generates `public/version.json` with current version info
2. Updates service worker with version constants
3. Applies content hashing to assets
4. Copies version file to dist directory

### Server Configuration

#### **Netlify**
- `public/_headers` file is automatically used
- No additional configuration needed

#### **Apache**
- `public/.htaccess` file provides cache control
- Ensure mod_headers and mod_rewrite are enabled

#### **Nginx**
```nginx
# Add to your nginx.conf
location ~* \.(html)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /version.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## 🔍 Monitoring

### Browser DevTools

1. **Application Tab**: Check service worker status and cache storage
2. **Network Tab**: Verify cache headers and update requests
3. **Console**: Monitor update check logs and version information

### Version Information

```javascript
// Check current version in console
console.log(window.APP_VERSION);

// Manual update check
import { checkForUpdates } from '@/lib/version';
checkForUpdates().then(console.log);
```

## 🐛 Troubleshooting

### Common Issues

#### **Updates Not Detected**
- Check network connectivity
- Verify version.json is accessible
- Ensure service worker is registered
- Check browser cache settings

#### **Service Worker Not Updating**
- Force refresh (Ctrl+F5 / Cmd+Shift+R)
- Clear application data in DevTools
- Check service worker registration

#### **Cache Not Clearing**
- Verify cache headers are correct
- Check service worker cache cleanup
- Ensure version hashing is working

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('debug_updates', 'true');

// Check version info
import { getCurrentVersion } from '@/lib/version';
console.log(getCurrentVersion());
```

## 🎯 Best Practices

1. **Version Bumping**: Update package.json version for releases
2. **Testing**: Test update flow in production-like environment
3. **Monitoring**: Monitor update success rates and user feedback
4. **Gradual Rollouts**: Consider feature flags for major updates
5. **Backup Strategy**: Maintain rollback capability for critical issues

---

**🚀 The update system ensures your users always have the latest and greatest version of Image Optimizer Pro!**
