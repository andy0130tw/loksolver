import { Readable } from 'node:stream'
import { TextDecoderStream } from 'node:stream/web'
import { solve } from './solver.js'
import { Grid, GridNode } from './grid.js'
import { fromAsync, promiseTry } from './utils.js'

class ParseError extends Error {}

function parse(input: string) {
  const lines = input.split('\n').map(s => s.trimEnd()).filter(x => !!x)
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

async function main() {
  const input = Readable.toWeb(process.stdin).pipeThrough(new TextDecoderStream)
  const chunks = await fromAsync(input)
  const data = await promiseTry(parse, chunks.join('')).catch(err => {
    if (err instanceof ParseError) {
      console.error('PARSE ERROR: ' + err.message)
      process.exit(1)
    }
    throw err
  })

  return solve(data)
}

main()
