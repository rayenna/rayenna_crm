import { useState, useEffect, useRef } from 'react'

interface MapSelectorProps {
  latitude?: number | null
  longitude?: number | null
  onLocationChange: (latitude: number | null, longitude: number | null) => void
}

const MapSelector = ({ latitude, longitude, onLocationChange }: MapSelectorProps) => {
  const [inputMode, setInputMode] = useState<'map' | 'coordinates'>('coordinates')
  const [latInput, setLatInput] = useState<string>(latitude?.toString() || '')
  const [lngInput, setLngInput] = useState<string>(longitude?.toString() || '')
  const [mapLink, setMapLink] = useState<string>('')
  const [mapUrl, setMapUrl] = useState<string>('')
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
        console.log('Detected short link - coordinates cannot be extracted automatically')
        // Try to follow redirect if possible (limited by CORS)
        try {
          const response = await fetch(trimmedLink, { method: 'HEAD', redirect: 'follow' })
          const finalUrl = response.url || trimmedLink
          console.log('Short link redirects to:', finalUrl)
          // Recursively try to parse the final URL
          return await parseMapLink(finalUrl)
        } catch (error) {
          console.log('Cannot follow short link redirect due to CORS restrictions')
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
          console.log('Parsed coordinates from ?q= format:', { lat, lng })
          return { lat, lng }
        }
      }

      // Format 2: https://www.google.com/maps/@12.9716,77.5946,15z or @lat,lng
      const atMatch = trimmedLink.match(/@([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (atMatch && atMatch[1] && atMatch[2]) {
        const lat = parseFloat(atMatch[1])
        const lng = parseFloat(atMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('Parsed coordinates from @ format:', { lat, lng })
          return { lat, lng }
        }
      }

      // Format 3: https://maps.google.com/?ll=12.9716,77.5946 or ?ll=lat,lng
      const llMatch = trimmedLink.match(/[?&]ll=([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (llMatch && llMatch[1] && llMatch[2]) {
        const lat = parseFloat(llMatch[1])
        const lng = parseFloat(llMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('Parsed coordinates from ?ll= format:', { lat, lng })
          return { lat, lng }
        }
      }

      // Format 4: Embed URL format or place/@lat,lng
      const embedMatch = trimmedLink.match(/[\/@]([+-]?\d+\.?\d+),([+-]?\d+\.?\d+)/)
      if (embedMatch && embedMatch[1] && embedMatch[2]) {
        const lat = parseFloat(embedMatch[1])
        const lng = parseFloat(embedMatch[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('Parsed coordinates from /@ format:', { lat, lng })
          return { lat, lng }
        }
      }

      // Format 5: Search for any pattern like lat,lng in the URL
      const coordPattern = trimmedLink.match(/([+-]?\d{1,2}\.\d{4,}),([+-]?\d{1,3}\.\d{4,})/)
      if (coordPattern && coordPattern[1] && coordPattern[2]) {
        const lat = parseFloat(coordPattern[1])
        const lng = parseFloat(coordPattern[2])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          console.log('Parsed coordinates from pattern match:', { lat, lng })
          return { lat, lng }
        }
      }

      console.log('Could not parse coordinates from link:', trimmedLink)
    } catch (error) {
      console.error('Error parsing map link:', error, link)
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
    console.log('handleMapLinkChange called with:', value)
    
    if (value && value.trim()) {
      const trimmedValue = value.trim()
      setMapLink(trimmedValue) // Update link display immediately
      
      // Check if it's a short link
      if (isShortLink(trimmedValue)) {
        console.log('⚠️ Short link detected - please use the full Google Maps URL or enter coordinates manually')
        // Don't try to parse short links - just show the link
        return
      }
      
      console.log('Parsing map link:', trimmedValue)
      const coords = await parseMapLink(trimmedValue)
      console.log('Parsed coordinates:', coords)
      
      if (coords.lat !== null && coords.lng !== null) {
        // Update all state
        setLatInput(coords.lat.toString())
        setLngInput(coords.lng.toString())
        onLocationChange(coords.lat, coords.lng)
        // Update map URL
        const url = `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&hl=en&z=15&output=embed`
        setMapUrl(url)
        console.log('✅ Successfully extracted and set coordinates:', { lat: coords.lat, lng: coords.lng })
      } else {
        console.log('⚠️ Could not extract valid coordinates from link:', trimmedValue)
        // Link is still stored, but coordinates aren't extracted
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
          console.error('Error getting location:', error)
          alert('Unable to retrieve your location. Please enter coordinates manually.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Location (Map Coordinates)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('coordinates')}
            className={`px-3 py-1 text-xs rounded ${
              inputMode === 'coordinates'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Coordinates
          </button>
          <button
            type="button"
            onClick={() => setInputMode('map')}
            className={`px-3 py-1 text-xs rounded ${
              inputMode === 'map'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
              <label className="block text-xs text-gray-500 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="e.g., 12.9716"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Range: -90 to 90</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="e.g., 77.5946"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Range: -180 to 180</p>
            </div>
          </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Google Maps Link</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={mapLink}
                  onChange={(e) => handleMapLinkChange(e.target.value)}
                  placeholder="https://www.google.com/maps?q=12.9716,77.5946"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors whitespace-nowrap"
                  >
                    Open Map
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Paste a Google Maps link to auto-fill coordinates and view map
                {mapLink && isShortLink(mapLink) && (
                  <span className="block text-amber-600 mt-1 font-medium">
                    ⚠️ Short links cannot be parsed automatically. Please use the full URL (right-click on Google Maps → "Copy link address") or enter coordinates manually.
                  </span>
                )}
              </p>
            </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '300px' }}>
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
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500 text-sm">Enter coordinates or paste a Google Maps link to view map</p>
              </div>
            )}
          </div>
          {mapLink && (
            <div className="mt-2">
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-800 text-sm font-medium underline inline-flex items-center gap-1"
              >
                🗺️ View on Google Maps (opens in new tab)
              </a>
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={latInput}
                  onChange={(e) => handleLatChange(e.target.value)}
                  placeholder="e.g., 12.9716"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lngInput}
                  onChange={(e) => handleLngChange(e.target.value)}
                  placeholder="e.g., 77.5946"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Google Maps Link</label>
              <div className="flex gap-2">
              <input
                type="text"
                value={mapLink}
                onChange={(e) => {
                  handleMapLinkChange(e.target.value)
                }}
                onPaste={(e) => {
                  // Handle paste event - wait for paste to complete
                  setTimeout(() => {
                    const pastedValue = (e.target as HTMLInputElement).value
                    console.log('Pasted value:', pastedValue)
                    handleMapLinkChange(pastedValue)
                  }, 10)
                }}
                placeholder="https://www.google.com/maps?q=12.9716,77.5946"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors whitespace-nowrap"
                  >
                    Open Map
                  </a>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Paste a Google Maps link to auto-fill coordinates and view map
                {mapLink && isShortLink(mapLink) && (
                  <span className="block text-amber-600 mt-1 font-medium">
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
                    className="text-primary-600 hover:text-primary-800 text-sm font-medium underline inline-flex items-center gap-1"
                  >
                    🗺️ View on Google Maps (opens in new tab)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
        >
          📍 Use Current Location
        </button>
        <button
          type="button"
          onClick={handleMapClick}
          className="px-4 py-2 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors"
        >
          🗺️ Open in Google Maps
        </button>
      </div>
    </div>
  )
}

export default MapSelector
