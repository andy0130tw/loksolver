export function newArray<T>(n: number, gen: (idx: number) => T): T[] {
  return new Array(n).fill(undefined).map((_, i) => gen(i))
}

export async function fromAsync<T>(ait: AsyncIterable<T>) {
  if (typeof (Array as any).fromAsync !== 'undefined') {
    return (Array as any).fromAsync(ait)
  }
  const chunks = []
  for await (const chunk of ait) {
    chunks.push(chunk)
  }
  return chunks
}

export function promiseTry<T, Args extends unknown[]>(
  func: (...args: Args) => T | PromiseLike<T>, ...args: Args): Promise<Awaited<T>> {

  if (typeof (Promise as any).try !== 'undefined') {
    return (Promise as any).try(func, ...args)
  }
  try {
    return Promise.resolve(func(...args))
  } catch (e) {
    return Promise.reject(e)
  }
}
