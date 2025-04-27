interface ChunkInfo {
  sha: string
  uuid: string
  size: number
  chunks: Array<{
    chunkId: number
    size: number
  }>
  finished: Array<{
    chunkId: number
    objectId: string
  }>
}
