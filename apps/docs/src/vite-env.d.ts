/// <reference types="vite/client" />

declare module '*.md?raw' {
  const src: string;
  export default src;
}
