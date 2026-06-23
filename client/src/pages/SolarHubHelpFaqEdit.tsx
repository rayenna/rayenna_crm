import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type {
  HubHelpArticleListResponse,
  HubHelpCategoriesResponse,
  HubHelpFaqAdmin,
} from '../types/solarHubHelp'

export default function SolarHubHelpFaqEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])

  const [category, setCategory] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [articleId, setArticleId] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [sortOrder, setSortOrder] = useState(0)

  const categoriesQuery = useQuery({
    queryKey: ['solar-hub-help-categories'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/help/categories')
      return res.data as HubHelpCategoriesResponse
    },
  })

  const articlesQuery = useQuery({
    queryKey: ['solar-hub-help-articles'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/help/articles')
      return res.data as HubHelpArticleListResponse
    },
  })

  const faqQuery = useQuery({
    queryKey: ['solar-hub-help-faq', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/solar-hub/help/faqs/${id}`)
      return res.data as HubHelpFaqAdmin
    },
  })

  useEffect(() => {
    const faq = faqQuery.data
    if (!faq) return
    setCategory(faq.category)
    setQuestion(faq.question)
    setAnswer(faq.answer)
    setArticleId(faq.articleId ?? '')
    setIsPublished(faq.isPublished)
    setIsFeatured(faq.isFeatured)
    setSortOrder(faq.sortOrder)
  }, [faqQuery.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      axiosInstance.patch(`/api/admin/solar-hub/help/faqs/${id}`, {
        category,
        question: question.trim(),
        answer,
        articleId: articleId || null,
        isPublished,
        isFeatured,
        sortOrder,
      }),
    onSuccess: () => {
      toast.success('FAQ saved')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-faqs'] })
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-faq', id] })
      navigate('/solar-hub/help')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const categories = categoriesQuery.data?.categories ?? []
  const articles = articlesQuery.data?.items ?? []
  const loading = faqQuery.isLoading || categoriesQuery.isLoading

  return (
    <div className="max-w-3xl">
      <Link
        to="/solar-hub/help"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent-gold)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help Content
      </Link>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--accent-gold)] border-t-transparent" />
        </div>
      ) : faqQuery.isError || !faqQuery.data ? (
        <p className="text-sm text-[color:var(--accent-red)]">FAQ not found.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!canManage) return
            saveMutation.mutate()
          }}
          className="space-y-4"
        >
          <header>
            <h2 className="zenith-display text-xl font-bold text-[color:var(--text-primary)]">
              {canManage ? 'Edit FAQ' : 'View FAQ'}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">ID: {id}</p>
          </header>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Question
            </span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!canManage}
              required
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
              Answer
            </span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!canManage}
              rows={8}
              required
              className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm leading-relaxed disabled:opacity-70"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!canManage}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Linked guide (optional)
              </span>
              <select
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                disabled={!canManage}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              >
                <option value="">None</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Sort order
              </span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                disabled={!canManage}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={!canManage}
              />
              <span className="text-sm text-[color:var(--text-primary)]">Published</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                disabled={!canManage}
              />
              <span className="text-sm text-[color:var(--text-primary)]">
                Featured (Support quick topics)
              </span>
            </label>
          </div>

          {canManage ? (
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save FAQ'}
            </button>
          ) : null}
        </form>
      )}
    </div>
  )
}
