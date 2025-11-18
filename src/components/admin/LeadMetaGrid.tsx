import { formatMetaKey } from "@/lib/leadFormatting";

type LeadMetaGridProps = {
  meta?: Record<string, unknown>;
};

const LeadMetaGrid = ({ meta }: LeadMetaGridProps) => {
  if (!meta || Object.keys(meta).length === 0) {
    return null;
  }
  return (
    <div>
      <div className="font-medium">Détails supplémentaires</div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(meta).map(([key, value]) => (
          <div key={key} className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatMetaKey(key)}
            </div>
            <div className="mt-1 break-words whitespace-pre-wrap text-sm font-medium">
              {typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadMetaGrid;


