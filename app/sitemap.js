import { supabase } from "@/lib/supabase";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export default async function sitemap() {
  const { data: routes } = await supabase
    .from("routes")
    .select("corridor_id, updated_at");

  const routeEntries = (routes || []).map((r) => ({
    url: `${BASE_URL}/routes/${r.corridor_id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...routeEntries,
  ];
}
