import type { Testimonial, TestimonialCreateInput } from "./testimonials";

const API_BASE = ((import.meta as any)?.env?.VITE_API_BASE || "").replace(/\/+$/, "");
const ENDPOINT = `${API_BASE}/api/testimonials`;

type ApiResponse<T> = {
  success: boolean;
  error?: string;
} & T;

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(ENDPOINT);
    const data = await parseJson<ApiResponse<{ testimonials?: Testimonial[] }>>(res);
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Impossible de charger les témoignages.");
    }
    return data.testimonials ?? [];
  } catch (error: any) {
    throw new Error(error?.message || "Impossible de charger les témoignages.");
  }
}

export async function createTestimonial(
  input: TestimonialCreateInput,
  adminToken: string,
): Promise<{ success: boolean; testimonial?: Testimonial; error?: string }> {
  if (!adminToken?.trim()) {
    return { success: false, error: "Jeton administrateur manquant." };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken.trim()}`,
      },
      body: JSON.stringify(input),
    });
    const data = await parseJson<ApiResponse<{ testimonial?: Testimonial }>>(res);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "Impossible d’ajouter le témoignage." };
    }
    return { success: true, testimonial: data.testimonial };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impossible d’ajouter le témoignage." };
  }
}

export async function deleteTestimonial(
  id: string,
  adminToken: string,
): Promise<{ success: boolean; error?: string }> {
  if (!adminToken?.trim()) {
    return { success: false, error: "Jeton administrateur manquant." };
  }
  try {
    const url = `${ENDPOINT}?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken.trim()}`,
      },
    });
    const data = await parseJson<ApiResponse<Record<string, never>>>(res);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "Impossible de supprimer le témoignage." };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impossible de supprimer le témoignage." };
  }
}


