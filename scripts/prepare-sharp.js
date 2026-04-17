import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const [, , platform, ...arches] = process.argv

if (!platform || arches.length === 0) {
  console.error('Usage: node scripts/prepare-sharp.js <platform> <arch> [arch...]')
  process.exit(1)
}

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function installRuntimePackage(runtimePackage, runtimeVersion, targetDir, platform, arch) {
  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(
      {
        name: 'sharp-runtime-staging',
        private: true
      },
      null,
      2
    )
  )

  execFileSync(
    npmCommand,
    [
      'install',
      '--no-package-lock',
      '--ignore-scripts',
      '--force',
      `--os=${platform}`,
      `--cpu=${arch}`,
      `${runtimePackage}@${runtimeVersion}`
    ],
    {
      cwd: targetDir,
      stdio: 'inherit'
    }
  )
}

for (const arch of arches) {
  const runtimePackage = `@img/sharp-${platform}-${arch}`
  const runtimeVersion = packageJson.optionalDependencies?.[runtimePackage]

  if (!runtimeVersion) {
    console.error(`Missing ${runtimePackage} in optionalDependencies`)
    process.exit(1)
  }

  const installedPath = join(rootDir, 'node_modules', '@img', `sharp-${platform}-${arch}`)
  if (existsSync(installedPath)) {
    console.log(`${runtimePackage} already present`)
    continue
  }

  const stagingDir = mkdtempSync(join(tmpdir(), 'sharp-runtime-'))
  try {
    console.log(`Installing ${runtimePackage}@${runtimeVersion} in temporary staging`)
    installRuntimePackage(runtimePackage, runtimeVersion, stagingDir, platform, arch)

    const stagedPath = join(stagingDir, 'node_modules', '@img', `sharp-${platform}-${arch}`)
    if (!existsSync(stagedPath)) {
      console.error(`Failed to stage ${runtimePackage}`)
      process.exit(1)
    }

    mkdirSync(join(rootDir, 'node_modules', '@img'), { recursive: true })
    cpSync(stagedPath, installedPath, { recursive: true })
  } finally {
    rmSync(stagingDir, { recursive: true, force: true })
  }

  if (!existsSync(installedPath)) {
    console.error(`Failed to install ${runtimePackage}`)
    process.exit(1)
  }
}
