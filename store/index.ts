// store/index.ts
import { ActionTree, MutationTree } from 'vuex'
import { Context } from '@nuxt/types'
import { getDeviceType } from '~/utils/device'

export const state = () => ({
  user: null as null | { id: string; name: string; ip: string },
  userRole: '',
  sessionId: '',
  device: 'pc',
  isLoading: false,
  message: '',
  isSidebarOpen: false,
})

export type RootState = ReturnType<typeof state>

export const mutations: MutationTree<RootState> = {
  SET_USER(state, payload) {
    state.user = payload
  },
  SET_USER_ROLE(state, payload) {
    state.userRole = payload
  },
  SET_SESSION_ID(state, id: string) {
    state.sessionId = id
  },
  SET_DEVICE(state, payload) {
    state.device = payload
  },
  SHOW_LOADING(state, message: string = '불러오는 중...') {
    state.isLoading = true
    state.message = message
  },
  HIDE_LOADING(state) {
    state.isLoading = false
    state.message = ''
  },
  TOGGLE_SIDEBAR(state) {
    state.isSidebarOpen = !state.isSidebarOpen
  },
  SET_SIDEBAR(state, value) {
    state.isSidebarOpen = value
  },
}

export const getters = {
  isLoading: (state: RootState) => state.isLoading,
  message: (state: RootState) => state.message,
}

export const actions: ActionTree<any, any> = {
  // SSR 진입 시 1회 실행
  async nuxtServerInit({ commit }, { req, app, $axios }: Context) {
    const headers = req && req.headers ? req.headers : {}
    console.log('[headers]', JSON.stringify(headers, null, 2))

    let userToken = null
    let devicetype = null

    try {
      // 1. 기본 제공되는 쿠키 모듈 사용 시도
      userToken = app.$cookies.get('userToken')
      devicetype = app.$cookies.get('devicetype')
    } catch (e) {
      console.warn('[Cookie Module Access Failed] Attempting manual parse...')
    }

    // 2. 대체 코드 (Fallback): 모듈이 실패하거나 값이 없는 경우 헤더에서 직접 추출
    if (!userToken || !devicetype) {
      const rawCookie = req?.headers?.cookie || ''
      const cookieMap: Record<string, string> = {}
      rawCookie.split(';').forEach((item) => {
        const [key, value] = item.split('=')
        if (key) cookieMap[key.trim()] = decodeURIComponent(value || '').trim()
      })
      userToken = userToken || cookieMap['userToken'] || null
      devicetype = devicetype || cookieMap['devicetype'] || 'pc'
    }

    // 최종 값 확정 (기본값 적용)
    userToken = userToken || null
    devicetype = devicetype || 'pc'

    console.log('[userToken]', userToken)
    console.log('[devicetype]', devicetype)

    // 이름 디코딩
    const decodeName = (val: any): string | null => {
      if (!val || typeof val !== 'string') return null

      let decoded = val

      // RFC 2047 (MIME) 패턴 체크: =?UTF-8?B?데이터?=
      if (val.startsWith('=?UTF-8?B?')) {
        try {
          // 데이터 부분만 추출
          const base64Part = val.split('?')[3]
          // Node.js 환경에서 Base64 -> UTF-8 변환
          decoded = Buffer.from(base64Part, 'base64').toString('utf8')
        } catch (e) {
          console.error('MIME Decode Error:', e)
        }
      }

      return decoded
    }

    const userAgent = headers['user-agent'] || ''
    const deviceType = getDeviceType(userAgent)
    commit('SET_DEVICE', deviceType)
    console.log('deviceType', deviceType)

    const rawName = headers['sm_username'] || headers['oam_user_nm'] || ''
    const user = {
      id: headers['oam_user_id'] || null,
      name: decodeName(rawName),
      ip: headers['sm_loinip'] || null,
    }

    const sessionId = (req as any).sessionID || ''
    if (sessionId) {
      commit('SET_SESSION_ID', sessionId)
    }

    if (user.id && sessionId) {
      $axios.setBaseURL(process.env.authUrl)

      commit('SET_USER', user)
      // try {
      //   const res = await $axios.$post('/auth/self/')
      //   commit('SET_USER_ROLE', res?.authDivCd)
      // } catch (err) {
      //   console.error('[auth-check failed]', err)
      // }
    } else {
      commit('SET_USER', null)
    }
  },
}
