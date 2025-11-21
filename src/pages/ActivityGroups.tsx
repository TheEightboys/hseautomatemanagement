import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Link as LinkIcon,
  Trash2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface ActivityGroup {
  id: string;
  name: string;
  description: string | null;
  hazards: string[] | null;
  required_ppe: string[] | null;
  created_at: string;
}

interface ExposureGroup {
  id: string;
  name: string;
  description: string | null;
  exposure_factors: string[] | null;
  created_at: string;
}

export default function ActivityGroups() {
  const { user, companyId, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [exposureGroups, setExposureGroups] = useState<ExposureGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExposureDialogOpen, setIsExposureDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    ActivityGroup | ExposureGroup | null
  >(null);

  // Form states for Activity Groups
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hazards: "",
    required_ppe: "",
  });

  // Form states for Exposure Groups
  const [exposureFormData, setExposureFormData] = useState({
    name: "",
    description: "",
    exposure_factors: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchActivityGroups();
      fetchExposureGroups();
    }
  }, [companyId]);

  const fetchActivityGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("activity_groups" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityGroups((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching activity groups:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch activity groups",
        variant: "destructive",
      });
    }
  };

  const fetchExposureGroups = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("exposure_groups" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExposureGroups((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching exposure groups:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch exposure groups",
        variant: "destructive",
      });
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const hazardsArray = formData.hazards
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h);
      const ppeArray = formData.required_ppe
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);

      if (editingItem && "hazards" in editingItem) {
        // Update existing
        const { error } = await (supabase as any)
          .from("activity_groups")
          .update({
            name: formData.name,
            description: formData.description || null,
            hazards: hazardsArray.length > 0 ? hazardsArray : null,
            required_ppe: ppeArray.length > 0 ? ppeArray : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity group updated successfully",
        });
      } else {
        // Create new
        const { error } = await supabase.from("activity_groups" as any).insert({
          company_id: companyId,
          name: formData.name,
          description: formData.description || null,
          hazards: hazardsArray.length > 0 ? hazardsArray : null,
          required_ppe: ppeArray.length > 0 ? ppeArray : null,
        } as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Activity group created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchActivityGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save activity group",
        variant: "destructive",
      });
    }
  };

  const handleSubmitExposure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const factorsArray = exposureFormData.exposure_factors
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f);

      if (editingItem && "exposure_factors" in editingItem) {
        // Update existing
        const { error } = await (supabase as any)
          .from("exposure_groups")
          .update({
            name: exposureFormData.name,
            description: exposureFormData.description || null,
            exposure_factors: factorsArray.length > 0 ? factorsArray : null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Exposure group updated successfully",
        });
      } else {
        // Create new
        const { error } = await supabase.from("exposure_groups" as any).insert({
          company_id: companyId,
          name: exposureFormData.name,
          description: exposureFormData.description || null,
          exposure_factors: factorsArray.length > 0 ? factorsArray : null,
        } as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Exposure group created successfully",
        });
      }

      setIsExposureDialogOpen(false);
      resetExposureForm();
      fetchExposureGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save exposure group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity group?"))
      return;

    try {
      const { error } = await supabase
        .from("activity_groups" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Activity group deleted successfully",
      });
      fetchActivityGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete activity group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExposure = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exposure group?"))
      return;

    try {
      const { error } = await supabase
        .from("exposure_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Exposure group deleted successfully",
      });
      fetchExposureGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exposure group",
        variant: "destructive",
      });
    }
  };

  const handleEditActivity = (activity: ActivityGroup) => {
    setEditingItem(activity);
    setFormData({
      name: activity.name,
      description: activity.description || "",
      hazards: activity.hazards?.join(", ") || "",
      required_ppe: activity.required_ppe?.join(", ") || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditExposure = (exposure: ExposureGroup) => {
    setEditingItem(exposure);
    setExposureFormData({
      name: exposure.name,
      description: exposure.description || "",
      exposure_factors: exposure.exposure_factors?.join(", ") || "",
    });
    setIsExposureDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", hazards: "", required_ppe: "" });
    setEditingItem(null);
  };

  const resetExposureForm = () => {
    setExposureFormData({ name: "", description: "", exposure_factors: "" });
    setEditingItem(null);
  };

  const filteredActivityGroups = activityGroups.filter((ag) =>
    ag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExposureGroups = exposureGroups.filter((eg) =>
    eg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="h-9 sm:h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Activity & Exposure Groups
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage work activities and exposure factors for automated risk
              assignment
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activities" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-grid">
          <TabsTrigger value="activities" className="text-xs sm:text-sm">
            Activity Groups (Tätigkeiten)
          </TabsTrigger>
          <TabsTrigger value="exposures" className="text-xs sm:text-sm">
            Exposure Groups
          </TabsTrigger>
        </TabsList>

        {/* Activity Groups Tab */}
        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Groups</CardTitle>
                  <CardDescription>
                    Define work activities that employees perform. Link
                    activities to risks and training requirements for
                    automation.
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={resetForm}
                      className="w-full sm:w-auto text-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Activity Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem
                          ? "Edit Activity Group"
                          : "Create Activity Group"}
                      </DialogTitle>
                      <DialogDescription>
                        Define a work activity with associated hazards and
                        required PPE
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitActivity} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Activity Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g., Welding Operations, Chemical Handling"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Detailed description of the activity"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="hazards">Associated Hazards</Label>
                        <Textarea
                          id="hazards"
                          value={formData.hazards}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hazards: e.target.value,
                            })
                          }
                          placeholder="Enter hazards separated by commas (e.g., Burns, UV exposure, Fumes)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separate multiple hazards with commas
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="ppe">Required PPE</Label>
                        <Textarea
                          id="ppe"
                          value={formData.required_ppe}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              required_ppe: e.target.value,
                            })
                          }
                          placeholder="Enter required PPE separated by commas (e.g., Welding helmet, Gloves, Safety goggles)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separate multiple PPE items with commas
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
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
                          {editingItem ? "Update" : "Create"} Activity Group
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search activity groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hazards</TableHead>
                      <TableHead>Required PPE</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivityGroups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No activity groups found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivityGroups.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-medium">
                            {activity.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {activity.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {activity.hazards &&
                              activity.hazards.length > 0 ? (
                                activity.hazards
                                  .slice(0, 2)
                                  .map((hazard, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      {hazard}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  None
                                </span>
                              )}
                              {activity.hazards &&
                                activity.hazards.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{activity.hazards.length - 2} more
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {activity.required_ppe &&
                              activity.required_ppe.length > 0 ? (
                                activity.required_ppe
                                  .slice(0, 2)
                                  .map((ppe, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {ppe}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  None
                                </span>
                              )}
                              {activity.required_ppe &&
                                activity.required_ppe.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{activity.required_ppe.length - 2} more
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditActivity(activity)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteActivity(activity.id)
                                }
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
        </TabsContent>

        {/* Exposure Groups Tab */}
        <TabsContent value="exposures" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exposure Groups</CardTitle>
                  <CardDescription>
                    Define exposure factors (noise, chemicals, biological
                    agents) that employees may encounter
                  </CardDescription>
                </div>
                <Dialog
                  open={isExposureDialogOpen}
                  onOpenChange={setIsExposureDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={resetExposureForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Exposure Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem
                          ? "Edit Exposure Group"
                          : "Create Exposure Group"}
                      </DialogTitle>
                      <DialogDescription>
                        Define exposure factors for health monitoring and risk
                        assessment
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitExposure} className="space-y-4">
                      <div>
                        <Label htmlFor="exp-name">Exposure Group Name *</Label>
                        <Input
                          id="exp-name"
                          value={exposureFormData.name}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., High Noise Exposure, Chemical Handlers"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp-description">Description</Label>
                        <Textarea
                          id="exp-description"
                          value={exposureFormData.description}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Detailed description of the exposure factors"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="factors">Exposure Factors</Label>
                        <Textarea
                          id="factors"
                          value={exposureFormData.exposure_factors}
                          onChange={(e) =>
                            setExposureFormData({
                              ...exposureFormData,
                              exposure_factors: e.target.value,
                            })
                          }
                          placeholder="Enter exposure factors separated by commas (e.g., Noise >85dB, Solvents, Dust)"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Separate multiple factors with commas
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsExposureDialogOpen(false);
                            resetExposureForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingItem ? "Update" : "Create"} Exposure Group
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search exposure groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exposure Group Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Exposure Factors</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExposureGroups.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No exposure groups found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExposureGroups.map((exposure) => (
                        <TableRow key={exposure.id}>
                          <TableCell className="font-medium">
                            {exposure.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {exposure.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {exposure.exposure_factors &&
                              exposure.exposure_factors.length > 0 ? (
                                exposure.exposure_factors
                                  .slice(0, 3)
                                  .map((factor, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {factor}
                                    </Badge>
                                  ))
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  None
                                </span>
                              )}
                              {exposure.exposure_factors &&
                                exposure.exposure_factors.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{exposure.exposure_factors.length - 3} more
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditExposure(exposure)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeleteExposure(exposure.id)
                                }
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
