
import { AISuggestion } from '../types';

export const parseAIDiff = (aiOutput: string): AISuggestion[] => {
  const suggestions: AISuggestion[] = [];
  const diffRegex = /<<<<<<< SEARCH\s*([\s\S]*?)\s*=======\s*([\s\S]*?)\s*>>>>>>> REPLACE/gs;
  
  let lastIndex = 0;
  let match;

  while ((match = diffRegex.exec(aiOutput)) !== null) {
    const explanation = aiOutput.substring(lastIndex, match.index).trim();
    const searchBlock = match[1].trim();
    const replaceBlock = match[2].trim();
    
    suggestions.push({
      explanation: explanation,
      searchBlock: searchBlock,
      replaceBlock: replaceBlock,
    });
    lastIndex = diffRegex.lastIndex;
  }

  // If there's remaining text after the last diff block, it's considered part of the last explanation or a general comment
  if (lastIndex < aiOutput.length) {
    const remainingExplanation = aiOutput.substring(lastIndex).trim();
    if (remainingExplanation) {
      if (suggestions.length > 0) {
        // Append to last suggestion's explanation if it didn't end with a diff
        const lastSuggestion = suggestions[suggestions.length - 1];
        if (!lastSuggestion.searchBlock && !lastSuggestion.replaceBlock) {
             lastSuggestion.explanation = (lastSuggestion.explanation + "\n\n" + remainingExplanation).trim();
        } else if (suggestions[suggestions.length -1].explanation === '' && !suggestions[suggestions.length -1].searchBlock) {
            // If the last suggestion was just a diff block with no preceding explanation, this might be its explanation
            suggestions[suggestions.length -1].explanation = remainingExplanation;
        }
         else {
            suggestions.push({ explanation: remainingExplanation });
        }
      } else {
        suggestions.push({ explanation: remainingExplanation });
      }
    }
  }
  
  // If no diffs were found, the whole output is an explanation
  if (suggestions.length === 0 && aiOutput.trim()) {
    suggestions.push({ explanation: aiOutput.trim() });
  }

  return suggestions.filter(s => s.explanation.trim() || (s.searchBlock && s.replaceBlock));
};


export const applyParsedDiffs = (originalCode: string, suggestions: AISuggestion[]): string => {
  let modifiedCode = originalCode;
  suggestions.forEach(suggestion => {
    if (suggestion.searchBlock && suggestion.replaceBlock) {
      // Basic string replacement. For robustness, more advanced diff patching would be needed.
      // This simple replace might fail if searchBlock occurs multiple times or has subtle differences.
      // For a demo, this is a simplified approach.
      const searchStr = suggestion.searchBlock;
      // Escape special characters for regex, or use simple string replace
      // Using string replace for simplicity here
      if (modifiedCode.includes(searchStr)) {
         modifiedCode = modifiedCode.replace(searchStr, suggestion.replaceBlock);
      } else {
        // Fallback for slight mismatches (e.g. whitespace differences) - try a more lenient match
        const searchLines = searchStr.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const originalLines = modifiedCode.split('\n');
        
        let matchStartIndex = -1;
        if (searchLines.length > 0) {
          for (let i = 0; i <= originalLines.length - searchLines.length; i++) {
            let potentialMatch = true;
            for (let j = 0; j < searchLines.length; j++) {
              if (originalLines[i + j].trim() !== searchLines[j]) {
                potentialMatch = false;
                break;
              }
            }
            if (potentialMatch) {
              matchStartIndex = i;
              // Attempt to reconstruct the original block with original whitespace
              const matchedOriginalBlock = originalLines.slice(i, i + searchLines.length).join('\n');
              modifiedCode = modifiedCode.replace(matchedOriginalBlock, suggestion.replaceBlock);
              break; 
            }
          }
        }
         if (matchStartIndex === -1) {
             console.warn("Could not apply diff, SEARCH block not found or significantly altered:\n", searchStr);
         }
      }
    }
  });
  return modifiedCode;
};
