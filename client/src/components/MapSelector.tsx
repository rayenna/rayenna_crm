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

  // Function to parse Google Maps link and extract coordinates
  const parseMapLink = (link: string): { lat: number | null, lng: number | null } => {
    try {
      // Try to extract coordinates from various Google Maps URL formats
      // Format 1: https://www.google.com/maps?q=12.9716,77.5946
      const qMatch = link.match(/[?&]q=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (qMatch) {
        const lat = parseFloat(qMatch[1])
        const lng = parseFloat(qMatch[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }

      // Format 2: https://www.google.com/maps/@12.9716,77.5946,15z
      const atMatch = link.match(/@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (atMatch) {
        const lat = parseFloat(atMatch[1])
        const lng = parseFloat(atMatch[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }

      // Format 3: https://maps.google.com/?ll=12.9716,77.5946
      const llMatch = link.match(/[?&]ll=([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (llMatch) {
        const lat = parseFloat(llMatch[1])
        const lng = parseFloat(llMatch[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }

      // Format 4: Embed URL format
      const embedMatch = link.match(/place\/.*@([+-]?\d+\.?\d*),([+-]?\d+\.?\d*)/)
      if (embedMatch) {
        const lat = parseFloat(embedMatch[1])
        const lng = parseFloat(embedMatch[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng }
        }
      }
    } catch (error) {
      console.error('Error parsing map link:', error)
    }
    return { lat: null, lng: null }
  }

  useEffect(() => {
    if (latitude && longitude) {
      setLatInput(latitude.toString())
      setLngInput(longitude.toString())
      // Create Google Maps embed URL (using place query)
      const url = `https://www.google.com/maps?q=${latitude},${longitude}&output=embed&z=15`
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
        const url = `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`
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
        const url = `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`
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

  const handleMapLinkChange = (value: string) => {
    setMapLink(value)
    if (value.trim()) {
      const coords = parseMapLink(value)
      if (coords.lat !== null && coords.lng !== null) {
        setLatInput(coords.lat.toString())
        setLngInput(coords.lng.toString())
        onLocationChange(coords.lat, coords.lng)
        // Update map URL
        const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}&output=embed&z=15`
        setMapUrl(url)
      }
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
          const url = `https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`
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
            <input
              type="url"
              value={mapLink}
              onChange={(e) => handleMapLinkChange(e.target.value)}
              placeholder="https://www.google.com/maps?q=12.9716,77.5946"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Paste a Google Maps link to auto-fill coordinates</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '300px' }}>
            {mapUrl ? (
              <iframe
                ref={mapRef}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={mapUrl}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500 text-sm">Enter coordinates to view map</p>
              </div>
            )}
          </div>
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
              <input
                type="url"
                value={mapLink}
                onChange={(e) => handleMapLinkChange(e.target.value)}
                placeholder="https://www.google.com/maps?q=12.9716,77.5946"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Paste a Google Maps link to auto-fill coordinates and view map</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          📍 Use Current Location
        </button>
        <button
          type="button"
          onClick={handleMapClick}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          🗺️ Open in Google Maps
        </button>
      </div>
    </div>
  )
}

export default MapSelector
