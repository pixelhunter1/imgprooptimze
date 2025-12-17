import { useState, useEffect } from 'react';
import { FolderOpen, Save, Download, Upload, Trash2, Clock, Image } from 'lucide-react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  createProjectData,
  saveProjectToStorage,
  loadProjectFromStorage,
  getRecentProjects,
  deleteProject,
  exportProjectAsFile,
  importProjectFromFile,
  type RecentProject,
  type ProjectData,
} from '@/services/projectService';
import { type OptimizationOptions, type ProcessedImage } from '@/lib/imageProcessor';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: OptimizationOptions;
  processedImages: ProcessedImage[];
  onLoadProject: (project: ProjectData) => void;
}

export default function ProjectDialog({
  isOpen,
  onClose,
  currentSettings,
  processedImages,
  onLoadProject,
}: ProjectDialogProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectName, setProjectName] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load recent projects on open
  useEffect(() => {
    if (isOpen) {
      setRecentProjects(getRecentProjects());
      setProjectName(`Project ${new Date().toLocaleDateString()}`);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  // Handle save project
  const handleSave = () => {
    if (!projectName.trim()) return;
    
    const project = createProjectData(projectName.trim(), currentSettings, processedImages);
    saveProjectToStorage(project);
    setRecentProjects(getRecentProjects());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Handle export as file
  const handleExport = () => {
    if (!projectName.trim()) return;
    
    const project = createProjectData(projectName.trim(), currentSettings, processedImages);
    exportProjectAsFile(project);
  };

  // Handle load from storage
  const handleLoadRecent = (projectKey: string) => {
    const project = loadProjectFromStorage(projectKey);
    if (project) {
      onLoadProject(project);
      onClose();
    }
  };

  // Handle import from file
  const handleImport = async () => {
    const project = await importProjectFromFile();
    if (project) {
      onLoadProject(project);
      onClose();
    }
  };

  // Handle delete project
  const handleDelete = (projectKey: string) => {
    deleteProject(projectKey);
    setRecentProjects(getRecentProjects());
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-medium text-white">Project Manager</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-neutral-800 pb-2">
          <button
            onClick={() => setActiveTab('save')}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              activeTab === 'save'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Save className="h-4 w-4 inline-block mr-1.5" />
            Save
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`px-3 py-1.5 text-sm rounded-t transition-colors ${
              activeTab === 'load'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4 inline-block mr-1.5" />
            Load
          </button>
        </div>

        {/* Save Tab */}
        {activeTab === 'save' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Project"
                className="w-full px-3 py-2 text-sm rounded bg-neutral-800 text-white border-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div className="p-3 bg-neutral-800 rounded">
              <p className="text-xs text-neutral-400 mb-2">Project will include:</p>
              <ul className="text-xs text-neutral-300 space-y-1">
                <li>✓ Current optimization settings</li>
                <li>✓ {processedImages.length} processed image(s) metadata</li>
                <li>✓ Custom filenames</li>
              </ul>
              <p className="text-[10px] text-neutral-500 mt-2">
                Note: Actual image files are not saved, only metadata.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-2 bg-emerald-900/30 border border-emerald-800 rounded text-xs text-emerald-400">
                ✓ Project saved successfully!
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!projectName.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save to Browser
              </Button>
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={!projectName.trim()}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Export File
              </Button>
            </div>
          </div>
        )}

        {/* Load Tab */}
        {activeTab === 'load' && (
          <div className="space-y-4">
            {/* Import from file */}
            <Button
              variant="secondary"
              onClick={handleImport}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Import from File
            </Button>

            {/* Recent Projects */}
            <div className="space-y-2">
              <label className="text-xs text-neutral-400">Recent Projects</label>
              
              {recentProjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-800 rounded">
                  No recent projects found
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentProjects.map((project) => (
                    <div
                      key={project.key}
                      className="flex items-center gap-3 p-2 bg-neutral-800 rounded hover:bg-neutral-700 transition-colors group"
                    >
                      <button
                        onClick={() => handleLoadRecent(project.key)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <FolderOpen className="h-4 w-4 text-neutral-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{project.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(project.updatedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {project.imageCount} images
                            </span>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(project.key)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2 border-t border-neutral-800">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
