import Vue from 'vue'
import VuePlyr from 'vue-plyr/dist/vue-plyr.ssr.js'
import 'vue-plyr/dist/vue-plyr.css'

// 이름을 명시적으로 지정하여 등록
Vue.use(VuePlyr, {
  plyr: {},
})
