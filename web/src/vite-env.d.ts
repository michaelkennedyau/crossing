/// <reference types="vite/client" />

// CSS imported as a string (Vite ?inline query) — bundled into the island JS, injected at runtime.
declare module '*.css?inline' {
  const css: string;
  export default css;
}
