/**
 * Rayenna Energy mascot for Solar Hub — cropped/masked so the beige studio
 * backdrop and wordmark don't fight the dark glass UI.
 */
export default function HubHomeMascot({
  isLive = false,
  size = 'hero',
}: {
  isLive?: boolean
  size?: 'hero' | 'login' | 'loading'
}) {
  return (
    <div
      className={`hub-mascot hub-mascot--${size}${isLive ? ' is-live' : ''}`}
      aria-hidden={size !== 'login'}
    >
      <div className="hub-mascot__glow" />
      <img
        src="/rayenna-mascot.jpg"
        alt={size === 'login' ? 'Rayenna Energy' : ''}
        className="hub-mascot__img"
        decoding="async"
        loading={size === 'hero' ? 'eager' : 'lazy'}
      />
    </div>
  )
}
