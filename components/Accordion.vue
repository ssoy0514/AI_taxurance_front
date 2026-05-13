<template>
  <div class="accordion">
    <div v-for="(section, idx) in sections" :key="idx" class="accordion-item">
      <!-- header -->
      <div class="accordion-header">
        <slot
          name="header"
          :section="section"
          :idx="idx"
          :isOpen="isOpen(idx)"
        />
        <!-- toggle slot (있으면 slot, 없으면 기본 버튼) -->
        <slot
          name="toggle"
          :section="section"
          :idx="idx"
          :isOpen="isOpen(idx)"
          :toggle="toggle"
        >
          <button
            type="button"
            class="btn-toggle"
            :class="{ on: isOpen(idx) }"
            @click="toggle(idx)"
          >
            <i class="icon-m icon-caret-down"></i>
          </button>
        </slot>
      </div>

      <!-- body -->
      <transition name="accordion">
        <div v-show="isOpen(idx)" class="accordion-body">
          <slot name="body" :section="section" :idx="idx" />
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    sections: {
      type: Array,
      required: true,
    },
    multiple: {
      type: Boolean,
      default: true, // 여러 개 열림 가능
    },
    defaultOpen: {
      type: Boolean,
      default: true, // 디폴트로 모두 열림
    },
  },
  data() {
    return {
      openIndexes: [],
    }
  },
  mounted() {
    // 기본으로 전부 열어두기
    if (this.defaultOpen) {
      this.openIndexes = this.sections.map((_, idx) => idx)
    }
  },
  methods: {
    toggle(idx) {
      if (this.multiple) {
        if (this.openIndexes.includes(idx)) {
          this.openIndexes = this.openIndexes.filter((i) => i !== idx)
        } else {
          this.openIndexes.push(idx)
        }
      } else {
        this.openIndexes = this.openIndexes.includes(idx) ? [] : [idx]
      }
    },
    isOpen(idx) {
      return this.openIndexes.includes(idx)
    },
  },
}
</script>

<style lang="scss" scoped>
.accordion-header {
  position: relative;
  .btn-toggle {
    position: absolute;
    right: 15px;
    top: 10px;
    i::before {
      background-color: $colorPrimary;
    }
    &.on {
      transform: rotate(180deg);
    }
  }
}
</style>
