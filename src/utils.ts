export function getLintColor(kind: string, alpha = 1) {
  const kebab = kind.replace(/([A-Z])/g, (m, l, o) => (o > 0 ? `-${l}` : l).toLowerCase());
  return `rgb(var(--lint-kind-${kebab}) / ${alpha})`;
}

export function pascalToWords(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();
}

export function formatMessage(message: string) {
  const parts = [];
  const regex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: 'text', content: message }];
}
