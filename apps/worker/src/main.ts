console.log("Baby Tracker worker started");

const shutdown = (signal: string) => {
  console.log(`Baby Tracker worker stopping (${signal})`);
  process.exit(0);
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

setInterval(() => {
  // Placeholder loop until background jobs are wired.
}, 60_000);
