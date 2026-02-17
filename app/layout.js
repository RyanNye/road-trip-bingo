import "./globals.css";

export const metadata = {
  title: "Road Trip Bingo",
  description: "Turn any highway into an adventure",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
