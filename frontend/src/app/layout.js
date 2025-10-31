import './globals.css';

export const metadata = {
  title: 'FlightCapacity',
  description: 'Track airline seat capacity and flight fullness',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
