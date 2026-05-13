<script>
import Link from '@/components/Link.vue'
import Audio from '@/components/Audio.vue'
import Video from '@/components/Video.vue'
import Rp from '@/components/Rp.vue'
import Images from '@/components/Images.vue'
import Pdf from '@/components/Pdf.vue'

export default {
  name: 'right-view',
  components: { Link, Audio, Video, Rp, Images, Pdf },

  data() {
    return {
      rankAudios: [],
      rankVideos: [],
      pdfUrl: process.env.pdfUrl,
    }
  },
  computed: {
    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },
    selectedTabIndex() {
      return this.$store.getters['relatedItems/getTabIndex']
    },
    relatedItems() {
      return this.$store.getters['relatedItems/getItems']
    },
    imageData() {
      return this.relatedItems.filter((item) => item.ext_type === 'images')
    },
    audioData() {
      return this.relatedItems.filter((item) => item.ext_type === 'audios')
    },
    videoData() {
      return this.relatedItems.filter((item) => item.ext_type === 'videos')
    },
    pdfData() {
      return this.relatedItems.filter((item) => item.ext_type === 'pdfs')
    },
  },
  created() {},
  mounted() {
    this.fetchRankAudios()
    this.fetchRankVideos()
  },

  beforeDestroy() {},

  methods: {
    async fetchRankAudios() {
      const { items, succ } = await this.$axios.post('/contents/rank/score', {
        ext_type: 'audios',
        limit: 2,
      })
      if (succ) {
        this.rankAudios = items
      }
    },
    async fetchRankVideos() {
      const { items, succ } = await this.$axios.post('/contents/rank/score', {
        ext_type: 'videos',
        limit: 2,
      })
      if (succ) {
        this.rankVideos = items
      }
    },
    toggleSidebar() {
      this.$store.commit('TOGGLE_SIDEBAR')
    },
    openSidebar() {
      this.$store.commit('SET_SIDEBAR', true)
    },
    closeSidebar() {
      this.$store.commit('SET_SIDEBAR', false)
    },
    showPopup(data) {
      if (data.ext_type === 'pdfs') {
        if (!!navigator.mimeTypes['application/pdf']) {
          this.$emit('show-popup', data)
        } else {
          window.open(this.pdfUrl + data.name)
        }
      } else {
        this.$emit('show-popup', data)
      }
    },
    movePage(url) {
      this.$router.push(url)
      this.closeSidebar()
    },
    toggleTab(tabIndex) {
      this.$store.dispatch('relatedItems/setTab', tabIndex)
      this.openSidebar()
    },
  },
}
</script>

<template>
  <div class="right-sidebar" :class="{ on: isSidebarOpen }">
    <div class="sidebar-header">
      <div class="tabs">
        <button
          class="tab tab1"
          :class="{ active: selectedTabIndex === 0 }"
          @click="toggleTab(0)"
          v-if="relatedItems.length > 0"
        >
          <i class="icon-m icon-file-lines"></i>
          관련자료
          <i v-if="!isSidebarOpen" class="icon-xs icon-arrow-down"></i>
        </button>
        <button
          class="tab tab2"
          :class="{
            active: selectedTabIndex === 1 || relatedItems.length === 0,
          }"
          @click="toggleTab(1)"
        >
          <i class="icon-m icon-twinkle"></i>
          AI 추천
          <i v-if="!isSidebarOpen" class="icon-xs icon-arrow-down"></i>
        </button>
      </div>
      <button class="btn-close" @click="closeSidebar">
        <i class="icon-m icon-xmark"></i>
      </button>
    </div>
    <!-- 탭1 관련자료 -->
    <div
      class="side-contents scroll-y"
      v-if="relatedItems.length > 0 && selectedTabIndex === 0"
    >
      <div class="sidebar-section" v-if="audioData.length > 0">
        <div class="section-tit">
          <p class="tit">
            <span class="division"></span>
            <i class="icon-s icon-audio"></i>팟캐스트
            <span class="division"></span>
          </p>
        </div>
        <Audio
          v-for="(item, idx) in audioData"
          :key="idx"
          :audio="item"
          @show-popup="showPopup(item)"
        ></Audio>
      </div>
      <div class="sidebar-section" v-if="videoData.length > 0">
        <div class="section-tit">
          <p class="tit">
            <span class="division"></span>
            <i class="icon-s icon-video"></i>숏츠 영상
            <span class="division"></span>
          </p>
        </div>
        <Video
          v-for="(item, idx) in videoData"
          :key="idx"
          :video="item"
          @show-popup="showPopup(item)"
        ></Video>
      </div>
      <div class="sidebar-section" v-if="imageData.length > 0">
        <div class="section-tit">
          <p class="tit">
            <span class="division"></span>
            <i class="icon-m icon-image"></i>이미지
            <span class="division"></span>
          </p>
        </div>
        <Images
          v-for="(img, idx) in imageData"
          :key="idx"
          :image="img"
          @show-popup="showPopup(img)"
        ></Images>
      </div>
      <div class="sidebar-section" v-if="pdfData.length > 0">
        <div class="section-tit">
          <p class="tit">
            <span class="division"></span>
            <i class="icon-m icon-file-pdf"></i>PDF
            <span class="division"></span>
          </p>
        </div>
        <Pdf
          v-for="(item, idx) in pdfData"
          :key="idx"
          :pdf="item"
          @show-popup="showPopup(item)"
        ></Pdf>
      </div>
    </div>
    <!-- 탭2 추천 -->
    <div class="side-contents scroll-y" v-else>
      <div class="sidebar-section">
        <div class="section-tit">
          <p class="tit">
            <img src="/image/icon-menu1.svg" alt="" />영업 노하우 묻기
          </p>
        </div>
        <ul>
          <li v-if="$route.path !== '/sales/product-info'">
            <Link
              :url="'/sales/product-info'"
              :subTit="'상품 이해부터 클로징까지'"
              :mainTit="'상품별 상담 전략'"
              @move-page="movePage"
            ></Link>
          </li>
          <li v-if="$route.path !== '/sales/design-bible'">
            <Link
              :url="'/sales/design-bible'"
              :subTit="'명인들의 보장설계'"
              :mainTit="'실전 화법 공개'"
              @move-page="movePage"
            ></Link>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="section-tit">
          <p class="tit">
            <img src="/image/icon-video.svg" alt="" />숏츠 영상 보기
          </p>
          <button class="btn-txt" @click="movePage('/shorts')">
            전체보기
            <i class="icon-xxs icon-angle-right"></i>
          </button>
        </div>
        <ul>
          <li v-for="(item, idx) in rankVideos" :key="idx">
            <Video
              :video="item"
              :type="'main'"
              @show-popup="showPopup(item)"
            ></Video>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="section-tit">
          <p class="tit">
            <img src="/image/icon-audio.svg" alt="" />팟캐스트 듣기
          </p>
          <button class="btn-txt" @click="movePage('/podcast')">
            전체보기
            <i class="icon-xxs icon-angle-right"></i>
          </button>
        </div>
        <ul>
          <li v-for="(item, idx) in rankAudios" :key="idx">
            <Audio
              :audio="item"
              :type="'main'"
              @show-popup="showPopup(item)"
            ></Audio>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.right-sidebar {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  position: fixed;
  top: 0;
  right: 0;
  z-index: 99;
  &.on {
    bottom: 0;
    overflow: hidden;
    width: 90%;
    max-width: 360px;
    border: 3px solid transparent;
    border-radius: 20px;
    box-shadow: 0 5px 20px 10px rgba(0, 0, 0, 0.25);
    background: linear-gradient(180deg, #fcfdfe, #e3e9f4 71%, #f4ecf6)
        padding-box,
      linear-gradient(117deg, #7a89ff, #3c22ff 40%, #77d4ff) border-box;
    .sidebar-header {
      justify-content: space-between;
      position: relative;
      width: 100%;
      height: 56px;
      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      .btn-close {
        display: block;
      }
      .tabs {
        @media (max-width: 512px) {
          .tab {
            font-size: 15px;
          }
        }
      }
    }
    .side-contents {
      height: auto;
      padding: rem(28) rem(30);
      opacity: 1;
      transition: all 0.3s;
    }
  }
  .sidebar-header {
    @include flexbox(flex-end, center);
    flex-shrink: 0;
    position: absolute;
    top: 0;
    right: 0;
    height: 60px;
    padding: 0 rem(30);
    .tabs {
      @include flexbox(flex-start, flex-end);
      gap: rem(10);
      .tab {
        @include flexbox();
        gap: 4px;
        height: 40px;
        padding: 0 rem(10);
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        border: 2px solid transparent;
        background: linear-gradient(#fff) padding-box,
          linear-gradient(135deg, #155dfc, #9d39ff) border-box;
        color: #333;
        .icon-file-lines::before {
          background: linear-gradient(135deg, #155dfc, #9d39ff) border-box;
        }
        .icon-twinkle:before {
          background: linear-gradient(135deg, #155dfc, #9d39ff) border-box;
        }
        &.active {
          border: none;
          background: linear-gradient(135deg, #155dfc, #9d39ff);
          color: #fff;
          .icon-file-lines:before {
            background: #fff;
          }
          .icon-twinkle:before {
            background: #fff;
          }
          .icon-arrow-down:before {
            background: #fff;
          }
        }
      }
      @media (max-width: 512px) {
        .tab {
          font-size: 0;
        }
      }
    }

    .btn-close {
      display: none;
    }

    .btn-arrow {
      width: 34px;
      height: 34px;
      border-radius: 100%;
      background-color: #155dfc;
      i:before {
        background-color: #fff !important;
      }
      z-index: 100;
    }
  }
  .side-contents {
    @include flexbox(flex-start, normal);
    flex-direction: column;
    gap: rem(30);
    height: 0;
    padding: 0 rem(30);
    opacity: 0;
    transition: none;
  }

  .sidebar-section {
    .section-tit {
      @include flexbox(space-between, center);
      margin-bottom: 12px;
    }
    .tit {
      @include flexbox(flex-start, center);
      gap: 8px;
      color: #000;
      font-size: 14px;
      font-weight: 700;
      i:before {
        background-color: #000;
      }
      &:only-child {
        width: 100%;
      }
      .division {
        flex: 1;
        height: 2px;
        &:first-child {
          background: linear-gradient(to right, transparent, #666);
        }
        &:last-child {
          background: linear-gradient(to left, transparent, #666);
        }
      }
    }
    ul {
      li {
        &:not(:first-child) {
          margin-top: 10px;
        }
      }
    }
  }
}
</style>
