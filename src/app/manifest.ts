import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ResearVia",
    short_name: "ResearVia",
    description: "Free academic opportunity and research discovery workspace for students.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["education", "productivity"]
  };
}
