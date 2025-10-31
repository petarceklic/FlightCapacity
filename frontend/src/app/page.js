'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    flightCode: '',
    date: '',
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
      const url = `${apiUrl}/api/flight-status?carrier=${carrier}&number=${number}&date=${formData.date}`;

      console.log('🔍 Fetching from:', url);
      console.log('📡 API Base URL:', apiUrl);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status, response.statusText);

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
      console.log('📦 Response data:', data);

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
      console.error('❌ Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });

      // User-friendly error messages
      let userMessage = err.message;
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        userMessage = 'Cannot connect to backend API. Please check if the backend is running and NEXT_PUBLIC_API_URL is set correctly.';
      } else if (err.message.includes('CORS')) {
        userMessage = 'CORS error: Backend is blocking requests from this domain. Check CORS configuration.';
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
              placeholder="MH124"
              pattern="[A-Z]{2}\d{1,4}"
              title="Enter 2 letters followed by 1-4 digits (e.g., MH124)"
              maxLength="6"
              required
            />
            <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Format: XX123 (e.g., MH124, QF7)
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
          🔍 Fetching flight status...
        </div>
      )}

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && !loading && results.data?.data && results.data.data.length > 0 && (
        <div className="results-section">
          {results.data.data.map((flight, index) => {
            const departure = flight.flightPoints?.find(fp => fp.departure);
            const arrival = flight.flightPoints?.find(fp => fp.arrival);
            
            return (
              <div key={index} className="flight-card">
                <div className="flight-card-header">
                  <div>
                    <h2>{results.query.flightCode}</h2>
                    <p className="airline-name">
                      {flight.carrierCode || results.query.carrier} Flight
                    </p>
                  </div>
                  {flight.flightStatus && (
                    <div className="status-badge">
                      {flight.flightStatus}
                    </div>
                  )}
                </div>

                <div className="flight-route">
                  <div className="route-point">
                    <div className="airport-code">{departure?.iataCode || 'N/A'}</div>
                    <div className="time-info">
                      <div className="time-label">Scheduled</div>
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
                      <div className="time-label">Scheduled</div>
                      <div className="time-value">{formatTime(arrival?.arrival?.timings?.[0]?.value)}</div>
                      {arrival?.arrival?.timings?.[0]?.value && (
                        <div className="date-value">{formatDate(arrival.arrival.timings[0].value)}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flight-details">
                  {flight.legs?.[0]?.aircraftEquipment && (
                    <div className="detail-item">
                      <span className="detail-label">Aircraft:</span>
                      <span className="detail-value">{flight.legs[0].aircraftEquipment}</span>
                    </div>
                  )}
                  {flight.legs?.[0]?.scheduledDuration && (
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{flight.legs[0].scheduledDuration}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results && !loading && (!results.data?.data || results.data.data.length === 0) && (
        <div className="no-results">
          No flight information found for {results.query.flightCode} on {results.query.date}
        </div>
      )}
    </div>
  );
}
