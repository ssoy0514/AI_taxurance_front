<template>
  <iframe
    v-if="kollusSrc"
    ref="kollusPlayer"
    width="100%"
    height="100%"
    :src="currentSrc"
    frameborder="0"
    allowfullscreen
    webkitallowfullscreen
    mozallowfullscreen
    allow="autoplay; local-network-access"
    @load="onIframeLoad"
  ></iframe>
</template>

<script>
export default {
  props: {
    id: { type: String, required: false },
    isRepeat: { type: Boolean, default: false },
    isPlayAll: { type: Boolean, default: false },
  },
  data() {
    return {
      currentSrc: '',
    }
  },
  watch: {
    id: {
      immediate: true,
      handler(newId) {
        if (newId) {
          this.getVideo(newId)
        }
      },
    },
  },
  created() {
    this.vgController = null
  },
  beforeDestroy() {
    if (this.vgController) {
      this.vgController = null
    }
  },
  methods: {
    async getVideo(id) {
      const res = await this.$axios.get(`/contents/${id}`)
      const url = res.kollus_url
      const connector = url.includes('?') ? '&' : '?'
      this.currentSrc = `${url}${connector}autoplay=1`
    },
    onIframeLoad() {
      if (!window.VgControllerClient) return

      if (this.vgController) {
        this.vgController = null
      }

      try {
        this.vgController = new window.VgControllerClient({
          target_window: this.$refs.kollusPlayer.contentWindow,
        })

        // URL 플래그 외에 컨트롤러를 통해 명시적으로 재생 실행
        this.vgController.play()

        // 재생 종료 시 반복 재생 또는 다음 영상 재생
        this.vgController.on('done', () => {
          console.log('영상 재생 완료 이벤트 수신')
          if (this.isRepeat) {
            this.vgController.play(0)
          } else if (this.isPlayAll) {
            this.$emit('play-next')
          }
        })
        console.log('VgController initialized for ID:', this.id)
      } catch (e) {
        console.error('VgController 초기화 실패:', e)
      }
    },
  },
}
</script>
