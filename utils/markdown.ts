// src/utils/markdown.ts
import { marked } from 'marked'
import DOMPurify from 'dompurify'

export function renderMarkdown(md: string): string {
  // @ts-ignore
  return DOMPurify.sanitize(marked.parse(md))
}

// 택슈어런스 전용 - 마커(타이틀) 앞에 빈 줄을 넣어 문단을 가르고, 마커 뒤엔 <br>로 줄만 바꾼다.
// 마커 바로 뒤에 진짜 글자(공백도 아니고 태그 시작 '<'도 아닌 것)가 곧바로 붙어있는 경우에만
// 적용한다 - 이미 자연스럽게 떨어져 있거나(예: <b>[핵심]</b></p>처럼 태그로 끝나는 경우)
// 손대지 않아서 이중으로 벌어지는 걸 막는다.
function forceBreakBeforeMarkers(md: string, markers: string[], collapseBlankLines: boolean): string {
  // 번역 응답은 문장마다 제멋대로 빈 줄(연속 개행)을 넣어주는 경우가 있어서, collapseBlankLines가
  // true일 때만(번역 결과 렌더링 시) 2개 이상 연속된 개행을 전부 하나로 눌러 무시한다. 원문은
  // 지금까지 이 문제가 없었으니 손대지 않는다.
  let result = collapseBlankLines ? md.replace(/\n{2,}/g, '\n') : md

  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`${escaped}(?=[^\\s<])`, 'g')
    result = result.replace(pattern, `\n\n${marker}<br>`)
  }
  return result.replace(/^\n+/, '')
}

export function renderMarkdownTaxurance(
  md: string,
  forceBreakMarkers: string[],
  isTranslation = false
): string {
  // @ts-ignore
  return DOMPurify.sanitize(marked.parse(forceBreakBeforeMarkers(md, forceBreakMarkers, isTranslation)))
}
