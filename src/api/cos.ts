/*
 * @Author: chan-max jackieontheway666@gmail.com
 * @Date: 2025-05-24 15:47:05
 * @LastEditors: chan-max jackieontheway666@gmail.com
 * @LastEditTime: 2025-11-20 07:30:07
 * @FilePath: /yishe-admin/src/api/cos.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { generateUUID } from '@/utils'
import { buildCOSKey, extractCOSFilename, extractCOSObjectKey } from '@/utils/cosPath'
import request from '@/config/axios'
import COS from 'cos-js-sdk-v5'
import CryptoJS from 'crypto-js'
import { saveAs } from 'file-saver'

let _cos = null

type BackendCOSConfig = {
  SecretId: string
  SecretKey: string
  Bucket: string
  Region: string
}

const COS_CONFIG_SECRET = '1s'

const decryptBackendCOSConfig = (encryptedConfig: unknown): BackendCOSConfig => {
  const encryptedText = String(encryptedConfig || '').trim()
  if (!encryptedText) {
    throw new Error('后端 COS 配置为空')
  }

  const decrypted = CryptoJS.AES.decrypt(encryptedText, COS_CONFIG_SECRET).toString(CryptoJS.enc.Utf8)
  if (!decrypted) {
    throw new Error('后端 COS 配置解密失败')
  }

  const config = JSON.parse(decrypted) as Partial<BackendCOSConfig>
  if (!config.SecretId || !config.SecretKey || !config.Bucket || !config.Region) {
    throw new Error('后端 COS 配置不完整')
  }

  return {
    SecretId: config.SecretId,
    SecretKey: config.SecretKey,
    Bucket: config.Bucket,
    Region: config.Region
  }
}

const fetchBackendCOSConfig = async () => {
  const encryptedConfig = await request.post<string>({
    url: '/getBasicConfig',
    data: {}
  })
  return decryptBackendCOSConfig(encryptedConfig)
}

// 初始化COS配置，只在项目启动时调用一次
export const initCOS = async () => {
  if (_cos) {
    return _cos
  }

  const cosConfig = await fetchBackendCOSConfig()

  _cos = new COS({
    SecretId: cosConfig.SecretId,
    SecretKey: cosConfig.SecretKey,
    Bucket: cosConfig.Bucket,
    Region: cosConfig.Region,
    Timeout: 45000
  } as any)

  return _cos
}

export const getCOS = () => {
  if (!_cos) {
    throw new Error('COS未初始化，请先调用initCOS()')
  }
  return _cos
}

/**
 * 上传成功后异步登记文件存储记录；登记失败不影响原有上传结果。
 */
const registerFileAssetBestEffort = (payload: Record<string, any>) => {
  void request.post({
    url: "/file-asset/register",
    data: { provider: "tencent-cos", sourceApp: "yishe-admin", ...payload },
  }).catch((error: any) => {
    console.warn("[file-asset] 登记失败，不影响 COS 上传", error?.message || error)
  })
}

/**
 * 上传文件到 COS
 * @param file 文件对象
 * @param key 文件在 COS 中的存储路径（可选，如果提供则直接使用）
 * @param category 文件分类（如 sticker, product, psd-template 等，应与实体名称一致）
 * @param account 用户账号（可选，默认从 userStore 获取）
 * @param userId 用户 ID（可选，默认从登录态获取）
 * @param entityId 实体ID（可选，如 PSD 模板 ID、字体模板 ID 等）
 * @param isThumbnail 是否为缩略图（可选）
 * @param onProgress 上传进度回调（可选）
 */
export async function uploadToCOS({
  file,
  key,
  category,
  account,
  userId,
  entityId,
  isThumbnail,
  bucket,
  region,
  onProgress
}: {
  file: File
  key?: string
  category?: string
  account?: string
  userId?: string | number
  entityId?: string | number
  isThumbnail?: boolean
  bucket?: string
  region?: string
  onProgress?: (progressData: any) => void
}) {
  console.log(`[COS上传] 开始: file.name=${file?.name}, file.size=${file?.size}, file.type=${file?.type}, category=${category}`);

  // 确保 COS 已初始化
  if (!_cos) {
    console.log("[COS上传] COS 未初始化，开始初始化...");
    try {
      await initCOS()
      console.log("[COS上传] COS 初始化成功");
    } catch (e: any) {
      console.error("[COS上传] COS 初始化失败:", e?.message || e);
      throw new Error('COS未初始化，无法上传文件')
    }
  }

  const cos = getCOS()

  // 验证文件对象
  if (!file) {
    throw new Error('文件对象不能为空')
  }

  if (typeof file !== 'object' || typeof (file as Blob).size !== 'number') {
    throw new Error('文件对象类型不正确')
  }

  // 如果没有提供 key，且提供了 category，则生成新格式的 key
  let finalKey = key
  if (!finalKey && category) {
    finalKey = buildCOSKey({
      filename: file.name || 'file',
      category,
      account,
      userId,
      entityId,
      isThumbnail,
    })
  } else if (!finalKey) {
    finalKey = buildCOSKey({
      filename: file.name || generateUUID(),
      category: 'uncategorized',
      account,
      userId,
    })
  }

  console.log(`[COS上传] 准备上传: key=${finalKey}, bucket=${bucket || cos.options.Bucket}, region=${region || cos.options.Region}`);

  try {
    const res = await cos.uploadFile({
      Key: String(finalKey),
      Body: file,
      Bucket: bucket || cos.options.Bucket,
      Region: region || cos.options.Region,
      onProgress: (progressData: any) => {
        console.log(`[COS上传] 进度:`, progressData);
        onProgress?.(progressData);
      }
    })
    const url = `https://${res.Location}`
    console.log(`[COS上传] 上传成功: url=${url}`);
    registerFileAssetBestEffort({
      bucket: bucket || cos.options.Bucket || "",
      region: region || cos.options.Region || "",
      objectKey: String(finalKey),
      url,
      fileName: file.name || "file",
      contentType: file.type || "",
      size: file.size,
      sourceModule: category || "uncategorized",
      category: category || "uncategorized",
      metadata: { uploadMode: "browser-direct" },
    })
    return { url, key: finalKey }
  } catch (e: any) {
    const errorMessage = e?.message || e?.toString() || '未知错误'
    console.error(`[COS上传] 上传失败: ${errorMessage}`, e);
    console.error(`[COS上传] 错误详情:`, JSON.stringify({
      statusCode: e?.statusCode,
      headers: e?.headers,
      error: e?.error,
      code: e?.code,
      name: e?.name,
    }));
    // 输出当前时间，排查签名过期问题
    console.error(`[COS上传] 当前设备时间:`, new Date().toISOString());
    throw new Error(`COS上传失败: ${errorMessage}`)
  }
}

export async function deleteCOSFile(key) {
  return new Promise((resolve, reject) => {
    const cos = getCOS()
    key = extractCOSObjectKey(String(key))
    cos.deleteObject(
      {
        Bucket: cos.options.Bucket,
        Region: cos.options.Region,
        Key: key
      },
      function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })
}

// 复制COS对象
export async function copyCOSObject(sourceUrl, targetKey = null) {
  return new Promise((resolve, reject) => {
    const cos = getCOS()

    const sourceKey = extractCOSObjectKey(sourceUrl)
    if (!targetKey) {
      targetKey = buildCOSKey({
        filename: extractCOSFilename(sourceKey) || generateUUID(),
        category: 'copied'
      })
    }

    cos.copyObject(
      {
        Bucket: cos.options.Bucket,
        Region: cos.options.Region,
        Key: targetKey,
        CopySource: `${cos.options.Bucket}.cos.${cos.options.Region}.myqcloud.com/${sourceKey}`
      },
      function (err, data) {
        if (err) {
          reject(err)
        } else {
          resolve({
            url: `https://${data.Location}`,
            key: targetKey
          })
        }
      }
    )
  })
}

export function downloadCOSFile(key) {
  const filename = extractCOSFilename(key)
  if (!filename) {
    return
  }
  return saveAs(key, filename)
}
