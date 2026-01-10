import { Readable } from 'node:stream'
import { TextDecoderStream } from 'node:stream/web'
import { parse, ParseError } from './parser.js'
import { fromAsync, promiseTry } from './utils.js'
import { solve, trailToString } from './solver.js'

function printSolutions({ nExploredState, solutions }: ReturnType<typeof solve>) {
  console.log('====== SOLUTIONS ======')
  console.log('# of explored state(s):', nExploredState)
  console.log('# of Solution(s):', solutions.length)
  console.dir(solutions.map(steps => steps.map(({trail, ...rest}) => {
    return ({trail: trailToString(trail), ...rest})
  })), { depth: 1000, maxArrayLength: 1e9 })
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

  printSolutions(solve(data))
}

main()
