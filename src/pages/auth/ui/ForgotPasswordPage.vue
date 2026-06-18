<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckCircle2, Circle } from 'lucide-vue-next'
import BrandLogo from '@/shared/ui/BrandLogo.vue'
import { resetPassword, verifyPasswordResetEmail } from '@/entities/auth/api/authApi'
import { getPasswordChecks, isPasswordValid } from '@/shared/lib/password'

const emit = defineEmits<{ change: [view: string] }>()
const form = reactive({ email: '', newPassword: '', passwordConfirm: '' })
const step = ref<'email' | 'password'>('email')
const errorMessage = ref('')
const successMessage = ref('')
const isSubmitting = ref(false)
const passwordChecks = computed(() => getPasswordChecks(form.newPassword))

async function continueToPassword() {
  errorMessage.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errorMessage.value = '올바른 이메일을 입력해주세요.'
    return
  }
  form.email = form.email.trim()
  isSubmitting.value = true
  try {
    await verifyPasswordResetEmail(form.email)
    step.value = 'password'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '이메일 확인에 실패했습니다.'
  } finally {
    isSubmitting.value = false
  }
}

function returnToEmail() {
  step.value = 'email'
  form.newPassword = ''
  form.passwordConfirm = ''
  errorMessage.value = ''
  successMessage.value = ''
}

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!isPasswordValid(form.newPassword)) {
    errorMessage.value = '비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.'
    return
  }
  if (form.newPassword !== form.passwordConfirm) {
    errorMessage.value = '비밀번호 확인이 일치하지 않습니다.'
    return
  }

  isSubmitting.value = true
  try {
    await resetPassword({ email: form.email.trim(), newPassword: form.newPassword })
    form.newPassword = ''
    form.passwordConfirm = ''
    successMessage.value = '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-10">
    <div class="brand-card w-full max-w-md rounded-2xl px-6 py-8 sm:px-9 sm:py-10">
      <div class="text-center">
        <button @click="emit('change', 'home')"><BrandLogo /></button>
        <h1 class="mt-6 text-3xl font-black text-slate-950">비밀번호 찾기</h1>
        <p class="mt-3 text-sm font-semibold text-slate-500">일반 가입 계정의 이메일과 새 비밀번호를 입력해주세요.</p>
      </div>

      <div class="mt-6 flex items-center justify-center gap-2">
        <span class="grid size-7 place-items-center rounded-full text-xs font-black" :class="step === 'email' ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600'">1</span>
        <span class="h-px w-10 bg-slate-200" />
        <span class="grid size-7 place-items-center rounded-full text-xs font-black" :class="step === 'password' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'">2</span>
      </div>

      <form v-if="step === 'email'" data-test="email-step" class="mt-6 space-y-3" @submit.prevent="continueToPassword">
        <label class="block">
          <span class="mb-1.5 block text-xs font-black text-slate-950">가입 이메일</span>
          <input v-model="form.email" class="brand-input h-12 w-full rounded-xl px-4 outline-none" type="email" placeholder="email@example.com" autofocus />
        </label>
        <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{{ errorMessage }}</p>
        <button type="button" data-test="continue-button" class="btn-primary h-12 w-full rounded-xl text-base disabled:opacity-60" :disabled="isSubmitting" @click="continueToPassword">
          {{ isSubmitting ? '확인 중...' : '다음' }}
        </button>
      </form>

      <form v-else data-test="password-step" class="mt-6 space-y-3" @submit.prevent="submit">
        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <p class="text-xs font-bold text-slate-400">비밀번호를 변경할 계정</p>
            <p class="mt-0.5 text-sm font-black text-slate-700">{{ form.email }}</p>
          </div>
          <button type="button" class="text-xs font-black text-brand-500" @click="returnToEmail">이메일 다시 입력</button>
        </div>
        <input v-model="form.newPassword" class="brand-input h-12 w-full rounded-xl px-4 outline-none" type="password" placeholder="새 비밀번호" autofocus />
        <div class="flex flex-wrap gap-2">
          <span v-for="item in passwordChecks" :key="item.label" class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black" :class="item.valid ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'">
            <CheckCircle2 v-if="item.valid" :size="13" /><Circle v-else :size="13" />{{ item.label }}
          </span>
        </div>
        <input v-model="form.passwordConfirm" class="brand-input h-12 w-full rounded-xl px-4 outline-none" type="password" placeholder="새 비밀번호 확인" />
        <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{{ errorMessage }}</p>
        <p v-if="successMessage" class="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{{ successMessage }}</p>
        <button class="btn-primary h-12 w-full rounded-xl text-base disabled:opacity-60" :disabled="isSubmitting">{{ isSubmitting ? '처리 중...' : '비밀번호 재설정' }}</button>
      </form>
      <button class="mt-5 w-full text-sm font-black text-brand-500" @click="emit('change', 'login')">로그인으로 돌아가기</button>
    </div>
  </section>
</template>
