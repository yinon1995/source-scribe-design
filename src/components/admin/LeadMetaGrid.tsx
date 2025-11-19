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
              {renderMetaValue(key, value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadMetaGrid;

function renderMetaValue(key: string, value: unknown) {
  if (isImageDataUrl(value)) {
    return (
      <img
        src={value}
        alt={`Meta ${key}`}
        className="h-16 w-16 rounded-md object-cover border"
      />
    );
  }
  if (Array.isArray(value) && value.every(isImageDataUrl)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((src, index) => (
          <img
            key={`${key}-${index}`}
            src={src}
            alt={`Meta ${key} ${index + 1}`}
            className="h-16 w-16 rounded-md object-cover border"
          />
        ))}
      </div>
    );
  }
  if (typeof value === "object" && value !== null) {
    return (
      <pre className="max-h-48 overflow-auto rounded border bg-background/50 p-2 text-xs leading-tight">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (value === undefined || value === null) return "—";
  return String(value);
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}


