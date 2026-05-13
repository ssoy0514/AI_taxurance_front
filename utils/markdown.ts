// src/utils/markdown.ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export function renderMarkdown(md: string): string {
  // @ts-ignore
  return DOMPurify.sanitize(marked.parse(md))
}
