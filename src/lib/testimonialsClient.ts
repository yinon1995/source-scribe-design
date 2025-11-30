import type { Testimonial, TestimonialCreateInput, TestimonialStatus } from "./testimonials";

const API_BASE = ((import.meta as any)?.env?.VITE_API_BASE || "").replace(/\/+$/, "");
const ENDPOINT = `${API_BASE}/api/testimonials`;

type ApiResponse<T> = {
  success: boolean;
  error?: string;
} & T;

function normalizeTestimonials(payload: any): Testimonial[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.testimonials)) return payload.testimonials;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTestimonials(adminToken?: string): Promise<Testimonial[]> {
  try {
    const headers: Record<string, string> = {};
    if (adminToken?.trim()) {
      headers.Authorization = `Bearer ${adminToken.trim()}`;
    }
    const res = await fetch(ENDPOINT, {
      headers,
    });
    const data = await parseJson<any>(res);
    if (!res.ok || !data?.success) {
      // On error, return empty array as requested to prevent crashes
      return [];
    }
    return normalizeTestimonials(data);
  } catch (error: any) {
    // On network/parse error, return empty array
    return [];
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

export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus,
  adminToken: string,
): Promise<{ success: boolean; testimonial?: Testimonial; error?: string }> {
  if (!adminToken?.trim()) {
    return { success: false, error: "Jeton administrateur manquant." };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken.trim()}`,
      },
      body: JSON.stringify({ id, status }),
    });
    const data = await parseJson<ApiResponse<{ testimonial?: Testimonial }>>(res);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || "Impossible de mettre à jour le témoignage." };
    }
    return { success: true, testimonial: data.testimonial };
  } catch (error: any) {
    return { success: false, error: error?.message || "Impossible de mettre à jour le témoignage." };
  }
}


