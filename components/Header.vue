<script>
export default {
  name: 'Header',
  data() {
    return {}
  },
  computed: {
    user() {
      return this.$store.state.user
    },
    isOpen() {
      return this.$store.state.isSidebarOpen
    },
  },
  methods: {
    handleClickHome() {
      this.$router.push('/main')
    },
    emitShow() {
      this.$emit('show-menu')
    },
    showRightView() {
      this.$store.commit('TOGGLE_SIDEBAR')
    },
  },
}
</script>

<template>
  <header>
    <div class="header-l">
      <button class="btn-m-menu" @click="emitShow">메뉴</button>
      <h1 @click="handleClickHome">
        <img class="icon-logo" src="/image/logo.svg" alt="" />
        <span>AI</span> Search
      </h1>
    </div>
  </header>
</template>

<style lang="scss" scoped>
header {
  position: absolute;
  top: 0;
  left: 0;
  @include flexbox(space-between, center);
  width: 100%;
  height: 60px;
  padding: 0 rem(30);
  border-bottom: 1px solid rgba(229, 231, 235, 0.6);
  background: #fff;
  z-index: 10;
  .header-l {
    @include flexbox();
    gap: 10px;
  }
  .btn-m-menu {
    display: none;
  }
}

@media (max-width: 1280px) {
  header {
    // height: 60px;
    // justify-content: center;
    // .wrap-util {
    //   display: none;
    // }
    .btn-m-menu {
      display: block;
      // position: absolute;
      top: 15px;
      left: 15px;
      width: 30px;
      height: 30px;
      @include backgrounds('icon-bars.svg');
      background-size: 17px;
      font-size: 0;
    }
    .btn-m-search {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 30px;
      height: 30px;
      @include backgrounds('icon_glass.svg', center, $color3);
      background-size: 30px;
      font-size: 0;
    }
  }
}
</style>
