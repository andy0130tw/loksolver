import { solve } from './solver.js'
import { Grid, GridNode } from './grid.js'

export class ParseError extends Error {}

export function parse(input: string) {
  const lines = input.split('\n').map(s => s.trimEnd())
  while (lines.length && !lines.at(-1)!.length) lines.pop()

  if (!lines.length) {
    throw new ParseError('no input string')
  }

  const ncol = Math.max.apply(Math, lines.map(s => s.length))

  const grid = []
  for (let i = 0; i < lines.length; i++) {
    const row: (GridNode | null)[] = []
    const chars = lines[i].split('')

    let j
    for (j = 0; j < chars.length; j++) {
      row.push(chars[j] == ' ' ? null : new GridNode(i, j, chars[j]))
    }
    while (j++ < ncol) {
      row.push(null)
    }
    grid.push(row)
  }

  return new Grid(grid)
}
