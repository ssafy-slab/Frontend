<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, Link, ListOrdered, LoaderCircle, MapPin, Pencil, Plus, Search, Send, Sparkles, Trash2, UserCog, X } from 'lucide-vue-next'
import type { Trip } from '@/entities/travel/model/travel'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { createChatMessagePayload, createChatSubscribePayload, fetchChatMessages, getChatSocketUrl } from '@/entities/chat/api/chatApi'
import type { AiAnalysisNoResultReason, ChatMessageResponse, ChatSocketMessage } from '@/entities/chat/api/chatApi'
import { fetchPlaces } from '@/entities/place/api/placeApi'
import { analyzeTripChat, applyAiAnalysisRun, applyAiSuggestion, getAiSuggestions, rejectAiAnalysisRun, rejectAiSuggestion } from '@/entities/travel/api/tripAiApi'
import type { AiSuggestion, AiSuggestionStatus } from '@/entities/travel/api/tripAiApi'
import { castTripVoteBallot, closeTripVote, createAiSuggestionVote, getTripVote } from '@/entities/travel/api/tripVoteApi'
import type { VoteResponse } from '@/entities/travel/api/tripVoteApi'
import { createChecklistItem, createInviteCode, createTripSchedule, deleteChecklistItem, deleteScheduleItem, fetchChecklistItems, fetchTripMembers, fetchTripSchedules, updateTripMemberRole, updateTripSchedule } from '@/entities/travel/api/tripApi'
import type { ChecklistItemResponse, TripMemberResponse, TripMemberRole, TripSchedulePayload, TripScheduleResponse } from '@/entities/travel/api/tripApi'
import { canInviteTripMembers } from '@/entities/travel/model/tripAccess'
import type { Place } from '@/entities/travel/model/travel'

const props = defineProps<{
  trip: Trip | null
  accessToken?: string
  currentUser?: AuthUser | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
  openPlace: [placeId: number]
}>()

type ScheduleItem = {
  id: number
  scheduleItemId?: number
  placeId?: number | null
  date: string
  time: string
  endTime?: string
  title: string
  note: string
  category: string
  location: string
  active?: boolean
}

type Message = {
  id: number | string
  author: string
  text: string
  mine?: boolean
  pending?: boolean
}

type AiNoResultNotice = {
  analysisRunId: number
  reasonCode: AiAnalysisNoResultReason | null
  message: string
}

type Member = {
  id: number
  name: string
  email?: string
  role: string
  apiRole?: TripMemberRole
  owner?: boolean
}

const messageText = ref('')
const showInviteModal = ref(false)
const showMemberModal = ref(false)
const showOrderModal = ref(false)
const showScheduleModal = ref(false)
const inviteCode = ref('')
const isSaving = ref(false)
const isSavingChecklist = ref(false)
const isLoadingSchedules = ref(false)
const isLoadingPlaces = ref(false)
const isLoadingChecklist = ref(false)
const isLoadingMembers = ref(false)
const isLoadingMessages = ref(false)
const suggestions = ref<AiSuggestion[]>([])
const selectedStatus = ref<AiSuggestionStatus>('PENDING')
const isLoadingSuggestions = ref(false)
const isAnalyzing = ref(false)
const applyingSuggestionIds = ref<number[]>([])
const rejectingSuggestionIds = ref<number[]>([])
const creatingVoteSuggestionIds = ref<number[]>([])
const bulkProcessingRunId = ref<number | null>(null)
const hasNewSuggestions = ref(false)
const aiError = ref('')
const aiNoResult = ref<AiNoResultNotice | null>(null)
const additionalRequest = ref('')
const AI_SUGGESTIONS_PER_PAGE = 3
const aiSuggestionPage = ref(1)
const voteCreationTarget = ref<AiSuggestion | null>(null)
const activeVote = ref<VoteResponse | null>(null)
const isLoadingVote = ref(false)
const isCastingVote = ref(false)
const isClosingVote = ref(false)
const voteError = ref('')
const chatSocket = ref<WebSocket | null>(null)
const chatListEl = ref<HTMLElement | null>(null)
const pendingChatMessages = ref<string[]>([])
const chatLoadRequestId = ref(0)
const deleteScheduleTarget = ref<ScheduleItem | null>(null)
const editingSchedule = ref<ScheduleItem | null>(null)
const scheduleReplaceTarget = ref<ScheduleItem | null>(null)
const selectedScheduleItemId = ref<number | null>(null)
const canInviteMembers = computed(() => canInviteTripMembers(props.trip))
const isTeamTrip = computed(() => props.trip?.tripType?.toUpperCase() === 'TEAM')
const canManageTripMembers = computed(() => canInviteMembers.value && props.currentUser?.userId === props.trip?.ownerUserId)
const members = ref<Member[]>([])
const currentTripRole = computed(() => {
  if (props.currentUser?.userId === props.trip?.ownerUserId) return 'OWNER'
  return members.value.find((member) => member.id === props.currentUser?.userId)?.apiRole ?? null
})
const canCloseVotes = computed(() => currentTripRole.value === 'OWNER' || currentTripRole.value === 'EDITOR')
const checklistTitle = ref('')
const checklist = ref<ChecklistItemResponse[]>([])
const messages = ref<Message[]>([])
const scheduleItems = ref<ScheduleItem[]>([])
const placeOptions = ref<Place[]>([])
const placeSearchQuery = ref('')
const selectedSchedulePlaceTitle = ref('')
const scheduleDraft = reactive({
  mode: 'free' as 'free' | 'place',
  placeId: '',
  title: '',
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  memo: '',
})
let placeSearchRequestId = 0

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)
const isScheduleTimeRangeInvalid = computed(() => (
  Boolean(scheduleDraft.startTime && scheduleDraft.endTime)
  && timeToMinutes(scheduleDraft.endTime) < timeToMinutes(scheduleDraft.startTime)
))
const canSaveSchedule = computed(() => (
  !isSaving.value
  && Boolean(scheduleDraft.title.trim())
  && Boolean(scheduleDraft.date)
  && Boolean(scheduleDraft.startTime)
  && !isScheduleTimeRangeInvalid.value
))
const scheduleGroups = computed(() => {
  const groups = new Map<string, ScheduleItem[]>()
  sortScheduleItems(scheduleItems.value).forEach((item) => {
    groups.set(item.date, [...(groups.get(item.date) ?? []), item])
  })
  return Array.from(groups, ([date, items]) => ({ date, items }))
})
const aiSuggestionPageCount = computed(() => Math.max(1, Math.ceil(suggestions.value.length / AI_SUGGESTIONS_PER_PAGE)))
const pagedSuggestions = computed(() => {
  const start = (aiSuggestionPage.value - 1) * AI_SUGGESTIONS_PER_PAGE
  return suggestions.value.slice(start, start + AI_SUGGESTIONS_PER_PAGE)
})
const suggestionGroups = computed(() => {
  const groups = new Map<number, AiSuggestion[]>()
  pagedSuggestions.value.forEach((suggestion) => {
    groups.set(suggestion.analysisRunId, [...(groups.get(suggestion.analysisRunId) ?? []), suggestion])
  })
  return Array.from(groups, ([analysisRunId, items]) => ({ analysisRunId, items }))
})
const aiStatusOptions: Array<{ value: AiSuggestionStatus; label: string }> = [
  { value: 'PENDING', label: '검토 대기' },
  { value: 'VOTING', label: '투표 진행 중' },
  { value: 'APPLIED', label: '적용 완료' },
  { value: 'REJECTED', label: '거절됨' },
]
const defaultAiNoResultMessage = 'AI가 일정을 판단하지 못했습니다.'

function compareScheduleItems(left: ScheduleItem, right: ScheduleItem) {
  const dateCompare = left.date.localeCompare(right.date)
  if (dateCompare !== 0) return dateCompare
  const timeCompare = left.time.localeCompare(right.time)
  if (timeCompare !== 0) return timeCompare
  return left.id - right.id
}

function sortScheduleItems(items: ScheduleItem[]) {
  return [...items].sort(compareScheduleItems)
}

function getMemberRoleLabel(role: TripMemberRole) {
  if (role === 'OWNER') return '소유자'
  if (role === 'VIEWER') return '보기만 가능'
  return '편집 가능'
}

function getApiMemberRole(role: string): 'EDITOR' | 'VIEWER' {
  return role === '보기만 가능' ? 'VIEWER' : 'EDITOR'
}

function toMember(member: TripMemberResponse): Member {
  return {
    id: member.userId,
    name: member.nickname,
    role: getMemberRoleLabel(member.memberRole),
    apiRole: member.memberRole,
    owner: member.memberRole === 'OWNER',
  }
}

async function loadMembers() {
  if (!props.accessToken || !props.trip?.id || !canInviteMembers.value) return

  isLoadingMembers.value = true
  try {
    members.value = (await fetchTripMembers(props.accessToken, props.trip.id)).map(toMember)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '팀원 목록을 불러오지 못했습니다.')
  } finally {
    isLoadingMembers.value = false
  }
}

function toTimeInput(time: string | null | undefined) {
  return time ? time.slice(0, 5) : ''
}

function toApiTime(time: string) {
  return time.length === 5 ? `${time}:00` : time
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const clampedMinutes = Math.min(totalMinutes, 23 * 60 + 59)
  const hours = Math.floor(clampedMinutes / 60)
  const minutes = clampedMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getDefaultEndTime(startTime: string) {
  return minutesToTime(timeToMinutes(startTime) + 60)
}

function ensureValidEndTime() {
  if (!scheduleDraft.startTime) return
  if (!scheduleDraft.endTime) {
    scheduleDraft.endTime = getDefaultEndTime(scheduleDraft.startTime)
  }
}

function getDefaultScheduleDate() {
  return props.trip?.startDate ?? new Date().toISOString().slice(0, 10)
}

function getScheduleDayNo(scheduleDate: string) {
  if (!props.trip?.startDate) return 1
  const start = new Date(`${props.trip.startDate}T00:00:00`)
  const target = new Date(`${scheduleDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) return 1
  return Math.max(1, Math.floor((target.getTime() - start.getTime()) / 86_400_000) + 1)
}

function toScheduleItem(item: TripScheduleResponse): ScheduleItem {
  return {
    id: item.scheduleItemId,
    scheduleItemId: item.scheduleItemId,
    placeId: item.placeId,
    date: item.scheduleDate,
    time: toTimeInput(item.startTime),
    endTime: toTimeInput(item.endTime),
    title: item.title,
    note: item.memo ?? '',
    category: `Day ${item.dayNo}`,
    location: item.placeId ? '등록 여행지' : '자유 일정',
  }
}

async function searchSchedulePlaces() {
  const keyword = placeSearchQuery.value.trim()
  if (keyword.length < 2) {
    placeOptions.value = []
    return
  }

  const requestId = ++placeSearchRequestId
  isLoadingPlaces.value = true
  try {
    const result = await fetchPlaces({ keyword, page: 0, size: 8 })
    if (requestId === placeSearchRequestId) {
      placeOptions.value = result.content
    }
  } catch (error) {
    if (requestId === placeSearchRequestId) {
      placeOptions.value = []
      emit('saved', error instanceof Error ? error.message : '장소 목록을 불러오지 못했습니다.')
    }
  } finally {
    if (requestId === placeSearchRequestId) {
      isLoadingPlaces.value = false
    }
  }
}

function handleSchedulePlaceSearchInput() {
  if (selectedSchedulePlaceTitle.value && placeSearchQuery.value.trim() !== selectedSchedulePlaceTitle.value) {
    scheduleDraft.placeId = ''
    selectedSchedulePlaceTitle.value = ''
  }
  void searchSchedulePlaces()
}

function selectScheduleMode(mode: 'free' | 'place') {
  scheduleDraft.mode = mode
  if (mode === 'free') {
    scheduleDraft.placeId = ''
    placeSearchQuery.value = ''
    selectedSchedulePlaceTitle.value = ''
    placeOptions.value = []
    return
  }
  void searchSchedulePlaces()
}

function selectSchedulePlace(place: Place) {
  placeSearchRequestId += 1
  scheduleDraft.placeId = String(place.id)
  placeSearchQuery.value = place.title
  selectedSchedulePlaceTitle.value = place.title
  placeOptions.value = []
  isLoadingPlaces.value = false
  if (!scheduleDraft.title.trim()) {
    scheduleDraft.title = place.title
  }
}

async function loadScheduleItems() {
  if (!props.accessToken || !props.trip?.id) {
    scheduleItems.value = []
    return
  }

  isLoadingSchedules.value = true
  try {
    scheduleItems.value = sortScheduleItems((await fetchTripSchedules(props.accessToken, props.trip.id)).map(toScheduleItem))
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 불러오지 못했습니다.')
  } finally {
    isLoadingSchedules.value = false
  }
}

function resetScheduleDraft(item?: ScheduleItem) {
  editingSchedule.value = item ?? null
  scheduleDraft.mode = item?.placeId ? 'place' : 'free'
  scheduleDraft.placeId = item?.placeId ? String(item.placeId) : ''
  placeSearchQuery.value = item?.placeId ? item.title : ''
  selectedSchedulePlaceTitle.value = item?.placeId ? item.title : ''
  placeOptions.value = []
  scheduleDraft.title = item?.title ?? ''
  scheduleDraft.date = item?.date ?? getDefaultScheduleDate()
  scheduleDraft.startTime = item?.time ?? '10:00'
  scheduleDraft.endTime = item?.endTime ?? '11:00'
  scheduleDraft.memo = item?.note ?? ''
  if (scheduleDraft.mode === 'place') void searchSchedulePlaces()
}

function openCreateScheduleModal() {
  resetScheduleDraft()
  showScheduleModal.value = true
}

function openEditScheduleModal(item: ScheduleItem) {
  resetScheduleDraft(item)
  showScheduleModal.value = true
}

function openScheduleFlow(item: ScheduleItem) {
  selectedScheduleItemId.value = item.id
  showOrderModal.value = true
  void nextTick(() => {
    document.querySelector(`[data-schedule-flow-item="${item.id}"]`)?.scrollIntoView({ block: 'center' })
  })
}

function openFlowPlaceDetail(item: ScheduleItem) {
  if (!item.placeId) return
  showOrderModal.value = false
  emit('openPlace', item.placeId)
}

function findScheduleTimeConflict() {
  const editingItemId = editingSchedule.value?.id
  return scheduleItems.value.find((item) =>
    item.id !== editingItemId
    && item.date === scheduleDraft.date
    && item.time === scheduleDraft.startTime,
  ) ?? null
}

function buildSchedulePayload(replaceTarget?: ScheduleItem | null): TripSchedulePayload {
  ensureValidEndTime()
  const sameDateItems = scheduleItems.value.filter((item) => item.date === scheduleDraft.date)
  const editingSortOrder = editingSchedule.value
    ? sameDateItems.findIndex((item) => item.id === editingSchedule.value?.id) + 1
    : 0
  const replaceSortOrder = replaceTarget
    ? sameDateItems.findIndex((item) => item.id === replaceTarget.id) + 1
    : 0

  return {
    placeId: scheduleDraft.mode === 'place' && scheduleDraft.placeId ? Number(scheduleDraft.placeId) : null,
    scheduleDate: scheduleDraft.date,
    startTime: toApiTime(scheduleDraft.startTime),
    endTime: scheduleDraft.endTime ? toApiTime(scheduleDraft.endTime) : null,
    title: scheduleDraft.title.trim(),
    memo: scheduleDraft.memo.trim() || null,
    dayNo: getScheduleDayNo(scheduleDraft.date),
    sortOrder: replaceSortOrder > 0 ? replaceSortOrder : editingSortOrder > 0 ? editingSortOrder : sameDateItems.length + 1,
  }
}

async function saveScheduleItem(forceReplace = false) {
  if (!scheduleDraft.title.trim() || !scheduleDraft.date || !scheduleDraft.startTime) return
  if (isScheduleTimeRangeInvalid.value) return
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSaving.value = true
  try {
    const editingItem = editingSchedule.value
    const conflict = scheduleReplaceTarget.value ?? findScheduleTimeConflict()

    if (conflict && !forceReplace) {
      scheduleReplaceTarget.value = conflict
      return
    }
    if (conflict && forceReplace) {
      scheduleReplaceTarget.value = null
    }

    const payload = buildSchedulePayload(conflict)
    if (editingItem && conflict && forceReplace) {
      await deleteScheduleItem(props.accessToken, props.trip.id, conflict.scheduleItemId ?? conflict.id)
    }
    const saved = !editingItem && conflict && forceReplace
      ? await updateTripSchedule(props.accessToken, props.trip.id, conflict.scheduleItemId ?? conflict.id, payload)
      : editingItem?.scheduleItemId
        ? await updateTripSchedule(props.accessToken, props.trip.id, editingItem.scheduleItemId, payload)
        : await createTripSchedule(props.accessToken, props.trip.id, payload)
    const nextItem = toScheduleItem(saved)
    scheduleItems.value = sortScheduleItems(editingItem
      ? scheduleItems.value
        .filter((item) => item.id !== conflict?.id)
        .map((item) => (item.id === nextItem.id ? nextItem : item))
      : conflict && forceReplace
        ? scheduleItems.value.map((item) => (item.id === conflict.id ? nextItem : item))
        : [...scheduleItems.value, nextItem])
    showScheduleModal.value = false
    editingSchedule.value = null
    scheduleReplaceTarget.value = null
    emit('saved', editingItem ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 저장하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

async function loadChecklistItems() {
  if (!props.accessToken || !props.trip?.id) {
    checklist.value = []
    return
  }

  isLoadingChecklist.value = true
  try {
    checklist.value = await fetchChecklistItems(props.accessToken, props.trip.id)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 불러오지 못했습니다.')
  } finally {
    isLoadingChecklist.value = false
  }
}

async function addChecklistItem() {
  const title = checklistTitle.value.trim()
  if (!title) return
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSavingChecklist.value = true
  try {
    const created = await createChecklistItem(props.accessToken, props.trip.id, { title })
    checklist.value = [...checklist.value, created]
    checklistTitle.value = ''
    emit('saved', '체크리스트가 추가되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 추가하지 못했습니다.')
  } finally {
    isSavingChecklist.value = false
  }
}

async function removeChecklistItem(item: ChecklistItemResponse) {
  if (!props.accessToken || !props.trip?.id) {
    emit('saved', '로그인이 필요합니다.')
    return
  }

  isSavingChecklist.value = true
  try {
    await deleteChecklistItem(props.accessToken, props.trip.id, item.checklistItemId)
    checklist.value = checklist.value.filter((current) => current.checklistItemId !== item.checklistItemId)
    emit('saved', `${item.title}을(를) 삭제했습니다.`)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '체크리스트를 삭제하지 못했습니다.')
  } finally {
    isSavingChecklist.value = false
  }
}

function toggleChecklistItem(item: ChecklistItemResponse) {
  checklist.value = checklist.value.map((current) => (
    current.checklistItemId === item.checklistItemId ? { ...current, done: !current.done } : current
  ))
}

function toChatMessage(message: ChatMessageResponse): Message {
  return {
    id: message.messageId,
    author: message.senderNickname,
    text: message.content,
    mine: message.senderUserId === props.currentUser?.userId,
  }
}

function scrollChatToBottom() {
  window.setTimeout(() => {
    if (!chatListEl.value) return
    chatListEl.value.scrollTop = chatListEl.value.scrollHeight
  }, 0)
}

function appendServerMessage(message: ChatMessageResponse) {
  const nextMessage = toChatMessage(message)
  const existingIndex = messages.value.findIndex((item) => item.id === nextMessage.id)
  if (existingIndex >= 0) {
    messages.value[existingIndex] = nextMessage
    scrollChatToBottom()
    return
  }

  const pendingIndex = messages.value.findIndex(
    (item) => item.pending && item.mine && nextMessage.mine && item.text === nextMessage.text,
  )
  if (pendingIndex >= 0) {
    messages.value[pendingIndex] = nextMessage
    scrollChatToBottom()
    return
  }

  messages.value.push(nextMessage)
  scrollChatToBottom()
}

function formatSuggestionDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

function formatSuggestionTime(time: string | null) {
  return time ? time.slice(0, 5) : ''
}

function suggestionStatusLabel(status: AiSuggestionStatus) {
  if (status === 'VOTING') return '투표 진행 중'
  if (status === 'APPLIED') return '적용 완료'
  if (status === 'REJECTED') return '거절됨'
  return '검토 대기'
}

function aiNoResultMessage(reasonCode: AiAnalysisNoResultReason, message?: string) {
  if (message?.trim()) return message.trim()
  if (reasonCode === 'INSUFFICIENT_MESSAGES') {
    return '분석할 채팅 메시지가 충분하지 않습니다.'
  }
  return '채팅에서 일정 관련 내용을 찾지 못했습니다.'
}

async function loadAiSuggestions(status: AiSuggestionStatus = selectedStatus.value) {
  if (!props.accessToken || !props.trip?.id) {
    suggestions.value = []
    return
  }

  isLoadingSuggestions.value = true
  aiError.value = ''
  try {
    suggestions.value = await getAiSuggestions(props.accessToken, props.trip.id, status)
    aiSuggestionPage.value = 1
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : 'AI 일정 제안을 불러오지 못했습니다.'
    emit('saved', aiError.value)
  } finally {
    isLoadingSuggestions.value = false
  }
}

async function selectAiStatus(status: AiSuggestionStatus) {
  selectedStatus.value = status
  aiSuggestionPage.value = 1
  hasNewSuggestions.value = false
  await loadAiSuggestions(status)
}

async function requestAiAnalysis() {
  if (!props.accessToken || !props.trip?.id || isAnalyzing.value) return

  isAnalyzing.value = true
  aiError.value = ''
  aiNoResult.value = null
  try {
    const result = await analyzeTripChat(props.accessToken, props.trip.id, {
      messageLimit: 100,
      additionalRequest: additionalRequest.value.trim() || null,
    })
    selectedStatus.value = 'PENDING'
    suggestions.value = result.suggestions
    aiSuggestionPage.value = 1
    additionalRequest.value = ''
    if (result.status === 'NO_RESULT') {
      hasNewSuggestions.value = false
      aiNoResult.value = {
        analysisRunId: result.analysisRunId,
        reasonCode: null,
        message: defaultAiNoResultMessage,
      }
      emit('saved', defaultAiNoResultMessage)
      return
    }
    hasNewSuggestions.value = result.suggestions.length > 0
    emit('saved', result.suggestions.length > 0 ? 'AI 일정 제안이 도착했습니다.' : '새로운 AI 일정 제안이 없습니다.')
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : 'AI 일정 분석을 시작하지 못했습니다.'
    emit('saved', aiError.value)
  } finally {
    isAnalyzing.value = false
  }
}

function setSuggestionProcessing(ids: number[], suggestionId: number, active: boolean) {
  return active ? [...ids, suggestionId] : ids.filter((id) => id !== suggestionId)
}

async function applySuggestion(suggestion: AiSuggestion) {
  if (!props.accessToken || !props.trip?.id) return
  applyingSuggestionIds.value = setSuggestionProcessing(applyingSuggestionIds.value, suggestion.aiSuggestionId, true)
  try {
    await applyAiSuggestion(props.accessToken, props.trip.id, suggestion.aiSuggestionId)
    await Promise.all([loadAiSuggestions(), loadScheduleItems()])
    emit('saved', '일정에 적용했습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : 'AI 일정 제안을 적용하지 못했습니다.')
    await Promise.all([loadAiSuggestions(), loadScheduleItems()])
  } finally {
    applyingSuggestionIds.value = setSuggestionProcessing(applyingSuggestionIds.value, suggestion.aiSuggestionId, false)
  }
}

async function rejectSuggestion(suggestion: AiSuggestion) {
  if (!props.accessToken || !props.trip?.id) return
  rejectingSuggestionIds.value = setSuggestionProcessing(rejectingSuggestionIds.value, suggestion.aiSuggestionId, true)
  try {
    await rejectAiSuggestion(props.accessToken, props.trip.id, suggestion.aiSuggestionId)
    await loadAiSuggestions()
    emit('saved', '제안을 거절했습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : 'AI 일정 제안을 거절하지 못했습니다.')
    await loadAiSuggestions()
  } finally {
    rejectingSuggestionIds.value = setSuggestionProcessing(rejectingSuggestionIds.value, suggestion.aiSuggestionId, false)
  }
}

function openCreateSuggestionVote(suggestion: AiSuggestion) {
  if (!isTeamTrip.value) return
  voteCreationTarget.value = suggestion
}

async function createSuggestionVote() {
  if (!props.accessToken || !props.trip?.id || !isTeamTrip.value || !voteCreationTarget.value) return
  const suggestion = voteCreationTarget.value
  creatingVoteSuggestionIds.value = setSuggestionProcessing(
    creatingVoteSuggestionIds.value,
    suggestion.aiSuggestionId,
    true,
  )
  try {
    await createAiSuggestionVote(props.accessToken, props.trip.id, suggestion.aiSuggestionId)
    voteCreationTarget.value = null
    selectedStatus.value = 'VOTING'
    await loadAiSuggestions('VOTING')
    emit('saved', 'AI 일정 제안을 투표에 올렸습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : 'AI 일정 제안 투표를 만들지 못했습니다.')
    await loadAiSuggestions('PENDING')
  } finally {
    creatingVoteSuggestionIds.value = setSuggestionProcessing(
      creatingVoteSuggestionIds.value,
      suggestion.aiSuggestionId,
      false,
    )
  }
}

async function openSuggestionVote(suggestion: AiSuggestion) {
  if (!props.accessToken || !props.trip?.id || suggestion.voteId === null) return
  isLoadingVote.value = true
  voteError.value = ''
  try {
    activeVote.value = await getTripVote(props.accessToken, props.trip.id, suggestion.voteId)
  } catch (error) {
    voteError.value = error instanceof Error ? error.message : '투표를 불러오지 못했습니다.'
    emit('saved', voteError.value)
  } finally {
    isLoadingVote.value = false
  }
}

async function castVote(voteOptionId: number) {
  if (!props.accessToken || !props.trip?.id || !activeVote.value || isCastingVote.value) return
  isCastingVote.value = true
  voteError.value = ''
  try {
    activeVote.value = await castTripVoteBallot(
      props.accessToken,
      props.trip.id,
      activeVote.value.voteId,
      voteOptionId,
    )
  } catch (error) {
    voteError.value = error instanceof Error ? error.message : '투표에 참여하지 못했습니다.'
  } finally {
    isCastingVote.value = false
  }
}

async function closeVote() {
  if (!props.accessToken || !props.trip?.id || !activeVote.value || isClosingVote.value || !canCloseVotes.value) return
  isClosingVote.value = true
  voteError.value = ''
  try {
    await closeTripVote(props.accessToken, props.trip.id, activeVote.value.voteId)
    activeVote.value = null
    await Promise.all([loadAiSuggestions(selectedStatus.value), loadScheduleItems()])
    emit('saved', '투표를 종료하고 결과를 반영했습니다.')
  } catch (error) {
    voteError.value = error instanceof Error ? error.message : '투표를 종료하지 못했습니다.'
    emit('saved', voteError.value)
  } finally {
    isClosingVote.value = false
  }
}

async function processAnalysisRun(analysisRunId: number, action: 'apply' | 'reject') {
  if (!props.accessToken || !props.trip?.id || bulkProcessingRunId.value !== null) return
  bulkProcessingRunId.value = analysisRunId
  try {
    if (action === 'apply') {
      await applyAiAnalysisRun(props.accessToken, props.trip.id, analysisRunId)
      await Promise.all([loadAiSuggestions(), loadScheduleItems()])
      emit('saved', 'AI 제안을 일정에 모두 적용했습니다.')
    } else {
      await rejectAiAnalysisRun(props.accessToken, props.trip.id, analysisRunId)
      await loadAiSuggestions()
      emit('saved', 'AI 제안을 모두 거절했습니다.')
    }
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : 'AI 제안 묶음을 처리하지 못했습니다.')
    await Promise.all([loadAiSuggestions(), action === 'apply' ? loadScheduleItems() : Promise.resolve()])
  } finally {
    bulkProcessingRunId.value = null
  }
}

function openSuggestionPlace(suggestion: AiSuggestion) {
  if (suggestion.suggestedPlaceId === null) return
  emit('openPlace', suggestion.suggestedPlaceId)
}

function mergeLoadedChatMessages(loadedMessages: Message[]) {
  const loadedIds = new Set(loadedMessages.map((message) => message.id))
  const currentOnlyMessages = messages.value.filter((message) => !loadedIds.has(message.id))
  messages.value = [...loadedMessages, ...currentOnlyMessages]
}

async function loadChatMessages() {
  if (!props.accessToken || !props.trip?.id) return

  const requestId = ++chatLoadRequestId.value
  isLoadingMessages.value = true
  try {
    const loadedMessages = (await fetchChatMessages(props.accessToken, props.trip.id, 50)).map(toChatMessage)
    if (requestId !== chatLoadRequestId.value) return
    mergeLoadedChatMessages(loadedMessages)
    scrollChatToBottom()
  } catch (error) {
    if (requestId !== chatLoadRequestId.value) return
    emit('saved', error instanceof Error ? error.message : '채팅 메시지를 불러오지 못했습니다.')
  } finally {
    if (requestId === chatLoadRequestId.value) {
      isLoadingMessages.value = false
    }
  }
}

function closeChatSocket() {
  if (!chatSocket.value) return
  chatSocket.value.close()
  chatSocket.value = null
}

function flushPendingChatMessages() {
  if (!props.trip?.id || chatSocket.value?.readyState !== WebSocket.OPEN) return
  while (pendingChatMessages.value.length > 0) {
    const content = pendingChatMessages.value.shift()
    if (!content) continue
    chatSocket.value.send(JSON.stringify(createChatMessagePayload(props.trip.id, content)))
  }
}

function connectChatSocket() {
  closeChatSocket()
  if (!props.accessToken || !props.trip?.id) return

  const tripId = props.trip.id
  const socket = new WebSocket(getChatSocketUrl(props.accessToken))
  chatSocket.value = socket

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify(createChatSubscribePayload(tripId)))
    flushPendingChatMessages()
  })
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data) as ChatSocketMessage
    if (data.type === 'MESSAGE' && data.message) {
      appendServerMessage(data.message)
      return
    }
    if (data.type === 'AI_ANALYSIS_COMPLETED' && data.tripId === props.trip?.id) {
      selectedStatus.value = 'PENDING'
      hasNewSuggestions.value = true
      aiNoResult.value = null
      void loadAiSuggestions('PENDING')
      emit('saved', '새로운 AI 일정 제안이 도착했습니다.')
      return
    }
    if (data.type === 'AI_ANALYSIS_NO_RESULT' && data.tripId === props.trip?.id) {
      const message = aiNoResultMessage(data.reasonCode, data.message)
      selectedStatus.value = 'PENDING'
      hasNewSuggestions.value = false
      aiNoResult.value = {
        analysisRunId: data.analysisRunId,
        reasonCode: data.reasonCode,
        message,
      }
      void loadAiSuggestions('PENDING')
      emit('saved', message)
      return
    }
    if (data.type === 'ERROR' && data.error) {
      emit('saved', data.error)
    }
  })
  socket.addEventListener('error', () => {
    emit('saved', '채팅 서버에 연결하지 못했습니다.')
  })
}

async function resetChat() {
  messages.value = []
  closeChatSocket()
  connectChatSocket()
  await loadChatMessages()
}

function sendMessage() {
  const text = messageText.value.trim()
  if (!text) return
  if (!props.trip?.id) {
    emit('saved', '채팅을 보낼 일정을 찾지 못했습니다.')
    return
  }

  messages.value.push({
    id: `pending-${Date.now()}`,
    author: props.currentUser?.nickname ?? '나',
    text,
    mine: true,
    pending: true,
  })
  messageText.value = ''
  scrollChatToBottom()

  if (chatSocket.value?.readyState === WebSocket.OPEN) {
    try {
      chatSocket.value.send(JSON.stringify(createChatMessagePayload(props.trip.id, text)))
    } catch {
      pendingChatMessages.value.push(text)
      connectChatSocket()
    }
    return
  }

  pendingChatMessages.value.push(text)
  if (!chatSocket.value || chatSocket.value.readyState === WebSocket.CLOSED || chatSocket.value.readyState === WebSocket.CLOSING) {
    connectChatSocket()
  }
}

async function generateInviteCode() {
  if (!props.trip?.id) return
  if (!props.accessToken) {
    emit('saved', '로그인이 필요합니다.')
    return
  }
  if (!canManageTripMembers.value) {
    emit('saved', '소유자만 초대 코드를 만들 수 있습니다.')
    return
  }
  if (props.trip.tripType && props.trip.tripType.toUpperCase() !== 'TEAM') {
    emit('saved', '팀 여행만 초대 코드를 만들 수 있습니다.')
    return
  }

  isSaving.value = true
  try {
    const result = await createInviteCode(props.accessToken, props.trip.id)
    inviteCode.value = result.inviteCode
    emit('saved', '초대 코드가 준비되었습니다.')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '초대 코드를 만들지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

async function changeMemberRole(member: Member) {
  if (!props.accessToken || !props.trip?.id || member.owner || !canManageTripMembers.value) return
  const nextRole = getApiMemberRole(member.role)
  if (member.apiRole === nextRole) return

  isSaving.value = true
  try {
    const updated = await updateTripMemberRole(props.accessToken, props.trip.id, member.id, nextRole)
    const updatedMember = toMember(updated)
    members.value = members.value.map((item) => (item.id === updatedMember.id ? updatedMember : item))
    emit('saved', `${updatedMember.name} 권한을 변경했습니다.`)
  } catch (error) {
    member.role = getMemberRoleLabel(member.apiRole ?? 'EDITOR')
    emit('saved', error instanceof Error ? error.message : '팀원 권한을 변경하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

function requestRemoveScheduleItem(item: ScheduleItem) {
  deleteScheduleTarget.value = item
}

async function confirmRemoveScheduleItem() {
  if (!deleteScheduleTarget.value) return
  const target = deleteScheduleTarget.value
  isSaving.value = true
  try {
    if (props.accessToken && props.trip?.id && target.scheduleItemId) {
      await deleteScheduleItem(props.accessToken, props.trip.id, target.scheduleItemId)
    }
    scheduleItems.value = scheduleItems.value.filter((item) => item.id !== target.id)
    deleteScheduleTarget.value = null
    emit('saved', `${target.title}을 삭제했습니다.`)
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '일정을 삭제하지 못했습니다.')
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadMembers()
  void loadScheduleItems()
  void loadChecklistItems()
  void resetChat()
  void loadAiSuggestions()
})
watch(() => [props.accessToken, props.trip?.id, props.trip?.tripType], loadMembers)
watch(() => [props.accessToken, props.trip?.id], loadScheduleItems)
watch(() => [props.accessToken, props.trip?.id], loadChecklistItems)
watch(() => [props.accessToken, props.trip?.id], () => {
  void resetChat()
  selectedStatus.value = 'PENDING'
  aiSuggestionPage.value = 1
  hasNewSuggestions.value = false
  aiNoResult.value = null
  void loadAiSuggestions('PENDING')
})
watch(aiSuggestionPageCount, (pageCount) => {
  if (aiSuggestionPage.value > pageCount) aiSuggestionPage.value = pageCount
})
onBeforeUnmount(closeChatSocket)
</script>

<template>
  <section class="app-container py-6">
    <button class="mb-4 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'schedule')">← 목록으로 돌아가기</button>

    <header class="brand-card mb-5 flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black text-slate-950 sm:text-3xl">{{ trip?.title ?? '\uC120\uD0DD\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4' }}</h1>
        <p class="mt-2 text-sm font-bold text-slate-500">{{ trip?.period ?? '\uC77C\uC815 \uAE30\uAC04 \uBBF8\uC815' }} &middot; {{ trip?.destination ?? '\uBAA9\uC801\uC9C0 \uBBF8\uC815' }}</p>
      </div>
      <div class="flex items-center gap-4">
        <button v-if="canInviteMembers" class="flex items-center rounded-full pr-1 transition hover:scale-105" aria-label="참여자 관리" @click="showMemberModal = true">
          <span
            v-for="member in members.slice(0, 4)"
            :key="member.id"
            :data-testid="`member-avatar-${member.id}`"
            class="-ml-2 grid size-8 first:ml-0 place-items-center rounded-full border-2 border-white bg-brand-100 text-xs font-black text-brand-600"
          >
            {{ member.name.slice(0, 1) }}
          </span>
        </button>
        <button v-if="canInviteMembers" class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-black text-white hover:bg-brand-600" @click="showInviteModal = true">
          <Link :size="17" />
          팀원 초대
        </button>
      </div>
    </header>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
      <div class="min-w-0 space-y-4">
      <aside class="brand-card flex max-h-[680px] min-h-0 flex-col overflow-hidden rounded-xl xl:max-h-[calc(100vh-300px)] xl:min-h-[480px]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">전체 일정</h2>
          <div class="flex items-center gap-1.5">
            <button data-testid="find-places-from-schedule" class="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-xs font-black text-brand-500 ring-1 ring-brand-100 hover:bg-brand-50" @click="emit('change', 'explore')">
              <Search :size="14" />
              여행지 찾기
            </button>
            <button data-testid="open-schedule-form" class="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600" aria-label="일정 추가" @click="openCreateScheduleModal">
              <Plus :size="15" />
              일정 추가
            </button>
          </div>
        </div>
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p v-if="isLoadingSchedules" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            일정을 불러오는 중입니다.
          </p>
          <p v-else-if="scheduleItems.length === 0" class="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
            아직 등록된 일정이 없습니다.
          </p>
          <section v-for="group in scheduleGroups" :key="group.date">
            <h3 class="mb-2 flex items-center gap-1.5 text-xs font-black text-brand-500">
              <CalendarCheck :size="14" />
              {{ group.date }}
            </h3>
            <div class="space-y-2">
              <article
                v-for="item in group.items"
                :key="item.id"
                class="grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition hover:border-brand-500"
                :class="[item.active ? 'border-l-4 border-brand-500' : 'border-slate-200', item.placeId ? 'cursor-pointer hover:bg-brand-50/40' : 'cursor-pointer hover:bg-slate-50']"
                :data-testid="`schedule-card-${item.scheduleItemId}`"
                @click="openScheduleFlow(item)"
              >
                <div class="min-w-0">
                  <h4 class="truncate text-sm font-black text-slate-800">{{ item.time }} {{ item.title }}</h4>
                  <p
                    v-if="item.note"
                    class="mt-1 line-clamp-2 break-words text-xs font-bold leading-5 text-slate-500"
                    :data-testid="`schedule-note-${item.scheduleItemId}`"
                  >
                    <MapPin v-if="item.active" :size="14" class="mr-1 inline-block align-[-2px]" />
                    {{ item.note }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-1 justify-self-end" :data-testid="`schedule-actions-${item.scheduleItemId}`">
                  <button class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500" :aria-label="`${item.title} 삭제`" @click.stop="requestRemoveScheduleItem(item)">
                    <Trash2 :size="16" />
                  </button>
                  <button class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-brand-50 hover:text-brand-500" :aria-label="`${item.title} 수정`" :data-testid="`edit-schedule-${item.scheduleItemId}`" @click.stop="openEditScheduleModal(item)">
                    <Pencil :size="16" />
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </aside>

      <section class="brand-card max-h-[340px] overflow-hidden rounded-xl p-4">
        <div class="flex items-center justify-between">
          <h3 class="flex items-center gap-2 font-black text-slate-950">
            <CalendarCheck :size="18" />
            준비 체크리스트
          </h3>
          <span class="text-sm font-black text-brand-500">{{ doneCount }}/{{ checklist.length }} 완료</span>
        </div>
        <div class="mt-3 flex gap-2">
          <input
            v-model="checklistTitle"
            data-testid="checklist-title-input"
            class="brand-input h-10 min-w-0 flex-1 rounded-lg px-3 text-sm outline-none"
            placeholder="준비물을 입력하세요"
            :disabled="isSavingChecklist"
            @keyup.enter="addChecklistItem"
          />
          <button
            class="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="체크리스트 추가"
            :disabled="isSavingChecklist || !checklistTitle.trim()"
            @click="addChecklistItem"
          >
            <Plus :size="18" />
          </button>
        </div>
        <p v-if="isLoadingChecklist" class="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
          체크리스트를 불러오는 중입니다.
        </p>
        <p v-else-if="checklist.length === 0" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
          아직 등록된 체크리스트가 없습니다.
        </p>
        <div v-else class="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1">
          <div
            v-for="item in checklist"
            :key="item.checklistItemId"
            :data-testid="`checklist-row-${item.checklistItemId}`"
            class="check-row flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition"
            :class="item.done ? 'text-slate-400 line-through' : 'hover:bg-brand-50'"
          >
            <input
              :checked="item.done"
              type="checkbox"
              class="size-4 accent-brand-500"
              :data-testid="`checklist-done-${item.checklistItemId}`"
              @change="toggleChecklistItem(item)"
            />
            <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
            <button
              class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              :aria-label="`${item.title} 삭제`"
              :data-testid="`delete-checklist-${item.checklistItemId}`"
              :disabled="isSavingChecklist"
              @click="removeChecklistItem(item)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </section>
      </div>

      <div class="min-w-0 space-y-4">
      <section data-testid="schedule-chat-section" class="brand-card grid h-[520px] grid-rows-[52px_minmax(0,1fr)_72px] overflow-hidden rounded-xl">
        <div class="border-b border-slate-200 bg-slate-100 px-4 py-3">
          <h2 class="font-black text-slate-950">일정 조율 채팅</h2>
        </div>
        <div ref="chatListEl" data-testid="schedule-chat-list" class="min-h-0 space-y-4 overflow-y-auto p-4">
          <p v-if="isLoadingMessages" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            이전 채팅을 불러오는 중입니다.
          </p>
          <p v-else-if="messages.length === 0" class="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
            아직 채팅 메시지가 없습니다.
          </p>
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-pop flex gap-3"
            :class="message.mine ? 'justify-end' : ''"
          >
            <span v-if="!message.mine" class="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
              {{ message.author.slice(0, 1) }}
            </span>
            <p
              class="max-w-[76%] rounded-xl px-4 py-3 text-sm font-semibold leading-6"
              :class="message.mine ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-800'"
            >
              {{ message.text }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 border-t border-slate-200 p-4">
          <input v-model="messageText" data-testid="chat-input" class="brand-input h-10 min-w-0 flex-1 rounded-full px-4 text-sm outline-none" placeholder="메시지를 입력하세요" @keyup.enter="sendMessage" />
          <button class="grid size-10 place-items-center rounded-full bg-brand-500 text-white transition hover:scale-105" aria-label="전송" @click="sendMessage">
            <Send :size="20" />
          </button>
        </div>
      </section>

      <section data-testid="ai-suggestions-section" class="brand-card overflow-hidden rounded-xl">
        <div class="border-b border-slate-200 bg-gradient-to-r from-brand-50 to-white p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <Sparkles :size="19" class="text-brand-500" />
                <h2 class="font-black text-slate-950">AI 일정 제안</h2>
                <span v-if="hasNewSuggestions" class="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-black text-white">새 제안</span>
              </div>
              <p class="mt-1 text-xs font-semibold text-slate-500">채팅 내용을 바탕으로 일정 후보를 제안합니다.</p>
            </div>
            <button
              data-testid="analyze-trip-chat"
              class="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isAnalyzing"
              @click="requestAiAnalysis"
            >
              <LoaderCircle v-if="isAnalyzing" :size="16" class="animate-spin" />
              <Sparkles v-else :size="16" />
              {{ isAnalyzing ? 'AI가 채팅을 분석하고 있습니다' : 'AI 일정 분석' }}
            </button>
          </div>
          <textarea
            v-model="additionalRequest"
            data-testid="ai-additional-request"
            class="brand-input mt-3 min-h-20 w-full resize-y rounded-lg px-3 py-2 text-sm outline-none"
            placeholder="추가 요청이 있다면 입력하세요. 예: 오전에는 바다를 먼저 가고 싶어요."
            :disabled="isAnalyzing"
          />
        </div>

        <div class="p-4">
          <div class="mb-4 flex flex-wrap gap-2">
            <button
              v-for="option in aiStatusOptions"
              :key="option.value"
              :data-testid="`ai-status-${option.value}`"
              class="rounded-full px-3 py-1.5 text-xs font-black transition"
              :class="selectedStatus === option.value ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600'"
              @click="selectAiStatus(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <p v-if="isLoadingSuggestions" class="rounded-lg bg-brand-50 px-3 py-3 text-sm font-black text-brand-600">
            AI 일정 제안을 불러오는 중입니다.
          </p>
          <p v-else-if="aiError" class="rounded-lg bg-red-50 px-3 py-3 text-sm font-bold text-red-600">{{ aiError }}</p>
          <div
            v-else-if="aiNoResult && selectedStatus === 'PENDING'"
            data-testid="ai-no-result"
            class="rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-900"
          >
            <p class="font-black">{{ defaultAiNoResultMessage }}</p>
            <p v-if="aiNoResult.message !== defaultAiNoResultMessage" class="mt-1 font-semibold">
              {{ aiNoResult.message }}
            </p>
          </div>
          <p v-else-if="suggestions.length === 0" class="rounded-lg bg-slate-50 px-3 py-5 text-center text-sm font-bold text-slate-500">
            아직 도착한 AI 일정 제안이 없습니다.
          </p>

          <div v-else class="space-y-5">
            <section v-for="group in suggestionGroups" :key="group.analysisRunId" class="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p class="text-xs font-black text-slate-500">분석 결과 #{{ group.analysisRunId }} · {{ group.items.length }}개</p>
                <div v-if="selectedStatus === 'PENDING'" class="flex gap-2">
                  <button
                    :data-testid="`reject-ai-run-${group.analysisRunId}`"
                    class="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    :disabled="bulkProcessingRunId !== null"
                    @click="processAnalysisRun(group.analysisRunId, 'reject')"
                  >
                    전체 거절
                  </button>
                  <button
                    v-if="!isTeamTrip"
                    :data-testid="`apply-ai-run-${group.analysisRunId}`"
                    class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 disabled:opacity-50"
                    :disabled="bulkProcessingRunId !== null"
                    @click="processAnalysisRun(group.analysisRunId, 'apply')"
                  >
                    {{ bulkProcessingRunId === group.analysisRunId ? '처리 중' : '전체 적용' }}
                  </button>
                </div>
              </div>

              <div class="space-y-3">
                <article v-for="suggestion in group.items" :key="suggestion.aiSuggestionId" class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-xs font-black text-brand-500">
                        {{ formatSuggestionDate(suggestion.scheduleDate) }} · {{ formatSuggestionTime(suggestion.startTime) }}
                        <template v-if="suggestion.endTime"> ~ {{ formatSuggestionTime(suggestion.endTime) }}</template>
                      </p>
                      <h3 class="mt-1 text-lg font-black text-slate-950">{{ suggestion.title }}</h3>
                    </div>
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      {{ suggestionStatusLabel(suggestion.status) }}
                    </span>
                  </div>

                  <div v-if="suggestion.suggestedPlaceName" class="mt-3 rounded-lg bg-brand-50 p-3">
                    <p class="text-xs font-black text-brand-500">장소</p>
                    <p class="mt-1 font-black text-slate-900">{{ suggestion.suggestedPlaceName }}</p>
                    <p v-if="suggestion.suggestedRegionHint" class="mt-0.5 text-xs font-semibold text-slate-500">{{ suggestion.suggestedRegionHint }}</p>
                  </div>
                  <p v-if="suggestion.summary" class="mt-3 text-sm font-semibold leading-6 text-slate-700">{{ suggestion.summary }}</p>

                  <div class="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      :data-testid="`open-ai-place-${suggestion.aiSuggestionId}`"
                      class="rounded-lg bg-white px-3 py-2 text-xs font-black text-brand-500 ring-1 ring-brand-100 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:ring-slate-200"
                      :disabled="suggestion.suggestedPlaceId === null"
                      @click="openSuggestionPlace(suggestion)"
                    >
                      장소 상세 보기
                    </button>
                    <template v-if="suggestion.status === 'PENDING'">
                      <button
                        :data-testid="`reject-ai-suggestion-${suggestion.aiSuggestionId}`"
                        class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        :disabled="rejectingSuggestionIds.includes(suggestion.aiSuggestionId)"
                        @click="rejectSuggestion(suggestion)"
                      >
                        {{ rejectingSuggestionIds.includes(suggestion.aiSuggestionId) ? '거절 중' : '거절' }}
                      </button>
                      <button
                        v-if="isTeamTrip"
                        :data-testid="`create-ai-vote-${suggestion.aiSuggestionId}`"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 disabled:opacity-50"
                        :disabled="creatingVoteSuggestionIds.includes(suggestion.aiSuggestionId)"
                        @click="openCreateSuggestionVote(suggestion)"
                      >
                        {{ creatingVoteSuggestionIds.includes(suggestion.aiSuggestionId) ? '생성 중' : '투표 올리기' }}
                      </button>
                      <button
                        v-else
                        :data-testid="`apply-ai-suggestion-${suggestion.aiSuggestionId}`"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 disabled:opacity-50"
                        :disabled="applyingSuggestionIds.includes(suggestion.aiSuggestionId)"
                        @click="applySuggestion(suggestion)"
                      >
                        {{ applyingSuggestionIds.includes(suggestion.aiSuggestionId) ? '처리 중' : '수락' }}
                      </button>
                    </template>
                    <template v-else-if="suggestion.status === 'VOTING'">
                      <span class="inline-flex items-center rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                        투표 진행 중
                      </span>
                      <button
                        :data-testid="`open-ai-vote-${suggestion.aiSuggestionId}`"
                        class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 disabled:opacity-50"
                        :disabled="suggestion.voteId === null || isLoadingVote"
                        @click="openSuggestionVote(suggestion)"
                      >
                        투표 보기
                      </button>
                    </template>
                    <span
                      v-else-if="suggestion.status === 'APPLIED'"
                      :data-testid="`ai-applied-status-${suggestion.aiSuggestionId}`"
                      class="inline-flex min-h-8 items-center justify-center rounded-lg bg-emerald-50 px-3 text-xs font-black leading-none text-emerald-700"
                    >
                      일정 반영 완료
                    </span>
                    <span
                      v-else-if="suggestion.status === 'REJECTED'"
                      :data-testid="`ai-rejected-status-${suggestion.aiSuggestionId}`"
                      class="inline-flex min-h-8 items-center justify-center rounded-lg bg-slate-100 px-3 text-xs font-black leading-none text-slate-600"
                    >
                      거절됨
                    </span>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div
            v-if="suggestions.length > AI_SUGGESTIONS_PER_PAGE"
            class="mt-5 flex items-center justify-center gap-3 border-t border-slate-200 pt-4"
          >
            <button
              data-testid="ai-page-previous"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="aiSuggestionPage === 1"
              @click="aiSuggestionPage -= 1"
            >
              <ChevronLeft :size="15" />
              이전
            </button>
            <span
              data-testid="ai-page-indicator"
              aria-live="polite"
              class="min-w-14 text-center text-xs font-black text-slate-500"
            >
              {{ aiSuggestionPage }} / {{ aiSuggestionPageCount }}
            </span>
            <button
              data-testid="ai-page-next"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="aiSuggestionPage === aiSuggestionPageCount"
              @click="aiSuggestionPage += 1"
            >
              다음
              <ChevronRight :size="15" />
            </button>
          </div>
        </div>
      </section>
      </div>

    </div>

    <Transition name="modal-fade">
      <div v-if="showScheduleModal" class="fixed inset-0 z-[85] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">{{ editingSchedule ? '일정 수정' : '일정 추가' }}</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showScheduleModal = false">
              <X :size="22" />
            </button>
          </div>
          <div class="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-black">
            <button
              data-testid="schedule-free-tab"
              class="h-9 rounded-md transition"
              :class="scheduleDraft.mode === 'free' ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500'"
              @click="selectScheduleMode('free')"
            >
              자유 일정
            </button>
            <button
              data-testid="schedule-place-tab"
              class="h-9 rounded-md transition"
              :class="scheduleDraft.mode === 'place' ? 'bg-white text-brand-500 shadow-sm' : 'text-slate-500'"
              @click="selectScheduleMode('place')"
            >
              장소 선택
            </button>
          </div>
          <div class="space-y-3">
            <label v-if="scheduleDraft.mode === 'place'" class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">장소</span>
              <div class="relative">
                <div class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                  <Search :size="15" class="text-slate-400" />
                  <input
                    v-model="placeSearchQuery"
                    data-testid="schedule-place-search-input"
                    class="min-w-0 flex-1 text-sm font-bold text-slate-900 outline-none"
                    placeholder="여행지 이름으로 검색"
                    @input="handleSchedulePlaceSearchInput"
                  />
                </div>
                <div v-if="placeOptions.length || isLoadingPlaces" class="absolute left-0 right-0 z-40 mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  <p v-if="isLoadingPlaces" class="px-4 py-3 text-sm font-bold text-slate-500">여행지를 검색하는 중입니다.</p>
                  <button
                    v-for="place in placeOptions"
                    :key="place.id"
                    type="button"
                    class="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    :data-testid="`schedule-place-result-${place.id}`"
                    @click="selectSchedulePlace(place)"
                  >
                    <MapPin :size="16" class="mt-0.5 shrink-0 text-brand-500" />
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-black text-slate-950">{{ place.title }}</span>
                      <span class="mt-1 block truncate text-xs font-bold text-slate-500">{{ place.location }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">제목</span>
              <input v-model="scheduleDraft.title" data-testid="schedule-title-input" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="자유시간" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">날짜</span>
              <input v-model="scheduleDraft.date" data-testid="schedule-date-input" type="date" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">시작</span>
                <input v-model="scheduleDraft.startTime" data-testid="schedule-start-input" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" @change="ensureValidEndTime" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-black text-slate-950">종료</span>
                <input v-model="scheduleDraft.endTime" data-testid="schedule-end-input" type="time" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" />
              </label>
            </div>
            <p v-if="isScheduleTimeRangeInvalid" class="text-xs font-bold text-red-500">
              종료 시간은 시작 시간보다 앞설 수 없습니다.
            </p>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">메모</span>
              <input v-model="scheduleDraft.memo" data-testid="schedule-memo-input" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" placeholder="숙소 근처" />
            </label>
          </div>
          <button
            data-testid="save-schedule-button"
            class="btn-primary mt-5 h-10 w-full rounded-lg text-sm disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSaveSchedule"
            @click="saveScheduleItem()"
          >
            {{ isSaving ? '저장 중' : '저장하기' }}
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="scheduleReplaceTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="replace-schedule-modal" class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-brand-500">Schedule change</p>
              <h2 class="mt-1 text-lg font-black text-slate-950">같은 시간의 일정을 변경할까요?</h2>
              <p class="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {{ scheduleDraft.startTime }}에 이미 등록된 일정이 있습니다. 기존 일정을 새로 입력한 일정으로 변경할 수 있습니다.
              </p>
            </div>
            <button class="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500" aria-label="닫기" @click="scheduleReplaceTarget = null">
              <X :size="18" />
            </button>
          </div>

          <div class="mt-5 space-y-3">
            <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <span class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
              <span class="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current schedule</p>
                  <p class="mt-1 truncate text-base font-black text-slate-950">{{ scheduleReplaceTarget.title }}</p>
                </div>
                <span class="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-black text-white">{{ scheduleReplaceTarget.time }}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 px-3 text-brand-400" aria-hidden="true">
              <span class="h-px flex-1 border-t border-dashed border-brand-200" />
              <span class="grid size-7 place-items-center rounded-full bg-brand-50 text-sm font-black">↔</span>
              <span class="h-px flex-1 border-t border-dashed border-brand-200" />
            </div>

            <div class="relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 shadow-sm shadow-indigo-100">
              <span class="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-brand-200 bg-white" />
              <span class="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border border-brand-200 bg-white" />
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-brand-500">New schedule</p>
                  <p class="mt-1 truncate text-base font-black text-slate-950">{{ scheduleDraft.title }}</p>
                </div>
                <span class="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-black text-white">{{ scheduleDraft.startTime }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <button data-testid="keep-existing-schedule-time" class="h-10 rounded-lg bg-slate-100 text-sm font-black text-slate-700 hover:bg-slate-200" @click="scheduleReplaceTarget = null">
              기존 일정 유지
            </button>
            <button data-testid="confirm-replace-schedule" class="h-10 rounded-lg bg-brand-500 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isSaving" @click="saveScheduleItem(true)">
              변경하기
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showOrderModal" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="schedule-flow-modal" class="modal-panel w-full max-w-xl overflow-x-hidden rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="flex items-center gap-2 text-lg font-black text-slate-950">
                <ListOrdered :size="20" class="text-brand-500" />
                일정 순서 확인
              </h2>
              <p class="mt-1.5 text-xs font-semibold text-slate-500">등록된 장소와 시간을 날짜별로 확인합니다.</p>
            </div>
            <button class="text-slate-500" aria-label="닫기" @click="showOrderModal = false">
              <X :size="20" />
            </button>
          </div>

          <div class="max-h-[44vh] overflow-x-hidden overflow-y-auto pb-4 pr-1">
            <section v-for="group in scheduleGroups" :key="group.date" class="pb-8 last:pb-0">
              <div class="mb-4 flex items-center gap-3">
                <span class="grid size-9 place-items-center rounded-xl bg-brand-500 text-white shadow-md shadow-indigo-200 ring-4 ring-brand-50">
                  <CalendarCheck :size="16" />
                </span>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">ITINERARY</p>
                  <h3 class="text-lg font-black text-brand-500">{{ group.date }}</h3>
                </div>
              </div>

              <div class="relative pl-14 sm:pl-20">
                <div
                  data-testid="schedule-rail-track"
                  class="absolute bottom-0 left-3 top-0 w-8 rounded-full sm:left-5"
                  style="background: repeating-linear-gradient(to bottom, transparent 0 7px, #cbd5e1 7px 10px, transparent 10px 17px);"
                  aria-hidden="true"
                >
                  <span class="absolute bottom-0 left-2 top-0 w-1 rounded-full bg-slate-500 shadow-sm" />
                  <span class="absolute bottom-0 right-2 top-0 w-1 rounded-full bg-slate-500 shadow-sm" />
                </div>

                <article v-for="item in group.items" :key="item.id" class="relative mb-5 last:mb-0">
                  <span
                    :data-testid="`schedule-rail-sleeper-${item.scheduleItemId}`"
                    class="absolute -left-11 top-8 h-1 w-12 rounded-full bg-slate-500 sm:-left-[60px] sm:w-16"
                    aria-hidden="true"
                  />
                  <span
                    :data-testid="`schedule-station-node-${item.scheduleItemId}`"
                    class="absolute -left-[39px] top-[23px] z-10 grid size-5 place-items-center rounded-full border-[4px] border-white bg-brand-500 shadow-md ring-2 ring-brand-200 sm:-left-[55px]"
                    aria-hidden="true"
                  >
                    <span class="size-1 rounded-full bg-white" />
                  </span>
                  <div class="grid min-w-0 gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-4">
                    <p
                      :data-testid="`schedule-ticket-time-${item.scheduleItemId}`"
                      class="inline-flex h-7 w-fit items-center rounded-full bg-slate-800 px-2.5 text-[11px] font-black text-white shadow-sm sm:mt-5"
                    >
                      {{ item.time }}
                    </p>

                    <div
                      class="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition"
                      :class="selectedScheduleItemId === item.id ? 'ring-2 ring-brand-300 bg-brand-50/60 shadow-md shadow-indigo-100' : 'hover:border-brand-200 hover:bg-white'"
                      :data-schedule-flow-item="item.id"
                      :data-testid="`schedule-flow-item-${item.scheduleItemId}`"
                    >
                      <span
                        :data-testid="`schedule-ticket-notch-left-${item.scheduleItemId}`"
                        class="absolute -left-2 top-1/2 z-20 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white"
                        aria-hidden="true"
                      />
                      <span
                        :data-testid="`schedule-ticket-notch-right-${item.scheduleItemId}`"
                        class="absolute -right-2 top-1/2 z-20 size-4 -translate-y-1/2 rounded-full border border-slate-200 bg-white"
                        aria-hidden="true"
                      />
                      <span
                        :data-testid="`schedule-ticket-serration-left-${item.scheduleItemId}`"
                        class="absolute inset-y-3 -left-1 z-10 w-3"
                        style="background: radial-gradient(circle at left center, white 0 3px, transparent 3.5px) 0 0 / 8px 13px repeat-y;"
                        aria-hidden="true"
                      />
                      <span
                        :data-testid="`schedule-ticket-serration-right-${item.scheduleItemId}`"
                        class="absolute inset-y-3 -right-1 z-10 w-3"
                        style="background: radial-gradient(circle at right center, white 0 3px, transparent 3.5px) 0 0 / 8px 13px repeat-y;"
                        aria-hidden="true"
                      />
                      <span
                        :data-testid="`schedule-ticket-perforation-${item.scheduleItemId}`"
                        class="absolute bottom-0 right-12 top-0 hidden border-l-2 border-dashed border-slate-200 sm:block"
                        aria-hidden="true"
                      />

                      <div class="flex flex-col gap-3 pr-0 sm:flex-row sm:items-start sm:justify-between sm:pr-12">
                        <div class="min-w-0">
                          <p class="flex items-center gap-1.5 text-xs font-black text-brand-500">
                            <span class="size-2 rounded-sm bg-violet-500 rotate-45" />
                            {{ item.category }}
                          </p>
                          <h4 class="mt-2 break-words text-base font-black text-slate-950">{{ item.title }}</h4>
                          <p v-if="item.note" class="mt-2 break-words text-xs font-bold leading-5 text-slate-500 [overflow-wrap:anywhere]">
                            {{ item.note }}
                          </p>
                          <button
                            v-if="item.placeId"
                            data-testid="open-flow-place-detail"
                            class="mt-2 inline-flex items-center gap-1 text-xs !font-semibold text-slate-400 underline-offset-4 transition hover:text-brand-500 hover:underline"
                            style="font-size: 12px; line-height: 16px;"
                            @click="openFlowPlaceDetail(item)"
                          >
                            여행지 상세 보기 →
                          </button>
                        </div>
                        <button
                          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                          :aria-label="`${item.title} 삭제`"
                          @click="requestRemoveScheduleItem(item)"
                        >
                          <Trash2 :size="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div class="mt-5 grid gap-3 rounded-xl bg-brand-50 p-4 text-xs font-bold leading-5 text-brand-700 sm:grid-cols-3">
            <div>
              <span class="block text-[11px] font-black text-brand-500">총 일정</span>
              {{ scheduleItems.length }}개
            </div>
            <div>
              <span class="block text-[11px] font-black text-brand-500">첫 일정</span>
              {{ scheduleItems[0]?.date ?? '날짜 미정' }} · {{ scheduleItems[0]?.time ?? '미정' }}
            </div>
            <div>
              <span class="block text-[11px] font-black text-brand-500">마지막 일정</span>
              {{ scheduleItems[scheduleItems.length - 1]?.date ?? '날짜 미정' }} · {{ scheduleItems[scheduleItems.length - 1]?.time ?? '미정' }}
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="showOrderModal = false">
              닫기
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="voteCreationTarget" class="fixed inset-0 z-[95] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="create-ai-vote-modal" class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-black text-brand-500">팀 일정 투표</p>
              <h2 class="mt-1 text-xl font-black text-slate-950">투표를 올릴까요?</h2>
            </div>
            <button
              class="text-slate-500"
              aria-label="투표 올리기 모달 닫기"
              :disabled="creatingVoteSuggestionIds.includes(voteCreationTarget.aiSuggestionId)"
              @click="voteCreationTarget = null"
            >
              <X :size="22" />
            </button>
          </div>

          <div class="mt-5 rounded-xl bg-slate-50 p-4">
            <p class="text-lg font-black text-slate-950">{{ voteCreationTarget.title }}</p>
            <p class="mt-2 text-sm font-bold text-brand-500">
              {{ formatSuggestionDate(voteCreationTarget.scheduleDate) }} · {{ formatSuggestionTime(voteCreationTarget.startTime) }}
              <template v-if="voteCreationTarget.endTime"> ~ {{ formatSuggestionTime(voteCreationTarget.endTime) }}</template>
            </p>
            <div v-if="voteCreationTarget.suggestedPlaceName" class="mt-3 rounded-lg bg-brand-50 px-3 py-2">
              <p class="text-xs font-black text-brand-500">장소</p>
              <p class="mt-1 text-sm font-black text-slate-900">{{ voteCreationTarget.suggestedPlaceName }}</p>
            </div>
          </div>

          <p class="mt-4 text-sm font-semibold leading-6 text-slate-600">
            팀원들에게 이 일정의 찬반 투표를 요청합니다.
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              data-testid="cancel-create-ai-vote"
              class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700 disabled:opacity-50"
              :disabled="creatingVoteSuggestionIds.includes(voteCreationTarget.aiSuggestionId)"
              @click="voteCreationTarget = null"
            >
              취소
            </button>
            <button
              data-testid="confirm-create-ai-vote"
              class="h-10 rounded-lg bg-brand-500 px-4 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="creatingVoteSuggestionIds.includes(voteCreationTarget.aiSuggestionId)"
              @click="createSuggestionVote"
            >
              {{ creatingVoteSuggestionIds.includes(voteCreationTarget.aiSuggestionId) ? '생성 중' : '투표 올리기' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="activeVote" class="fixed inset-0 z-[95] grid place-items-center bg-slate-900/55 p-4">
        <section data-testid="ai-vote-modal" class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-black text-brand-500">팀 일정 투표</p>
              <h2 class="mt-1 text-xl font-black text-slate-950">{{ activeVote.title }}</h2>
              <p class="mt-1 text-xs font-semibold text-slate-500">총 {{ activeVote.totalBallotCount }}표</p>
            </div>
            <button class="text-slate-500" aria-label="투표 닫기" @click="activeVote = null; voteError = ''">
              <X :size="22" />
            </button>
          </div>

          <p v-if="voteError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
            {{ voteError }}
          </p>

          <div class="mt-4 space-y-3">
            <button
              v-for="option in activeVote.options"
              :key="option.voteOptionId"
              :data-testid="`cast-vote-option-${option.voteOptionId}`"
              class="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
              :class="activeVote.selectedOptionId === option.voteOptionId ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'"
              :disabled="isCastingVote || activeVote.status !== 'OPEN'"
              @click="castVote(option.voteOptionId)"
            >
              <span>
                <span class="block font-black text-slate-900">{{ option.optionTitle }}</span>
                <span v-if="option.description" class="mt-0.5 block text-xs font-semibold text-slate-500">{{ option.description }}</span>
              </span>
              <span class="text-sm font-black text-brand-500">{{ option.voteCount }}표</span>
            </button>
          </div>

          <div class="mt-5 flex items-center justify-between gap-2">
            <span class="text-xs font-black" :class="activeVote.status === 'OPEN' ? 'text-amber-600' : 'text-slate-500'">
              {{ activeVote.status === 'OPEN' ? '투표 진행 중' : '투표 종료' }}
            </span>
            <button
              v-if="canCloseVotes && activeVote.status === 'OPEN'"
              data-testid="close-ai-vote"
              class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              :disabled="isClosingVote"
              @click="closeVote"
            >
              {{ isClosingVote ? '종료 중' : '투표 종료' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="deleteScheduleTarget" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">일정을 삭제하시겠습니까?</h2>
            <button class="text-slate-500" aria-label="닫기" @click="deleteScheduleTarget = null">
              <X :size="22" />
            </button>
          </div>
          <p class="text-sm font-semibold leading-6 text-slate-600">
            <span class="font-black text-slate-950">{{ deleteScheduleTarget.title }}</span> 항목을 전체 일정에서 삭제합니다.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="deleteScheduleTarget = null">
              취소
            </button>
            <button class="btn-primary h-10 rounded-lg px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="confirmRemoveScheduleItem">
              {{ isSaving ? '삭제 중' : '확인' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showMemberModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="flex items-center gap-2 text-xl font-black text-slate-950">
              <UserCog :size="22" class="text-brand-500" />
              참여자 관리
            </h2>
            <button class="text-slate-500" aria-label="닫기" @click="showMemberModal = false">
              <X :size="22" />
            </button>
          </div>
          <p v-if="isLoadingMembers" class="rounded-lg bg-brand-50 px-3 py-2 text-sm font-black text-brand-600">
            팀원 목록을 불러오는 중입니다.
          </p>
          <div class="space-y-3">
            <article v-for="member in members" :key="member.id" class="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span class="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-black text-brand-600">{{ member.name.slice(0, 1) }}</span>
              <div class="min-w-0 flex-1">
                <p class="font-black text-slate-950">{{ member.name }}</p>
                <p class="truncate text-xs font-semibold text-slate-500">{{ member.email ?? '팀원' }}</p>
              </div>
              <span v-if="member.owner" class="rounded-lg bg-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                소유자
              </span>
              <span v-else-if="canManageTripMembers" class="select-wrap">
                <select v-model="member.role" class="brand-input select-control h-9 rounded-lg px-2 text-xs font-bold outline-none" :disabled="isSaving" @change="changeMemberRole(member)">
                  <option>편집 가능</option>
                  <option>보기만 가능</option>
                </select>
                <ChevronDown :size="14" class="select-chevron" />
              </span>
              <span v-else class="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                {{ member.role }}
              </span>
            </article>
          </div>
          <button v-if="canManageTripMembers" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="showInviteModal = true; showMemberModal = false">
            새 팀원 초대하기
          </button>
        </section>
      </div>
    </Transition>

    <Transition name="modal-fade">
      <div v-if="showInviteModal && canInviteMembers" class="fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-4">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-black text-slate-950">팀원 초대</h2>
            <button class="text-slate-500" aria-label="닫기" @click="showInviteModal = false">
              <X :size="22" />
            </button>
          </div>
          <section class="rounded-xl bg-brand-50 p-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-black text-brand-500">팀 여행 초대 코드</p>
                <p class="mt-1 text-sm font-bold text-slate-600">코드를 공유하면 팀원이 일정에 바로 참여할 수 있습니다.</p>
              </div>
              <button class="h-9 shrink-0 rounded-lg bg-brand-500 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="generateInviteCode">
                {{ isSaving ? '생성 중' : '코드 생성' }}
              </button>
            </div>
            <p v-if="inviteCode" class="mt-3 rounded-lg bg-white px-3 py-2 text-center text-lg font-black tracking-widest text-slate-950">
              {{ inviteCode }}
            </p>
            <p v-else class="mt-3 rounded-lg bg-white/70 px-3 py-2 text-center text-xs font-bold text-slate-500">
              코드 생성을 누르면 초대 코드가 표시됩니다.
            </p>
          </section>
        </section>
      </div>
    </Transition>
  </section>
</template>
