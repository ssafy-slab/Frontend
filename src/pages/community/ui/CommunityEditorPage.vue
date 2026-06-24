<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ImagePlus, MapPin, Plus, Search, Send, Trash2, X } from 'lucide-vue-next'
import {
  createCommunityPost,
  fetchCommunityPost,
  resolveCommunityImageUrl,
  updateCommunityPost,
  uploadCommunityImage,
} from '@/entities/community/api/communityApi'
import { fetchPlaces } from '@/entities/place/api/placeApi'
import type { Place } from '@/entities/travel/model/travel'
import type { CommunityCellAlignment, CommunityPostCellPayload } from '@/entities/community/api/communityApi'

const props = defineProps<{
  accessToken: string
  editPostId?: number | null
}>()

const emit = defineEmits<{
  change: [view: string]
  created: [postId: number]
  saved: [message: string]
}>()

const categories = [
  { label: '장소 후기', value: 'PLACE_REVIEW' },
  { label: '여행 팁', value: 'TRAVEL_TIP' },
  { label: '질문', value: 'QUESTION' },
  { label: '자유게시판', value: 'FREE' },
]
const alignmentOptions = [
  { value: 'LEFT' as const, label: '왼쪽 정렬', icon: AlignLeft },
  { value: 'CENTER' as const, label: '가운데 정렬', icon: AlignCenter },
  { value: 'RIGHT' as const, label: '오른쪽 정렬', icon: AlignRight },
]

type EditorCell = {
  id: number
  cellType: 'TEXT' | 'IMAGE'
  textContent: string
  imageUrl: string
  file: File | null
  previewUrl: string
  alignment: CommunityCellAlignment
}

let nextCellId = 1

function createTextCell(textContent = '', alignment: CommunityCellAlignment = 'LEFT'): EditorCell {
  return {
    id: nextCellId++,
    cellType: 'TEXT',
    textContent,
    imageUrl: '',
    file: null,
    previewUrl: '',
    alignment,
  }
}

function createImageCell(imageUrl = '', alignment: CommunityCellAlignment = 'LEFT'): EditorCell {
  return {
    id: nextCellId++,
    cellType: 'IMAGE',
    textContent: '',
    imageUrl,
    file: null,
    previewUrl: '',
    alignment,
  }
}

const form = reactive({
  category: 'PLACE_REVIEW',
  title: '',
})
const cells = ref<EditorCell[]>([createTextCell()])
const placeQuery = ref('')
const selectedPlace = ref<Place | null>(null)
const placeResults = ref<Place[]>([])
const loadingPost = ref(false)
const searchingPlaces = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

const isEditMode = computed(() => Boolean(props.editPostId))
const hasValidCell = computed(() => cells.value.some((cell) => (
  cell.cellType === 'TEXT' ? Boolean(cell.textContent.trim()) : Boolean(cell.file || cell.imageUrl)
)))
const canAddCell = computed(() => cells.value.length < 5)
const canSubmit = computed(() => form.title.trim().length > 0 && hasValidCell.value && !submitting.value && !loadingPost.value)

let placeRequestId = 0
let placeSearchTimer: number | undefined

async function loadEditPost() {
  if (!props.editPostId) return
  loadingPost.value = true
  errorMessage.value = ''
  try {
    const post = await fetchCommunityPost(props.editPostId, props.accessToken)
    form.category = post.category
    form.title = post.title
    cells.value = post.cells?.length
      ? [...post.cells]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((cell) => cell.cellType === 'IMAGE'
          ? createImageCell(cell.imageUrl ?? '', cell.alignment ?? 'LEFT')
          : createTextCell(cell.textContent ?? '', cell.alignment ?? 'LEFT'))
      : [
        ...(post.imageUrl ? [createImageCell(post.imageUrl)] : []),
        ...(post.content ? [createTextCell(post.content)] : []),
      ]
    if (!cells.value.length) cells.value = [createTextCell()]
    if (post.placeId && post.placeName) {
      selectedPlace.value = {
        id: post.placeId,
        title: post.placeName,
        location: '',
        category: '',
        description: '',
        image: '',
        rating: 0,
        reviewCount: '0',
        tags: [],
        marker: { top: '50%', left: '50%' },
        coordinates: { lat: 0, lng: 0 },
      }
      placeQuery.value = post.placeName
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.'
  } finally {
    loadingPost.value = false
  }
}

function onCellImageSelected(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    errorMessage.value = '이미지 파일만 업로드할 수 있습니다.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = '이미지는 5MB 이하만 업로드할 수 있습니다.'
    return
  }
  const cell = cells.value[index]
  if (!cell) return
  clearCellImagePreview(cell)
  cell.file = file
  cell.imageUrl = ''
  cell.previewUrl = URL.createObjectURL(file)
}

function clearCellImagePreview(cell: EditorCell | undefined) {
  if (!cell) return
  if (cell.previewUrl) URL.revokeObjectURL(cell.previewUrl)
  cell.previewUrl = ''
  cell.file = null
}

function clearCellImage(index: number) {
  const cell = cells.value[index]
  if (!cell) return
  clearCellImagePreview(cell)
  cell.imageUrl = ''
}

function addTextCell() {
  if (!canAddCell.value) return
  cells.value.push(createTextCell())
}

function addImageCell() {
  if (!canAddCell.value) return
  cells.value.push(createImageCell())
}

function removeCell(index: number) {
  if (cells.value.length <= 1) return
  clearCellImagePreview(cells.value[index])
  cells.value.splice(index, 1)
}

function moveCell(index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= cells.value.length) return
  const nextCells = [...cells.value]
  const [cell] = nextCells.splice(index, 1)
  if (!cell) return
  nextCells.splice(targetIndex, 0, cell)
  cells.value = nextCells
}

function setCellAlignment(index: number, alignment: CommunityCellAlignment) {
  const cell = cells.value[index]
  if (cell) cell.alignment = alignment
}

function alignmentTextClass(alignment: CommunityCellAlignment) {
  if (alignment === 'CENTER') return 'text-center'
  if (alignment === 'RIGHT') return 'text-right'
  return 'text-left'
}

function alignmentFlexClass(alignment: CommunityCellAlignment) {
  if (alignment === 'CENTER') return 'justify-center'
  if (alignment === 'RIGHT') return 'justify-end'
  return 'justify-start'
}

function visibleCellImageUrl(cell: EditorCell) {
  return cell.previewUrl || resolveCommunityImageUrl(cell.imageUrl)
}

async function searchPlaces() {
  const keyword = placeQuery.value.trim()
  if (selectedPlace.value && keyword !== selectedPlace.value.title) {
    selectedPlace.value = null
  }
  if (keyword.length < 2) {
    placeResults.value = []
    return
  }

  const currentRequestId = ++placeRequestId
  searchingPlaces.value = true
  try {
    const result = await fetchPlaces({ keyword, page: 0, size: 8 })
    if (currentRequestId === placeRequestId) {
      placeResults.value = result.content
    }
  } catch {
    if (currentRequestId === placeRequestId) {
      placeResults.value = []
    }
  } finally {
    if (currentRequestId === placeRequestId) searchingPlaces.value = false
  }
}

function selectPlace(place: Place) {
  selectedPlace.value = place
  placeQuery.value = place.title
  placeResults.value = []
}

function clearPlace() {
  selectedPlace.value = null
  placeQuery.value = ''
  placeResults.value = []
}

async function submitPost() {
  if (!form.title.trim()) {
    errorMessage.value = '제목을 입력해주세요.'
    return
  }
  if (!hasValidCell.value) {
    errorMessage.value = '글 또는 사진 셀을 하나 이상 입력해주세요.'
    return
  }
  submitting.value = true
  errorMessage.value = ''
  try {
    const payloadCells: CommunityPostCellPayload[] = []
    for (const cell of cells.value) {
      if (cell.cellType === 'TEXT') {
        const textContent = cell.textContent.trim()
        if (textContent) payloadCells.push({ cellType: 'TEXT', textContent, imageUrl: null, alignment: cell.alignment })
        continue
      }
      let imageUrl = cell.imageUrl
      if (cell.file) {
        imageUrl = (await uploadCommunityImage(props.accessToken, cell.file)).imageUrl
      }
      if (imageUrl) payloadCells.push({ cellType: 'IMAGE', textContent: null, imageUrl, alignment: cell.alignment })
    }
    const content = payloadCells.find((cell) => cell.cellType === 'TEXT')?.textContent ?? undefined
    const imageUrl = payloadCells.find((cell) => cell.cellType === 'IMAGE')?.imageUrl ?? undefined

    const payload = {
      category: form.category,
      title: form.title.trim(),
      content,
      imageUrl,
      placeId: selectedPlace.value?.id ?? null,
      cells: payloadCells,
    }
    const saved = props.editPostId
      ? await updateCommunityPost(props.editPostId, props.accessToken, payload)
      : await createCommunityPost(props.accessToken, payload)
    emit('saved', props.editPostId ? '게시글이 수정되었습니다.' : '커뮤니티 글이 등록되었습니다.')
    emit('created', saved.postId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '게시글 저장에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}

watch(placeQuery, () => {
  if (placeSearchTimer) window.clearTimeout(placeSearchTimer)
  placeSearchTimer = window.setTimeout(searchPlaces, 250)
})

onMounted(loadEditPost)
onBeforeUnmount(() => {
  if (placeSearchTimer) window.clearTimeout(placeSearchTimer)
  cells.value.forEach(clearCellImagePreview)
})
</script>

<template>
  <section class="app-container max-w-3xl py-6 md:py-8">
    <button class="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'community')">
      <ArrowLeft :size="16" />
      커뮤니티로 돌아가기
    </button>

    <article class="brand-card rounded-xl p-5 sm:p-7">
      <div class="mb-6">
        <h1 class="text-2xl font-black text-slate-950">{{ isEditMode ? '커뮤니티 글 수정' : '커뮤니티 글쓰기' }}</h1>
        <p class="mt-2 text-sm font-semibold text-slate-500">여행지 후기, 팁, 질문을 다른 사용자와 공유해보세요.</p>
      </div>

      <p v-if="loadingPost" class="rounded-lg bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">게시글을 불러오는 중입니다.</p>

      <div v-else class="grid gap-5">
        <label class="block">
          <span class="mb-2 block text-sm font-black text-slate-950">카테고리</span>
          <span class="select-wrap select-wrap-full">
            <select v-model="form.category" class="brand-input select-control h-11 w-full rounded-lg px-3 text-sm outline-none">
              <option v-for="category in categories" :key="category.value" :value="category.value">
                {{ category.label }}
              </option>
            </select>
            <ChevronDown :size="15" class="select-chevron" />
          </span>
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-black text-slate-950">제목</span>
          <input v-model="form.title" data-testid="community-title-input" class="brand-input h-11 w-full rounded-lg px-3 text-sm outline-none" placeholder="예: 제주 비자림 오전 방문 후기" />
        </label>

        <section>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span class="block text-sm font-black text-slate-950">본문 셀</span>
            <div class="flex gap-2">
              <button type="button" data-testid="add-text-cell" class="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 disabled:opacity-50" :disabled="!canAddCell" @click="addTextCell">
                <Plus :size="14" />
                글
              </button>
              <button type="button" data-testid="add-image-cell" class="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 disabled:opacity-50" :disabled="!canAddCell" @click="addImageCell">
                <ImagePlus :size="14" />
                사진
              </button>
            </div>
          </div>

          <div class="grid gap-3">
            <div v-for="(cell, index) in cells" :key="cell.id" class="rounded-xl border border-slate-200 bg-white p-3">
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                  {{ cell.cellType === 'TEXT' ? '글' : '사진' }} {{ index + 1 }}
                </span>
                <div class="flex items-center gap-1">
                  <span class="mr-1 flex overflow-hidden rounded-lg border border-slate-200">
                    <button
                      v-for="option in alignmentOptions"
                      :key="option.value"
                      type="button"
                      :data-testid="`cell-align-${option.value.toLowerCase()}-${index}`"
                      class="grid size-8 place-items-center transition"
                      :class="cell.alignment === option.value ? 'bg-brand-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'"
                      :aria-label="option.label"
                      :aria-pressed="cell.alignment === option.value"
                      @click="setCellAlignment(index, option.value)"
                    >
                      <component :is="option.icon" :size="14" />
                    </button>
                  </span>
                  <button type="button" class="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500 disabled:opacity-30" :disabled="index === 0" @click="moveCell(index, -1)">
                    <ArrowUp :size="14" />
                  </button>
                  <button type="button" class="grid size-8 place-items-center rounded-lg bg-slate-50 text-slate-500 disabled:opacity-30" :disabled="index === cells.length - 1" @click="moveCell(index, 1)">
                    <ArrowDown :size="14" />
                  </button>
                  <button type="button" class="grid size-8 place-items-center rounded-lg bg-red-50 text-red-500 disabled:opacity-30" :disabled="cells.length === 1" @click="removeCell(index)">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <textarea
                v-if="cell.cellType === 'TEXT'"
                v-model="cell.textContent"
                :data-testid="`community-cell-text-${index}`"
                class="brand-input min-h-36 w-full resize-none rounded-lg px-3 py-3 text-sm leading-6 outline-none"
                :class="alignmentTextClass(cell.alignment)"
                placeholder="공유하고 싶은 여행 이야기를 적어주세요."
              />

              <div v-else>
                <label
                  v-if="!visibleCellImageUrl(cell)"
                  class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-brand-500 hover:bg-brand-50"
                >
                  <ImagePlus :size="24" class="text-brand-500" />
                  <span class="mt-2 text-sm font-black text-slate-800">사진 선택</span>
                  <span class="mt-1 text-xs font-bold text-slate-500">JPG, PNG, WebP, GIF · 최대 5MB</span>
                  <input :data-testid="`community-cell-image-${index}`" type="file" accept="image/*" class="hidden" @change="onCellImageSelected(index, $event)" />
                </label>
                <div v-else class="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div class="relative flex overflow-hidden" :class="alignmentFlexClass(cell.alignment)">
                    <img :src="visibleCellImageUrl(cell)" alt="셀 이미지 미리보기" class="block h-auto max-h-80 max-w-full" />
                    <button class="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/95 text-slate-700 shadow-lg" type="button" aria-label="이미지 제거" @click="clearCellImage(index)">
                      <X :size="16" />
                    </button>
                  </div>
                  <div class="flex items-center justify-between gap-3 px-3 py-2">
                    <p class="truncate text-xs font-bold text-slate-500">{{ cell.file?.name || '기존 이미지' }}</p>
                    <label class="cursor-pointer text-xs font-black text-brand-500 hover:text-brand-600">
                      다른 사진 선택
                      <input :data-testid="`community-cell-image-${index}`" type="file" accept="image/*" class="hidden" @change="onCellImageSelected(index, $event)" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <span class="mb-2 block text-sm font-black text-slate-950">연결할 여행지</span>
          <div class="relative">
            <div class="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <Search :size="17" class="text-slate-400" />
              <input v-model="placeQuery" class="min-w-0 flex-1 text-sm font-bold text-slate-900 outline-none" placeholder="여행지 이름으로 검색하세요" />
              <button v-if="selectedPlace" type="button" class="text-slate-400 hover:text-slate-700" @click="clearPlace">
                <X :size="17" />
              </button>
            </div>

            <div v-if="placeResults.length || searchingPlaces" class="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <p v-if="searchingPlaces" class="px-4 py-3 text-sm font-bold text-slate-500">여행지를 검색하는 중입니다.</p>
              <button v-for="place in placeResults" :key="place.id" type="button" class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50" @click="selectPlace(place)">
                <MapPin :size="17" class="mt-0.5 shrink-0 text-brand-500" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-black text-slate-950">{{ place.title }}</span>
                  <span class="mt-1 block truncate text-xs font-bold text-slate-500">{{ place.location }}</span>
                </span>
              </button>
            </div>
          </div>
          <p v-if="selectedPlace" class="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
            <Check :size="14" />
            {{ selectedPlace.title }} 연결됨
          </p>
        </section>
      </div>

      <p v-if="errorMessage" class="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{{ errorMessage }}</p>

      <div class="mt-7 flex justify-end gap-2">
        <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="emit('change', 'community')">
          취소
        </button>
        <button data-testid="submit-community-post" class="btn-primary inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canSubmit" @click="submitPost">
          <Send :size="16" />
          {{ submitting ? '저장 중' : (isEditMode ? '수정하기' : '등록하기') }}
        </button>
      </div>
    </article>
  </section>
</template>
