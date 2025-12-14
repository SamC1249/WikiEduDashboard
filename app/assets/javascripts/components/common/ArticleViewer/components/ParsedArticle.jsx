import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';


const httpLinkMatcher = /(<a href="http)/g;
const blankTargetLink = '<a target="_blank" href="http';

export const ParsedArticle = ({ highlightedHtml, whocolorHtml, parsedArticle }) => {
  const containerRef = useRef(null);
  let articleHTML = highlightedHtml || whocolorHtml || parsedArticle;

  // This sets `target="_blank"` for all of the non-anchor links in the article HTML,
  // so that clicking one will open it in a new tab.
  articleHTML = articleHTML?.replace(httpLinkMatcher, blankTargetLink);

  useEffect(() => {
    if (!highlightedHtml) return undefined;

    const id = setTimeout(() => {
      if (!containerRef.current) return;
      const spans = containerRef.current.querySelectorAll('.editor-token');
      if (!spans.length) return;

      // Simple approach: only process highlighted spans with valid authors
      const spanArray = Array.from(spans);
      const validSpans = [];
      
      // First pass: collect only highlighted spans with valid authors, with their original indices
      spanArray.forEach((span, originalIndex) => {
        const className = span.className || '';
        // Must have user-highlight-* class
        if (!className.split(' ').some(cls => cls.startsWith('user-highlight-'))) {
          return;
        }
        // Must have valid title
        const name = span.getAttribute('title');
        if (!name || name.trim() === '' || name.trim().toLowerCase() === 'unknown') {
          return;
        }
        validSpans.push({ span, originalIndex });
      });

      // Second pass: add aria-labels to valid spans only
      let previousUserId = null;
      validSpans.forEach((item, index) => {
        const { span, originalIndex } = item;
        const className = span.className || '';
        const m = className.match(/token-editor-(\d+)/);
        if (!m) return;
        const uid = m[1];
        const name = span.getAttribute('title').trim();

        // Simple transition detection (no group logic)
        const isNewUser = uid !== previousUserId;
        
        // Check if this is the last span in the edit
        // It's the last if:
        // 1. There's no next valid span, OR
        // 2. The next valid span has a different user ID, OR
        // 3. The next span in the original array is not highlighted (transition to non-highlighted)
        const nextValidSpan = validSpans[index + 1];
        const nextValidMatch = nextValidSpan ? nextValidSpan.span.className.match(/token-editor-(\d+)/) : null;
        const nextValidUid = nextValidMatch ? nextValidMatch[1] : null;
        
        // Check the next span in the original array to see if it's highlighted
        const nextOriginalSpan = spanArray[originalIndex + 1];
        const nextOriginalIsHighlighted = nextOriginalSpan ? 
          (nextOriginalSpan.className || '').split(' ').some(cls => cls.startsWith('user-highlight-')) : false;
        
        const isLastInEdit = !nextValidSpan || 
                            (nextValidUid !== uid) || 
                            !nextOriginalIsHighlighted;

        // Announce at start of edit
        if (isNewUser) {
          span.removeAttribute('title');
          span.setAttribute('aria-label', `Edited by ${name.replace(/"/g, '&quot;')}`);
        }

        // Announce at end of edit
        if (isLastInEdit) {
          const currentLabel = span.getAttribute('aria-label') || '';
          span.setAttribute('aria-label', `${currentLabel} End edit`.trim());
        }

        previousUserId = uid;
      });
    }, 10);

    return () => clearTimeout(id);
  }, [highlightedHtml]);

  return (
    <div ref={containerRef} className="parsed-article" dangerouslySetInnerHTML={{ __html: articleHTML }} />
  );
};

ParsedArticle.propTypes = {
  highlightedHtml: PropTypes.string,
  whocolorHtml: PropTypes.string,
  parsedArticle: PropTypes.string
};

export default ParsedArticle;
