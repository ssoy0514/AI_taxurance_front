// store/audio.ts
import { ActionTree, MutationTree, GetterTree } from 'vuex'
import { RootState } from './index'

export const state = () => ({
  currentPlayingId: null as string,
})

export type AudioState = ReturnType<typeof state>

export const getters: GetterTree<AudioState, RootState> = {
  currentPlayingId: (state) => state.currentPlayingId,
}

export const mutations: MutationTree<AudioState> = {
  SET_CURRENT_PLAYING_ID(state, payload) {
    state.currentPlayingId = payload
  },
}

export const actions: ActionTree<AudioState, RootState> = {
  async handleAudioPlay({ commit, dispatch }, id) {
    commit('SET_CURRENT_PLAYING_ID', id)

    await dispatch('increaseAudioCount', id)
  },
  async increaseAudioCount({ rootState }, id) {
    try {
      await this.$axios.post('/contents/inc/view', {
        name: id,
        ext_type: 'audios',
      })
    } catch (err) {
      console.error('[카운트 증가 실패]', err)
    }
  },
}
