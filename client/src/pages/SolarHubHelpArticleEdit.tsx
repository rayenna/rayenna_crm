import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft } from 'lucide-react'
import axiosInstance, { getFriendlyApiErrorMessage } from '../utils/axios'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import type {
  HubHelpArticleAdmin,
  HubHelpCategoriesResponse,
} from '../types/solarHubHelp'

export default function SolarHubHelpArticleEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasRole } = useAuth()
  const canManage = hasRole([UserRole.ADMIN, UserRole.OPERATIONS])

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [category, setCategory] = useState('')
  const [readMinutes, setReadMinutes] = useState(5)
  const [markdown, setMarkdown] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [sortOrder, setSortOrder] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['solar-hub-help-categories'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/solar-hub/help/categories')
      return res.data as HubHelpCategoriesResponse
    },
  })

  const articleQuery = useQuery({
    queryKey: ['solar-hub-help-article', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await axiosInstance.get(`/api/admin/solar-hub/help/articles/${id}`)
      return res.data as HubHelpArticleAdmin
    },
  })

  useEffect(() => {
    const article = articleQuery.data
    if (!article) return
    setTitle(article.title)
    setSubtitle(article.subtitle)
    setCategory(article.category)
    setReadMinutes(article.readMinutes)
    setMarkdown(article.markdown)
    setIsPublished(article.isPublished)
    setSortOrder(article.sortOrder)
  }, [articleQuery.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      axiosInstance.patch(`/api/admin/solar-hub/help/articles/${id}`, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        category,
        readMinutes,
        markdown,
        isPublished,
        sortOrder,
      }),
    onSuccess: () => {
      toast.success('Article saved')
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-articles'] })
      void queryClient.invalidateQueries({ queryKey: ['solar-hub-help-article', id] })
      navigate('/solar-hub/help')
    },
    onError: (err) => toast.error(getFriendlyApiErrorMessage(err)),
  })

  const categories = categoriesQuery.data?.categories ?? []
  const loading = articleQuery.isLoading || categoriesQuery.isLoading

  return (
    <div className="max-w-4xl">
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
      ) : articleQuery.isError || !articleQuery.data ? (
        <p className="text-sm text-[color:var(--accent-red)]">Article not found.</p>
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
              {canManage ? 'Edit guide' : 'View guide'}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">ID: {id}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canManage}
                required
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Subtitle
              </span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                disabled={!canManage}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              />
            </label>
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
                Read time (minutes)
              </span>
              <input
                type="number"
                min={1}
                max={120}
                value={readMinutes}
                onChange={(e) => setReadMinutes(Number(e.target.value))}
                disabled={!canManage}
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 text-sm disabled:opacity-70"
              />
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
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={!canManage}
              />
              <span className="text-sm text-[color:var(--text-primary)]">Published</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                !showPreview
                  ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                  : 'text-[color:var(--text-muted)]'
              }`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                showPreview
                  ? 'bg-[color:var(--accent-gold-muted)] text-[color:var(--accent-gold)]'
                  : 'text-[color:var(--text-muted)]'
              }`}
            >
              Preview
            </button>
          </div>

          {showPreview ? (
            <div className="zenith-glass rounded-2xl p-4 prose-sm max-w-none">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[color:var(--text-secondary)]">
                Markdown body
              </span>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                disabled={!canManage}
                rows={18}
                required
                className="w-full rounded-xl border border-[color:var(--border-input)] bg-[color:var(--bg-input)] px-3 py-2.5 font-mono text-xs leading-relaxed disabled:opacity-70"
              />
            </label>
          )}

          {canManage ? (
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-[color:var(--accent-gold)] px-5 py-2.5 text-sm font-bold text-[color:var(--text-inverse)] disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save article'}
            </button>
          ) : null}
        </form>
      )}
    </div>
  )
}
