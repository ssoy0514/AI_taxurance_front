<template>
  <div>
    <section class="wrap-bnr" v-if="!searched">
      <div class="txt">
        <div class="exp">AI지식검색 WIZ에 오신 것을 환영합니다.</div>
        <div class="tit">
          <strong>질병별 보장 정보</strong>와 <strong>설계 인사이트</strong>를
          확인해보세요!
        </div>
      </div>
      <div class="bg"></div>
    </section>
    <section class="wrap-searchC">
      <div class="input-tC">
        <mo-text-field
          v-model="keyword"
          @input="inputKeyword"
          @keydown.down.prevent="onArrowDown"
          @keydown.up.prevent="onArrowUp"
          @keydown.enter.prevent="onEnter"
          placeholder="질병명 또는 KCD코드를 입력해주세요."
          clearable
        />
        <mo-button
          class="btn-send"
          :disabled="!keyword || diseaseList.length === 0"
          >send</mo-button
        >
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
    </section>
    <section class="wrap-bnr-m" v-if="!searched">
      <div class="icon"></div>
      <div class="txt">
        <div class="tit">
          <strong>질병별 보장 정보</strong>와 <br />
          <strong>설계 인사이트</strong>를 확인해보세요!
        </div>
      </div>
    </section>
    <!-- 검색 결과 -->
    <section v-if="searched && searchResultArr.length > 0">
      <h3 class="page-subtit">
        {{ searchResult.d_name }}
        {{
          searchResult.comment !== '없음'
            ? ` - 아래 상품별 인수기준 확인바랍니다. ${searchResult.comment}`
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
                  v-for="([key, value], index) in searchResultArr"
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
                  ※ 간편종신 주보험만 가입시(간편스탠다드 재해장해50%환급특약
                  포함) : AEUS 內 판정결과가 사망표준일 경우 추가 완화가능
                </li>
                <li>
                  ※ 간편더블보장 주보험만 가입시(생활비서비스,
                  더블보장보험료환급특약 포함) : AEUS 內 판정결과가 암,사망
                  표준일 경우 추가 완화 가능
                </li>
                <li>
                  ※ 간편웰에이징 입원류 특약 미부가시 : AEUS 內 판정결과가 LTC
                  표준일 경우 추가 완화 가능
                </li>
                <li>
                  ※ 더간편다모은/더라이트 [마케팅플랜]에 암,뇌,심 특약만 가입시
                  : AEUS 內 판정결과가 암,사망 표준일 경우 추가 완화가능
                </li>
                <li>※ 초간편보장, 초간편종신은 3개월 內 적용</li>
              </ul>
            </article>
            <article class="box-tW">
              <dl class="dl-fC">
                <dt>유사 질병명</dt>
                <!-- 유사검색어 -->
                <dd>{{ searchResult.유사검색어 }}</dd>
              </dl>
            </article>
            <article class="box-tB">
              <dl class="dl-fR">
                <dt>KCD코드</dt>
                <dd>
                  {{ searchResult.대표KCD }} (상세코드 : {{ displayItems }} )
                  <button
                    class="moreButton"
                    v-show="
                      itemList.length > 5 && displayCount != itemList.length
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
            <article class="box-tBB" :class="{ on: isLoadingGpt == 'off' }">
              <div class="box-tit">AI가 분석한 인사이트</div>
              <div class="box-tG" v-html="gptData"></div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import debounce from 'lodash.debounce'
import api from '@/api/axios'
import { getUserInfo } from '@/ui/uidev/AI/common'

export default {
  data() {
    return {
      keyword: '', //검색어
      gptData: '', //AI답변
      isLoadingGpt: '', //AI답변로딩상태 on:로딩중, off:로딩완료
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
        const res = await api.post(`/proxy/disease/autocomplete`, {
          query: val,
        })
        if (res.statusText == 'OK') {
          const data = res.data
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
        }
      } catch (err) {
        console.error('질병 리스트 조회 실패:', err)
      }
    },
    //유사어 리스트 조회
    async getRecommended(val) {
      try {
        const res = await api.post(`/proxy/disease/ttk`, { query: val })
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
      this.keyword = ''
      const selectedKey = this.diseaseList[index].key
      if (!selectedKey) return
      try {
        const res = await api.post(`/proxy/disease/under`, {
          d_key: selectedKey,
        })
        if (res.statusText == 'OK') {
          this.searched = true
          const underMsg = res.data.message.replace(/'/g, '"')
          const resultParse = JSON.parse(underMsg)

          // 메타데이터로 분류할 키 목록 정의
          const metaKeys = [
            'd_name',
            '대표KCD',
            '대표질병',
            '완화종류',
            '암UL검토',
            '유사검색어',
            '상세KCD',
            'comment',
          ]
          this.searchResult = {}
          const coverages = []

          Object.entries(resultParse).forEach(([key, value]) => {
            if (metaKeys.includes(key)) {
              this.searchResult[key] = value
            } else {
              coverages.push([key, value])
            }
          })

          this.lastEntry = coverages.length > 0 ? coverages.pop() : []
          this.searchResultArr = coverages
          this.itemList = (this.searchResult.상세KCD || '').split(',')
          this.displayCount = 5

          this.startStreaming()
        }
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
        qry: this.searchResult.d_name,
        date: '',
        spctrt: '',
        mrch: '질병행위산출내역표준안내서',
        dtype: 'medical',
        gptToggle: 'on',
        msgKeyId: Date.now(),
        code3: null,
      }
      let url
      if (process.env.VUE_APP_ENV === 'local') {
        url = '/proxy/disease/medical'
      } else {
        url = process.env.VUE_APP_BASE_API_URL + 'disease/medical'
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          userId: userInfo.userId,
          oamUserId: userInfo.oamUserId,
        },
        body: JSON.stringify(params),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let hasData = false
      let resData = ''
      this.isLoadingGpt = 'off'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (chunk.trim()) {
          hasData = true
          resData += chunk
          this.gptData += chunk
        }
      }
      if (!hasData || resData.startsWith('{')) {
        this.gptData = '현재 네트워크 통신이 불안정합니다. 다시 시도해주세요.'
      }
    },
  },
}
</script>
