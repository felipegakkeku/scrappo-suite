interface WarmupProgressProps {
  progress: number;
  remaining: number;
  message: string;
}

export const WarmupProgress = ({ progress, remaining, message }: WarmupProgressProps) => {
  return (
    <div className="mt-4 rounded-lg border bg-info-bg p-4">
      <div className="mb-2 flex items-center gap-2 font-bold">
        <span>🧰</span>
        <span>Preparando o primeiro ciclo (≈70s)</span>
      </div>
      <p className="mb-3 text-sm">{message}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-background/40">
        <div
          className="h-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Etapa inicial</span>
        <span className="tabular-nums">{remaining}s restantes</span>
      </div>
    </div>
  );
};
