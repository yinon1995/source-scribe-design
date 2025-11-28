
import { Placement } from '../preview/types';

export const LAYOUT_STORAGE_KEY_PREFIX = 'previewLayout:';

export const getArticleLayout = (articleId: string) => {
  try {
    const raw = localStorage.getItem(`${LAYOUT_STORAGE_KEY_PREFIX}${articleId}`);
    return raw ? JSON.parse(raw) : { order: [], placementById: {} };
  } catch {
    return { order: [], placementById: {} };
  }
};

export const getPlacement = (articleId: string, blockId: string): Placement | null => {
  const layout = getArticleLayout(articleId);
  return layout.placementById[blockId] || null;
};

export const setPlacement = (articleId: string, blockId: string, placement: Placement) => {
  const layout = getArticleLayout(articleId);
  layout.placementById[blockId] = placement;
  
  // Ensure block is in order list if missing
  if (!layout.order.includes(blockId)) {
    layout.order.push(blockId);
  }
  
  localStorage.setItem(`${LAYOUT_STORAGE_KEY_PREFIX}${articleId}`, JSON.stringify(layout));
};
