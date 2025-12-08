import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { type FormEvent, useState, useEffect } from "react";
import { CONTACT_WHATSAPP_URL } from "@/config/contactFallback";
import { createLead } from "@/lib/inboxClient";
import { applySeo } from "@/lib/seo";
import { site } from "@/lib/siteContent";

const Contact = () => {
  useEffect(() => {
    applySeo({
      title: `Contact - ${site.name}`,
      description: "Un projet de collaboration ? Remplissez ce formulaire et je reviendrai vers vous rapidement.",
      canonicalPath: "/contact",
    });
  }, []);

  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState<string | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsQrOpen(false);
    };
    if (isQrOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQrOpen]);

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setCompany("");
    setCity("");
    setBudget("");
    setDeadline("");
    setMessage("");
    setConsent(false);
    setProjectType(undefined);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectType) {
      toast.error("Veuillez sélectionner un type de projet.");
      return;
    }
    if (!consent) {
      toast.error("Merci d’accepter le traitement de vos données.");
      return;
    }
    setLoading(true);
    const result = await createLead({
      category: "contact",
      source: "contact-page",
      email,
      name: fullName,
      message,
      meta: {
        company: company || undefined,
        city: city || undefined,
        projectType,
        budget: budget || undefined,
        deadline: deadline || undefined,
      },
    });
    setLoading(false);
    if (result.success) {
      toast.success("Merci ! Votre demande a bien été enregistrée.");
      resetForm();
      return;
    }
    toast.error(result.error || "Impossible d’envoyer votre demande pour le moment.");
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12 space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Contact professionnel
            </h1>
            <p className="text-lg text-muted-foreground">
              Un projet de collaboration ? Remplissez ce formulaire et je reviendrai vers vous rapidement.
            </p>
            <p className="text-sm text-muted-foreground">
              Besoin d’une réponse rapide ? Écrivez-moi aussi sur{" "}
              <a
                className="underline"
                href={CONTACT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-2xl p-8 md:p-12 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  required
                  className="rounded-lg"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}

                  div>
            div>

            iv className="grid md:grid-cols-2 gap-6">
              iv className="space-y-2">
                abel htmlFor="company">Société</Label>
                nput
                ="company"
                assName="rounded-lg"
                lue={company}
                Change={(e) => setCompany(e.target.value)}
                
              div>

              iv className="space-y-2">
                abel htmlFor="city">Ville</Label>
              nput
              ="city"
              assName="rounded-lg"
              lue={city}
              Change={(e) => setCity(e.target.value)}
                
              div>
            div>

            iv className="space-y-2">
              abel htmlFor="project-type">Type de projet *</Label>
            elect value={projectType} onValueChange={setProjectType}>
                electTrigger id="project-type" className="rounded-lg">
                  electValue placeholder="Sélectionnez un type" />
                SelectTrigger>
                electContent>
                  electItem value="article-beaute">Article beauté</SelectItem>
                  electItem value="ouverture">Ouverture de commerce</SelectItem>
                  electItem value="evenement">Couverture d'événement</SelectItem>
                  electItem value="interview">Interview / Portrait</SelectItem>
                  electItem value = "newsletter" > Newsletter / E - mailing</SelectItem >
    electItem value = "autre" > Autre</SelectItem >
      SelectContent >
      Select >
      div >

      iv className = "grid md:grid-cols-2 gap-6" >
        iv className = "space-y-2" >
          abel htmlFor = "budget" > Budget indicatif</Label >
            iv className = "flex items-center gap-2" >
              nput
                    ="budget"
pe = "number"
putMode = "decimal"
n = { 0}
ep = "1"
aceholder = "Ex : 500"
assName = "rounded-lg"
lue = { budget }
Change = {(e) => setBudget(e.target.value)}
                  
                  pan className = "text-sm text-muted-foreground" >€</span >
  div >
  div >

  iv className = "space-y-2" >
    abel htmlFor = "deadline" > Délai souhaité</Label >
      nput
                  ="deadline"
aceholder = "Ex: Dans 2 semaines"
assName = "rounded-lg"
lue = { deadline }
Change = {(e) => setDeadline(e.target.value)}

div >
  div >

  iv className = "space-y-2" >
    abel htmlFor = "message" > Message *</Label >
      extarea
                ="message"
quired
ws = { 6}
aceholder = "Décrivez votre projet, vos besoins et vos attentes..."
assName = "rounded-lg resize-none"
lue = { message }
Change = {(e) => setMessage(e.target.value)}

div >

  iv className = "flex items-start gap-3" >
    heckbox
                ="consent"
quired
assName = "mt-1"
ecked = { consent }
CheckedChange = {(checked) => setConsent(Boolean(checked))}
              
              abel htmlFor = "consent" className = "text-sm text-muted-foreground leading-relaxed cursor-pointer" >
  accepte que mes données soient collectées et traitées dans le cadre de ma demande.
                nformément au RGPD, vous pouvez exercer vos droits en me contactant.
  Label >
  div >

  utton type = "submit" size = "lg" disabled = { loading } className = "w-full rounded-full bg-primary hover:bg-primary/90" >
    oading ? "Envoi..." : "Envoyer ma demande"}
Button >
  form >

          * Info */}
          iv className = "mt-12 text-center space-y-4" >
  className="text-muted-foreground" >
    lai de réponse: 48h ouvrées maximum
p >
  className="text-sm text-muted-foreground" >
    ur toute question urgente, vous pouvez également me contacter sur les réseaux sociaux.
      p >
      div >

          * QR Code Section */}
          iv className = "mt-16 flex flex-col items-center space-y-4" >
  3 className = "text-lg font-semibold text-foreground" > Scanner le QR Code</h3 >
    className="text-sm text-muted-foreground" > Cliquez pour l’agrandir</p >
      utton
Click = {() => setIsQrOpen(true)}
assName = "relative group transition-transform hover:scale-105 focus:outline-none"
            
              iv className = "bg-white p-4 rounded-xl shadow-sm border border-stone-100" >
  mg
c = "/contact/qr-alabrestoise.png"
t = "QR code À la Brestoise"
assName = "w-32 h-32 md:w-40 md:h-40 object-contain"

div >
  button >
  div >
  div >
      </section >

  <Footer />

{/* QR Modal */ }
{
  isQrOpen && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={() => setIsQrOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-[92vw] max-h-[90vh] bg-white p-4 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsQrOpen(false)}
          className="absolute -top-4 -right-4 bg-white text-stone-900 rounded-full p-2 shadow-lg hover:bg-stone-100 transition-colors"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <img
          src="/contact/qr-alabrestoise.png"
          alt="QR code À la Brestoise"
          className="w-full h-full object-contain max-h-[80vh] max-w-[80vw] md:max-w-md"
        />
      </div>
    </div>
  )
}
    </div >
  );
};

export default Contact;
