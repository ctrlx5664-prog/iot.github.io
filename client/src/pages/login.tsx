import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setToken, clearToken, apiUrl } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [resending, setResending] = useState(false);

  async function onSubmitCredentials(e: any) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresEmailVerification) {
          // User needs to verify email first
          navigate(`/verify-email?userId=${data.userId}`);
          return;
        }
        throw new Error(data.error || "Login falhou");
      }

      if (data.requires2FA) {
        // Show 2FA form
        setRequires2FA(true);
        setUserId(data.userId);
        setMaskedEmail(data.email);
      } else if (data.token) {
        setToken(data.token);
        navigate("/");
      }
    } catch (err: any) {
      clearToken();
      setError(err?.message || "Login falhou");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit2FA(e: any) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/verify-2fa"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: verificationCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido");
      }

      if (data.token) {
        setToken(data.token);
        navigate("/");
      }
    } catch (err: any) {
      setError(err?.message || "Verificação falhou");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/resend-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "login" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao reenviar");
      }
    } catch (err: any) {
      setError(err?.message);
    } finally {
      setResending(false);
    }
  }

  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Verificação de Segurança</CardTitle>
            <CardDescription>
              Enviámos um código de 6 dígitos para {maskedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit2FA}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de Verificação</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e: any) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A verificar...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={resendCode}
                  disabled={resending}
                >
                  {resending ? "A enviar..." : "Reenviar código"}
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setRequires2FA(false);
                    setVerificationCode("");
                    setError(null);
                  }}
                >
                  ← Voltar ao login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Introduza as suas credenciais para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmitCredentials}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome de utilizador</label>
              <Input
                value={username}
                onChange={(e: any) => setUsername(e.target.value)}
                placeholder="utilizador"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palavra-passe</label>
              <Input
                type="password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A entrar...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Ainda não tem conta?{" "}
              <button
                type="button"
                className="text-primary underline hover:text-primary/80"
                onClick={() => navigate("/register")}
              >
                Registe-se aqui
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
