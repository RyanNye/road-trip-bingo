import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { findItemsNearRoute } from "./geo.js";

let cachedItems = null;

export function loadItems() {
  if (cachedItems) return cachedItems;

  const csvPath = path.join(process.cwd(), "data", "items.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(raw, { header: true, skipEmptyLines: true });

  cachedItems = data.filter((row) => row.item_name && row.tier !== "excluded");
  return cachedItems;
}

export function getItemsNearRoute(routeCoords, radiusKm = 20) {
  const items = loadItems();
  const nearby = findItemsNearRoute(items, routeCoords, radiusKm);

  return nearby.map((item) => ({
    name: item.item_name,
    emoji: item.emoji,
    desc: item.description,
    category: item.category,
    tier: item.tier,
  }));
}
