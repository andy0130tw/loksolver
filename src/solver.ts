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

function findPossibleMoves(grid: Grid) {
  const possibleMoves: { spell: ValidSpell, trail: GridNode[] }[] = []

  const walked: GridNode[] = []
  function walkRec(node: GridNode, dir: Direction, spell: string) {
    if (validSpells.includes(spell)) {
      possibleMoves.push({
        spell: spell as ValidSpell,
        trail: walked.slice().concat([node]),
      })
      return
    }
    if (!validSpellPrefixes.includes(spell)) return
    const nxt = getNext(node, dir)

    if ('_isHead' in nxt) return

    walked.push(node)
    // TODO: consider "X"
    const nextDir = dir
    walkRec(nxt, nextDir, spell + nxt.getWritten())
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
  | { spell: 'TLAK', trail: GridNode[], drop: string }
  | { spell: 'TA',   trail: GridNode[], dropLetter: string }
  // | { spell: 'BE',   trail: GridNode[], space: string, write: string }
  // | { spell: 'LOLO', trail: GridNode[], dropIndex: number }

function trailToString(trail: GridNode[]) {
  return trail.map(x => x.id).join(' -> ')
}

export function solve(grid: Grid) {
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

    const possibleMoves = findPossibleMoves(grid)
    // console.log('moved', movedSteps)
    // console.log('active count', grid.activeCnt)
    // console.log('possible moves', possibleMoves.map(({trail, ...rest}) => ({trail: trailToString(trail).join(' -> '), ...rest})))

    for (let { spell, trail } of possibleMoves) {
      for (const t of trail) {
        grid.removeNode(t)
      }

      switch (spell) {
      case 'LOK': {
        for (const node of grid.nodeList) {
          if (node.removed) continue
          grid.removeNode(node)
          movedSteps.push({ spell, trail, drop: node.id })
          solveInner(depth + 1)
          movedSteps.pop()
          grid.backtrack(1)
        }
        break
      }
      case 'TLAK': {
        for (const fst of grid.nodeList) {
          if (fst.removed) continue
          for (const d of [Direction.Right, Direction.Down]) {
            const snd = getNext(fst, d)
            if (snd === fst || '_isHead' in snd || snd.removed) continue

            grid.removeNode(fst)
            grid.removeNode(snd)
            movedSteps.push({ spell, trail, drop: `${fst.id} + ${snd.id}` })
            solveInner(depth + 1)
            movedSteps.pop()
            grid.backtrack(2)
          }
        }
        break
      }
      case 'TA': {
        for (const node of grid.nodeList) {
          if (node.removed) continue

          // FIXME: does not consider dynamic ones; maybe always visit "_" ones?
          for (const [cc, anns] of grid.byChar) {
            const nns = anns.filter(x => !x.removed)
            if (!nns.length) continue

            nns.forEach(nn => grid.removeNode(nn))
            movedSteps.push({ spell, trail, dropLetter: cc })
            solveInner(depth + 1)
            movedSteps.pop()
            grid.backtrack(nns.length)
          }
        }
        break
      }
      case 'BE': break
      case 'LOLO': break
      default: spell satisfies never; throw 0
      }

      grid.backtrack(trail.length)
    }
  }

  grid.print()
  solveInner(0)

  console.log('solutions', solutions.map(steps => steps.map(({trail, ...rest}) => {
    return ({trail: trailToString(trail), ...rest})
  })))
}
