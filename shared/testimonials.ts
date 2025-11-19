export type TestimonialStatus = "pending" | "published" | "rejected";

export type Testimonial = {
  id: string;
  createdAt: string;
  status: TestimonialStatus;
  name: string;
  rating: number;
  message: string;
  email?: string | null;
  clientType?: string | null;
  company?: string | null;
  role?: string | null;
  city?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  photos?: string[] | null;
  sourceLeadId?: string | null;
  source?: string | null;
};

export type TestimonialCreateInput = {
  name: string;
  rating: number;
  message: string;
  email?: string | null;
  clientType?: string | null;
  company?: string | null;
  role?: string | null;
  city?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  photos?: string[] | null;
  sourceLeadId?: string | null;
  source?: string | null;
};

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


