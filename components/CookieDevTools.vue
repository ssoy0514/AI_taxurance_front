<template>
  <div v-if="isDev" class="cookie-dev-tools">
    <div class="dev-header">
      <span>🛠 Dev Cookie Tools</span>
      <button class="close-btn" @click="isVisible = !isVisible">
        {{ isVisible ? 'Collapse' : 'Open' }}
      </button>
    </div>
    <div v-show="isVisible" class="dev-content">
      <div class="tool-row">
        <label>User ID:</label>
        <input v-model="userId" placeholder="예: DEV_USER_01" />
      </div>
      <div class="tool-row">
        <label>Channel:</label>
        <select v-model="channel">
          <option value="pc">PC (Default)</option>
          <option value="mo">Mobile (mo)</option>
        </select>
      </div>
      <button class="apply-btn" @click="applyAndRefresh">
        적용 및 새로고침
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CookieDevTools',
  data() {
    return {
      isVisible: true,
      userId: '',
      channel: 'pc',
    }
  },
  computed: {
    isDev() {
      return process.env.NODE_ENV === 'development'
    },
  },
  mounted() {
    if (this.isDev) {
      this.userId = this.getCookie('header_oamuser') || 'DEV_USER_01'
      this.channel = this.getCookie('header_channel') || 'pc'
    }
  },
  methods: {
    getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
    },
    applyAndRefresh() {
      // 쿠키 세팅 (경로는 root로 설정하여 모든 페이지에서 접근 가능하게 함)
      document.cookie = `header_oamuser=${this.userId}; path=/;`
      document.cookie = `header_channel=${this.channel}; path=/;`

      // 변경된 쿠키를 바탕으로 앱을 다시 로드
      window.location.reload()
    },
  },
}
</script>

<style scoped>
.cookie-dev-tools {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  background: #1e1e1e;
  color: #00ff00;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  width: 220px;
}
.dev-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid #333;
  padding-bottom: 5px;
}
.close-btn {
  background: none;
  border: 1px solid #444;
  color: #888;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
}
.tool-row {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tool-row label {
  color: #aaa;
}
input,
select {
  background: #2d2d2d;
  color: #fff;
  border: 1px solid #444;
  padding: 4px;
  border-radius: 4px;
  outline: none;
}
.apply-btn {
  width: 100%;
  padding: 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.apply-btn:hover {
  background: #0056b3;
}
</style>
