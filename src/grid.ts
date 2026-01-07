import { newArray } from './utils.js'

export class GridNode {
  readonly id: string
  left!:  GridNode | RowHead
  right!: GridNode | RowHead
  up!:    GridNode | ColHead
  down!:  GridNode | ColHead

  removed = false
  written: string | null = null

  constructor(
    readonly x: number,
    readonly y: number,
    readonly char: string) {
    this.id = String.fromCharCode(65 + y) + String(x + 1)
  }

  getWritten() {
    if (this.char === '_')
      return this.written ?? '_'
    return this.char
  }
}

class RowHead {
  left!:  GridNode | RowHead
  right!: GridNode | RowHead
  _isHead = true as const
}

class ColHead {
  up!:   GridNode | ColHead
  down!: GridNode | ColHead
  _isHead = true as const
}

function iterateLL<H, T = GridNode>(head: H, getNext: (x: H | T) => H | T, getPrev: (x: H | T) => H | T): T[] {
  const elts = []
  const seen = new Set()

  let el: H | T = head
  while (1) {
    el = getNext(el)
    if (el === head) break
    elts.push(el)
    seen.add(el)
    if (elts.length > 1000 && seen.size < elts.length) {
      throw new Error('Maybe infinite loop?')
    }
  }

  if (elts.length) {
    if (getPrev(head) !== elts.at(-1)) {
      throw new Error(`prev of head is not last`)
    }
    if (getPrev(elts[0]) !== head) {
      throw new Error(`prev of #0 is not head`)
    }

    for (let i = 1; i < elts.length; i++) {
      if (getPrev(elts[i]) !== elts[i - 1]) {
        throw new Error(`prev of #${i} is not #${i-1}`)
      }
    }
  } else {
    if (getPrev(head) !== head) {
      throw new Error(`linked list is empty but not cyclic`)
    }
  }

  return elts as unknown as T[]
}


export class Grid {
  nrow: number
  ncol: number
  rowPtrs: RowHead[]
  colPtrs: ColHead[]

  nodeList: GridNode[]
  byChar: Map<string, GridNode[]> = new Map

  activeCnt: number = -1
  #removed: GridNode[] = []

  constructor(readonly grid: (GridNode | null)[][]) {
    this.nrow = grid.length
    this.ncol = grid[0].length

    this.rowPtrs = newArray(this.nrow, () => new RowHead)
    this.colPtrs = newArray(this.ncol, () => new ColHead)

    const rowsPrev: (GridNode | RowHead)[] = this.rowPtrs.slice()
    const colsPrev: (GridNode | ColHead)[] = this.colPtrs.slice()

    this.nodeList = []
    for (let i = 0; i < this.nrow; i++) {
      for (let j = 0; j < this.ncol; j++) {
        const cur = grid[i][j]
        if (cur == null) continue

        this.nodeList.push(cur)
        rowsPrev[i].right = cur
        cur.left = rowsPrev[i]
        rowsPrev[i] = cur

        colsPrev[j].down = cur
        cur.up = colsPrev[j]
        colsPrev[j] = cur

        const cc = cur.getWritten()
        if (!this.byChar.has(cc)) {
          this.byChar.set(cc, [cur])
        } else {
          this.byChar.get(cc)!.push(cur)
        }
      }
    }
    this.activeCnt = this.nodeList.length

    for (let i = 0; i < this.nrow; i++) {
      rowsPrev[i].right = this.rowPtrs[i]
      this.rowPtrs[i].left = rowsPrev[i]
    }

    for (let j = 0; j < this.ncol; j++) {
      colsPrev[j].down = this.colPtrs[j]
      this.colPtrs[j].up = colsPrev[j]
    }

    // wellformedness check
    for (let i = 0; i < this.nrow; i++) {
      iterateLL(this.rowPtrs[i], x => x.right, x => x.left)
    }
    for (let j = 0; j < this.ncol; j++) {
      iterateLL(this.colPtrs[j], x => x.down, x => x.up)
    }
  }

  print() {
    console.log('  ' + newArray(this.ncol, i => ' ' + String.fromCharCode(65 + i)).join(''))
    for (let i = 0; i < this.nrow; i++) {
      let str = `${String(i+1).padStart(2)} `
      for (let j = 0; j < this.ncol; j++) {
        str += this.grid[i][j]?.char ?? ' '
        str += this.grid[i][j]?.removed ? '#' : ' '
      }
      console.log(str)
    }

    // for (let i = 0; i < this.nodeList.length; i++) {
    //   console.log(`node ${i}`, this.nodeList[i])
    // }
  }

  removeNode(node: GridNode) {
    // dangerous!
    const {x, y} = node
    if (this.grid[x]?.[y] !== node) {
      throw new Error('illegal node')
    }
    return this.removeByPos(node.x, node.y)
  }

  removeByPos(x: number, y: number) {
    const node = this.grid[x]?.[y]
    if (!node) {
      throw new Error('node not found')
    }

    if (node.removed) {
      throw new Error('node has been removed')
    }

    node.removed = true
    this.activeCnt--

    node.left.right = node.right
    node.right.left = node.left
    node.up.down = node.down
    node.down.up = node.up

    this.#removed.push(node)
  }

  backtrack(count: number = 1) {
    if (count > this.nodeList.length - this.activeCnt) throw new Error('illegal count')
    for (let i = 0; i < count; i++) {
      this.#backtrackOne()
    }
  }

  #backtrackOne() {
    const node = this.#removed.pop()
    if (!node) {
      throw new Error('backtrack stack underflow')
    }

    node.removed = false
    this.activeCnt++

    node.left.right = node
    node.right.left = node
    node.up.down = node
    node.down.up = node
  }
}
