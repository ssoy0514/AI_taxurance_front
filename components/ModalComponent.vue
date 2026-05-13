<template>
  <div class="modal" @click.self="emitClose">
    <div :class="['modal__inner', sizeClass]" role="dialog" aria-modal="true">
      <div class="modal__header">
        <div class="header-title">
          <slot name="heading"></slot>
        </div>
        <button class="btn-close" type="button" @click="emitClose">
          <i class="icon-l icon-xmark"></i>
        </button>
      </div>

      <div class="modal__content scroll-y">
        <slot></slot>
      </div>
      <div class="modal__footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalComponent',
  props: {
    size: {
      type: String,
      default: 'lg',
      validator: (value) =>
        ['xs', 'sm', 'md', 'lg', 'xl', 'full'].includes(value),
    },
  },
  computed: {
    sizeClass() {
      return `size-${this.size}`
    },
  },
  methods: {
    emitClose() {
      this.$emit('close-popup')
    },
  },
}
</script>

<style lang="scss" scoped>
.modal {
  @include flexbox();
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: rem(20);
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;

  &__inner {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
    max-height: 100%;
    // min-height: 650px;
    border: 1px solid #155dfc;
    border-radius: 30px;
    background: #fff;
    text-align: left;
    &.size-xs {
      max-width: 320px;
    }
    &.size-sm {
      max-width: 400px;
    }
    &.size-md {
      max-width: 500px;
    }
    &.size-lg {
      max-width: 800px;
    }
    &.size-xl {
      max-width: 1140px;
      min-height: 100%;
    }
    &.size-full {
      max-width: 100%;
    }
    object {
      height: calc(100vh - 200px);
    }
  }

  &__header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    padding: 0 rem(30);

    .header-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      color: #000;
      font-size: 18px;
    }

    .btn-close {
      width: 25px;
      height: 25px;
    }
  }

  &__content {
    display: flex;
    flex: 1;
    padding: rem(0) rem(30) rem(20);
    // max-height: calc(100vh - 250px);
  }

  &__footer {
    @include flexbox();
    gap: 10px;
    padding: 18px 20px 20px;
    button {
      width: auto;
    }
  }
}
@media (max-width: 512px) {
  .modal {
    padding: 0;
    &__inner {
      min-height: 100%;
      object {
        height: 100%;
      }
    }
  }
}
</style>
