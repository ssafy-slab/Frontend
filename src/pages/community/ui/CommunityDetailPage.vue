<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Bookmark, Edit3, Heart, MessageCircle, MapPin, Send, Trash2, User } from 'lucide-vue-next'
import {
  bookmarkCommunityPost,
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityComments,
  fetchCommunityPost,
  resolveCommunityImageUrl,
  toggleCommunityPostLike,
  unbookmarkCommunityPost,
  updateCommunityComment,
  type CommunityComment,
  type CommunityPostDetail,
} from '@/entities/community/api/communityApi'
import { findMockCommunityPost, mockCommunityComments } from '@/entities/community/model/mockCommunity'
import { flattenCommunityComments } from '@/entities/community/model/commentTree'

const props = defineProps<{
  postId: number | null
  accessToken?: string
}>()

const emit = defineEmits<{
  change: [view: string]
  edit: [postId: number]
  deleted: []
  saved: [message: string]
}>()

const categoryLabels: Record<string, string> = {
  PLACE_REVIEW: '장소 후기',
  TRAVEL_TIP: '여행 팁',
  QUESTION: '질문',
  FREE: '자유게시판',
}

const post = ref<CommunityPostDetail | null>(null)
const comments = ref<CommunityComment[]>([])
const commentDraft = ref('')
const loading = ref(false)
const deleting = ref(false)
const bookmarking = ref(false)
const submittingComment = ref(false)
const submittingReply = ref(false)
const savingComment = ref(false)
const replyTargetId = ref<number | null>(null)
const replyDraft = ref('')
const editingCommentId = ref<number | null>(null)
const editCommentDraft = ref('')
const errorMessage = ref('')

const categoryLabel = computed(() => post.value ? categoryLabels[post.value.category] ?? post.value.category : '')
const postImageUrl = computed(() => post.value?.imageUrl ? resolveCommunityImageUrl(post.value.imageUrl) : '')
const postContentCells = computed(() => {
  if (!post.value) return []
  if (post.value.cells?.length) return [...post.value.cells].sort((left, right) => left.sortOrder - right.sortOrder)
  return [
    ...(postImageUrl.value ? [{ postCellId: null, sortOrder: 1, cellType: 'IMAGE' as const, textContent: null, imageUrl: post.value.imageUrl, alignment: 'LEFT' as const }] : []),
    ...(post.value.content ? [{ postCellId: null, sortOrder: 2, cellType: 'TEXT' as const, textContent: post.value.content, imageUrl: null, alignment: 'LEFT' as const }] : []),
  ]
})
const displayComments = computed(() => flattenCommunityComments(comments.value))

function cellAlignmentClass(alignment: 'LEFT' | 'CENTER' | 'RIGHT' | undefined, type: 'TEXT' | 'IMAGE') {
  if (type === 'TEXT') {
    if (alignment === 'CENTER') return 'text-center'
    if (alignment === 'RIGHT') return 'text-right'
    return 'text-left'
  }
  if (alignment === 'CENTER') return 'justify-center'
  if (alignment === 'RIGHT') return 'justify-end'
  return 'justify-start'
}

function textCellClass(cell: { alignment?: 'LEFT' | 'CENTER' | 'RIGHT'; bold?: boolean | null }) {
  return [cellAlignmentClass(cell.alignment, 'TEXT'), cell.bold ? 'font-bold' : 'font-normal']
}

function textCellStyle(cell: { fontSizePx?: number | null }) {
  return { fontSize: `${cell.fontSizePx ?? 14}px` }
}

function syncCommentCount() {
  if (!post.value) return
  post.value = {
    ...post.value,
    commentCount: comments.value.length,
  }
}

async function reloadComments() {
  if (!post.value) return
  comments.value = await fetchCommunityComments(post.value.postId, props.accessToken)
  syncCommentCount()
}

async function loadPost() {
  if (!props.postId) {
    errorMessage.value = '게시글을 선택해주세요.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const mockPost = findMockCommunityPost(props.postId)
    if (mockPost) {
      post.value = mockPost
      comments.value = mockCommunityComments[mockPost.postId] ?? []
      return
    }

    const [postResult, commentResult] = await Promise.all([
      fetchCommunityPost(props.postId, props.accessToken),
      fetchCommunityComments(props.postId, props.accessToken),
    ])
    post.value = postResult
    comments.value = commentResult
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '게시글을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function toggleLike() {
  if (!post.value) return
  if (!props.accessToken) {
    emit('saved', '로그인 후 좋아요를 누를 수 있습니다.')
    emit('change', 'login')
    return
  }

  const wasLiked = post.value.likedByMe
  post.value = {
    ...post.value,
    likedByMe: !wasLiked,
    likeCount: post.value.likeCount + (wasLiked ? -1 : 1),
  }
  try {
    await toggleCommunityPostLike(post.value.postId, props.accessToken)
  } catch (error) {
    post.value = {
      ...post.value,
      likedByMe: wasLiked,
      likeCount: post.value.likeCount + (wasLiked ? 1 : -1),
    }
    emit('saved', error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.')
  }
}

async function toggleBookmark() {
  if (!post.value || bookmarking.value) return
  if (!props.accessToken) {
    emit('saved', '로그인 후 게시글을 찜할 수 있습니다.')
    emit('change', 'login')
    return
  }

  const wasBookmarked = post.value.bookmarkedByMe
  bookmarking.value = true
  post.value = { ...post.value, bookmarkedByMe: !wasBookmarked }
  try {
    if (wasBookmarked) {
      await unbookmarkCommunityPost(post.value.postId, props.accessToken)
    } else {
      await bookmarkCommunityPost(post.value.postId, props.accessToken)
    }
  } catch (error) {
    post.value = { ...post.value, bookmarkedByMe: wasBookmarked }
    emit('saved', error instanceof Error ? error.message : '찜 처리에 실패했습니다.')
  } finally {
    bookmarking.value = false
  }
}

async function deletePost() {
  if (!post.value || !props.accessToken) return
  if (!window.confirm('게시글을 삭제할까요?')) return

  deleting.value = true
  try {
    await deleteCommunityPost(post.value.postId, props.accessToken)
    emit('saved', '게시글이 삭제되었습니다.')
    emit('deleted')
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '게시글 삭제에 실패했습니다.')
  } finally {
    deleting.value = false
  }
}

async function submitComment() {
  if (!post.value || !commentDraft.value.trim()) return
  if (!props.accessToken) {
    emit('saved', '로그인 후 댓글을 작성할 수 있습니다.')
    emit('change', 'login')
    return
  }

  submittingComment.value = true
  try {
    comments.value = await createCommunityComment(post.value.postId, props.accessToken, {
      content: commentDraft.value.trim(),
      parentCommentId: null,
    })
    syncCommentCount()
    commentDraft.value = ''
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '댓글 등록에 실패했습니다.')
  } finally {
    submittingComment.value = false
  }
}

function openReply(comment: CommunityComment) {
  if (!props.accessToken) {
    emit('saved', '로그인 후 답글을 작성할 수 있습니다.')
    emit('change', 'login')
    return
  }
  replyTargetId.value = comment.commentId
  replyDraft.value = ''
  editingCommentId.value = null
}

function cancelReply() {
  replyTargetId.value = null
  replyDraft.value = ''
}

async function submitReply(comment: CommunityComment) {
  if (!post.value || !props.accessToken || !replyDraft.value.trim()) return
  submittingReply.value = true
  try {
    comments.value = await createCommunityComment(post.value.postId, props.accessToken, {
      content: replyDraft.value.trim(),
      parentCommentId: comment.commentId,
    })
    syncCommentCount()
    cancelReply()
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '답글 등록에 실패했습니다.')
    if (error instanceof Error && error.message.includes('찾을 수 없습니다')) {
      await reloadComments()
    }
  } finally {
    submittingReply.value = false
  }
}

function openCommentEdit(comment: CommunityComment) {
  editingCommentId.value = comment.commentId
  editCommentDraft.value = comment.content
  cancelReply()
}

function cancelCommentEdit() {
  editingCommentId.value = null
  editCommentDraft.value = ''
}

async function saveCommentEdit(comment: CommunityComment) {
  if (!props.accessToken || !editCommentDraft.value.trim()) return
  savingComment.value = true
  try {
    comments.value = await updateCommunityComment(comment.commentId, props.accessToken, {
      content: editCommentDraft.value.trim(),
    })
    syncCommentCount()
    cancelCommentEdit()
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '댓글 수정에 실패했습니다.')
  } finally {
    savingComment.value = false
  }
}

async function removeComment(comment: CommunityComment) {
  if (!props.accessToken || !window.confirm('댓글을 삭제할까요?')) return
  savingComment.value = true
  try {
    await deleteCommunityComment(comment.commentId, props.accessToken)
    await reloadComments()
    cancelCommentEdit()
    cancelReply()
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.')
  } finally {
    savingComment.value = false
  }
}

watch(() => props.postId, loadPost)
onMounted(loadPost)
</script>

<template>
  <section class="app-container max-w-[880px] py-8">
    <button class="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-brand-500" @click="emit('change', 'community')">
      <ArrowLeft :size="16" />
      목록으로 돌아가기
    </button>

    <p v-if="loading" class="rounded-xl bg-white p-8 text-center text-sm font-bold text-slate-500">게시글을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="rounded-xl bg-red-50 p-8 text-center text-sm font-bold text-red-600">{{ errorMessage }}</p>

    <article v-else-if="post" class="brand-card rounded-xl p-5 sm:p-8">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span class="inline-flex w-fit rounded-full bg-brand-500 px-3 py-1.5 text-xs font-black text-white">{{ categoryLabel }}</span>
        <div v-if="post.mine" class="flex gap-2">
          <button class="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 hover:bg-slate-200" @click="emit('edit', post.postId)">
            <Edit3 :size="14" />
            수정
          </button>
          <button class="inline-flex h-9 items-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-black text-red-600 hover:bg-red-100" :disabled="deleting" @click="deletePost">
            <Trash2 :size="14" />
            삭제
          </button>
        </div>
      </div>

      <h1 class="mt-5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
        {{ post.title }}
      </h1>
      <div class="mt-5 flex flex-col gap-2 border-b border-slate-200 pb-6 text-sm font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span class="flex items-center gap-2"><User :size="16" /> {{ post.authorNickname }}</span>
        <span>조회 {{ post.viewCount }} · 좋아요 {{ post.likeCount }} · 댓글 {{ comments.length }}</span>
      </div>

      <div class="mt-6 space-y-6 text-base font-semibold leading-8 text-slate-700">
        <template v-if="postContentCells.length">
          <div v-for="cell in postContentCells" :key="`${cell.sortOrder}-${cell.postCellId ?? cell.cellType}`" data-testid="post-content-cell">
            <div
              v-if="cell.cellType === 'IMAGE' && cell.imageUrl"
              class="flex"
              :class="cellAlignmentClass(cell.alignment, 'IMAGE')"
            >
              <img
                :src="resolveCommunityImageUrl(cell.imageUrl)"
                :alt="post.title"
                class="block h-auto max-h-[520px] max-w-full"
              />
            </div>
            <p
              v-else-if="cell.cellType === 'TEXT'"
              class="whitespace-pre-line break-words [overflow-wrap:anywhere]"
              :class="textCellClass(cell)"
              :style="textCellStyle(cell)"
            >
              {{ cell.textContent }}
            </p>
          </div>
        </template>
        <p v-else class="whitespace-pre-line break-words [overflow-wrap:anywhere]">본문이 없습니다.</p>

        <div v-if="post.placeName" class="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">
            <MapPin :size="20" />
          </div>
          <div>
            <p class="text-xs font-black text-brand-500">연결된 여행지</p>
            <h3 class="mt-1 font-black text-slate-950">{{ post.placeName }}</h3>
          </div>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <button
          class="like-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition"
          :class="post.likedByMe ? 'liked bg-red-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'"
          @click="toggleLike"
        >
          <Heart :size="16" :fill="post.likedByMe ? 'currentColor' : 'none'" />
          좋아요 {{ post.likeCount }}
        </button>
        <button
          data-testid="detail-bookmark"
          class="inline-flex items-center gap-2 rounded-full border border-brand-200 px-5 py-3 text-sm font-black text-brand-600 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
          :class="post.bookmarkedByMe ? 'bg-brand-500 text-white hover:bg-brand-600' : 'bg-white'"
          type="button"
          :aria-pressed="post.bookmarkedByMe"
          :disabled="bookmarking"
          @click="toggleBookmark"
        >
          <Bookmark :size="16" :fill="post.bookmarkedByMe ? 'currentColor' : 'none'" />
          {{ post.bookmarkedByMe ? '찜 해제' : '찜하기' }}
        </button>
      </div>

      <section class="mt-8 border-t border-slate-200 pt-8">
        <h2 class="mb-5 flex items-center gap-2 text-lg font-black text-slate-950">
          <MessageCircle :size="20" class="text-brand-500" />
          댓글 <span class="text-brand-500">{{ comments.length }}</span>
        </h2>
        <div class="mb-5 flex items-center gap-3">
          <span class="grid size-9 place-items-center rounded-full bg-slate-300 text-sm font-black text-slate-600">Me</span>
          <input v-model="commentDraft" class="brand-input h-11 min-w-0 flex-1 rounded-lg px-4 text-sm outline-none" placeholder="댓글을 입력하세요" @keyup.enter="submitComment" />
          <button class="btn-primary inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="submittingComment" @click="submitComment">
            <Send :size="15" />
            등록
          </button>
        </div>
        <div class="space-y-4">
          <div
            v-for="comment in displayComments"
            :key="comment.commentId"
            :data-testid="`comment-${comment.commentId}`"
            class="flex gap-3"
            :class="comment.isReply ? 'ml-8' : ''"
          >
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">
              {{ comment.authorNickname.slice(0, 1) }}
            </span>
            <div
              class="min-w-0 flex-1 rounded-lg bg-slate-100 p-4"
              :class="[
                comment.mine ? 'border-2 border-brand-500 bg-white' : '',
                comment.deleted ? 'bg-slate-50 text-slate-400' : '',
              ]"
            >
              <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-slate-500">
                <strong :class="comment.deleted ? 'text-slate-400' : 'text-slate-950'">{{ comment.authorNickname }}</strong>
                <span>
                  {{ new Date(comment.createdAt).toLocaleString() }}
                  <small v-if="comment.edited" class="ml-1 text-slate-400">수정됨</small>
                </span>
              </div>
              <template v-if="editingCommentId === comment.commentId">
                <textarea
                  v-model="editCommentDraft"
                  :data-testid="`edit-comment-input-${comment.commentId}`"
                  class="brand-input min-h-24 w-full rounded-lg px-3 py-2 text-sm outline-none"
                />
                <div class="mt-2 flex justify-end gap-2">
                  <button class="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-600" @click="cancelCommentEdit">취소</button>
                  <button
                    :data-testid="`save-comment-edit-${comment.commentId}`"
                    class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
                    :disabled="savingComment || !editCommentDraft.trim()"
                    @click="saveCommentEdit(comment)"
                  >
                    저장
                  </button>
                </div>
              </template>
              <template v-else>
                <p class="whitespace-pre-line break-words text-sm" :class="comment.deleted ? 'italic text-slate-400' : 'text-slate-700'">
                  <strong v-if="comment.replyToNickname" class="mr-1 font-black text-brand-500">@{{ comment.replyToNickname }}</strong>
                  {{ comment.content }}
                </p>
                <div v-if="!comment.deleted" class="mt-3 flex flex-wrap gap-3 text-xs font-black">
                  <button
                    :data-testid="`reply-comment-${comment.commentId}`"
                    class="text-brand-500 hover:text-brand-600"
                    @click="openReply(comment)"
                  >
                    답글
                  </button>
                  <button
                    v-if="comment.mine"
                    :data-testid="`edit-comment-${comment.commentId}`"
                    class="text-slate-500 hover:text-slate-700"
                    @click="openCommentEdit(comment)"
                  >
                    수정
                  </button>
                  <button
                    v-if="comment.mine"
                    :data-testid="`delete-comment-${comment.commentId}`"
                    class="text-red-500 hover:text-red-600"
                    :disabled="savingComment"
                    @click="removeComment(comment)"
                  >
                    삭제
                  </button>
                </div>
              </template>
              <div v-if="replyTargetId === comment.commentId" class="mt-3 rounded-lg border border-brand-100 bg-white p-3">
                <p class="mb-2 text-xs font-black text-brand-500">@{{ comment.authorNickname }}에게 답글</p>
                <div class="flex gap-2">
                  <input
                    v-model="replyDraft"
                    :data-testid="`reply-input-${comment.commentId}`"
                    class="brand-input h-10 min-w-0 flex-1 rounded-lg px-3 text-sm outline-none"
                    placeholder="답글을 입력하세요"
                    @keyup.enter="submitReply(comment)"
                  />
                  <button class="rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600" @click="cancelReply">취소</button>
                  <button
                    :data-testid="`submit-reply-${comment.commentId}`"
                    class="rounded-lg bg-brand-500 px-3 text-xs font-black text-white disabled:opacity-50"
                    :disabled="submittingReply || !replyDraft.trim()"
                    @click="submitReply(comment)"
                  >
                    등록
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-if="comments.length === 0" class="rounded-lg bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
          아직 댓글이 없습니다.
        </p>
      </section>
    </article>
  </section>
</template>
