<script>
export default {
  props: {
    image: {},
  },
  data() {
    return {
      imgUrl: process.env.imgUrl,
    }
  },
  methods: {
    openUrl(url) {
      window.open(url)
    },
    showPopup(item) {
      this.$emit('show-popup')
    },
  },
}
</script>

<template>
  <div class="info-card" @click="showPopup(image)">
    <img :src="imgUrl + image.name" alt="" />
    <p>{{ image.name?.replaceAll('_', ' ').replaceAll('.png', '') }}</p>
  </div>
</template>

<style lang="scss" scoped>
.info-card {
  @include flexbox(space-between, center);
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  height: auto;
  padding: 10px;
  border: 1px solid #bedbff;
  border-radius: 14px;
  background: #fff;
  border-radius: 14px;
  cursor: pointer;
  img {
    object-fit: contain;
    width: 100%;
    height: 100%;
  }
  p {
    font-size: 14px;
  }
}
</style>
