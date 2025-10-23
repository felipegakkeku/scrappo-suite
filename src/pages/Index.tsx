import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Moon, Sun, BarChart3, Download, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { KPIGrid } from "@/components/crawler/KPIGrid";
import { ProgressBar } from "@/components/crawler/ProgressBar";
import { WarmupProgress } from "@/components/crawler/WarmupProgress";
import { StatusDisplay } from "@/components/crawler/StatusDisplay";

const FORM_KEY = 'scrappo_form_v2';
const HEARTBEAT_INTERVAL_MS = 30000;
const STATUS_POLLING_INTERVAL_MS = 5000;
const WARMUP_SECONDS_DEFAULT = 70;

interface CrawlConfig {
  url: string;
  targetDomain?: string;
  maxDepth: number;
  maxExternalDistinct: number;
  excludeDomains: string[];
  useOAuth2: boolean;
}

interface CrawlStatus {
  visited: number;
  queueLen: number;
  written: number;
  externalSkips: number;
  error?: string;
  currentProcess?: string;
  finished?: boolean;
}

interface UiState {
  isRunning: boolean;
  isPaused: boolean;
  nextRunInSeconds?: number;
  status?: CrawlStatus;
  isStaleLock?: boolean;
  initStatus?: string;
}

const Index = () => {
  const { theme, setTheme } = useTheme();
  const [url, setUrl] = useState("");
  const [targetDomain, setTargetDomain] = useState("");
  const [maxDepth, setMaxDepth] = useState(5);
  const [maxExternalDomains, setMaxExternalDomains] = useState(1);
  const [excludeDomains, setExcludeDomains] = useState("");
  const [useOAuth2, setUseOAuth2] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [status, setStatus] = useState<CrawlStatus>({
    visited: 0,
    queueLen: 0,
    written: 0,
    externalSkips: 0,
  });
  const [statusText, setStatusText] = useState("Pronto para iniciar.");
  const [isBusy, setIsBusy] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [eta, setEta] = useState("ETA —");
  const [progress, setProgress] = useState(0);
  
  const [warmupActive, setWarmupActive] = useState(false);
  const [warmupProgress, setWarmupProgress] = useState(2);
  const [warmupRemaining, setWarmupRemaining] = useState(WARMUP_SECONDS_DEFAULT);
  const [warmupMessage, setWarmupMessage] = useState("ajustando trigger…");
  
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warmupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef({ t: 0, written: 0, ema: 0 });

  // Load form data from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.url) setUrl(data.url);
        if (data.targetDomain) setTargetDomain(data.targetDomain);
        if (data.maxDepth) setMaxDepth(data.maxDepth);
        if (data.maxExternalDomains) setMaxExternalDomains(data.maxExternalDomains);
        if (data.excludeDomains) setExcludeDomains(data.excludeDomains);
        if (data.useOAuth2) setUseOAuth2(data.useOAuth2);
      }
    } catch (e) {
      console.error("Failed to load form data", e);
    }
  }, []);

  // Save form data to localStorage
  const saveForm = () => {
    const data = {
      url,
      targetDomain,
      maxDepth,
      maxExternalDomains,
      excludeDomains,
      useOAuth2,
    };
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save form data", e);
    }
  };

  useEffect(() => {
    saveForm();
  }, [url, targetDomain, maxDepth, maxExternalDomains, excludeDomains, useOAuth2]);

  // Calculate progress percentage
  useEffect(() => {
    const total = Math.max(status.visited + status.queueLen, 1);
    const pct = Math.min(100, Math.round((status.visited / total) * 100));
    setProgress(pct);
  }, [status.visited, status.queueLen]);

  // ETA calculation
  const updateEta = (currentStatus: CrawlStatus) => {
    const now = Date.now();
    const written = currentStatus.written || 0;
    const queue = currentStatus.queueLen || 0;
    const visited = currentStatus.visited || 0;
    const total = Math.max(visited + queue, 0);

    if (total <= 0) {
      setEta("ETA —");
      return;
    }

    if (lastTickRef.current.t === 0) {
      lastTickRef.current = { t: now, written, ema: 0 };
      setEta("ETA —");
      return;
    }

    const dt = Math.max((now - lastTickRef.current.t) / 1000, 0.001);
    const dw = Math.max(written - lastTickRef.current.written, 0);
    const rate = dw / dt;
    const alpha = 0.3;
    lastTickRef.current.ema = alpha * rate + (1 - alpha) * lastTickRef.current.ema;

    const remaining = Math.max(total - written, 0);
    const etaSec = lastTickRef.current.ema > 0 ? Math.round(remaining / lastTickRef.current.ema) : -1;

    const formatEta = (s: number) => {
      if (s < 0) return "—";
      const m = Math.floor(s / 60);
      const ss = s % 60;
      return m > 59 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${ss}s`;
    };

    setEta("ETA " + formatEta(etaSec));
    lastTickRef.current.t = now;
    lastTickRef.current.written = written;
  };

  // Start warmup animation
  const startWarmup = () => {
    setWarmupActive(true);
    setWarmupProgress(2);
    setWarmupRemaining(WARMUP_SECONDS_DEFAULT);
    setWarmupMessage("ajustando trigger…");

    const warmupSteps = [
      { t: 0, msg: 'ajustando trigger…' },
      { t: 10, msg: 'checando permissões…' },
      { t: 20, msg: 'criando fila inicial…' },
      { t: 35, msg: 'buscando sitemaps…' },
      { t: 50, msg: 'preparando workers…' },
      { t: 60, msg: 'iniciando primeira coleta…' },
    ];

    const warmupEndsAt = Date.now() + WARMUP_SECONDS_DEFAULT * 1000;

    const tick = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, warmupEndsAt - now);
      const remaining = Math.ceil(remainingMs / 1000);
      const elapsed = Math.max(0, WARMUP_SECONDS_DEFAULT - remaining);

      let msg = warmupSteps[0].msg;
      for (const step of warmupSteps) {
        if (elapsed >= step.t) msg = step.msg;
        else break;
      }

      setWarmupMessage(msg);
      setWarmupRemaining(remaining);
      const pct = Math.max(2, Math.min(100, Math.round((elapsed / WARMUP_SECONDS_DEFAULT) * 100)));
      setWarmupProgress(pct);

      if (remaining <= 0) {
        stopWarmup();
      }
    };

    tick();
    warmupIntervalRef.current = setInterval(tick, 1000);
  };

  const stopWarmup = () => {
    setWarmupActive(false);
    if (warmupIntervalRef.current) {
      clearInterval(warmupIntervalRef.current);
      warmupIntervalRef.current = null;
    }
  };

  // Mock API calls (replace with actual Google Apps Script calls)
  const mockCheckStatus = async (): Promise<UiState> => {
    // Simulate API call
    return {
      isRunning,
      isPaused: false,
      status,
    };
  };

  const mockStartCrawl = async (config: CrawlConfig) => {
    console.log("Starting crawl with config:", config);
    return { success: true };
  };

  const mockStopCrawl = async () => {
    console.log("Stopping crawl");
    return { success: true };
  };

  const handleStart = async () => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      toast.error("Informe a URL principal.");
      return;
    }

    const config: CrawlConfig = {
      url: normalizedUrl.startsWith('http') ? normalizedUrl : `https://${normalizedUrl}`,
      targetDomain: targetDomain || undefined,
      maxDepth,
      maxExternalDistinct: maxExternalDomains,
      excludeDomains: excludeDomains.split(',').map(s => s.trim()).filter(Boolean),
      useOAuth2,
    };

    try {
      const result = await mockStartCrawl(config);
      if (result.success) {
        setIsRunning(true);
        setShowProgress(true);
        setStatusText("Iniciando");
        setIsBusy(true);
        lastTickRef.current = { t: 0, written: 0, ema: 0 };
        startWarmup();
        startPolling();
        toast.success("Rastreamento iniciado!");
      }
    } catch (error) {
      toast.error("Falha ao iniciar rastreamento.");
      console.error(error);
    }
  };

  const handleStop = async () => {
    try {
      await mockStopCrawl();
      setIsRunning(false);
      stopWarmup();
      stopPolling();
      toast.info("Parada solicitada.");
    } catch (error) {
      toast.error("Falha ao parar rastreamento.");
      console.error(error);
    }
  };

  const handleDashboard = () => {
    toast.info("Dashboard atualizado.");
  };

  const handleExport = () => {
    toast.info("Exportação concluída.");
  };

  const startPolling = () => {
    if (!statusIntervalRef.current) {
      statusIntervalRef.current = setInterval(async () => {
        const uiState = await mockCheckStatus();
        if (uiState.status) {
          setStatus(uiState.status);
          if (isRunning) {
            updateEta(uiState.status);
          }
        }
      }, STATUS_POLLING_INTERVAL_MS);
    }
  };

  const stopPolling = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopWarmup();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        <header className="relative mb-6 text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute right-0 top-0"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Scrappo</span>{" "}
            <span className="font-normal text-foreground">by Saaspro</span>
          </h1>
        </header>

        {!showProgress ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-xl border bg-card p-6 shadow-lg">
              <div className="space-y-2">
                <Label htmlFor="url">URL Principal</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="seusite.com.br"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  autoFocus
                />
              </div>

              <div className="rounded-lg border bg-info-bg p-4">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <span>⏱️</span>
                  <span>Primeiro ciclo leva ~70s</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Durante esse "aquecimento" montamos a fila, ajustamos o trigger e buscamos sitemaps. 
                  Depois disso, os resultados passam a aparecer em ritmo normal.
                </p>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações Avançadas
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetDomain">
                      Domínio Alvo <span className="text-sm text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      id="targetDomain"
                      type="text"
                      value={targetDomain}
                      onChange={(e) => setTargetDomain(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDepth">Profundidade</Label>
                    <Input
                      id="maxDepth"
                      type="number"
                      min="1"
                      max="10"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxExternal">Domínios Externos</Label>
                    <Input
                      id="maxExternal"
                      type="number"
                      min="0"
                      max="10"
                      value={maxExternalDomains}
                      onChange={(e) => setMaxExternalDomains(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exclude">
                      Excluir Domínios <span className="text-sm text-muted-foreground">(separe por vírgulas)</span>
                    </Label>
                    <Textarea
                      id="exclude"
                      value={excludeDomains}
                      onChange={(e) => setExcludeDomains(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2 border-t pt-4">
                    <Checkbox
                      id="oauth"
                      checked={useOAuth2}
                      onCheckedChange={(checked) => setUseOAuth2(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="oauth" className="cursor-pointer font-semibold">
                        Usar OAuth2 (Avançado)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Requer credenciais em Script Properties.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Button onClick={handleStart} className="w-full" size="lg">
              Iniciar Rastreamento
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleDashboard} variant="secondary">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button onClick={handleExport} variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <StatusDisplay
                statusText={statusText}
                isBusy={isBusy}
                countdown={countdown}
              />

              {warmupActive && (
                <WarmupProgress
                  progress={warmupProgress}
                  remaining={warmupRemaining}
                  message={warmupMessage}
                />
              )}

              <KPIGrid
                visited={status.visited}
                queue={status.queueLen}
                written={status.written}
                processed={status.visited + status.written}
                externalSkips={status.externalSkips}
              />

              <ProgressBar progress={progress} eta={eta} />
            </div>

            <Button onClick={handleStop} variant="destructive" className="w-full" size="lg">
              Parar Rastreamento
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleDashboard} variant="secondary">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button onClick={handleExport} variant="secondary">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
