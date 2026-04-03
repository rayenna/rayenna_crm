import axiosInstance, { isTimeoutOrNetworkError } from './axios'
import { enqueueAction, type SyncActionType } from './syncQueue'

export type SafeMutationResult = { queued: false } | { queued: true }

export async function safePutProject(
  projectId: string,
  body: Record<string, unknown>,
  actionType: SyncActionType,
): Promise<SafeMutationResult> {
  const endpoint = `/api/projects/${projectId}`
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueAction({ type: actionType, projectId, payload: body, endpoint, method: 'PUT' })
    return { queued: true }
  }
  try {
    await axiosInstance.put(endpoint, body)
    return { queued: false }
  } catch (e: unknown) {
    if (isTimeoutOrNetworkError(e)) {
      await enqueueAction({ type: actionType, projectId, payload: body, endpoint, method: 'PUT' })
      return { queued: true }
    }
    throw e
  }
}

export async function safePostProjectRemark(projectId: string, remark: string): Promise<SafeMutationResult> {
  const endpoint = `/api/remarks/project/${projectId}`
  const payload = { remark }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueueAction({ type: 'LOG_NOTE', projectId, payload, endpoint, method: 'POST' })
    return { queued: true }
  }
  try {
    await axiosInstance.post(endpoint, payload)
    return { queued: false }
  } catch (e: unknown) {
    if (isTimeoutOrNetworkError(e)) {
      await enqueueAction({ type: 'LOG_NOTE', projectId, payload, endpoint, method: 'POST' })
      return { queued: true }
    }
    throw e
  }
}
