import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Wifi, Building2, MapPin, Phone, MessageSquare, Save, Loader2, Send, CheckCircle, XCircle, Settings } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappFrom, setWhatsappFrom] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setWhatsappToken(settings.whatsapp_token || "");
      setWhatsappFrom(settings.whatsapp_from || "");
      setWhatsappEnabled(settings.whatsapp_enabled === "true");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/test-whatsapp", { to: testNumber });
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.sent) {
        toast({ title: "Test message sent successfully!" });
      } else {
        toast({ title: "Test failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    const data: Record<string, string> = {
      whatsapp_from: whatsappFrom,
      whatsapp_enabled: whatsappEnabled ? "true" : "false",
    };
    if (whatsappToken && !whatsappToken.includes("****")) {
      data.whatsapp_token = whatsappToken;
    }
    saveMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 overflow-auto h-full">
      <div className="rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-4 md:p-6 text-white shadow-xl relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dots-settings" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="100%" height="100%" fill="url(#dots-settings)"/></svg>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h1>
              <p className="text-white/70 text-sm">Configure application settings</p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wifi className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Storm Fiber Pattoki</h2>
              <p className="text-sm text-muted-foreground">Internet Service Provider</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Storm Fiber - Pattoki Branch</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Pattoki, Kasur, Punjab, Pakistan</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">0307-8844421 | 0327-0223873</span>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground">
              Storm Fiber Pattoki CRM v1.0 - Customer Management System
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Enable WhatsApp API</p>
              <p className="text-xs text-muted-foreground">
                Send messages directly via API instead of opening WhatsApp links
              </p>
            </div>
            <Switch
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
            />
          </div>

          <div>
            <label className="text-sm font-medium">API Token</label>
            <Input
              type="password"
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              placeholder="Enter your InvoClouds API token"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get your token from invoclouds.com dashboard
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">From Phone Number</label>
            <Input
              value={whatsappFrom}
              onChange={(e) => setWhatsappFrom(e.target.value)}
              placeholder="+923001234567"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your WhatsApp registered number with country code (e.g., +923071234567)
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Settings
            </Button>
          </div>

          <Separator />

          <div>
            <p className="font-medium text-sm mb-2">Test WhatsApp Message</p>
            <div className="flex gap-2">
              <Input
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="03001234567"
                className="max-w-[250px]"
              />
              <Button
                variant="outline"
                onClick={() => { setTestResult(null); testMutation.mutate(); }}
                disabled={testMutation.isPending || !testNumber || !whatsappEnabled}
              >
                {testMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send Test
              </Button>
            </div>
            {!whatsappEnabled && (
              <p className="text-xs text-orange-500 mt-1">Enable WhatsApp API above to send test messages</p>
            )}
            {testResult && (
              <div className={`mt-2 p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success && (testResult as any).sent !== false ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {testResult.success && (testResult as any).sent ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
