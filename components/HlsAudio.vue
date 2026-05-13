<template>
  <vue-plyr ref="plyr" :options="playerOptions">
    <audio controls crossorigin></audio>
  </vue-plyr>
</template>

<script>
import Hls from 'hls.js'

export default {
  props: ['src', 'id'],
  data() {
    return {
      hls: null,
      playerOptions: {
        iconUrl: '/image/plyr.svg',
      },
    }
  },
  computed: {
    globalPlayingId() {
      return this.$store.getters['audio/currentPlayingId']
    },
  },
  watch: {
    src(newSrc) {
      this.loadAudio(newSrc)
    },
    globalPlayingId(newId) {
      const player = this.$refs.plyr.player
      if (newId !== this.id && player && !player.paused) {
        player.pause()
      }
    },
  },
  mounted() {
    const player = this.$refs.plyr.player

    player.on('play', () => {
      if (this.globalPlayingId === this.id) return

      player.pause()

      this.fetchCheckHls((isOk) => {
        if (isOk) {
          this.$store.dispatch('audio/handleAudioPlay', this.id)
          player.play()
        } else {
          alert('현재 스트리밍 서비스를 이용할 수 없습니다.')
        }
      })
    })

    this.loadAudio(this.src)
  },
  beforeDestroy() {
    if (this.hls) {
      this.hls.destroy()
    }
  },
  methods: {
    // hls 제공여부 체크
    async fetchCheckHls(callback) {
      const { succ } = await this.$axios.get('/contents/hls/serving')
      if (succ) {
        callback(true)
      } else {
        callback(false)
      }
    },
    loadAudio(src) {
      if (!src) return

      const player = this.$refs.plyr.player
      const audio = player.media

      if (this.hls) this.hls.destroy()

      if (Hls.isSupported()) {
        this.hls = new Hls()
        this.hls.loadSource(src)
        this.hls.attachMedia(audio)
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = src
      }
    },
  },
}
</script>
