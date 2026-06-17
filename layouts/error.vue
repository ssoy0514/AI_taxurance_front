<template>
  <div class="error-wrap" :data-status="statusCode">
    <div class="error-card">
      <!-- <h1 class="code">{{ statusCode }}</h1> -->
      <div class="img">
        <i class="icon-xxxl icon-circle-exclamation"></i>
      </div>
      <p class="title">{{ title }}</p>
      <p class="desc" v-if="desc">{{ desc }}</p>

      <div class="actions" v-if="statusCode !== 422 && statusCode !== 405">
        <nuxt-link to="/" class="btn-l btn-main" v-if="statusCode !== 403"
          >홈으로</nuxt-link
        >
        <button
          class="btn-l btn-gray"
          @click="goBack"
          v-if="statusCode !== 403"
        >
          이전으로
        </button>
        <button class="btn-l btn-gray" v-if="canRetry" @click="retry">
          다시 시도
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'errorLayout',
  name: 'error',
  props: {
    error: {
      type: Object,
      default: () => ({}),
    },
  },
  computed: {
    statusCode() {
      const code = this.error?.statusCode || this.error?.status || 500
      return Number(code)
    },
    title() {
      if (this.statusCode === 404) return '페이지를 찾을 수 없습니다.'
      if (this.statusCode === 403) return '접근 권한이 없습니다.'
      if (this.statusCode === 405)
        return '액세스 토큰 처리 중 오류가 발생했습니다. 관리자에게 문의해 주세요.'
      if (this.statusCode === 409)
        return '이미 처리 중이거나 충돌이 발생했습니다.'
      if (this.statusCode >= 500) return '서버에서 오류가 발생했습니다.'

      return this.error.message || '알 수 없는 오류가 발생했습니다.'
    },
    desc() {
      if (this.statusCode === 404) return '주소가 정확한지 확인해 주세요.'
      // if (this.statusCode === 401 || this.statusCode === 403)
      //   return '접근 권한이 없거나 인증이 필요합니다.'
      if (this.statusCode >= 500)
        return '잠시 후 다시 시도해 주세요. 문제가 지속되면 관리자에게 문의해 주세요.'
      return ''
    },
    canRetry() {
      // 5xx, 네트워크 계열 등에서만 '다시 시도' 버튼 노출
      return this.statusCode >= 500 || this.statusCode === 0
    },
  },
  methods: {
    retry() {
      if (process.client) window.location.reload()
    },
    goBack() {
      if (process.client) {
        if (window.history.length > 1) window.history.back()
        else this.$router.replace('/')
      }
    },
  },
}
</script>

<style scoped>
.error-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: radial-gradient(
      1200px 400px at 50% -20%,
      rgba(0, 0, 0, 0.05),
      transparent 60%
    ),
    #f7f7f8;
}
.error-card {
  width: 100%;
  max-width: 640px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  padding: 32px 20px;
  text-align: center;
}
.code {
  font-size: 80px;
  line-height: 1;
  margin: 0 0 8px;
  letter-spacing: -2px;
}
.img {
  i::before {
    background-color: #0a2342;
  }
}
.title {
  color: #0a2342;
  font-size: 20px;
  font-weight: 700;
  margin-top: 8px;
}
.desc {
  margin-top: 8px;
  color: #666;
  font-size: 16px;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 30px 0 4px;
}

@media (max-width: 480px) {
  .code {
    font-size: 64px;
  }
}
</style>
