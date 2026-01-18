/**
 * Tabula Extension - Content Script
 * 
 * Extracts meaningful content from web pages for tab descriptions.
 * Prioritizes high-quality metadata, then supplements with main content.
 */

const MAX_WORDS = 8000;

interface ExtractedContent {
  url: string;
  title: string;
  /** Rich description from meta + main content (max 8000 words) */
  description: string;
}

/**
 * Count words in a string
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Truncate text to a maximum number of words
 */
function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= maxWords) {
    return text;
  }
  return words.slice(0, maxWords).join(" ");
}

/**
 * Get meta tag content by name or property
 */
function getMeta(attr: string): string | undefined {
  const el = document.querySelector(
    `meta[name="${attr}"], meta[property="${attr}"]`
  );
  return el?.getAttribute("content")?.trim() || undefined;
}

/**
 * Extract main content area text (prefer article/main over full body)
 */
function getMainContent(): string {
  const selectors = [
    "article",
    "main",
    '[role="main"]',
    ".post-content",
    ".article-content",
    ".entry-content",
    ".content",
    "#content",
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length > 100) {
      return el.textContent.replace(/\s+/g, " ").trim();
    }
  }

  return document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * Extract headings for content structure
 */
function getHeadings(): string[] {
  const headings: string[] = [];
  const h1s = document.querySelectorAll("h1");
  const h2s = document.querySelectorAll("h2");

  h1s.forEach((h) => {
    const text = h.textContent?.trim();
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text);
    }
  });

  h2s.forEach((h) => {
    const text = h.textContent?.trim();
    if (text && text.length > 2 && text.length < 150 && headings.length < 8) {
      headings.push(text);
    }
  });

  return headings.slice(0, 8);
}

/**
 * Build a rich description from available metadata and content
 * Priority: meta description > og:description > site name > headings > main content
 * Max 8000 words
 */
function buildDescription(): string {
  const parts: string[] = [];

  // 1. Add site name if available (as prefix)
  const siteName = getMeta("og:site_name");
  if (siteName) {
    parts.push(`[${siteName}]`);
  }

  // 2. Try meta description (highest quality, written by page authors)
  const metaDesc = getMeta("description");
  if (metaDesc && metaDesc.length > 20) {
    parts.push(metaDesc);
  }

  // 3. Try Open Graph description (often more detailed for social sharing)
  const ogDesc = getMeta("og:description");
  if (ogDesc && ogDesc.length > 20 && ogDesc !== metaDesc) {
    parts.push(ogDesc);
  }

  // 4. Add headings for content structure
  const headings = getHeadings();
  if (headings.length > 0) {
    parts.push("## " + headings.join(" • "));
  }

  // 5. Fill remaining space with main content
  const currentText = parts.join(" | ");
  const currentWords = countWords(currentText);
  const remainingWords = MAX_WORDS - currentWords - 5; // Reserve some words for separators
  
  if (remainingWords > 50) {
    const mainContent = getMainContent();
    if (mainContent.length > 0) {
      // Truncate main content to fit within word limit
      const truncatedContent = truncateToWords(mainContent, remainingWords);
      parts.push(truncatedContent);
    }
  }

  // Combine and ensure max words
  const description = truncateToWords(parts.join(" | "), MAX_WORDS);
  return description || "";
}

/**
 * Extract content from the page
 */
function extractContent(): ExtractedContent {
  return {
    url: window.location.href,
    title: document.title,
    description: buildDescription(),
  };
}

// Listen for extraction requests from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "extractContent") {
    sendResponse(extractContent());
  }
  
  // Alias for backward compatibility
  if (message?.type === "extractDescription") {
    sendResponse({
      description: buildDescription(),
    });
  }
});
