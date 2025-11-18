import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Edit, Trash2, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Investigation {
  id: string;
  investigation_id: string;
  related_incident_id: string | null;
  start_date: string;
  assigned_to_id: string | null;
  status: "open" | "in_progress" | "completed" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  description: string | null;
  findings: string | null;
  recommendations: string | null;
  assigned_to?: {
    full_name: string;
  };
  incidents?: {
    title: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
}

export default function Investigations() {
  const { user, loading, companyId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvestigation, setEditingInvestigation] = useState<Investigation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [formData, setFormData] = useState({
    investigation_id: "",
    related_incident_id: "",
    start_date: "",
    assigned_to_id: "",
    status: "open" as "open" | "in_progress" | "completed" | "closed",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    description: "",
    findings: "",
    recommendations: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchInvestigations();
      fetchEmployees();
    }
  }, [companyId]);

  const fetchInvestigations = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("investigations" as any)
        .select(`
          *,
          assigned_to:employees!assigned_to_id(full_name),
          incidents:incidents!related_incident_id(title)
        `)
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setInvestigations((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching investigations:", error);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const generateInvestigationId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const investigationData = {
        company_id: companyId,
        investigation_id: formData.investigation_id || generateInvestigationId(),
        related_incident_id: formData.related_incident_id || null,
        start_date: formData.start_date || new Date().toISOString(),
        assigned_to_id: formData.assigned_to_id === "none" ? null : formData.assigned_to_id || null,
        status: formData.status,
        priority: formData.priority,
        description: formData.description || null,
        findings: formData.findings || null,
        recommendations: formData.recommendations || null,
      };

      if (editingInvestigation) {
        const { error } = await supabase
          .from("investigations" as any)
          .update(investigationData)
          .eq("id", editingInvestigation.id);

        if (error) throw error;
        toast({ title: "Success", description: "Investigation updated successfully" });
      } else {
        const { error } = await supabase
          .from("investigations" as any)
          .insert(investigationData);

        if (error) throw error;
        toast({ title: "Success", description: "Investigation created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInvestigations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save investigation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this investigation?")) return;

    try {
      const { error } = await supabase
        .from("investigations" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Success", description: "Investigation deleted successfully" });
      fetchInvestigations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete investigation",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (investigation: Investigation) => {
    setEditingInvestigation(investigation);
    setFormData({
      investigation_id: investigation.investigation_id,
      related_incident_id: investigation.related_incident_id || "",
      start_date: investigation.start_date,
      assigned_to_id: investigation.assigned_to_id || "none",
      status: investigation.status,
      priority: investigation.priority,
      description: investigation.description || "",
      findings: investigation.findings || "",
      recommendations: investigation.recommendations || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      investigation_id: "",
      related_incident_id: "",
      start_date: "",
      assigned_to_id: "none",
      status: "open",
      priority: "medium",
      description: "",
      findings: "",
      recommendations: "",
    });
    setEditingInvestigation(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      open: { variant: "secondary", label: "Open" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "outline", label: "Completed" },
      closed: { variant: "destructive", label: "Closed" },
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const filteredInvestigations = investigations.filter((investigation) => {
    const matchesSearch = investigation.investigation_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || investigation.status === filterStatus;
    const matchesPriority = filterPriority === "all" || investigation.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Investigations Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 30);
    
    // Prepare table data
    const tableData = filteredInvestigations.map((investigation) => [
      investigation.investigation_id,
      format(new Date(investigation.start_date), "MMM dd, yyyy"),
      investigation.assigned_to?.full_name || "Unassigned",
      investigation.status.charAt(0).toUpperCase() + investigation.status.slice(1),
      investigation.priority.charAt(0).toUpperCase() + investigation.priority.slice(1),
    ]);

    autoTable(doc, {
      head: [["Investigation ID", "Start Date", "Assigned To", "Status", "Priority"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`investigations_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({
      title: "Success",
      description: "PDF exported successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Investigations</h2>
          <p className="text-muted-foreground">
            Manage incident investigations and findings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Investigations</CardTitle>
              <CardDescription>
                Formal investigations for incidents, near-misses, and compliance issues
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToPDF}>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Investigation
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestigation ? "Edit Investigation" : "Create New Investigation"}
                  </DialogTitle>
                  <DialogDescription>
                    Document findings and recommendations from incident investigations
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="investigation_id">Investigation ID</Label>
                      <Input
                        id="investigation_id"
                        value={formData.investigation_id}
                        onChange={(e) => setFormData({ ...formData, investigation_id: e.target.value })}
                        placeholder="Auto-generated if empty"
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_date">Start Date *</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Select
                      value={formData.assigned_to_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assigned_to_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select investigator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Investigation background and scope"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="findings">Findings</Label>
                    <Textarea
                      id="findings"
                      value={formData.findings}
                      onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                      placeholder="Root causes and investigation results"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="recommendations">Recommendations</Label>
                    <Textarea
                      id="recommendations"
                      value={formData.recommendations}
                      onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                      placeholder="Preventive measures and corrective actions"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingInvestigation ? "Update" : "Create"} Investigation
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search investigations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investigation ID</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestigations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No investigations found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvestigations.map((investigation) => (
                    <TableRow key={investigation.id}>
                      <TableCell className="font-medium">{investigation.investigation_id}</TableCell>
                      <TableCell>
                        {format(new Date(investigation.start_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {investigation.assigned_to?.full_name || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(investigation.status)}</TableCell>
                      <TableCell>{getPriorityBadge(investigation.priority)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(investigation)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(investigation.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
