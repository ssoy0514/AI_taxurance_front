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
    // middleware: ['auth'],
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
    proxy: true, // axios 요청을 proxy 설정을 통해 보내도록 설정
    prefix: '/api/v1', // 모든 axios 요청 앞에 /api 프리픽스 자동 추가
    // timeout: Number(process.env.AXIOS_TIMEOUT || 3000),
    credentials: true, // 쿠키 기반 인증 시
  },
  proxy: {
    '/api/v1': {
      target: process.env.API_BASE_URL || 'http://localhost:5200',
      pathRewrite: { '^/api/v1': '' },
      changeOrigin: true,
      secure: false,
      selfHandleResponse: false, // 스트리밍 응답 버퍼링 방지
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
