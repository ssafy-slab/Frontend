<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, Circle, Heart, MessageCircle, Star, Trash2 } from 'lucide-vue-next'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { getDisplayEmail } from '@/entities/auth/api/authApi'
import {
  fetchMyLikedCommunityPosts,
  resolveCommunityImageUrl,
  unlikeCommunityPost,
  type CommunityPostSummary,
} from '@/entities/community/api/communityApi'
import { fetchMyLikedPlaces, resolvePlaceDisplayImage, unlikePlace } from '@/entities/place/api/placeApi'
import type { Place } from '@/entities/travel/model/travel'
import { deleteMyPlaceReview, fetchMyPlaceReviews } from '@/entities/review/api/reviewApi'
import type { MyPlaceReview } from '@/entities/review/api/reviewApi'
import { getPasswordChecks, isPasswordValid } from '@/shared/lib/password'
import { useAuthStore } from '@/stores/auth'
import SafeImage from '@/shared/ui/SafeImage.vue'

const props = defineProps<{ currentUser: AuthUser | null }>()
const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
  openPlace: [placeId: number]
  openPost: [postId: number]
}>()

const authStore = useAuthStore()
const activeTab = ref<'profile' | 'password' | 'reviews' | 'likes'>('profile')
const likedContentTab = ref<'posts' | 'places'>('posts')
const nickname = ref(props.currentUser?.nickname ?? '')
const errorMessage = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const reviews = ref<MyPlaceReview[]>([])
const reviewPage = ref(0)
const reviewTotalElements = ref(0)
const reviewTotalPages = ref(0)
const isReviewsLoading = ref(false)
const deletingReviewId = ref<number | null>(null)
const reviewErrorMessage = ref('')
const likedPosts = ref<CommunityPostSummary[]>([])
const likedPlaces = ref<Place[]>([])
const likedPage = ref(0)
const likedPageSize = 20
const isLikesLoading = ref(false)
const likeErrorMessage = ref('')
const removingLikeIds = ref<number[]>([])
const displayEmail = computed(() => getDisplayEmail(props.currentUser?.email))
const passwordForm = reactive({ currentPassword: '', newPassword: '', passwordConfirm: '' })
const passwordChecks = computed(() => getPasswordChecks(passwordForm.newPassword))

watch(() => props.currentUser?.nickname, (value) => {
  nickname.value = value ?? ''
})

async function selectTab(tab: 'profile' | 'password' | 'reviews' | 'likes') {
  activeTab.value = tab
  errorMessage.value = ''
  if (tab === 'reviews') await loadMyReviews()
  if (tab === 'likes') await loadLikedContent(0)
}

async function loadLikedContent(page = likedPage.value) {
  if (!authStore.accessToken) return
  isLikesLoading.value = true
  likeErrorMessage.value = ''
  try {
    if (likedContentTab.value === 'posts') {
      likedPosts.value = await fetchMyLikedCommunityPosts(authStore.accessToken, page, likedPageSize)
    } else {
      likedPlaces.value = await fetchMyLikedPlaces(authStore.accessToken, page, likedPageSize)
    }
    likedPage.value = page
  } catch (error) {
    likeErrorMessage.value = error instanceof Error ? error.message : '좋아요 목록을 불러오지 못했습니다.'
  } finally {
    isLikesLoading.value = false
  }
}

async function removePostLike(item: CommunityPostSummary) {
  if (!authStore.accessToken || removingLikeIds.value.includes(item.postId)) return
  const index = likedPosts.value.findIndex((post) => post.postId === item.postId)
  removingLikeIds.value = [...removingLikeIds.value, item.postId]
  likedPosts.value = likedPosts.value.filter((post) => post.postId !== item.postId)
  try {
    await unlikeCommunityPost(item.postId, authStore.accessToken)
  } catch (error) {
    likedPosts.value.splice(Math.max(0, index), 0, item)
    emit('saved', error instanceof Error ? error.message : '좋아요 해제에 실패했습니다.')
  } finally {
    removingLikeIds.value = removingLikeIds.value.filter((postId) => postId !== item.postId)
  }
}

async function removePlaceLike(item: Place) {
  if (!authStore.accessToken || removingLikeIds.value.includes(item.id)) return
  const index = likedPlaces.value.findIndex((place) => place.id === item.id)
  removingLikeIds.value = [...removingLikeIds.value, item.id]
  likedPlaces.value = likedPlaces.value.filter((place) => place.id !== item.id)
  try {
    await unlikePlace(item.id, authStore.accessToken)
  } catch (error) {
    likedPlaces.value.splice(Math.max(0, index), 0, item)
    emit('saved', error instanceof Error ? error.message : '좋아요 해제에 실패했습니다.')
  } finally {
    removingLikeIds.value = removingLikeIds.value.filter((id) => id !== item.id)
  }
}

async function selectLikedContentTab(tab: 'posts' | 'places') {
  likedContentTab.value = tab
  likedPage.value = 0
  await loadLikedContent(0)
}

function likedPostImage(imageUrl: string | null) {
  return imageUrl ? resolveCommunityImageUrl(imageUrl) : '/images/default-place.svg'
}

async function loadMyReviews(page = reviewPage.value) {
  if (!authStore.accessToken) return
  isReviewsLoading.value = true
  reviewErrorMessage.value = ''
  try {
    const result = await fetchMyPlaceReviews(authStore.accessToken, page, 10)
    reviews.value = result.content
    reviewPage.value = result.page
    reviewTotalElements.value = result.totalElements
    reviewTotalPages.value = result.totalPages
  } catch (error) {
    reviewErrorMessage.value = error instanceof Error ? error.message : '내 리뷰를 불러오지 못했습니다.'
  } finally {
    isReviewsLoading.value = false
  }
}

async function deleteReview(item: MyPlaceReview) {
  if (!authStore.accessToken || !window.confirm('이 리뷰를 삭제할까요?')) return
  deletingReviewId.value = item.reviewId
  reviewErrorMessage.value = ''
  try {
    await deleteMyPlaceReview(item.placeId, authStore.accessToken)
    const targetPage = reviews.value.length === 1 && reviewPage.value > 0 ? reviewPage.value - 1 : reviewPage.value
    await loadMyReviews(targetPage)
    emit('saved', '리뷰가 삭제되었습니다.')
  } catch (error) {
    reviewErrorMessage.value = error instanceof Error ? error.message : '리뷰를 삭제하지 못했습니다.'
  } finally {
    deletingReviewId.value = null
  }
}

function reviewDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

function visibleReviewPages() {
  const start = Math.max(0, Math.min(reviewPage.value - 2, reviewTotalPages.value - 5))
  const end = Math.min(reviewTotalPages.value, start + 5)
  return Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index)
}

async function saveProfile() {
  const nextNickname = nickname.value.trim()
  errorMessage.value = ''
  if (!nextNickname) {
    errorMessage.value = '닉네임을 입력해주세요.'
    return
  }
  isSaving.value = true
  try {
    await authStore.updateProfile({ nickname: nextNickname })
    emit('saved', '개인정보가 수정되었습니다.')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '개인정보 수정에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function submitPasswordChange() {
  errorMessage.value = ''
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.passwordConfirm) {
    errorMessage.value = '모든 비밀번호 항목을 입력해주세요.'
    return
  }
  if (!isPasswordValid(passwordForm.newPassword)) {
    errorMessage.value = '새 비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.'
    return
  }
  if (passwordForm.newPassword !== passwordForm.passwordConfirm) {
    errorMessage.value = '새 비밀번호 확인이 일치하지 않습니다.'
    return
  }

  isSaving.value = true
  try {
    await authStore.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.passwordConfirm = ''
    emit('saved', '비밀번호가 변경되었습니다.')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다.'
  } finally {
    isSaving.value = false
  }
}

async function deleteAccount() {
  if (!window.confirm('정말 회원 탈퇴하시겠습니까?')) return
  errorMessage.value = ''
  isDeleting.value = true
  try {
    await authStore.deleteAccount()
    emit('saved', '회원 탈퇴가 완료되었습니다.')
    emit('change', 'home')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.'
  } finally {
    isDeleting.value = false
  }
}

</script>

<template>
  <section class="app-container py-6 md:py-8">
    <div class="mb-5">
      <p class="text-sm font-black text-brand-500">MY PAGE</p>
      <h1 class="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">개인정보 관리</h1>
    </div>

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside class="brand-card h-fit rounded-xl p-5">
        <div class="grid size-16 place-items-center rounded-full bg-brand-100 text-xl font-black text-brand-600">
          {{ currentUser?.nickname?.slice(0, 1) ?? '?' }}
        </div>
        <h2 class="mt-4 text-xl font-black text-slate-950">{{ currentUser?.nickname ?? '여행자' }}</h2>
        <p class="mt-1 text-sm font-semibold text-slate-500">{{ displayEmail }}</p>
        <button v-if="!currentUser" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="emit('change', 'login')">로그인하러 가기</button>
      </aside>

      <section class="brand-card rounded-xl p-5">
        <div class="flex border-b border-slate-200">
          <button class="px-4 py-3 text-sm font-black" :class="activeTab === 'profile' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-slate-500'" @click="selectTab('profile')">
            기본 정보
          </button>
          <button class="px-4 py-3 text-sm font-black" :class="activeTab === 'password' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-slate-500'" @click="selectTab('password')">
            비밀번호 변경
          </button>
          <button data-tab="reviews" class="px-4 py-3 text-sm font-black" :class="activeTab === 'reviews' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-slate-500'" @click="selectTab('reviews')">
            내 리뷰
          </button>
          <button data-tab="likes" class="px-4 py-3 text-sm font-black" :class="activeTab === 'likes' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-slate-500'" @click="selectTab('likes')">
            좋아요
          </button>
        </div>

        <form v-if="activeTab === 'profile'" class="mt-5" @submit.prevent="saveProfile">
          <div class="grid gap-4 sm:grid-cols-2">
            <label>
              <span class="mb-1.5 block text-xs font-black text-slate-950">닉네임</span>
              <input v-model="nickname" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :disabled="!currentUser" />
            </label>
            <label>
              <span class="mb-1.5 block text-xs font-black text-slate-950">이메일</span>
              <input class="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500" :value="displayEmail" readonly />
            </label>
          </div>
          <div class="mt-6 flex justify-end">
            <button class="btn-primary h-10 rounded-lg px-5 text-sm disabled:opacity-60" :disabled="!currentUser || isSaving">{{ isSaving ? '저장 중...' : '저장하기' }}</button>
          </div>
        </form>

        <div v-else-if="activeTab === 'password'" class="mt-5">
          <div v-if="currentUser && !currentUser.localAccount" class="rounded-xl bg-slate-50 p-5 text-sm font-bold text-slate-600">
            소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.
          </div>
          <form v-else class="space-y-4" @submit.prevent="submitPasswordChange">
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">현재 비밀번호</span>
              <input v-model="passwordForm.currentPassword" class="brand-input h-11 w-full rounded-lg px-3 outline-none" type="password" autocomplete="current-password" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">새 비밀번호</span>
              <input v-model="passwordForm.newPassword" class="brand-input h-11 w-full rounded-lg px-3 outline-none" type="password" autocomplete="new-password" />
            </label>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in passwordChecks" :key="item.label" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black" :class="item.valid ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'">
                <CheckCircle2 v-if="item.valid" :size="13" /><Circle v-else :size="13" />{{ item.label }}
              </span>
            </div>
            <label class="block">
              <span class="mb-1.5 block text-xs font-black text-slate-950">새 비밀번호 확인</span>
              <input v-model="passwordForm.passwordConfirm" class="brand-input h-11 w-full rounded-lg px-3 outline-none" type="password" autocomplete="new-password" />
            </label>
            <div class="flex justify-end">
              <button class="btn-primary h-10 rounded-lg px-5 text-sm disabled:opacity-60" :disabled="!currentUser || isSaving">{{ isSaving ? '변경 중...' : '비밀번호 변경' }}</button>
            </div>
          </form>
        </div>

        <div v-else-if="activeTab === 'reviews'" class="mt-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-slate-950">내가 작성한 리뷰</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">총 {{ reviewTotalElements }}개</p>
            </div>
          </div>

          <p v-if="isReviewsLoading" class="rounded-xl bg-slate-50 py-12 text-center text-sm font-bold text-slate-400">
            리뷰를 불러오는 중입니다.
          </p>
          <p v-else-if="reviewErrorMessage" class="rounded-xl bg-red-50 px-4 py-5 text-sm font-bold text-red-600">
            {{ reviewErrorMessage }}
          </p>
          <div v-else-if="reviews.length" class="space-y-3">
            <article
              v-for="item in reviews"
              :key="item.reviewId"
              data-action="open-place"
              role="link"
              tabindex="0"
              class="grid cursor-pointer gap-4 rounded-xl p-3 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6 sm:p-4"
              @click="emit('openPlace', item.placeId)"
              @keyup.enter="emit('openPlace', item.placeId)"
            >
              <img :src="item.thumbnailImageUrl" :alt="item.placeName" class="h-48 w-full rounded-lg object-cover sm:h-40" />
              <div class="flex min-w-0 flex-col py-1">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-xs font-black text-brand-500">{{ item.category || '여행지' }}</p>
                    <h3 class="mt-1 truncate text-lg font-black text-slate-950">{{ item.placeName }}</h3>
                  </div>
                  <time class="shrink-0 text-xs font-semibold text-slate-400">{{ reviewDate(item.updatedAt) }}</time>
                </div>
                <div class="mt-2 flex items-center gap-1 text-amber-400" :aria-label="`${item.rating}점`">
                  <Star v-for="score in 5" :key="score" :size="15" :fill="score <= item.rating ? 'currentColor' : 'none'" :class="score <= item.rating ? '' : 'text-slate-300'" />
                </div>
                <p v-if="item.content" class="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{{ item.content }}</p>
                <p v-else class="mt-3 text-sm font-semibold text-slate-400">별점만 남긴 리뷰입니다.</p>
                <div class="mt-auto flex items-center justify-end gap-4 pt-4">
                  <button class="text-xs font-black text-slate-600 underline-offset-4 hover:text-brand-500 hover:underline" @click.stop="emit('openPlace', item.placeId)">
                    여행지 보기
                  </button>
                  <button class="inline-flex items-center gap-1 text-xs font-black text-red-500 underline-offset-4 hover:underline disabled:opacity-50" :disabled="deletingReviewId === item.reviewId" @click.stop="deleteReview(item)">
                    <Trash2 :size="14" />
                    {{ deletingReviewId === item.reviewId ? '삭제 중' : '삭제' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="rounded-xl bg-slate-50 py-12 text-center">
            <p class="text-sm font-black text-slate-600">아직 작성한 리뷰가 없습니다.</p>
            <button class="mt-3 text-sm font-black text-brand-500 hover:text-brand-600" @click="emit('change', 'explore')">여행지 둘러보기</button>
          </div>
          <nav v-if="reviewTotalPages > 1" class="mt-6 flex items-center justify-center gap-1" aria-label="내 리뷰 페이지">
            <button class="h-8 rounded-md px-3 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" :disabled="reviewPage === 0 || isReviewsLoading" @click="loadMyReviews(reviewPage - 1)">
              이전
            </button>
            <button
              v-for="page in visibleReviewPages()"
              :key="page"
              class="grid size-8 place-items-center rounded-md text-xs font-black transition"
              :class="reviewPage === page ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'"
              :aria-current="reviewPage === page ? 'page' : undefined"
              @click="loadMyReviews(page)"
            >
              {{ page + 1 }}
            </button>
            <button class="h-8 rounded-md px-3 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35" :disabled="reviewPage >= reviewTotalPages - 1 || isReviewsLoading" @click="loadMyReviews(reviewPage + 1)">
              다음
            </button>
          </nav>
        </div>

        <div v-else class="mt-5">
          <div class="mb-5 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button data-testid="liked-posts-tab" class="flex-1 rounded-lg px-4 py-2 text-sm font-black" :class="likedContentTab === 'posts' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'" @click="selectLikedContentTab('posts')">게시글</button>
            <button data-testid="liked-places-tab" class="flex-1 rounded-lg px-4 py-2 text-sm font-black" :class="likedContentTab === 'places' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'" @click="selectLikedContentTab('places')">여행지</button>
          </div>

          <p v-if="isLikesLoading" class="rounded-xl bg-slate-50 py-12 text-center text-sm font-bold text-slate-400">
            좋아요 목록을 불러오는 중입니다.
          </p>
          <p v-else-if="likeErrorMessage" class="rounded-xl bg-red-50 px-4 py-5 text-sm font-bold text-red-600">
            {{ likeErrorMessage }}
          </p>
          <div v-else-if="likedContentTab === 'posts' && likedPosts.length" class="space-y-3">
            <article
              v-for="item in likedPosts"
              :key="item.postId"
              :data-testid="`liked-post-${item.postId}`"
              role="link"
              tabindex="0"
              class="grid cursor-pointer gap-4 rounded-xl p-3 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-4"
              @click="emit('openPost', item.postId)"
              @keyup.enter="emit('openPost', item.postId)"
            >
              <img :src="likedPostImage(item.imageUrl)" :alt="item.title" class="h-40 w-full rounded-lg object-cover" />
              <div class="flex min-w-0 flex-col py-1">
                <p class="text-xs font-black text-brand-500">{{ item.category }}</p>
                <h3 class="mt-1 line-clamp-2 text-lg font-black text-slate-950">{{ item.title }}</h3>
                <p v-if="item.excerpt" class="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{{ item.excerpt }}</p>
                <div class="mt-auto flex items-center justify-between gap-3 pt-4">
                  <span class="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span class="inline-flex items-center gap-1"><Heart :size="14" />{{ item.likeCount }}</span>
                    <span class="inline-flex items-center gap-1"><MessageCircle :size="14" />{{ item.commentCount }}</span>
                  </span>
                  <button
                    :data-testid="`remove-post-like-${item.postId}`"
                    class="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-2 text-xs font-black text-brand-600 disabled:cursor-wait disabled:opacity-50"
                    type="button"
                    :disabled="removingLikeIds.includes(item.postId)"
                    @click.stop="removePostLike(item)"
                  >
                    <Heart :size="14" fill="currentColor" />
                    좋아요 해제
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div v-else-if="likedContentTab === 'places' && likedPlaces.length" class="space-y-3">
            <article v-for="item in likedPlaces" :key="item.id" :data-testid="`liked-place-${item.id}`" class="grid cursor-pointer gap-4 rounded-xl p-3 hover:bg-slate-50 sm:grid-cols-[160px_minmax(0,1fr)]" @click="emit('openPlace', item.id)">
              <SafeImage :src="resolvePlaceDisplayImage(item)" :alt="item.title" class="h-40 w-full rounded-lg object-cover" />
              <div class="flex min-w-0 flex-col py-1">
                <p class="text-xs font-black text-brand-500">{{ item.category }}</p>
                <h3 class="mt-1 text-lg font-black text-slate-950">{{ item.title }}</h3>
                <p class="mt-2 text-sm text-slate-500">{{ item.location }}</p>
                <button :data-testid="`remove-place-like-${item.id}`" class="mt-auto ml-auto inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-500" :disabled="removingLikeIds.includes(item.id)" @click.stop="removePlaceLike(item)">
                  <Heart :size="14" fill="currentColor" /> 좋아요 해제
                </button>
              </div>
            </article>
          </div>
          <div v-else class="rounded-xl bg-slate-50 py-12 text-center">
            <Heart :size="28" class="mx-auto text-slate-300" />
            <p class="mt-3 text-sm font-black text-slate-600">{{ likedContentTab === 'posts' ? '좋아요한 게시글이 없습니다' : '좋아요한 여행지가 없습니다' }}</p>
          </div>

          <nav class="mt-6 flex items-center justify-center gap-2" aria-label="좋아요 목록 페이지">
            <button class="h-8 rounded-md px-3 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:opacity-35" :disabled="likedPage === 0 || isLikesLoading" @click="loadLikedContent(likedPage - 1)">
              이전
            </button>
            <span class="px-2 text-xs font-black text-slate-600">{{ likedPage + 1 }}</span>
            <button class="h-8 rounded-md px-3 text-xs font-black text-slate-500 hover:bg-slate-100 disabled:opacity-35" :disabled="(likedContentTab === 'posts' ? likedPosts.length : likedPlaces.length) < likedPageSize || isLikesLoading" @click="loadLikedContent(likedPage + 1)">
              다음
            </button>
          </nav>
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{{ errorMessage }}</p>

        <div v-if="activeTab === 'profile' || activeTab === 'password'" class="mt-7 border-t border-slate-200 pt-5">
          <button class="h-10 rounded-lg px-4 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60" :disabled="!currentUser || isDeleting" @click="deleteAccount">
            {{ isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
