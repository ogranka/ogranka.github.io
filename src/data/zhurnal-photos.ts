import type { ImageMetadata } from 'astro';

const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/zhurnal/*.webp', { eager: true });

export const photo = (key: string) => photos[`../assets/zhurnal/${key}.webp`].default;
