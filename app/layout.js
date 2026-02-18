import "./globals.css";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "Highway Bingo — Road Trip Bingo Card Generator",
  description: "Generate custom road trip bingo cards for any route. Free, printable, and fun for the whole family.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
