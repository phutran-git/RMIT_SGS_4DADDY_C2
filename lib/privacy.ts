// On-device privacy guard: runs in the contributor's browser BEFORE encryption, so obvious
// personal identifiers never enter the corpus at all, not even as ciphertext.
const RULES: { label: string; re: RegExp }[] = [
  { label: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { label: 'phone', re: /(?:\+?84|0)(?:[\s.-]?\d){8,10}/g },
  { label: 'national ID', re: /\b\d{9}(?:\d{3})?\b/g },
  { label: 'url', re: /https?:\/\/\S+/g },
]

export function scrub(text: string): { clean: string; found: { label: string; value: string }[] } {
  const found: { label: string; value: string }[] = []
  let clean = text
  for (const { label, re } of RULES) {
    clean = clean.replace(re, (m) => {
      found.push({ label, value: m })
      return `[${label.toUpperCase()}]`
    })
  }
  return { clean, found }
}
