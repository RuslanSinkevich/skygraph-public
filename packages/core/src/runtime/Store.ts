import { createNode } from './Node'
import type { Node } from './Node'

export class Store {
  private nodes: Map<string, Node> = new Map()

  has(path: string): boolean {
    return this.nodes.has(path)
  }

  get(path: string): unknown {
    return this.nodes.get(path)?.value
  }

  getNode(path: string): Node | undefined {
    return this.nodes.get(path)
  }

  set(path: string, value: unknown): Node {
    let node = this.nodes.get(path)
    if (node) {
      node.value = value
      node.version++
      return node
    }
    node = createNode(path, value)
    this.nodes.set(path, node)
    return node
  }

  delete(path: string): boolean {
    return this.nodes.delete(path)
  }

  paths(): IterableIterator<string> {
    return this.nodes.keys()
  }

  size(): number {
    return this.nodes.size
  }
}
