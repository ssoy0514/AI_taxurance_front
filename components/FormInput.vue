<template>
  <div class="form-input" :class="type">
    <input
      type="text"
      :value="value"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @input="$emit('input', $event.target.value)"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
      @keydown.down.prevent="$emit('arrow-down')"
      @keydown.up.prevent="$emit('arrow-up')"
      @keydown.enter.prevent="$emit('enter')"
    />
    <button
      v-if="clearable && value"
      type="button"
      class="btn-clear"
      @click="$emit('input', '')"
      title="삭제"
    >
      <i class="icon-m icon-clear"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'FormInput',
  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    clearable: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'basic', //basic, send
    },
  },
}
</script>

<style lang="scss" scoped>
.form-input {
  position: relative;
  width: 100%;
  input {
    position: relative;
    width: 100%;
    height: 52px;
    padding: 0 35px 0 20px;
    border-radius: 42px;
    border: 1px solid #b9caff;
    background-color: #fff;
    font-size: 15px;
    outline: 0;
  }
  &.send {
    input {
      width: 100%;
      height: rem(70);
      background-color: #ffffff;
      border-radius: rem(70);
      padding: 0 rem(32);
      border: 1px solid #deeaff;
      box-shadow: 0 4px 20px 0 #deeaff;
      &:focus {
        padding: 0 calc(rem(32) - 1px);
        border: 2px solid #3190ff;
      }
    }
  }
  .btn-clear {
    position: absolute;
    top: calc(50% - 10px);
    right: rem(32);
    width: 20px;
    height: 20px;
  }
}
</style>
