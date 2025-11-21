import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  AlertTriangle,
  Clock,
  Shield,
  CheckSquare,
  Users,
  Settings as SettingsIcon,
  BookOpen,
  Bell,
  Stethoscope,
  Plug,
  MapPin,
  GitBranch,
  Target,
  Tag,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Settings() {
  const { user, loading, companyId, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("team");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [currentTableName, setCurrentTableName] = useState("");
  const [forceDialogOpen, setForceDialogOpen] = useState(false);

  // State for each master data type
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);
  const [riskCategories, setRiskCategories] = useState<any[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<any[]>([]);
  const [auditCategories, setAuditCategories] = useState<any[]>([]);

  const form = useForm({
    resolver: zodResolver(baseSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchAllData();
      fetchTeamMembers();
      fetchCustomRoles();
    }
  }, [user, loading, navigate, companyId]);

  const fetchAllData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [depts, roles, exposure, risk, training, audit] = await Promise.all(
        [
          supabase.from("departments").select("*").eq("company_id", companyId),
          supabase.from("job_roles").select("*").eq("company_id", companyId),
          supabase
            .from("exposure_groups")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("risk_categories")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("training_types")
            .select("*")
            .eq("company_id", companyId),
          supabase
            .from("audit_categories")
            .select("*")
            .eq("company_id", companyId),
        ]
      );

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(exposure.data || []);
      setRiskCategories(risk.data || []);
      setTrainingTypes(training.data || []);
      setAuditCategories(audit.data || []);
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error loading data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err: unknown) {
      console.error("Error fetching team members:", err);
    }
  };

  const fetchCustomRoles = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .eq("company_id", companyId);

      if (error) throw error;

      // Merge custom roles with predefined ones
      if (data && data.length > 0) {
        const customRolesObj: RolePermissions = {};
        data.forEach((role: any) => {
          customRolesObj[role.role_name] = role.permissions;
        });
        setRoles((prev) => ({ ...prev, ...customRolesObj }));
      }
    } catch (err: unknown) {
      console.error("Error fetching custom roles:", err);
    }
  };

  const handleAddTeamMember = async () => {
    if (!companyId) return;

    if (
      !teamMemberForm.firstName ||
      !teamMemberForm.lastName ||
      !teamMemberForm.email ||
      !teamMemberForm.role
    ) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTeamMember(true);
    try {
      const { data, error } = await (supabase as any)
        .from("team_members")
        .insert([
          {
            company_id: companyId,
            first_name: teamMemberForm.firstName,
            last_name: teamMemberForm.lastName,
            email: teamMemberForm.email,
            role: teamMemberForm.role,
            status: "pending",
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member added successfully",
      });

      // Reset form
      setTeamMemberForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
      });

      // Refresh team members list
      fetchTeamMembers();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAddingTeamMember(false);
    }
  };

  const getTableName = (title: string) => {
    const mapping: Record<string, string> = {
      Departments: "departments",
      "Job Roles": "job_roles",
      "Exposure Groups": "exposure_groups",
      "Hazard Categories": "risk_categories",
      "Training Types": "training_types",
      "Audit Categories": "audit_categories",
    };
    return mapping[title];
  };

  const onSubmit = async (data: unknown) => {
    console.log(
      "onSubmit called with data:",
      data,
      "currentTableName:",
      currentTableName
    );

    if (!companyId || !currentTableName) {
      toast({
        title: "Error",
        description: "Missing required data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const tableName = currentTableName;
      const formData = data as { name: string; description?: string };

      // job_roles table uses 'title' field instead of 'name'
      const usesTitleField = tableName === "job_roles";
      const payload = usesTitleField
        ? { title: formData.name, description: formData.description }
        : { name: formData.name, description: formData.description };

      if (editingItem) {
        // Update existing item
        const { error } = await (supabase as any)
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        // Create new item
        const { error } = await (supabase as any).from(tableName).insert([
          {
            ...payload,
            company_id: companyId,
          },
        ]);

        if (error) throw error;
        toast({ title: "Success", description: "Item created successfully" });
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setCurrentTableName("");
      form.reset();
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.setValue("name", item.name || item.title || "");
    form.setValue("description", item.description || "");
    setForceDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteItem || !companyId) return;

    try {
      const tableName = deleteItem.tableName;
      if (!tableName) {
        toast({
          title: "Error",
          description: "Table name is missing. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", deleteItem.id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteItem(null);
      fetchAllData();
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setCurrentTableName("");
    form.reset();
  };

  // User Roles State
  interface RolePermissions {
    [key: string]: {
      dashboard: boolean;
      employees: boolean;
      healthCheckups: boolean;
      documents: boolean;
      reports: boolean;
      audits: boolean;
      settings: boolean;
    };
  }

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamMemberForm, setTeamMemberForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);

  const [roles, setRoles] = useState<RolePermissions>({
    Admin: {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: true,
    },
    "Line Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: false,
      settings: false,
    },
    "HSE Manager": {
      dashboard: true,
      employees: true,
      healthCheckups: true,
      documents: true,
      reports: true,
      audits: true,
      settings: false,
    },
    Doctor: {
      dashboard: true,
      employees: false,
      healthCheckups: true,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    Employee: {
      dashboard: true,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
    External: {
      dashboard: false,
      employees: false,
      healthCheckups: false,
      documents: true,
      reports: false,
      audits: false,
      settings: false,
    },
  });

  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");

  const permissions = [
    "dashboard",
    "employees",
    "healthCheckups",
    "documents",
    "reports",
    "audits",
    "settings",
  ] as const;

  const togglePermission = async (roleName: string, permission: string) => {
    const newPermissions = {
      ...roles[roleName],
      [permission]:
        !roles[roleName][permission as keyof (typeof roles)[typeof roleName]],
    };

    setRoles((prev) => ({
      ...prev,
      [roleName]: newPermissions,
    }));

    // Auto-save to database
    try {
      if (!companyId) return;

      const { error } = await (supabase as any).from("custom_roles").upsert(
        {
          company_id: companyId,
          role_name: roleName,
          permissions: newPermissions,
          is_predefined: [
            "Admin",
            "Line Manager",
            "HSE Manager",
            "Doctor",
            "Employee",
            "External",
          ].includes(roleName),
        },
        { onConflict: "company_id,role_name" }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Permission updated successfully",
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        title: "Error",
        description: "Failed to update permission",
        variant: "destructive",
      });
    }
  };

  const addCustomRole = async () => {
    if (!customRoleName.trim()) {
      toast({
        title: "Error",
        description: "Role name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (roles[customRoleName]) {
      toast({
        title: "Error",
        description: "Role already exists",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPermissions = {
        dashboard: false,
        employees: false,
        healthCheckups: false,
        documents: false,
        reports: false,
        audits: false,
        settings: false,
      };

      const { error } = await (supabase as any).from("custom_roles").insert([
        {
          company_id: companyId,
          role_name: customRoleName,
          permissions: newPermissions,
          is_predefined: false,
        },
      ]);

      if (error) throw error;

      setRoles((prev) => ({
        ...prev,
        [customRoleName]: newPermissions,
      }));

      setCustomRoleName("");
      setIsAddingCustomRole(false);
      toast({
        title: "Success",
        description: `Role "${customRoleName}" created successfully`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteCustomRole = async (roleName: string) => {
    const predefinedRoles = [
      "Admin",
      "Line Manager",
      "HSE Manager",
      "Doctor",
      "Employee",
      "External",
    ];

    if (predefinedRoles.includes(roleName)) {
      toast({
        title: "Error",
        description: "Cannot delete predefined roles",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) return;

    try {
      const { error } = await supabase
        .from("custom_roles")
        .delete()
        .eq("company_id", companyId)
        .eq("role_name", roleName);

      if (error) throw error;

      setRoles((prev) => {
        const newRoles = { ...prev };
        delete newRoles[roleName];
        return newRoles;
      });

      toast({
        title: "Success",
        description: `Role "${roleName}" deleted successfully`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string } | Error | null;
      const message =
        e && "message" in e && e.message ? e.message : String(err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderUserRolesTab = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("settings.userRoles")}</CardTitle>
            <CardDescription>{t("settings.rolesDesc")}</CardDescription>
          </div>
          <Button onClick={() => setIsAddingCustomRole(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("settings.addRole")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Custom Role Dialog */}
        <Dialog open={isAddingCustomRole} onOpenChange={setIsAddingCustomRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.createRole")}</DialogTitle>
              <DialogDescription>{t("settings.roleDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Input
                  placeholder={t("settings.rolePlaceholder")}
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCustomRole();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingCustomRole(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={addCustomRole}>
                {t("settings.createRole")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Grid */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] sticky left-0 bg-background z-10">
                  {t("settings.role")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.dashboard")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.employees")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.healthCheckups")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.documents")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.reports")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.audits")}
                </TableHead>
                <TableHead className="text-center">
                  {t("settings.settings")}
                </TableHead>
                <TableHead className="text-center">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(roles).map(([roleName, permissions]) => {
                const isPredefined = [
                  "Admin",
                  "Line Manager",
                  "HSE Manager",
                  "Doctor",
                  "Employee",
                  "External",
                ].includes(roleName);

                return (
                  <TableRow key={roleName}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        {roleName}
                        {isPredefined && (
                          <span className="text-xs text-muted-foreground">
                            (Predefined)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.dashboard}
                        onChange={() => togglePermission(roleName, "dashboard")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.employees}
                        onChange={() => togglePermission(roleName, "employees")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.healthCheckups}
                        onChange={() =>
                          togglePermission(roleName, "healthCheckups")
                        }
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.documents}
                        onChange={() => togglePermission(roleName, "documents")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.reports}
                        onChange={() => togglePermission(roleName, "reports")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.audits}
                        onChange={() => togglePermission(roleName, "audits")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={permissions.settings}
                        onChange={() => togglePermission(roleName, "settings")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {!isPredefined && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCustomRole(roleName)}
                              className="h-7 w-7"
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete role</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderTable = (data: any[], title: string) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Manage {title.toLowerCase()} - Used across the system in dropdown
              menus
            </CardDescription>
          </div>
          <Dialog
            open={forceDialogOpen || undefined}
            onOpenChange={(open) => {
              if (!open) {
                handleDialogClose();
                setForceDialogOpen(false);
              } else {
                setForceDialogOpen(true);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  const tableName = getTableName(title);
                  console.log(
                    "Opening dialog for table:",
                    tableName,
                    "with title:",
                    title
                  );
                  setCurrentTableName(tableName);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {title.slice(0, -1)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit" : "Add"} {title.slice(0, -1)}
                </DialogTitle>
                <DialogDescription>
                  {editingItem
                    ? "Update the details below to modify this item."
                    : "Create a new item that will be available in dropdown menus throughout the system."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={`Enter ${title
                              .slice(0, -1)
                              .toLowerCase()} name`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Add additional details or notes..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items found. Click "Add {title.slice(0, -1)}" to create
                    your first entry.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name || item.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCurrentTableName(getTableName(title));
                                handleEdit(item);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDeleteItem({
                                  ...item,
                                  tableName: getTableName(title),
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "
              {deleteItem?.name || deleteItem?.title}". This action cannot be
              undone. Items assigned to employees or other records will be
              unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{t("settings.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("settings.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Vertical Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab("team")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "team"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.team")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.teamDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("user-roles")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "user-roles"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.userRoles")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.rolesDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("configuration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "configuration"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.configuration")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.configDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("catalogs")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "catalogs"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.catalogs")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.catalogsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("intervals")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "intervals"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.intervals")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.intervalsDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("medical-care")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "medical-care"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <div className="text-left">
                      <div>{t("settings.medicalCare")}</div>
                      <div className="text-xs opacity-80">
                        {t("settings.medicalDesc")}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("api-integration")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "api-integration"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Plug className="w-4 h-4" />
                    <div className="text-left">
                      <div>API Integration</div>
                      <div className="text-xs opacity-80">
                        External system connections
                      </div>
                    </div>
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab 1: Team Management */}
              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t("settings.teamManagement")}</CardTitle>
                        <CardDescription>
                          {t("settings.teamManagementDesc")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
                        <div>
                          <Label>{t("settings.firstName")}</Label>
                          <Input
                            placeholder={t("settings.enterFirstName")}
                            value={teamMemberForm.firstName}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("settings.lastName")}</Label>
                          <Input
                            placeholder={t("settings.enterLastName")}
                            value={teamMemberForm.lastName}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("common.email")}</Label>
                          <Input
                            type="email"
                            placeholder={t("settings.enterEmail")}
                            value={teamMemberForm.email}
                            onChange={(e) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>{t("settings.userRole")}</Label>
                          <Select
                            value={teamMemberForm.role}
                            onValueChange={(value) =>
                              setTeamMemberForm((prev) => ({
                                ...prev,
                                role: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("settings.selectRole")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(roles).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 flex justify-end">
                          <Button
                            onClick={handleAddTeamMember}
                            disabled={isAddingTeamMember}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {isAddingTeamMember
                              ? "Adding..."
                              : t("settings.addTeamMember")}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("settings.name")}</TableHead>
                              <TableHead>{t("settings.email")}</TableHead>
                              <TableHead>{t("settings.role")}</TableHead>
                              <TableHead>{t("settings.status")}</TableHead>
                              <TableHead className="text-right">
                                {t("common.actions")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  {t("settings.noTeamMembers")}
                                </TableCell>
                              </TableRow>
                            ) : (
                              teamMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">
                                    {member.first_name} {member.last_name}
                                  </TableCell>
                                  <TableCell>{member.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {member.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        member.status === "active"
                                          ? "default"
                                          : member.status === "pending"
                                          ? "secondary"
                                          : "outline"
                                      }
                                    >
                                      {member.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const { error } = await supabase
                                            .from("team_members")
                                            .delete()
                                            .eq("id", member.id);

                                          if (error) throw error;

                                          toast({
                                            title: "Success",
                                            description:
                                              "Team member removed successfully",
                                          });
                                          fetchTeamMembers();
                                        } catch (err: any) {
                                          toast({
                                            title: "Error",
                                            description: err.message,
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: User Roles (RBAC) */}
              <TabsContent value="user-roles">
                {renderUserRolesTab()}
              </TabsContent>

              {/* Tab 3: Configuration */}
              <TabsContent value="configuration">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Locations
                      </CardTitle>
                      <CardDescription>
                        Manage company locations and sites
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Location management coming soon...
                      </p>
                    </CardContent>
                  </Card>

                  {renderTable(departments, "Departments")}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Approval Process
                      </CardTitle>
                      <CardDescription>
                        Configure approval workflows (Department → Employee)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Approval process configuration coming soon...
                      </p>
                    </CardContent>
                  </Card>

                  {renderTable(exposureGroups, "Exposure Groups")}
                </div>
              </TabsContent>

              {/* Tab 4: Catalogs & Content */}
              <TabsContent value="catalogs">
                <div className="space-y-6">
                  {renderTable(riskCategories, "Hazard Categories")}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Measure Building Blocks
                      </CardTitle>
                      <CardDescription>
                        Define reusable measure templates
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Measure building blocks coming soon...
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Risk Matrix Labels
                      </CardTitle>
                      <CardDescription>
                        Configure risk assessment matrix and severity levels
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Risk matrix configuration coming soon...
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 5: Intervals and Deadlines */}
              <TabsContent value="intervals">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Risk Assessment Intervals
                      </CardTitle>
                      <CardDescription>
                        Set up recurring risk assessment schedules
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Risk assessment interval configuration coming soon...
                      </p>
                    </CardContent>
                  </Card>

                  {renderTable(auditCategories, "Audit Categories")}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Audit Intervals
                      </CardTitle>
                      <CardDescription>
                        Configure audit scheduling and frequency
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Audit interval configuration coming soon...
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notification Logic
                      </CardTitle>
                      <CardDescription>
                        Set up automated notifications and reminders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Notification logic configuration coming soon...
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab 6: Occupational Medical Care */}
              <TabsContent value="medical-care">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      {t("gcode.title")}
                    </CardTitle>
                    <CardDescription>{t("gcode.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { code: "G 1.1", key: "G1.1" },
                          { code: "G 1.2", key: "G1.2" },
                          { code: "G 1.3", key: "G1.3" },
                          { code: "G 1.4", key: "G1.4" },
                          { code: "G 2", key: "G2" },
                          { code: "G 3", key: "G3" },
                          { code: "G 4", key: "G4" },
                          { code: "G 5", key: "G5" },
                          { code: "G 6", key: "G6" },
                          { code: "G 7", key: "G7" },
                          { code: "G 8", key: "G8" },
                          { code: "G 9", key: "G9" },
                          { code: "G 10", key: "G10" },
                          { code: "G 11", key: "G11" },
                          { code: "G 12", key: "G12" },
                          { code: "G 13", key: "G13" },
                          { code: "G 14", key: "G14" },
                          { code: "G 15", key: "G15" },
                          { code: "G 16", key: "G16" },
                          { code: "G 17", key: "G17" },
                          { code: "G 18", key: "G18" },
                          { code: "G 19", key: "G19" },
                          { code: "G 20", key: "G20" },
                          { code: "G 21", key: "G21" },
                          { code: "G 22", key: "G22" },
                          { code: "G 23", key: "G23" },
                          { code: "G 24", key: "G24" },
                          { code: "G 25", key: "G25" },
                          { code: "G 26", key: "G26" },
                          { code: "G 27", key: "G27" },
                          { code: "G 28", key: "G28" },
                          { code: "G 29", key: "G29" },
                          { code: "G 30", key: "G30" },
                          { code: "G 31", key: "G31" },
                          { code: "G 32", key: "G32" },
                          { code: "G 33", key: "G33" },
                          { code: "G 34", key: "G34" },
                          { code: "G 35", key: "G35" },
                          { code: "G 36", key: "G36" },
                          { code: "G 37", key: "G37" },
                          { code: "G 38", key: "G38" },
                          { code: "G 39", key: "G39" },
                          { code: "G 40", key: "G40" },
                          { code: "G 41", key: "G41" },
                          { code: "G 42", key: "G42" },
                          { code: "G 43", key: "G43" },
                          { code: "G 44", key: "G44" },
                          { code: "G 45", key: "G45" },
                          { code: "G 46", key: "G46" },
                        ].map((item) => (
                          <div
                            key={item.code}
                            className="flex items-start space-x-3 p-2 hover:bg-muted/30 rounded"
                          >
                            <input
                              type="checkbox"
                              id={item.code.replace(/\s/g, "-")}
                              className="w-4 h-4 cursor-pointer mt-1 flex-shrink-0"
                            />
                            <label
                              htmlFor={item.code.replace(/\s/g, "-")}
                              className="text-sm cursor-pointer flex-1"
                            >
                              <span className="font-medium">{item.code}</span>{" "}
                              {t(`gcode.${item.key}`)}
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end pt-4 border-t">
                        <Button>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          {t("gcode.saveButton")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 7: API Integration */}
              <TabsContent value="api-integration">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plug className="w-5 h-5" />
                      API Integration
                    </CardTitle>
                    <CardDescription>
                      Connect external systems and manage API access
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="api-token">API Token</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="api-token"
                              type="password"
                              value="••••••••••••••••••••••••••••••••"
                              readOnly
                              className="font-mono"
                            />
                            <Button variant="outline">
                              <Plus className="w-4 h-4 mr-2" />
                              Generate New Token
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use this token to authenticate API requests from
                            external systems
                          </p>
                        </div>

                        <div>
                          <Label>API Documentation</Label>
                          <div className="p-4 border rounded-lg mt-2">
                            <p className="text-sm mb-2">
                              Base URL:{" "}
                              <code className="bg-muted px-2 py-1 rounded">
                                https://api.hsehub.com/v1
                              </code>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              View full API documentation and integration guides
                            </p>
                            <Button variant="link" className="px-0 mt-2">
                              View API Docs →
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label>Connected Systems</Label>
                          <div className="rounded-md border mt-2">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>System Name</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Last Sync</TableHead>
                                  <TableHead className="text-right">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="text-center py-8 text-muted-foreground"
                                  >
                                    No external systems connected yet
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add External System
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
