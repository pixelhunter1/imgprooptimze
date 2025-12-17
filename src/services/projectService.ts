import { type OptimizationOptions, type ProcessedImage } from '@/lib/imageProcessor';

export interface ProjectData {
  version: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  settings: OptimizationOptions;
  // We store metadata about images, not the actual files
  images: {
    originalName: string;
    customFilename?: string;
    format: string;
    quality: number;
    compressionRatio: number;
    originalSize: number;
    optimizedSize: number;
  }[];
}

const PROJECT_VERSION = '1.0.0';
const RECENT_PROJECTS_KEY = 'imgpro_recent_projects';
const CURRENT_PROJECT_KEY = 'imgpro_current_project';
const MAX_RECENT_PROJECTS = 10;

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         window.navigator?.userAgent?.toLowerCase().includes('electron');
}

// Create project data from current state
export function createProjectData(
  name: string,
  settings: OptimizationOptions,
  processedImages: ProcessedImage[]
): ProjectData {
  return {
    version: PROJECT_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name,
    settings,
    images: processedImages.map(img => ({
      originalName: img.originalFile.name,
      customFilename: img.customFilename,
      format: img.format,
      quality: img.quality,
      compressionRatio: img.compressionRatio,
      originalSize: img.originalSize,
      optimizedSize: img.optimizedSize,
    })),
  };
}

// Save project to localStorage (web)
export function saveProjectToStorage(project: ProjectData): void {
  try {
    const projectKey = `imgpro_project_${Date.now()}`;
    localStorage.setItem(projectKey, JSON.stringify(project));
    
    // Update recent projects list
    const recentProjects = getRecentProjects();
    recentProjects.unshift({
      key: projectKey,
      name: project.name,
      updatedAt: project.updatedAt,
      imageCount: project.images.length,
    });
    
    // Keep only MAX_RECENT_PROJECTS
    if (recentProjects.length > MAX_RECENT_PROJECTS) {
      const removed = recentProjects.splice(MAX_RECENT_PROJECTS);
      // Clean up old projects
      removed.forEach(p => {
        try { localStorage.removeItem(p.key); } catch (e) { /* ignore */ }
      });
    }
    
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recentProjects));
    localStorage.setItem(CURRENT_PROJECT_KEY, projectKey);
  } catch (e) {
    console.error('Failed to save project:', e);
    throw new Error('Failed to save project to storage');
  }
}

// Load project from localStorage (web)
export function loadProjectFromStorage(projectKey: string): ProjectData | null {
  try {
    const data = localStorage.getItem(projectKey);
    if (data) {
      const project = JSON.parse(data) as ProjectData;
      localStorage.setItem(CURRENT_PROJECT_KEY, projectKey);
      return project;
    }
  } catch (e) {
    console.error('Failed to load project:', e);
  }
  return null;
}

// Get list of recent projects
export interface RecentProject {
  key: string;
  name: string;
  updatedAt: string;
  imageCount: number;
}

export function getRecentProjects(): RecentProject[] {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to get recent projects:', e);
  }
  return [];
}

// Delete a project
export function deleteProject(projectKey: string): void {
  try {
    localStorage.removeItem(projectKey);
    const recentProjects = getRecentProjects();
    const filtered = recentProjects.filter(p => p.key !== projectKey);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete project:', e);
  }
}

// Export project as JSON file (for download)
export function exportProjectAsFile(project: ProjectData): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_project.imgpro.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import project from file
export function importProjectFromFile(): Promise<ProjectData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.imgpro.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      try {
        const text = await file.text();
        const project = JSON.parse(text) as ProjectData;
        
        // Validate project structure
        if (project.version && project.settings && project.images) {
          resolve(project);
        } else {
          console.error('Invalid project file format');
          resolve(null);
        }
      } catch (e) {
        console.error('Failed to parse project file:', e);
        resolve(null);
      }
    };
    
    input.click();
  });
}

// Auto-save current project settings
export function autoSaveSettings(settings: OptimizationOptions): void {
  try {
    localStorage.setItem('imgpro_auto_settings', JSON.stringify(settings));
  } catch (e) { /* ignore */ }
}

// Load auto-saved settings
export function loadAutoSavedSettings(): OptimizationOptions | null {
  try {
    const data = localStorage.getItem('imgpro_auto_settings');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) { /* ignore */ }
  return null;
}
