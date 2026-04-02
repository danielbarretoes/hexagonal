import { isIP } from 'node:net';

export interface WebhookTargetPolicyOptions {
  requireHttps: boolean;
  allowPrivateTargets: boolean;
}

function normalizeHost(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1');
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === 'host.docker.internal' ||
    hostname === 'gateway.docker.internal' ||
    hostname === 'kubernetes.docker.internal'
  );
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map((part) => Number(part));

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  if (normalized.startsWith('::ffff:')) {
    return isPrivateIpv4(normalized.slice('::ffff:'.length));
  }

  return normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized);
}

function isPrivateIpAddress(hostname: string): boolean {
  const normalized = normalizeHost(hostname);
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export function assertWebhookTargetAllowed(
  rawUrl: string,
  options: WebhookTargetPolicyOptions,
): URL {
  const parsedUrl = new URL(rawUrl);
  const hostname = normalizeHost(parsedUrl.hostname);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('only http and https URLs are supported');
  }

  if (options.requireHttps && parsedUrl.protocol !== 'https:') {
    throw new Error('https is required');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('embedded credentials are not allowed');
  }

  if (!options.allowPrivateTargets && (isLocalHostname(hostname) || isPrivateIpAddress(hostname))) {
    throw new Error('private or local network targets are not allowed');
  }

  return parsedUrl;
}
