import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" }, // YouTube thumbnails
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google photos
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com" }, // legacy Place Photo
      { protocol: "https", hostname: "places.googleapis.com" }, // Places API (New)
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
    ],
  },
};

export default nextConfig;
