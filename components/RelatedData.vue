<script>
import Link from '@/components/Link.vue'
import Audio from '@/components/Audio.vue'
import Video from '@/components/Video.vue'
import Rp from '@/components/Rp.vue'
import Images from '@/components/Images.vue'

export default {
  name: 'right-view',
  components: { Link, Audio, Video, Rp, Images },
  props: {
    relatedData: {
      type: Array,
      required: false,
      default: () => [],
    },
  },

  data() {
    return {}
  },
  computed: {
    isOpen() {
      return this.$store.state.isSidebarOpen
    },
    imageData() {
      return this.relatedData.filter((item) => item.ext_type === 'images')
    },
    videoData() {
      return this.relatedData.filter((item) => item.ext_type === 'videos')
    },
  },
  created() {},
  mounted() {},

  beforeDestroy() {},

  methods: {
    closeSidebar() {
      // this.$store.commit('SET_SIDEBAR', false)
      this.$emit('close')
    },
    changeView() {
      this.$store.commit('TOGGLE_SIDEBAR_SIZE')
    },
  },
}
</script>

<template>
  <div class="right-sidebar">
    <!-- <button v-if="!isSmall" @click="changeView">전체보기</button> -->

    <div class="sidebar-tit">
      <p>관련자료</p>
      <button @click="closeSidebar">
        <i class="icon-m icon-xmark"></i>
      </button>
    </div>
    <div class="wrap-thumb scroll-y">
      <div v-if="imageData.length > 0">
        <Images
          v-for="(img, idx) in imageData"
          :key="idx"
          :imgName="img.name"
        ></Images>
      </div>
      <div v-if="videoData.length > 0">
        <Video
          v-for="(item, idx) in videoData"
          :key="idx"
          :video="item"
        ></Video>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.right-sidebar {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  gap: 15px;
  flex-shrink: 0;
  width: 360px;
  max-height: calc(100vh - 300px);
  margin-top: 20px;
  padding: rem(28) rem(30);
  border-radius: 20px;
  border: 3px solid transparent;
  box-shadow: 0 5px 20px 10px rgba(0, 0, 0, 0.25);
  background: linear-gradient(180deg, #fcfdfe, #e3e9f4 71%, #f4ecf6) padding-box,
    linear-gradient(117deg, #7a89ff, #3c22ff 40%, #77d4ff) border-box;
  @media (max-width: 400px) {
    width: 300px;
  }
  .sidebar-tit {
    @include flexbox(space-between, center);
    p {
      @include flexbox(flex-start, center);
      gap: 8px;
      color: #000;
      font-size: 20px;
      font-weight: 700;
    }
    .icon-xmark:before {
      background-color: #000;
    }
  }
  .wrap-thumb {
    @include flexbox(flex-start, normal);
    flex-direction: column;
    gap: 10px;
    .info-card {
      + .info-card {
        margin-top: 10px;
      }
    }
  }
}
// @media (max-width: 1024px) {
//   .right-sidebar {
//     position: absolute;
//     top: 77px;
//     right: 0;
//     box-shadow: 0 5px 20px 10px rgba(0, 0, 0, 0.25);
//     z-index: 100;
//   }
// }
</style>
