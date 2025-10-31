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

      // Debug logging for new features
      console.log('🔍 Delay Prediction:', data.delayPrediction ? 'Available' : 'Not available');
      console.log('🔍 Fare Trend:', data.fareTrend ? `${data.fareTrend.length} days` : 'Not available');
      console.log('🔍 Aircraft Model:', data.aircraft ? 'Available' : 'Not available');
      
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

  // Helper to format ISO 8601 duration (PT8H50M -> 8h 50m)
  const formatDuration = (isoDuration) => {
    if (!isoDuration) return 'N/A';
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return isoDuration;
    
    const hours = match[1] ? match[1].replace('H', 'h ') : '';
    const minutes = match[2] ? match[2].replace('M', 'm') : '';
    
    return (hours + minutes).trim() || 'N/A';
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
            
            // Aircraft name lookup - try API first, then fallback to static lookup
            const aircraftLookup = {
              '346': 'Airbus A340-600',
              '343': 'Airbus A340-300',
              '333': 'Airbus A330-300',
              '332': 'Airbus A330-200',
              '339': 'Airbus A330-900neo',
              '359': 'Airbus A350-900',
              '388': 'Airbus A380-800',
              '320': 'Airbus A320',
              '321': 'Airbus A321',
              '319': 'Airbus A319',
              '32N': 'Airbus A320neo',
              '32Q': 'Airbus A321neo',
              '77W': 'Boeing 777-300ER',
              '772': 'Boeing 777-200ER',
              '773': 'Boeing 777-300',
              '789': 'Boeing 787-9',
              '788': 'Boeing 787-8',
              '781': 'Boeing 787-10',
              '744': 'Boeing 747-400',
              '74H': 'Boeing 747-8',
              '764': 'Boeing 767-400',
              '763': 'Boeing 767-300',
              '73H': 'Boeing 737-800',
              '7M8': 'Boeing 737 MAX 8',
              '7M9': 'Boeing 737 MAX 9',
              'E90': 'Embraer E190',
              'E95': 'Embraer E195',
              'E75': 'Embraer E175',
              'CRK': 'Bombardier CRJ-1000'
            };
            
            const aircraftName = results.aircraft?.data?.[0]?.name || aircraftLookup[aircraftType] || aircraftType;
            
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
                    {aircraftName && (
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

                {/* CLASS BREAKDOWN WITH PROGRESS BARS */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#374151', fontWeight: '600' }}>Cabin Class Breakdown</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(cabinData).map(([cabin, data]) => {
                      // Estimate cabin capacity based on total aircraft capacity
                      const cabinCapacityEstimate = {
                        'ECONOMY': estimatedCapacity * 0.7,
                        'PREMIUM_ECONOMY': estimatedCapacity * 0.15,
                        'BUSINESS': estimatedCapacity * 0.12,
                        'FIRST': estimatedCapacity * 0.03
                      };
                      const cabinTotal = cabinCapacityEstimate[cabin] || estimatedCapacity * 0.5;
                      const cabinFillPct = Math.max(0, Math.min(100, ((cabinTotal - data.seats) / cabinTotal * 100)));
                      
                      return (
                        <div key={cabin} style={{
                          padding: '1.25rem',
                          background: '#ffffff',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: '600', color: '#111827', fontSize: '1rem' }}>
                                {cabin.replace('_', ' ')}
                              </div>
                              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                from ${data.minPrice.toFixed(2)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2563eb' }}>
                                {data.seats}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>available</div>
                            </div>
                          </div>
                          
                          {/* Cabin fill progress bar */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                              <span>{cabinFillPct.toFixed(0)}% Full</span>
                              <span>~{Math.round(cabinTotal)} seats</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              background: '#e5e7eb',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${cabinFillPct}%`,
                                height: '100%',
                                background: getCapacityColor(cabinFillPct),
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7-DAY FARE TREND */}
                {results.fareTrend && results.fareTrend.length > 0 && (() => {
                  const fareTrendData = results.fareTrend;
                  const validPrices = fareTrendData.filter(d => d.price !== null).map(d => d.price);
                  
                  if (validPrices.length === 0) return null;
                  
                  const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                  const currentPrice = cabinData.ECONOMY?.minPrice || 0;
                  const priceChange = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice * 100) : 0;
                  const maxPrice = Math.max(...validPrices);
                  
                  return (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#374151', fontWeight: '600' }}>7-Day Fare Trend</h3>
                      <div style={{
                        padding: '1.25rem',
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        {/* Price change indicator */}
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Current vs 7-day average
                          </div>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: priceChange > 0 ? '#dc2626' : '#10b981'
                          }}>
                            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {priceChange > 0 ? 'Above' : 'Below'} average (${avgPrice.toFixed(2)})
                          </div>
                        </div>
                        
                        {/* Simple bar chart */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '100px' }}>
                          {fareTrendData.map((item, idx) => {
                            const barHeight = item.price ? (item.price / maxPrice * 100) : 0;
                            const isToday = item.date === results.query.date;
                            
                            return (
                              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.65rem', color: '#6b7280', textAlign: 'center' }}>
                                  {item.price ? `$${item.price.toFixed(0)}` : 'N/A'}
                                </div>
                                <div style={{
                                  width: '100%',
                                  height: `${barHeight}%`,
                                  background: isToday ? '#2563eb' : '#93c5fd',
                                  borderRadius: '4px 4px 0 0',
                                  minHeight: item.price ? '10px' : '0',
                                  transition: 'height 0.3s ease'
                                }} />
                                <div style={{ fontSize: '0.65rem', color: isToday ? '#2563eb' : '#6b7280', fontWeight: isToday ? 'bold' : 'normal' }}>
                                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                      <span className="detail-value">{formatDuration(flight.legs[0].scheduledLegDuration)}</span>
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
