interface KPIGridProps {
  visited: number;
  queue: number;
  written: number;
  processed: number;
  externalSkips: number;
}

export const KPIGrid = ({ visited, queue, written, processed, externalSkips }: KPIGridProps) => {
  return (
    <div className="mt-6 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-primary tabular-nums">{visited}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Visitadas</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-primary tabular-nums">{queue}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Na Fila</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-primary tabular-nums">{written}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Salvas</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-primary tabular-nums">{externalSkips}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Externos</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-2xl font-bold text-primary tabular-nums">{processed}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Processadas</div>
        </div>
      </div>
    </div>
  );
};
