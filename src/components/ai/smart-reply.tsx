// Smart reply component

interface SmartReplyProps {
  suggestions: Array<{ content: string; tone: string }>;
  onSelect: (content: string) => void;
}

export function SmartReply({ suggestions, onSelect }: SmartReplyProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Smart Reply</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.content)}
            className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            {s.content}
          </button>
        ))}
      </div>
    </div>
  );
}
