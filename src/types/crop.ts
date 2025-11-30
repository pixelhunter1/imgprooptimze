/**
 * Crop Types and Interfaces
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectRatioPreset {
  id: string;
  label: string;
  ratio: number | null; // null = free crop
  description: string;
}

export interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'social' | 'video' | 'print' | 'web' | 'ecommerce';
  description: string;
}

// Aspect ratio presets (proportional)
export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: 'free', label: 'Free', ratio: null, description: 'Free selection' },
  { id: '1:1', label: '1:1', ratio: 1, description: 'Square' },
  { id: '4:3', label: '4:3', ratio: 4 / 3, description: 'Standard photo' },
  { id: '3:4', label: '3:4', ratio: 3 / 4, description: 'Portrait' },
  { id: '16:9', label: '16:9', ratio: 16 / 9, description: 'Widescreen' },
  { id: '9:16', label: '9:16', ratio: 9 / 16, description: 'Stories' },
  { id: '4:5', label: '4:5', ratio: 4 / 5, description: 'Instagram portrait' },
  { id: '2:3', label: '2:3', ratio: 2 / 3, description: 'Print photo' },
  { id: '3:2', label: '3:2', ratio: 3 / 2, description: 'DSLR photo' },
  { id: '21:9', label: '21:9', ratio: 21 / 9, description: 'Ultrawide' },
];

// Size presets with exact dimensions (in pixels)
export const SIZE_PRESETS: SizePreset[] = [
  // Social Media
  { id: 'ig-post', label: 'Instagram Post', width: 1080, height: 1080, category: 'social', description: 'Square post' },
  { id: 'ig-portrait', label: 'Instagram Portrait', width: 1080, height: 1350, category: 'social', description: '4:5 post' },
  { id: 'ig-story', label: 'Instagram Story', width: 1080, height: 1920, category: 'social', description: '9:16 story' },
  { id: 'fb-post', label: 'Facebook Post', width: 1200, height: 630, category: 'social', description: 'Link preview' },
  { id: 'fb-cover', label: 'Facebook Cover', width: 820, height: 312, category: 'social', description: 'Profile cover' },
  { id: 'twitter-post', label: 'Twitter/X Post', width: 1200, height: 675, category: 'social', description: '16:9 post' },
  { id: 'twitter-header', label: 'Twitter/X Header', width: 1500, height: 500, category: 'social', description: 'Profile header' },
  { id: 'linkedin-post', label: 'LinkedIn Post', width: 1200, height: 627, category: 'social', description: 'Feed post' },
  { id: 'pinterest', label: 'Pinterest Pin', width: 1000, height: 1500, category: 'social', description: '2:3 pin' },
  { id: 'tiktok', label: 'TikTok', width: 1080, height: 1920, category: 'social', description: '9:16 video' },

  // Video
  { id: 'yt-thumbnail', label: 'YouTube Thumbnail', width: 1280, height: 720, category: 'video', description: 'HD thumbnail' },
  { id: 'yt-banner', label: 'YouTube Banner', width: 2560, height: 1440, category: 'video', description: 'Channel art' },
  { id: 'hd-720', label: 'HD 720p', width: 1280, height: 720, category: 'video', description: '720p video' },
  { id: 'hd-1080', label: 'Full HD 1080p', width: 1920, height: 1080, category: 'video', description: '1080p video' },
  { id: '4k', label: '4K UHD', width: 3840, height: 2160, category: 'video', description: '4K video' },

  // Web
  { id: 'web-og', label: 'Open Graph', width: 1200, height: 630, category: 'web', description: 'Social share' },
  { id: 'favicon-lg', label: 'Favicon Large', width: 512, height: 512, category: 'web', description: 'PWA icon' },
  { id: 'avatar', label: 'Avatar', width: 400, height: 400, category: 'web', description: 'Profile picture' },

  // E-commerce (WooCommerce)
  { id: 'woo-single', label: 'WooCommerce Single', width: 600, height: 600, category: 'ecommerce', description: 'Product page' },
  { id: 'woo-catalog', label: 'WooCommerce Catalog', width: 300, height: 300, category: 'ecommerce', description: 'Shop/category' },
  { id: 'woo-thumbnail', label: 'WooCommerce Thumb', width: 100, height: 100, category: 'ecommerce', description: 'Gallery thumb' },
  { id: 'woo-large', label: 'WooCommerce Large', width: 1200, height: 1200, category: 'ecommerce', description: 'Zoom/lightbox' },
  { id: 'shopify-product', label: 'Shopify Product', width: 2048, height: 2048, category: 'ecommerce', description: 'Product image' },
  { id: 'shopify-collection', label: 'Shopify Collection', width: 1024, height: 1024, category: 'ecommerce', description: 'Collection' },
  { id: 'amazon-main', label: 'Amazon Main', width: 1500, height: 1500, category: 'ecommerce', description: 'Main product' },
  { id: 'amazon-zoom', label: 'Amazon Zoom', width: 2000, height: 2000, category: 'ecommerce', description: 'Zoom ready' },
  { id: 'ebay-product', label: 'eBay Product', width: 1600, height: 1600, category: 'ecommerce', description: 'Listing image' },
];

// Group size presets by category
export const SIZE_PRESETS_BY_CATEGORY = {
  social: SIZE_PRESETS.filter(p => p.category === 'social'),
  video: SIZE_PRESETS.filter(p => p.category === 'video'),
  web: SIZE_PRESETS.filter(p => p.category === 'web'),
  ecommerce: SIZE_PRESETS.filter(p => p.category === 'ecommerce'),
};

export interface CropSettings {
  aspectRatio: AspectRatioPreset;
  cropArea: CropArea | null;
  outputSize?: { width: number; height: number } | null; // Target output size
}

export interface ImageWithCrop {
  id: string;
  file: File;
  preview: string;
  cropSettings?: CropSettings;
}

/**
 * Calculate if a size preset can be used with an image
 * Returns true if image is large enough for the preset
 */
export function canUseSizePreset(imageWidth: number, imageHeight: number, preset: SizePreset): boolean {
  return imageWidth >= preset.width && imageHeight >= preset.height;
}

/**
 * Get available size presets for an image based on its dimensions
 */
export function getAvailableSizePresets(imageWidth: number, imageHeight: number): SizePreset[] {
  return SIZE_PRESETS.filter(preset => canUseSizePreset(imageWidth, imageHeight, preset));
}

/**
 * Calculate the crop area for a size preset centered in the image
 */
export function calculateCropAreaForSize(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number
): CropArea | null {
  // If image is smaller than target, can't crop
  if (imageWidth < targetWidth || imageHeight < targetHeight) {
    return null;
  }

  // Center the crop area
  const x = Math.floor((imageWidth - targetWidth) / 2);
  const y = Math.floor((imageHeight - targetHeight) / 2);

  return {
    x,
    y,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Scale crop area to fit within image bounds while maintaining aspect ratio
 */
export function scaleCropAreaToFit(
  cropArea: CropArea,
  imageWidth: number,
  imageHeight: number,
  targetRatio: number
): CropArea {
  let { width, height } = cropArea;

  // Ensure dimensions don't exceed image
  if (width > imageWidth) {
    width = imageWidth;
    height = width / targetRatio;
  }
  if (height > imageHeight) {
    height = imageHeight;
    width = height * targetRatio;
  }

  // Center in image
  const x = Math.max(0, Math.floor((imageWidth - width) / 2));
  const y = Math.max(0, Math.floor((imageHeight - height) / 2));

  return { x, y, width: Math.floor(width), height: Math.floor(height) };
}
