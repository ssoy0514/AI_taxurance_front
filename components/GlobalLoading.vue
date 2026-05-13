<template>
  <transition name="fade">
    <div v-if="isLoading" class="overlay" role="status" aria-busy="true">
      <div class="spinner" />
      <span class="label">{{ message }}</span>
    </div>
  </transition>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'GlobalLoading',
  computed: {
    ...mapGetters(['isLoading', 'message']), // ✅ 모듈화 안 했으니 네임스페이스 제거
  },
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  z-index: 9999;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}
.label {
  color: #fff;
  font-size: 15px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
