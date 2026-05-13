<template>
  <vue-plyr ref="plyr" :options="playerOptions">
    <video controls crossorigin playsinline></video>
  </vue-plyr>
</template>

<script>
import Hls from 'hls.js'

export default {
  props: {
    src: { type: String, require: true },
    id: { type: String, require: true },
    // poster: { type: String, require: true },
  },
  data() {
    return {
      baseUrl: process.env.baseUrl,
      hls: null,
      playerOptions: {
        iconUrl: '/image/plyr.svg',
      },
      isFirstPlay: false,
      isChecking: false,
    }
  },
  watch: {
    src: {
      immediate: true,
      handler(newSrc) {
        if (newSrc) {
          this.isFirstPlay = true
          this.isChecking = false
          this.$nextTick(() => {
            this.loadHlsVideo(this.baseUrl + newSrc)
          })
        }
      },
    },
  },
  mounted() {},
  beforeDestroy() {
    // 메모리 누수 방지를 위해 페이지 떠날 때 HLS 인스턴스 파기
    if (this.hls) {
      this.hls.destroy()
    }
  },
  methods: {
    loadHlsVideo(source) {
      if (!source || !this.$refs.plyr) return

      const player = this.$refs.plyr.player
      const video = player.media

      if (this.hls) this.hls.destroy()

      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(source)
        this.hls.attachMedia(video)

        this.hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          // 자동 재생 시도 전에 직접 체크 로직 실행
          await this.handleCheckAndPlay()
        })
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 등 네이티브 HLS 지원 브라우저
        video.src = source
        this.handleCheckAndPlay()
      }
    },

    async handleCheckAndPlay() {
      if (!this.isFirstPlay || this.isChecking) return

      const player = this.$refs.plyr.player
      this.isChecking = true

      try {
        const { succ } = await this.$axios.get('/contents/hls/serving')
        // const succ = false
        if (succ) {
          this.isFirstPlay = false
          await player.play().catch((err) => {})
          this.increaseCount(this.id)
        } else {
          this.isChecking = false
          alert('현재 스트리밍 서비스를 이용할 수 없습니다.')
          player.stop()
        }
      } catch (error) {
      } finally {
        this.isChecking = false
      }
    },

    async increaseCount(id) {
      try {
        await this.$axios.post('/contents/inc/view', {
          name: id,
          ext_type: 'videos',
        })
      } catch (err) {
        console.error('[카운트 증가 실패]', err)
      }
    },
  },
}
</script>
