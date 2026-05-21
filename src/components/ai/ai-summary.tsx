// AI summary display component

interface AISummaryProps {
  summary: string;
  keyPoints?: string[];
}

export function AISummary({ summary, keyPoints }: AISummaryProps) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">AI Summary</span>
      </div>
      <p className="text-sm text-muted-foreground">{summary}</p>
      {keyPoints && keyPoints.length > 0 && (
        <ul className="mt-3 list-inside space-y-1">
          {keyPoints.map((point, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              • {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
