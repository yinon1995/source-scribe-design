import React from 'react';

export type BlockType = 'title' | 'text' | 'image' | 'sidebar' | 'quote' | 'divider';

export type ImageVariant = 'hero_full' | 'spread_inset_right' | 'grid_left' | 'standard';

export type TextLayout = 'full' | 'left_third' | 'middle_third' | 'right_third' | 'two_thirds';

export interface SidebarItem {
  heading: string;
  items: string[];
}

export interface Reference {
  id: string;
  title: string;
  url?: string;
  publisher?: string;
  date?: string;
}

export interface ArticleSettings {
  headerEnabled: boolean;
  headerText?: string;
  footerEnabled: boolean;
  footerText?: string;
  publishedAt?: string;
  readingTimeMode?: 'auto' | 'manual';
  readingTimeMinutes?: number;
}

export interface BlockContent {
  // Title Block
  title?: string;
  subtitle?: string;
  
  // Generic Layout (Shared by Text & Image)
  layout?: TextLayout; 
  placement?: 'left' | 'right' | 'full';
  
  // Text Block specific
  text?: string;
  dropCap?: boolean;
  heading?: string;
  textLayout?: TextLayout; // Legacy alias for layout

  // Image Block specific
  imageUrl?: string;
  imageFileName?: string;
  caption?: string;
  imageVariant?: ImageVariant; 
  position?: 'left' | 'center' | 'right'; 
  scale?: number; 

  // Sidebar Block
  sidebarItems?: SidebarItem[];

  // Quote Block
  quote?: string;
  author?: string;

  // Divider Block
  dividerStyle?: 'thin' | 'bold' | 'dashed';
  dividerWidth?: 'full' | 'content';
}

export interface ArticleBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
}

export interface PreviewLayoutState {
  order: string[]; // Block IDs in visual order
  placements: Record<string, 'left' | 'right' | 'full'>;
  textAlignments: Record<string, 'left' | 'center' | 'right'>;
  imageSizes: Record<string, 'sm' | 'md' | 'lg' | 'full'>;
  imageAlignments: Record<string, 'left' | 'center' | 'right'>;
}

export interface ArticleRendererProps {
  blocks: ArticleBlock[];
  tags?: string[];
  references?: Reference[];
  settings?: ArticleSettings;
}

export interface AdminBuilderProps {
  blocks: ArticleBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ArticleBlock[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  references: Reference[];
  setReferences: React.Dispatch<React.SetStateAction<Reference[]>>;
  settings: ArticleSettings;
  setSettings: React.Dispatch<React.SetStateAction<ArticleSettings>>;
}