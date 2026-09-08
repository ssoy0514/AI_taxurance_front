<template>
  <div class="asset-survey">
    <p class="asset-survey-desc">
      아래 질문을 고객에게 건네고, 고객의 답변과 가장 가까운 항목을 체크하세요.
    </p>
    <template v-if="currentQuestions">
      <div v-for="qKey in questionKeys" :key="qKey" class="asset-survey-block">
        <p class="asset-survey-block-tit">{{ currentQuestions[qKey].title }}</p>
        <div class="asset-survey-option-list">
          <label
            v-for="opt in currentQuestions[qKey].options"
            :key="opt.val"
            class="asset-survey-pill"
            :class="{ active: answers[qKey] === opt.val }"
            @click="toggleAnswer(qKey, opt.val)"
          >
            <span>{{ opt.text }}</span>
          </label>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { ageOptions, ageQuestions, mapFilterAgeToSurveyAge } from '~/utils/assetSurveyData'

export default {
  name: 'AssetTypeSurvey',

  props: {
    value: {
      // 성향 진단은 "맞춤 화법 생성" 클릭 시 한 번에 계산하므로, 여기서는 답변만 담아 올려보낸다.
      type: Object,
      default: () => ({ q1: '', q2: '', q3: '' }),
    },
    age: {
      // 상단 "고객 정보"에서 고른 filters.age 값 (예: '~30대'). 설문은 이 값을 그대로 따라간다.
      type: String,
      default: '',
    },
  },

  data() {
    return {
      questionKeys: ['q1', 'q2', 'q3'],
      answers: {
        q1: this.value.q1 || '',
        q2: this.value.q2 || '',
        q3: this.value.q3 || '',
      },
    }
  },

  computed: {
    surveyAgeKey() {
      return mapFilterAgeToSurveyAge(this.age)
    },
    ageLabel() {
      const found = ageOptions.find((o) => o.value === this.surveyAgeKey)
      return found ? found.label : '미선택'
    },
    currentQuestions() {
      return this.surveyAgeKey ? ageQuestions[this.surveyAgeKey] : null
    },
  },

  watch: {
    surveyAgeKey() {
      this.answers = { q1: '', q2: '', q3: '' }
      this.$emit('input', { ...this.answers })
    },
    answers: {
      deep: true,
      handler() {
        this.$emit('input', { ...this.answers })
      },
    },
  },

  methods: {
    // 이슈사항 체크박스처럼, 이미 선택된 항목을 다시 클릭하면 선택 해제됨
    toggleAnswer(qKey, val) {
      this.answers[qKey] = this.answers[qKey] === val ? '' : val
    },
  },
}
</script>

<style lang="scss" scoped>
.asset-survey {
  display: flex;
  flex-direction: column;
  gap: rem(16);
}
.asset-survey-desc {
  font-size: 12.5px;
  color: #62748e;
  line-height: 1.5;
}
.asset-survey-block {
  display: flex;
  flex-direction: column;
  gap: rem(8);
}
.asset-survey-block-tit {
  font-size: 13px;
  font-weight: 600;
  color: #314158;
  line-height: 1.5;
  word-break: keep-all;
}
.asset-survey-age-tag {
  font-size: 12.5px;
  color: #62748e;

  strong {
    color: #314158;
    font-weight: 700;
  }
}
.asset-survey-option-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asset-survey-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #62748e;
  font-size: 13px;
  line-height: 1.45;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;

  &:hover {
    border-color: #b7ccff;
    background-color: #f5f8ff;
  }

  &.active {
    border-color: #545fdd;
    background-color: #eef1ff;
    color: #37409e;
    font-weight: 500;
  }
}
</style>
