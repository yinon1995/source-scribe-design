import type { Lead, LeadCreateInput } from "./inboxTypes";

const API_BASE = ((import.meta as any)?.env?.VITE_API_BASE || "").replace(/\/+$/, "");
const INBOX_ENDPOINT = `${API_BASE}/api/inbox`;

type LeadOperationResult<T = void> = {
  success: boolean;
  error?: string;
  lead?: Lead;
  leads?: Lead[];
} & T;

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function createLead(
  input: LeadCreateInput,
): Promise<LeadOperationResult> {
  try {
    const res = await fetch(INBOX_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await parseJson<{ success: boolean; error?: string; lead?: Lead }>(res);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || "Impossible d’enregistrer votre demande.",
      };
    }
    return { success: true, lead: data.lead };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur réseau",
    };
  }
}

export async function fetchLeads(
  adminToken: string,
): Promise<LeadOperationResult<{ leads?: Lead[] }>> {
  if (!adminToken?.trim()) {
    return { success: false, error: "Jeton administrateur manquant." };
  }
  try {
    const res = await fetch(INBOX_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${adminToken.trim()}`,
      },
    });
    const data = await parseJson<{ success: boolean; error?: string; leads?: Lead[] }>(res);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || "Impossible de charger les demandes.",
      };
    }
    return { success: true, leads: data.leads ?? [] };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur réseau",
    };
  }
}

export async function deleteLead(
  id: string,
  adminToken: string,
): Promise<LeadOperationResult> {
  if (!adminToken?.trim()) {
    return { success: false, error: "Jeton administrateur manquant." };
  }
  try {
    const url = `${INBOX_ENDPOINT}?id=${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken.trim()}`,
      },
    });
    const data = await parseJson<{ success: boolean; error?: string }>(res);
    if (!res.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || "Impossible de supprimer la demande.",
      };
    }
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erreur réseau",
    };
  }
}


