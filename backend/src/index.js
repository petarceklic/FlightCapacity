import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import AmadeusClient from './amadeus.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// CORS configuration - allow all origins for external API access
const corsOptions = {
  origin: '*',  // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const amadeus = new AmadeusClient();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'FlightCapacity API' });
});

app.get('/api/flights', async (req, res) => {
  try {
    const { origin, destination, date, adults } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['origin', 'destination', 'date'],
        example: '/api/flights?origin=PER&destination=KUL&date=2025-12-15'
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        expected: 'YYYY-MM-DD',
        received: date
      });
    }

    const airportRegex = /^[A-Z]{3}$/i;
    if (!airportRegex.test(origin) || !airportRegex.test(destination)) {
      return res.status(400).json({
        error: 'Invalid airport code',
        expected: '3-letter IATA code (e.g., PER, KUL)',
        received: { origin, destination }
      });
    }

    console.log(`Searching flights: ${origin} → ${destination} on ${date}`);

    const flightData = await amadeus.searchFlightOffers({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate: date,
      adults: adults ? parseInt(adults) : 1
    });

    res.json({
      success: true,
      query: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        date,
        adults: adults || 1
      },
      data: flightData
    });

  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flight data',
      message: error.message
    });
  }
});

// Flight capacity endpoint - shows availability and seats
app.get('/api/flight-capacity', async (req, res) => {
  try {
    let { carrier, number, date, origin, destination } = req.query;

    // Validate required parameters
    if (!carrier || !number || !date) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['carrier', 'number', 'date'],
        example: '/api/flight-capacity?carrier=LH&number=400&date=2025-11-10'
      });
    }

    // If origin/destination not provided, get schedule first to extract them
    if (!origin || !destination) {
      console.log(`Getting schedule to extract route for ${carrier}${number} on ${date}`);
      
      const scheduleData = await amadeus.getFlightStatus({
        carrierCode: carrier.toUpperCase(),
        flightNumber: number,
        scheduledDepartureDate: date
      });
      
      const flightPoints = scheduleData.data?.[0]?.flightPoints;
      if (!flightPoints || flightPoints.length < 2) {
        return res.status(404).json({
          success: false,
          error: 'Could not determine flight route',
          message: 'Flight schedule does not contain route information'
        });
      }
      
      origin = flightPoints[0]?.iataCode;
      destination = flightPoints[flightPoints.length - 1]?.iataCode;
      
      if (!origin || !destination) {
        return res.status(404).json({
          success: false,
          error: 'Could not extract route from flight data'
        });
      }
      
      console.log(`Route extracted: ${origin} → ${destination}`);
    }

    console.log(`Getting flight capacity: ${carrier}${number} from ${origin} to ${destination} on ${date}`);

    // Get both schedule info and availability
    const [scheduleData, availabilityData] = await Promise.all([
      amadeus.getFlightStatus({
        carrierCode: carrier.toUpperCase(),
        flightNumber: number,
        scheduledDepartureDate: date
      }),
      amadeus.getFlightAvailability({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate: date,
        carrierCode: carrier.toUpperCase(),
        flightNumber: number
      })
    ]);

    res.json({
      success: true,
      query: {
        carrier: carrier.toUpperCase(),
        number: number,
        flightCode: `${carrier.toUpperCase()}${number}`,
        route: `${origin.toUpperCase()}-${destination.toUpperCase()}`,
        date
      },
      schedule: scheduleData,
      availability: availabilityData
    });

  } catch (error) {
    console.error('Flight capacity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flight capacity',
      message: error.message
    });
  }
});

// Flight status endpoint
app.get('/api/flight-status', async (req, res) => {
  try {
    const { carrier, number, date } = req.query;

    // Validate required parameters
    if (!carrier || !number || !date) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['carrier', 'number', 'date'],
        example: '/api/flight-status?carrier=MH&number=124&date=2025-10-31'
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format',
        expected: 'YYYY-MM-DD',
        received: date
      });
    }

    // Validate carrier code (2 letters)
    const carrierRegex = /^[A-Z]{2}$/i;
    if (!carrierRegex.test(carrier)) {
      return res.status(400).json({
        error: 'Invalid carrier code',
        expected: '2-letter airline code (e.g., MH, QF)',
        received: carrier
      });
    }

    // Validate flight number (1-4 digits)
    const numberRegex = /^\d{1,4}$/;
    if (!numberRegex.test(number)) {
      return res.status(400).json({
        error: 'Invalid flight number',
        expected: '1-4 digits (e.g., 124, 7)',
        received: number
      });
    }

    console.log(`Getting flight status: ${carrier}${number} on ${date}`);

    const flightStatus = await amadeus.getFlightStatus({
      carrierCode: carrier.toUpperCase(),
      flightNumber: number,
      scheduledDepartureDate: date
    });

    res.json({
      success: true,
      query: {
        carrier: carrier.toUpperCase(),
        number: number,
        flightCode: `${carrier.toUpperCase()}${number}`,
        date
      },
      data: flightStatus
    });

  } catch (error) {
    console.error('Flight status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flight status',
      message: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/flights?origin=XXX&destination=YYY&date=YYYY-MM-DD',
      'GET /api/flight-status?carrier=XX&number=123&date=YYYY-MM-DD',
      'GET /api/flight-capacity?carrier=XX&number=123&date=YYYY-MM-DD&origin=XXX&destination=YYY'
    ]
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 FlightCapacity API running on ${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.AMADEUS_ENV || 'test'}`);
  console.log(`🌐 Server accessible externally on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`✅ CORS enabled for all origins`);
});
