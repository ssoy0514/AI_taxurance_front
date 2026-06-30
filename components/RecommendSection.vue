<script>
import HlsAudio from '@/components/HlsAudio.vue'
import VideoThumbnail from '@/components/VideoThumbnail.vue'
import DetailView from '@/components/DetailView.vue'

export default {
  name: 'RecommendSection',
  components: { HlsAudio, VideoThumbnail, DetailView },
  props: {
    type: {
      type: String, // 'video', 'audio', 'card'
      required: true,
    },
    items: {
      type: Array,
      required: false,
      default: () => [],
    },
  },
  data() {
    return {
      swiperOption: {
        slidesPerView: 1,
        spaceBetween: 0,
        effect: 'fade',
        centeredSlides: true,
        autoHeight: true,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        on: {
          init: function () {
            const self = this
            setTimeout(() => {
              self.slideTo(0, 0)
            }, 10)
          },
        },
        // navigation: {
        //   nextEl: '.swiper-button-next',
        //   prevEl: '.swiper-button-prev',
        // },
      },
      width: 0,
      baseUrl: process.env.baseUrl,
      showDetail: false,
      detailData: null,
    }
  },
  watch: {
    isSidebarOpen(value) {
      this.$nextTick(() => {
        if (this.mySwiper) {
          this.mySwiper.update()
        }
      })
    },
  },
  computed: {
    // 비디오/오디오 타입이고 데이터가 2개 이상일 때만 슬라이드 활성화
    isSliderActive() {
      return (
        (this.type === 'video' || this.type === 'audio') &&
        this.items &&
        this.items.length > 1
      )
    },
    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },
    maxWidth() {
      if (this.width < 900) {
        return `${this.width}px`
      }
    },
  },
  methods: {
    setWidth() {
      this.$nextTick(() => {
        this.width = window.innerWidth
      })
    },
    viewVideo(item) {
      this.$router.push({
        name: 'play',
        query: {
          type: 'videos',
          tab: item.tags[0],
          id: item.object_id,
        },
      })
    },
    viewAudio(item) {
      this.$router.push({
        name: 'play',
        query: {
          type: 'audios',
          tab: item.tags[0],
          id: item.object_id,
        },
      })
    },
    getLinkPath(link_type) {
      const routes = {
        compass: '/sales/product-info',
        design_bible: '/sales/design-bible',
      }
      return routes[link_type] || '/'
    },
  },
  mounted() {
    this.setWidth()
    window.addEventListener('resize', this.setWidth)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.setWidth)
  },
}
</script>

<template>
  <div v-if="items && items.length > 0">
    <template v-if="type === 'card'">
      <section v-for="(item, index) in items" :key="index">
        <div class="wrap-recommend" :class="'wrap-recommend' + item.order">
          <div class="top">
            <p class="tag">{{ item?.top_tag }}</p>
            <p class="tit">
              <span class="txt1">{{ item?.top_text }}</span>
              <span class="txt2">{{ item?.bottom_text }}</span>
            </p>
            <p class="desc">{{ item?.desc }}</p>
          </div>
          <div class="btm">
            <div
              v-if="item?.videos && item.videos.length > 0"
              class="type-video"
            >
              <button
                v-for="(v, i) in item?.videos"
                :key="i"
                class="btn-play"
                @click="viewVideo(v)"
              >
                <i class="icon-m icon-play"></i>숏츠 보기
              </button>
            </div>

            <div
              v-if="item?.audios && item?.audios.length > 0"
              class="type-audios"
            >
              <button
                v-for="(a, i) in item?.audios"
                :key="i"
                class="btn-play"
                @click="viewAudio(a)"
              >
                <i class="icon-m icon-play"></i>팟캐스트 듣기
              </button>
            </div>

            <div v-if="item?.links && item?.links.length > 0" class="type-link">
              <nuxt-link
                v-for="(link, i) in item.links"
                :key="i"
                class="btn-link"
                :to="getLinkPath(link.link_type)"
              >
                {{ link.name }}<i class="icon-m icon-arrow-link"></i>
              </nuxt-link>
            </div>
          </div>
          <img class="img-center" :src="`/image/bg-flow.svg`" alt="" />
        </div>
      </section>
    </template>
    <template v-else>
      <section
        :style="{ maxWidth: maxWidth }"
        class="refer-slide-section"
        v-if="isSliderActive"
        v-swiper:mySwiper="swiperOption"
      >
        <div class="swiper-wrapper">
          <div v-for="(item, index) in items" :key="index" class="swiper-slide">
            <div class="wrap-recommend" :class="type">
              <div class="top">
                <p class="tag">{{ item?.tags[0] }}</p>

                <p class="tit">
                  <span class="txt1">{{ item?.top_text }}</span>
                  <span class="txt2">{{ item?.bottom_text }}</span>
                </p>
                <p class="desc ellipsis-twoline">{{ item?.desc }}</p>
              </div>

              <div class="btm">
                <div v-if="type === 'video'" class="type-video">
                  <button class="btn-play" @click="viewVideo(item)">
                    <i class="icon-m icon-play"></i>재생하기
                  </button>
                </div>
                <div v-if="type === 'audio'" class="type-audios">
                  <button class="btn-play" @click="viewAudio(item)">
                    <i class="icon-m icon-play"></i>재생하기
                  </button>
                </div>
              </div>
              <img
                v-if="type === 'video'"
                src="/image/bg-main-highfive.svg"
                alt=""
              />
            </div>
          </div>
        </div>
        <div class="swiper-pagination"></div>
        <!-- <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div> -->
      </section>

      <template v-else>
        <section v-for="(item, index) in items" :key="index">
          <div class="wrap-recommend" :class="type">
            <div class="top">
              <p class="tag">{{ item?.tags[0] }}</p>
              <p class="tit">
                <span class="txt1">{{ item?.top_text }}</span>
                <span class="txt2">{{ item?.bottom_text }}</span>
              </p>
            </div>
            <div class="btm">
              <div v-if="type === 'video'" class="type-video">
                <button class="btn-play" @click="viewVideo(item)">
                  <i class="icon-m icon-play"></i>재생하기
                </button>
              </div>
              <div v-if="type === 'audio'" class="type-audios">
                <button class="btn-play" @click="viewAudio(item)">
                  <i class="icon-m icon-play"></i>재생하기
                </button>
              </div>
            </div>
          </div>
        </section>
      </template>
    </template>

    <detail-view
      v-if="showDetail"
      @close-popup="showDetail = false"
      :data="detailData"
    />
  </div>
</template>

<style>
.swiper-pagination-bullet {
  background-color: #fff;
}
</style>
<style lang="scss" scoped>
section {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 rem(30);
  overflow: hidden;
  &:not(:first-child) {
    margin-top: rem(25);
  }

  @media (max-width: 1440px) {
    max-width: 900px;
  }

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.swiper-slide {
  width: 100% !important;
}
.wrap-recommend {
  @include flexbox(space-between, normal);
  flex-direction: column;
  gap: rem(50);
  // min-height: rem(460);
  position: relative;
  overflow: hidden;
  padding: rem(50) rem(40);
  border-radius: 32px;
  background-color: #101828;
  // @include backgrounds('bg-flow.svg', 70% center, #101828);
  &.audio {
    @include backgrounds('bg-main-audio.png', center right, #101828);
    background-size: 50%;
  }
  &.video {
    img {
      position: absolute;
      top: 50%;
      right: 5%;
      width: 30%;
      transform: translateY(-50%);
    }
  }
  img {
    position: absolute;
    top: 50%;
    right: 5%;
    width: 30%;
    transform: translateY(-50%);
  }
  .img-center {
    right: 25%;
    width: auto;
    height: 100%;
    opacity: 0.4;
  }
  .top {
    @include flexbox(flex-start, flex-start);
    flex-direction: column;
    gap: rem(15);
    position: relative;
    z-index: 1;
    .tag {
      padding: rem(7) rem(12);
      border-radius: 20px;
      background-color: rgba(194, 122, 255, 0.2);
      border: 0.6px solid rgba(194, 122, 255, 0.3);
      font-size: 12px;
      color: #e9d4ff;
    }
    .tit {
      font-size: rem(40);
      font-weight: 700;
      line-height: 1.3;
      .txt1 {
        color: #fff;
      }
      .txt2 {
        display: block;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)),
          linear-gradient(90deg, #ae74ff, #ff7c7e);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }
    .desc {
      font-size: rem(20);
      color: #fff;
      white-space: pre-line;
    }
  }
  .btm {
    @include flexbox(flex-start, flex-start);
    flex-wrap: wrap;
    gap: rem(15);
    position: relative;
    z-index: 1;
    [class^='type-'] {
      @include inlineFlexbox(flex-start, flex-start);
      flex-wrap: wrap;
      gap: rem(10);
    }
    .type-audios {
      .btn-play {
        background-color: #c27aff;
      }
    }
  }
  [class^='btn-'] {
    @include flexbox(space-between, center);
    gap: 10px;
    height: rem(60);
    padding: 0 rem(40);
    border-radius: rem(30);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    color: #fff;
    font-size: rem(22);
    text-align: left;
  }
  .btn-link {
    background: #155dfc;
    i {
      width: 24px;
      height: 24px;
      border-radius: 100%;
      background: #fff;
      &:before {
        background: #155dfc;
      }
    }
  }
  .btn-play {
    background: #d14a6a;
    i:before {
      background-color: #fff;
    }
  }
  //첫번째 카드
  &.wrap-recommend1 {
    // min-height: rem(600);
    background: linear-gradient(135deg, #23297a, #3f57b0);
    &:before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: rem(578);
      height: rem(569);
      @include backgrounds('bg-main-light.png', top right);
      background-size: contain;
      opacity: 0.9;
    }
    .top {
      .tag {
        border-color: rgba(153, 200, 255, 0.3);
        background-color: rgba(13, 20, 95, 0.42);
        color: #fff;
        font-size: rem(20);
        font-weight: 700;
      }
      .tit {
        font-size: rem(56);
        span {
          font-size: rem(42);
        }
      }
      .desc {
        font-size: rem(24);
      }
    }
  }
  //메가커피이벤트
  &.wrap-recommend2 {
    @include backgrounds('bg-main-mega.png', 100% bottom, #101828);
    background-size: auto 80%;
    .top {
      .tag {
        border-color: rgba(254, 230, 133, 0.2);
        background-color: rgba(254, 230, 133, 0.1);
        color: rgba(254, 230, 133, 1);
      }
      .txt1 {
        display: block;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)),
          linear-gradient(90deg, #fee685, #fef9c2 37.98%, #ffc800);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .txt2 {
        color: #fff;
        background: none;
        background-clip: initial;
        -webkit-text-fill-color: #fff;
      }
    }
  }
  //구름이
  &.wrap-recommend4,
  &.wrap-recommend5 {
    @include backgrounds('bg-main-goorm.png', 100% bottom, #101828);
    background-size: auto 80%;
    .top {
      .tag {
        border-color: rgba(153, 200, 255, 0.3);
        background-color: rgba(43, 127, 255, 0.2);
        color: #99c8ff;
      }
      .txt1 {
        display: block;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)),
          linear-gradient(90deg, #51a2ff, #c27aff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .txt2 {
        color: #fff;
        background: none;
        background-clip: initial;
        -webkit-text-fill-color: #fff;
      }
    }
  }
  //동구
  &.wrap-recommend6,
  &.wrap-recommend9,
  &.wrap-recommend10,
  &.wrap-recommend14 {
    @include backgrounds('bg-main-dongu.png', 92% bottom, #101828);
    background-size: auto 80%;
    .top {
      .tag {
        border-color: rgba(153, 200, 255, 0.3);
        background-color: rgba(43, 127, 255, 0.2);
        color: #99c8ff;
      }
      .txt1 {
        display: block;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)),
          linear-gradient(90deg, #51a2ff, #c27aff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .txt2 {
        color: #fff;
        background: none;
        background-clip: initial;
        -webkit-text-fill-color: #fff;
      }
    }
  }
  //토양이
  &.wrap-recommend11,
  &.wrap-recommend12 {
    @include backgrounds('bg-main-toyang.png', 92% bottom, #101828);
    background-size: auto 80%;
    .top {
      .tag {
        border-color: rgba(153, 200, 255, 0.3);
        background-color: rgba(43, 127, 255, 0.2);
        color: #99c8ff;
      }
      .txt1 {
        display: block;
        background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)),
          linear-gradient(90deg, #51a2ff, #c27aff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .txt2 {
        color: #fff;
        background: none;
        background-clip: initial;
        -webkit-text-fill-color: #fff;
      }
    }
  }
  //책
  &.wrap-recommend3,
  &.wrap-recommend8,
  &.wrap-recommend17 {
    @include backgrounds('bg-main-book.svg', 90% center, #101828);
    background-size: auto 30%;
  }
  //열쇠
  &.wrap-recommend13,
  &.wrap-recommend19,
  &.wrap-recommend20 {
    @include backgrounds('bg-main-key.svg', 92% center, #101828);
    background-size: auto 60%;
  }
  //오디오
  &.wrap-recommend15,
  &.wrap-recommend16,
  &.wrap-recommend18 {
    @include backgrounds('bg-main-audio.png', 100% center, #101828);
    background-size: auto 70%;
  }
  //하이파이브
  &.wrap-recommend7,
  &.wrap-recommend21,
  &.wrap-recommend22 {
    @include backgrounds('bg-main-highfive.svg', 92% center, #101828);
    background-size: auto 60%;
  }
}
</style>
