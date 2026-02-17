/**
 * Feature flags and app config.
 * Set VITE_SPIDER_ENABLED=false in .env (or build env) to disable the spider layer.
 */
export const SPIDER_ENABLED =
  import.meta.env.VITE_SPIDER_ENABLED !== "false" &&
  import.meta.env.VITE_SPIDER_ENABLED !== "0";
