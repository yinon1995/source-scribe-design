export type Testimonial = {
  id: string;
  name: string;
  company?: string;
  role?: string;
  city?: string;
  rating: number;
  body: string;
  avatarUrl?: string;
  instagramUrl?: string;
  sourceLeadId?: string;
  createdAt: string;
};

export type TestimonialCreateInput = Omit<Testimonial, "id" | "createdAt">;

export function clampRating(value: unknown, fallback = 5): number {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  if (Number.isNaN(num)) {
    return fallback;
  }
  const rounded = Math.round(num);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded;
}


