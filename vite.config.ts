// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Standalone builds emit Vercel's Build Output API. The Lovable wrapper
  // still selects its own managed preset when running in the Lovable editor.
  nitro: { preset: "vercel" },
  vite: {
    optimizeDeps: {
      // use-sync-external-store's shim picks its implementation with a
      // conditional require(), so Vite cannot detect its named exports and
      // @tanstack/react-store fails to import useSyncExternalStoreWithSelector
      // at runtime, which breaks hydration in dev. Pre-bundling both resolves it.
      include: ["use-sync-external-store/shim/with-selector", "@tanstack/react-store"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
