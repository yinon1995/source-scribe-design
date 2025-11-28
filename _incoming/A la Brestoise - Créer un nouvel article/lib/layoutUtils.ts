import { ArticleBlock } from '../types';

export type Row = 
  | { kind: 'full'; block: ArticleBlock }
  | { kind: 'split'; left?: ArticleBlock; right?: ArticleBlock };

/**
 * Deterministically builds rows from blocks.
 * Rules:
 * - 'full' blocks take a whole row.
 * - 'left' blocks fit in current row if left slot is empty AND right slot is empty (to preserve order).
 *   Actually, if we have [Left, Right], they can share a row.
 *   If we have [Right, Left], they MUST NOT share a row because Left renders before Right visually, violating data order.
 * - 'right' blocks fit in current row if right slot is empty.
 */
export function buildRows(blocks: ArticleBlock[]): Row[] {
  const rows: Row[] = [];
  let currentRow: { left?: ArticleBlock; right?: ArticleBlock } = {};

  const flush = () => {
    if (currentRow.left || currentRow.right) {
      rows.push({ kind: 'split', ...currentRow });
      currentRow = {};
    }
  };

  blocks.forEach(block => {
    // 1. Resolve effective placement (Backwards compatibility)
    let placement = block.content.placement;
    if (!placement) {
       // Legacy mapping
       const l = block.content.layout || block.content.textLayout;
       if (l === 'left_third') placement = 'left';
       else if (l === 'right_third') placement = 'right';
       // 'two_thirds' or 'middle_third' or undefined -> 'full'
       else placement = 'full';
    }

    if (placement === 'full') {
      flush();
      rows.push({ kind: 'full', block });
    } else if (placement === 'left') {
      // If we insert 'left' now, it will appear visually FIRST in the row.
      // If the row already has a 'right' block, that 'right' block came BEFORE this 'left' block in the array.
      // So visually putting 'left' (new) before 'right' (old) violates reading order.
      // Thus: If right is occupied, we must flush.
      if (currentRow.left || currentRow.right) {
        flush();
        currentRow.left = block;
      } else {
        currentRow.left = block;
      }
    } else if (placement === 'right') {
      // If we insert 'right' now, it appears visually SECOND in the row.
      // If row has 'left', that 'left' came before this 'right', so L->R is correct.
      // If row already has 'right', we can't overwrite, so flush.
      if (currentRow.right) {
        flush();
        currentRow.right = block;
      } else {
        currentRow.right = block;
      }
    }
  });
  
  flush();
  return rows;
}