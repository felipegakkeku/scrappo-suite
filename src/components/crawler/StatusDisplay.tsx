import { Loader2 } from "lucide-react";

interface StatusDisplayProps {
  statusText: string;
  isBusy: boolean;
  countdown?: number | null;
}

export const StatusDisplay = ({ statusText, isBusy, countdown }: StatusDisplayProps) => {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border bg-muted/50 p-4 text-center font-semibold">
      <span dangerouslySetInnerHTML={{ __html: statusText }} />
      {isBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
    </div>
  );
};
