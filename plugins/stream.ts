// plugins/stream.ts
import { Plugin } from '@nuxt/types'
import { StreamService } from '~/utils/stream-service'

const streamPlugin: Plugin = (ctx, inject) => {
  const streamService = new StreamService(ctx)
  inject('stream', streamService)
}

export default streamPlugin
