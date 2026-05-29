const http = require("node:http");

const html = `
<html>
  <head><title>Baby Tracker Web</title></head>
  <body>
    <h1>Baby Tracker</h1>
    <main>
      <section>
        <h2>Today Dashboard</h2>
        <p>Summary cards: feeding, sleep, diaper, symptoms.</p>
      </section>
      <section>
        <h2>Timeline</h2>
        <p>Daily event list with date/type filters and edit actions.</p>
      </section>
      <section>
        <h2>Draft Review</h2>
        <p>LLM drafts must be confirmed before final events are created.</p>
      </section>
      <section>
        <h2>Analytics</h2>
        <p>Daily and weekly reports based only on structured events.</p>
      </section>
    </main>
  </body>
</html>`;

http
  .createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  })
  .listen(process.env.PORT_WEB || 3000);
