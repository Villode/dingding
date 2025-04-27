import { Context } from 'hono'
import { inArray } from 'drizzle-orm'
import z from 'zod'

import { Endpoint } from '../endpoint'
import { files } from '../../data/schemas'
import { contentJson } from 'chanfana'

export class DeleteShare extends Endpoint {
  schema = {
    request: {
      body: contentJson(z.array(z.string())),
    },
    responses: {
      '200': {
        description: 'Returns basic info',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
    },
  }

  async handle(c: Context) {
    const { body: ids } = await this.getValidatedData<typeof this.schema>()
    const db = this.getDB(c)

    const records = await db
      .delete(files)
      .where(inArray(files.id, ids))
      .returning({
        objectId: files.objectId,
      })

    if (!records.length) {
      return {
        result: true,
        data: null,
        message: null,
      }
    }

    const kv = this.getKV(c)

    await Promise.all(
      records.map(async (d) => {
        const {
          value: _,
          metadata,
        }: { value: unknown; metadata: Array<{ objectId: string }> | null } =
          await kv.getWithMetadata(d.objectId, 'stream')
        if (Array.isArray(metadata) && metadata.length) {
          await Promise.all(metadata.map((d) => kv.delete(d.objectId)))
        }
        return kv.delete(d.objectId)
      }),
    )

    return {
      data: null,
      result: true,
      message: null,
    }
  }
}
