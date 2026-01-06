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
