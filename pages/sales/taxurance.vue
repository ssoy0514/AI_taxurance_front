<script>
import { renderMarkdown } from '@/utils/markdown'
import RightView from '@/components/RightView.vue'
import Images from '@/components/Images.vue'
import Video from '@/components/Video.vue'
import Link from '@/components/Link.vue'
import StepDots from '@/components/StepDots.vue'

// 자산가유형 진단 프론트 하드코딩
const TYPE_SURVEY_QUESTIONS = {
  '~30대': {
    1: {
      title: 'Q1 : "요즘 한창 돈 모으실 때인데, 돈 굴리면서 가장 신경 쓰이는 게 어떤 점이세요?"',
      options: [
        'A : "이자 좀 붙으면 세금 떼이고 건보료 오르는 게 제일 아깝죠." [세금 방어]',
        'B : "혹시 일 쉬게 되더라도 매달 나갈 생활비가 제일 걱정돼요." [생활비 현금흐름]',
        'C : "대출도 많은데 집값 떨어지거나 안 팔릴까 봐 불안해요." [집값/대출 수성]',
        'D : "사업이나 일하다 빚 생기면 가족들 고생할까 봐 그게 걱정이죠." [가족 보호]',
      ],
    },
    2: {
      title: 'Q2 : "조금 여윳돈이 생기면 어디에 넣어두는 게 제일 마음이 편하세요?"',
      options: [
        'A : "세금 한 푼 안 떼고 나중에 그대로 다 찾는 통장이요." [비과세 통장]',
        'B : "신경 안 써도 매달 따박따박 이자나 용돈처럼 나오는 곳이요." [매달 월급]',
        'C : "그래도 눈에 보이는 번듯한 내 집 한 채에 묻어두는 게 최고죠." [내 집 마련]',
        'D : "무슨 일 생겨도 아무도 손 못 대는 우리 가족 비상금 통장이요." [가족 전용 비상금]',
      ],
    },
    3: {
      title: 'Q3 : "앞으로 10년, 20년 뒤를 생각하면 어떤 걸 가장 먼저 끝내두고 싶으세요?"',
      options: [
        'A : "세금 걱정 없이 알짜배기 알돈을 단단하게 굳혀두는 거요." [알짜 자산 굳히기]',
        'B : "빨리 일 은퇴하고 매달 월급처럼 나오는 돈으로 여유 부리는 거요." [조기 은퇴 생활비]',
        'C : "대출 다 갚고 온전한 내 집 한 채 확실하게 쥐고 있는 거요." [내 집 빚 청산]',
        'D : "아이들 클 때까지 든든하게 받쳐주고 독립할 밑천 주는 거요." [아이들 독립 밑천]',
      ],
    },
  },
  '40대': {
    1: {
      title: 'Q1 : "아이들 학원비에 생활비 나갈 곳 많으실 텐데, 요즘 돈 관리에서 제일 아깝거나 신경 쓰이는 게 어디세요?"',
      options: [
        'A : "월급이나 소득에서 세금 뭉텅이로 떼여 나가는 게 제일 아깝죠." [세금 누수 방어]',
        'B : "나중에 직장 그만뒀을 때 생활비가 딱 끊길까 봐 그게 불안해요." [은퇴 후 생활비]',
        'C : "돈이 다 부동산에 묶여 있어서 급하게 쓸 현금이 없어요." [현금 유동성]',
        'D : "일이나 사업하다 생길 수 있는 위험이 집으로 번질까 봐요." [사업-가정 분리]',
      ],
    },
    2: {
      title: 'Q2 : "지금 통장이나 자산 정리를 다시 한다면 어디를 제일 채워넣고 싶으세요?"',
      options: [
        'A : "이자 많이 나와도 국세청에서 세금 안 매기는 안전한 통장이요." [절세 통장]',
        'B : "나이 들어서 일 안 해도 매달 통장에 꽂히는 평생 월급이요." [평생 월급]',
        'C : "집은 지키면서도 세금이나 급전 필요할 때 바로 꺼낼 현금이요." [부동산 비상 현금]',
        'D : "가장인 나한테 무슨 일 생겨도 가족들 생활비 보장되는 안전장치요." [가장 유고 안전판]',
      ],
    },
    3: {
      title: 'Q3 : "앞으로 딱 10년 뒤를 내다봤을 때, 제일 먼저 해결해두고 싶은 가족 숙제는 무엇인가요?"',
      options: [
        'A : "나중에 애들 대학 가고 결혼할 때 세금 안 내고 돈 보태주는 거요." [자녀 증여 절세]',
        'B : "회사 그만둬도 부부 둘이 마음 편히 쓸 생활비 마련해두는 거요." [부부 은퇴 생활비]',
        'C : "집값 오른 만큼 나중에 자식들이 세금 때문에 고생 안 하게 하는 거요." [집 상속세 준비]',
        'D : "가게나 회사 키운 거 안전하게 챙겨서 가족 몫으로 딱 떼어두는 거요." [가족 몫 떼어두기]',
      ],
    },
  },
  '50대': {
    1: {
      title: 'Q1 : "대표님, 50대에는 공격적으로 불리기보다 지키는 쪽으로 마음이 많이 기우시던데, 대표님은 어떠세요?"',
      options: [
        'A : "이자 몇 푼 더 벌려다 종합소득세랑 건보료 오르는 게 제일 질색이에요." [세금·건보료 방어]',
        'B : "퇴직하고 통장에 들어오던 월급 딱 끊기는 날이 제일 두렵죠." [월급 공백 방어]',
        'C : "평생 피땀 흘려 마련한 집이랑 땅 가치 잃지 않고 지키는 거요." [부동산 지키기]',
        'D : "회사나 자산을 자식한테 넘겨줄 때 잡음 없이 물려주는 거요." [자녀 물려주기]',
      ],
    },
    2: {
      title: 'Q2 : "은퇴하시고 나면 어떤 돈이 통장에 있는 게 제일 든든하실 것 같으세요?"',
      options: [
        'A : "세금 소명 걱정 없고 세법 바뀌어도 1원도 안 떼이는 비과세 돈이요." [완전 비과세]',
        'B : "부동산 세입자 신경 안 써도 매달 날짜 맞춰 들어오는 연금이요." [신경 안 쓰는 연금]',
        'C : "부동산은 쥐고 있으면서 세금이나 급전 필요할 때 쓸 여윳돈이요." [부동산 세금용 현금]',
        'D : "유언장 없어도 내가 주고 싶은 가족 통장으로 바로 꽂히는 돈이요." [원하는 가족 지정]',
      ],
    },
    3: {
      title: 'Q3 : "요즘 집안에서 자산 이야기 나누실 때 가장 마음에 걸리거나 현실적인 고민은?"',
      options: [
        'A : "부모님 모시는 문제랑 자식들 장가갈 때 세금 덜 떼이게 주는 거요." [세금 덜 내고 주기]',
        'B : "오래 살더라도 자식 눈치 안 보고 우리 부부 생활비 걱정 없는 거요." [자식 눈치 안 보기]',
        'C : "나중에 상속세 낼 현금 없어서 집을 헐값에 급매로 날리지 않는 거요." [집 헐값 처분 방지]',
        'D : "회사 물려줄 때 세금 폭탄 맞아서 사업체 흔들리지 않게 하는 거요." [사업 지키며 승계]',
      ],
    },
  },
  '60대': {
    1: {
      title: 'Q1 : "은퇴하시고 나서 돈 관리하실 때 가장 중요하게 챙기시는 원칙은 무엇인가요?"',
      options: [
        'A : "평생 번 자산이 상속세나 증여세로 나라에 뭉텅이로 깎이지 않는 거요." [세금 깎임 방지]',
        'B : "자식들한테 아쉬운 소리 안 하고 부부 둘이 품위 있게 쓸 생활비요." [부부 자립 생활비]',
        'C : "평생 지킨 아파트나 땅을 자식들이 온전히 지켜내는 거요." [집과 땅 지키기]',
        'D : "나중에 자식들끼리 유산 때문에 싸우지 않고 사이좋게 지내는 거요." [형제간 우애 지키기]',
      ],
    },
    2: {
      title: 'Q2 : "지금 갖고 계신 집이나 자산들을 앞으로 어떤 모양으로 정돈하고 싶으세요?"',
      options: [
        'A : "자식들 이름으로 세금 없이 합법적으로 조금씩 넘겨두는 거요." [세금 없이 넘기기]',
        'B : "목돈 쥐고 불안해하느니 매달 일정하게 통장에 찍히는 돈으로 돌리는 거요." [매달 찍히는 돈]',
        'C : "집 물려받을 자식이 상속세 낼 수 있게 현금을 딱 짝지어두는 거요." [상속세 낼 현금]',
        'D : "법적 다툼 없이 내가 정해준 자식 통장으로 바로 들어가는 돈이요." [내 뜻대로 지정]',
      ],
    },
    3: {
      title: 'Q3 : "자녀분들과 자산 정리하실 때 부모로서 가장 중요하게 생각하시는 가치는?"',
      options: [
        'A : "국세청 조사나 자금 출처 소명 걱정 없이 깨끗하게 넘겨주는 거요." [뒤탈 없는 이전]',
        'B : "내가 떠날 때까지 병원비나 간병비 걱정 없이 편안하게 사는 거요." [편안한 노후]',
        'C : "집 쪼개서 싸우게 하지 말고 현금으로 형제들 몫을 딱 맞춰주는 거요." [공평한 몫 배분]',
        'D : "평생 일군 사업체나 가게를 2세대가 빚 없이 당당하게 잇는 거요." [당당한 가업 승계]',
      ],
    },
  },
  '70대': {
    1: {
      title: 'Q1 : "어르신, 70대에는 내 손에 돈을 쥐고 편히 쓰시면서도 다음 세대를 생각하셔야 할 때인데, 제일 신경 쓰이시는 게 어떤 점이세요?"',
      options: [
        'A : "나중에 자식들이 상속세 폭탄 맞아서 고생할까 봐 그게 제일 걱정이죠." [상속세 폭탄 걱정]',
        'B : "혹시 큰 병 나거나 누워 지낼 때 자식들한테 간병비 짐 주기 싫어요." [간병비 짐 안 주기]',
        'C : "집이랑 땅을 자식들한테 줬는데 세금 낼 돈 없어서 뺏길까 봐요." [부동산 세금 걱정]',
        'D : "내 정신 말짱할 때 자식들 몫을 미리 딱 정해줘서 싸움 없게 하는 거요." [미리 싸움 싹 자르기]',
      ],
    },
    2: {
      title: 'Q2 : "자식들한테 무언가 챙겨주신다면 어떤 방식으로 주시는 게 제일 안심되세요?"',
      options: [
        'A : "세무서에서 어디서 난 돈이냐고 묻지도 않는 깨끗한 비과세 돈이요." [탈 없는 비과세]',
        'B : "내가 살아있을 땐 생활비로 쓰고, 남은 건 자식한테 자연스럽게 가는 거요." [살아선 쓰고 남아선 주고]',
        'C : "물려받은 집을 세금 낸다고 급매로 헐값에 던지지 않게 현금 주는 거요." [집 안 팔게 현금 주기]',
        'D : "고생한 자식이나 가업 챙길 자식한테 내 뜻대로 딱 쥐여주는 거요." [고생한 자식 챙기기]',
      ],
    },
    3: {
      title: 'Q3 : "부모로서 자식들에게 남겨줄 수 있는 가장 큰 배려는 무엇이라고 생각하세요?"',
      options: [
        'A : "상속세 최고세율 50%를 부모가 미리 해결해줘서 자식 부담 덜어주는 거요." [세금 부담 덜어주기]',
        'B : "자식들 손 안 벌리고 내 품위 지키면서 편안하게 마무리하는 거요." [끝까지 자립하기]',
        'C : "집 등기 넘겨받을 때 낼 취득세랑 상속세 현금을 딱 준비해주는 거요." [등기 비용 마련]',
        'D : "유언장 공증보다 확실하게 형제들끼리 소송 안 생기게 막아두는 거요." [소송 원천 차단]',
      ],
    },
  },
  '80대~': {
    1: {
      title: 'Q1 : "어르신, 지금 시점에서는 자식들에게 어떤 마무리를 해주는 게 가장 마음이 놓이실까요?"',
      options: [
        'A : "나 떠나고 자식들이 세금 낼 돈 없어서 쩔쩔매지 않게 현금 딱 쥐여주는 거요." [세금 낼 현금 완비]',
        'B : "마지막 순간까지 좋은 간병인 쓰고 자식들 고생 일절 안 시키는 거요." [자식 간병 고생 제로]',
        'C : "대대로 내려온 선산이나 집을 자식들이 세금 때문에 팔지 않게 지키는 거요." [가문 터전 보존]',
        'D : "나 떠나고 통장 묶여서 장례비나 가족들 쓸 돈 없을까 봐 그게 걱정돼요." [통장 동결 방지]',
      ],
    },
    2: {
      title: 'Q2 : "훗날 자식들이 유산 물려받을 때 가장 신경 쓰이는 게 어떤 부분이세요?"',
      options: [
        'A : "상속세 6개월 안에 현금으로 못 내서 이자나 가산세 물게 될까 봐요." [가산세 걱정]',
        'B : "손주들한테 세금 걱정 없이 내 사랑이 담긴 용돈 온전히 전해지는 거요." [손주 세대 선물]',
        'C : "부동산 물려받은 자식이 세금 낼 현금 없어서 빚더미 앉을까 봐요." [부동산 빚 방지]',
        'D : "형제들 도장 안 찍어줘도 내가 정한 자식이 바로 찾아 쓸 수 있는 돈이요." [도장 없이 즉시 찾기]',
      ],
    },
    3: {
      title: 'Q3 : "어르신께서 자녀분들에게 남기고 싶으신 가장 아름다운 마지막 모습은 무엇인가요?"',
      options: [
        'A : "자식들에게 세금 빚 1원도 안 남기고 깨끗하게 정리해주는 거요." [세금 빚 0원]',
        'B : "평생 떳떳하게 번 재산 자식들에게 명예롭게 선물로 남겨주는 거요." [명예로운 선물]',
        'C : "평생 가꾼 집과 부동산 1원도 헐값에 안 팔리고 자식 터전 되는 거요." [집 온전히 보존]',
        'D : "나 떠난 뒤에도 자식들끼리 우애 지키고 법원 갈 일 전혀 없게 하는 거요." [우애 지키는 평화]',
      ],
    },
  },
}

const TYPE_SURVEY_RESULTS = {
  A: {
    title: '세무 방어형 자산가',
    descreption: '자산 증식보다 세금 및 관리 비용 누수를 방어하여 세후 실질 수익을 극대화하는 것이 최우선인 유형입니다.',
    points: ['금융소득종합과세 및 건강보험료 인상 리스크 방어', '비과세·분리과세 중심의 절세 포트폴리오 구축', '10년 단위 사전 증여를 통한 상속세 부담 경감'],
    recommended: ['금융소득·자산관리', '증여'],
  },
  B: {
    title: '캐시플로우 집중형 자산가',
    descreption: '목돈의 크기보다 매달 마르지 않고 들어오는 고정 현금 파이프라인을 가장 중시하는 유형입니다.',
    points: ['은퇴 후 생활 수준을 유지해주는 확정 월 지급 구조', '시장 변동성과 무관한 원금 보존형 유동성 자산 확보', '부동산 관리 피로도를 덜어주는 금융 연금 자산 매칭'],
    recommended: ['금융소득·자산관리', '개인사업자'],
  },
  C: {
    title: '부동산 실물형 자산가',
    descreption: '부동산 중심의 포트폴리오를 보유하고 있어 세금 납부나 긴급 자금용 현금 유동성이 필요한 유형입니다.',
    points: ['상속 발생 시 부동산 급매 처분을 막는 현금 재원 확보', '보유세·양도세 등 실물 자산 유지 비용의 분산 설계', '부동산 가치에 비례하는 안전한 금융 자산 밸런싱'],
    recommended: ['상속', '증여'],
  },
  D: {
    title: '패밀리 오피스 / 승계형 자산가',
    descreption: '가업의 안정적 지속과 다음 세대로의 잡음 없는 자산 이전을 함께 설계해야 하는 유형입니다.',
    points: ['사업체 리스크가 가정 자산으로 전이되는 것을 차단', '자녀 간 법적 분쟁을 예방하는 지정형 확정 자산 설계', '지분 승계 및 가업 상속에 수반되는 세무 비용 플랜'],
    recommended: ['상속', '증여', '개인사업자'],
  },
}

export default {
  name: 'Taxurance',
  components: { RightView, Images, Video, Link, StepDots },

  data() {
    return {
      // (라우터로 넘어온 초기 검색어)
      text: this.$route.params.text || '',
      interestOptions : ['상속', '증여', '개인사업자', '금융소득·자산관리'],
      genderOptions: ['여성', '남성'],
      ageOptions: ['~30대','40대', '50대', '60대', '70대', '80대~'],
      optionLetters: ['A', 'B', 'C', 'D'],

      // considerOptions, computed(visibleConsiderGroups)가 결정
      considerCategories: [
        { label: '상속', interests: ['상속'], items: ['상속', '부동산 자산', '상속분쟁', '보험활용', '해외거주'] },
        { label: '증여', interests: ['증여'], items: ['증여·자금출처', '부동산 자산', '해외거주', '보험활용'] },
        { label: '개인사업자', interests: ['개인사업자'], items: ['세무신고·조사', '개인소득세', '법인전환'] },
        { label: '금융소득·자산관리', interests: ['금융소득·자산관리'], items: ['금융소득·건보', '개인소득세', '법인전환', '보험활용'] },
      ],

      // 자산가유형 진단 팝업
      assetSurveyQuestions: TYPE_SURVEY_QUESTIONS,
      assetSurveyResults: TYPE_SURVEY_RESULTS,
      showTypeModal: false,       
      typeSurveyIndex: 0,        
      typeSurveyAnswers: {},      
      typeDiagnosis: null, 
      
      // 고객 정보 디폴트값
      filters: {
        interest : '상속',
        sex: '남성',
        age: '~30대',
        considerations: [],
        requirement: '',
        prev_speech: '',
        typecode: null,
      },


      resultFilters: {},
      messages: [],
      relatedData: [],
      submitType: '', // first, sec, re
      isTyping: false,
      currentStep: 0,
      totalStep: 4,
      stepTexts: [
        'AI가 선택된 정보를 확인하고 있습니다.',
        'AI가 고객 특이사항을 분석하고 있습니다.',
        'AI가 맞춤 화법을 생성하고 있습니다.',
        '완성도를 높이기 위해 최종 검토중입니다.',
      ],
      STEP_MS: 3000,
      ticker: null,

      openingMent: '', // 오프닝 멘트(llm1) 결과 저장해두기
    }
  },
  computed: {

    currentMode() {
      return this.$route.query.mode || 'list'
    },

    msgCount() {
      return this.messages.length
    },

    isFormValid() {
      const { interest, sex, age} = this.filters
      return (
        interest &&
        sex &&
        age
        // considerations.length >= 1 &&  // ?) 이슈사항 제한할 것인가 & 필수로 둘 것인가..
        // considerations.length <= 2
      )
    },
    hasResult() {
      return Object.keys(this.resultFilters).length > 0
    },

    isSidebarOpen() {
      return this.$store.state.isSidebarOpen
    },

    visibleConsiderGroups() {
      return this.considerCategories.filter(
        (group) => group.interests.includes(this.filters.interest)
      )
    },


    typeQuestionsData() {
      return this.assetSurveyQuestions[this.filters.age] || {}
    },
    typeQuestionOrders() {
      return Object.keys(this.typeQuestionsData).sort((a, b) => Number(a) - Number(b))
    },
    typeCurrentKey() {
      return this.typeQuestionOrders[this.typeSurveyIndex]
    },
    typeCurrentQuestion() {
      return this.typeQuestionsData[this.typeCurrentKey] || null
    },
  },

  watch: {
    currentMode: {
      immediate: true,
      handler(newVal) {
        if (newVal === 'list') {
          this.toggleRelatedDataMapping(false)
        } else {
          this.$nextTick(() => {
            this.toggleRelatedDataMapping(true, this.relatedData)
          })
        }
      },
    },

    msgCount() {
      this.$nextTick(() => this.scrollToBottom(true))
    },

    'filters.age'() {
      this.typeSurveyIndex = 0
      this.typeSurveyAnswers = {}
      this.typeDiagnosis = null
      this.filters.typecode = null
    },

    'filters.interest'() {
      this.filters.considerations = []
    },
  },

  created() {
    if (this.$route.query.mode === 'view') {
      this.$router.replace({
        query: { ...this.$router.query, mode: 'list' },
      })
    }
  },
  mounted() {},

  beforeDestroy() {
    this.stopStreaming()
    this.toggleRelatedDataMapping(false)
  },

  methods: {
    renderMarkdown,

    //  실제 백엔드 연결되어 가드(═══)/return 제거하고 실호출로 전환.
    // interest(문자열) -> interests(배열)로 파라미터 형태도 백엔드 스키마에 맞게 변경.
    async fetchContents() {
      try {
        const { items, succ } = await this.$axios.post('/taxurance/contents', {
          interests: [this.filters.interest],
        })
        if (succ) {
          this.toggleRelatedDataMapping(true, items)
          this.relatedData = items
        }
      } catch (e) {
        console.warn('[fetchContents] 관련자료 조회 실패(백엔드 미연결 등):', e)
      }
    },

    async startStreaming() {
      this.isTyping = true
      this.startFake()

      this.messages.push({
        role: 'speech',
        content: '',
        readyTrans: false,
        isTrans: false,
        transText: '',
      })
      const last = this.messages[this.messages.length - 1]

      // [백엔드 연계] 가드(═══)/fallback return 블록 제거, 아래부터 실제 호출로 전환.
      try {
        if (this.submitType === 'first') {
          try {
            // [백엔드 연계] /taxurance/generate/opening -> /taxurance/opening/make로 경로 변경.
            // 파라미터도 interest/age_label/considerations -> interests/age_tags/consider_options
            // 배열 형태로 바뀌었고, 응답 필드도 opening_ment -> opening으로 바뀜.
            // sex는 처음엔 스키마에 필드가 없어 requirement 텍스트에 합쳐 보냈었는데(buildOpeningRequirement),
            // 백엔드에 sex 필드가 추가되어 이제 아래처럼 바로 보냄.
            const openingData = await this.$axios.post('/taxurance/opening/make', {
              sex: this.resultFilters.sex,
              interests: [this.resultFilters.interest],
              age_tags: [this.resultFilters.age],
              consider_options: this.resultFilters.considerations,
              requirement: this.resultFilters.requirement || '',
            })
            this.openingMent = openingData.opening
          } catch (e) {
            console.error('[taxurance] 오프닝 멘트 생성 실패:', e)
            this.openingMent = '(오프닝 멘트 생성 실패) 백엔드 서버 연결을 확인해주세요.'
          }
        } else if (this.submitType === 're') {
          this.resultFilters.prev_speech = ''
        }

        // [백엔드 연계] /taxurance/generate/final(단발 POST, 응답이 한 번에 옴) ->
        // /taxurance/speech/make(SSE 스트리밍)로 변경. $stream.fetchStream으로 받는다
        // (startTransStreaming과 동일한 방식)
        let hasError = false
        await this.$stream.fetchStream(
          '/taxurance/speech/make',
          {
            sex: this.resultFilters.sex,
            interests: [this.resultFilters.interest],
            age_tags: [this.resultFilters.age],
            consider_options: this.resultFilters.considerations,
            opening_result: this.openingMent,
            prev_speech: this.resultFilters.prev_speech || '',
            requirement: this.resultFilters.requirement || '',
          },
          {
            onChunk: (chunk) => {
              this.$set(last, 'content', last.content + chunk)
              this.$nextTick(() => this.scrollToBottom(false))
            },
            onError: (e) => {
              hasError = true
              console.error('[taxurance] 화법 생성 실패:', e)
              if (!last.content) {
                this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
              }
            },
            onFinished: () => {
              if (!hasError) {
                this.$set(last, 'readyTrans', true)
              }
            },
          }
        )
      } catch (e) {
        console.error('[taxurance] 화법 생성 실패:', e)
        this.$set(last, 'content', '(생성 실패) 백엔드 서버 연결을 확인해주세요.')
      } finally {
        this.$nextTick(() => this.scrollToBottom(false))
        this.isTyping = false
        this.clearTicker()
      }
    },

    async startTransStreaming(lang, msg) {
      this.$set(msg, 'isTrans', true)
      this.$set(msg, 'transText', '') 
      this.startFake() 

      this.$nextTick(() => this.scrollToBottom(false))

      const params = {
        language: lang,
        msg: msg.content,
      }

      await this.$stream.fetchStream('/translation/chat/stream', params, {
        onChunk: (chunk) => {
          this.$set(msg, 'transText', msg.transText + chunk)

          this.$nextTick(() => this.scrollToBottom(false))
        },
        onFinished: () => {
          this.clearTicker()
        },
      })
    },

    stopStreaming() {
      this.$stream.stop()
    },

    isMaxSelected(value) {
    return (
        this.filters.considerations.length >= 2 &&
        !this.filters.considerations.includes(value)
    )
    },


    openTypeModal() {
      if (!this.filters.age) {
        alert('연령대를 먼저 선택해주세요.')
        return
      }
      this.typeSurveyIndex = 0
      this.typeSurveyAnswers = {}
      this.typeDiagnosis = null
      this.showTypeModal = true
    },
    closeTypeModal() {
      this.showTypeModal = false
    },
    toggleTypeAnswer(orderKey, letter) {
      const current = this.typeSurveyAnswers[orderKey]
      this.$set(this.typeSurveyAnswers, orderKey, current === letter ? '' : letter)
    },
    goTypeNext() {
      if (this.typeSurveyIndex < this.typeQuestionOrders.length - 1) this.typeSurveyIndex += 1
    },
    goTypePrev() {
      if (this.typeSurveyIndex > 0) this.typeSurveyIndex -= 1
    },
    // 자산가 성향 진단 로직 (다수결)
    computeTypecode(answers) {
      const counts = {}
      answers.forEach((a) => {
        counts[a] = (counts[a] || 0) + 1
      })
      const maxCount = Math.max(...Object.values(counts))
      const winners = Object.keys(counts).filter((k) => counts[k] === maxCount)
      return winners.length === 1 ? winners[0] : answers[0]
    },
    viewTypeResult() {
      const answers = this.typeQuestionOrders.map((o) => this.typeSurveyAnswers[o])
      const typecode = this.computeTypecode(answers)
      const info = this.assetSurveyResults[typecode]
      this.filters.typecode = typecode
      this.typeDiagnosis = {
        badge: `Type ${typecode}`,
        typeTitle: info.title,
        typeDesc: info.descreption,
        points: info.points,
        recommended: info.recommended,
      }
    },

    submitFilter() {
      if (this.isFormValid) {
        this.messages = []
        this.relatedData = []
        this.resultFilters = {
        ...this.filters,
        considerations: [...this.filters.considerations],
        }

        this.submitType = 'first'
        this.fetchContents()
        this.startStreaming()

        this.handleChangeView('view')
      } else {
        alert('필수 항목을 확인해주세요.')
      }
    },

    handleKeyDown(e) {
      if (this.text.trim().length < 1) return
      if (e.key === 'Enter' && e.shiftKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        this.handleClickSend()
      }
    },

    handleClickSend() {
      if (this.text.trim()) {
        this.messages.push({
          role: 'user',
          content: this.text,
        })
      }
      this.submitType = 'sec'
      this.resultFilters.requirement = this.text
      this.resultFilters.prev_speech =
        this.messages[this.messages.length - 2].content

      this.startStreaming()
      this.text = ''
    },

    handleReFilter() {
      this.submitType = 're'
      this.startStreaming()
    },

    scrollToBottom(smooth = true) {
      const el = this.$refs.chatLogRef
      if (el && el.scrollTo) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        })
      } else if (this.$refs.bottomRef && this.$refs.bottomRef.scrollIntoView) {
        this.$refs.bottomRef.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
        })
      }
    },

    toggleRelatedDataMapping(show, item) {
      if (show) {
        this.$store.dispatch('relatedItems/saveItems', item)
      } else {
        this.$store.dispatch('relatedItems/clear')
      }
    },

    handleChangeView(view) {
      this.$router.push({
        query: { mode: view },
      })
    },

    handleSaveSpeech() {
      alert('저장되었습니다.')
    },

    toggleSidebar() {
      this.$store.commit('TOGGLE_SIDEBAR')
      this.$store.dispatch('relatedItems/setTab', 0)
    },

    clearTicker() {
      if (this.ticker) {
        clearInterval(this.ticker)
        this.ticker = null
      }
    },

    startFake() {
      this.currentStep = 0
      this.clearTicker()
      this.ticker = window.setInterval(() => {
        if (this.currentStep < this.totalStep - 1) this.currentStep += 1
        else this.clearTicker()
      }, this.STEP_MS)
    },
    delay(ms) {
      return new Promise((r) => setTimeout(r, ms))
    },
  },
}
</script>

<template>
  <div class="contents">
    <div class="cont-main">
      <div class="main-list" v-if="currentMode === 'list'">
        <section>
          <div class="wrap-sub-title">
            <p class="sub-title">
              <strong>고객 맞춤형 재무 설계</strong>
            </p>
          </div>
        </section>
        <div class="filter-section">
          <section class="filter-list scroll-y">
            <div class="folder-tab-wrap">
              <button class="folder-tab active">개인고객</button>
              <ul class="filter-main">

              <li>
                <p class="tit">
                  고객 정보 <span class="txt-required">(필수)</span>
                </p>
                <div class="wrap-row-half">

                  <div class="wrap-label rd-st1 rd-st1--fit-wide">
                    <label v-for="gender in genderOptions" :key="gender">
                      <input
                        type="radio"
                        v-model="filters.sex"
                        :value="gender"
                        required
                      />
                      <p>{{ gender }}</p>
                    </label>
                  </div>
                  <div class="wrap-label rd-st1 rd-st1--fit">
                    <label v-for="age in ageOptions" :key="age">
                      <input
                        type="radio"
                        v-model="filters.age"
                        :value="age"
                        required
                      />
                      <p>{{ age }}</p>
                    </label>
                  </div>
                </div>
                <div class="interest-header-row">
                  <div class="wrap-label rd-st1 rd-st1--wrap">
                    <label v-for="interest in interestOptions" :key="interest">
                      <input
                        type="radio"
                        v-model="filters.interest"
                        :value="interest"
                        required
                      />
                      <p>{{ interest }}</p>
                    </label>
                  </div>
                  <button type="button" class="btn-type-survey" @click="openTypeModal">
                     관심분야를 추천해드릴까요?
                  </button>
                </div>
              </li>
              <li class="full">
                <p class="tit">
                  고객 특이사항
                  <span class="txt-no-required">(선택)</span>
                </p>

                <div class="wrap-label chk-st3">
                  <div v-for="(group, gi) in visibleConsiderGroups" :key="gi" class="chk-st3-row">
                    <label v-for="item in group.items" :key="item">
                      <input
                        type="checkbox"
                        :value="item"
                        v-model="filters.considerations"
                      />
                      <p>
                        {{ item }}
                      </p>
                    </label>
                  </div>
                </div>

                <input
                  type="text"
                  v-model="filters.requirement"
                  placeholder="추가 요청사항을 알려주세요 (예: 자녀 2명 있음)"
                  class="text-input"
                />
              </li>
              </ul>
            </div>
          </section>

          <section class="filter-btn">
            <button
              class="btn-xl btn-main"
              type="submit"
              :disabled="!isFormValid"
              @click="submitFilter"
            >
              맞춤 화법 생성
            </button>
          </section>
        </div>

        <!-- 자산가유형 진단 팝업 - "선택값을 추천해드릴까요?" 클릭 시 뜸. 닫으면 그냥 이 개인고객 설계 화면으로 복귀. -->
        <div class="type-modal-overlay" v-if="showTypeModal" @click.self="closeTypeModal">
          <div class="type-modal">
            <div class="type-modal-header">
              <p class="type-modal-title">자산가유형 진단</p>
              <button type="button" class="type-modal-close" @click="closeTypeModal">✕</button>
            </div>

            <div class="type-modal-body">
              <!-- 진단 전: 문항 스텝퍼만 -->
              <div class="asset-survey" v-if="!typeDiagnosis">
                <p class="asset-survey-desc">
                  아래 질문을 고객에게 건네고, 고객의 답변과 가장 가까운 항목을 체크하세요.
                </p>
                <template v-if="typeCurrentQuestion">
                  <p class="asset-survey-step">질문 {{ typeSurveyIndex + 1 }} / {{ typeQuestionOrders.length }}</p>
                  <div class="asset-survey-block">
                    <p class="asset-survey-block-tit" :title="typeCurrentQuestion.title">{{ typeCurrentQuestion.title }}</p>
                    <div class="asset-survey-option-list">
                      <label
                        v-for="(opt, idx) in typeCurrentQuestion.options"
                        :key="idx"
                        class="asset-survey-pill"
                        :class="{ active: typeSurveyAnswers[typeCurrentKey] === optionLetters[idx] }"
                        :title="opt"
                        @click="toggleTypeAnswer(typeCurrentKey, optionLetters[idx])"
                      >
                        <span>{{ optionLetters[idx] }}. {{ opt }}</span>
                      </label>
                    </div>
                    <div class="asset-survey-nav">
                      <button
                        v-if="typeSurveyIndex > 0"
                        type="button"
                        class="asset-survey-btn-prev"
                        @click="goTypePrev"
                      >
                        이전
                      </button>
                      <!-- 마지막 문항까지 답하면 "다음" 자리가 그대로 "자산가 유형 확인하기"로 바뀐다
                           (같은 다음-스텝 흐름으로 결과화면까지 자연스럽게 이어지도록) -->
                      <button
                        v-if="typeSurveyAnswers[typeCurrentKey] && typeSurveyIndex < typeQuestionOrders.length - 1"
                        type="button"
                        class="asset-survey-btn-next"
                        @click="goTypeNext"
                      >
                        다음
                      </button>
                      <button
                        v-if="typeSurveyAnswers[typeCurrentKey] && typeSurveyIndex === typeQuestionOrders.length - 1"
                        type="button"
                        class="asset-survey-btn-next"
                        @click="viewTypeResult"
                      >
                        자산가 유형 확인하기
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- 진단 후: 결과화면으로 전환(질문 스텝퍼는 사라짐) -->
              <div class="asset-survey-result" v-else>
                <span class="asset-survey-badge">{{ typeDiagnosis.badge }} · {{ typeDiagnosis.typeTitle }}</span>
                <p class="asset-survey-result-desc">{{ typeDiagnosis.typeDesc }}</p>
                <ul class="asset-survey-points">
                  <li v-for="(point, idx) in typeDiagnosis.points" :key="idx">{{ point }}</li>
                </ul>

                <div class="asset-survey-recommend">
                  <p class="asset-survey-recommend-tit">추천 특이사항</p>
                  <div class="asset-survey-recommend-tags">
                    <span v-for="(tag, idx) in typeDiagnosis.recommended" :key="idx">#{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="main-result" v-if="currentMode === 'view'">
        <div class="main-result-inner">
          <!-- 고정해더: 홈(목록으로) 버튼 + 지금 조건(성별/연령대/관심보장) 요약 표시 -->
          <div class="filter-top">
            <!-- 목록 화면으로 되돌아가는 버튼 (mode=list로 전환) -->
            <button class="btn" @click="handleChangeView('list')">
              <i class="icon-mm icon-home"></i>
            </button>
            <div class="wrap-select">
              <!-- 클릭하면 isFilters를 토글 (현재 디자인상 별도 펼침 UI로 연결되어 있진 않음) -->
              <div class="select-name" @click="isFilters = !isFilters">
                <div class="wrap-label">
                  <p>{{ filters?.sex }}</p>
                  <p>{{ filters?.age }}</p>
                  <p v-if="filters?.interest">{{ filters.interest }}</p>
                  <!-- <i class="icon-s icon-arrow-down"></i> -->
                </div>
                <span class="add-text">AI 상담 중</span>
              </div>
            </div>
          </div>

          <!-- 채팅 로그 영역: ref="chatLogRef"를 scrollToBottom()에서 사용해 스크롤 제어 -->
          <div class="chat-log scroll-y" ref="chatLogRef">
            <div class="chat-log-inner">
              <!-- "제출 확정된" 조건 요약 카드 (resultFilters 기준, hasResult가 true일 때만) -->
              <div class="msg info" v-if="hasResult">
                <ul class="list-top">
                  <li>
                    <label>{{ resultFilters.sex }},</label>
                    <label>{{ resultFilters.age }},</label>
                    <label v-if="resultFilters.interest">{{ resultFilters.interest }}</label>
                  </li>
                  <!-- 특이사항이나 요청사항이 있을 때만 추가로 표시 -->
                  <li
                    v-if="
                      resultFilters.considerations.length > 0 ||
                      resultFilters.requirement
                    "
                  >
                    <div
                      class="type2"
                      v-if="resultFilters.considerations.length > 0"
                    >
                      <label
                        v-for="(item, idx) in resultFilters.considerations"
                        :key="idx"
                        >#{{ item }}
                      </label>
                    </div>
                    <div v-if="resultFilters.requirement">
                      <p class="memo">
                        {{ resultFilters.requirement }}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- 오프닝 멘트: 최종화법 카드(파란 헤더바)보다 단순한, 그러나 같은 카드 톤(둥근 모서리/옅은 그림자)의 작은 카드 -->
              <div class="opening-ment" v-if="hasResult && openingMent">
                <p class="opening-ment-tit">오프닝 멘트</p>
                <div
                  class="markdown-body"
                  v-html="renderMarkdown(openingMent)"
                ></div>
              </div>

              <!-- 실제 대화 메시지 목록 (messages 배열을 순회) -->
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="['msg', msg.role]"
              >
                <!-- role이 'speech'(AI 화법)인 경우 -->
                <template v-if="msg.role === 'speech'">
                  <div class="speech-header">
                    <p class="tit">
                      <i class="icon-s icon-star"></i>AI 제안 화법
                    </p>
                    <!-- <button class="btn-m btn-gray" @click="handleSaveSpeech">
                      <i class="icon-s icon-heart"></i>저장
                    </button> -->
                    <!-- ↑ (비활성화됨) 화법 저장 버튼 -->
                  </div>

                  <div class="speech-body">
                    <!-- <div class="typing-dots" v-if="!msg.content">
                      <span></span><span></span><span></span>
                      <p>생각 중...</p>
                    </div> -->
                    <!-- ↑ (비활성화됨) 예전 방식의 로딩 점 애니메이션. 지금은 아래 StepDots로 대체됨 -->

                    <!-- 아직 content가 비어있으면(=아직 첫 글자가 안 왔으면) 단계별 진행 애니메이션 표시 -->
                    <StepDots
                      v-if="!msg.content"
                      :step="currentStep"
                      :totalStep="totalStep"
                      :label="stepTexts[currentStep]"
                    />
                    <!-- 스트리밍되며 채워지는 content를 마크다운 -> HTML로 변환해서 표시 -->
                    <div
                      class="markdown-body"
                      v-html="renderMarkdown(msg.content)"
                    ></div>
                  </div>
                  <!-- 스트리밍이 끝나서(readyTrans=true) 번역 기능을 쓸 수 있을 때만 하단 영역 노출 -->
                  <div class="speech-footer" v-if="msg.readyTrans">
                    <div class="trans-header">
                      <p class="tit">
                        <i class="icon-s icon-trans"></i>번역하기
                      </p>
                      <!-- transOptions(언어 목록)만큼 번역 버튼을 렌더링, 클릭 시 startTransStreaming(언어, 메시지) 실행 -->
                      <div>
                        <button
                          v-for="(trans, idx) in transOptions"
                          :key="idx"
                          class="btn-s btn-gray"
                          @click="startTransStreaming(trans, msg)"
                        >
                          {{ trans }}
                        </button>
                      </div>
                    </div>
                    <!-- 번역이 시작된 메시지(isTrans=true)에 한해 번역 결과 영역 표시 -->
                    <div class="trans-body" v-if="msg.isTrans">
                      <!-- <div class="typing-dots" v-if="!msg.transText">
                        <span></span><span></span><span></span>
                        <p>번역 중...</p>
                      </div> -->
                      <!-- ↑ (비활성화됨) 예전 방식의 번역 로딩 애니메이션 -->
                      <StepDots
                        v-if="!msg.transText"
                        :step="currentStep"
                        :totalStep="totalStep"
                        :label="stepTexts[currentStep]"
                      />
                      <div
                        class="markdown-body"
                        v-html="renderMarkdown(msg.transText)"
                      ></div>
                    </div>
                  </div>
                </template>
                <!-- role이 'speech'가 아니면(='user') 그냥 입력한 텍스트를 그대로 표시 -->
                <template v-else>{{ msg.content }}</template>
              </div>
            </div>
          </div>

          <div class="recommend" v-if="messages.length > 0 && !isTyping">
            <!-- 클릭 시 같은 조건으로 새 화법을 다시 생성 -->
            <p class="txt" @click="handleReFilter">
              다른 화법도 만들어드릴까요?
            </p>
            <!-- 관련자료가 있을 때만 노출되는 사이드바 열기/닫기 버튼 -->
            <button
              class="btn-related"
              v-if="relatedData.length > 0"
              @click="toggleSidebar"
            >
              {{ isSidebarOpen ? '닫기' : '관련자료 보기' }}
            </button>
          </div>

          <div class="wrap-search small">
            <input
              v-model="text"
              class="form-control"
              @keydown="handleKeyDown"
              ref="textareaRef"
              placeholder="생성된 화법에서 수정 필요한게 있으신가요?"
            />
            <div class="wrap-btn">
              <!-- 입력값이 있을 때만 활성화되는 전송 버튼, 클릭 시 handleClickSend() 실행 -->
              <button
                class="btn-send"
                :class="{ active: text.trim() }"
                @click="handleClickSend"
                :disabled="!text.trim()"
              >
                <i class="icon-s icon-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrap-row-half {
  display: flex;
  align-items: flex-start;
  gap: rem(12);
  width: 100%;

  > .wrap-label {
    min-width: 0;
  }
  > .wrap-label:first-child {
    flex: 0 0 auto;
  }
  > .wrap-label:last-child {
    flex: 1 1 0;
  }
}
.rd-st1--fit {
  flex-wrap: nowrap;
  label {
    flex: 1;
    min-width: 0;
    p {
      min-width: 0;
      padding: rem(8) 2px;
      font-size: 13px;
      white-space: nowrap;
    }
  }
}
.rd-st1--fit-wide {
  flex-wrap: nowrap;
  label {
    p {
      min-width: 0;
      padding: rem(8) rem(28);
      font-size: 13px; 
      white-space: nowrap;
    }
  }
}

.rd-st1--wrap {
  flex-wrap: wrap;
  row-gap: 4px;
  label {
    p {
      min-width: 0;
      padding: rem(8) rem(20);
      font-size: 13px;
      white-space: nowrap;
    }
  }
}

@media (max-width: 512px) {
  .wrap-row-half {
    flex-direction: column;
  }
  .wrap-row-half > .wrap-label:last-child {
    width: 100%;
  }
  .rd-st1--fit,
  .rd-st1--fit-wide,
  .rd-st1--wrap {
    label p {
      white-space: normal;
    }
  }
}

.folder-tab-wrap {
  position: relative;
  max-width: 620px;
  margin: 0 auto;
}
.folder-tab {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  padding: 10px 28px;
  margin-left: 20px;
  border: none;
  border-radius: 14px 14px 0 0;
  background-color: #eaf4ff; // 하늘색 느낌
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;

  &.active {
    background-color: #dbeafe;
  }
}

/* ── 필터 입력 화면 ───────────────────────────────── */
.filter-section {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  .filter-list {
    .filter-main {
      @include flexbox(flex-start, normal);
      flex-direction: column;
      gap: rem(30);
      max-width: 620px;
      margin: 0 auto;
      padding: rem(30) rem(60);
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      box-shadow: 0px 20px 25px rgba(226, 232, 240, 0.5),
        0px 8px 10px -1px rgba(226, 232, 240, 0.5);
      background: #fff;
      li {
        @include flexbox(flex-start, flex-start);
        flex-direction: column;
        gap: rem(12);
        .tit {
          color: #000;
          font-size: 14px;
          font-weight: 600;
        }
        .text-input {
          width: 100%;
          padding: 16px 24px;
          border: 1px solid #c9d5e4;
          border-radius: 16px;
          background-color: #fff;
        }
      }
      @media (max-width: 512px) {
        padding: 20px;
      }
    }
  }
  .filter-btn {
    padding-bottom: 20px;
    button {
      display: block;
      max-width: 620px;
      margin: 0 auto;
    }
  }
}

/* 관심 보장 체크박스 스타일 (2열 그리드? 1열그리드?) */
.chk-st2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  width: 100%;
  // @include flexbox(flex-start, center);
  // flex-wrap: wrap;
  gap: rem(12);
  label {
    // width: calc((100% - (12px * 3)) / 4);
    p {
      @include flexbox(flex-start, center);
      gap: 12px;
      height: 40px;
      padding: 0 12px;
      border: 1px solid #c9c9c9;
      background-color: #fff;
      border-radius: 12px;
      color: #555;
      font-size: 15px;
      font-weight: 600;
      i:before {
        background-color: #9ca3af;
      }
    }
    input:checked {
      + p {
        border: 1px solid #545fdd;
        background-color: #545fdd;
        color: #fff;
        i:before {
          background-color: #fff;
        }
      }
    }
    input:disabled + p {
      opacity: 0.5;
    }
  }
}

/* 고객 특이사항 체크박스 스타일 (알약 형태로 나열) */
.chk-st3 {
  @include flexbox(flex-start, normal);
  flex-direction: column;
  gap: rem(8);
  label {
    p {
      padding: 5px 13px;
      border: 1px solid #e2e8f0;
      background-color: #fff;
      border-radius: 10px;
      color: #62748e;
      font-size: 14px;
    }
    input:checked {
      + p {
        border: 1px solid #5489ff;
        background-color: #fff;
        color: #5489ff;
        font-weight: 500;
      }
    }
    input:disabled + p {
      opacity: 0.5;
    }
  }
}
.chk-st3-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 결과 화면 상단 "제출 조건 요약" 카드 스타일 */
.list-top {
  li {
    &:not(:first-child) {
      margin-top: 14px;
    }
    .tit {
      color: #90a1b9;
      font-size: 11px;
    }
    .memo {
      border-radius: 7px;
      padding: 7px 10px;
      background: #eef2ff;
      color: #314158;
      font-size: 14px;
    }
    > div {
      @include flexbox(flex-start, center);
      gap: 5px;
      margin-top: 7px;
      &.type2 {
        label {
          border-radius: 7px;
          padding: 7px 10px;
          background: #eef2ff;
          color: #314158;
          font-size: 14px;
          font-weight: 400;
        }
      }
    }
    label {
      font-size: 16px;
      color: #000;
      font-weight: 700;
    }
  }
}

@media (hover: hover) {
}

/* 오프닝 멘트 - 최종화법 카드(파란 헤더바+큰 그림자)보다 단순한 작은 카드.
   배경은 인디고 톤 유지, 라벨 텍스트 색상만 "AI 제안 화법" 헤더 타이틀과 동일하게 맞춤 */
.opening-ment {
  margin: rem(12) 0;
  padding: rem(20) rem(24);
  border: 1px solid #c7d2fe;
  border-radius: 16px;
  background: #eef1ff;
  box-shadow: 0px 8px 13px -2px rgba(0, 0, 0, 0.06),
    0px 3px 5px -3px rgba(0, 0, 0, 0.06);
  // github-markdown-css(전역)가 .markdown-body에 background-color: #fff를 강제하므로,
  // 이 박스 안에서만큼은 투명하게 덮어써서 인디고 배경이 그대로 보이게 함
  .markdown-body {
    background: transparent;
  }
}
.opening-ment-tit {
  margin-bottom: 10px;
  color: #1c398e;
  font-size: 13px;
  font-weight: 700;
}

/* 관심분야 라디오 + "선택값을 추천해드릴까요?" 버튼 한 줄 배치. 폭이 좁아지면
   버튼이 관심분야 라디오 아래(왼쪽 정렬)로 자연스럽게 줄바꿈됨 */
.interest-header-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: rem(12);
  width: 100%;
  > .wrap-label {
    // grow는 0으로 둬서 관심분야 라디오 그룹이 남는 공간을 채우려고 늘어나지 않게(고정 크기 유지).
    // shrink는 허용하고, flex item의 기본 min-width:auto(내용 전체 너비가 최소 크기로 강제되는 것)만
    // 0으로 풀어줘서, 진짜 폭이 부족할 때만 줄바꿈(2줄)되도록 함.
    flex: 0 1 auto;
    min-width: 0;
  }
  > .btn-type-survey {
    flex-shrink: 0;
  }
}
.btn-type-survey {
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  background-color: #eef1ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

/* 자산가유형 진단 팝업 */
.type-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: rem(20);
  padding-left: calc(260px + #{rem(20)});
  background-color: rgba(15, 23, 42, 0.45);

  @media (max-width: 1280px) {
    padding-left: rem(20);
  }
}
.type-modal {
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  background-color: #fff;
  padding: rem(24);
}
.type-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: rem(16);
}
.type-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.type-modal-close {
  border: none;
  background: none;
  padding: 4px;
  color: #62748e;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

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
.asset-survey-step {
  font-size: 12px;
  font-weight: 600;
  color: #90a1b9;
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
  white-space: normal;
  word-break: keep-all;
  line-height: 1.5;
}
.asset-survey-option-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.asset-survey-pill {
  display: flex;
  align-items: center;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #62748e;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;

  span {
    width: 100%;
    white-space: normal;
    word-break: keep-all;
    line-height: 1.5;
  }

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
.asset-survey-nav {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.asset-survey-btn-prev,
.asset-survey-btn-next {
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.asset-survey-btn-prev {
  background-color: #f1f5f9;
  color: #62748e;
}
.asset-survey-btn-next {
  background-color: #545fdd;
  color: #fff;
}
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
.asset-survey-recommend {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #86efac;
}
.asset-survey-recommend-tit {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #15803d;
}
.asset-survey-recommend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 6px 10px;
    border-radius: 7px;
    background-color: #eef2ff;
    color: #314158;
    font-size: 13px;
  }
}
</style>
