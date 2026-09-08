import { computed, ref } from "vue";

export type GlobalUploadTaskStatus = "running" | "success" | "error";

export interface GlobalUploadTask {
  id: string;
  name: string;
  status: GlobalUploadTaskStatus;
  stage: string;
  progress: number;
  startedAt: number;
  error?: string;
  source?: string;
  autoRemoveTimer?: ReturnType<typeof setTimeout>;
}

const tasks = ref<GlobalUploadTask[]>([]);

export const globalUploadTasks = tasks;

export const runningGlobalUploadTaskCount = computed(
  () => tasks.value.filter((task) => task.status === "running").length,
);

export const hasRunningGlobalUploadTasks = computed(
  () => runningGlobalUploadTaskCount.value > 0,
);

export const createGlobalUploadTask = (
  name: string,
  options: { source?: string; stage?: string; progress?: number } = {},
) => {
  const task: GlobalUploadTask = {
    id: `global-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "未命名文件").trim() || "未命名文件",
    status: "running",
    stage: options.stage || "等待上传",
    progress: Math.max(0, Math.min(100, Number(options.progress) || 0)),
    source: options.source,
    startedAt: Date.now(),
  };
  tasks.value = [task, ...tasks.value].slice(0, 10);
  return task;
};

export const updateGlobalUploadTask = (
  taskId: string,
  patch: Partial<Omit<GlobalUploadTask, "id" | "startedAt">>,
) => {
  tasks.value = tasks.value.map((task) => {
    if (task.id !== taskId) return task;

    const updatedTask = {
      ...task,
      ...patch,
      progress:
        patch.progress === undefined
          ? task.progress
          : Math.max(0, Math.min(100, Number(patch.progress) || 0)),
    };

    // 当任务完成时，设置3秒后自动移除
    if (patch.status === 'success' && task.status !== 'success') {
      // 清除可能存在的旧定时器
      if (task.autoRemoveTimer) {
        clearTimeout(task.autoRemoveTimer);
      }
      
      // 设置3秒后自动移除
      updatedTask.autoRemoveTimer = setTimeout(() => {
        tasks.value = tasks.value.filter((t) => t.id !== taskId);
      }, 3000);
    }

    return updatedTask;
  });
};

export const removeGlobalUploadTask = (taskId: string) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (task?.autoRemoveTimer) {
    clearTimeout(task.autoRemoveTimer);
  }
  tasks.value = tasks.value.filter((t) => t.id !== taskId);
};

export const clearFinishedGlobalUploadTasks = () => {
  tasks.value.forEach((task) => {
    if (task.autoRemoveTimer) {
      clearTimeout(task.autoRemoveTimer);
    }
  });
  tasks.value = tasks.value.filter((task) => task.status === "running");
};

export const getGlobalUploadTaskStatusText = (status: GlobalUploadTaskStatus) => {
  if (status === "success") return "完成";
  if (status === "error") return "失败";
  return "上传中";
};

export const getGlobalUploadTaskTagType = (status: GlobalUploadTaskStatus) => {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  return "primary";
};
