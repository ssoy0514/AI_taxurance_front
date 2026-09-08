<template>
  <div class="asset-survey-result" v-if="resultMeta">
    <span class="asset-survey-badge">{{ resultMeta.badge }} · {{ resultMeta.typeTitle }}</span>
    <p class="asset-survey-result-desc">{{ resultMeta.typeDesc }}</p>
    <ul class="asset-survey-points">
      <li v-for="(point, idx) in resultMeta.points" :key="idx">{{ point }}</li>
    </ul>

    <div class="asset-survey-script">
      <div class="asset-survey-script-header">
        <span class="asset-survey-script-label">💡 추천 오프닝 화법</span>
        <button type="button" class="asset-survey-script-refresh" @click="refreshScript">
          🔄 다른 멘트 보기 ({{ scriptCountLabel }})
        </button>
      </div>
      <p class="asset-survey-script-body">{{ currentScript }}</p>
    </div>
  </div>
</template>

<script>
import { surveyTypeResults, scriptDB, mapFilterAgeToSurveyAge } from '~/utils/assetSurveyData'

export default {
  name: 'AssetTypeSurveyResult',

  props: {
    type: {
      // 성향 유형 번호 (1~4). null이면 진단 결과 없음 → 아무것도 렌더링하지 않음.
      type: Number,
      default: null,
    },
    age: {
      // 제출 시점의 filters.age 값
      type: String,
      default: '',
    },
  },

  data() {
    return {
      scriptIndex: 0,
    }
  },

  computed: {
    surveyAgeKey() {
      return mapFilterAgeToSurveyAge(this.age)
    },
    resultMeta() {
      return this.type ? surveyTypeResults[this.type] : null
    },
    currentScriptList() {
      return this.type && this.surveyAgeKey ? scriptDB[this.type][this.surveyAgeKey] || [] : []
    },
    currentScript() {
      if (this.currentScriptList.length === 0) return ''
      return this.currentScriptList[this.scriptIndex % this.currentScriptList.length]
    },
    scriptCountLabel() {
      if (this.currentScriptList.length === 0) return '0/0'
      return `${(this.scriptIndex % this.currentScriptList.length) + 1}/${this.currentScriptList.length}`
    },
  },

  methods: {
    refreshScript() {
      this.scriptIndex += 1
    },
  },
}
</script>

<style lang="scss" scoped>
.asset-survey-result {
  padding: rem(16);
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  background-color: #f0fdf4;
}
.asset-survey-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  background-color: #15803d;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}
.asset-survey-result-desc {
  font-size: 13px;
  color: #166534;
  line-height: 1.6;
  margin-bottom: 12px;
}
.asset-survey-points {
  list-style: none;
  padding-top: 10px;
  border-top: 1px dashed #86efac;
  margin-bottom: 16px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 12.5px;
    color: #15803d;
    margin-bottom: 6px;
    line-height: 1.5;

    &::before {
      content: '✔';
      font-weight: bold;
      flex-shrink: 0;
    }
  }
}
.asset-survey-script {
  padding: rem(14);
  border: 1px solid #86efac;
  border-radius: 10px;
  background-color: #fff;
}
.asset-survey-script-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.asset-survey-script-label {
  font-size: 13px;
  font-weight: 700;
  color: #545fdd;
}
.asset-survey-script-refresh {
  flex-shrink: 0;
  padding: 5px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #334155;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #e2e8f0;
  }
}
.asset-survey-script-body {
  padding: 12px 14px;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  background-color: #f8fafc;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.7;
  word-break: keep-all;
}
</style>
