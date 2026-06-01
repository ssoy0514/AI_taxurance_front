<script>
import RightView from '@/components/RightView.vue'
import Video from '@/components/Video.vue'
import Audio from '@/components/Audio.vue'
import Link from '@/components/Link.vue'
import Kollus from '~/components/Kollus.vue'
import { VideoList } from '@/utils/mockApi'

export default {
  name: 'play',
  components: { RightView, Video, Audio, Link, Kollus },

  data() {
    return {
      list: [],
      selectedTab: '전체',
      showFilter: false,
      isRepeat: false,
      isPlayAll: true,
    }
  },
  computed: {
    currentVideo() {
      const id = this.$route.query.id
      return this.list.find((v) => v.object_id === id)
    },
    tabs() {
      const allTags = this.list.flatMap((item) => item.tags)
      return ['전체', ...new Set(allTags)]
    },
    filteredList() {
      if (this.selectedTab === '전체') {
        return this.list
      }
      return this.list.filter((item) => item.tags.includes(this.selectedTab))
    },
  },
  created() {},
  watch: {
    // URL의 탭 쿼리가 변경될 때 selectedTab을 업데이트합니다.
    '$route.query.tab': {
      immediate: true,
      handler(newTab) {
        if (newTab) this.selectedTab = newTab
      },
    },
  },
  mounted() {
    this.fetchList()
    const tab = this.$route.query.tab
    if (tab) {
      this.setTab(tab)
    }
  },

  beforeDestroy() {},

  methods: {
    // 리스트 호출
    async fetchList() {
      this.list = VideoList()

      // const { infos, succ } = await this.$axios.post('/contents/list', {
      //   ext_type: this.$route.query.type,
      // })
      // if (succ) {
      //   this.list = infos
      // }
    },
    setTab(tab) {
      this.selectedTab = tab
      this.showFilter = false
    },
    toggleRepeat() {
      this.isRepeat = !this.isRepeat
      if (this.isRepeat) {
        this.isPlayAll = false
      }
    },
    togglePlayAll() {
      this.isPlayAll = !this.isPlayAll
      if (this.isPlayAll) {
        this.isRepeat = false
      }
    },
    playNext() {
      const currentIndex = this.list.findIndex(
        (item) => item.object_id === this.currentVideo?.object_id
      )
      if (currentIndex > -1 && currentIndex < this.list.length - 1) {
        const nextItem = this.list[currentIndex + 1]
        this.$router.push({
          name: 'play',
          query: {
            type: this.$route.query.type,
            tab: nextItem.tags[0],
            id: nextItem.object_id,
          },
        })
      }
    },
    formatViews(count) {
      if (!count) return 0
      if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M'
      }
      if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K'
      }
      return count
    },
  },
}
</script>
<template>
  <div class="contents">
    <div class="cont-main">
      <div class="cont-play" :class="$route.query.type">
        <section class="sec-view">
          <div class="sec-view-inner">
            <div class="view-video">
              <Kollus
                v-if="currentVideo"
                :key="currentVideo.object_id"
                :id="currentVideo.object_id"
                :isRepeat="isRepeat"
                :isPlayAll="isPlayAll"
                @play-next="playNext"
              ></Kollus>
            </div>
            <div class="view-info">
              <button :class="{ active: isRepeat }" @click="toggleRepeat">
                <i class="icon-m icon-repeat"></i>반복재생
              </button>
              <button :class="{ active: isPlayAll }" @click="togglePlayAll">
                <i class="icon-m icon-play-all"></i>연속재생
              </button>
              <p class="view-count">
                <i class="icon-m icon-eye"></i
                >{{ formatViews(currentVideo?.views) }}
              </p>
              <!-- <button>
                <i class="icon-m icon-like"></i>
                {{ currentVideo?.likes }}
              </button>
              <button>
                <i class="icon-m icon-dislike"></i>
                {{ currentVideo?.dislikes }}
              </button> -->
            </div>
            <div class="view-text scroll-y">
              <p>{{ currentVideo?.title }}</p>
              <p>{{ currentVideo?.desc }}</p>
            </div>
          </div>
        </section>
        <section class="sec-list scroll-y">
          <div class="view-text">
            <p>{{ currentVideo?.title }}</p>
            <p>{{ currentVideo?.desc }}</p>
          </div>
          <div class="list-filter">
            <div class="tab-st2">
              <button
                v-for="tab in tabs"
                :key="tab"
                :class="{ active: selectedTab === tab }"
                @click="setTab(tab)"
              >
                {{ tab }}
              </button>
            </div>
          </div>
          <!-- <div :class="['list-filter', { on: showFilter }]">
            <button class="filter-btn" @click="showFilter = !showFilter">
              {{ selectedTab }}<i class="icon-xs icon-arrow-down"></i>
            </button>
            <div class="filter-list">
              <button
                v-for="tab in tabs"
                :key="tab"
                :class="{ active: selectedTab === tab }"
                @click="setTab(tab)"
              >
                {{ tab }}
              </button>
            </div>
          </div> -->
          <ul>
            <li v-for="(item, idx) in filteredList" :key="idx">
              <Audio
                v-if="$route.query.type === 'audios'"
                :audio="item"
                type="link"
                :class="{ active: $route.query.id === item.object_id }"
              ></Audio>
              <Video
                v-if="$route.query.type === 'videos'"
                :video="item"
                type="link"
                :class="{ active: $route.query.id === item.object_id }"
              ></Video>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.cont-play {
  @include flexbox(flex-start, flex-start);
  width: 100%;
  height: 100%;
  // max-width: 1300px;
  margin: 0 auto;
  .sec-view {
    flex: 1;
    height: 100%;
    padding: rem(40) rem(20) 0 rem(30);
    &-inner {
      @include flexbox(flex-start, normal);
      flex-direction: column;
      max-width: 900px;
      height: 100%;
      margin: 0 auto;
    }
    .view-video {
      @include flexbox();
      width: 100%;
      height: 60%;
      // min-height: 400px;
      border-radius: 32px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      ::v-deep(.plyr--video) {
        width: 100%;
      }
    }
    .view-info {
      @include flexbox(flex-end);
      padding: rem(20);
      gap: rem(24);
      .view-count {
        @include flexbox();
        gap: 8px;
        color: #364153;
        font-size: 14px;
        i:before {
          background-color: #364153;
        }
      }
      button {
        @include flexbox();
        gap: 8px;
        padding: rem(8) rem(16);
        border-radius: 15px;
        background-color: #f3f4f6;
        font-size: 14px;
        i:before {
          background-color: #364153;
        }
        &.active {
          background-color: #101828;
          color: #fff;
          i:before {
            background-color: #fff;
          }
        }
      }
    }
  }
  .sec-list {
    width: 350px;
    height: 100%;
    padding: rem(40) rem(30) rem(30) rem(10);
    ul {
      display: grid;
      gap: rem(16);
      .active {
        box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
      }
    }
    .list-filter {
      position: relative;
      margin-bottom: rem(25);
      .filter-btn {
        @include flexbox();
        gap: 10px;
        padding: rem(7) rem(20);
        border-radius: 15px;
        background-color: #101828;
        color: #fff;
        font-size: 14px;
        i:before {
          background-color: #fff;
        }
      }
      .filter-list {
        display: none;
        position: absolute;
        width: 250px;
        padding: rem(5);
        border-radius: 0 20px 20px 20px;
        border-top: 1px solid #fff;
        background-color: #101828;
        z-index: 20;
        button {
          display: block;
          width: 100%;
          padding: rem(8) rem(16);
          border-radius: 15px;
          color: #fff;
          text-align: left;
          &.active {
            background-color: rgba(255, 255, 255, 0.2);
          }
        }
      }
      &.on {
        .filter-btn {
          border-radius: 15px 15px 0 0;
          i {
            transform: rotate(180deg);
          }
        }
        .filter-list {
          display: block;
        }
      }
    }
    .view-text {
      display: none;
    }
  }
}

.view-text {
  flex: 1;
  padding: rem(20) 0;
  p {
    &:nth-child(1) {
      color: #101828;
      font-size: rem(32);
      font-weight: 700;
    }
    &:nth-child(2) {
      margin-top: rem(20);
      color: #101828;
      font-size: rem(20);
      white-space: pre-line;
    }
  }
}
@media (hover: hover) {
}

@media (max-width: 768px) {
  .cont-play {
    flex-direction: column;
    .sec-view {
      width: 100%;
      height: 40%;
      padding: 0;
      .view-video {
        height: 100%;
        border-radius: 0;
        box-shadow: none;
        // aspect-ratio: 2 / 1;
      }
      .view-text {
        display: none;
      }
    }
    .sec-list {
      width: 100%;
      height: 60%;
      padding: 0 rem(30) rem(30);
      ul {
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      }
      .view-text {
        display: block;
      }
    }
    &.audios {
      .sec-view {
        height: 30%;
      }
      .sec-list {
        height: 70%;
      }
    }
  }
}
@media (max-width: 512px) {
  .cont-play {
    .sec-view {
      .view-video {
      }
      .view-text {
        padding-left: rem(30);
        padding-right: rem(30);
      }
    }
  }
}
</style>
