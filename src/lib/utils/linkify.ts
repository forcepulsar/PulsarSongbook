/**
 * Convert plain text URLs to clickable links
 * Handles both HTML content and plain text
 */
export function linkify(text: string): string {
  if (!text) return text;

  // If text already contains anchor tags, return as-is
  if (/<a\s+[^>]*href/i.test(text)) {
    return text;
  }

  // More comprehensive URL regex that matches:
  // - http:// and https://
  // - www. domains
  // - Common TLDs without protocol
  const urlPattern = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}\/[^\s<>"]*)/g;

  // Replace URLs with clickable links
  let result = text.replace(urlPattern, (match) => {
    // Remove trailing punctuation
    let url = match.replace(/[.,;:!?)]+$/, '');
    const trailingPunctuation = match.slice(url.length);

    // Add protocol if missing
    let href = url;
    if (!url.match(/^https?:\/\//i)) {
      href = 'https://' + url;
    }

    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; cursor: pointer;">${url}</a>${trailingPunctuation}`;
  });

  // Preserve line breaks
  result = result.replace(/\n/g, '<br>');

  return result;
}
