export function shuffleParticipants(ids: readonly string[]): string[] {
  const shuffled = [...ids]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[other]
    shuffled[other] = current
  }
  return shuffled
}
