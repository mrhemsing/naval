const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function preloadVideo(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(src);
  if (pending) return pending;

  const request = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`preload failed: ${src} ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      cache.set(src, url);
      inflight.delete(src);
      return url;
    })
    .catch((error) => {
      inflight.delete(src);
      throw error;
    });

  inflight.set(src, request);
  return request;
}

export function getCachedVideo(src: string): string | undefined {
  return cache.get(src);
}
