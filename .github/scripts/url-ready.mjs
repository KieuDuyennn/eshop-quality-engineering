// Exit 0 if the URL answers with a 2xx status, 1 otherwise.
// Usage: node url-ready.mjs <url>
// "localhost" is tried as both 127.0.0.1 and ::1: a dev server may bind to only
// one of them, and fetch() does not fall back between address families.
const url = new URL(process.argv[2]);
const hosts = url.hostname === 'localhost' ? ['127.0.0.1', '[::1]'] : [url.hostname];

const attempts = hosts.map(async (host) => {
  const target = new URL(url);
  target.hostname = host;
  const res = await fetch(target);
  await res.arrayBuffer();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return host;
});

Promise.any(attempts).then(
  (host) => console.log(`answered on ${host}`),
  () => { process.exitCode = 1; },
);
