import { Tiktoken, encoding_for_model } from 'tiktoken'

let encoder: Tiktoken | null = null

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = encoding_for_model('gpt-4')
  }
  return encoder
}

export function countTokens(text: string): number {
  const tokenEncoder = getEncoder()
  return tokenEncoder.encode(text).length
}

export function countCharacters(text: string): number {
  return text.length
}

export function formatNumber(num: number): string {
  return num.toLocaleString()
}
