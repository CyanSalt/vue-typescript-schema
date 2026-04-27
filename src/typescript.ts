import type { JSONSchema7Definition, JSONSchema7Type } from 'json-schema'
import type { GetAccessorDeclaration, IndexSignatureDeclaration, PropertySignature, SourceFile } from 'ts-morph'
import { Node } from 'ts-morph'
import { createJSONSchemaAttrsFromComment } from './comment'
import { normalizePath } from './utils'

function isTypeScriptBuiltinSourceFile(sourceFile: SourceFile) {
  return normalizePath(sourceFile.getFilePath()).includes('/typescript/lib')
}

/**
 * TODO: IndexSignatureDeclaration does not support `.getTypeNode()`
 */
function getIndexSignatureTypeNode(indexSignature: IndexSignatureDeclaration) {
  return indexSignature['_getNodeFromCompilerNode'](indexSignature.compilerNode.type)
}

export function createJSONSchemaFromTypeNode(typeNode: Node): JSONSchema7Definition {
  const type = typeNode.getType()
  if (type.isAny()) {
    return {}
  }
  if (type.isUnknown()) {
    return true
  }
  if (type.isNever()) {
    return false
  }
  if (type.isNull() || type.isUndefined()) {
    return { type: 'null' }
  }
  if (type.isBooleanLiteral() || type.isStringLiteral() || type.isNumberLiteral()) {
    return { const: type.getLiteralValue() as boolean | string | number }
  }
  if (Node.isBooleanKeyword(typeNode)) {
    return { type: 'boolean' }
  }
  if (Node.isStringKeyword(typeNode)) {
    return { type: 'string' }
  }
  if (Node.isNumberKeyword(typeNode)) {
    return { type: 'number' }
  }
  if (Node.isArrayTypeNode(typeNode)) {
    return {
      type: 'array',
      items: createJSONSchemaFromTypeNode(typeNode.getElementTypeNode()),
    }
  }
  if (Node.isTypeElementMembered(typeNode)) {
    const members = typeNode.getMembers()
    // Treat `{}` (non-nullable value) as any
    if (!members.length) {
      return {}
    }
    const indexSignature = members.find(
      member => Node.isIndexSignatureDeclaration(member),
    )
    const fields = members.filter(
      (member): member is Extract<
        typeof member,
        PropertySignature | GetAccessorDeclaration
      > => {
        return Node.isPropertySignature(member)
          || Node.isGetAccessorDeclaration(member)
      },
    )
    return {
      type: 'object',
      properties: Object.fromEntries(fields.map(member => {
        const fieldTypeNode = Node.isGetAccessorDeclaration(member)
          ? member.getReturnTypeNode()
          : member.getTypeNode()
        const schema = fieldTypeNode ? createJSONSchemaFromTypeNode(fieldTypeNode) : {}
        const leadingCommentRanges = member.getLeadingCommentRanges()
        const comments = leadingCommentRanges.map(range => range.getText())
        return [
          member.getName(),
          typeof schema === 'object'
            ? { ...schema, ...createJSONSchemaAttrsFromComment(comments.join('\n')) }
            : schema,
        ]
      })),
      required: fields.filter(member => !(Node.isQuestionTokenable(member) && member.hasQuestionToken()))
        .map(member => member.getName()),
      additionalProperties: indexSignature ? createJSONSchemaFromTypeNode(
        getIndexSignatureTypeNode(indexSignature),
      ) : false,
    }
  }
  if (Node.isParenthesizedTypeNode(typeNode)) {
    return createJSONSchemaFromTypeNode(typeNode.getTypeNode())
  }
  if (Node.isIntersectionTypeNode(typeNode)) {
    const choices = typeNode.getTypeNodes().map(node => createJSONSchemaFromTypeNode(node))
      .filter(choice => choice !== true && (typeof choice !== 'object' || Object.keys(choice).length))
    if (choices.includes(false)) {
      return false
    }
    if (choices.length === 1) {
      return choices[0]
    }
    return {
      allOf: choices,
    }
  }
  if (Node.isUnionTypeNode(typeNode)) {
    const choices = typeNode.getTypeNodes().map(node => createJSONSchemaFromTypeNode(node))
      .filter(choice => choice !== false)
    if (choices.every(choice => typeof choice === 'object' && 'const' in choice)) {
      return {
        enum: (choices as { const: JSONSchema7Type }[]).map(choice => choice.const),
      }
    }
    if (choices.includes(true)) {
      return true
    }
    if (choices.some(choice => typeof choice === 'object' && !Object.keys(choice).length)) {
      return {}
    }
    if (choices.length === 1) {
      return choices[0]
    }
    return {
      anyOf: choices,
    }
  }
  if (Node.isEnumDeclaration(typeNode)) {
    const members = typeNode.getMembers()
    const choices = members.map(member => {
      const leadingCommentRanges = member.getLeadingCommentRanges()
      const comments = leadingCommentRanges.map(range => range.getText())
      return {
        const: member.getValue()!,
        ...(comments.length ? createJSONSchemaAttrsFromComment(comments.join('\n')) : undefined),
      }
    })
    if (choices.length === 1) {
      return choices[0]
    }
    if (choices.some(choice => 'description' in choice)) {
      return {
        oneOf: choices,
      }
    }
    return {
      enum: choices.map(choice => choice.const),
    }
  }
  if (Node.isTypeAliasDeclaration(typeNode)) {
    const typeNodeOfAlias = typeNode.getTypeNode()
    if (typeNodeOfAlias) {
      return createJSONSchemaFromTypeNode(typeNodeOfAlias)
    }
  }
  if (Node.isTypeReference(typeNode)) {
    const symbol = type.getSymbol() ?? type.getAliasSymbol()
    const declaration = symbol?.getDeclarations()[0]
    if (declaration) {
      const typeName = typeNode.getTypeName()
      if (isTypeScriptBuiltinSourceFile(declaration.getSourceFile())) {
        const typeArguments = typeNode.getTypeArguments()
        if (typeName.getText() === 'Record') {
          if (typeArguments.length < 2) {
            return {
              type: 'object',
            }
          }
          // const keyType = typeArguments[0];
          const valueType = typeArguments[1]
          // if (Node.isStringKeyword(keyType)) {}
          return {
            type: 'object',
            additionalProperties: createJSONSchemaFromTypeNode(valueType),
          }
        }
      }
      const schema = createJSONSchemaFromTypeNode(declaration)
      return typeof schema === 'object' ? { ...schema, description: typeName.getText() } : schema
    }
  }
  return {}
}
