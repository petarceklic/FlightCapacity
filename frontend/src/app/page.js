'use client';

import { useState, useEffect } from 'react';

// Helper function to get default date (10 days from today)
const getDefaultDate = () => {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 10);
  return futureDate.toISOString().split('T')[0];
};

export default function Home() {
  const [formData, setFormData] = useState({
    flightCode: '',
    date: getDefaultDate(),
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verify environment variable is loaded
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('✅ Connected to:', apiUrl);
  }, []);

  const handleFlightCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({
      ...prev,
      flightCode: value
    }));
  };

  const handleDateChange = (e) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  const parseFlightCode = (code) => {
    // Match pattern: 2 letters followed by 1-4 digits
    const match = code.match(/^([A-Z]{2})(\d{1,4})$/);
    if (!match) {
      throw new Error('Invalid flight code format. Expected format: XX123 (2 letters + 1-4 digits)');
    }
    return {
      carrier: match[1],
      number: match[2]
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Parse flight code
      const { carrier, number } = parseFlightCode(formData.flightCode);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/flight-capacity?carrier=${carrier}&number=${number}&date=${formData.date}`;

      console.log('\n=== API REQUEST DEBUG ===');
      console.log('🔍 Full URL:', url);
      console.log('📡 API Base URL:', apiUrl);
      console.log('📝 Environment Variable:', process.env.NEXT_PUBLIC_API_URL ? 'SET' : 'NOT SET (using fallback)');
      console.log('✈️ Flight:', `${carrier}${number}`);
      console.log('📅 Date:', formData.date);
      console.log('========================\n');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('\n=== API RESPONSE DEBUG ===');
      console.log('📥 Status:', response.status, response.statusText);
      console.log('🔗 Response URL:', response.url);
      console.log('✅ Response OK:', response.ok);

      // Handle non-JSON responses (network errors, CORS issues)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(
          `Server returned ${response.status} ${response.statusText}. ` +
          `Expected JSON but got ${contentType || 'unknown content type'}. ` +
          `This might be a CORS or network issue.`
        );
      }

      const data = await response.json();
      console.log('📦 Response data:', JSON.stringify(data, null, 2));
      console.log('=========================\n');

      if (!response.ok) {
        throw new Error(
          data.error || 
          data.message || 
          `HTTP ${response.status}: Failed to fetch flight status`
        );
      }

      setResults(data);
    } catch (err) {
      // Enhanced error logging
      console.error('\n=== ERROR DEBUG ===');
      console.error('❌ Error Type:', err.name);
      console.error('❌ Error Message:', err.message);
      console.error('📡 Attempted URL:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/flight-status`);
      console.error('🔍 Full Error Object:', err);
      if (err.stack) {
        console.error('📄 Stack Trace:', err.stack);
      }
      console.error('==================\n');

      // User-friendly error messages
      let userMessage = err.message;
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        userMessage = `Network Error: Cannot connect to backend at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}. The backend may be down or unreachable.`;
      } else if (err.message.includes('CORS')) {
        userMessage = `CORS Error: Backend at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'} is blocking requests from this domain. Check CORS configuration.`;
      } else if (err.name === 'TypeError') {
        userMessage = `Connection Failed: Unable to reach ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}. Check if the backend is running.`;
      }

      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Helper to format time
  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Helper to format date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>✈️ FlightCapacity</h1>
        <p>Check real-time flight status and schedule information</p>
      </header>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="flightCode">Flight Code</label>
            <input
              type="text"
              id="flightCode"
              name="flightCode"
              value={formData.flightCode}
              onChange={handleFlightCodeChange}
              placeholder="LH400"
              pattern="[A-Z]{2}\d{1,4}"
              title="Enter 2 letters followed by 1-4 digits (e.g., LH400)"
              maxLength="6"
              required
            />
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Format: XX123 (e.g., LH400, BA1)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="date">Departure Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleDateChange}
              min={today}
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="search-button"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Flight'}
        </button>
      </form>

      {loading && (
        <div className="loading-message">
          🔍 Fetching flight capacity data...
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && !loading && results.schedule?.data && results.schedule.data.length > 0 && (
        <div className="results-section">
          {results.schedule.data.map((flight, scheduleIndex) => {
            const departure = flight.flightPoints?.find(fp => fp.departure);
            const arrival = flight.flightPoints?.find(fp => fp.arrival);
            const aircraftType = flight.legs?.[0]?.aircraftEquipment?.aircraftType;
            
            // Calculate capacity metrics from availability data
            const availabilityOffers = results.availability?.data || [];
            
            // Group by cabin class
            const cabinData = {};
            let totalSeatsAvailable = 0;
            
            availabilityOffers.forEach(offer => {
              const seats = offer.numberOfBookableSeats || 0;
              totalSeatsAvailable += seats;
              
              offer.travelerPricings?.forEach(pricing => {
                pricing.fareDetailsBySegment?.forEach(segment => {
                  const cabin = segment.cabin || 'UNKNOWN';
                  if (!cabinData[cabin]) {
                    cabinData[cabin] = {
                      seats: 0,
                      minPrice: Infinity,
                      offers: 0
                    };
                  }
                  cabinData[cabin].seats += seats;
                  cabinData[cabin].offers += 1;
                  const price = parseFloat(offer.price?.total || 0);
                  if (price < cabinData[cabin].minPrice) {
                    cabinData[cabin].minPrice = price;
                  }
                });
              });
            });
            
            // Estimate total capacity (rough estimate based on aircraft type)
            const aircraftCapacity = {
              '346': 340,  // A340-600
              '333': 300,  // A330-300
              '332': 250,  // A330-200
              '77W': 350,  // 777-300ER
              '772': 300,  // 777-200ER
              '789': 290,  // 787-9
              '788': 240,  // 787-8
            };
            
            const estimatedCapacity = aircraftCapacity[aircraftType] || 300;
            const capacityPercentage = totalSeatsAvailable > 0 
              ? Math.max(0, Math.min(100, ((estimatedCapacity - totalSeatsAvailable) / estimatedCapacity * 100)))
              : 0;
            
            const getCapacityColor = (pct) => {
              if (pct >= 90) return '#dc2626'; // Red - nearly full
              if (pct >= 70) return '#f59e0b'; // Orange - filling up
              if (pct >= 40) return '#10b981'; // Green - good availability
              return '#3b82f6'; // Blue - lots of space
            };
            
            // Get airline and aircraft info from API response
            const airlineName = results.airline?.data?.[0]?.businessName || results.airline?.data?.[0]?.commonName || results.query.carrier;
            const airlineLogo = `https://content.airhex.com/content/logos/airlines_${results.query.carrier}_200_200_s.png`;
            const aircraftName = results.aircraft?.data?.[0]?.name || aircraftType;
            
            return (
              <div key={scheduleIndex} className="flight-card">
                {/* AIRLINE HEADER WITH LOGO */}
                <div className="flight-card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <img 
                    src={airlineLogo} 
                    alt={airlineName}
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', background: 'white', padding: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{results.query.flightCode}</h2>
                    <p className="airline-name" style={{ margin: '0.25rem 0 0 0', color: '#6b7280' }}>
                      {airlineName} • {results.query.route}
                    </p>
                    {aircraftName && aircraftName !== aircraftType && (
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                        ✈️ {aircraftName}
                      </p>
                    )}
                  </div>
                </div>

                {/* CAPACITY OVERVIEW */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '2rem',
                  borderRadius: '12px',
                  color: 'white',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {capacityPercentage.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '1.25rem', opacity: 0.9 }}>
                    Flight Capacity
                  </div>
                  <div style={{ fontSize: '0.95rem', opacity: 0.8, marginTop: '0.5rem' }}>
                    {totalSeatsAvailable} seats available
                  </div>
                  
                  {/* Visual capacity bar */}
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    marginTop: '1rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${capacityPercentage}%`,
                      height: '100%',
                      background: getCapacityColor(capacityPercentage),
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* CLASS BREAKDOWN */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#374151' }}>Cabin Class Breakdown</h3>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {Object.entries(cabinData).map(([cabin, data]) => (
                      <div key={cabin} style={{
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{cabin}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            from ${data.minPrice.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                            {data.seats}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>seats</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FLIGHT ROUTE */}
                <div className="flight-route">
                  <div className="route-point">
                    <div className="airport-code">{departure?.iataCode || 'N/A'}</div>
                    <div className="time-info">
                      <div className="time-label">Departure</div>
                      <div className="time-value">{formatTime(departure?.departure?.timings?.[0]?.value)}</div>
                      {departure?.departure?.timings?.[0]?.value && (
                        <div className="date-value">{formatDate(departure.departure.timings[0].value)}</div>
                      )}
                    </div>
                  </div>

                  <div className="route-arrow">
                    <div className="arrow-line"></div>
                    <div className="arrow-head">→</div>
                  </div>

                  <div className="route-point">
                    <div className="airport-code">{arrival?.iataCode || 'N/A'}</div>
                    <div className="time-info">
                      <div className="time-label">Arrival</div>
                      <div className="time-value">{formatTime(arrival?.arrival?.timings?.[0]?.value)}</div>
                      {arrival?.arrival?.timings?.[0]?.value && (
                        <div className="date-value">{formatDate(arrival.arrival.timings[0].value)}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* FLIGHT DETAILS */}
                <div className="flight-details">
                  {aircraftType && (
                    <div className="detail-item">
                      <span className="detail-label">Aircraft:</span>
                      <span className="detail-value">{aircraftType}</span>
                    </div>
                  )}
                  {flight.legs?.[0]?.scheduledLegDuration && (
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{flight.legs[0].scheduledLegDuration}</span>
                    </div>
                  )}
                  {estimatedCapacity && (
                    <div className="detail-item">
                      <span className="detail-label">Est. Capacity:</span>
                      <span className="detail-value">{estimatedCapacity} seats</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results && !loading && (!results.schedule?.data || results.schedule.data.length === 0) && (
        <div className="no-results">
          No flight information found for {results.query.flightCode} on {results.query.date}
        </div>
      )}
    </div>
  );
}
