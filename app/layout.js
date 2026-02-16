import "./globals.css";

export const metadata = {
  title: "Road Trip Bingo",
  description: "Turn any highway into an adventure",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
