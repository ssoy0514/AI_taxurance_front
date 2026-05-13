<script>
import Modal from '@/components/ModalComponent.vue'
import Kollus from '~/components/Kollus.vue'

export default {
  name: 'DetailView',
  components: { Modal, Kollus },

  props: {
    data: { type: Object, default: () => ({}) },
  },

  data() {
    return {
      imgUrl: process.env.imgUrl,
      pdfUrl: process.env.pdfUrl,
    }
  },

  computed: {
    type() {
      return this.data.ext_type
    },
    title() {
      const type = this.data.ext_type
      if (type === 'images') {
        return this.data.name.replaceAll('_', ' ').replaceAll('.png', '')
      } else if (type === 'pdfs') {
        return this.data.title.replaceAll('_', ' ')
      } else {
        return this.data.title
      }
    },
  },

  methods: {},

  mounted() {},
}
</script>

<template>
  <Modal size="xl" @close-popup="$emit('close-popup')">
    <template #heading>{{ title }}</template>
    <div class="card" v-if="type === 'images'">
      <img :src="imgUrl + data?.name" alt="" />
    </div>
    <div class="card" v-if="type === 'videos'">
      <Kollus :id="data?.object_id"></Kollus>
    </div>
    <div class="card" v-if="type === 'audios'">
      <Kollus :id="data?.object_id"></Kollus>
    </div>
    <div class="card" v-if="type === 'pdfs'">
      <object :data="pdfUrl + data?.name" type="application/pdf" width="100%">
        <p>
          이 브라우저는 PDF 미리보기를 지원하지 않습니다.
          <a class="btn-m btn-main" :href="pdfUrl + data?.name" download
            >PDF 파일 다운로드</a
          >
        </p>
      </object>
    </div>
  </Modal>
</template>

<style lang="scss" scoped>
.card {
  flex: 1;
  img {
    width: 100%;
  }
  object {
    p {
      font-size: 15px;
    }
  }
}
</style>
