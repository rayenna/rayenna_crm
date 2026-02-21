/** Fallback shown while a lazy route is loading */
const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"
        aria-hidden
      />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  </div>
)

export default PageLoader
