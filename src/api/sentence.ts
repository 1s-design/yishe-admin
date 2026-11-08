/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-06-04 23:00:38
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-07-09 07:40:14
 * @FilePath: /design-server/Users/jackie/workspace/yishe-admin/src/api/sentence.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from '@/config/axios'

export function getSentenceList(data) {
  return request.post({
    url: '/sentences/page',
    data,
  });
}

// 高级搜索：关键词 + 标签(含/排除) + 情感/风格/场景/语言 + 字数区间 + 时间 + 排序
export function searchSentences(data) {
  return request.post({
    url: '/sentences/search',
    data,
  });
}




export function createSentence(data) {
  return request.post({
    url: '/sentences',
    data,
  });
}

// 单条详情（列表用 fields=basic 极简返回，完整信息按需取这条）
export function getSentence(id: number | string) {
  return request.get({
    url: `/sentences/${id}`,
  });
}

export function updateSentence(id: string, data) {
  return request.post({
    url: `/sentences/${id}`,
    method: 'patch',
    data,
  });
}

export function deleteSentence(id: string) {
  return request.delete({
    url: `/sentences/${id}`,
  });
}

export function aiAnalyzeSentence(id: number, prompt?: string) {
  return request.post({
    url: '/sentences/ai-analyze',
    data: { id, prompt }
  });
}

export function batchMoveSentence(data: { ids: number[]; folderId: string | null }) {
  return request.post({
    url: '/sentences/batch-move',
    data,
  });
}

// 批量审核：reviewStatus 0-待审核 1-可用（「不要」的直接调删除接口）
export function batchReviewSentences(data: { ids: number[]; reviewStatus: number }) {
  return request.post({
    url: '/sentences/batch-review',
    data,
  });
}

export function shareSentenceToUser(data: { ids: (number | string)[]; targetUserId: number | string }) {
  return request.post({
    url: '/sentences/share-to-user',
    data,
  });
}

export function getSentenceSharedRecords(id: number | string) {
  return request.get({
    url: `/sentences/${id}/shared-records`,
  });
}

export function copySentenceToUser(data: { ids: (number | string)[]; targetUserId: number | string }) {
  return request.post({
    url: '/sentences/copy-to-user',
    data,
  });
}

export function moveSentenceToUser(data: { ids: (number | string)[]; targetUserId: number | string }) {
  return request.post({
    url: '/sentences/move-to-user',
    data,
  });
}