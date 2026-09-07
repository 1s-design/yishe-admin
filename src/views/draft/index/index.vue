<template>
  <div>
    <div class="pb-4 flex flex-wrap justify-start gap-4 items-center search-bar">
      <!-- 这里放所有搜索/过滤表单项和按钮，结构与crawler-material.vue一致，参数不变 -->
      <!-- 示例：
      <form-item label="按名称搜索">
        <el-input v-model="queryParams.imageName" placeholder="请输入图片名称" style="width: 160px" clearable @change="(val) => { if (!val) getList() }" />
      </form-item>
      <el-button type="primary" :icon="Search" @click="getList"> 搜索 </el-button>
      ...其它表单项和按钮... 
      -->
      <el-input 
        v-model="queryParams.search" 
        placeholder="搜索草稿名称" 
        style="width: 200px" 
        clearable 
        @change="handleSearch"
      />
      <el-select 
        v-model="queryParams.suffix" 
        placeholder="文件类型" 
        style="width: 120px" 
        clearable
        @change="handleSearch"
      >
        <el-option label="全部" value="" />
        <el-option label="图片" value="image" />
        <el-option label="视频" value="video" />
        <el-option label="PNG" value="png" />
        <el-option label="JPG" value="jpg" />
        <el-option label="WEBM" value="webm" />
        <el-option label="MP4" value="mp4" />
      </el-select>
      <el-button type="primary" :icon="Search" :loading="loading" @click="handleSearch">搜索</el-button>
      <el-button :icon="Refresh" :disabled="loading" @click="resetQuery">重置</el-button>
      <el-button
        type="danger"
        :icon="Delete"
        @click="handleDelete(null)"
        :disabled="!ids.length || loading"
      >
        批量删除
      </el-button>
    </div>



    <!-- 表格展示 -->
    <div class="common-table">
      <vxe-grid
        v-bind="gridOptions"
        :data="dataSource"
        :loading="loading"
        @checkbox-change="checkboxChange"
        @checkbox-all="checkboxAllChange"
        ref="gridRef"
      >
        <template #previewDefaultSlot="{ row }">
          <!-- 视频预览 -->
          <div 
            v-if="row.suffix && ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(row.suffix.toLowerCase())"
            class="video-preview-container"
            @click="handleVideoPlay(row)"
          >
            <video 
              :src="row.url" 
              class="w-20 h-20 rounded cursor-pointer object-cover"
              preload="metadata"
              muted
            />
            <div class="video-overlay">
              <el-icon class="play-icon"><VideoPlay /></el-icon>
            </div>
          </div>
          <!-- 图片预览 -->
          <el-image 
            v-else
            :src="row.url" 
            fit="cover" 
            class="w-20 h-20 rounded cursor-pointer"
            :preview-src-list="[row.url]"
          />
        </template>

        <template #suffixDefaultSlot="{ row }">
          <el-tag 
            v-if="row.suffix" 
            size="small" 
            type="info"
            class="suffix-tag"
          >
            {{ row.suffix.toUpperCase() }}
          </el-tag>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #operationDefaultSlot="{ row }">
          <div class="flex justify-end">
            <el-dropdown
              class="operation-dropdown"
              placement="bottom-end"
              @command="(command) => handleOperationCommand(command, row)"
            >
              <el-button type="primary" link size="small" class="operation-trigger-button">操作</el-button>
              <template #dropdown>
                <el-dropdown-menu class="operation-menu-compact">
                  <el-dropdown-item command="download">下载</el-dropdown-item>
                  <el-dropdown-item command="delete" divided class="operation-menu-item--danger">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>

        <template #modelRelationSlot="{ row }">
          <div class="model-relation-detail">
            <div v-if="row.customModelId" class="model-info">
              <div class="model-name" @click="handleShowModelInfo(row)">
                <el-icon class="mr-1 text-green-500"><Link /></el-icon>
                <span class="text-green-600 font-medium">{{ row.customModel?.name || row.customModelId }}</span>
              </div>
            </div>
            <div v-else class="no-model">
              <el-tag type="info" size="small">
                <el-icon class="mr-1"><Link /></el-icon>
                未关联模型
              </el-tag>
            </div>
          </div>
        </template>
      </vxe-grid>
    </div>

    <!-- 分页 -->
    <div class="py-4 flex justify-end">
      <pagination
        :total="total"
        v-model:page="queryParams.currentPage"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </div>
  </div>

  <el-dialog v-model="showModelDialog" title="设计模型信息" width="900px" :align-center="true">
    <div v-if="modelInfo" style="display: flex; flex-direction: row; align-items: center; justify-content: center; min-height: 260px;">
      <el-image
        v-if="modelInfo.thumbnail || modelInfo.cover"
        :src="modelInfo.thumbnail || modelInfo.cover"
        style="width: 260px; height: 260px; margin-right: 48px; border-radius: 8px; object-fit: cover;"
        fit="cover"
      />
      <el-form label-width="120px" style="flex: 1;">
        <el-form-item label="模型名称">
          <span>{{ modelInfo.name }}</span>
        </el-form-item>
        <el-form-item label="模型ID">
          <span>{{ modelInfo.id }}</span>
        </el-form-item>
        <el-form-item label="描述">
          <span>{{ modelInfo.description }}</span>
        </el-form-item>
        <el-form-item label="创建时间">
          <span>{{ modelInfo.createTime ? modelInfo.createTime : '无' }}</span>
        </el-form-item>
        <!-- 可根据实际字段补充 -->
      </el-form>
    </div>
    <!-- 移除footer关闭按钮 -->
  </el-dialog>
</template>

<script setup lang="tsx">
import { ref, reactive, watchEffect, computed } from 'vue'
import { buildOperationColumn, commonGridOptions } from '@/common/table'
import { formatTimestamp } from '@/common/date'
import { useWindowSize } from '@vueuse/core'
import { defaultSortingValue } from '@/common/sort'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Delete,
  Download,
  Refresh,
  Link,
  VideoPlay
} from '@element-plus/icons-vue'
import { downloadFileByElement } from '@/common/download'
import { 
  getDraftList, 
  deleteDraft
} from '@/api/draft'
import Pagination from '@/components/Pagination/index.vue'
import { getCustomModelById } from '@/api/customModel'

// 查询条件
const queryParams = reactive({
  currentPage: 1,
  pageSize: 20,
  sortingFields: defaultSortingValue(),
  imageName: '',
  search: '',
  hasModel: '', // 关联状态筛选
  suffix: '', // 文件类型筛选
})

const gridRef = ref()
const { height } = useWindowSize()

const gridOptions = ref({
  ...commonGridOptions,
  maxHeight: Math.max(height.value - 280, 360),
  rowConfig: {
    keyField: 'id'
  },
  checkboxConfig: {
    reserve: true
  },
  columns: [
    { type: 'checkbox', width: 50, ellipsis: true, reserve: true },
    {
      title: '图片预览',
      field: 'url',
      width: 120,
      slots: {
        default: 'previewDefaultSlot'
      }
    },
    { title: '草稿名称', field: 'name', minWidth: 180, className: 'font-bold' },
    { 
      title: '文件后缀', 
      field: 'suffix', 
      width: 100, 
      className: 'text-center',
      slots: {
        default: 'suffixDefaultSlot'
      }
    },
    {
      title: '关联模型',
      field: 'customModelId',
      width: 220,
      slots: {
        default: 'modelRelationSlot'
      }
    },
    {
      title: '创建时间',
      field: 'createTime',
      width: 150,
      showOverflow: true,
      formatter: (e) => {
        return formatTimestamp(e.cellValue)
      },
    },
    {
      title: '修改时间',
      field: 'updateTime',
      width: 150,
      showOverflow: true,
      formatter: (e) => {
        return formatTimestamp(e.cellValue)
      },
    },
    buildOperationColumn('operationDefaultSlot')
  ]
})

watchEffect(() => {
  gridOptions.value.maxHeight = Math.max(height.value - 280, 360);
})

const dataSource = ref([])
const loading = ref(false)
const ids = ref([])
const total = ref(0)

const showModelDialog = ref(false)
const modelInfo = ref<any>(null)

function handleShowModelInfo(row) {
  const id = row.customModelId
  if (!id) return
  getCustomModelById(id).then(res => {
    modelInfo.value = res
    showModelDialog.value = true
  })
}


// 获取列表
async function getList() {
  loading.value = true
  try {
    let res = await getDraftList({
      ...queryParams
    })
    dataSource.value = res.list || []
    total.value = res.total || 0
    ids.value = []
  } catch (error) {
    ElMessage.error('获取列表失败')
    dataSource.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 复选框变化
function checkboxChange(e) {
  ids.value = e.records.map((item) => item.id)
}

function checkboxAllChange(e) {
  ids.value = e.records.map((item) => item.id)
}

// 搜索
const handleSearch = () => {
  queryParams.currentPage = 1
  getList()
}

// 重置查询
const resetQuery = () => {
  queryParams.currentPage = 1
  queryParams.pageSize = 20
  queryParams.imageName = ''
  queryParams.search = ''
  queryParams.hasModel = ''
  queryParams.suffix = ''
  queryParams.sortingFields = defaultSortingValue()
  getList()
}

// 删除草稿
function handleDelete(row?) {
  let delIds: string[] = []
  if (row) {
    delIds = [row.id]
  } else if (!ids.value.length) {
    return ElMessage.warning('请选择要删除的数据')
  } else {
    delIds = [...ids.value]
  }

  ElMessageBox.confirm(`确认删除选中的${delIds.length}条数据吗`, '删除提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'error',
  })
    .then(async () => {
      try {
        await deleteDraft(delIds)
        ElMessage.success('删除成功')
        getList()
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// 下载草稿
function handleDownload(row) {
  downloadFileByElement(row.url, row.name)
}

function handleOperationCommand(command, row) {
  switch (command) {
    case 'download':
      handleDownload(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 播放视频
function handleVideoPlay(row) {
  // 在当前页面显示视频
  ElMessageBox.alert(
    `<div style="text-align: center; padding: 20px;">
      <video 
        src="${row.url}" 
        controls 
        style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);"
        autoplay
        preload="metadata"
      ></video>
    </div>`,
    `播放视频 - ${row.name}`,
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'video-dialog',
      center: true,
      showClose: true,
      customStyle: {
        width: '900px',
        maxWidth: '90vw'
      }
    }
  )
}

// 批量下载
function handleMultiDownload() {
  if (!ids.value.length) {
    return ElMessage.warning('请选择要下载的数据')
  }
  
  try {
    ids.value.forEach((id, index) => {
      let row = dataSource.value.find((item) => item.id === id)
      if (!row) return
      
      setTimeout(() => {
        downloadFileByElement(row.url, row.name)
      }, 500 * index)
    })
  } catch (e) {
    ElMessage.error('下载失败')
  }
}



// 初始化
getList()
</script>

<style lang="less">
.model-relation-detail {
  .model-info {
    .model-name {
      display: flex;
      align-items: center;
      font-size: 14px;
      line-height: 1.2;
    }
    
    .model-desc {
      line-height: 1.2;
      word-break: break-all;
    }
  }
  
  .no-model {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 后缀字段样式
.suffix-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
}

// 视频预览样式
.video-preview-container {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05);
    
    .video-overlay {
      opacity: 1;
    }
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;

    .play-icon {
      font-size: 28px;
      color: #fff;
    }
  }
}

// 视频对话框样式
.video-dialog {
  .el-message-box__content {
    padding: 30px;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .el-message-box__message {
    margin: 0;
  }
  
  video {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-height: 70vh;
    object-fit: contain;
  }
}
</style> 
