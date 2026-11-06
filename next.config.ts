import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite imagens do Supabase (bucket público) e otimização
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.com" },
    ],
  },
};

export default nextConfig;