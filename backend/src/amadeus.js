import fetch from 'node-fetch';

class AmadeusClient {
  constructor() {
    this.clientId = process.env.AMADEUS_CLIENT_ID;
    this.clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    this.env = process.env.AMADEUS_ENV || 'test';
    
    this.baseUrl = this.env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const url = `${this.baseUrl}/v1/security/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token request failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.message);
      throw error;
    }
  }

  async searchFlightOffers({ origin, destination, departureDate, adults = 1 }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departureDate,
      adults: adults.toString(),
      max: '10',
      currencyCode: 'USD'
    });

    const url = `${this.baseUrl}/v2/shopping/flight-offers?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Flight search failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching flights:', error.message);
      throw error;
    }
  }

  // Get flight availability with capacity info (seats available)
  async getFlightAvailability({ origin, destination, departureDate, carrierCode, flightNumber }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departureDate,
      adults: '1',
      max: '250',
      currencyCode: 'USD',
      nonStop: 'false'
    });

    const url = `${this.baseUrl}/v2/shopping/flight-offers?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Flight availability request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      
      // Filter for specific flight if carrier and number provided
      if (carrierCode && flightNumber) {
        const filteredOffers = data.data?.filter(offer => {
          return offer.itineraries?.[0]?.segments?.some(segment => 
            segment.carrierCode === carrierCode && 
            segment.number === flightNumber
          );
        });
        
        return {
          ...data,
          data: filteredOffers || []
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error getting flight availability:', error.message);
      throw error;
    }
  }

  // Get airline information
  async getAirlineInfo({ airlineCode }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      airlineCodes: airlineCode
    });

    const url = `${this.baseUrl}/v1/reference-data/airlines?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Airline info request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting airline info:', error.message);
      throw error;
    }
  }

  // Get aircraft model information
  async getAircraftModel({ aircraftCode }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      aircraftCodes: aircraftCode
    });

    const url = `${this.baseUrl}/v1/reference-data/aircraft?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Aircraft model request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting aircraft model:', error.message);
      throw error;
    }
  }

  // Get seatmap for cabin breakdown
  async getSeatmap({ flightOffers }) {
    const token = await this.getAccessToken();
    
    const url = `${this.baseUrl}/v1/shopping/seatmaps`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: flightOffers })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Seatmap request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting seatmap:', error.message);
      throw error;
    }
  }

  // Get delay prediction
  async getDelayPrediction({ originLocationCode, destinationLocationCode, departureDate, departureTime, arrivalDate, arrivalTime, aircraftCode, carrierCode, flightNumber, duration }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      originLocationCode,
      destinationLocationCode,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      aircraftCode,
      carrierCode,
      flightNumber,
      duration
    });
    
    const url = `${this.baseUrl}/v1/travel/predictions/flight-delay?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Delay prediction request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting delay prediction:', error.message);
      throw error;
    }
  }

  // Get fare trend (7-day view)
  async getFareTrend({ origin, destination, departureDate, carrierCode }) {
    const token = await this.getAccessToken();
    
    // Calculate date range (3 days before, 3 days after)
    const centerDate = new Date(departureDate);
    const dates = [];
    
    for (let i = -3; i <= 3; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Fetch prices for each date with timeout
    const pricePromises = dates.map(async (date) => {
      const params = new URLSearchParams({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: date,
        adults: '1',
        max: '1',
        currencyCode: 'USD'
      });

      const url = `${this.baseUrl}/v2/shopping/flight-offers?${params}`;

      try {
        // Add 5 second timeout per request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          return { date, price: null };
        }

        const data = await response.json();
        
        // Filter for specific carrier if provided
        let offers = data.data || [];
        if (carrierCode) {
          offers = offers.filter(offer => 
            offer.itineraries?.[0]?.segments?.some(seg => seg.carrierCode === carrierCode)
          );
        }
        
        const cheapestPrice = offers.length > 0 ? parseFloat(offers[0].price?.total || 0) : null;
        return { date, price: cheapestPrice };
      } catch (error) {
        console.warn(`Fare trend for ${date} failed:`, error.message);
        return { date, price: null };
      }
    });

    try {
      const results = await Promise.all(pricePromises);
      console.log(`Fare trend retrieved: ${results.filter(r => r.price !== null).length}/7 dates`);
      return results;
    } catch (error) {
      console.error('Fare trend failed:', error.message);
      return dates.map(date => ({ date, price: null }));
    }
  }

  // Get flight status by carrier code, flight number, and date
  async getFlightStatus({ carrierCode, flightNumber, scheduledDepartureDate }) {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams({
      carrierCode: carrierCode,
      flightNumber: flightNumber,
      scheduledDepartureDate: scheduledDepartureDate
    });

    const url = `${this.baseUrl}/v2/schedule/flights?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Flight status request failed: ${response.status} - ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting flight status:', error.message);
      throw error;
    }
  }
}

export default AmadeusClient;
