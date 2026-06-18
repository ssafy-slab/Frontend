<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { CheckCircle2, Circle } from 'lucide-vue-next'
import type { AuthUser } from '@/entities/auth/api/authApi'
import { getDisplayEmail } from '@/entities/auth/api/authApi'
import { getPasswordChecks, isPasswordValid } from '@/shared/lib/password'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ currentUser: AuthUser | null }>()
const emit = defineEmits<{
  change: [view: string]
  saved: [message: string]
}>()

const authStore = useAuthStore()
const activeTab = ref<'profile' | 'password'>('profile')
const nickname = ref(props.currentUser?.nickname ?? '')
const errorMessage = ref('')
const isSaving = ref(false)
const isDeleting = ref(false)
const displayEmail = computed(() => getDisplayEmail(props.currentUser?.email))
const passwordForm = reactive({ currentPassword: '', newPassword: '', passwordConfirm: '' })
const passwordChecks = computed(() => getPasswordChecks(passwordForm.newPassword))

watch(() => props.currentUser?.nickname, (value) => {
  nickname.value = value ?? ''
})

function selectTab(tab: 'profile' | 'password') {
  activeTab.value = tab
  errorMessage.value = ''
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

        <div v-else class="mt-5">
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

        <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{{ errorMessage }}</p>

        <div class="mt-7 border-t border-slate-200 pt-5">
          <button class="h-10 rounded-lg px-4 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60" :disabled="!currentUser || isDeleting" @click="deleteAccount">
            {{ isDeleting ? '탈퇴 처리 중...' : '회원 탈퇴' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
