import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { ComplaintWithRelations } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wifi,
  Phone,
  MapPin,
  MessageSquare,
  Play,
  CheckCircle,
  RefreshCw,
  LogOut,
  Clock,
  AlertTriangle,
  User,
  Search,
  Loader2,
  Camera,
  X,
  Navigation,
} from "lucide-react";

const complaintTypeLabels: Record<string, string> = {
  no_internet: "No Internet",
  slow_internet: "Slow Internet",
  red_light: "Red Light",
  wire_damage: "Wire Damage",
  modem_dead: "Modem Dead",
  modem_replacement: "Modem Replacement",
  other: "Other",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const typeColors: Record<string, string> = {
  no_internet: "bg-red-100 text-red-700",
  slow_internet: "bg-orange-100 text-orange-700",
  red_light: "bg-pink-100 text-pink-700",
  wire_damage: "bg-purple-100 text-purple-700",
  modem_dead: "bg-gray-100 text-gray-700",
  modem_replacement: "bg-indigo-100 text-indigo-700",
  other: "bg-slate-100 text-slate-700",
};

type SafeUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  allowedModules: string[];
};

export default function AgentPortalPage() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [complaints, setComplaints] = useState<ComplaintWithRelations[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"tracking" | "denied" | "unavailable" | "idle">("idle");
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendLocation = useCallback(async (complaintId?: number) => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationStatus("tracking");
        try {
          await fetch("/api/agent-locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              complaintId: complaintId || null,
            }),
          });
        } catch {}
      },
      (err) => {
        if (err.code === 1) setLocationStatus("denied");
        else setLocationStatus("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    setComplaintsLoading(true);
    try {
      const res = await fetch("/api/complaints", { credentials: "include" });
      if (res.ok) {
        const data: ComplaintWithRelations[] = await res.json();
        const userFullName = (user.fullName || "").trim().toLowerCase();
        const assigned = data.filter((c) => 
          c.assignedTo && c.assignedTo.trim().toLowerCase() === userFullName
        );
        setComplaints(assigned);
      }
    } catch {
    } finally {
      setComplaintsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchComplaints();
      const interval = setInterval(fetchComplaints, 30000);
      
      sendLocation();
      locationIntervalRef.current = setInterval(() => sendLocation(), 60000);
      
      return () => {
        clearInterval(interval);
        if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      };
    }
  }, [user, fetchComplaints, sendLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }
      const data = await res.json();
      setUser(data);
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
    }
    setUser(null);
    setComplaints([]);
  };

  const handleStartWork = async (complaintId: number) => {
    setActionLoading(complaintId);
    try {
      await apiRequest("PATCH", `/api/complaints/${complaintId}`, { status: "in_progress" });
      sendLocation(complaintId);
      await fetchComplaints();
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
    const urls = files.map(f => URL.createObjectURL(f));
    setImagePreviewUrls(prev => [...prev, ...urls]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (!selectedComplaintId) return;
    setActionLoading(selectedComplaintId);
    try {
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        const formData = new FormData();
        selectedImages.forEach(img => formData.append("images", img));
        formData.append("caption", "Complaint resolution photo");
        await fetch(`/api/complaints/${selectedComplaintId}/images`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        setUploadingImages(false);
      }

      await apiRequest("PATCH", `/api/complaints/${selectedComplaintId}/complete`, { resolutionNotes });
      setShowCompleteDialog(false);
      setResolutionNotes("");
      setSelectedComplaintId(null);
      setSelectedImages([]);
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setImagePreviewUrls([]);
      await fetchComplaints();
    } catch {
      setUploadingImages(false);
    } finally {
      setActionLoading(null);
    }
  };

  const today = new Date().toDateString();

  const filteredComplaints = complaints.filter((c) => {
    if (filter === "pending") return c.status === "assigned";
    if (filter === "in_progress") return c.status === "in_progress";
    if (filter === "completed") return c.status === "completed" || c.status === "closed";
    return true;
  }).filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customer?.name?.toLowerCase().includes(q) ||
      c.customer?.contact?.includes(q) ||
      String(c.id).includes(q) ||
      (complaintTypeLabels[c.complaintType] || "").toLowerCase().includes(q)
    );
  });

  const totalAssigned = complaints.length;
  const inProgress = complaints.filter((c) => c.status === "in_progress").length;
  const completedToday = complaints.filter(
    (c) => c.status === "completed" && c.resolvedAt && new Date(c.resolvedAt).toDateString() === today
  ).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Wifi className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Storm Fiber Pattoki</h1>
            <p className="text-blue-200 mt-1">Agent Portal</p>
          </div>
          <Card className="shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-500 text-center">{loginError}</p>
                )}
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-900 text-white px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            <span className="font-semibold text-lg">Agent Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {locationStatus === "tracking" && (
                <span className="flex items-center gap-1 text-xs text-green-300">
                  <Navigation className="h-3 w-3" />
                  <span className="hidden sm:inline">Live</span>
                </span>
              )}
              {locationStatus === "denied" && (
                <span className="flex items-center gap-1 text-xs text-red-300">
                  <Navigation className="h-3 w-3" />
                  <span className="hidden sm:inline">Off</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-200">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.fullName}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-blue-800"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">My Complaints</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchComplaints}
            disabled={complaintsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${complaintsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalAssigned}</div>
              <div className="text-xs text-gray-500">Total Assigned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <div className="text-2xl font-bold text-orange-500">{inProgress}</div>
              <div className="text-xs text-gray-500">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <div className="text-2xl font-bold text-green-600">{completedToday}</div>
              <div className="text-xs text-gray-500">Completed Today</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={filter === tab.key ? "default" : "outline"}
              onClick={() => setFilter(tab.key)}
              className="whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {complaintsLoading && complaints.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No complaints found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-gray-600">#{c.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[c.complaintType] || "bg-gray-100 text-gray-700"}`}>
                        {complaintTypeLabels[c.complaintType] || c.complaintType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColors[c.priority] || "bg-gray-400 text-white"}`}>
                        {c.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || "bg-gray-100 text-gray-800"}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium">{c.customer?.name}</span>
                    </div>
                    {c.customer?.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                        <a href={`tel:${c.customer.contact}`} className="text-sm text-blue-600 underline">
                          {c.customer.contact}
                        </a>
                      </div>
                    )}
                    {c.customer?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">{c.customer.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-500">Registered: {new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    {c.startedAt && (
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-400 shrink-0" />
                        <span className="text-xs text-blue-600">Started: {new Date(c.startedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {c.completedAt && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                        <span className="text-xs text-green-600">Completed: {new Date(c.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {c.description && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{c.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.status === "assigned" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleStartWork(c.id)}
                        disabled={actionLoading === c.id}
                      >
                        {actionLoading === c.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Start
                      </Button>
                    )}
                    {c.status === "in_progress" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setResolutionNotes("");
                          setShowCompleteDialog(true);
                        }}
                        disabled={actionLoading === c.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    {c.customer?.contact && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${c.customer.contact}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </a>
                      </Button>
                    )}
                    {c.customer?.contact && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://wa.me/${c.customer.contact.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          WhatsApp
                        </a>
                      </Button>
                    )}
                    {c.customer?.address && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.customer.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          Navigate
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCompleteDialog} onOpenChange={(open) => {
        setShowCompleteDialog(open);
        if (!open) {
          setSelectedImages([]);
          imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
          setImagePreviewUrls([]);
        }
      }}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Complete Complaint #{selectedComplaintId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe what was done to resolve the issue..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Photos (Optional)</Label>
              <p className="text-xs text-gray-500">Upload modem, device, or location photos (max 5)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {selectedImages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleComplete}
              disabled={actionLoading === selectedComplaintId || uploadingImages}
            >
              {(actionLoading === selectedComplaintId || uploadingImages) && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              {uploadingImages ? "Uploading..." : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
