import { Plugin } from '@nuxt/types'
import { NuxtAxiosInstance } from '@nuxtjs/axios'
import { handleCommonResponse } from '~/utils/error-handler'

const axiosPlugin: Plugin = (ctx) => {
  const { $axios, req, redirect, store, isDev, error: nuxtError } = ctx
  const ax: NuxtAxiosInstance = $axios

  ax.setHeader('X-Requested-With', 'XMLHttpRequest')

  // 공통 요청 인터셉터
  ax.onRequest((config: any) => {
    // 쿠키 방식 통신을 위해 Credentials 허용
    config.withCredentials = true
    config.headers['channel'] = store.state.device

    return config
  })

  // 공통 응답 인터셉터
  ax.onResponse(async (res: any) => {
    const { data, config, headers } = res

    // blob 응답일 때도 JSON 에러인지 확인
    if (config.responseType === 'blob') {
      const contentType = headers['content-type']
      if (contentType?.includes('application/json')) {
        // blob -> JSON 변환
        const text = await data.text()
        const json = JSON.parse(text)

        handleCommonResponse(json, nuxtError)
      }
      return res
    }

    handleCommonResponse(data, nuxtError)
    return data
  })

  // 공통 에러 인터셉터
  ax.onError((error: any) => {
    const status = error.response?.status || 0
    const data = error.response?.data
    const url = error.config?.url
    const msg = error.response?.data?.detail || error.response?.data?.err

    if (status === 404) nuxtError({ statusCode: 404 })
    handleCommonResponse(data, nuxtError)
    return Promise.reject(error)
  })
}

export default axiosPlugin
