<!-- components/TabComponent.vue -->
<template>
  <div class="tabs">
    <!-- 탭 헤더 -->
    <div class="tab-headers" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        :class="{ active: selectedIndex === index }"
        role="tab"
        :aria-selected="selectedIndex === index"
        :tabindex="selectedIndex === index ? 0 : -1"
        @click="onSelect(index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 탭 콘텐츠: 모든 패널을 항상 마운트하고 v-show로 토글 -->
    <div class="tab-content">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.slotName"
        class="tab-panel"
        role="tabpanel"
        :aria-hidden="selectedIndex !== index"
        v-show="selectedIndex === index || keepMounted"
      >
        <slot :name="tab.slotName" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface TabItem {
  label: string
  slotName: string
}

/**
 * keepMounted: true면 모든 패널을 항상 마운트합니다 (권장)
 * false면 현재 패널만 렌더합니다 (기존 동작과 유사) - 이 경우 캔버스는 다시 그려야 함
 */
const props = defineProps<{
  tabList: TabItem[]
  modelValue?: number // 선택 인덱스를 외부에서 제어하고 싶을 때 (v-model)
  keepMounted?: boolean // 기본 true
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const tabs = computed(() => props.tabList)
const keepMounted = computed(() => props.keepMounted ?? true)

// 내부 선택 인덱스 (v-model 대응)
const internalIndex = ref(0)
const isControlled = computed(() => props.modelValue !== undefined)
const selectedIndex = computed({
  get() {
    return isControlled.value
      ? (props.modelValue as number)
      : internalIndex.value
  },
  set(v: number) {
    if (isControlled.value) emit('update:modelValue', v)
    else internalIndex.value = v
  },
})

function onSelect(index: number) {
  selectedIndex.value = index
  emit('change', index)
}

onMounted(() => {
  if (tabs.value.length === 0) {
    console.warn('tabList is empty!')
  }
  // modelValue가 주어진 경우 초기 동기화
  if (isControlled.value && typeof props.modelValue === 'number') {
    internalIndex.value = props.modelValue
  }
})

// 외부에서 modelValue를 변경하면 내부 상태도 맞춰줌
watch(
  () => props.modelValue,
  (v) => {
    if (typeof v === 'number') internalIndex.value = v
  }
)
</script>

<style scoped>
.tab-headers {
  display: flex;
}
.tab-headers button {
  padding: 10px 24px;
  border: none;
  background: #f0f0f0;
  font-size: 14px;
  cursor: pointer;
}
.tab-headers .active {
  background: white;
  font-weight: bold;
  border-bottom: 2px solid #007bff;
}
.tab-content {
  padding: 20px 0 0;
  border-top: 1px solid #ccc;
}
</style>
