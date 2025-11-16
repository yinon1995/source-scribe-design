import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="py-20">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">Politique de confidentialité (RGPD)</h1>
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground">Responsable du traitement</h2>
              <p>
                À la Brestoise – Nolwenn (Brest, France). Contact via le formulaire du site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Données collectées</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Newsletter</strong> : adresse e-mail.</li>
                <li><strong>Formulaire de contact / devis</strong> : nom, e-mail, société (le cas échéant), message.</li>
                <li><strong>Témoignages</strong> : message, nom, fonction/entreprise (affichés publiquement si soumis).</li>
              </ul>
              <p>
                Les données sont hébergées sur l'infrastructure de Vercel. Selon la configuration, certaines soumissions peuvent être créées <strong>sous forme d'Issues GitHub</strong> dans le dépôt <em>nolwennrobet-lab/source-scribe-design</em> (si des variables d'environnement existent). À défaut, une réponse JSON d'erreur claire est renvoyée.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Finalités</h2>
              <p>
                Gestion de la newsletter, réponse aux demandes (contact/devis), affichage de témoignages, administration technique du site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Bases légales</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Consentement</strong> : inscription à la newsletter et publication de témoignages.</li>
                <li><strong>Intérêt légitime</strong> : sécurité et administration du site.</li>
                <li><strong>Exécution de mesures précontractuelles</strong> : réponses aux demandes envoyées via le formulaire.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Durées de conservation</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Newsletter : jusqu'au désabonnement.</li>
                <li>Messages de contact/devis : <strong>24 mois</strong> maximum.</li>
                <li>Témoignages publics : jusqu'à demande de retrait.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Sous-traitants & destinataires</h2>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Vercel Inc.</strong> (hébergement).</li>
                <li><strong>GitHub Inc.</strong> (si stockage en Issues).</li>
              </ul>
              <p>
                Des transferts hors UE peuvent avoir lieu (États-Unis). Les fournisseurs mentionnés s'engagent à des garanties appropriées (ex. clauses contractuelles types).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Vos droits</h2>
              <p>
                Accès, rectification, effacement, limitation, opposition, portabilité, et directives post-mortem (France).
              </p>
              <p>
                Exercer vos droits : via le formulaire du site.
              </p>
              <p>
                Réclamation : <strong>CNIL</strong> – https://www.cnil.fr
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Cookies & traceurs</h2>
              <p>
                Le site n'implémente <strong>pas</strong> de cookies publicitaires. Des cookies <strong>strictement nécessaires</strong> au fonctionnement technique peuvent être déposés.
              </p>
              <p>
                Aucune solution d'analytics n'est activée à ce jour.
              </p>
              <p>
                Vous pouvez gérer les cookies depuis les préférences de votre navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Sécurité</h2>
              <p>
                Mesures raisonnables sont mises en place pour protéger les données contre l'accès non autorisé.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Mises à jour</h2>
              <p>
                La présente politique peut être modifiée. La date de dernière mise à jour sera indiquée sur cette page.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;


