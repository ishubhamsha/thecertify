const model = "gemini-2.0-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function testKey(name, key) {
  if (!key) {
    console.log(`[${name}] No key configured.`);
    return;
  }
  console.log(`[${name}] Testing key ${key.slice(0, 6)}...${key.slice(-4)}`);
  try {
    const res = await fetch(`${url}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hi" }] }],
      }),
    });
    console.log(`[${name}] Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`[${name}] Response:`, text.slice(0, 300));
  } catch (err) {
    console.error(`[${name}] Fetch failed:`, err);
  }
}

async function run() {
  await testKey("PRIMARY", process.env.GEMINI_API_KEY);
  await testKey("SECONDARY", process.env.GEMINI_API_KEY_SECONDARY);
}

run();
