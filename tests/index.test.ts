import { describe, expect, it } from 'vitest'
import { getJSONSchemaFromExportedVueSFC } from '../src'

describe('getJSONSchemaFromExportedVueSFC', () => {

  it('should generate schemas for all exported components', async () => {
    const schema = await getJSONSchemaFromExportedVueSFC('./fixtures/src/index.ts', {
      meta: import.meta,
      tsconfig: './fixtures/tsconfig.json',
    })
    await expect(schema).toMatchFileSnapshot('./snapshots/schemas.json.snap')
  })

})
