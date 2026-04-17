import { Menu, app, shell } from 'electron'

type MenuLabels = {
  file: string
  edit: string
  view: string
  window: string
  about: string
}

const LABELS_PT: MenuLabels = {
  file: 'Ficheiro',
  edit: 'Editar',
  view: 'Ver',
  window: 'Janela',
  about: 'Sobre Image Optimizer Pro'
}

const LABELS_EN: MenuLabels = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  window: 'Window',
  about: 'About Image Optimizer Pro'
}

function resolveLabels(): MenuLabels {
  // app.getLocale returns BCP 47 tags like "pt-PT", "pt-BR", "en-US".
  const locale = app.getLocale().toLowerCase()
  if (locale.startsWith('pt')) return LABELS_PT
  return LABELS_EN
}

export function createMenu(): void {
  const isMac = process.platform === 'darwin'
  const L = resolveLabels()

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File Menu
    {
      label: L.file,
      submenu: [
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },

    // Edit Menu
    {
      label: L.edit,
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const }
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const }
            ])
      ]
    },

    // View Menu
    {
      label: L.view,
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },

    // Window Menu
    {
      label: L.window,
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },

    // Help Menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: L.about,
          click: async () => {
            await shell.openExternal('https://imgoptimizerpro.com')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
