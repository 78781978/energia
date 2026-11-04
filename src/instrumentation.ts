/** Start serwera: zadania w tle (src/jobs.ts) – tylko w środowisku Node.js, w produkcji i poza Vercelem. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const { startJobs } = await import("./jobs");
    startJobs();
  }
}
