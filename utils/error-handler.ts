// utils/error-handler.ts

let isError = false

export function handleCommonResponse(data: any, nuxtError: Function) {
  if (!data) return

  const { result_cd } = data

  if (isError) {
    throw new Error('에러 처리 진행 중...')
  }

  switch (result_cd) {
    case 'EP':
      isError = true
      alert('세션정보가 만료되었습니다. 첫화면으로 돌아갑니다.')
      window.location.href = '/'
      throw new Error('세션 만료')
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
