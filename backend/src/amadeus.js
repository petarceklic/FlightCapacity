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
