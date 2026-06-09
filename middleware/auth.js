export default async function ({ store }) {
  // 기기 정보 설정 (최초 1회 또는 필요시)
  store.dispatch('setDeviceType')

  // 사용자 정보가 없는 경우에만 fetchUser 실행
  if (!store.state.user) {
    await store.dispatch('fetchUser')
  }
}
