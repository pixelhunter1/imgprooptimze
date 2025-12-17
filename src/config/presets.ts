import { type OptimizationOptions } from '@/lib/imageProcessor';

export interface OptimizationPreset {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isBuiltIn: boolean;
  options: Partial<OptimizationOptions>;
}

// Built-in presets for common use cases
export const BUILT_IN_PRESETS: OptimizationPreset[] = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Optimized for product photos on webshops',
    icon: '🛒',
    isBuiltIn: true,
    options: {
      format: 'webp',
      quality: 0.85,
      maxWidthOrHeight: 1200,
      maxSizeKB: 300,
    },
  },
  {
    id: 'blog',
    name: 'Blog',
    description: 'Perfect for blog posts and articles',
    icon: '📝',
    isBuiltIn: true,
    options: {
      format: 'webp',
      quality: 0.8,
      maxWidthOrHeight: 1600,
      maxSizeKB: 500,
    },
  },
  {
    id: 'hero',
    name: 'Hero Image',
    description: 'High quality for hero sections and banners',
    icon: '🖼️',
    isBuiltIn: true,
    options: {
      format: 'webp',
      quality: 0.9,
      maxWidthOrHeight: 2400,
      maxSizeKB: 1000,
    },
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Optimized for Instagram posts (1080px)',
    icon: '📸',
    isBuiltIn: true,
    options: {
      format: 'jpeg',
      quality: 0.9,
      maxWidthOrHeight: 1080,
      preserveExif: false,
    },
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: 'Small images for grids and galleries',
    icon: '🔲',
    isBuiltIn: true,
    options: {
      format: 'webp',
      quality: 0.75,
      maxWidthOrHeight: 400,
      maxSizeKB: 50,
    },
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Optimized for email newsletters',
    icon: '✉️',
    isBuiltIn: true,
    options: {
      format: 'jpeg',
      quality: 0.8,
      maxWidthOrHeight: 600,
      maxSizeKB: 100,
    },
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Maximum quality, larger files',
    icon: '✨',
    isBuiltIn: true,
    options: {
      format: 'avif',
      quality: 0.95,
      maxWidthOrHeight: 4096,
    },
  },
  {
    id: 'web-optimized',
    name: 'Web Optimized',
    description: 'Balanced quality and file size for web',
    icon: '🌐',
    isBuiltIn: true,
    options: {
      format: 'webp',
      quality: 0.8,
      maxWidthOrHeight: 1920,
      maxSizeKB: 500,
    },
  },
];

// LocalStorage key for user presets
const USER_PRESETS_KEY = 'imgpro_user_presets';

// Get user-defined presets from localStorage
export function getUserPresets(): OptimizationPreset[] {
  try {
    const stored = localStorage.getItem(USER_PRESETS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load user presets:', e);
  }
  return [];
}

// Save user-defined presets to localStorage
export function saveUserPresets(presets: OptimizationPreset[]): void {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to save user presets:', e);
  }
}

// Add a new user preset
export function addUserPreset(preset: Omit<OptimizationPreset, 'id' | 'isBuiltIn'>): OptimizationPreset {
  const newPreset: OptimizationPreset = {
    ...preset,
    id: `user_${Date.now()}`,
    isBuiltIn: false,
  };
  
  const userPresets = getUserPresets();
  userPresets.push(newPreset);
  saveUserPresets(userPresets);
  
  return newPreset;
}

// Update an existing user preset
export function updateUserPreset(id: string, updates: Partial<OptimizationPreset>): void {
  const userPresets = getUserPresets();
  const index = userPresets.findIndex(p => p.id === id);
  if (index !== -1) {
    userPresets[index] = { ...userPresets[index], ...updates };
    saveUserPresets(userPresets);
  }
}

// Delete a user preset
export function deleteUserPreset(id: string): void {
  const userPresets = getUserPresets();
  const filtered = userPresets.filter(p => p.id !== id);
  saveUserPresets(filtered);
}

// Get all presets (built-in + user)
export function getAllPresets(): OptimizationPreset[] {
  return [...BUILT_IN_PRESETS, ...getUserPresets()];
}

// Get a preset by ID
export function getPresetById(id: string): OptimizationPreset | undefined {
  return getAllPresets().find(p => p.id === id);
}
