import type { Testimonial as SharedTestimonial, TestimonialCreateInput as SharedTestimonialCreateInput } from "../../shared/testimonials";
import { clampRating } from "../../shared/testimonials";

export type Testimonial = SharedTestimonial;
export type TestimonialCreateInput = SharedTestimonialCreateInput;

export { clampRating };

export function safeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function formatTestimonialLocation(testimonial: Testimonial): string | undefined {
  const parts = [testimonial.company, testimonial.role, testimonial.city].filter((part) => part && part.trim().length > 0);
  if (parts.length === 0) return undefined;
  return parts.join(" • ");
}


