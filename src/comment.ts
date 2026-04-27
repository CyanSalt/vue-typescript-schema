import { runInNewContext } from 'node:vm'
import { parse as parseComment } from 'comment-parser'
import type { JSONSchema7 } from 'json-schema'

function parseJSValue(code: string) {
  if (!code) {
    return undefined
  }
  const context = Object.create(null)
  try {
    runInNewContext(`value = ${code}`, context)
    return context.value
  } catch {
    return undefined
  }
}

export function createJSONSchemaAttrsFromComment(comment: string): Pick<JSONSchema7, 'description' | 'default'> {
  const blocks = parseComment(comment)
  if (!blocks.length) {
    return {}
  }
  const descriptions = blocks.flatMap(block => [
    block.description,
    ...block.tags.filter(tag => tag.tag === 'remarks')
      // .map(tag => tag.description),
      // Missing line feeds in `description`
      .flatMap(tag => tag.source.filter(line => !line.tokens.tag).map(line => line.tokens.description)),
  ])
  const defaults = blocks.flatMap(block => block.tags).find(tag => tag.tag === 'default')
  return {
    ...(descriptions.length ? { description: descriptions.join('\n').trim() } : undefined),
    ...(defaults ? { default: parseJSValue(defaults.name) } : undefined),
  }
}
