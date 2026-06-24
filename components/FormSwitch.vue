<template>
  <label
    class="form-switch"
    :class="{ 'is-on': value, 'is-disabled': disabled, 'has-label': labeled }"
  >
    <input
      type="checkbox"
      :checked="value"
      :disabled="disabled"
      @change="$emit('input', $event.target.checked)"
    />
    <span class="track">
      <span v-if="labeled" class="track-label">{{
        value ? onText : offText
      }}</span>
      <span class="knob"></span>
    </span>
  </label>
</template>

<script>
export default {
  name: 'FormSwitch',
  model: {
    prop: 'value',
    event: 'input',
  },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    labeled: {
      type: Boolean,
      default: false,
    },
    onText: {
      type: String,
      default: 'ON',
    },
    offText: {
      type: String,
      default: 'OFF',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style lang="scss" scoped>
$track-width: 44px;
$track-height: 24px;
$knob-size: 18px;
$track-width-labeled: 60px;
$track-height-labeled: 28px;
$knob-size-labeled: 22px;

.form-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  input {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
  }

  .track {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: $track-width;
    height: $track-height;
    border-radius: $track-height;
    background-color: #ccc;
    transition: background-color 0.2s ease;

    .knob {
      position: absolute;
      left: 3px;
      width: $knob-size;
      height: $knob-size;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
      transition: left 0.2s ease;
    }

    .track-label {
      display: none;
    }
  }

  &.is-on .track {
    background-color: $colorPrimary;

    .knob {
      left: calc(100% - #{$knob-size} - 3px);
    }
  }

  &.has-label .track {
    width: $track-width-labeled;
    height: $track-height-labeled;
    border-radius: $track-height-labeled;
    justify-content: flex-end;
    padding-right: 7px;

    .knob {
      width: $knob-size-labeled;
      height: $knob-size-labeled;
      left: 3px;
    }

    .track-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.3px;
    }
  }

  &.has-label.is-on .track {
    justify-content: flex-start;
    padding-right: 0;
    padding-left: 7px;

    .knob {
      left: calc(100% - #{$knob-size-labeled} - 3px);
    }
  }

  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
