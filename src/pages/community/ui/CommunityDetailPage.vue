<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Edit3, Heart, MessageCircle, MapPin, Send, Trash2, User } from 'lucide-vue-next'
import {
  createCommunityComment,
  deleteCommunityPost,
  fetchCommunityComments,
  fetchCommunityPost,
  resolveCommunityImageUrl,
  toggleCommunityPostLike,
  type CommunityComment,
  type CommunityPostDetail,
} from '@/entities/community/api/communityApi'
import { findMockCommunityPost, mockCommunityComments } from '@/entities/community/model/mockCommunity'

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
const submittingComment = ref(false)
const errorMessage = ref('')

const categoryLabel = computed(() => post.value ? categoryLabels[post.value.category] ?? post.value.category : '')
const postImageUrl = computed(() => post.value?.imageUrl ? resolveCommunityImageUrl(post.value.imageUrl) : '')

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
    })
    post.value = {
      ...post.value,
      commentCount: comments.value.length,
    }
    commentDraft.value = ''
  } catch (error) {
    emit('saved', error instanceof Error ? error.message : '댓글 등록에 실패했습니다.')
  } finally {
    submittingComment.value = false
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
        <img v-if="postImageUrl" :src="postImageUrl" :alt="post.title" class="h-72 w-full rounded-xl object-cover sm:h-[420px]" />
        <p class="whitespace-pre-line break-words [overflow-wrap:anywhere]">{{ post.content || '본문이 없습니다.' }}</p>

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

      <div class="mt-8 flex justify-center">
        <button
          class="like-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black transition"
          :class="post.likedByMe ? 'liked bg-red-500 text-white' : 'bg-brand-500 text-white hover:bg-brand-600'"
          @click="toggleLike"
        >
          <Heart :size="16" :fill="post.likedByMe ? 'currentColor' : 'none'" />
          좋아요 {{ post.likeCount }}
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
          <div v-for="comment in comments" :key="comment.commentId" class="flex gap-3" :class="comment.parentCommentId ? 'ml-8 sm:ml-12' : ''">
            <span class="grid size-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-600">
              {{ comment.authorNickname.slice(0, 1) }}
            </span>
            <div class="flex-1 rounded-lg bg-slate-100 p-4" :class="comment.mine ? 'border-2 border-brand-500 bg-white' : ''">
              <div class="mb-2 flex justify-between text-sm font-bold text-slate-500">
                <strong class="text-slate-950">{{ comment.authorNickname }}</strong>
                <span>{{ new Date(comment.createdAt).toLocaleString() }}</span>
              </div>
              <p class="whitespace-pre-line text-sm text-slate-700">{{ comment.content }}</p>
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
