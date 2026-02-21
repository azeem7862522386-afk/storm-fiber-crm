import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wifi, LogIn, Lock, User } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Please enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      setLocation("/");
    } catch (err: any) {
      const msg = err.message?.includes("401")
        ? "Invalid username or password"
        : err.message?.includes("403")
        ? "Account is deactivated. Contact admin."
        : "Login failed. Please try again.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden" data-testid="page-login"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 25%, #1e40af 50%, #3b82f6 75%, #60a5fa 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }} />
      </div>

      <div className="relative w-full max-w-[420px] mx-4">
        <div className="rounded-2xl p-8 md:p-10"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
          }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
              }}
            >
              <Wifi className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="text-login-title">
              Storm Fiber Pattoki
            </h1>
            <p className="text-sm text-blue-200/70 mt-1">CRM Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-blue-100/80 text-xs font-medium uppercase tracking-wider">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/50" />
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  data-testid="input-username"
                  className="pl-10 h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-blue-200/30 focus:border-blue-400/50 focus:bg-white/[0.1] transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-100/80 text-xs font-medium uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/50" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  className="pl-10 h-11 bg-white/[0.07] border-white/[0.12] text-white placeholder:text-blue-200/30 focus:border-blue-400/50 focus:bg-white/[0.1] transition-all"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold transition-all duration-200"
              disabled={loading}
              data-testid="button-login"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: "0 4px 15px rgba(37, 99, 235, 0.4)",
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
            <p className="text-[11px] text-blue-200/30">
              Storm Fiber Internet Services - Pattoki
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
