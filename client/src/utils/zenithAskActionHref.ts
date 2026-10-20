import type { NavigateFunction } from 'react-router-dom'
import {
  isPeAskHref,
  openProposalEngineForProject,
  peProjectIdFromHref,
} from '../lib/openProposalEngine'
import type { ZenithNlQueryActionSuccess } from '../types/zenithNlQuery'

/** Run an Ask action: PE opens in a new tab; other autoNavigate hrefs stay in CRM. */
export async function handleZenithAskAction(
  result: ZenithNlQueryActionSuccess,
  navigate: NavigateFunction,
): Promise<boolean> {
  if (isPeAskHref(result.href)) {
    await openProposalEngineForProject(peProjectIdFromHref(result.href))
    return true
  }
  if (result.autoNavigate && result.href) {
    navigate(result.href)
    return true
  }
  return false
}
