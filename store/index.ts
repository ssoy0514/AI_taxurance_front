// store/index.ts
import { ActionTree, MutationTree } from 'vuex'
import { Context } from '@nuxt/types'
import { getDeviceType } from '~/utils/device'

export interface userInfo {
  id: string
  name: string
  ip: string
}

export const state = () => ({
  user: null as null | userInfo,
  userRole: '',
  sessionId: '',
  device: 'pc',
  from: '',
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
  SET_FROM(state, payload: string) {
    state.from = payload
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
  async nuxtServerInit() {
    // 클라이언트 사이드 초기화를 위해 비워둠
  },

  // 클라이언트 사이드 사용자 정보 및 권한 체크
  async fetchUser({ commit }) {
    // 서버에서 /mo/error?statusCode=405 등으로 리다이렉트된 경우,
    // 사용자 정보를 다시 호출할 필요가 없으므로 스킵합니다.
    if (this.$router.currentRoute.path.startsWith('/mo/error')) {
      console.warn('[fetchUser] Skipping user fetch on /mo/error page.')
      commit('SET_USER', null) // 에러 페이지에서는 사용자 정보를 초기화
      return
    }
    try {
      const res = await this.$axios.$post('/auth/self/')
      //res 가 json 문자열인 경우
      let user = null
      if (typeof res === 'string') {
        user = JSON.parse(res)
      } else {
        user = res
      }
      if (user) {
        commit('SET_USER', user)
      }
    } catch (err) {
      console.error('[auth-check failed]', err)
      commit('SET_USER', null)
    }
  },

  // 클라이언트 사이드 장치 정보 설정
  setDeviceType({ commit }) {
    const userAgent = window.navigator.userAgent
    const deviceType = getDeviceType(userAgent)
    commit('SET_DEVICE', deviceType)
  },
}
