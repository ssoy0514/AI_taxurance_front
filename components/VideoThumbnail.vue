<script>
export default {
  props: {
    videoName: {
      type: String,
      required: true,
      default: '',
    },
  },
  data() {
    return {
      duration: 0,
      thumbnailUrl: null,
      videoUrl: process.env.videoUrl,
    }
  },
  methods: {
    onMetadataLoaded() {
      const video = this.$refs.videoRef

      // 1. 총 시간 설정
      this.duration = video.duration

      // 2. 썸ne일 추출을 위해 특정 시간(1초)으로 이동
      video.currentTime = 1

      // 3. 시간 이동이 완료되면 캔버스에 그리기 (seeked 이벤트 활용)
      video.onseeked = () => {
        this.generateThumbnail(video)
      }
    },
    generateThumbnail(video) {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 캔버스 내용을 base64 이미지로 변환
      this.thumbnailUrl = canvas.toDataURL('image/png')
    },
  },
}
</script>

<template>
  <div class="video-helper">
    <video
      ref="videoRef"
      :src="videoUrl + videoName"
      @loadedmetadata="onMetadataLoaded"
      style="display: none"
      preload="metadata"
      crossorigin="anonymous"
    ></video>

    <div class="thumbnail-container">
      <img v-if="thumbnailUrl" :src="thumbnailUrl" alt="Thumbnail" />
    </div>
    <!-- <i class="icon-play"></i> 메인이랑 리스트랑 분기 필요-->
  </div>
</template>

<style lang="scss" scoped>
.video-helper {
  position: relative;
  width: 100%;
  height: 100%;
  .thumbnail-container {
    position: relative;
    width: 100%;
    height: 100%;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
    }
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.2);
    }
  }
  .icon-play {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 70px;
    height: 70px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 100%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    z-index: 10;
    &:before {
      width: 34px;
      height: 34px;
      mask-size: 34px;
      background-color: #fff;
    }
  }
}
</style>
