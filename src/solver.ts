import { Grid, GridNode } from './grid.js'

type SolutionStep = { trail: GridNode[] } & (
  | { spell: 'LOK',  drop: string }
  | { spell: 'TLAK', drops: [string, string] }
  | { spell: 'TA',   dropLetter: string }
  | { spell: 'BE',   space: string, write: string }
  | { spell: 'LOLO', dropIndex: number })

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
      // FIXME: dedupe path: I can think of several cases:
      //   1. some detour via "X"s; this is problematic since a path can be "pumped"
      //      via a loop of "X"s
      //   2. two starting directions of a cycle path to spell "LOLO"
      possibleMoves.push({
        spell: spell as ValidSpell,
        trail,
        cellsToBlackOut: trail.filter(x => x.getWritten() !== 'X'),
      })
      return
    }
    if (!validSpellPrefixes.includes(spell)) return
    // FIXME: this needs to be fine-tuned for now to prevent exponential explosion;
    //        see the upper FIXME
    if (walked.length > 15) return

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

export function trailToString(trail: GridNode[]) {
  return trail.map(x => x.id).join(' -> ')
}

export function solve(grid: Grid, options: {nSolutionLimit?: number} = {}) {
  const { nSolutionLimit = 1e9 } = options

  let nExploredState = 0
  const solutions: SolutionStep[][] = []

  const staticCharsOnGrid = Array.from(grid.byChar.keys())

  // TODO: '?'
  const charsAvailToWrite: string[] = staticCharsOnGrid.filter(x => x != '_')
  for (const c of 'XBETALOK'.split('')) {
    if (!charsAvailToWrite.includes(c)) {
      charsAvailToWrite.push(c)
    }
  }

  const introducedByBE: string[] = []
  let introducedByBEUnique: string[] = []
  const movedSteps: SolutionStep[] = []
  function solveInner() {
    if (solutions.length >= nSolutionLimit) return

    if (grid.activeCnt === 0) {
      solutions.push(movedSteps.slice())
      return
    }

    if (movedSteps.length > 10) {
      return
    }

    nExploredState++
    if (nExploredState % 100000 === 0) {
      console.log(`explored ${nExploredState} states, nsol = ${solutions.length}`)
    }

    const possibleMoves = findPossibleMoves(grid)
    // console.log('moved', movedSteps.map(
    //   ({trail, ...rest}) => ({trail: trailToString(trail), ...rest})))
    // console.log('active count', grid.activeCnt)
    // console.log('possible moves', possibleMoves.map(
    //   ({trail, cellsToBlackOut, ...rest}) => ({trail: trailToString(trail), ...rest})))

    for (let { spell, trail, cellsToBlackOut } of possibleMoves) {
      grid.removeNodes(cellsToBlackOut)

      switch (spell) {
      case 'LOK': {
        for (const node of grid.nodeList) {
          if (!grid.removeNodes([node])) continue
          movedSteps.push({ spell, trail, drop: node.id })
          solveInner()
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
            solveInner()
            movedSteps.pop()
            grid.backtrack()
          }
        }
        break
      }
      case 'TA': {
        const charTypesOnGrid = staticCharsOnGrid.concat(introducedByBEUnique)
        for (const ch of charTypesOnGrid) {
          // the char can be either from static tiles or introduced by "BE" from formerly empty tiles
          // XXX: always visit "_" ones since they are dynamic; maybe inefficient?
          const emptyTiles = grid.byChar.get('_') ?? []
          let nns = emptyTiles.filter(x => x.getWritten() == ch)
          if (grid.byChar.has(ch) && ch != '_') {
            nns = nns.concat(grid.byChar.get(ch)!)
          }

          if (!grid.removeNodes(nns)) continue
          movedSteps.push({ spell, trail, dropLetter: ch })
          solveInner()
          movedSteps.pop()
          grid.backtrack()
        }
        break
      }
      case 'BE': {
        // empty tiles can be written something but not the other way around
        const emptyTiles = grid.byChar.get('_') ?? []
        for (const et of emptyTiles) {
          if (et.removed || et.getWritten() != '_') continue
          for (const ch of charsAvailToWrite) {
            let isIntroducingNewChar = !staticCharsOnGrid.includes(ch)
            if (isIntroducingNewChar) {
              if (!introducedByBE.includes(ch)) {
                introducedByBEUnique.push(ch)
              }
              introducedByBE.push(ch)
            }
            et.written = ch
            movedSteps.push({ spell, trail, space: et.id, write: ch })
            solveInner()
            movedSteps.pop()
            et.written = null
            if (isIntroducingNewChar) {
              introducedByBE.pop()
              introducedByBEUnique = Array.from(new Set(introducedByBE))
            }
          }
        }
        break
      }
      case 'LOLO': {
        for (const [idx, nodes] of grid.byDiagIndex) {
          if (!grid.removeNodes(nodes)) continue
          movedSteps.push({ spell, trail, dropIndex: idx })
          solveInner()
          movedSteps.pop()
          grid.backtrack()
        }
        break
      }
      default: spell satisfies never; throw 0
      }

      grid.backtrack()
    }
  }

  grid.print()
  solveInner()

  return {
    nExploredState,
    solutions,
  }
}
