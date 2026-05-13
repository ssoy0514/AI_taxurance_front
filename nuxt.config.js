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
  },
  ssr: true,
  server: {
    port: process.env.PORT || 5200,
    host: process.env.HOST || '0.0.0.0',
  },
  modules: ['@nuxtjs/axios', '@nuxtjs/proxy'],
  axios: {
    baseURL: process.env.API_BASE_URL || '', // SSR
    browserBaseURL: process.env.API_BASE_URL || '', // CSR
    // timeout: Number(process.env.AXIOS_TIMEOUT || 3000),
    // credentials: true, // 쿠키 기반 인증 시
    // proxy: false, // 'api' 프록시를 직접 구성하므로 false 유지
  },
  proxy: {
    '/api/': {
      target: process.env.API_BASE_URL || '',
      pathRewrite: { '^/api/': '/api/' },
      changeOrigin: true,
    },
  },
  plugins: [
    '~/plugins/axios.ts',
    '~/plugins/stream.ts',
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
