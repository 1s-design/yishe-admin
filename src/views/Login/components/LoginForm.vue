<template>
  <div v-show="getShow" class="ds-form">
    <!-- Header -->
    <div class="ds-form__header">
      <p class="ds-form__welcome">欢迎使用</p>
      <h1 class="ds-form__title">衣设系统</h1>
    </div>

    <!-- Form fields -->
    <el-form ref="formLogin" :model="loginData.loginForm" :rules="LoginRules" class="ds-form__form">
      <!-- Account -->
      <div class="ds-form__field">
        <label class="ds-form__label">账号</label>
        <el-input
          v-model="loginData.loginForm.account"
          placeholder="请输入账号"
          size="large"
          class="ds-form__input"
        />
      </div>

      <!-- Password -->
      <div class="ds-form__field">
        <label class="ds-form__label">密码</label>
        <el-input
          v-model="loginData.loginForm.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          class="ds-form__input"
          show-password
          @keyup.enter="handleLogin()"
        />
      </div>

      <!-- Remember & Forgot -->
      <div class="ds-form__actions">
        <el-checkbox v-model="loginData.loginForm.rememberMe" class="ds-form__checkbox">
          记住我
        </el-checkbox>
        <button type="button" class="ds-form__link" @click="handleForgetPassword">
          忘记密码?
        </button>
      </div>

      <!-- Submit -->
      <el-button
        type="primary"
        size="large"
        class="ds-form__submit"
        :loading="loginLoading"
        @click="handleLogin()"
      >
        登 录
      </el-button>

      <!-- Register Link -->
      <div v-if="selfRegisterEnabled" class="ds-form__get-account">
        <button type="button" class="ds-form__link" @click="handleRegister">
          注册账号
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

  <!-- Contact Admin Dialog -->
  <el-dialog
    v-model="showContactDialog"
    title="获取账号"
    width="340px"
    align-center
    :close-on-click-modal="true"
  >
    <p style="margin: 0 0 8px; font-size: 14px; color: var(--el-text-color-regular)">
      请联系系统管理员获取账号
    </p>
    <p style="margin: 0; font-size: 13px; color: var(--el-text-color-secondary)">
      TEL / WECHAT：18742539196
    </p>
    <template #footer>
      <el-button type="primary" style="width: 100%" @click="showContactDialog = false">
        我知道了
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ElLoading } from "element-plus"
import type { RouteLocationNormalizedLoaded } from "vue-router"
import * as authUtil from "@/utils/auth"
import { usePermissionStoreWithOut } from "@/store/modules/permission"
import { resolveFirstAccessibleMenuPath } from "@/router/menu-path"
import * as LoginApi from "@/api/login"
import { LoginStateEnum, SELF_REGISTER_ENABLED, useFormValid, useLoginState } from "./useLogin"
import { useUserStoreWithOut } from "@/store/modules/user"
import { removeToken, setAccessToken } from "@/utils/auth"
import { getDeviceInfo } from "@/utils/device"
import HumanVerify from "@/components/HumanVerify/index.vue"

defineOptions({ name: "DsLoginForm" })

const message = useMessage()
const formLogin = ref()
const verifyToken = ref("")
const verifyVisible = ref(false)
const { validForm } = useFormValid(formLogin)
const { getLoginState, setLoginState } = useLoginState()
const { currentRoute, push } = useRouter()
const redirect = ref<string>("")
const loginLoading = ref(false)
const loading = ref()
const showContactDialog = ref(false)
const selfRegisterEnabled = SELF_REGISTER_ENABLED

const getShow = computed(() => unref(getLoginState) === LoginStateEnum.LOGIN)

// 点击登录 -> 先弹出验证
const handleLogin = async () => {
  try {
    await validForm()
  } catch {
    return
  }
  verifyVisible.value = true
}

// 验证成功 -> 执行登录
function onVerifySuccess(token: string) {
  verifyToken.value = token
  verifyVisible.value = false
  doLogin()
}

// 实际登录请求
const doLogin = async () => {
  loginLoading.value = true
  try {
    const loginDataLoginForm = {
      username: loginData.loginForm.account,
      password: loginData.loginForm.password,
      terminalType: "admin" as const,
      deviceInfo: getDeviceInfo(),
      verifyToken: verifyToken.value,
    }
    removeToken()
    const res = await LoginApi.login(loginDataLoginForm)
    if (!res) return

    loading.value = ElLoading.service({
      lock: true,
      text: "正在加载系统中...",
      background: "rgba(0, 0, 0, 0.7)",
    })
    if (loginData.loginForm.rememberMe) {
      authUtil.setLoginForm({
        username: loginData.loginForm.account,
        password: loginData.loginForm.password,
        rememberMe: true,
      })
    } else {
      authUtil.removeLoginForm()
    }
    setAccessToken(res.token)

    const userStore = useUserStoreWithOut()
    const permissionStore = usePermissionStoreWithOut()
    try {
      await userStore.setUserInfoAction()
      await permissionStore.generateRoutes()
      await push({ path: "/" })
    } catch (error) {
      console.error("获取用户信息或生成路由失败:", error)
      message.error("系统初始化失败，请刷新页面重试")
    }
  } finally {
    loginLoading.value = false
    loading.value?.close()
  }
}

const LoginRules = {
  account: [required],
  password: [required],
}

const resolveFirstAccessiblePath = () => {
  const permissionStore = usePermissionStoreWithOut()
  return resolveFirstAccessibleMenuPath(permissionStore.getAddRouters) || "/403"
}

const loginData = reactive({
  loginForm: {
    account: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || "",
    password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || "",
    rememberMe: true,
  },
})

const getLoginFormCache = () => {
  const loginForm = authUtil.getLoginForm()
  if (loginForm) {
    loginData.loginForm = {
      ...loginData.loginForm,
      account: loginForm.username ? loginForm.username : loginData.loginForm.account,
      password: loginForm.password ? loginForm.password : loginData.loginForm.password,
      rememberMe: loginForm.rememberMe,
    }
  }
}

const handleForgetPassword = () => {
  showContactDialog.value = true
}

const handleRegister = () => {
  setLoginState(LoginStateEnum.REGISTER)
}

watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  { immediate: true },
)

onMounted(() => {
  getLoginFormCache()
})
</script>

<style lang="scss" scoped>
.ds-form {
  display: flex;
  flex-direction: column;
  padding: 16px;
  width: 100%;
  gap: 0;

  &__header {
    margin-bottom: 12px;
  }

  &__welcome {
    margin: 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: 400;
  }

  &__title {
    margin: 4px 0 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--el-color-primary);
    letter-spacing: -0.02em;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  &__input {
    :deep(.el-input__wrapper) {
      padding: 0 12px;
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
      height: 32px;
      font-size: 12px;
      color: var(--el-text-color-primary);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
    margin-bottom: 8px;
  }

  &__checkbox {
    :deep(.el-checkbox__label) {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
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

  &__submit {
    width: 100%;
    height: 32px;
    margin-top: 0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
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
    margin-top: 8px;
  }
}

// Tablet
@media (width <= 1200px) {
  .ds-form {
    padding: 16px;
  }
}

// Mobile
@media (width <= 768px) {
  .ds-form {
    padding: 18px;

    &__welcome {
      font-size: 12px;
    }

    &__title {
      font-size: 16px;
    }

    &__header {
      margin-bottom: 12px;
    }

    &__input {
      :deep(.el-input__inner) {
        height: 38px;
      }
    }

    &__submit {
      height: 38px;
    }
  }
}
</style>
