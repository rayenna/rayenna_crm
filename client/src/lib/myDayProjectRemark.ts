import axiosInstance from '../utils/axios'

export function formatMyDayCompletionRemark(taskContent: string): string {
  const text = taskContent.trim()
  return `[My Day ✓] ${text}`
}

/** Append a project remark when a My Day task is marked complete. */
export async function postMyDayTaskCompletionRemark(
  projectId: string,
  taskContent: string,
): Promise<void> {
  await axiosInstance.post(`/api/remarks/project/${projectId}`, {
    remark: formatMyDayCompletionRemark(taskContent),
  })
}
