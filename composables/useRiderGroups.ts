import { computed, type Ref } from 'vue'
import type { Rider } from '~/utils/coachingTrackData'

export const CATEGORY_ORDER = [
  '암진단', '암치료', '순환계진단', '순환계치료',
  '수술', '입원', '입원/수술', '시니어', '재해', '사망/장해', '기타',
]

export function useRiderGroups(ridersRef: Ref<Rider[]>) {
  const groupedRiders = computed(() => {
    const groups: Record<string, Rider[]> = {}
    ridersRef.value.forEach((rider) => {
      if (!groups[rider.category]) groups[rider.category] = []
      groups[rider.category].push(rider)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

    return sortedKeys.map((cat) => [cat, groups[cat]] as [string, Rider[]])
  })

  return { groupedRiders }
}
