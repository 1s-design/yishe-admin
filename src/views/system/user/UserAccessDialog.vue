<template>
  <el-dialog
    v-model="dialogVisible"
    title="分配权限"
    width="1080px"
    top="6vh"
    destroy-on-close
    class="access-dialog-modal"
    @open="handleOpen"
  >
    <el-skeleton :loading="loading" animated>
      <template #default>
        <div class="access-dialog">
          <div class="access-dialog__section access-dialog__section--ai">
            <div class="access-dialog__title">共享 AI 使用权限</div>
            <div class="access-dialog__desc">
              {{
                targetUserIsAdmin
                  ? "管理员默认可使用公开 AI Key，无需额外开通。"
                  : "控制该用户是否可以选择管理员公开的 AI Key。"
              }}
            </div>
            <div class="access-dialog__ai-row">
              <el-switch
                v-model="form.aiAccessEnabled"
                :disabled="loading || submitLoading || targetUserIsAdmin"
              />
              <span class="access-dialog__ai-text">
                {{
                  targetUserIsAdmin
                    ? "管理员默认可使用公开 AI Key"
                    : form.aiAccessEnabled
                      ? "允许使用管理员公开的 AI Key"
                      : "仅可使用自己配置的 Key"
                }}
              </span>
            </div>
          </div>

          <div class="access-dialog__section">
            <div class="access-dialog__heading">
              <div>
                <div class="access-dialog__title">菜单权限</div>
                <div class="access-dialog__desc">
                  {{
                    targetUserIsAdmin
                      ? "管理员默认拥有全部菜单权限，这里展示当前生效范围。"
                      : "此处勾选为「个人权限」；带「角色」标记的菜单由所选角色授予，取消角色才会失效。"
                  }}
                </div>
              </div>
            </div>

            <div class="access-dialog__toolbar">
              <el-input
                v-model="keyword"
                placeholder="搜索菜单名称或菜单 key"
                clearable
                class="access-dialog__search"
              />
              <el-switch v-model="onlySelected" active-text="只看已选" />
              <el-button
                link
                type="primary"
                :disabled="loading || submitLoading || !visibleSelectableKeys.length"
                @click="handleSelectAll"
              >
                全选
              </el-button>
              <el-button
                link
                type="primary"
                :disabled="loading || submitLoading || !visibleSelectableKeys.length"
                @click="handleInvertSelection"
              >
                反选
              </el-button>
            </div>

            <div class="access-dialog__summary">
              <span
                >个人勾选 <b>{{ personalCount }}</b> 项</span
              >
              <span class="access-dialog__summary-dot">·</span>
              <span
                >角色授予 <b>{{ roleGrantedCount }}</b> 项</span
              >
              <span class="access-dialog__summary-dot">·</span>
              <span
                >生效合计 <b>{{ effectiveCount }}</b> 项</span
              >
            </div>

            <div v-if="filteredGroups.length" class="access-dialog__groups">
              <div
                v-for="group in filteredGroups"
                :key="group.label"
                class="access-dialog__group"
              >
                <div class="access-dialog__group-title">
                  <span>{{ t(group.label) }}</span>
                  <span class="access-dialog__group-count">
                    {{ countCheckedInGroup(group) }}/{{ group.options.length }}
                  </span>
                </div>
                <el-checkbox-group v-model="form.menuKeys" class="access-dialog__checkboxes">
                  <el-checkbox
                    v-for="option in group.options"
                    :key="option.key"
                    :label="option.key"
                    :disabled="isOptionDisabled(option)"
                    border
                  >
                    {{ t(option.label) }}<span v-if="option.adminOnly">（仅管理员）</span>
                    <span v-if="roleGrantedKeys.has(option.key)" class="access-dialog__granted">
                      角色
                    </span>
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </div>
            <el-empty
              v-else
              :image-size="56"
              :description="onlySelected ? '该用户还没有任何已选或角色授予的菜单' : '没有匹配的菜单'"
            />
          </div>

          <div class="access-dialog__section access-dialog__section--roles">
            <div class="access-dialog__title">角色</div>
            <div class="access-dialog__desc">
              用户生效权限 = 所有角色权限 ∪ 上方单独勾选的个人权限。
            </div>
            <div v-loading="roleLoading" class="access-dialog__roles">
              <el-checkbox-group v-model="form.roleKeys" class="access-dialog__role-checkboxes">
                <el-checkbox
                  v-for="role in roles"
                  :key="role.roleKey"
                  :label="role.roleKey"
                  size="small"
                >
                  {{ role.roleName }}
                  <span class="access-dialog__role-keys">
                    @{{ role.roleKey }} · {{ Array.isArray(role.menuKeys) ? role.menuKeys.length : 0 }} 项
                  </span>
                </el-checkbox>
              </el-checkbox-group>
              <el-empty
                v-if="!roleLoading && !roles.length"
                :image-size="48"
                description="暂无可分配角色，请先在「角色管理」中创建"
              />
            </div>
          </div>
        </div>
      </template>
    </el-skeleton>

    <template #footer>
      <div class="access-dialog__footer">
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "@/hooks/web/useI18n";
import { getAllRoles, type RoleItem } from "@/api/role";
import {
  getUserAccessSetting,
  updateUserAccessSetting,
  type UserAccessControlSetting,
} from "@/api/user";
import type { MenuAccessGroup, MenuAccessOption } from "@/constants/access-control";
import {
  MENU_ACCESS_GROUPS,
  MENU_ACCESS_OPTIONS,
  normalizeMenuAccessKeys,
} from "@/router/menu-access-options";

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  userId: string;
  userName?: string;
  userIsAdmin?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const loading = ref(false);
const submitLoading = ref(false);
const roleLoading = ref(false);
const roles = ref<RoleItem[]>([]);
const keyword = ref("");
const onlySelected = ref(false);
const form = reactive<UserAccessControlSetting>({
  menuKeys: [],
  roleKeys: [],
  aiAccessEnabled: false,
});

const allMenuOptions = MENU_ACCESS_OPTIONS;
const targetUserIsAdmin = computed(() => !!props.userIsAdmin);
const selectableMenuKeys = computed(() =>
  allMenuOptions
    .filter((option) => targetUserIsAdmin.value || !option.adminOnly)
    .map((option) => option.key),
);
const selectableMenuKeySet = computed(() => new Set(selectableMenuKeys.value));

/** 当前选中角色授予的菜单 key，用于在列表里打「角色」标记 */
const roleGrantedKeys = computed(() => {
  const activeRoles = new Set(form.roleKeys);
  const granted = new Set<string>();
  for (const role of roles.value) {
    if (!activeRoles.has(role.roleKey)) {
      continue;
    }
    // 角色里可能存的是旧版兼容 key，先归一化再比对，标记才对得上勾选框
    for (const key of normalizeMenuAccessKeys(role.menuKeys || [], selectableMenuKeySet.value)) {
      granted.add(key);
    }
  }
  return granted;
});

const effectiveKeys = computed(() => {
  const merged = new Set(form.menuKeys);
  roleGrantedKeys.value.forEach((key) => merged.add(key));
  return merged;
});

const personalCount = computed(
  () => form.menuKeys.filter((key) => selectableMenuKeySet.value.has(key)).length,
);
const roleGrantedCount = computed(
  () => [...roleGrantedKeys.value].filter((key) => selectableMenuKeySet.value.has(key)).length,
);
const effectiveCount = computed(() => effectiveKeys.value.size);

const keywordText = computed(() => keyword.value.trim().toLowerCase());

const filteredGroups = computed<MenuAccessGroup[]>(() => {
  const text = keywordText.value;
  return MENU_ACCESS_GROUPS.map((group) => {
    const options = group.options.filter((option) => {
      if (onlySelected.value && !effectiveKeys.value.has(option.key)) {
        return false;
      }
      if (!text) {
        return true;
      }
      const label = String(t(option.label) || "").toLowerCase();
      return label.includes(text) || option.key.toLowerCase().includes(text);
    });
    return { ...group, options };
  }).filter((group) => group.options.length > 0);
});

const visibleSelectableKeys = computed(() =>
  filteredGroups.value.flatMap((group) =>
    group.options.filter((option) => !isOptionDisabled(option)).map((option) => option.key),
  ),
);

function countCheckedInGroup(group: MenuAccessGroup) {
  const selected = new Set(form.menuKeys);
  return group.options.filter((option) => selected.has(option.key)).length;
}

function sanitizeMenuKeys(menuKeys: string[]) {
  return normalizeMenuAccessKeys(menuKeys, selectableMenuKeySet.value);
}

function isOptionDisabled(option: MenuAccessOption) {
  return !!option.adminOnly && !targetUserIsAdmin.value;
}

function resetForm() {
  form.menuKeys = [];
  form.roleKeys = [];
  form.aiAccessEnabled = false;
  keyword.value = "";
  onlySelected.value = false;
}

function handleSelectAll() {
  const selected = new Set(form.menuKeys);
  visibleSelectableKeys.value.forEach((key) => selected.add(key));
  form.menuKeys = [...selected];
}

function handleInvertSelection() {
  const selected = new Set(form.menuKeys);
  visibleSelectableKeys.value.forEach((key) => {
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
  });
  form.menuKeys = [...selected];
}

async function handleOpen() {
  if (!props.userId) {
    return;
  }

  loading.value = true;
  roleLoading.value = true;
  resetForm();

  try {
    const accessControl = await getUserAccessSetting({ userId: props.userId });
    form.menuKeys = targetUserIsAdmin.value
      ? [...selectableMenuKeys.value]
      : sanitizeMenuKeys(Array.isArray(accessControl?.menuKeys) ? accessControl.menuKeys : []);
    form.roleKeys = Array.isArray(accessControl?.roleKeys)
      ? [...accessControl.roleKeys]
      : [];
    form.aiAccessEnabled = targetUserIsAdmin.value
      ? true
      : !!accessControl?.aiAccessEnabled;
  } catch (error) {
    ElMessage.error("加载权限配置失败");
  } finally {
    loading.value = false;
  }

  try {
    roles.value = (await getAllRoles()) || [];
  } catch (error) {
    ElMessage.error("加载角色列表失败");
    roles.value = [];
  } finally {
    roleLoading.value = false;
  }
}

async function handleSubmit() {
  if (!props.userId) {
    return;
  }

  submitLoading.value = true;
  try {
    const menuKeys = targetUserIsAdmin.value
      ? [...selectableMenuKeys.value]
      : sanitizeMenuKeys(form.menuKeys);
    const roleKeys = [...form.roleKeys];
    const aiAccessEnabled = targetUserIsAdmin.value ? true : !!form.aiAccessEnabled;
    const result = await updateUserAccessSetting({
      userId: props.userId,
      accessControl: {
        menuKeys,
        roleKeys,
        aiAccessEnabled,
      },
    });
    form.menuKeys = result?.menuKeys ?? menuKeys;
    form.roleKeys = result?.roleKeys ?? roleKeys;
    form.aiAccessEnabled = result?.aiAccessEnabled ?? aiAccessEnabled;
    ElMessage.success("权限配置已保存");
    emit("success");
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error("保存权限配置失败");
  } finally {
    submitLoading.value = false;
  }
}
</script>

<style scoped>
.access-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(88vh - 150px);
  padding-right: 6px;
  overflow-y: auto;
}

.access-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.access-dialog__section--ai {
  padding: 14px;
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
}

.access-dialog__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.access-dialog__title {
  font-size: 15px;
  font-weight: 600;
}

.access-dialog__desc {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.access-dialog__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.access-dialog__search {
  width: 260px;
}

.access-dialog__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.access-dialog__summary b {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.access-dialog__summary-dot {
  color: var(--el-text-color-placeholder);
}

.access-dialog__groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.access-dialog__ai-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.access-dialog__roles {
  min-height: 40px;
}

.access-dialog__role-keys {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.access-dialog__ai-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.access-dialog__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.access-dialog__group-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.access-dialog__group-count {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.access-dialog__checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.access-dialog__checkboxes :deep(.el-checkbox) {
  margin-right: 0;
}

.access-dialog__granted {
  margin-left: 4px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 15px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 3px;
}

.access-dialog__section--roles {
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.access-dialog__section--roles .access-dialog__title {
  font-size: 14px;
}

.access-dialog__section--roles .access-dialog__desc {
  font-size: 12px;
}

.access-dialog__role-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.access-dialog__role-checkboxes .el-checkbox {
  margin-right: 0;
  --el-checkbox-font-size: 12px;
  --el-checkbox-height: 28px;
}

.access-dialog__footer {
  display: flex;
  justify-content: flex-end;
}

@media (width <= 1200px) {
  .access-dialog-modal {
    --el-dialog-width: 94vw !important;
  }
}

@media (width <= 768px) {
  .access-dialog__heading {
    flex-direction: column;
    align-items: stretch;
  }

  .access-dialog__toolbar {
    justify-content: flex-start;
  }

  .access-dialog__search {
    width: 100%;
  }

  .access-dialog__ai-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
