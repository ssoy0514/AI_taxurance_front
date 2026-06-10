// utils/error-handler.ts

let isError = false

/**
 * 세션 만료 및 재접속 처리를 수행합니다. (중복 처리 방지 포함)
 */
export function handleSessionTimeout(nuxtError: Function) {
  if (isError) {
    throw new Error('에러 처리 진행 중...')
  }
  isError = true

  if (window.location.pathname.includes('mo')) {
    alert('다시접속')
    nuxtError({
      statusCode: 422,
      message: '다시 접속해주세요',
    })
    throw new Error('다시 접속해주세요')
  } else {
    alert('세션정보가 만료되었습니다. 첫화면으로 돌아갑니다.')
    window.location.href = '/'
    throw new Error('세션 만료')
  }
}

export function handleCommonResponse(data: any, nuxtError: Function) {
  if (!data) return

  const { result_cd } = data

  if (isError) {
    throw new Error('에러 처리 진행 중...')
  }

  switch (result_cd) {
    case 'EP':
      handleSessionTimeout(nuxtError)
      break
    case 'NA':
      nuxtError({
        statusCode: 403,
      })
      throw new Error('권한 없음')
    case 'BE':
      nuxtError({
        statusCode: 403,
      })
      throw new Error('권한 없음')
    case 'SE':
      nuxtError({
        statusCode: 500,
      })
      throw new Error('서버 오류')
    default:
      break
  }
}
