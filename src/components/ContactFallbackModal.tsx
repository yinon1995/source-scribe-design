import { CONTACT_EMAIL, CONTACT_WHATSAPP_URL } from "@/config/contactFallback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

type ContactFallbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ContactFallbackModal = ({ open, onOpenChange }: ContactFallbackModalProps) => {
  const navigate = useNavigate();

  function handleEmailClick() {
    window.location.href = `mailto:${CONTACT_EMAIL}`;
    onOpenChange(false);
  }

  function handleWhatsappClick() {
    window.open(CONTACT_WHATSAPP_URL, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  function handleHomeClick() {
    onOpenChange(false);
    navigate("/");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact temporairement indisponible</DialogTitle>
          <DialogDescription>
            Pour le moment, le site ne peut pas encore envoyer de messages directement
            (le domaine n’est pas encore configuré). Vous pouvez quand même nous écrire
            en un clic :
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" onClick={handleEmailClick}>
            Écrire un e-mail
          </Button>
          <Button className="w-full sm:w-auto" variant="secondary" onClick={handleWhatsappClick}>
            Ouvrir WhatsApp
          </Button>
          <Button className="w-full sm:w-auto" variant="ghost" onClick={handleHomeClick}>
            Retour à l’accueil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactFallbackModal;

