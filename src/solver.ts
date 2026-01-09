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

// dumb TS!
const _validSpells = Object.freeze(['LOK', 'TLAK', 'TA', 'BE', 'LOLO'] as const)
type ValidSpell = typeof _validSpells[number]
const validSpells = _validSpells as readonly string[]

enum Direction {
  Right,
  Down,
  Left,
  Up,
}

const directions = [Direction.Right, Direction.Down, Direction.Left, Direction.Up]

function getNext(node: GridNode, dir: Direction) {
  switch (dir) {
  case Direction.Right: return node.right
  case Direction.Down:  return node.down
  case Direction.Left:  return node.left
  case Direction.Up:    return node.up
  default: dir satisfies never; throw 0
  }
}

const moreDirsFromX = {
  [Direction.Right]: [Direction.Up,   Direction.Down ],
  [Direction.Down]:  [Direction.Left, Direction.Right ],
  [Direction.Left]:  [Direction.Up,   Direction.Down ],
  [Direction.Up]:    [Direction.Left, Direction.Right ],
}

function findPossibleMoves(grid: Grid) {
  const possibleMoves: { spell: ValidSpell, trail: GridNode[], cellsToBlackOut: GridNode[] }[] = []

  const walked: GridNode[] = []
  function walkRec(node: GridNode, dir: Direction, spell: string) {
    if (validSpells.includes(spell)) {
      const trail = walked.slice().concat([node])
      possibleMoves.push({
        spell: spell as ValidSpell,
        trail,
        cellsToBlackOut: trail.filter(x => x.getWritten() !== 'X'),
      })
      return
    }
    if (!validSpellPrefixes.includes(spell)) return
    if (walked.length > 50) return

    const nxt = getNext(node, dir)

    if ('_isHead' in nxt) return

    walked.push(node)
    const nextChar = nxt.getWritten()
    const newSpell = spell + (nextChar === 'X' ? '' : nextChar)
    walkRec(nxt, dir, newSpell)
    if (nxt.getWritten() === 'X') {
      for (const nextDir of moreDirsFromX[dir]) {
        walkRec(nxt, nextDir, newSpell)
      }
    }
    walked.pop()
  }

  for (let i = 0; i < grid.nodeList.length; i++) {
    const node = grid.nodeList[i]
    if (node.removed) continue
    const char = node.getWritten()
    if (!validStartLetters.includes(char)) {
      continue
    }

    for (let d of directions) {
      walkRec(node, d, char)
    }
  }

  return possibleMoves
}

type SolutionStep =
  | { spell: 'LOK',  trail: GridNode[], drop: string }
  | { spell: 'TLAK', trail: GridNode[], drops: [string, string] }
  | { spell: 'TA',   trail: GridNode[], dropLetter: string }
  // | { spell: 'BE',   trail: GridNode[], space: string, write: string }
  // | { spell: 'LOLO', trail: GridNode[], dropIndex: number }

function trailToString(trail: GridNode[]) {
  return trail.map(x => x.id).join(' -> ')
}

export function solve(grid: Grid) {
  let nExploredState = 0
  const solutions: SolutionStep[][] = []

  const movedSteps: SolutionStep[] = []
  function solveInner(depth: number) {
    if (solutions.length) return

    if (grid.activeCnt === 0) {
      solutions.push(movedSteps.slice())
      return
    }

    if (depth > 10) {
      return
    }

    nExploredState++

    const possibleMoves = findPossibleMoves(grid)
    // console.log('moved', movedSteps)
    // console.log('active count', grid.activeCnt)
    // console.log('possible moves', possibleMoves.map(
    //   ({trail, cellsToBlackOut, ...rest}) => ({trail: trailToString(trail), ...rest})))

    for (let { spell, trail, cellsToBlackOut } of possibleMoves) {
      grid.removeNodes(cellsToBlackOut)

      switch (spell) {
      case 'LOK': {
        for (const node of grid.nodeList) {
          if (node.removed) continue
          grid.removeNodes([node])
          movedSteps.push({ spell, trail, drop: node.id })
          solveInner(depth + 1)
          movedSteps.pop()
          grid.backtrack()
        }
        break
      }
      case 'TLAK': {
        for (const fst of grid.nodeList) {
          if (fst.removed) continue
          for (const d of [Direction.Right, Direction.Down]) {
            const snd = getNext(fst, d)
            if ('_isHead' in snd || snd.removed) continue

            grid.removeNodes([fst, snd])
            movedSteps.push({ spell, trail, drops: [fst.id, snd.id] })
            solveInner(depth + 1)
            movedSteps.pop()
            grid.backtrack()
          }
        }
        break
      }
      case 'TA': {
        // FIXME: does not consider dynamic ones; maybe always visit "_" ones?
        for (const [cc, anns] of grid.byChar) {
          const nns = anns.filter(x => !x.removed)
          if (!nns.length) continue

          grid.removeNodes(nns)
          movedSteps.push({ spell, trail, dropLetter: cc })
          solveInner(depth + 1)
          movedSteps.pop()
          grid.backtrack()
        }
        break
      }
      case 'BE': break
      case 'LOLO': break
      default: spell satisfies never; throw 0
      }

      grid.backtrack()
    }
  }

  grid.print()
  solveInner(0)

  console.log('nExploredState', nExploredState)
  console.dir(solutions.map(steps => steps.map(({trail, ...rest}) => {
    return ({trail: trailToString(trail), ...rest})
  })), { depth: 1000 })
}
