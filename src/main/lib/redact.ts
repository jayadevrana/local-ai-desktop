const SECRET_PATTERNS = [
  /VENICE_[A-Z_0-9-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi
]

export const redactSecrets = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return SECRET_PATTERNS.reduce(
      (current, pattern) => current.replace(pattern, '[REDACTED]'),
      value
    )
  }

  if (Array.isArray(value)) {
    return value.map(redactSecrets)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, redactSecrets(nested)])
    )
  }

  return value
}
