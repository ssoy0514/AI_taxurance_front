<template>
  <div>
    <section class="sort-m">
      <i class="sort"></i>
      <ul class="list-col3D">
        <li>{{ productNm ? productNm : '상품명' }}</li>
        <li>{{ dateKey ? dateKey : '판매기간' }}</li>
        <li>
          {{
            productNm && dateKey && termNm == ''
              ? '전체'
              : termNm
              ? termNm
              : '특약명'
          }}
        </li>
      </ul>
      <mo-button
        class="btn-accordion"
        :class="{ on: openSearch }"
        @click="openSearch = !openSearch"
        title="검색 열기/닫기"
        ><i></i
      ></mo-button>
    </section>
    <section
      class="wrap-selectG"
      :class="{ searched: searched, off: !openSearch }"
    >
      <ul class="list-selectG">
        <li class="w100">
          <label class="required">상품명</label>
          <div class="form-wrap">
            <mo-text-field
              v-model="productNm"
              placeholder="상품명을 입력해주세요."
              @input="onInput($event, 'product')"
              @focus="productYN = true"
              clearable
            />
            <div
              class="wrap-layer"
              v-show="
                isProductNm &&
                productYN &&
                Object.keys(foundProducts).length > 0
              "
            >
              <ul>
                <li
                  v-for="(item, key) in foundProducts"
                  :key="key"
                  v-html="highlightMatch(key, productNm)"
                  @click="onClick(item, key, 'product')"
                ></li>
              </ul>
            </div>
            <div
              class="wrap-layer"
              v-show="
                !isProductNm &&
                productYN &&
                Object.keys(productLists).length > 0
              "
            >
              <ul>
                <li
                  v-for="(item, key) in productLists"
                  :key="key"
                  @click="onClick(item, key, 'product')"
                >
                  {{ key }}
                </li>
              </ul>
            </div>
          </div>
        </li>
        <li class="w50">
          <label>판매기간</label>
          <div class="form-wrap">
            <mo-text-field
              v-model="dateKey"
              placeholder="기간을 설정하세요."
              @input="onInput($event, 'date')"
              @focus="dateListYN = true"
              :disabled="!Object.keys(deteLists).length > 0"
              :clearable="dateKey !== '전체'"
            />
            <div
              class="wrap-layer"
              v-if="dateListYN && Object.keys(deteLists).length > 0"
            >
              <ul>
                <li
                  v-for="(item, key) in deteLists"
                  :key="key"
                  @click="onClick(item, key, 'date')"
                >
                  {{ key }}
                </li>
              </ul>
            </div>
          </div>
        </li>
        <li class="w50">
          <label>특약</label>
          <div class="form-wrap">
            <mo-text-field
              v-model="termNm"
              placeholder="전체"
              @input="onInput($event, 'term')"
              @focus="termListYN = true"
              :disabled="termsLists.length < 1 || dateKey == '전체'"
              :clearable="termNm !== '전체'"
            />
            <div class="wrap-layer" v-if="termListYN && foundTerms.length > 0">
              <ul>
                <li
                  v-for="(item, key) in foundTerms"
                  :key="key"
                  v-html="highlightMatch(item, termNm)"
                  @click="onClick(item, key, 'term')"
                ></li>
              </ul>
            </div>
          </div>
        </li>
      </ul>
    </section>
    <div class="wrap-col2C">
      <section class="wrap-searchC">
        <div class="input-tC">
          <mo-text-field
            v-model="keyword"
            placeholder="약관 키워드나 검색어, 질문을 입력해주세요."
            clearable
            @enter="sendKeyword"
          />
          <mo-button
            class="btn-send"
            :disabled="!productNm || !dateKey || !keyword"
            @click="sendKeyword"
            >send</mo-button
          >
        </div>
      </section>
      <div
        class="wrap-btnR"
        v-if="productNm != '' && dateKey != '' && dateKey != '전체'"
      >
        <mo-button
          class="btn-tB2 ico-folder"
          @click="openPopUp(productNm, dateKey.substring(0, 8), 1)"
          >통약관 바로보기</mo-button
        >
      </div>
    </div>
    <!-- 검색결과 -->
    <template v-if="dataResult.length > 0">
      <div class="wrap-result">
        <div class="list-header">
          <div class="txt-sum">
            총 <strong>{{ dataResult.length }}</strong
            >건의 결과입니다.
          </div>
          <div class="wrap-switch">
            AI답변 <mo-switch v-model="onAI" labeled />
          </div>
        </div>
      </div>
      <div class="wrap-col2 column-reverse" :class="{ on: onAI }">
        <div class="col2-pL">
          <div class="inner">
            <section class="wrap-result">
              <div class="list-content">
                <ul class="wrap-list-result">
                  <li
                    class="graybox-item"
                    v-for="(item, index) in viewList"
                    :key="index"
                  >
                    <div class="wrap-item">
                      <div class="wrap-txt" :class="{ on: item.showAll }">
                        <p class="tit">{{ item.mrch_tl }}</p>
                        <p>{{ item.spctrt_tl }}</p>
                        <p v-html="item.context"></p>
                      </div>
                      <div class="wrap-btnC">
                        <mo-button
                          class="btn-wide"
                          :class="{ on: item.showAll }"
                          @click="item.showAll = !item.showAll"
                          ><span>펼치기</span><span>닫기</span><i></i
                        ></mo-button>
                      </div>
                      <div
                        class="icon"
                        :class="{ pdf: item.link_url !== '' }"
                        @click="
                          openPopUp(item.mrch_tl, item.date_tl, item.page_no)
                        "
                      ></div>
                    </div>
                  </li>
                </ul>
                <div class="wrap-btnCB">
                  <mo-button
                    class="btn-more"
                    v-show="dataResult.length > displayCount"
                    @click="moreList"
                    ><i>+</i> 3건 더보기</mo-button
                  >
                </div>
              </div>
            </section>
          </div>
        </div>
        <div class="col2-pR" v-if="onAI">
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
              <div class="box-tit">AI 답변입니다.</div>
              <div class="box-tG" v-html="gptData"></div>
            </article>
          </div>
        </div>
      </div>
    </template>
    <!-- 검색결과 없음 -->
    <div v-if="searched && dataResult.length === 0" class="result-wrap__none">
      <p>검색결과가 없습니다.</p>
      <p>총 0 건의 결과입니다. 다른 키워드를 입력해보세요.</p>
    </div>
    <div class="wrap-info">
      <ul>
        <li>
          신상품 약관을 포함한 모든 업데이트 내용은 매월 3주차내로 일괄
          반영됩니다.
        </li>
        <li>
          최신 내용이 반영되지 않은 경우, 추후 반영될 예정이오니 양해
          부탁드립니다.
        </li>
        <li>반영 일정은 매월 업무 상황에 따라 변동될 수 있습니다.</li>
      </ul>
    </div>
  </div>
</template>

<script>
import debounce from 'lodash.debounce'
import api from '@/api/axios'
import { getUserInfo } from '@/ui/uidev/AI/common'

export default {
  data() {
    return {
      productNm: '', //상품명
      dateKey: '', //판매기간
      termNm: '', //특약
      keyword: '', //검색어
      gptData: '', //AI답변
      isLoadingGpt: '', //AI답변로딩상태 on:로딩중, off:로딩완료

      productLists: {}, //상품명 list
      foundProducts: {}, //자동완성으로 찾아진 상품명 list
      deteLists: {}, //판매기간 list
      termsLists: [], //특약 list
      foundTerms: [], //자동완성으로 찾아진 특약 list
      dataResult: [], //검색결과 list
      viewList: [], //화면에 3개씩 노출

      isProductNm: false, //상품명 입력중여부
      productYN: false, //상품명 포커스여부
      dateListYN: false, //판매기간 포커스여부
      termListYN: false, //특약 포커스여부
      searched: false, //검색여부
      onAI: false, //AI답변여부
      openSearch: true, //검색 열기/닫기

      displayCount: 3, //검색결과 노출 갯수
    }
  },
  activated() {
    if (!Object.keys(this.productLists).length > 0) {
      this.getAutocomplete('')
    }
  },
  watch: {
    onAI: {
      immediate: true,
      handler(val) {
        if (val && !this.gptData && this.dataResult.length > 0) {
          this.startStreaming()
        }
      },
    },
  },
  mounted() {
    const bodyElement = document.querySelector('body')
    bodyElement.addEventListener('click', this.bodyClick)
  },
  methods: {
    //인풋 입력 중
    onInput(e, type) {
      if (type === 'product') {
        this.productNm = e.trim()
        if (this.productNm.length > 0) {
          this.isProductNm = true
          this.onProductNmChange(this.productNm)
        } else {
          this.isProductNm = false
        }
      } else if (type == 'date') {
        this.dateKey = e ? e : '전체'
        this.termNm = '전체'
      } else {
        if (this.termNm.length > 0) {
          this.foundTerms = this.termsLists.filter((item) =>
            item.includes(this.termNm)
          )
        } else {
          this.foundTerms = this.termsLists
        }
      }
      //초기화
      if (!this.isProductNm) {
        this.dateKey = ''
        this.deteLists = {}
        this.termsLists = []
        this.termNm = ''
      }
    },
    //인풋 클릭 시
    onClick(item, key, type) {
      if (type == 'product') {
        this.productNm = key
        this.deteLists = item
        this.dateKey = '전체'
      } else if (type == 'date') {
        this.dateKey = key ? key : '전체'
        this.termsLists = this.termsSort(item)
        this.foundTerms = this.termsSort(item)
      } else {
        this.termNm = item ? item : '전체'
      }
    },
    onProductNmChange: debounce(function (val) {
      const hangulReg = /^[가-힝0-9a-zA-Z\s]+$/
      if (hangulReg.test(val)) {
        this.getAutocomplete(val)
      }
    }, 300),
    //상품 리스트 조회
    async getAutocomplete(val) {
      try {
        const res = await api.post(`/proxy/term/autocomplete`, {
          sent: val,
        })
        if (res.statusText == 'OK') {
          const data = res.data.result

          if (val) {
            this.foundProducts = data
          } else {
            this.productLists = data
          }
        }
      } catch (err) {
        console.error('상품 리스트 조회 실패:', err)
      }
    },
    //검색버튼 클릭
    async sendKeyword() {
      if (!this.productNm || !this.dateKey || !this.keyword) return
      const userInfo = getUserInfo()
      this.sentTime = Date.now()
      try {
        const res = await api.post(`/proxy/term/search`, {
          userId: userInfo.userId,
          qry: this.keyword,
          date: this.dateKey == '전체' ? '' : this.dateKey,
          spctrt: this.termNm == '전체' ? '' : this.termNm,
          mrch: this.productNm,
          dtype: 'term',
          gptToggle: this.onAI ? 'on' : 'off',
          msgKeyId: this.sentTime,
          code3: null,
        })

        if (res.statusText == 'OK') {
          res.data.message.forEach((element) => {
            element.context = element.context.replaceAll(/\n<tr>/g, `<tr>`)
            element.context = element.context.replace(
              /<hl>/g,
              '<hl style="color: #0042dc;">'
            )
            element.context = element.context.replace(/<\/hl>/g, '</hl>')
            element.context = element.context.replaceAll(/(?!>)\n/g, '<br>')
            element.showAll = false
          })
          this.dataResult = res.data.message
          this.displayCount = 3
          this.displayList(this.dataResult)
          this.searched = true

          if (this.onAI && this.dataResult.length > 0) {
            this.startStreaming()
          }
        }
      } catch (err) {
        console.error('호출 실패:', err)
      }
    },
    //AI 답변 호출
    async startStreaming() {
      this.gptData = ''
      this.isLoadingGpt = 'on'

      const userInfo = getUserInfo()
      const formData = new FormData()

      formData.append('userId', userInfo.userId)
      formData.append('qry', this.keyword)
      formData.append('date', this.dateKey)
      formData.append('spctrt', this.termNm)
      formData.append('mrch', this.productNm)
      formData.append('msgKeyId', this.sentTime)

      let url
      if (process.env.VUE_APP_ENV === 'local') {
        url = '/proxy/term/qna'
      } else {
        url = process.env.VUE_APP_BASE_API_URL + 'term/qna'
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          userId: userInfo.userId,
          oamUserId: userInfo.oamUserId,
        },
        body: formData,
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
    //특약 정렬
    termsSort(terms) {
      if (terms.length > 0) {
        const sortedArr = terms.sort((a, b) => {
          const isASpecial = a.includes('특약')
          const isBSpecial = b.includes('특약')
          const isAAppendix = a.includes('유첨') || a.includes('부록')
          const isBAppendix = b.includes('유첨') || b.includes('부록')

          //유첨, 부록이 포함된 경우는 맨아래로
          if (isAAppendix && !isBAppendix) return 1
          if (!isAAppendix && isBAppendix) return -1

          //특약이 포함된 경우는 한국어 사전순서로 정렬
          if (isASpecial && isBSpecial) return a.localeCompare(b, 'ko-KR')
          if (isASpecial) return 1
          if (isBSpecial) return -1

          //그외에는 기본적으로 a가 위로 오도록 함
          return a.localeCompare(b, 'ko-KR')
        })
        return sortedArr
      }
    },
    //약관 오픈
    openPopUp(name, date, page) {
      const left = window.screenX + 800
      let popName = name.replaceAll('%', '프로')
      let popupUrl, baseUrl

      if (process.env.VUE_APP_ENV === 'local') {
        baseUrl = '/proxy/term/nas/'
      } else {
        baseUrl = process.env.VUE_APP_BASE_API_URL + 'term/nas/'
      }
      popupUrl = baseUrl + popName + '_' + date + '.pdf#page=' + page

      window.open(
        popupUrl,
        this.productNm,
        `toolbar=no,scrollbars=no,resizable=yes,status=no,menubar=no,width=992, height=920, top=200px,left=${left}px`
      )
    },
    //화면에 보이는 결과 리스트
    displayList(list) {
      this.viewList = list.slice(0, this.displayCount)
    },
    //더보기 클릭 시
    moreList() {
      this.displayCount += 3
      this.displayList(this.dataResult)
    },
    //검색어와 일치하는 부분을 <b>로 감싼 문자열 목록
    highlightMatch(text, keyword) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const reg = new RegExp(escapedKeyword, 'gi')
      return text.replace(reg, (match) => `<b>${match}</b>`)
    },
    //인풋 외 클릭 시
    bodyClick(e) {
      if (this.productYN || this.dateListYN || this.termListYN) {
        if (e.target.nodeName != 'INPUT') {
          this.productYN = false
          this.dateListYN = false
          this.termListYN = false
        }
      }
    },
  },
}
</script>
