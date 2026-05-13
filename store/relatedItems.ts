// store/relatedData.ts
import { ActionTree, GetterTree, MutationTree } from 'vuex'
import { RootState } from './index'

export interface Item {
  bottom_text: string
  created_at: string
  desc: string
  dislikes: number
  duration: number
  ext: string
  ext_type: string
  file_hash: string
  hls: string
  hls_status: string
  likes: number
  name: string
  tags: string[]
  thumbnail: string
  title: string
  top_text: string
  updated_at: string
  uploader: string
  views: number
}

export const state = () => ({
  itemList: [] as Item[],
  selectedTabIndex: 0,
})

export type ItemState = ReturnType<typeof state>

export const getters: GetterTree<ItemState, RootState> = {
  getItems: (state) => state.itemList,
  getTabIndex: (state) => state.selectedTabIndex,
}

export const mutations: MutationTree<ItemState> = {
  SET_ITEMS(state, items: Item[]) {
    state.itemList = items
  },
  CLEAR_ITEMS(state) {
    state.itemList = []
  },
  SET_TAB_INDEX(state, value) {
    state.selectedTabIndex = value
  },
}

export const actions: ActionTree<ItemState, RootState> = {
  saveItems({ commit }, items: Item[]) {
    commit('SET_ITEMS', items)
  },
  clear({ commit }) {
    commit('CLEAR_ITEMS')
  },
  setTab({ commit }, value: Number) {
    commit('SET_TAB_INDEX', value)
  },
}
