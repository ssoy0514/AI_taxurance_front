<script>
import log from '@/mixins/log'

export default {
  name: 'fortunePage',
  mixins: [log],

  data() {
    return { loaded: false }
  },

  mounted() {
    window.addEventListener('message', this.handleMessage)
  },

  beforeDestroy() {
    window.removeEventListener('message', this.handleMessage)
  },

  methods: {
    handleMessage(event) {
      if (event.data?.type !== 'fortune_log') return
      this._sendClickLog(event.data.status)
    },
  },
}
</script>

<template>
  <div class="fortune-wrap">
    <iframe
      src="/fortunepage.html"
      class="fortune-frame"
      frameborder="0"
      scrolling="auto"
      @load="loaded = true"
    />
  </div>
</template>

<style lang="scss" scoped>
.fortune-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fortune-frame {
  flex: 1;
  width: 100%;
  min-height: calc(100vh - 70px);
  border: none;
}
</style>
