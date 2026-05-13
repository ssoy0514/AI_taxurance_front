<script>
export default {
  props: {
    url: {
      type: String,
      required: true,
      default: '',
    },
    subTit: {
      type: String,
      required: true,
      default: '',
    },
    mainTit: {
      type: String,
      required: true,
      default: '',
    },
  },
  methods: {
    // 페이지 이동
    movePage() {
      this.$emit('move-page', this.url)
      // this.$router.push(this.url)
    },
  },
}
</script>

<template>
  <div class="link" @click="movePage">
    <p>{{ subTit }}<br />{{ mainTit }}</p>
    <!-- <i class="icon-l icon-arrow-link"></i> -->
  </div>
</template>

<style lang="scss" scoped>
.link {
  padding: 20px;
  border-radius: 16px;
  background: linear-gradient(100deg, #9ab7ff, #3e72e1);
  cursor: pointer;
  p {
    color: #fff;
    font-size: 17px;
    font-weight: 500;
    @include backgrounds('icon-angle-right.svg', right center);
  }
  button {
    @include flexbox();
    gap: 8px;
    width: 100%;
    height: 32px;
    margin-top: 10px;
    border-radius: 10px;
    border: 1px solid #c9d5e4;
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1),
      0px 1px 2px -1px rgba(0, 0, 0, 0.1);
    background-color: #fff;
    font-size: 14px;
    color: #155dfc;
    font-weight: 600;
  }
}
</style>
