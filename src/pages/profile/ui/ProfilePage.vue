<script setup lang="ts">
import { ref, watch } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

type User = {
  email: string
  nickname: string
}

const props = defineProps<{
  currentUser: User | null
}>()

const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

const authStore = useAuthStore()
const nickname = ref(props.currentUser?.nickname ?? '')
const errorMessage = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteModal = ref(false)

watch(
  () => props.currentUser?.nickname,
  (value) => {
    nickname.value = value ?? ''
  },
)

async function saveProfile() {
  errorMessage.value = ''
  const nextNickname = nickname.value.trim()

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

function resetForm() {
  nickname.value = props.currentUser?.nickname ?? ''
  errorMessage.value = ''
}

function openDeleteModal() {
  errorMessage.value = ''
  showDeleteModal.value = true
}

async function confirmDeleteAccount() {
  errorMessage.value = ''
  isDeleting.value = true
  try {
    await authStore.deleteAccount()
    showDeleteModal.value = false
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
        <h2 class="mt-4 text-xl font-black text-slate-950">
          {{ currentUser ? `${currentUser.nickname} 님` : '여행자' }}
        </h2>
        <p class="mt-1 text-sm font-semibold text-slate-500">{{ currentUser?.email ?? '로그인 후 이용할 수 있습니다.' }}</p>
        <button v-if="!currentUser" class="btn-primary mt-5 h-10 w-full rounded-lg text-sm" @click="emit('change', 'login')">
          로그인하러 가기
        </button>
      </aside>

      <section class="brand-card rounded-xl p-5">
        <h2 class="text-lg font-black text-slate-950">기본 정보</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">닉네임</span>
            <input v-model="nickname" class="brand-input h-10 w-full rounded-lg px-3 text-sm outline-none" :disabled="!currentUser" />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-black text-slate-950">이메일</span>
            <input
              class="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500 outline-none"
              :value="currentUser?.email ?? ''"
              placeholder="email@example.com"
              readonly
            />
            <span class="mt-1.5 block text-xs font-semibold text-slate-400">이메일은 로그인 ID로 사용되어 변경할 수 없습니다.</span>
          </label>
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
          {{ errorMessage }}
        </p>

        <div class="mt-6 border-t border-slate-200 pt-5">
          <h3 class="font-black text-slate-950">활동 요약</h3>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">내 일정</p>
              <p class="mt-1 text-2xl font-black text-slate-950">2</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">저장한 장소</p>
              <p class="mt-1 text-2xl font-black text-slate-950">8</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-4">
              <p class="text-xs font-black text-slate-500">커뮤니티 글</p>
              <p class="mt-1 text-2xl font-black text-slate-950">3</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            class="h-10 rounded-lg px-4 text-sm font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!currentUser || isDeleting"
            @click="openDeleteModal"
          >
            회원 탈퇴
          </button>

          <div class="flex justify-end gap-2">
            <button class="h-10 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700" @click="resetForm">취소</button>
            <button class="btn-primary h-10 rounded-lg px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60" :disabled="!currentUser || isSaving" @click="saveProfile">
              {{ isSaving ? '저장 중...' : '저장하기' }}
            </button>
          </div>
        </div>
      </section>
    </div>

    <Transition name="modal-fade">
      <div v-if="showDeleteModal" class="fixed inset-0 z-[90] grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm" @click.self="showDeleteModal = false">
        <section class="modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div class="flex gap-4">
            <span class="grid size-14 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle :size="28" />
            </span>
            <div class="min-w-0">
              <h2 class="text-2xl font-black text-slate-950">회원 탈퇴</h2>
              <p class="mt-3 text-sm font-semibold leading-6 text-slate-600">
                탈퇴하면 현재 계정으로 다시 로그인할 수 없습니다. 이 기기에 저장된 로그인 정보도 함께 삭제됩니다.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              class="h-11 rounded-xl bg-slate-100 px-5 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isDeleting"
              @click="showDeleteModal = false"
            >
              취소
            </button>
            <button
              class="h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isDeleting"
              @click="confirmDeleteAccount"
            >
              {{ isDeleting ? '탈퇴 처리 중...' : '탈퇴하기' }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </section>
</template>
