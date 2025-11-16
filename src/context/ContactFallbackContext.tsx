import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ContactFallbackModal from "@/components/ContactFallbackModal";

type ContactFallbackContextValue = {
  open: boolean;
  openFallback: () => void;
  closeFallback: () => void;
};

const ContactFallbackContext = createContext<ContactFallbackContextValue | undefined>(undefined);

export function ContactFallbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openFallback = useCallback(() => setOpen(true), []);
  const closeFallback = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      open,
      openFallback,
      closeFallback,
    }),
    [open, openFallback, closeFallback],
  );

  return (
    <ContactFallbackContext.Provider value={value}>
      <ContactFallbackModal open={open} onOpenChange={setOpen} />
      {children}
    </ContactFallbackContext.Provider>
  );
}

export function useContactFallback(): ContactFallbackContextValue {
  const ctx = useContext(ContactFallbackContext);
  if (!ctx) {
    throw new Error("useContactFallback must be used within a ContactFallbackProvider");
  }
  return ctx;
}

