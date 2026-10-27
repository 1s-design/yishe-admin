import { Ref } from 'vue'

/**
 * 自注册入口开关。
 * false = 登录页不展示「注册账号」，注册表单也不会渲染（临时关闭，改回 true 即可恢复）。
 * 注意：只影响 admin 后台的注册入口；官网/客户端的公开注册不受此开关影响。
 */
export const SELF_REGISTER_ENABLED = false

export enum LoginStateEnum {
  LOGIN,
  REGISTER,
  RESET_PASSWORD,
  MOBILE,
  QR_CODE,
  SSO
}

const currentState = ref(LoginStateEnum.LOGIN)

export function useLoginState() {
  function setLoginState(state: LoginStateEnum) {
    // 自注册关闭时，任何切到注册态的请求都直接忽略
    if (state === LoginStateEnum.REGISTER && !SELF_REGISTER_ENABLED) {
      return
    }
    currentState.value = state
  }
  const getLoginState = computed(() => currentState.value)

  function handleBackLogin() {
    setLoginState(LoginStateEnum.LOGIN)
  }

  return {
    setLoginState,
    getLoginState,
    handleBackLogin
  }
}

export function useFormValid<T extends Object = any>(formRef: Ref<any>) {
  async function validForm() {
    const form = unref(formRef)
    if (!form) return
    const data = await form.validate()
    return data as T
  }

  return {
    validForm
  }
}
