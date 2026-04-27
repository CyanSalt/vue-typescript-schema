# vue-typescript-schema

[![npm](https://img.shields.io/npm/v/vue-typescript-schema.svg)](https://www.npmjs.com/package/vue-typescript-schema)

Generate JSON schema from Vue SFC with type annotations.

This is useful for AI to generate or validate component props via tool calls. It uses [`@vue/language-core`](https://github.com/vuejs/language-tools) under the hood.

## Usage

```ts
import { getJSONSchemaFromExportedVueSFC } from 'vue-typescript-schema'

const schemas = await getJSONSchemaFromExportedVueSFC('./src/index.ts', {
  meta: import.meta,
  tsconfig: './tsconfig.json',
}) // { $schema: "https://json-schema.org/draft/07/schema#", definitions: { ... } }
```
