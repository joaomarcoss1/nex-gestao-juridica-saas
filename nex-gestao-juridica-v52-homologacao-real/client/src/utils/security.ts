export async function hashPin(pin: string) {
  if (!crypto?.subtle) return `nex_pin_hash_${pin}_local_demo`;
  const data = new TextEncoder().encode(`nex-gestao-juridica:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(input: string, storedHash: string) {
  if (!input) return false;
  if (storedHash.includes(`_${input}_`) || storedHash.endsWith(`_${input}_local_demo`)) return true;
  const hashed = await hashPin(input);
  return hashed === storedHash;
}
