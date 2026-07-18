const secretPatterns = [/password/gi, /secret/gi, /token/gi, /authorization/gi];

export const redactValue = (key: string, value: unknown): unknown => {
  if (secretPatterns.some((pattern) => pattern.test(key))) {
    return '[REDACTED]';
  }

  if (typeof value === 'object' && value !== null) {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
};

export const redactObject = (input: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(input).map(([key, value]) => [key, redactValue(key, value)]));
