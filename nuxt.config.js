// nuxt.config.js
require('dotenv').config()

export default {
  env: {
    authUrl: process.env.AUTH_URL,
    apiUrl: process.env.API_BASE_URL,
    imgUrl: process.env.IMAGE_URL,
    videoUrl: process.env.VIDEO_URL,
    audioUrl: process.env.AUDIO_URL,
    pdfUrl: process.env.PDF_URL,
    baseUrl: process.env.BASE_URL,
    // 보험피터(코칭트랙) 전용 백엔드 주소 - AI Search 백엔드(API_BASE_URL)와는 별개의 서비스
    API_URL: process.env.COACHING_TRACK_API_URL || '',
    DEV_API_URL: process.env.COACHING_TRACK_DEV_API_URL || 'http://localhost:8000',
    // taxurance3(프롬프트 테스트) 전용 백엔드 주소 - 로컬 개발은 8000, 내부망 배포는 빈 값(같은 origin)
    // ||는 빈 문자열도 "설정 안 됨"으로 취급해버려서 undefined만 걸러야 함
    TAXURANCE_API_BASE:
      process.env.TAXURANCE_API_BASE !== undefined
        ? process.env.TAXURANCE_API_BASE
        : 'http://localhost:8003',
  },
  head: {
    title: 'FC AI Search',
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
      },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/image/logo.svg' }],
    script: [
      ...(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'qa'
        ? [
            {
              src: 'https://file.kollus.com/vgcontroller/vg-controller-client.latest.min.js', // 로컬 파일 경로로 변경
              body: true, // body 태그 하단에 삽입하여 파싱 차단 방지
            },
          ]
        : []),
    ],
  },
  ssr: false, // CSR 모드로 설정
  router: {
    middleware: ['auth'],
    extendRoutes(routes, resolve) {
      const bridgeRoutes = []

      routes.forEach((route) => {
        // /mo 프리픽스 라우트 생성
        bridgeRoutes.push({
          ...route,
          path: route.path === '/' ? '/mo' : `/mo${route.path}`,
          name: route.name ? `mo-${route.name}` : undefined,
        })
        // /pc 프리픽스 라우트 생성
        bridgeRoutes.push({
          ...route,
          path: route.path === '/' ? '/pc' : `/pc${route.path}`,
          name: route.name ? `pc-${route.name}` : undefined,
        })
      })

      // 기존 라우터 세팅에 /pc와 /mo가 붙은 라우터들을 합쳐줍니다.
      routes.push(...bridgeRoutes)
    },
  },
  server: {
    port: process.env.PORT || 5200,
    host: process.env.HOST || '0.0.0.0',
  },
  modules: ['@nuxtjs/axios', '@nuxtjs/proxy'],
  axios: {
    proxy: true,
    prefix: '/api',
  },
  proxy: {
    '/api/': {
      // TEMP(Gemini 테스트용): 로컬에서는 API_BASE_URL 자체를 상대경로(/api)로 바꿔서
      // $stream.fetchStream도 이 프록시를 타게 만들었기 때문에(.env.local 참고), 프록시의
      // 실제 타겟은 PROXY_TARGET_URL로 분리. 설정 안 된 환경(dev/qa/prod)은 기존처럼 API_BASE_URL 사용.
      target: process.env.PROXY_TARGET_URL || process.env.API_BASE_URL,
      pathRewrite: { '^/api': '' },
      changeOrigin: true,
      secure: false,
    },
  },
  plugins: [
    '~/plugins/axios.ts',
    '~/plugins/stream.ts',
    '~/plugins/router-prefix.js',
    { src: '~/plugins/chartjs.client', mode: 'client' },
    { src: '~/plugins/vue-plyr.client', mode: 'client' },
    { src: '@/plugins/vue-awesome-swiper.client', mode: 'client' },
  ],
  buildModules: ['@nuxt/typescript-build', '@nuxtjs/style-resources'],
  css: [
    'github-markdown-css/github-markdown-light.css',
    { src: '@/assets/styles/main.scss', lang: 'scss' },
  ],
  styleResources: {
    scss: ['@/assets/styles/common.scss'],
  },
  serverMiddleware: [
    '~/server-middleware/session.js',
    '~/server-middleware/ie-check.js',
    process.env.MOCK_HEADERS === '1'
      ? { path: '/', handler: '~/server-middleware/mock-headers.js' }
      : undefined,
  ].filter(Boolean),
  build: {
    loaders: {
      scss: { implementation: require('sass') },
      sass: { implementation: require('sass') },
    },
    babel: {
      plugins: [
        ['@babel/plugin-transform-class-properties', { loose: true }],
        ['@babel/plugin-transform-private-methods', { loose: true }],
        ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      ],
    },
  },
  render: {
    static: {
      maxAge: 0,
    },
    http2: { push: true },
  },
  hooks: {
    'render:route': (url, result, context) => {
      context.res.setHeader(
        'cache-control',
        'no-cache, no-store, must-revalidate'
      )
      context.res.setHeader('Pragma', 'no-cache')
      context.res.setHeader('Expires', '0')
    },
  },
}
