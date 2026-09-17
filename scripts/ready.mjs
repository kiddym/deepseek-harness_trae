const port = Number(process.env.PORT || 4310);
const timeout = Number(process.env.READY_TIMEOUT_MS || 30000);
const started = Date.now(); let last = '无响应';
while (Date.now() - started < timeout) { try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); last = await response.text(); if (response.ok && JSON.parse(last).ok) { console.log(`ready: ${last}`); process.exit(0); } } catch (error) { last = error.message; } await new Promise((resolve) => setTimeout(resolve, 250)); }
console.error(`ready timeout on port ${port}; last response: ${last}`); process.exit(1);
