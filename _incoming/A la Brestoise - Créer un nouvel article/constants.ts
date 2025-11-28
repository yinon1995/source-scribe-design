
import { ArticleBlock } from "./types";

export const INITIAL_BLOCKS: ArticleBlock[] = [
  {
    id: "1",
    type: "image",
    content: {
      imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2670&auto=format&fit=crop",
      caption: "The collection, Spring 2024",
      imageVariant: "hero_full",
    },
  },
  {
    id: "2",
    type: "title",
    content: {
      title: "The Architecture of Silence",
      subtitle: "EXPLORING THE QUIET SPACES IN MODERN DESIGN",
    },
  },
  {
    id: "3",
    type: "image",
    content: {
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop",
      caption: "Structural integrity",
      imageVariant: "spread_inset_right",
    },
  },
  {
    id: "5",
    type: "text",
    content: {
      heading: "A New Perspective",
      text: "In a world that never stops talking, the rarest commodity is silence. We fill our days with notifications, podcasts, and endless scrolling, terrified of the moment when the noise stops. But it is in the quiet spaces between thoughts that true creativity is born. Design today attempts to reclaim this void, creating physical manifestations of peace.",
      dropCap: true,
      textLayout: "two_thirds"
    },
  },
  {
    id: "6",
    type: "image",
    content: {
        imageUrl: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?q=80&w=800&auto=format&fit=crop",
        caption: "Minimalist interiors",
        imageVariant: "grid_left"
    }
  },
  {
    id: "7",
    type: "text",
    content: {
        heading: "Materials",
        text: "Concrete, wood, and light form the triad of modern minimalism. Each element speaks not through ornamentation, but through its inherent texture and reaction to the environment.",
        textLayout: "middle_third"
    }
  },
  {
    id: "8",
    type: "sidebar",
    content: {
      sidebarItems: [
        {
          heading: "Exhibition Dates",
          items: ["New York — Oct 12", "London — Nov 04", "Tokyo — Dec 15"],
        },
        {
            heading: "Curators",
            items: ["A. Rossi", "J. Doe", "K. Tanaka"]
        }
      ],
    },
  },
];
