<script>
export default {
  asyncData({ query, error }) {
    const statusCode = Number(query.statusCode) || 500
    let message = query.message || ''

    // message가 JSON 문자열(객체 형태)인 경우 파싱하여 실제 메시지만 추출
    if (typeof message === 'string' && message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message)
        // 서버 응답의 message, msg, 혹은 오타인 massage 필드까지 체크하여 추출
        message = parsed.message || parsed.msg || parsed.massage || ''
      } catch (e) {
        // 파싱에 실패하면 빈 값으로 처리하여 layout의 기본 메시지가 나오도록 유도
        message = ''
      }
    }

    error({ statusCode, message })
  },
}
</script>
