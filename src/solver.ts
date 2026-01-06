import { Grid, GridNode } from './grid.js'

const validStartLetters = ['L', 'T', 'B', '?']

const validSpellPrefixes = [
  'L',
  'T',
  'B',
  'LO',
  'TL',
  'TLA',
  'LOL',
]

const validSpells = ['LOK', 'TLAK', 'TA', 'BE', 'LOLO']

enum Direction {
  Right,
  Down,
  Left,
  Up,
}

const directions = [Direction.Right, Direction.Down, Direction.Left, Direction.Up]

// TODO: consider written
const getWrittenChar = (node: GridNode) => node.char

function getNext(node: GridNode, dir: Direction) {
  switch (dir) {
  case Direction.Right: return node.right
  case Direction.Down:  return node.down
  case Direction.Left:  return node.left
  case Direction.Up:    return node.up
  default: dir satisfies never; throw 0
  }
}

function findPossibleMoves(grid: Grid) {
  const possibleMoves: { spell: string, trail: GridNode[] }[] = []

  const walked: GridNode[] = []
  function walkRec(node: GridNode, dir: Direction, spell: string) {
    if (validSpells.includes(spell)) {
      possibleMoves.push({ spell, trail: walked.slice().concat([node]) })
      return
    }
    if (!validSpellPrefixes.includes(spell)) return
    const nxt = getNext(node, dir)

    if ('_isHead' in nxt) return

    walked.push(node)
    // TODO: consider "X"
    const nextDir = dir
    walkRec(nxt, nextDir, spell + getWrittenChar(nxt))
    walked.pop()
  }

  for (let i = 0; i < grid.nodeList.length; i++) {
    const node = grid.nodeList[i]
    const char = getWrittenChar(node)
    if (!validStartLetters.includes(char)) {
      continue
    }

    for (let d of directions) {
      walkRec(node, d, char)
    }
  }

  return possibleMoves
}

export function solve(grid: Grid) {
  grid.print()

  const possibleMoves = findPossibleMoves(grid)
  console.log('possible moves', possibleMoves.map(({trail, ...rest}) => ({trail: trail.map(x => x.id).join(' -> '), ...rest})))
}
