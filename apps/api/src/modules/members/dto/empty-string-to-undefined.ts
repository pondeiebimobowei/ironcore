export function emptyStringToUndefined({ value }: { value: unknown }) {
  if (value === '') {
    return undefined;
  }

  return typeof value === 'string' ? value : undefined;
}
