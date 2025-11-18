import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function AdminBackButton() {
  return (
    <div className="mb-4 flex justify-end">
      <Link to="/admin">
        <Button variant="outline" size="sm">
          ← Retour au tableau de bord
        </Button>
      </Link>
    </div>
  );
}


