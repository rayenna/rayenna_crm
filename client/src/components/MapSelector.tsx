import { useState, useEffect, useRef } from 'react'
import { ErrorModal } from '@/components/common/ErrorModal'

interface MapSelectorProps {
  latitude?: number | null
  longitude?: number | null
  onLocationChange: (latitude: number | null, longitude: number | null) => void
  /** When true, show coordinates / map link only (no editing). */
  readOnly?: boolean
}

const MapSelector = ({ latitude, longitude, onLocationChange, readOnly }: MapSelectorProps) => {
  const [inputMode, setInputMode] = useState<'map' | 'coordinates'>('coordinates')
  const [latInput, setLatInput] = useState<string>(latitude?.toString() || '')
  const [lngInput, setLngInput] = useState<string>(longitude?.toString() || '')
  const [mapLink, setMapLink] = useState<string>('')
  const [mapUrl, setMapUrl] = useState<string>('')
  const [locationError, setLocationError] = useState<{ message: string; type: 'error' | 'info' } | null>(null)
  const mapRef = useRef<HTMLIFrameElement>(null)

  // Function to generate Google Maps link from coordinates
  const generateMapLink = (lat: number | null, lng: number | null): string => {
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
    return ''
  }

  // Check if link is a short link (goo.gl or maps.app.goo.gl)
  const isShortLink = (link: string): boolean => {
    return /maps\.app\.goo\.gl|goo\.gl\/maps|bit\.ly/.test(link)
  }

  // Function to parse Google Maps link and extract coordinates
  const parseMapLink = async (link: string): Promise<{ lat: number | null, lng: number | null }> => {
    try {
      if (!link || typeof link !== 'string') {
        return { lat: null, lng: null }
      }

      const trimmedLink = link.trim()

      // Check if it's a short link - these don't contain coordinates directly
      if (isShortLink(trimmedLink)) {
        // Try to follow redirect if possible (limited by CORS)
        try {
          const response = await fetch(trimmedLink, { method: 'HEAD', redirect: 'follow' })
          const finalUrl = response.url || trimmedLink
          return await parseMapLink(finalUrl)
        } catch {
          return { lat: null, lng: null }
        }
      }

      // Try to extract coordinates from various Google Maps URL formats
      // Format 1: https://www.google.com/maps?q=12.9716,77.5946 or ?q=lat,lng
      const qMatch = trimmedLink.match(/[?&]q=([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (qMatch && qMatch[1] && qMatch[2]) {
        const lat = parseFloat(qMatch[1])
        const lng = parseFloat(qMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng }
        }
      }

      // Format 2: https://www.google.com/maps/@12.9716,77.5946,15z or @lat,lng
      const atMatch = trimmedLink.match(/@([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (atMatch && atMatch[1] && atMatch[2]) {
        const lat = parseFloat(atMatch[1])
        const lng = parseFloat(atMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng }
        }
      }

      // Format 3: https://maps.google.com/?ll=12.9716,77.5946 or ?ll=lat,lng
      const llMatch = trimmedLink.match(/[?&]ll=([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (llMatch && llMatch[1] && llMatch[2]) {
        const lat = parseFloat(llMatch[1])
        const lng = parseFloat(llMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng }
        }
      }

      // Format 4: Embed URL format or place/@lat,lng
      const embedMatch = trimmedLink.match(/[/@]([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (embedMatch && embedMatch[1] && embedMatch[2]) {
        const lat = parseFloat(embedMatch[1])
        const lng = parseFloat(embedMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng }
        }
      }

      // Format 5: Search for any pattern like lat,lng in the URL
      const coordPattern = trimmedLink.match(/([+-]?\d{1,2}\.\d{4,}),([+-]?\d{1,3}\.\d{4,})/)
      if (coordPattern && coordPattern[1] && coordPattern[2]) {
        const lat = parseFloat(coordPattern[1])
        const lng = parseFloat(coordPattern[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng }
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error parsing map link:', error, link)
    }
    return { lat: null, lng: null }
  }

  useEffect(() => {
    if (latitude && longitude) {
      setLatInput(latitude.toString())
      setLngInput(longitude.toString())
      // Create Google Maps embed URL (proper embed format)
      const url = `https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&output=embed`
      setMapUrl(url)
      // Generate map link
      setMapLink(generateMapLink(latitude, longitude))
    } else {
      setMapLink('')
      setMapUrl('')
    }
  }, [latitude, longitude])

  const handleLatChange = (value: string) => {
    setLatInput(value)
    const lat = parseFloat(value)
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      const lng = parseFloat(lngInput)
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        onLocationChange(lat, lng)
        // Update map URL
        const url = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`
        setMapUrl(url)
        // Update map link
        setMapLink(generateMapLink(lat, lng))
      } else {
        onLocationChange(lat, null)
        setMapLink(generateMapLink(lat, null))
      }
    } else if (value === '') {
      onLocationChange(null, parseFloat(lngInput) || null)
      setMapLink(generateMapLink(null, parseFloat(lngInput) || null))
    }
  }

  const handleLngChange = (value: string) => {
    setLngInput(value)
    const lng = parseFloat(value)
    if (!isNaN(lng) && lng >= -180 && lng <= 180) {
      const lat = parseFloat(latInput)
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        onLocationChange(lat, lng)
        // Update map URL
        const url = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`
        setMapUrl(url)
        // Update map link
        setMapLink(generateMapLink(lat, lng))
      } else {
        onLocationChange(null, lng)
        setMapLink(generateMapLink(null, lng))
      }
    } else if (value === '') {
      onLocationChange(parseFloat(latInput) || null, null)
      setMapLink(generateMapLink(parseFloat(latInput) || null, null))
    }
  }

  const handleMapLinkChange = async (value: string) => {
    if (value && value.trim()) {
      const trimmedValue = value.trim()
      setMapLink(trimmedValue) // Update link display immediately
      if (isShortLink(trimmedValue)) return
      const coords = await parseMapLink(trimmedValue)
      if (coords.lat !== null && coords.lng !== null) {
        setLatInput(coords.lat.toString())
        setLngInput(coords.lng.toString())
        onLocationChange(coords.lat, coords.lng)
        const url = `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&hl=en&z=15&output=embed`
        setMapUrl(url)
      }
    } else {
      // Clear coordinates if link is empty
      setMapLink('')
      setLatInput('')
      setLngInput('')
      onLocationChange(null, null)
      setMapUrl('')
    }
  }

  const handleMapClick = () => {
    // Open Google Maps in new tab for location selection
    if (latInput && lngInput) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${latInput},${lngInput}`, '_blank')
    } else {
      window.open('https://www.google.com/maps', '_blank')
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setLatInput(lat.toString())
          setLngInput(lng.toString())
          onLocationChange(lat, lng)
          // Update map URL
          const url = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`
          setMapUrl(url)
          // Update map link
          setMapLink(generateMapLink(lat, lng))
        },
        (error) => {
          if (import.meta.env.DEV) console.error('Error getting location:', error)
          setLocationError({ message: 'Unable to retrieve your location. Please enter coordinates manually.', type: 'error' })
        }
      )
    } else {
      setLocationError({ message: 'Geolocation is not supported by your browser.', type: 'info' })
    }
  }

  if (readOnly) {
    const hasCoords =
      latitude != null &&
      longitude != null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    const mapHref = hasCoords
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : ''
    return (
      <div className="w-full space-y-2 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[color:var(--text-secondary)]">Location (map coordinates)</p>
        {hasCoords ? (
          <p className="font-mono text-sm tabular-nums text-[color:var(--text-primary)]">
            Latitude: {latitude}, Longitude: {longitude}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">No coordinates set</p>
        )}
        {mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-[color:var(--accent-blue)] underline-offset-2 transition-colors hover:underline"
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>
    )
  }

  const mapInputCls =
    'zenith-native-filter-input w-full rounded-xl px-3 py-2 text-sm placeholder:text-[color:var(--text-placeholder)]'

  return (
    <div className="w-full space-y-4 rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--border-default)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-[color:var(--text-secondary)]">
          Location (map coordinates)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('coordinates')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              inputMode === 'coordinates'
                ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-sm'
                : 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] shadow-sm hover:bg-[color:var(--bg-card-hover)]'
            }`}
          >
            Coordinates
          </button>
          <button
            type="button"
            onClick={() => setInputMode('map')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              inputMode === 'map'
                ? 'bg-[color:var(--accent-gold)] text-[color:var(--text-inverse)] shadow-sm'
                : 'border border-[color:var(--border-default)] bg-[color:var(--bg-input)] text-[color:var(--text-secondary)] shadow-sm hover:bg-[color:var(--bg-card-hover)]'
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {inputMode === 'coordinates' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Latitude</label>
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="e.g., 12.9716"
                className={mapInputCls}
              />
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">Range: -90 to 90</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Longitude</label>
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="e.g., 77.5946"
                className={mapInputCls}
              />
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">Range: -180 to 180</p>
            </div>
          </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Google Maps link</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="url"
                  value={mapLink}
                  onChange={(e) => handleMapLinkChange(e.target.value)}
                  placeholder="https://www.google.com/maps?q=12.9716,77.5946"
                  className={`min-w-0 flex-1 ${mapInputCls}`}
                />
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--accent-teal)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-sm transition-colors hover:opacity-95"
                  >
                    Open Map
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Paste a Google Maps link to auto-fill coordinates and view map
                {mapLink && isShortLink(mapLink) && (
                  <span className="mt-1 block font-semibold text-[color:var(--accent-gold)]">
                    ⚠️ Short links cannot be parsed automatically. Please use the full URL (right-click on Google Maps → "Copy link address") or enter coordinates manually.
                  </span>
                )}
              </p>
            </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-badge)] shadow-inner ring-1 ring-[color:var(--border-default)]" style={{ height: '300px' }}>
            {mapUrl ? (
              <>
                <iframe
                  ref={mapRef}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={mapUrl}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps"
                ></iframe>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color:var(--bg-surface)]">
                <p className="px-4 text-center text-sm text-[color:var(--text-secondary)]">Enter coordinates or paste a Google Maps link to view map</p>
              </div>
            )}
          </div>
          {mapLink && (
            <div className="mt-2">
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent-blue)] underline-offset-2 hover:underline"
              >
                🗺️ View on Google Maps (opens in new tab)
              </a>
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latInput}
                  onChange={(e) => handleLatChange(e.target.value)}
                  placeholder="e.g., 12.9716"
                  className={mapInputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lngInput}
                  onChange={(e) => handleLngChange(e.target.value)}
                  placeholder="e.g., 77.5946"
                  className={mapInputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-secondary)]">Google Maps link</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                type="text"
                value={mapLink}
                onChange={(e) => {
                  handleMapLinkChange(e.target.value)
                }}
                onPaste={(e) => {
                  setTimeout(() => {
                    const pastedValue = (e.target as HTMLInputElement).value
                    handleMapLinkChange(pastedValue)
                  }, 10)
                }}
                placeholder="https://www.google.com/maps?q=12.9716,77.5946"
                className={`min-w-0 flex-1 ${mapInputCls}`}
              />
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-[color:var(--accent-teal)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-sm transition-colors hover:opacity-95"
                  >
                    Open Map
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Paste a Google Maps link to auto-fill coordinates and view map
                {mapLink && isShortLink(mapLink) && (
                  <span className="mt-1 block font-semibold text-[color:var(--accent-gold)]">
                    ⚠️ Short links cannot be parsed automatically. Please use the full URL (right-click on Google Maps → "Copy link address") or enter coordinates manually.
                  </span>
                )}
              </p>
              {mapLink && (
                <div className="mt-2">
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent-blue)] underline-offset-2 hover:underline"
                  >
                    🗺️ View on Google Maps (opens in new tab)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={getCurrentLocation}
          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-input)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-primary)] shadow-sm transition-all hover:bg-[color:var(--bg-card-hover)]"
        >
          📍 Use current location
        </button>
        <button
          type="button"
          onClick={handleMapClick}
          className="rounded-xl bg-[color:var(--accent-gold)] px-4 py-2 text-sm font-extrabold text-[color:var(--text-inverse)] shadow-md transition-all hover:opacity-95"
        >
          🗺️ Open in Google Maps
        </button>
      </div>

      <ErrorModal
        open={!!locationError}
        onClose={() => setLocationError(null)}
        type={locationError?.type ?? 'error'}
        message={locationError?.message ?? ''}
        surface="zenith"
        actions={[{ label: 'Dismiss', variant: 'ghost', onClick: () => setLocationError(null) }]}
      />
    </div>
  )
}

export default MapSelector
