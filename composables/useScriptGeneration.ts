import { ref, nextTick, type Ref } from 'vue'
import type { Profile, ParsedScript, StatsApiResp, ScriptsApiResp, QnaApiResp } from '~/utils/coachingTrackTypes'
import type { Rider } from '~/utils/coachingTrackData'
import { useToast } from '~/composables/useToast'

// 백엔드(추후 연결 예정)가 아직 없을 때, 결과 화면 디자인 작업을 계속할 수 있도록
// 실제 API 응답과 동일한 모양의 샘플 데이터를 채워줍니다. 백엔드 연결 후에는
// 정상 응답이 오는 즉시 이 샘플 데이터는 더 이상 쓰이지 않습니다.
function buildMockScript(riders: Rider[], profile: Profile): ParsedScript {
  const names = riders.length > 0 ? riders.map((r) => r.name) : ['샘플 특약']

  return {
    designSummary: {
      highlights: [
        { icon: '📌', headline: '샘플 하이라이트 1', detail: '백엔드 연결 전, 디자인 확인용 샘플 데이터입니다.', source: '샘플 데이터' },
        { icon: '📊', headline: '샘플 하이라이트 2', detail: `${profile.age} ${profile.gender} 고객 기준 예시입니다.`, source: '샘플 데이터' },
        { icon: '💡', headline: '샘플 하이라이트 3', detail: '실제 데이터는 API 연결 후 이 자리에 표시됩니다.', source: '샘플 데이터' },
      ],
      statistics: [
        {
          chartType: 'bar',
          title: '샘플 통계 (막대그래프)',
          source: '샘플 데이터',
          period: '2026',
          unit: '건',
          reason: '백엔드 미연결 상태에서 보여주는 예시 통계입니다.',
          description: '실제 연동 시 이 영역에 API 응답 데이터가 표시됩니다.',
          chartData: [
            { label: '항목 A', value: 320 },
            { label: '항목 B', value: 210 },
            { label: '항목 C', value: 150 },
          ],
        },
        {
          chartType: 'donut',
          title: '샘플 통계 (도넛그래프)',
          source: '샘플 데이터',
          period: '2026',
          percent: 62,
          centerLabel: '62%',
          centerSub: '샘플\n비율',
          description: '실제 연동 시 이 영역에 API 응답 데이터가 표시됩니다.',
        },
        {
          chartType: 'comparison',
          title: '샘플 통계 (비교그래프)',
          source: '샘플 데이터',
          period: '2026',
          description: '실제 연동 시 이 영역에 API 응답 데이터가 표시됩니다.',
          chartData: [
            { label: '가입 전', value: 40 },
            { label: '가입 후', value: 95 },
          ],
        },
      ],
      tips: [
        '[샘플] 이 영역은 화법 생성 API가 연결되면 AI가 생성한 영업 꿀팁으로 대체됩니다.',
      ],
    },
    riderScripts: names.map((name) => ({
      name,
      talk: `[샘플 화법] "${name}"에 대한 상담 화법 예시입니다. 실제 API 연동 후에는 이 자리에 AI가 생성한 맞춤 화법이 표시됩니다.`,
    })),
    qna: names.flatMap((name) => ([
      { rider: name, q: `${name}은 어떤 경우에 보장되나요? (샘플 질문)`, a: '샘플 답변입니다. 실제 연동 후 AI가 생성한 답변으로 대체됩니다.' },
      { rider: name, q: `${name} 가입 시 유의할 점은? (샘플 질문)`, a: '샘플 답변입니다. 실제 연동 후 AI가 생성한 답변으로 대체됩니다.' },
    ])),
  }
}

export function useScriptGeneration(
  apiBase: Ref<string>,
  selectedDataFull: Ref<Rider[]>,
  profile: Ref<Profile>,
) {
  const { info } = useToast()
  const isGenerating = ref(false)
  const generatedScript = ref<ParsedScript | null>(null)

  async function callApi<T>(path: string, body: string, headers: Record<string, string>): Promise<T> {
    const res = await fetch(`${apiBase.value}${path}`, { method: 'POST', headers, body })
    if (!res.ok) {
      const d: { detail?: string } | null = await res.json().catch(() => null)
      throw new Error(d?.detail ?? `서버 오류 (${res.status})`)
    }
    return res.json() as Promise<T>
  }

  async function generate(): Promise<boolean> {
    isGenerating.value = true
    generatedScript.value = null

    const body = JSON.stringify({
      profile: profile.value,
      riders: selectedDataFull.value.map((r) => ({
        name: r.name,
        category: r.category,
        description: r.description,
        badge: r.badge ?? null,
      })),
    })
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
    }

    try {
      generatedScript.value = { designSummary: undefined, riderScripts: [], qna: [] }
      await nextTick()

      const statsP = callApi<StatsApiResp>('/api/generate/stats', body, headers)
        .then((st) => {
          generatedScript.value = {
            ...generatedScript.value!,
            designSummary: { highlights: st.highlights ?? [], statistics: st.statistics ?? [], tips: [] },
          }
        })
        .catch(() => {})

      const scriptsP = callApi<ScriptsApiResp>('/api/generate/scripts', body, headers)
        .then((s2) => {
          const prev = generatedScript.value?.designSummary
          generatedScript.value = {
            ...generatedScript.value!,
            riderScripts: s2.riderScripts ?? [],
            designSummary: { ...(prev ?? { highlights: [], statistics: [] }), tips: s2.tips ?? [] },
          }
        })

      const qnaP = callApi<QnaApiResp>('/api/generate/qna', body, headers)
        .then((s3) => {
          generatedScript.value = { ...generatedScript.value!, qna: s3.qna ?? [] }
        })
        .catch(() => {})

      await Promise.all([statsP, scriptsP, qnaP])
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      // 백엔드가 아직 연결되지 않은 등의 이유로 생성에 실패해도, 결과 화면
      // 디자인 작업을 계속할 수 있도록 화면을 되돌리지 않고 샘플 데이터로 채웁니다.
      generatedScript.value = buildMockScript(selectedDataFull.value, profile.value)
      info(`백엔드에 연결하지 못해 샘플 데이터로 표시합니다.\n(${msg})`)
      return true
    } finally {
      isGenerating.value = false
    }
  }

  return { isGenerating, generatedScript, generate }
}
