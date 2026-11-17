import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipv4ToNumber(address: string): number {
  return address.split(".").reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function inCidr(address: string, base: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToNumber(address) & mask) === (ipv4ToNumber(base) & mask);
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const blocked: Array<[string, number]> = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
      ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
      ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4]
    ];
    return !blocked.some(([base, prefix]) => inCidr(address, base, prefix));
  }

  if (family === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    if (normalized.startsWith("::ffff:") || normalized === "::" || normalized === "::1") return false;
    if (normalized.startsWith("fc") || normalized.startsWith("fd") ||
        /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
        normalized.startsWith("2002:") || normalized.startsWith("2001:db8:")) return false;
    const firstHextet = Number.parseInt(normalized.split(":")[0] || "0", 16);
    return firstHextet >= 0x2000 && firstHextet <= 0x3fff;
  }

  return false;
}

const hostCache = new Map<string, { expiresAt: number; result: Promise<boolean> }>();

export async function hostnameResolvesOnlyToPublicAddresses(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host) !== 0) return false;

  const cached = hostCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = lookup(host, { all: true, verbatim: true })
    .then((records) => records.length > 0 && records.every((record) => isPublicAddress(record.address)))
    .catch(() => false);

  hostCache.set(host, { expiresAt: Date.now() + 30_000, result });
  return result;
}
