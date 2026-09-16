// taxurance3.vue 전용 API 클라이언트 - taxurance_prompt_test/backend(FastAPI)를 직접 호출한다.
// 이 회사 공용 $axios(plugins/axios.ts)는 응답 포맷 가정(succ 등)과 404/422/500 시
// 세션만료·에러페이지 리다이렉트 인터셉터가 있어서, 이 테스트 백엔드처럼 다른 계약을 쓰는
// API에는 안 맞는다. 그래서 별도 axios 인스턴스를 씀.
import axios from 'axios'

// 로컬 개발 시 FastAPI를 8000번에 띄운다고 가정. 배포(dist+FastAPI 한 포트) 시에는
// 같은 origin이 되므로 .env에 TAXURANCE_API_BASE=''로 비워서 상대경로로 호출하면 됨.
// (falsy 체크로 ||를 쓰면 빈 문자열도 "설정 안 됨"으로 취급돼서 기본값으로 덮여버림 - undefined만 걸러야 함)
const API_BASE =
  process.env.TAXURANCE_API_BASE !== undefined
    ? process.env.TAXURANCE_API_BASE
    : 'http://localhost:8003'

const client = axios.create({ baseURL: API_BASE })

export async function getSurveyQuestions(age) {
  const { data } = await client.get('/api/survey/questions', { params: { age } })
  return data
}

export async function diagnoseSurvey(answers) {
  const { data } = await client.post('/api/survey/diagnose', { answers })
  return data // { typecode, badge, title, desc, point_text }
}

// SpeechDoc 컬렉션이 하나라 백엔드 라우터도 /api/generate 하나로 통합돼있음.
// step: 'opening' | 'final'
export async function generateOpening(payload) {
  const { data } = await client.post('/api/generate', { step: 'opening', ...payload })
  return data // { opening_ment, matched_count }
}

export async function generateFinal(payload) {
  const { data } = await client.post('/api/generate', { step: 'final', ...payload })
  return data // { speech, matched_count }
}
