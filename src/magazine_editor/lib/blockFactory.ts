import { ArticleBlock, BlockType } from '../types';

export const createBlock = (type: BlockType): ArticleBlock => {
  // Generate a unique ID (timestamp + random suffix for stability)
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
  let content: ArticleBlock['content'] = {};

  switch (type) {
    case 'title':
      content = { title: 'New Headline', subtitle: 'SUBTITLE' };
      break;
    case 'text':
      content = { text: '', layout: 'two_thirds' };
      break;
    case 'image':
      content = { imageUrl: '', layout: 'full', position: 'center', scale: 1.0 };
      break;
    case 'quote':
      content = { quote: 'Quote text here...', author: 'Author Name' };
      break;
    case 'sidebar':
      content = { sidebarItems: [{ heading: 'SECTION', items: ['Item 1'] }] };
      break;
    case 'divider':
      content = { dividerStyle: 'thin', dividerWidth: 'content' };
      break;
  }

  return { id, type, content };
};