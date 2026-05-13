<template>
  <div class="rp">
    <p class="rp-header">New 플러스원 상품<br />까칠한 고객 대응하기</p>
    <button><i class="icon-s icon-play"></i>실전 연습 시작</button>
  </div>
</template>
<style lang="scss" scoped>
.rp {
  padding: 24px 27px 20px;
  position: relative;
  box-shadow: 0px 10px 15px -3px #c6d2ff, 0px 4px 6px -4px #c6d2ff;
  border-radius: 16px;
  background: linear-gradient(135deg, #4f4cfe, #6b57ff 48.08%, #9046ff);
}
.rp-header {
  color: #fff;
  font-size: 18px;
  line-height: 25px;
  font-weight: 600;
}
button {
  @include flexbox();
  gap: 8px;
  width: 100%;
  height: 32px;
  margin-top: 10px;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  color: #1e00ff;
  font-weight: 600;
}
</style>
