<script>
export default {
  name: 'Lnb',
  components: {},
  props: {
    isShow: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      menuData: [
        {
          title: '상품나침반',
          id: 'SALES_01',
          path: '/sales/product-info',
          icon: 'icon-prd-info',
          items: [],
          active: true,
        },
        {
          title: '보장설계 바이블',
          id: 'SALES_02',
          path: '/sales/design-bible',
          icon: 'icon-bible',
          items: [],
          active: true,
        },
        {
          title: '숏츠 영상 보기',
          id: 'SHORTS',
          path: '/shorts',
          icon: 'icon-video',
          items: [],
          active: true,
        },
        {
          title: '팟캐스트 듣기',
          id: 'PODCAST',
          path: '/podcast',
          icon: 'icon-audio',
          items: [],
          active: true,
        },
      ],
    }
  },

  computed: {
    user() {
      return this.$store.state.user
    },
  },

  methods: {
    handleClickHome() {
      this.$router.push('/main')
    },
    emitClose() {
      this.$emit('close-menu')
    },
  },
}
</script>

<template>
  <div class="wrap-lnb" :class="{ on: isShow }">
    <div class="lnb-top">
      <h1 @click="handleClickHome">
        <img class="icon-logo" src="/image/logo.svg" alt="" />
        <span>AI</span>Search
      </h1>

      <button class="btn-close" type="button" @click="emitClose">
        <i class="icon-mm icon-xmark"></i>
      </button>
    </div>
    <nav>
      <ul class="main-depth">
        <li v-for="(item, index) in menuData" :key="index">
          <nuxt-link
            v-if="item.path"
            :to="item.path"
            class="main-tit"
            :class="{ 'disabled-link': !item.active }"
            @click.native="emitClose"
            ><i :class="['icon-m', item.icon]"></i>
            {{ item.title }}
          </nuxt-link>
          <p v-else class="main-tit" :class="{ 'disabled-link': !item.active }">
            <i :class="['icon-m', item.icon]"></i>
            {{ item.title }}
          </p>
          <ul class="sub-depth" v-if="item.items && item.items.length > 0">
            <li v-for="(sub, i) in item.items" :key="i">
              <nuxt-link
                :to="sub.path"
                :class="{ 'disabled-link': !sub.active }"
                >{{ sub.name }}
              </nuxt-link>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
    <div class="lnb-user" v-if="user.name">
      <div class="user-initials">{{ user.name ? user.name[0] : '' }}</div>
      <p class="user-name">{{ user?.name }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrap-lnb {
  position: absolute;
  top: 0;
  left: 0;
  @include flexbox(space-between, normal);
  flex-direction: column;
  width: 260px;
  height: 100%;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  background-color: #fff;
  z-index: 11;
  .lnb-top {
    @include flexbox(space-between, center);
    gap: 8px;
    height: 70px;
    padding: 0 24px;
    font-size: 17px;
    color: #070707;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-close {
    display: none;
  }
  nav {
    flex: 1;
    padding: 12px 40px 20px 20px;
    li {
      width: 100%;
      color: #6a7282;
      font-size: 14px;
    }
    .main-depth {
      @include flexbox(flex-start, flex-start);
      flex-direction: column;
      // gap: 19px;
      flex-shrink: 0;
      .main-tit {
        @include flexbox(flex-start);
        gap: 12px;
        padding: 14px 12px;
        color: #62748e;
        font-weight: 600;
      }
      a.nuxt-link-active {
        border-radius: 10px;
        background-color: #000;
        color: #fff;
        i:before {
          background-color: #fff;
        }
      }
    }
    .sub-depth {
      @include flexbox(flex-start, flex-start);
      flex-direction: column;
      gap: 8px;
      margin-left: 30px;
      a {
        @include flexbox(flex-start);
        height: 40px;
        padding: 0 16px;
        border: 1px solid #f3e8ff;
        border-radius: 14px;
        color: #1d293d;
        font-size: 13px;
      }
      a.nuxt-link-exact-active {
        // border-color: #f7f6ff;
        background-color: #e8e6f8;
        color: #000;
      }
    }
  }
  .lnb-user {
    @include flexbox(flex-start, center);
    gap: 12px;
    height: 80px;
    padding: 20px 24px;
    border-top: 1px solid #f3f4f6;
    .user-initials {
      @include flexbox();
      width: 40px;
      height: 40px;
      border: 1px solid #fff;
      border-radius: 19174000px;
      box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.1),
        0px 1px 2px -1px rgba(0, 0, 0, 0.1);
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      color: #155dfc;
      font-size: 16px;
      font-weight: 700;
    }
    .user-name {
      color: #101828;
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.disabled-link {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
@media (max-width: 1280px) {
  .wrap-lnb {
    position: absolute;
    height: auto;
    top: 0;
    left: -100%;
    border-radius: 0 20px 20px 0;
    z-index: 1001;
    &.on {
      left: 0;
      transition: all 0.5s;
    }
    .btn-close {
      display: block;
      width: 32px;
      height: 32px;
    }
    .wrap-util {
      display: flex;
    }
  }
}
</style>
