import { ref } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'error' | 'success' | 'info'
}

const toasts = ref<Toast[]>([])
let counter = 0

export function useToast() {
  function show(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = ++counter
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    error: (msg: string) => show(msg, 'error', 5000),
    success: (msg: string) => show(msg, 'success'),
    info: (msg: string) => show(msg, 'info'),
  }
}
