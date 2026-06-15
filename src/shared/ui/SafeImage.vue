<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { defaultPlaceImage } from '@/entities/place/api/placeApi'
import { usePlaceImageStore } from '@/stores/placeImages'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    src?: string | null
    fallbackSrc?: string
    alt?: string
  }>(),
  {
    fallbackSrc: defaultPlaceImage,
    alt: '',
  },
)

const imageStore = usePlaceImageStore()
const failedCurrentSrc = ref(false)

const resolvedSrc = computed(() => {
  if (!props.src || failedCurrentSrc.value || imageStore.isBroken(props.src)) {
    return props.fallbackSrc
  }
  return props.src
})

watch(
  () => props.src,
  () => {
    failedCurrentSrc.value = false
  },
)

function handleError() {
  if (!props.src || resolvedSrc.value === props.fallbackSrc) return
  imageStore.markBroken(props.src)
  failedCurrentSrc.value = true
}
</script>

<template>
  <img v-bind="$attrs" :src="resolvedSrc" :alt="alt" @error="handleError" />
</template>
