<template>
  <div class="step">
    <span class="sd-dots">
      <span
        v-for="n in totalStep"
        :key="n"
        class="sd-dot"
        :class="dotClass(n - 1)"
        :style="delayStyle(n - 1)"
      >
        <span v-if="dotClass(n - 1) === 'done'" class="check"
          ><i class="icon-xxs icon-check"></i
        ></span>
      </span>
    </span>
    <p class="sd-text">{{ label }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ step: number; totalStep: number; label: string }>()

function dotClass(idx: number) {
  if (idx < props.step) return 'done' // 완료
  if (idx === props.step) return 'active' // 진행중
  return 'wait' // 대기
}
function delayStyle(idx: number) {
  return { animationDelay: `${idx * 0.15}s` }
}
</script>

<style lang="scss" scoped>
.step {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: rem(10);
}
.sd-text {
  color: $colorPrimary;
  font-size: 15px;
}
.sd-dots {
  display: inline-grid;
  grid-auto-flow: column;
  align-items: center;
  gap: rem(6);
}

.sd-dot {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: grid;
  place-items: center;
}
/* 완료 */
.sd-dot.done {
  background: $colorPrimary;
}
.sd-dot.done .check {
  line-height: 1;
}
/* 진행중(깜빡) */
.sd-dot.active {
  background: $colorPrimary;
  animation: sd-blink 1s ease-in-out infinite;
}
@keyframes sd-blink {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
/* 대기 */
.sd-dot.wait {
  background: #d1d5db;
}
</style>
