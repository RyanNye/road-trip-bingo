/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // unsafe-eval required by Google Maps JS API
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://js.stripe.com https://checkout.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
              "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com",
              "connect-src 'self' https://*.googleapis.com https://*.supabase.co wss://*.supabase.co https://api.anthropic.com",
              "frame-src https://js.stripe.com https://checkout.stripe.com",
              "worker-src blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
