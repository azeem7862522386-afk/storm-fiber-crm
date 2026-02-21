import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { NetworkArea, InfraPoint, InfraSplitter, FiberCable, NetworkOnu, Customer } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Network,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Search,
  MapPin,
  Cable,
  Router,
  Layers,
  Settings2,
} from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const pointTypeLabels: Record<string, string> = {
  geometry_box: "Geometry Box",
  fat_box: "FAT Box",
  splice_closure: "Splice Closure",
  joint_closure: "Joint Closure",
  pole: "Pole",
  olt: "OLT",
  odb: "ODB",
  manhole: "Manhole",
  other: "Other",
};

const pointTypeColors: Record<string, string> = {
  geometry_box: "#3b82f6",
  fat_box: "#8b5cf6",
  splice_closure: "#f59e0b",
  joint_closure: "#ef4444",
  pole: "#6b7280",
  olt: "#10b981",
  odb: "#06b6d4",
  manhole: "#78716c",
  other: "#a3a3a3",
};

const splitterPortMap: Record<string, number> = {
  "1:2": 2,
  "1:4": 4,
  "1:8": 8,
  "1:16": 16,
  "1:32": 32,
};

type InfraPointWithRelations = InfraPoint & {
  area: NetworkArea | null;
  splitters: InfraSplitter[];
  onus: NetworkOnu[];
};

type FiberCableWithRelations = FiberCable & {
  fromPoint: InfraPoint | null;
  toPoint: InfraPoint | null;
};

type OnuWithRelations = NetworkOnu & {
  customer: Customer | null;
  point: InfraPoint | null;
};

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function NetworkInfrastructurePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("areas");
  const [searchTerm, setSearchTerm] = useState("");

  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<NetworkArea | null>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<number | null>(null);
  const [areaForm, setAreaForm] = useState({ name: "", description: "", totalStreets: 0 });

  const [showPointDialog, setShowPointDialog] = useState(false);
  const [editingPoint, setEditingPoint] = useState<InfraPointWithRelations | null>(null);
  const [deletePointId, setDeletePointId] = useState<number | null>(null);
  const [pointForm, setPointForm] = useState({
    name: "", type: "geometry_box", areaId: "", streetName: "",
    latitude: "", longitude: "", signalDbm: "", description: "",
    installedAt: "", status: "active",
  });

  const [showSplitterDialog, setShowSplitterDialog] = useState(false);
  const [splitterPointId, setSplitterPointId] = useState<number | null>(null);
  const [editingSplitter, setEditingSplitter] = useState<InfraSplitter | null>(null);
  const [deleteSplitterId, setDeleteSplitterId] = useState<number | null>(null);
  const [splitterForm, setSplitterForm] = useState({ type: "1:8", totalPorts: 8, usedPorts: 0, notes: "" });

  const [showCableDialog, setShowCableDialog] = useState(false);
  const [editingCable, setEditingCable] = useState<FiberCableWithRelations | null>(null);
  const [deleteCableId, setDeleteCableId] = useState<number | null>(null);
  const [cableForm, setCableForm] = useState({
    fromPointId: "", toPointId: "", cableType: "", coreCount: 0,
    lengthMeters: 0, description: "", installedAt: "",
  });

  const [showOnuDialog, setShowOnuDialog] = useState(false);
  const [editingOnu, setEditingOnu] = useState<OnuWithRelations | null>(null);
  const [deleteOnuId, setDeleteOnuId] = useState<number | null>(null);
  const [onuForm, setOnuForm] = useState({
    serialNumber: "", macAddress: "", model: "", customerId: "",
    pointId: "", signalDbm: "", installedAt: "", notes: "",
  });
  const [customerSearch, setCustomerSearch] = useState("");

  const [manageSplittersPointId, setManageSplittersPointId] = useState<number | null>(null);

  const { data: stats } = useQuery<{
    areas: number; infraPoints: number; fiberCables: number; onus: number; splitters: number;
  }>({ queryKey: ["/api/network/stats"] });

  const { data: areas = [], isLoading: areasLoading } = useQuery<NetworkArea[]>({
    queryKey: ["/api/network/areas"],
  });

  const { data: infraPointsList = [], isLoading: pointsLoading } = useQuery<InfraPointWithRelations[]>({
    queryKey: ["/api/network/infra-points"],
  });

  const { data: cables = [], isLoading: cablesLoading } = useQuery<FiberCableWithRelations[]>({
    queryKey: ["/api/network/fiber-cables"],
  });

  const { data: onus = [], isLoading: onusLoading } = useQuery<OnuWithRelations[]>({
    queryKey: ["/api/network/onus"],
  });

  const { data: customerResults = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers", customerSearch],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/customers?search=${encodeURIComponent(customerSearch)}`);
      return res.json();
    },
    enabled: customerSearch.length > 0,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/network/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/areas"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/infra-points"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/fiber-cables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/network/onus"] });
  };

  const createAreaMutation = useMutation({
    mutationFn: (data: typeof areaForm) => apiRequest("POST", "/api/network/areas", data),
    onSuccess: () => { invalidateAll(); setShowAreaDialog(false); toast({ title: "Area added" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof areaForm> }) =>
      apiRequest("PATCH", `/api/network/areas/${id}`, data),
    onSuccess: () => { invalidateAll(); setShowAreaDialog(false); setEditingArea(null); toast({ title: "Area updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/network/areas/${id}`),
    onSuccess: () => { invalidateAll(); setDeleteAreaId(null); toast({ title: "Area deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createPointMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/network/infra-points", data),
    onSuccess: () => { invalidateAll(); setShowPointDialog(false); toast({ title: "Infrastructure point added" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updatePointMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/network/infra-points/${id}`, data),
    onSuccess: () => { invalidateAll(); setShowPointDialog(false); setEditingPoint(null); toast({ title: "Point updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePointMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/network/infra-points/${id}`),
    onSuccess: () => { invalidateAll(); setDeletePointId(null); toast({ title: "Point deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createSplitterMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/network/splitters", data),
    onSuccess: () => { invalidateAll(); setShowSplitterDialog(false); toast({ title: "Splitter added" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSplitterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/network/splitters/${id}`, data),
    onSuccess: () => { invalidateAll(); setShowSplitterDialog(false); setEditingSplitter(null); toast({ title: "Splitter updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSplitterMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/network/splitters/${id}`),
    onSuccess: () => { invalidateAll(); setDeleteSplitterId(null); toast({ title: "Splitter deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createCableMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/network/fiber-cables", data),
    onSuccess: () => { invalidateAll(); setShowCableDialog(false); toast({ title: "Fiber cable added" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/network/fiber-cables/${id}`, data),
    onSuccess: () => { invalidateAll(); setShowCableDialog(false); setEditingCable(null); toast({ title: "Cable updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCableMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/network/fiber-cables/${id}`),
    onSuccess: () => { invalidateAll(); setDeleteCableId(null); toast({ title: "Cable deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createOnuMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/network/onus", data),
    onSuccess: () => { invalidateAll(); setShowOnuDialog(false); toast({ title: "ONU device added" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateOnuMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/network/onus/${id}`, data),
    onSuccess: () => { invalidateAll(); setShowOnuDialog(false); setEditingOnu(null); toast({ title: "ONU updated" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteOnuMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/network/onus/${id}`),
    onSuccess: () => { invalidateAll(); setDeleteOnuId(null); toast({ title: "ONU deleted" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openAddArea() {
    setAreaForm({ name: "", description: "", totalStreets: 0 });
    setEditingArea(null);
    setShowAreaDialog(true);
  }

  function openEditArea(area: NetworkArea) {
    setEditingArea(area);
    setAreaForm({ name: area.name, description: area.description || "", totalStreets: area.totalStreets });
    setShowAreaDialog(true);
  }

  function handleAreaSubmit() {
    if (!areaForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editingArea) {
      updateAreaMutation.mutate({ id: editingArea.id, data: areaForm });
    } else {
      createAreaMutation.mutate(areaForm);
    }
  }

  function openAddPoint() {
    setPointForm({ name: "", type: "geometry_box", areaId: "", streetName: "", latitude: "", longitude: "", signalDbm: "", description: "", installedAt: "", status: "active" });
    setEditingPoint(null);
    setShowPointDialog(true);
  }

  function openEditPoint(p: InfraPointWithRelations) {
    setEditingPoint(p);
    setPointForm({
      name: p.name, type: p.type, areaId: p.areaId ? String(p.areaId) : "",
      streetName: p.streetName || "", latitude: p.latitude || "", longitude: p.longitude || "",
      signalDbm: p.signalDbm || "", description: p.description || "",
      installedAt: p.installedAt || "", status: p.status,
    });
    setShowPointDialog(true);
  }

  function handlePointSubmit() {
    if (!pointForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const data: any = { ...pointForm, areaId: pointForm.areaId ? Number(pointForm.areaId) : null };
    if (editingPoint) {
      updatePointMutation.mutate({ id: editingPoint.id, data });
    } else {
      createPointMutation.mutate(data);
    }
  }

  function openAddSplitter(pointId: number) {
    setSplitterPointId(pointId);
    setEditingSplitter(null);
    setSplitterForm({ type: "1:8", totalPorts: 8, usedPorts: 0, notes: "" });
    setShowSplitterDialog(true);
  }

  function openEditSplitter(s: InfraSplitter) {
    setSplitterPointId(s.pointId);
    setEditingSplitter(s);
    setSplitterForm({ type: s.type, totalPorts: s.totalPorts, usedPorts: s.usedPorts, notes: s.notes || "" });
    setShowSplitterDialog(true);
  }

  function handleSplitterSubmit() {
    const data = { ...splitterForm, pointId: splitterPointId };
    if (editingSplitter) {
      updateSplitterMutation.mutate({ id: editingSplitter.id, data });
    } else {
      createSplitterMutation.mutate(data);
    }
  }

  function openAddCable() {
    setCableForm({ fromPointId: "", toPointId: "", cableType: "", coreCount: 0, lengthMeters: 0, description: "", installedAt: "" });
    setEditingCable(null);
    setShowCableDialog(true);
  }

  function openEditCable(c: FiberCableWithRelations) {
    setEditingCable(c);
    setCableForm({
      fromPointId: c.fromPointId ? String(c.fromPointId) : "",
      toPointId: c.toPointId ? String(c.toPointId) : "",
      cableType: c.cableType || "", coreCount: c.coreCount || 0,
      lengthMeters: c.lengthMeters || 0, description: c.description || "",
      installedAt: c.installedAt || "",
    });
    setShowCableDialog(true);
  }

  function handleCableSubmit() {
    const data: any = {
      ...cableForm,
      fromPointId: cableForm.fromPointId ? Number(cableForm.fromPointId) : null,
      toPointId: cableForm.toPointId ? Number(cableForm.toPointId) : null,
    };
    if (editingCable) {
      updateCableMutation.mutate({ id: editingCable.id, data });
    } else {
      createCableMutation.mutate(data);
    }
  }

  function openAddOnu() {
    setOnuForm({ serialNumber: "", macAddress: "", model: "", customerId: "", pointId: "", signalDbm: "", installedAt: "", notes: "" });
    setEditingOnu(null);
    setCustomerSearch("");
    setShowOnuDialog(true);
  }

  function openEditOnu(o: OnuWithRelations) {
    setEditingOnu(o);
    setOnuForm({
      serialNumber: o.serialNumber || "", macAddress: o.macAddress || "", model: o.model || "",
      customerId: o.customerId ? String(o.customerId) : "", pointId: o.pointId ? String(o.pointId) : "",
      signalDbm: o.signalDbm || "", installedAt: o.installedAt || "", notes: o.notes || "",
    });
    setCustomerSearch("");
    setShowOnuDialog(true);
  }

  function handleOnuSubmit() {
    const data: any = {
      ...onuForm,
      customerId: onuForm.customerId ? Number(onuForm.customerId) : null,
      pointId: onuForm.pointId ? Number(onuForm.pointId) : null,
    };
    if (editingOnu) {
      updateOnuMutation.mutate({ id: editingOnu.id, data });
    } else {
      createOnuMutation.mutate(data);
    }
  }

  const filteredAreas = areas.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPoints = infraPointsList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.streetName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.area?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCables = cables.filter(c =>
    (c.fromPoint?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.toPoint?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cableType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOnus = onus.filter(o =>
    (o.serialNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.macAddress || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.model || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const managedPoint = manageSplittersPointId ? infraPointsList.find(p => p.id === manageSplittersPointId) : null;

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Network Infrastructure</h1>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.areas}</div>
              <div className="text-xs text-muted-foreground">Total Areas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.infraPoints}</div>
              <div className="text-xs text-muted-foreground">Infra Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.fiberCables}</div>
              <div className="text-xs text-muted-foreground">Fiber Cables</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.onus}</div>
              <div className="text-xs text-muted-foreground">ONU Devices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-4 text-center">
              <div className="text-lg font-bold">{stats.splitters}</div>
              <div className="text-xs text-muted-foreground">Splitters</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="areas"><Layers className="h-4 w-4 mr-1" />Areas</TabsTrigger>
          <TabsTrigger value="points"><MapPin className="h-4 w-4 mr-1" />Infrastructure Points</TabsTrigger>
          <TabsTrigger value="map"><MapPin className="h-4 w-4 mr-1" />Map View</TabsTrigger>
          <TabsTrigger value="cables"><Cable className="h-4 w-4 mr-1" />Fiber Cables</TabsTrigger>
          <TabsTrigger value="onus"><Router className="h-4 w-4 mr-1" />ONU Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddArea}><Plus className="h-4 w-4 mr-1" />Add Area</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Total Streets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areasLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredAreas.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No areas found.</TableCell></TableRow>
                  ) : filteredAreas.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.description || "-"}</TableCell>
                      <TableCell className="text-center">{a.totalStreets}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditArea(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteAreaId(a.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddPoint}><Plus className="h-4 w-4 mr-1" />Add Point</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Street</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Signal (dBm)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Splitters</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointsLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredPoints.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No infrastructure points found.</TableCell></TableRow>
                  ) : filteredPoints.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: pointTypeColors[p.type] || "#999" }}>
                          {pointTypeLabels[p.type] || p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.streetName || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.area?.name || "-"}</TableCell>
                      <TableCell>{p.signalDbm || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" onClick={() => setManageSplittersPointId(p.id)}>
                          {p.splitters?.length || 0}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditPoint(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletePointId(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div style={{ height: "500px" }}>
                <MapContainer center={[30.8044, 73.8529]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {infraPointsList
                    .filter(p => p.latitude && p.longitude)
                    .map(p => (
                      <Marker
                        key={p.id}
                        position={[parseFloat(p.latitude!), parseFloat(p.longitude!)]}
                        icon={createColoredIcon(pointTypeColors[p.type] || "#999")}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{p.name}</div>
                            <div>{pointTypeLabels[p.type] || p.type}</div>
                            {p.streetName && <div>Street: {p.streetName}</div>}
                            {p.signalDbm && <div>Signal: {p.signalDbm} dBm</div>}
                            {p.area?.name && <div>Area: {p.area.name}</div>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cables" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddCable}><Plus className="h-4 w-4 mr-1" />Add Cable</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Point</TableHead>
                    <TableHead>To Point</TableHead>
                    <TableHead>Cable Type</TableHead>
                    <TableHead className="text-center">Core Count</TableHead>
                    <TableHead className="text-center">Length (m)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cablesLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredCables.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No fiber cables found.</TableCell></TableRow>
                  ) : filteredCables.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.fromPoint?.name || "-"}</TableCell>
                      <TableCell>{c.toPoint?.name || "-"}</TableCell>
                      <TableCell>{c.cableType || "-"}</TableCell>
                      <TableCell className="text-center">{c.coreCount || "-"}</TableCell>
                      <TableCell className="text-center">{c.lengthMeters || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditCable(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCableId(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onus" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddOnu}><Plus className="h-4 w-4 mr-1" />Add ONU</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>MAC Address</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Connected Point</TableHead>
                    <TableHead>Signal (dBm)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onusLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredOnus.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No ONU devices found.</TableCell></TableRow>
                  ) : filteredOnus.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium font-mono">{o.serialNumber || "-"}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{o.macAddress || "-"}</TableCell>
                      <TableCell>{o.model || "-"}</TableCell>
                      <TableCell>{o.customer?.name || "-"}</TableCell>
                      <TableCell>{o.point?.name || "-"}</TableCell>
                      <TableCell>{o.signalDbm || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditOnu(o)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOnuId(o.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? "Edit Area" : "Add Area"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} placeholder="Area name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={areaForm.description} onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })} placeholder="Description" />
            </div>
            <div>
              <Label>Total Streets</Label>
              <Input type="number" min={0} value={areaForm.totalStreets} onChange={(e) => setAreaForm({ ...areaForm, totalStreets: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaDialog(false)}>Cancel</Button>
            <Button onClick={handleAreaSubmit} disabled={createAreaMutation.isPending || updateAreaMutation.isPending}>
              {(createAreaMutation.isPending || updateAreaMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingArea ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPointDialog} onOpenChange={setShowPointDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPoint ? "Edit Infrastructure Point" : "Add Infrastructure Point"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Name *</Label>
              <Input value={pointForm.name} onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })} placeholder="Point name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={pointForm.type} onValueChange={(v) => setPointForm({ ...pointForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(pointTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Area</Label>
                <Select value={pointForm.areaId} onValueChange={(v) => setPointForm({ ...pointForm, areaId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
                  <SelectContent>
                    {areas.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Street Name</Label>
              <Input value={pointForm.streetName} onChange={(e) => setPointForm({ ...pointForm, streetName: e.target.value })} placeholder="Street name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input value={pointForm.latitude} onChange={(e) => setPointForm({ ...pointForm, latitude: e.target.value })} placeholder="30.8044" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={pointForm.longitude} onChange={(e) => setPointForm({ ...pointForm, longitude: e.target.value })} placeholder="73.8529" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Signal (dBm)</Label>
                <Input value={pointForm.signalDbm} onChange={(e) => setPointForm({ ...pointForm, signalDbm: e.target.value })} placeholder="-20" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={pointForm.status} onValueChange={(v) => setPointForm({ ...pointForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Installed At</Label>
              <Input type="date" value={pointForm.installedAt} onChange={(e) => setPointForm({ ...pointForm, installedAt: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={pointForm.description} onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPointDialog(false)}>Cancel</Button>
            <Button onClick={handlePointSubmit} disabled={createPointMutation.isPending || updatePointMutation.isPending}>
              {(createPointMutation.isPending || updatePointMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingPoint ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageSplittersPointId !== null} onOpenChange={() => setManageSplittersPointId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Settings2 className="h-4 w-4 inline mr-2" />
              Splitters - {managedPoint?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => manageSplittersPointId && openAddSplitter(manageSplittersPointId)}>
                <Plus className="h-4 w-4 mr-1" />Add Splitter
              </Button>
            </div>
            {managedPoint?.splitters && managedPoint.splitters.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Ports</TableHead>
                    <TableHead className="text-center">Used</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedPoint.splitters.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.type}</TableCell>
                      <TableCell className="text-center">{s.totalPorts}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={s.usedPorts >= s.totalPorts ? "destructive" : "default"}>
                          {s.usedPorts}/{s.totalPorts}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.notes || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditSplitter(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteSplitterId(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No splitters for this point.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSplitterDialog} onOpenChange={setShowSplitterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSplitter ? "Edit Splitter" : "Add Splitter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select
                value={splitterForm.type}
                onValueChange={(v) => setSplitterForm({ ...splitterForm, type: v, totalPorts: splitterPortMap[v] || 8 })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:2">1:2</SelectItem>
                  <SelectItem value="1:4">1:4</SelectItem>
                  <SelectItem value="1:8">1:8</SelectItem>
                  <SelectItem value="1:16">1:16</SelectItem>
                  <SelectItem value="1:32">1:32</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Ports</Label>
                <Input type="number" value={splitterForm.totalPorts} disabled />
              </div>
              <div>
                <Label>Used Ports</Label>
                <Input type="number" min={0} value={splitterForm.usedPorts} onChange={(e) => setSplitterForm({ ...splitterForm, usedPorts: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={splitterForm.notes} onChange={(e) => setSplitterForm({ ...splitterForm, notes: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitterDialog(false)}>Cancel</Button>
            <Button onClick={handleSplitterSubmit} disabled={createSplitterMutation.isPending || updateSplitterMutation.isPending}>
              {(createSplitterMutation.isPending || updateSplitterMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingSplitter ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCableDialog} onOpenChange={setShowCableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCable ? "Edit Fiber Cable" : "Add Fiber Cable"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Point</Label>
                <Select value={cableForm.fromPointId} onValueChange={(v) => setCableForm({ ...cableForm, fromPointId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select point" /></SelectTrigger>
                  <SelectContent>
                    {infraPointsList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Point</Label>
                <Select value={cableForm.toPointId} onValueChange={(v) => setCableForm({ ...cableForm, toPointId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select point" /></SelectTrigger>
                  <SelectContent>
                    {infraPointsList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cable Type</Label>
              <Input value={cableForm.cableType} onChange={(e) => setCableForm({ ...cableForm, cableType: e.target.value })} placeholder="e.g. ADSS, Duct" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Core Count</Label>
                <Input type="number" min={0} value={cableForm.coreCount} onChange={(e) => setCableForm({ ...cableForm, coreCount: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Length (meters)</Label>
                <Input type="number" min={0} value={cableForm.lengthMeters} onChange={(e) => setCableForm({ ...cableForm, lengthMeters: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label>Installed At</Label>
              <Input type="date" value={cableForm.installedAt} onChange={(e) => setCableForm({ ...cableForm, installedAt: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={cableForm.description} onChange={(e) => setCableForm({ ...cableForm, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCableDialog(false)}>Cancel</Button>
            <Button onClick={handleCableSubmit} disabled={createCableMutation.isPending || updateCableMutation.isPending}>
              {(createCableMutation.isPending || updateCableMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCable ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOnuDialog} onOpenChange={setShowOnuDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOnu ? "Edit ONU Device" : "Add ONU Device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serial Number</Label>
                <Input value={onuForm.serialNumber} onChange={(e) => setOnuForm({ ...onuForm, serialNumber: e.target.value })} placeholder="Serial number" />
              </div>
              <div>
                <Label>MAC Address</Label>
                <Input value={onuForm.macAddress} onChange={(e) => setOnuForm({ ...onuForm, macAddress: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
            </div>
            <div>
              <Label>Model</Label>
              <Input value={onuForm.model} onChange={(e) => setOnuForm({ ...onuForm, model: e.target.value })} placeholder="Model name" />
            </div>
            <div>
              <Label>Customer</Label>
              {onuForm.customerId ? (
                <div className="flex items-center justify-between gap-2 p-2 border rounded-md">
                  <span className="text-sm font-medium">
                    {editingOnu?.customer?.name || customerResults.find(c => String(c.id) === onuForm.customerId)?.name || `Customer #${onuForm.customerId}`}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => { setOnuForm({ ...onuForm, customerId: "" }); setCustomerSearch(""); }}>Change</Button>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  {customerSearch && customerResults.length > 0 && (
                    <div className="mt-1 border rounded-md divide-y max-h-32 overflow-y-auto">
                      {customerResults.map(c => (
                        <div
                          key={c.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => { setOnuForm({ ...onuForm, customerId: String(c.id) }); setCustomerSearch(""); }}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground ml-2">{c.contact}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Connected Point</Label>
              <Select value={onuForm.pointId} onValueChange={(v) => setOnuForm({ ...onuForm, pointId: v })}>
                <SelectTrigger><SelectValue placeholder="Select point" /></SelectTrigger>
                <SelectContent>
                  {infraPointsList.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Signal (dBm)</Label>
                <Input value={onuForm.signalDbm} onChange={(e) => setOnuForm({ ...onuForm, signalDbm: e.target.value })} placeholder="-20" />
              </div>
              <div>
                <Label>Installed At</Label>
                <Input type="date" value={onuForm.installedAt} onChange={(e) => setOnuForm({ ...onuForm, installedAt: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={onuForm.notes} onChange={(e) => setOnuForm({ ...onuForm, notes: e.target.value })} placeholder="Notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnuDialog(false)}>Cancel</Button>
            <Button onClick={handleOnuSubmit} disabled={createOnuMutation.isPending || updateOnuMutation.isPending}>
              {(createOnuMutation.isPending || updateOnuMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingOnu ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAreaId !== null} onOpenChange={() => setDeleteAreaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this area. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAreaId && deleteAreaMutation.mutate(deleteAreaId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletePointId !== null} onOpenChange={() => setDeletePointId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Infrastructure Point?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this point and all its splitters and ONU devices. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePointId && deletePointMutation.mutate(deletePointId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSplitterId !== null} onOpenChange={() => setDeleteSplitterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Splitter?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this splitter.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteSplitterId && deleteSplitterMutation.mutate(deleteSplitterId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCableId !== null} onOpenChange={() => setDeleteCableId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fiber Cable?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this cable.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCableId && deleteCableMutation.mutate(deleteCableId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOnuId !== null} onOpenChange={() => setDeleteOnuId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ONU Device?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this ONU device.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteOnuId && deleteOnuMutation.mutate(deleteOnuId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}