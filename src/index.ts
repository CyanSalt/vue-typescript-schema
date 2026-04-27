import type { JSONSchema7 } from 'json-schema'
import { createEvaluatedNode, defaultParser, parseport } from 'parseport'
import type { Project, SourceFile } from 'ts-morph'
import type { VueProjectOptions, VueSFCFileGenerationOptions } from './project'
import { addVueSFCFiles, createVueProject, getVueSFCScriptSourceFile } from './project'
import { createJSONSchemaFromTypeNode } from './typescript'

async function getExportedVueSFCComponents(entry: string, meta: ImportMeta) {
  const VUE_FILE = Symbol.for('VUE_FILE')
  const { value } = await parseport(entry, {
    meta,
    deep: true,
    parser: async (code, file, lang) => {
      if (lang === 'vue') {
        return createEvaluatedNode({
          default: { [VUE_FILE]: file },
        })
      }
      return defaultParser(code, file, lang)
    },
  })
  const components = Object.entries(value as Record<string, {
    [VUE_FILE]: string,
  }>)
    .filter(([key, item]) => typeof item === 'object' && VUE_FILE in item)
    .map(([key, item]) => ({ name: key, file: item[VUE_FILE] }))
  return components
}

function getVueSFCPropsJSONSchema(sourceFile: SourceFile) {
  const propsDeclaration = sourceFile.getTypeAlias('__VLS_Props')
  const propsType = propsDeclaration ? propsDeclaration.getTypeNode() : undefined
  return propsType ? createJSONSchemaFromTypeNode(propsType) : undefined
}

function getJSONSchemaFromVueSFC(project: Project, file: string, options?: VueSFCFileGenerationOptions) {
  const sourceFile = getVueSFCScriptSourceFile(project, file, options)
  return sourceFile ? getVueSFCPropsJSONSchema(sourceFile) : undefined
}

export interface GetJSONSchemaFromExportedVueSFCOptions extends VueProjectOptions, VueSFCFileGenerationOptions {}

export async function getJSONSchemaFromExportedVueSFC(
  entry: string,
  options: GetJSONSchemaFromExportedVueSFCOptions,
): Promise<JSONSchema7> {
  const { meta } = options
  const components = await getExportedVueSFCComponents(entry, meta)
  const { project, language } = await createVueProject(options)
  await addVueSFCFiles(project, language, components.map(({ file }) => file), options)
  return {
    $schema: 'https://json-schema.org/draft-07/schema#',
    definitions: Object.fromEntries(components.map(({ name, file }) => {
      const schema = getJSONSchemaFromVueSFC(project, file, options)
      return [name, schema]
    }).filter(([name, schema]) => schema !== undefined)),
  }
}
