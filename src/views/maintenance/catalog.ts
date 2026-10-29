/**
 * 系统维护模块的声明式清单。
 *
 * 页面只负责渲染，新增统计区块或配置分组时改这里即可；
 * 接入真实数据源后，把 metrics / 分组替换为具体 schema。
 */

export interface MaintenanceSection {
  key: string;
  title: string;
  description: string;
  metrics: string[];
}

export const MAINTENANCE_SECTIONS: MaintenanceSection[] = [
  {
    key: "runtime",
    title: "运行状态",
    description: "服务进程、运行时长与资源占用",
    metrics: ["运行时长", "内存占用"],
  },
  {
    key: "storage",
    title: "存储与缓存",
    description: "磁盘、对象存储与缓存文件占用",
    metrics: ["磁盘占用", "缓存文件"],
  },
  {
    key: "traffic",
    title: "接口流量",
    description: "接口调用量、耗时与错误率",
    metrics: ["今日调用", "错误率"],
  },
  {
    key: "security",
    title: "访问安全",
    description: "登录失败、密钥与异常访问",
    metrics: ["登录失败", "异常访问"],
  },
];

export interface MaintenanceConfigGroup {
  key: string;
  title: string;
  description: string;
}

export const MAINTENANCE_CONFIG_GROUPS: MaintenanceConfigGroup[] = [
  {
    key: "basic",
    title: "基础配置",
    description: "站点名称、默认语言与时区",
  },
  {
    key: "storage",
    title: "存储与上传",
    description: "文件限额、允许格式与存储策略",
  },
  {
    key: "integration",
    title: "外部服务",
    description: "AI、对象存储等第三方服务参数",
  },
  {
    key: "security",
    title: "安全策略",
    description: "会话时长与登录限制",
  },
];
