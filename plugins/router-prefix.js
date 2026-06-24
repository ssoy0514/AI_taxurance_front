// plugins/router-prefix.js
export default ({ app, store }) => {
  // 실제 내 PC(로컬)에서 구동 중인지 체크
  const isLocal =
    process.client &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)

  // 1. [핵심] 플러그인 시작 시 로컬 개발용 쿠키가 없다면 즉시 주입
  if (isLocal) {
    const currentCookies = document.cookie
    if (!currentCookies.includes('header_oamuser=')) {
      document.cookie = 'header_oamuser=DEV_USER_01; path=/;'
    }
    if (!currentCookies.includes('header_channel=')) {
      // 현재 경로가 /mo로 시작하면 mo, 아니면 pc를 기본값으로 주입
      const initialChannel = window.location.pathname.startsWith('/mo')
        ? 'mo'
        : 'pc'
      document.cookie = `header_channel=${initialChannel}; path=/;`
    }
  }

  // 라우터가 이동하기 직전(BeforeEach)에 가로챕니다.
  app.router.beforeEach((to, from, next) => {
    // 쿠키에서 현재 채널 확인 ('pc' 또는 'mo')
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        return parts.pop().split(';').shift()
      }
    }
    const channel = getCookie('header_channel') || 'pc' // 기본값은 'pc'
    console.log('[Router Prefix] Current Channel:', channel)

    // path가 '/' 일 때 로컬일 때는 /main 으로, 개발계, 검증계, 운영일 때 /pc/main 으로 리다이렉트
    if (to.path === '/') {
      if (isLocal) {
        window.location.href = '/main'
      } else {
        // 운영/개발 서버 환경에서는 서버를 거쳐 새로고침 되도록 window.location 사용
        if (process.client) {
          const queryString = window.location.search
          window.location.href = '/pc/main' + queryString
        }
      }
      return // next()를 호출하지 않아 라우터 이동 중단
    }

    // 채널이 모바일(mo)인데 현재 경로에 /mo 프리픽스가 없는 경우에만 추가
    if (channel === 'mo' && !to.path.startsWith('/mo')) {
      const targetPath = to.path === '/' ? '/mo' : `/mo${to.path}`

      // query나 params 정보도 유실되지 않도록 함께 넘겨줍니다.
      return next({
        path: targetPath,
        query: to.query,
        params: to.params,
        hash: to.hash,
      })
    }

    // 이미 프리픽스가 잘 붙어있다면 그대로 통과시킵니다.
    next()
  })
}
