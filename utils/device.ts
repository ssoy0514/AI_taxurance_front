/**
 * User Agent 정보를 바탕으로 디바이스 타입을 반환합니다.
 * @param {string} ua - req.headers['user-agent']
 * @returns {'tablet' | 'mo' | 'pc'}
 */
export const getDeviceType = (ua: string): string => {
  if (!ua) return 'pc'

  const tabletRegex =
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i
  const mobileRegex =
    /(mobi|ip(hone|od)|blackberry|opera m(ob|in)i|phone|blackberry|iemobile|kindle|silk|hpwos)/i

  if (tabletRegex.test(ua)) {
    return 'tablet'
  } else if (mobileRegex.test(ua)) {
    return 'mo'
  }

  return 'pc'
}
