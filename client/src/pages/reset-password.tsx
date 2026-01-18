import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiUrl } from "@/lib/auth";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const userIdParam = params.get("userId");
    const emailParam = params.get("email");
    
    if (!userIdParam) {
      navigate("/forgot-password");
      return;
    }
    
    setUserId(userIdParam);
    setMaskedEmail(emailParam);
  }, [search, navigate]);

  async function onSubmit(e: any) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(tr("As passwords não coincidem", "Passwords don't match"));
      return;
    }

    if (newPassword.length < 6) {
      setError(tr("A password deve ter pelo menos 6 caracteres", "Password must be at least 6 characters"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          code: verificationCode,
          newPassword 
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || tr("Erro ao redefinir password", "Error resetting password"));
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || tr("Erro ao redefinir password", "Error resetting password"));
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/resend-reset-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">
                {tr("Password Alterada!", "Password Changed!")}
              </h2>
              <p className="text-muted-foreground">
                {tr(
                  "A sua password foi alterada com sucesso. Será redirecionado para o login...",
                  "Your password has been changed successfully. You will be redirected to login..."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {tr("Nova Palavra-passe", "New Password")}
          </CardTitle>
          <CardDescription>
            {tr("Enviámos um código de 6 dígitos para", "We sent a 6-digit code to")} {maskedEmail}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {tr("Código de Verificação", "Verification Code")}
              </label>
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {tr("Nova Password", "New Password")}
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e: any) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {tr("Confirmar Password", "Confirm Password")}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading || verificationCode.length !== 6 || !newPassword || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tr("A alterar...", "Changing...")}
                </>
              ) : (
                tr("Alterar Password", "Change Password")
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
            
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => navigate("/forgot-password")}
              >
                {tr("← Usar outro email", "← Use another email")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
