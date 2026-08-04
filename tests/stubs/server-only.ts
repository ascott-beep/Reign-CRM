// Vitest runs outside Next.js's bundler, which is what normally provides the
// "server-only" virtual module. This stub lets lib modules that import
// "server-only" (a correctness guard against accidental client bundling) be
// unit-tested directly under Node without pulling in the whole Next.js build.
export {};
