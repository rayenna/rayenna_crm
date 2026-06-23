import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { BookOpen, FileQuestion, RefreshCw } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type {
  HubHelpArticleListResponse,
  HubHelpFaqListResponse,
} from '../types/solarHubHelp'
import { solarHubTableScrollShell } from '../components/solarHub/tableScrollShell'

export default function SolarHubHelp() {
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])
  const isAdmin = hasRole([UserRole.ADMIN])

  const articlesQuery = useQuery({
    queryKey: ['solar-hub-help-articles'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/help/articles')
      return res.data as HubHelpArticleListResponse
    },
  })

  const faqsQuery = useQuery({
    queryKey: ['solar-hub-help-faqs'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/help/faqs')
      return res.data as HubHelpFaqListResponse
    },
  })

  const reimportMutation = useMutation({
    mutationFn: () => axiosInstance.post('/api/admin/solar-hub/help/reimport'),
    onSuccess: () => {
      toast.success('Help content reimported from repo defaults')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-articles'] })
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-faqs'] })
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const loading = articlesQuery.isLoading || faqsQuery.isLoading
  const articles = articlesQuery.data?.items ?? []
  const faqs = faqsQuery.data?.items ?? []

  const publishedArticleCount = useMemo(
    () => articles.filter((a) => a.isPublished).length,
    [articles],
  )

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--text-muted)]">
          Edit Solar Hub Help Center guides and FAQs. Homeowners see published content only.
        </p>
        {isAdmin ? (
          <button
            type="button"
            disabled={reimportMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  'Reimport all help content from repo defaults? This overwrites article markdown and FAQ text with shipped defaults.',
                )
              ) {
                reimportMutation.mutate()
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-card)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            {reimportMutation.isPending ? 'Reimporting…' : 'Reimport defaults'}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[color:var(--accent-teal)]" />
              <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
                Guides ({publishedArticleCount}/{articles.length} published)
              </h2>
            </div>
            <div className={solarHubTableScrollShell}>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-[color:var(--bg-card-hover)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[color:var(--text-primary)]">{article.title}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">{article.subtitle}</p>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {article.categoryLabel}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            article.isPublished
                              ? 'bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]'
                              : 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'
                          }`}
                        >
                          {article.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--text-muted)]">
                        {new Date(article.updatedAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <Link
                            to={`/solar-hub/help/articles/${article.id}`}
                            className="text-sm font-semibold text-[color:var(--accent-gold)] hover:underline"
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            to={`/solar-hub/help/articles/${article.id}`}
                            className="text-sm font-semibold text-[color:var(--text-muted)] hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-[color:var(--accent-gold)]" />
              <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
                FAQs ({faqs.length})
              </h2>
            </div>
            <div className={solarHubTableScrollShell}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[color:var(--border-default)] bg-[color:var(--bg-badge)] text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Question</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Featured</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border-default)]">
                  {faqs.map((faq) => (
                    <tr key={faq.id} className="hover:bg-[color:var(--bg-card-hover)]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[color:var(--text-primary)]">{faq.question}</p>
                        {faq.articleId ? (
                          <p className="text-xs text-[color:var(--text-muted)]">
                            Guide: {faq.articleId}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {faq.categoryLabel}
                      </td>
                      <td className="px-4 py-3">
                        {faq.isFeatured ? (
                          <span className="text-xs font-semibold text-[color:var(--accent-gold)]">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-[color:var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            faq.isPublished
                              ? 'bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green)]'
                              : 'bg-[color:var(--bg-muted)] text-[color:var(--text-muted)]'
                          }`}
                        >
                          {faq.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <Link
                            to={`/solar-hub/help/faqs/${faq.id}`}
                            className="text-sm font-semibold text-[color:var(--accent-gold)] hover:underline"
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            to={`/solar-hub/help/faqs/${faq.id}`}
                            className="text-sm font-semibold text-[color:var(--text-muted)] hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
