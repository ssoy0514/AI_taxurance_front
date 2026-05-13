<template>
  <iframe
    width="100%"
    height="100%"
    :src="currentSrc"
    frameborder="0"
    allowfullscreen
    webkitallowfullscreen
    mozallowfullscreen
    allow="local-network-access"
  ></iframe>
</template>

<script>
export default {
  props: {
    id: { type: String, require: true },
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
  mounted() {},
  beforeDestroy() {},
  methods: {
    async getVideo(id) {
      const res = await this.$axios.get(`/contents/${id}`)
      const url = res.kollus_url
      const connector = url.includes('?') ? '&' : '?'
      this.currentSrc = `${url}${connector}autoplay=1`
    },
  },
}
</script>
