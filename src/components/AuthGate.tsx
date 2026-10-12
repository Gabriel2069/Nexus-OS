import { KeyRound, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import type { FormEvent, PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppearanceControls } from "./AppearanceControls";
import { CosmicEnvironment, CosmicLens } from "./CosmicEnvironment";
import { ensureProfile } from "../lib/nexus-api";
import {
  supabase,
  supabasePublishableKey,
  supabaseUrl,
  isDemoMode,
} from "../lib/supabase";

type AuthGateProps = PropsWithChildren;
type BootStage = "connecting" | "session" | "ready";

const bootCopy: Record<
  BootStage,
  { status: string; caption: string; progress: number }
> = {
  connecting: {
    status: "Conectando ao seu espaço",
    caption: "estabelecendo sessão segura",
    progress: 18,
  },
  session: {
    status: "Sincronizando seu espaço",
    caption: "restaurando seu perfil",
    progress: 62,
  },
  ready: {
    status: "Tudo pronto",
    caption: "ambiente preparado",
    progress: 100,
  },
};

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootStage, setBootStage] = useState<BootStage>("connecting");
  const [bootExiting, setBootExiting] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    let alive = true;
    let settled = false;

    const finishBoot = (nextUser: User | null) => {
      if (!alive || settled) return;
      settled = true;
      setUser(nextUser);
      setBootStage(nextUser ? "session" : "ready");
      setLoading(false);
    };

    const timeout = window.setTimeout(() => {
      // watchOS/WebKit can leave Supabase's initial storage/network lookup pending.
      // Never keep the user trapped on the boot screen: fall back to the normal login.
      finishBoot(null);
    }, 4500);

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!alive || settled) return;
        if (data.user) {
          setUser(data.user);
          setBootStage("session");
          try {
            await ensureProfile(data.user);
          } catch (profileError) {
            console.error("Could not ensure NexOS profile", profileError);
          }
        }
        if (alive) {
          settled = true;
          window.clearTimeout(timeout);
          setBootStage("ready");
          setLoading(false);
        }
      })
      .catch((authError) => {
        console.warn(
          "Initial NexOS auth lookup failed; showing login",
          authError,
        );
        finishBoot(null);
        window.clearTimeout(timeout);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!alive) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          setBootStage("session");
          window.setTimeout(() => {
            if (alive)
              void ensureProfile(session.user).catch((profileError) =>
                console.error("Could not ensure NexOS profile", profileError),
              );
          }, 0);
        }
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          setBootStage("ready");
          setLoading(false);
        }
      },
    );

    return () => {
      alive = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setBootStage("ready");
      const frame = window.requestAnimationFrame(() => setBootExiting(true));
      const timeout = window.setTimeout(() => setBootExiting(false), 520);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }
  }, [loading]);

  useEffect(() => {
    if (loading || user || !matchMedia("(pointer: fine)").matches) return;
    const timeout = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      120,
    );
    return () => window.clearTimeout(timeout);
  }, [loading, user]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    if (submitting || pin.length !== 4) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/nexus-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabasePublishableKey,
        },
        body: JSON.stringify({ password: pin }),
      });

      if (response.status === 401) {
        setPin("");
        setError("Senha incorreta.");
        window.setTimeout(() => inputRef.current?.focus(), 40);
        return;
      }
      if (!response.ok) throw new Error("login_unavailable");

      const payload = (await response.json()) as { token_hash?: string };
      if (!payload.token_hash) throw new Error("missing_token");

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: payload.token_hash,
        type: "email",
      });
      if (verifyError || !data.user)
        throw verifyError ?? new Error("missing_user");
      setUser(data.user);
      await ensureProfile(data.user);
    } catch (loginError) {
      console.error("NexOS unlock failed", loginError);
      setPin("");
      setError("Não foi possível abrir o NexOS. Tente novamente.");
      window.setTimeout(() => inputRef.current?.focus(), 40);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || bootExiting) {
    const copy = bootCopy[bootStage];
    return (
      <div
        className={`nexos-boot-screen${bootExiting ? " is-exiting" : ""}`}
        role="status"
        aria-live="polite"
        aria-label="Abrindo NexOS"
      >
        <div className="nexos-boot-stars" aria-hidden="true" />
        <div className="nexos-boot-glow" aria-hidden="true" />
        <div className="nexos-boot-core">
          <div className="nexos-boot-mark" aria-hidden="true">
            <img src="/nexos-mark.svg" alt="" />
          </div>
          <div className="nexos-boot-wordmark">NexOS</div>
          <div className="nexos-boot-status">
            <i aria-hidden="true" />
            <span>{copy.status}</span>
          </div>
          <div className="nexos-boot-progress" aria-hidden="true">
            <span style={{ width: `${copy.progress}%` }} />
          </div>
          <div className="nexos-boot-caption">
            <strong>{copy.progress === 100 ? "Sistema" : "Sessão"}</strong> ·{" "}
            {copy.caption}
          </div>
        </div>
      </div>
    );
  }

  if (user || isDemoMode) return children;

  return (
    <main className="auth-screen nexus-lock-screen">
      <CosmicEnvironment />
      <header className="auth-topbar">
        <a className="auth-brand" href="/" aria-label="NexOS, início">
          <img src="/nexos-mark.svg" alt="" />
          <span>NexOS</span>
        </a>
        <AppearanceControls />
      </header>
      <div className="auth-layout">
        <section className="auth-intro" aria-labelledby="auth-intro-title">
          <span className="eyebrow">Seu observatório pessoal</span>
          <h1 id="auth-intro-title">
            Seu espaço,
            <br />
            em órbita.
          </h1>
          <p>
            Um lugar para cuidar do seu tempo,
            <br className="auth-desktop-break" /> construir caminhos e enxergar
            o próximo passo.
          </p>
          <CosmicLens />
          <span className="auth-coordinate">NEXOS / SISTEMA PESSOAL</span>
        </section>
        <form className="auth-card nexus-lock-card" onSubmit={unlock}>
          <div className="nexus-lock-icon">
            <LockKeyhole size={27} />
          </div>
          <span className="eyebrow">Acesso pessoal</span>
          <h2>Bem-vindo de volta.</h2>
          <p>Entre no seu espaço com sua senha de quatro dígitos.</p>
          <label className="auth-pin-label" htmlFor="nexus-pin">
            Senha pessoal
          </label>
          <label className="nexus-pin-field" htmlFor="nexus-pin">
            <KeyRound size={18} />
            <input
              ref={inputRef}
              id="nexus-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(event) => {
                setError(null);
                setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              aria-label="Senha pessoal, quatro dígitos"
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "auth-error auth-pin-help" : "auth-pin-help"
              }
              minLength={4}
              required
              disabled={submitting}
            />
          </label>
          <small id="auth-pin-help" className="auth-pin-help">
            Use os quatro números da sua senha.
          </small>
          <button
            className="primary-button nexus-unlock-button"
            disabled={submitting || pin.length !== 4}
          >
            {submitting ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <LockKeyhole size={17} />
            )}
            {submitting ? "Abrindo…" : "Entrar"}
          </button>
          {error && (
            <div
              id="auth-error"
              role="alert"
              className="auth-message auth-message--error"
            >
              {error}
            </div>
          )}
          <small className="auth-footnote">
            <ShieldCheck size={13} /> Sessão persistente neste dispositivo.
          </small>
        </form>
      </div>
      <footer className="auth-bottom">
        Um passo de cada vez. Um universo de possibilidades.
      </footer>
    </main>
  );
}
