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
  } else if (isTouchDevice()) {
    // UA상으로는 PC이지만 터치가 가능한 경우 (예: iPad Pro 데스크톱 모드 등)
    return 'tablet'
  }

  return 'pc'
}

/**
 * 현재 디바이스가 터치를 지원하는지 여부를 반환합니다.
 * @returns {boolean}
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
