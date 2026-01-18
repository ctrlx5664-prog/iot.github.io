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
import { apiUrl } from "@/lib/auth";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: any) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || tr("Erro ao processar pedido", "Error processing request"));
      }

      if (data.success && data.userId) {
        // Navigate to reset password page with userId
        navigate(`/reset-password?userId=${data.userId}&email=${encodeURIComponent(data.email)}`);
      } else {
        // Generic success message (email may not exist)
        setError(tr(
          "Se o email existir no sistema, receberá um código de recuperação.",
          "If the email exists in the system, you will receive a recovery code."
        ));
      }
    } catch (err: any) {
      setError(err?.message || tr("Erro ao processar pedido", "Error processing request"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {tr("Recuperar Palavra-passe", "Reset Password")}
          </CardTitle>
          <CardDescription>
            {tr(
              "Introduza o seu email para receber um código de recuperação.",
              "Enter your email to receive a recovery code."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">{tr("Email", "Email")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            {error && <p className="text-sm text-amber-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tr("A enviar...", "Sending...")}
                </>
              ) : (
                tr("Enviar Código", "Send Code")
              )}
            </Button>
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-3 w-3" />
                {tr("Voltar ao login", "Back to login")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
