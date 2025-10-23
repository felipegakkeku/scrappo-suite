interface ProgressBarProps {
  progress: number;
  eta: string;
}

export const ProgressBar = ({ progress, eta }: ProgressBarProps) => {
  return (
    <div className="mt-6">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{progress}%</span>
        <span className="tabular-nums">{eta}</span>
      </div>
    </div>
  );
};
