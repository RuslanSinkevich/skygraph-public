export interface Node {
  readonly id: string
  value: unknown
  version: number
}

export function createNode(id: string, value: unknown): Node {
  return { id, value, version: 0 }
}
