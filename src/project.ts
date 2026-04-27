import type { Language } from '@vue/language-core'
import { createLanguage, createParsedCommandLine, createVueLanguagePlugin } from '@vue/language-core'
import { defaultLoader, defaultResolver } from 'parseport'
import { Project } from 'ts-morph'
import ts from 'typescript'
import { normalizePath } from './utils'

function createVueLanguage(tsConfigFilePath: string) {
  const parsedTSConfig = createParsedCommandLine(ts, ts.sys, normalizePath(tsConfigFilePath))
  const vue = createLanguage([
    createVueLanguagePlugin(
      ts,
      parsedTSConfig.options,
      parsedTSConfig.vueOptions,
      id => id as string,
    ),
  ], new Map(), () => {})
  return vue
}

export interface VueProjectOptions {
  meta: ImportMeta,
  tsconfig: string,
}

export async function createVueProject({ meta, tsconfig }: VueProjectOptions) {
  const tsConfigFilePath = await defaultResolver(tsconfig, meta)
  const project = new Project({
    tsConfigFilePath,
  })
  const language = createVueLanguage(tsConfigFilePath)
  return {
    project,
    language,
  }
}

async function transpileCode(source: string, language: Language, embeddedName: string) {
  const vueSourceCode = await defaultLoader(source)
  const snapshot = ts.ScriptSnapshot.fromString(vueSourceCode)
  language.scripts.set(source, snapshot)
  const sourceScript = language.scripts.get(source)
  const generatedCode = sourceScript?.generated?.embeddedCodes.get(embeddedName)
  if (!generatedCode) {
    throw new Error('Failed to transpile code')
  }
  const generatedSnapshot = generatedCode.snapshot
  return generatedSnapshot.getText(0, generatedSnapshot.getLength())
}

export interface VueSFCFileGenerationOptions {
  scriptEmbeddedName?: string,
  scriptFileName?: (file: string) => string,
}

export async function addVueSFCFiles(
  project: Project,
  language: Language<any>,
  files: string[],
  { scriptEmbeddedName, scriptFileName }: VueSFCFileGenerationOptions = {},
) {
  await Promise.all(files.map(async file => {
    const code = await transpileCode(file, language, scriptEmbeddedName ?? 'script_ts')
    const script = scriptFileName ? scriptFileName(file) : `${file}.ts`
    project.createSourceFile(script, code)
  }))
}

export function getVueSFCScriptSourceFile(
  project: Project,
  file: string,
  { scriptFileName }: VueSFCFileGenerationOptions = {},
) {
  const script = scriptFileName ? scriptFileName(file) : `${file}.ts`
  return project.getSourceFile(script)
}
