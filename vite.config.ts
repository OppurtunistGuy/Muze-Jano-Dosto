import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig(async (env) => {
  const isBuild = env.command === "build";

  if (isBuild) {
    // Prevent the sandbox config wrapper from overriding the preset during build
    delete process.env.DEV_SERVER__PROJECT_PATH;
    process.env.LOVABLE_SANDBOX = "0";
  }

  return {
    tanstackStart: {
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    },
    ...(isBuild
      ? {
          nitro: {
            preset: "node-server",
            output: {
              dir: "dist",
              serverDir: "dist/server",
              publicDir: "dist/client",
            },
          },
        }
      : {}),
  };
});
