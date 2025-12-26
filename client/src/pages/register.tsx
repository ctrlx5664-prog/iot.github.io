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

export default function Register() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [resending, setResending] = useState(false);

  async function onSubmitRegister(e: any) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registo falhou");
      }

      if (data.requiresEmailVerification) {
        setRequiresVerification(true);
        setUserId(data.userId);
        setMaskedEmail(data.email);
      } else if (data.token) {
        setToken(data.token);
        navigate("/");
      }
    } catch (err: any) {
      clearToken();
      setError(err?.message || "Registo falhou");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitVerification(e: any) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/verify-email"), {
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
        body: JSON.stringify({ userId, type: "register" }),
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

  if (requiresVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Verificar Email</CardTitle>
            <CardDescription>
              Enviámos um código de 6 dígitos para {maskedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmitVerification}>
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
                  "Verificar Email"
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
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Registe uma nova conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmitRegister}>
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
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar palavra-passe</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A criar...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Já tem conta?{" "}
              <button
                type="button"
                className="text-primary underline hover:text-primary/80"
                onClick={() => navigate("/login")}
              >
                Entre aqui
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
