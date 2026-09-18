// src/utils/markdown.ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// marked의 CommonMark flanking-delimiter 규칙상 "**6%**입니다"처럼 닫는 ** 앞이
// 문장부호(%, ) 등)이고 뒤에 공백 없이 문자가 바로 붙으면 볼드로 파싱되지 않는 문제가 있어,
// marked에 넘기기 전에 **...**를 직접 <strong>으로 치환해 우회한다.
function preConvertBold(md: string): string {
  return md.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
}

export function renderMarkdown(md: string): string {
  // @ts-ignore
  return DOMPurify.sanitize(marked.parse(preConvertBold(md)))
}
