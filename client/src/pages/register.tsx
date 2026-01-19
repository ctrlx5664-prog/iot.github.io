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
import { useTranslation } from "@/lib/i18n";

export default function Register() {
  const [, navigate] = useLocation();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
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
      setError(tr("As palavras-passe não coincidem", "Passwords do not match"));
      return;
    }

    if (password.length < 6) {
      setError(tr("A palavra-passe deve ter pelo menos 6 caracteres", "Password must be at least 6 characters"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || tr("Registo falhou", "Registration failed"));
      }

      if (data.requiresEmailVerification) {
        setRequiresVerification(true);
        setUserId(data.userId);
        setMaskedEmail(data.email);
      } else if (data.token) {
        setToken(data.token);
        // Force page reload to re-initialize auth state
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      clearToken();
      setError(err?.message || tr("Registo falhou", "Registration failed"));
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
        throw new Error(data.error || tr("Código inválido", "Invalid code"));
      }

      if (data.token) {
        setToken(data.token);
        // Force page reload to re-initialize auth state
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || tr("Verificação falhou", "Verification failed"));
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
        throw new Error(data.error || tr("Falha ao reenviar", "Failed to resend"));
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
            <CardTitle>{tr("Verificar Email", "Verify Email")}</CardTitle>
            <CardDescription>
              {tr("Enviámos um código de 6 dígitos para", "We sent a 6-digit code to")} {maskedEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmitVerification}>
              <div className="space-y-2">
                <label className="text-sm font-medium">{tr("Código de Verificação", "Verification Code")}</label>
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
                    {tr("A verificar...", "Verifying...")}
                  </>
                ) : (
                  tr("Verificar Email", "Verify Email")
                )}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={resendCode}
                  disabled={resending}
                >
                  {resending ? tr("A enviar...", "Sending...") : tr("Reenviar código", "Resend code")}
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
          <CardTitle>{tr("Criar Conta", "Create Account")}</CardTitle>
          <CardDescription>{tr("Registe uma nova conta.", "Register a new account.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmitRegister}>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr("Nome de utilizador", "Username")}</label>
              <Input
                value={username}
                onChange={(e: any) => setUsername(e.target.value)}
                placeholder={tr("utilizador", "username")}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr("Email (opcional)", "Email (optional)")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder={tr("email@exemplo.com (opcional)", "email@example.com (optional)")}
              />
              <p className="text-xs text-muted-foreground">
                {tr("Se não fornecer um email, não precisará de verificação por email para iniciar sessão.", "If you don't provide an email, you won't need email verification to log in.")}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr("Palavra-passe", "Password")}</label>
              <Input
                type="password"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr("Confirmar palavra-passe", "Confirm password")}</label>
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
                  {tr("A criar...", "Creating...")}
                </>
              ) : (
                tr("Criar Conta", "Create Account")
              )}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {tr("Já tem conta?", "Already have an account?")}{" "}
              <button
                type="button"
                className="text-primary underline hover:text-primary/80"
                onClick={() => navigate("/login")}
              >
                {tr("Entre aqui", "Login here")}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
