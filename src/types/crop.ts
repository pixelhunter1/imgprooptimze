/**
 * Crop Types and Interfaces
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  category: 'social' | 'video' | 'print' | 'web' | 'ecommerce';
  description: string;
}

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
