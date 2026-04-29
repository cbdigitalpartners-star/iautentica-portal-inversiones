import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
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
