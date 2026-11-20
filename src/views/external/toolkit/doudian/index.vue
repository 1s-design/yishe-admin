<template>
  <ContentWrap :plain="true">
    <BrowserAutomationExecutionContextCard
      v-model="executionContext"
      class="doudian-ctx"
      title="执行环境"
      description=""
      platform="抖店"
      taskType="doudian"
    />

    <el-tabs v-model="mainTab" class="doudian-tabs" style="margin-top: 12px">
      <el-tab-pane label="会话管理" name="session">
        <PlatformSessionToolkitPage
          platform-key="doudian"
          platform-label="抖店"
          session-tool-key="doudian-session-acquire"
          check-login-tool-key="doudian-check-login"
          open-workspace-tool-key="doudian-open-workspace"
          empty-description="当前环境暂无抖店会话。"
        />
      </el-tab-pane>

      <el-tab-pane label="商机采集" name="chapter">
        <div v-if="!executionContext?.clientId" class="empty-hint">请先在上方选择客户端和环境</div>
        <ChapterPanel
          v-else
          :client-id="executionContext.clientId"
          :profile-id="executionContext.profileId"
        />
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElTabs, ElTabPane } from "element-plus";
import BrowserAutomationExecutionContextCard from "@/components/BrowserAutomationExecutionContextCard.vue";
import PlatformSessionToolkitPage from "../shared/PlatformSessionToolkitPage.vue";
import ChapterPanel from "./ChapterPanel.vue";

defineOptions({ name: "ToolkitDoudianPage" });

const mainTab = ref("chapter");
const executionContext = ref<Record<string, any>>({});
</script>

<style scoped>
.empty-hint { padding: 40px; text-align: center; color: #909399; }

/* 执行环境卡压缩：去掉说明/提示/执行标识/备注等占空间部分，只留客户端+环境两个选择器 */
.doudian-ctx {
  padding: 10px 14px;
}
.doudian-ctx :deep(.execution-context-card__header) {
  padding-bottom: 6px;
  margin-bottom: 6px;
}
.doudian-ctx :deep(.execution-context-card__description),
.doudian-ctx :deep(.execution-context-card__hint) {
  display: none;
}
.doudian-ctx :deep(.el-form > .el-row:nth-of-type(2)) {
  display: none;
}
.doudian-ctx :deep(.el-form > .el-form-item) {
  display: none;
}
.doudian-ctx :deep(.el-form-item) {
  margin-bottom: 6px;
}
.doudian-ctx :deep(.el-form-item__label) {
  font-size: 12px;
  line-height: 20px;
  padding-bottom: 0;
  margin-bottom: 2px;
}
</style>
