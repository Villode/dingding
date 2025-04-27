import { drizzle } from 'drizzle-orm/d1'
import { files } from '../data/schemas'
import { lte } from 'drizzle-orm'

export async function scheduled(_event: ScheduledEvent, env: Env) {
  const db = drizzle(env.DB)
  const kv = env.file_drops

  const now = new Date()

  const records = await db
    .delete(files)
    .where(lte(files.due_date, now))
    .returning({
      objectId: files.objectId,
    })

  if (records.length) {
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
  }

  console.log(`clear before ${now}`)
}
