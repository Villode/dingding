import { contentJson } from 'chanfana'
import { z } from 'zod'
import { Context } from 'hono'

import { Endpoint } from '../endpoint'

export class GetFileChunkInfo extends Endpoint {
  schema = {
    request: {
      body: contentJson(
        z.object({
          sha: z.string(),
          uuid: z.string(),
          size: z.number().gte(0),
          chunks: z.array(
            z.object({
              chunkId: z.number(),
              size: z.number(),
            }),
          ),
        }),
      ),
    },
    responses: {
      '200': {
        description: 'Returns a single file if found',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
      '404': {
        description: 'File not found',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
    },
  }

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>()
    const payload = data.body
    const kv = this.getKV(c)
    const key = `${payload.uuid}_${payload.sha}`
    const record: ChunkInfo | null = await kv.get(key, 'json')
    if (!record) {
      await kv.put(key, JSON.stringify(payload), {
        expirationTtl: 60 * 5,
      })

      return this.success({
        ...payload,
        finished: [],
      })
    }

    const list = (
      await kv.list({
        prefix: `${key}.`,
      })
    ).keys

    console.log(list)

    const finished = list.map((d) => ({
      chunkId: Number.parseInt(d.name.split('.')[1]),
      objectId: d.name,
    }))

    return c.json({
      data: {
        ...record,
        finished,
      },
      result: true,
      message: 'ok',
    })
  }
}
