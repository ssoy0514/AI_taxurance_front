function pickDefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null))
}

export default {
  beforeRouteLeave(_to, _from, next) {
    this._sendPageLog('end')
    next()
  },

  mounted() {
    this._sendPageLog('start')
    window.addEventListener('beforeunload', this._handlePageUnload)
  },

  beforeDestroy() {
    window.removeEventListener('beforeunload', this._handlePageUnload)
  },

  methods: {
    _logPage() {
      return this.$route?.name || this.$options.name || 'unknown'
    },

    _handlePageUnload() {
      const payload = JSON.stringify({
        module: 'page',
        page: this._logPage(),
        status: 'end',
      })
      navigator.sendBeacon(
        '/api/log/',
        new Blob([payload], { type: 'application/json' })
      )
    },

    _sendPageLog(status) {
      this.$axios
        .post('/log/', {
          module: 'page',
          page: this._logPage(),
          status,
        })
        .catch(() => {})
    },

    _getInboundInfo() {
      const params = new URLSearchParams(window.location.search)
      return pickDefined({
        referrer: document.referrer || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        utm_term: params.get('utm_term'),
        utm_content: params.get('utm_content'),
      })
    },

    /**
     * @param {string} status   - 클릭 행위 코드 (예: 'quick', 'card.link', 'filter.reset')
     * @param {string} actionTarget - 클릭 대상 식별값 (예: content_id, keyword, 버튼명)
     * @param {object} [extra]      - 추가 컨텍스트
     */
    _sendClickLog(status, actionTarget, extra = {}) {
      this.$axios
        .post(
          '/log/',
          pickDefined({
            module: 'click',
            page: this._logPage(),
            status: status,
            action_target: actionTarget || null,
            ...this._getInboundInfo(),
            ...extra,
          })
        )
        .catch(() => {})
    },
  },
}
