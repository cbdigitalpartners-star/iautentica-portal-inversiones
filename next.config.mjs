import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

const isProd = process.env.NODE_ENV === "production";

// CSP conservadora: bloquea exfiltración a hosts no listados, embedding y
// formularios cross-origin. 'unsafe-inline'/'unsafe-eval' son necesarias
// para Next 14 (hidratación, HMR). Si en el futuro adoptamos nonces vía
// middleware, conviene apretarla. img-src cubre Supabase Storage + tiles
// CARTO de Leaflet; connect-src cubre PostgREST + websockets de Supabase.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProd
    ? [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: cspDirectives },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    // Trata estos barrel imports como imports directos. Reduce drásticamente
    // el module count en dev y baja el tiempo de compilación incremental.
    // En producción no cambia nada (allá ya hay tree-shaking).
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oqjsajhddjikencvwlwb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config) => {
    // Silencia dos infra-warnings benignos del cache de webpack:
    // 1) "Parsing of .../next-intl/.../import(t) failed for build dependencies"
    //    — next-intl usa imports dinámicos para locales; webpack no puede
    //    rastrear la dependencia para cache invalidation. No afecta runtime.
    // 2) "Serializing big strings (Nkb) impacts deserialization performance"
    //    — los archivos de mensajes es.json/en.json son grandes; aviso de
    //    optimización interna del PackFileCacheStrategy. Tampoco afecta runtime.
    //
    // Ambos vienen del logger interno (`webpack.cache.PackFileCacheStrategy`),
    // no del pipeline de compilación, así que `ignoreWarnings` no los toca —
    // hay que silenciarlos vía `infrastructureLogging.level`.
    config.infrastructureLogging = {
      ...(config.infrastructureLogging ?? {}),
      level: "error",
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
