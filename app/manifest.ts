import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Week timer",
    short_name: "Week timer",
    description: "Track study, gym, clubs, and the rest of the week.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef4fb",
    theme_color: "#eef4fb",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Start YouTube",
        short_name: "YouTube",
        description: "Start the YouTube timer",
        url: "/start/youtube",
        icons: [{ src: "/icons/shortcut-youtube.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Start Chess",
        short_name: "Chess",
        description: "Start the Chess timer",
        url: "/start/chess",
        icons: [{ src: "/icons/shortcut-chess.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Open Gym",
        short_name: "Gym",
        description: "Open the gym log",
        url: "/gym",
        icons: [{ src: "/icons/shortcut-gym.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Open Timer",
        short_name: "Timer",
        description: "Open the week timer",
        url: "/timer",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
