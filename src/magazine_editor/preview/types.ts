export type Placement = "left" | "right" | "full";

export interface PreviewLayout {
    order: string[]; // Array of block IDs
    placementById: Record<string, Placement>; // Map of block ID to placement
}
