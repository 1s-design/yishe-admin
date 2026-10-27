<template>
  <div v-show="getShow" class="ds-form">
    <!-- Header -->
    <div class="ds-form__header">
      <p class="ds-form__welcome">欢迎加入</p>
      <h1 class="ds-form__title">创建账号</h1>
    </div>

    <!-- Form fields -->
    <el-form
      ref="formRegister"
      :model="registerData.registerForm"
      :rules="registerRules"
      class="ds-form__form"
      @submit.prevent
    >
      <!-- Username -->
      <el-form-item prop="username">
        <label class="ds-form__label">账号 <span class="required">*</span></label>
        <el-input
          v-model="registerData.registerForm.username"
          placeholder="请输入账号（3-30位）"
          size="large"
          class="ds-form__input"
          :class="{ 'is-valid': fieldStatus.username === 'valid', 'is-invalid': fieldStatus.username === 'invalid' }"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.username === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.username === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Nickname -->
      <el-form-item prop="nickname">
        <label class="ds-form__label">昵称</label>
        <el-input
          v-model="registerData.registerForm.nickname"
          placeholder="请输入昵称"
          size="large"
          class="ds-form__input"
          :class="{ 'is-valid': fieldStatus.nickname === 'valid', 'is-invalid': fieldStatus.nickname === 'invalid' }"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.nickname === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.nickname === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Email -->
      <el-form-item prop="email">
        <label class="ds-form__label">邮箱 <span class="required">*</span></label>
        <el-input
          v-model="registerData.registerForm.email"
          placeholder="请输入邮箱"
          size="large"
          class="ds-form__input"
          :class="{ 'is-valid': fieldStatus.email === 'valid', 'is-invalid': fieldStatus.email === 'invalid' }"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.email === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.email === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Phone -->
      <el-form-item prop="phone">
        <label class="ds-form__label">手机号 <span class="required">*</span></label>
        <el-input
          v-model="registerData.registerForm.phone"
          placeholder="请输入手机号"
          size="large"
          class="ds-form__input"
          :class="{ 'is-valid': fieldStatus.phone === 'valid', 'is-invalid': fieldStatus.phone === 'invalid' }"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.phone === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.phone === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Password -->
      <el-form-item prop="password">
        <label class="ds-form__label">密码 <span class="required">*</span></label>
        <el-input
          v-model="registerData.registerForm.password"
          type="password"
          placeholder="请输入密码（8-20位，含字母+数字）"
          size="large"
          class="ds-form__input"
          show-password
          :class="{ 'is-valid': fieldStatus.password === 'valid', 'is-invalid': fieldStatus.password === 'invalid' }"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.password === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.password === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Confirm Password -->
      <el-form-item prop="confirmPassword">
        <label class="ds-form__label">确认密码 <span class="required">*</span></label>
        <el-input
          v-model="registerData.registerForm.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          size="large"
          class="ds-form__input"
          show-password
          :class="{ 'is-valid': fieldStatus.confirmPassword === 'valid', 'is-invalid': fieldStatus.confirmPassword === 'invalid' }"
          @keyup.enter="handleRegister()"
        >
          <template #suffix>
            <el-icon v-if="fieldStatus.confirmPassword === 'valid'" class="ds-form__status-icon ds-form__status-icon--valid"><CircleCheckFilled /></el-icon>
            <el-icon v-else-if="fieldStatus.confirmPassword === 'invalid'" class="ds-form__status-icon ds-form__status-icon--invalid"><CircleCloseFilled /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <!-- Submit -->
      <el-button
        type="primary"
        size="large"
        class="ds-form__submit"
        :loading="loginLoading"
        @click="handleRegister()"
      >
        注 册
      </el-button>

      <!-- Back to Login -->
      <div class="ds-form__get-account">
        <button type="button" class="ds-form__link" @click="handleBackLogin()">
          已有账号？返回登录
        </button>
      </div>
    </el-form>
  </div>

  <!-- Human Verify Modal -->
  <HumanVerify
    :visible="verifyVisible"
    @success="onVerifySuccess"
    @close="verifyVisible = false"
  />
</template>

<script lang="ts" setup>
import { ElLoading } from 'element-plus'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { CircleCheckFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import * as authUtil from '@/utils/auth'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { resolveFirstAccessibleMenuPath } from '@/router/menu-path'
import * as LoginApi from '@/api/login'
import { LoginStateEnum, SELF_REGISTER_ENABLED, useLoginState } from './useLogin'
import { useUserStoreWithOut } from '@/store/modules/user'
import { removeToken, setAccessToken } from '@/utils/auth'
import HumanVerify from '@/components/HumanVerify/index.vue'

defineOptions({ name: 'DsRegisterForm' })

const message = useMessage()
const formRegister = ref()
const verifyToken = ref('')
const verifyVisible = ref(false)
const { handleBackLogin, getLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
const redirect = ref<string>('')
const loginLoading = ref(false)
const loading = ref()

const getShow = computed(
  () =>
    SELF_REGISTER_ENABLED && unref(getLoginState) === LoginStateEnum.REGISTER
)

// 每个字段的校验状态：'' | 'valid' | 'invalid'
const fieldStatus = reactive<Record<string, 'valid' | 'invalid' | ''>>({
  username: '',
  nickname: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

// 单个字段校验
const validateField = async (prop: string) => {
  try {
    await formRegister.value?.validateField(prop)
    fieldStatus[prop] = 'valid'
  } catch {
    fieldStatus[prop] = 'invalid'
  }
}

const equalToPassword = (rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入您的密码'))
  } else if (registerData.registerForm.password !== value) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const emailValidator = (rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入邮箱'))
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    callback(new Error('请输入有效的邮箱地址'))
  } else {
    callback()
  }
}

const phoneValidator = (rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入手机号'))
  } else if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入有效的手机号'))
  } else {
    callback()
  }
}

// 点击注册 -> 先验证表单 -> 弹出验证弹窗
const handleRegister = async () => {
  try {
    await formRegister.value?.validate()
  } catch {
    return
  }
  verifyVisible.value = true
}

// 验证成功 -> 执行注册
function onVerifySuccess(token: string) {
  verifyToken.value = token
  verifyVisible.value = false
  doRegister()
}

// 实际注册请求
const doRegister = async () => {
  loginLoading.value = true
  try {
    const res = await LoginApi.register({
      account: registerData.registerForm.username,
      name: registerData.registerForm.nickname,
      email: registerData.registerForm.email,
      phone: registerData.registerForm.phone,
      password: registerData.registerForm.password,
      verifyToken: verifyToken.value
    })

    if (!res) return

    loading.value = ElLoading.service({
      lock: true,
      text: '注册成功，正在自动登录...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    removeToken()
    setAccessToken(res.token)

    const userStore = useUserStoreWithOut()
    const permissionStore = usePermissionStoreWithOut()
    try {
      await userStore.setUserInfoAction()
      await permissionStore.generateRoutes()
      await push({ path: '/' })
    } catch (error) {
      console.error('获取用户信息或生成路由失败:', error)
      message.error('系统初始化失败，请刷新页面重试')
    }
  } catch (error: any) {
    message.error(error?.message || '注册失败，请稍后重试')
  } finally {
    loginLoading.value = false
    loading.value?.close()
  }
}

const registerRules = {
  username: [
    { required: true, trigger: ['blur', 'change'], message: '请输入您的账号' },
    { min: 3, max: 30, message: '用户账号长度必须介于 3 和 30 之间', trigger: ['blur', 'change'] },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
          callback(new Error('账号仅支持字母、数字和下划线'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change']
    }
  ],
  nickname: [
    { required: true, trigger: ['blur', 'change'], message: '请输入您的昵称' },
    { min: 1, max: 30, message: '昵称长度必须介于 1 和 30 之间', trigger: ['blur', 'change'] }
  ],
  email: [
    { required: true, trigger: ['blur', 'change'], message: '请输入邮箱' },
    { validator: emailValidator, trigger: ['blur', 'change'] }
  ],
  phone: [
    { required: true, trigger: ['blur', 'change'], message: '请输入手机号' },
    { validator: phoneValidator, trigger: ['blur', 'change'] }
  ],
  password: [
    { required: true, trigger: ['blur', 'change'], message: '请输入您的密码' },
    { min: 8, max: 20, message: '用户密码长度必须介于 8 和 20 之间', trigger: ['blur', 'change'] },
    { pattern: /^[^<>"'|\\]+$/, message: '不能包含非法字符：< > " \' \\\ |', trigger: ['blur', 'change'] },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value && !/[a-zA-Z]/.test(value)) {
          callback(new Error('密码必须包含至少一个字母'))
        } else if (value && !/\d/.test(value)) {
          callback(new Error('密码必须包含至少一个数字'))
        } else {
          callback()
        }
      },
      trigger: ['blur', 'change']
    }
  ],
  confirmPassword: [
    { required: true, trigger: ['blur', 'change'], message: '请再次输入您的密码' },
    { required: true, validator: equalToPassword, trigger: ['blur', 'change'] }
  ]
}

const registerData = reactive({
  registerForm: {
    username: '',
    nickname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  }
})

const resolveFirstAccessiblePath = () => {
  const permissionStore = usePermissionStoreWithOut()
  return resolveFirstAccessibleMenuPath(permissionStore.getAddRouters) || '/403'
}

watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  {
    immediate: true
  }
)

// 实时校验：监听各字段变化，触发单字段校验更新状态图标
watch(() => registerData.registerForm.username, () => validateField('username'))
watch(() => registerData.registerForm.nickname, () => validateField('nickname'))
watch(() => registerData.registerForm.email, () => validateField('email'))
watch(() => registerData.registerForm.phone, () => validateField('phone'))
watch(() => registerData.registerForm.password, () => validateField('password'))
watch(() => registerData.registerForm.confirmPassword, () => validateField('confirmPassword'))
</script>

<style lang="scss" scoped>
.ds-form {
  display: flex;
  flex-direction: column;
  padding: 0;
  width: 100%;
  gap: 0;

  &__header {
    margin-bottom: 16px;
  }

  &__welcome {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 400;
  }

  &__title {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--el-color-primary);
    letter-spacing: -0.02em;
  }

  &__form {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  &__label {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    letter-spacing: 0.02em;

    .required {
      color: var(--el-color-danger);
      margin-left: 2px;
    }
  }

  &__input {
    width: 100%;

    :deep(.el-input__wrapper) {
      padding: 0 12px;
      height: 36px;
      background: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 6px;
      box-shadow: none !important;
      transition: border-color 0.2s;
    }

    :deep(.el-input__wrapper:hover) {
      border-color: var(--el-border-color);
    }

    :deep(.el-input__wrapper.is-focus) {
      border-color: var(--el-color-primary);
    }

    :deep(.el-input__inner) {
      height: 34px;
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    /* 实时校验状态样式 */
    &.is-valid :deep(.el-input__wrapper) {
      border-color: var(--el-color-success);
    }
    &.is-invalid :deep(.el-input__wrapper) {
      border-color: var(--el-color-danger);
    }
  }

  // 状态图标
  &__status-icon {
    font-size: 14px;
    margin-right: 2px;

    &--valid {
      color: var(--el-color-success);
    }
    &--invalid {
      color: var(--el-color-danger);
    }
  }

  &__submit {
    width: 100%;
    height: 38px;
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    background: var(--el-color-primary);
    border: none;
    border-radius: 6px;

    &:hover {
      background: var(--el-color-primary-light-3);
    }
  }

  &__get-account {
    display: flex;
    justify-content: center;
    margin-top: 12px;
  }

  &__link {
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-color-primary);
    cursor: pointer;
    background: transparent;
    border: none;
    transition: color 0.15s ease;

    &:hover {
      color: var(--el-color-primary-light-3);
    }
  }
}

// 稳定间距与防抖动校验报错
:deep(.el-form-item) {
  position: relative;
  margin-bottom: 18px;

  &:last-of-type {
    margin-bottom: 22px;
  }
}

:deep(.el-form-item__content) {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: auto;
}

:deep(.el-form-item__error) {
  position: absolute;
  top: 100%;
  left: 0;
  padding-top: 2px;
  font-size: 11px;
  line-height: 14px;
  color: var(--el-color-danger);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  pointer-events: none;
}

// Tablet
@media (width <= 1200px) {
  .ds-form {
    padding: 0;
  }
}

// Mobile
@media (width <= 768px) {
  .ds-form {
    padding: 0;

    &__welcome {
      font-size: 12px;
    }

    &__title {
      font-size: 16px;
    }

    &__header {
      margin-bottom: 14px;
    }

    &__input {
      :deep(.el-input__wrapper) {
        height: 38px;
      }
      :deep(.el-input__inner) {
        height: 36px;
      }
    }

    &__submit {
      height: 38px;
    }
  }
}
</style>
