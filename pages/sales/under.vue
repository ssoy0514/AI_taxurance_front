<template>
  <div class="contents">
    <div class="cont-main">
      <div class="main-list">
        <section>
          <div class="wrap-sub-title">
            <p class="sub-title">질병별 보장 정보를 확인해보세요.</p>
          </div>
        </section>
        <section>
          <div class="wrap-searchC">
            <div class="input-tC">
              <FormInput
                type="send"
                v-model="keyword"
                placeholder="질병명 또는 KCD코드를 입력해주세요."
                @input="inputKeyword"
                @arrow-down="onArrowDown"
                @arrow-up="onArrowUp"
                @enter="onEnter"
                clearable
              />
              <!-- <button
                class="btn-send"
                :disabled="!keyword || diseaseList.length === 0"
              >
                send
              </button> -->
            </div>
            <div class="searchB-pT" v-show="diseaseList.length > 0 && keyword">
              <div v-if="listStatus === 'ttk'" class="txt-status">
                <p>
                  유사질병명 <b>{{ diseaseList.length }}</b
                  >건 중 하나를 선택하세요.
                </p>
              </div>
              <div v-else-if="listStatus === 'auto'" class="txt-status">
                <p>
                  일치하는 질병명 <b>{{ diseaseList.length }}</b
                  >건 중 하나를 선택하세요.
                </p>
              </div>

              <div class="wrap-scroll">
                <ul class="list">
                  <li
                    v-for="(item, index) in diseaseList"
                    :key="index"
                    ref="items"
                    v-html="item.display"
                    :class="{ selected: selectedIndex === index }"
                    @click="onSelect(index)"
                  ></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <!-- <section class="wrap-bnr-m" v-if="!searched">
          <div class="icon"></div>
          <div class="txt">
            <div class="tit">
              <strong>질병별 보장 정보</strong>와 <br />
              <strong>설계 인사이트</strong>를 확인해보세요!
            </div>
          </div>
        </section> -->
        <!-- 검색 결과 -->
        <section
          v-if="searched && searchResultArr.length > 0"
          class="filter-list scroll-y"
        >
          <div class="filter-list-inner">
            <h3 class="page-subtit">
              {{ searchResult.get('d_name') }}
              {{
                searchResult.get('comment') !== '없음'
                  ? ` - 아래 상품별 인수기준 확인바랍니다. ${searchResult.get(
                      'comment'
                    )}`
                  : ''
              }}
            </h3>
            <div class="wrap-col2 column" :class="{ on: searched }">
              <div class="col2-pL">
                <div class="inner">
                  <article class="box-tW">
                    <dl class="dl-fC2">
                      <dt>보장 정보</dt>
                      <dd
                        v-for="([key, value], index) in searchResultArr.slice(
                          8,
                          -1
                        )"
                        :key="index"
                      >
                        <div class="item">
                          <span>{{ key }}</span>
                          <i
                            :class="{
                              'badge-tR': value == '불가',
                              'badge-tB': value == '가능',
                            }"
                            >{{ value }}</i
                          >
                        </div>
                      </dd>
                    </dl>
                    <dl class="dl-fC2">
                      <dt>보장정보2</dt>
                      <dd>
                        <div class="item">
                          <span>{{ lastEntry[0] }}</span>
                          <i
                            :class="{
                              'badge-tR': lastEntry[1] == '불가',
                              'badge-tB': lastEntry[1] == '가능',
                            }"
                            >{{ lastEntry[1] }}</i
                          >
                        </div>
                      </dd>
                    </dl>
                  </article>
                  <article class="box-tW">
                    <ul class="list-info">
                      <li>
                        ※ 간편종신 주보험만 가입시(간편스탠다드
                        재해장해50%환급특약 포함) : AEUS 內 판정결과가
                        사망표준일 경우 추가 완화가능
                      </li>
                      <li>
                        ※ 간편더블보장 주보험만 가입시(생활비서비스,
                        더블보장보험료환급특약 포함) : AEUS 內 판정결과가
                        암,사망 표준일 경우 추가 완화 가능
                      </li>
                      <li>
                        ※ 간편웰에이징 입원류 특약 미부가시 : AEUS 內 판정결과가
                        LTC 표준일 경우 추가 완화 가능
                      </li>
                      <li>
                        ※ 더간편다모은/더라이트 [마케팅플랜]에 암,뇌,심 특약만
                        가입시 : AEUS 內 판정결과가 암,사망 표준일 경우 추가
                        완화가능
                      </li>
                      <li>※ 초간편보장, 초간편종신은 3개월 內 적용</li>
                    </ul>
                  </article>
                  <article class="box-tW">
                    <dl class="dl-fC">
                      <dt>유사 질병명</dt>
                      <!-- 유사검색어 -->
                      <dd>{{ searchResult.get('유사검색어') }}</dd>
                    </dl>
                  </article>
                  <article class="box-tB">
                    <dl class="dl-fR">
                      <dt>KCD코드</dt>
                      <dd>
                        {{ searchResult.get('대표KCD') }} (상세코드 :
                        {{ displayItems }} )
                        <button
                          class="moreButton"
                          v-show="
                            itemList.length > 5 &&
                            displayCount != itemList.length
                          "
                          @click="displayCount = itemList.length"
                        >
                          더보기
                        </button>
                      </dd>
                    </dl>
                  </article>
                </div>
              </div>
              <div class="col2-pR">
                <div class="inner">
                  <div
                    class="loading"
                    :class="{
                      on: isLoadingGpt == 'on',
                      off: isLoadingGpt == 'off',
                    }"
                  >
                    <p>AI가 답변중입니다.</p>
                  </div>
                  <article
                    class="box-tBB"
                    :class="{ on: isLoadingGpt == 'off' }"
                  >
                    <div class="box-tit">AI가 분석한 인사이트</div>
                    <div class="box-tG" v-html="gptData"></div>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import debounce from 'lodash.debounce'
import FormInput from '@/components/FormInput.vue'
import { Autocomplete, Under } from '@/utils/mockApi'
// import { getUserInfo } from '@/ui/uidev/AI/common'

export default {
  components: { FormInput },
  data() {
    return {
      keyword: '', //검색어
      gptData: `[답변]  
감기는 바이러스에 의해 코, 비강, 인후, 후두 등에 생기는 급성 상기도 감염으로, 급성 비인후염, 급성 부비동염, 급성 인후염, 급성 편도염, 급성 후두염 및 후두개염 등을 모두 포함하는 가장 흔한 급성기 질환입니다. 이는 한국표준질병·사인분류(8차, 2020년)에서 (대분류) Ⅹ. 호흡계통의 질환, (중분류) J00-J06 급성 상기도감염, (소분류) J00, J01, J02, J03, J04, J05, J06에 해당합니다.  

[참조문서]  
[2] 급성 상기도감염(감기), P29`, //AI답변
      isLoadingGpt: 'off', //AI답변로딩상태 on:로딩중, off:로딩완료
      listStatus: 'none',

      diseaseList: [], //질병리스트
      searchResult: {}, //검색결과
      searchResultArr: [], //검색결과
      lastEntry: [], //보장정보2

      searched: false, //검색여부

      displayCount: 5, //KCD코드 최대노출
      selectedIndex: -1, //질병리스트 index
    }
  },
  activated() {},
  computed: {
    displayItems() {
      const itemstoShow = this.itemList.slice(0, this.displayCount - 1)
      return itemstoShow.join(', ')
    },
  },
  methods: {
    //질문 입력중
    inputKeyword(e) {
      console.log(e)
      this.keyword = e.trim()
      if (this.keyword.length > 0) {
        this.onKeywordChange(this.keyword)
      }
    },
    //지연 함수 호출
    onKeywordChange: debounce(function (val) {
      this.getAutocomplete(val)
    }, 300),
    //질병 리스트 조회
    async getAutocomplete(val) {
      try {
        const res = await this.$axios.post(
          `/proxy/disease/autocomplete`,
          {
            query: val,
          },
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'X-Custom-Header': 'value',
            },
          }
        )
        // if (res.statusText == 'OK') {
        const autocomplete = Autocomplete()
        const data = autocomplete[0]
        console.log(data)
        if (data.d_keys.length > 0 && data.d_names.length > 0) {
          this.diseaseList = data.d_keys.map((key, idx) => ({
            key,
            name: data.d_names[idx],
            display: this.highlightMatch(data.d_names[idx], val),
          }))
          this.listStatus = 'auto'
        } else {
          this.diseaseList = []
          this.listStatus = 'none'
          this.getRecommended(val) //검색 결과 없을 경우 유사어 API 호출
        }
        this.selectedIndex = -1
        // }
      } catch (err) {
        console.error('질병 리스트 조회 실패:', err)
      }
    },
    //유사어 리스트 조회
    async getRecommended(val) {
      try {
        const res = await this.$axios.post(`/proxy/disease/ttk`, { query: val })
        if (res.statusText == 'OK') {
          const data = res.data
          if (data.d_keys.length > 0 && data.d_names.length > 0) {
            this.diseaseList = data.d_keys.map((key, idx) => ({
              key,
              display: this.highlightMatch(data.d_names[idx], val),
            }))
            this.listStatus = 'ttk'
          } else {
            this.diseaseList = []
            this.listStatus = 'none'
          }
          this.selectedIndex = -1
        }
      } catch (err) {
        console.error('유사어 리스트 조회 실패:', err)
      }
    },
    //검색어와 일치하는 부분을 <b>로 감싼 문자열 목록
    highlightMatch(text, keyword) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const reg = new RegExp(escapedKeyword, 'gi')
      return text.replace(reg, (match) => `<b>${match}</b>`)
    },
    onArrowDown() {
      if (this.diseaseList.length === 0) return
      this.selectedIndex = (this.selectedIndex + 1) % this.diseaseList.length
      this.scrollSelectedItemIntoView()
    },
    onArrowUp() {
      if (this.diseaseList.length === 0) return
      this.selectedIndex =
        (this.selectedIndex - 1 + this.diseaseList.length) %
        this.diseaseList.length
      this.scrollSelectedItemIntoView()
    },
    scrollSelectedItemIntoView() {
      this.$nextTick(() => {
        const elList = this.$refs.items
        const el = Array.isArray(elList) ? elList[this.selectedIndex] : null
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      })
    },
    onEnter() {
      if (this.diseaseList.length === 0 || this.selectedIndex < 0) return
      this.onSelect(this.selectedIndex)
    },
    //질병 상세 조회
    async onSelect(index) {
      console.log('onSelect')
      this.keyword = ''
      const selectedKey = this.diseaseList[index].key
      if (!selectedKey) return
      try {
        this.searched = true
        const data = Under()
        const underMsg = data[0].message.replace(/'/g, '"')
        const resultParse = JSON.parse(underMsg)
        this.searchResult = new Map(Object.entries(resultParse))
        this.searchResultArr = Array.from(this.searchResult.entries())
        this.lastEntry = this.searchResultArr.pop()
        this.itemList = this.searchResult.get('상세KCD').split(',')
        this.displayCount = 5

        // const res = await this.$axios.post(`/proxy/disease/under`, {
        //   d_key: selectedKey,
        // })
        // if (res.statusText == 'OK') {
        //   this.searched = true
        //   const underMsg = res.data.message.replace(/'/g, '"')
        //   const resultParse = JSON.parse(underMsg)

        //   this.searchResult = new Map(Object.entries(resultParse))
        //   this.searchResultArr = Array.from(this.searchResult.entries())
        //   this.lastEntry = this.searchResultArr.pop()
        //   this.itemList = this.searchResult.get('상세KCD').split(',')
        //   this.displayCount = 5

        //   this.startStreaming()
        // }
      } catch (err) {
        console.error('질병 상세 조회 실패:', err)
      }
    },
    //AI 답변 호출
    async startStreaming() {
      this.gptData = ''
      this.isLoadingGpt = 'on'

      const userInfo = getUserInfo()
      const params = {
        userId: userInfo.userId,
        qry: this.searchResult.get('d_name'),
        date: '',
        spctrt: '',
        mrch: '질병행위산출내역표준안내서',
        dtype: 'medical',
        gptToggle: 'on',
        msgKeyId: Date.now(),
        code3: null,
      }

      await this.$stream.fetchStream('/disease/medical', params, {
        headers: {
          userId: userInfo.userId,
          oamUserId: userInfo.oamUserId,
        },
        onChunk: (chunk) => {
          if (chunk.trim()) {
            this.gptData += chunk
          }
        },
        onDone: () => {
          if (!this.gptData || this.gptData.startsWith('{')) {
            this.gptData = '현재 네트워크 통신이 불안정합니다. 다시 시도해주세요.'
          }
        },
        onError: () => {
          this.gptData = '현재 네트워크 통신이 불안정합니다. 다시 시도해주세요.'
        },
        onFinished: () => {
          this.isLoadingGpt = 'off'
        },
      })
    },
  },
}
</script>
