export function generateId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(3, '0')}`;
}

export function generateUniqueName(base: string, index: number): string {
  return `${base} ${index}`;
}

export function generateUniqueSlug(base: string, index: number): string {
  return `${base.toLowerCase().replace(/\s+/g, '-')}-${String(index).padStart(3, '0')}`;
}

export function createMany<T>(
  count: number,
  factory: (index: number) => T,
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i + 1));
}
