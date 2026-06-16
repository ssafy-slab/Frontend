<script setup lang="ts">
import AuthForm from '@/features/auth/ui/AuthForm.vue'
import type { AuthUser } from '@/entities/auth/api/authApi'
import BrandLogo from '@/shared/ui/BrandLogo.vue'

defineProps<{
  mode: 'login' | 'signup'
}>()

const emit = defineEmits<{
  change: [view: string]
  authenticated: [payload: AuthUser]
}>()
</script>

<template>
  <section class="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-10">
    <div class="brand-card w-full max-w-md rounded-2xl px-6 py-8 sm:px-9 sm:py-10">
      <div class="text-center">
        <button @click="emit('change', 'home')">
          <BrandLogo />
        </button>
        <h1 class="mt-6 text-3xl font-black text-slate-950">{{ mode === 'login' ? '로그인' : '회원가입' }}</h1>
        <p class="mt-4 text-sm font-semibold text-slate-500">
          {{ mode === 'login' ? '이짝워뗘와 함께 완벽한 여행을 계획하세요.' : '이짝워뗘와 함께 새로운 여행을 시작하세요.' }}
        </p>
      </div>

      <AuthForm :mode="mode" @change="emit('change', $event)" @authenticated="emit('authenticated', $event)" />
    </div>
  </section>
</template>
