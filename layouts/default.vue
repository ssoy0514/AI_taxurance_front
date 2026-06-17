<script>
import Header from '@/components/Header.vue'
import Lnb from '@/components/Lnb.vue'
import RightView from '@/components/RightView.vue'
import DetailView from '@/components/DetailView.vue'
import GlobalLoading from '@/components/GlobalLoading.vue'
import CookieDevTools from '@/components/CookieDevTools.vue'

export default {
  name: 'defaultLayout',
  components: {
    Header,
    Lnb,
    RightView,
    DetailView,
    GlobalLoading,
    CookieDevTools,
  },
  data() {
    return {
      mobileMenu: false,
      height: 0,
      showDetail: false,
      popupData: {},
    }
  },
  computed: {
    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },
  },
  methods: {
    toggleMenu() {
      this.mobileMenu = !this.mobileMenu
    },
    setHeight() {
      this.$nextTick(() => {
        this.height = window.innerHeight
        this.mobileMenu = false
      })
    },
    showPopup(data) {
      this.popupData = data
      this.showDetail = true
    },
  },
  mounted() {
    this.setHeight()
    window.addEventListener('resize', this.setHeight)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.setHeight)
  },
}
</script>

<template>
  <client-only>
    <div class="wrap" :style="{ height: height + 'px' }">
      <Header @show-menu="toggleMenu" />
      <div class="container" :class="{ 'side-on': isSidebarOpen }">
        <Lnb :isShow="mobileMenu" @close-menu="toggleMenu" />
        <div class="dim" v-show="mobileMenu" @click="toggleMenu"></div>
        <main>
          <nuxt />
          <!-- <nuxt
            keep-alive
            :keep-alive-props="{
              include: ['DesignBible'],
            }"
          /> -->
          <RightView @show-popup="showPopup"></RightView>
          <DetailView
            v-if="showDetail"
            @close-popup="showDetail = false"
            :data="popupData"
          ></DetailView>
        </main>
      </div>
      <GlobalLoading />
    </div>
  </client-only>
</template>
<style lang="scss" scoped>
.wrap {
  display: flex;
  flex-direction: column;
  &.admin {
    header {
      background-color: #000;
    }
  }
}
.container {
  height: 100%;
  display: flex;
  &.side-on {
    padding-right: 360px;
  }
}
main {
  flex: 1;
  display: flex;
  padding: 60px 0 0 260px;
  @media (max-width: 1280px) {
    padding-left: 0;
  }
}
@media (max-width: 1280px) {
  .dim {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.35);
    z-index: 1000;
  }
}
@media (max-width: 1024px) {
  .container {
    &.side-on {
      padding-right: 0;
    }
  }
}
</style>
