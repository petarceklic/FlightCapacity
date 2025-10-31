# FlightCapacity

Track airline seat capacity and flight fullness for upcoming flights using real-time Amadeus API data.

## Tech Stack

- **Frontend**: Next.js (React) → Vercel
- **Backend**: Node.js / Express → Railway
- **API**: Amadeus Flight Offers Search v2

## Quick Start

### 1. Get Amadeus API Credentials
- Go to https://developers.amadeus.com
- Create a free account and new app
- Copy your API Key and API Secret

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your Amadeus credentials
npm install
npm run dev
