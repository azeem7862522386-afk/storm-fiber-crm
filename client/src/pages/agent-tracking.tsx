import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, Clock, User, Navigation, Wifi } from "lucide-react";

type AgentLocationData = {
  id: number;
  userId: string;
  fullName: string;
  latitude: string;
  longitude: string;
  accuracy: string | null;
  complaintId: number | null;
  updatedAt: string;
  isOnline: boolean;
};

export default function AgentTrackingPage() {
  const [locations, setLocations] = useState<AgentLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentLocationData | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent-locations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 15000);
    return () => clearInterval(interval);
  }, []);

  const onlineAgents = locations.filter(l => l.isOnline);
  const offlineAgents = locations.filter(l => !l.isOnline);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Agent Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Track your field agents in real-time</p>
        </div>
        <Button onClick={fetchLocations} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{onlineAgents.length}</div>
            <div className="text-sm text-gray-500 mt-1">Online Now</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-gray-400">{offlineAgents.length}</div>
            <div className="text-sm text-gray-500 mt-1">Offline</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{locations.length}</div>
            <div className="text-sm text-gray-500 mt-1">Total Agents Tracked</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Agent Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[500px] rounded-lg overflow-hidden border bg-gray-100">
                <iframe
                  key={locations.map(l => `${l.userId}-${l.updatedAt}`).join(",")}
                  title="Agent Locations Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={(() => {
                    if (onlineAgents.length === 0 && locations.length === 0) {
                      return `https://www.openstreetmap.org/export/embed.html?bbox=73.8,31.0,74.0,31.1&layer=mapnik`;
                    }
                    const agents = onlineAgents.length > 0 ? onlineAgents : locations;
                    if (agents.length === 1) {
                      const a = agents[0];
                      return `https://www.openstreetmap.org/export/embed.html?bbox=${Number(a.longitude)-0.01},${Number(a.latitude)-0.01},${Number(a.longitude)+0.01},${Number(a.latitude)+0.01}&layer=mapnik&marker=${a.latitude},${a.longitude}`;
                    }
                    const lats = agents.map(a => Number(a.latitude));
                    const lngs = agents.map(a => Number(a.longitude));
                    const minLat = Math.min(...lats) - 0.01;
                    const maxLat = Math.max(...lats) + 0.01;
                    const minLng = Math.min(...lngs) - 0.01;
                    const maxLng = Math.max(...lngs) + 0.01;
                    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng},${minLat},${maxLng},${maxLat}&layer=mapnik&marker=${agents[0].latitude},${agents[0].longitude}`;
                  })()}
                  loading="lazy"
                />
                {locations.length === 0 && !loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                    <div className="text-center">
                      <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No agent locations yet</p>
                      <p className="text-xs text-gray-400 mt-1">Agents will appear here when they open their portal</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Agent List
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && locations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading agents...</p>
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No agents tracked yet</p>
                </div>
              ) : (
                <>
                  {onlineAgents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wider">Online</h3>
                      {onlineAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-green-50 ${selectedAgent?.id === agent.id ? "bg-green-50 border-green-300" : ""}`}
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="font-medium text-sm">{agent.fullName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Online</Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatTime(agent.updatedAt)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="h-3 w-3" />
                              {Number(agent.latitude).toFixed(4)}, {Number(agent.longitude).toFixed(4)}
                            </div>
                            {agent.complaintId && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Wifi className="h-3 w-3" />
                                Working on Complaint #{agent.complaintId}
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <a
                              href={`https://www.google.com/maps?q=${agent.latitude},${agent.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Navigation className="h-3 w-3" />
                              Open in Google Maps
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {offlineAgents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">Offline</h3>
                      {offlineAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50"
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-300" />
                              <span className="font-medium text-sm text-gray-500">{agent.fullName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs text-gray-400">Offline</Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              Last seen: {formatTime(agent.updatedAt)}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" />
                              {Number(agent.latitude).toFixed(4)}, {Number(agent.longitude).toFixed(4)}
                            </div>
                          </div>
                          <div className="mt-2">
                            <a
                              href={`https://www.google.com/maps?q=${agent.latitude},${agent.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Navigation className="h-3 w-3" />
                              Last known location
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
