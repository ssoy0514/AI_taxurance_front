export interface Profile {
  age: string
  gender: string
  job?: string
  notes: string
}

export interface RiderScript {
  name: string
  talk: string
}

export interface Highlight {
  icon: string
  headline: string
  detail: string
  source: string
}

export interface StatChartItem {
  label: string
  value: number
}

export interface Statistic {
  chartType: 'bar' | 'donut' | 'comparison'
  title: string
  source: string
  period: string
  unit?: string
  reason?: string
  description?: string
  sourceUrl?: string
  chartData?: StatChartItem[]
  percent?: number
  centerLabel?: string
  centerSub?: string
}

export interface DesignSummary {
  highlights?: Highlight[]
  statistics?: Statistic[]
  salesIntro?: string
  tips?: string[]
}

export interface QnaItem {
  rider?: string
  q: string
  a: string
  tip?: string
}

export interface ParsedScript {
  designSummary?: DesignSummary
  riderScripts: RiderScript[]
  qna: QnaItem[]
}

interface BaseApiResp {
  succ: boolean
  detail: string
  status_code: number
  timestamp: string
}

export interface StatsApiResp extends BaseApiResp {
  highlights: Highlight[]
  statistics: Statistic[]
}

export interface ScriptsApiResp extends BaseApiResp {
  riderScripts: RiderScript[]
  tips: string[]
  llmElapsed: number | null
  usedModel: string | null
}

export interface QnaApiResp extends BaseApiResp {
  qna: QnaItem[]
}

export interface ErrorApiResp extends BaseApiResp {
  succ: false
  err: string
}
