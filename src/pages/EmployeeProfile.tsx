import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Upload,
  FileText,
  Download,
  Trash2,
  Heart,
  GraduationCap,
  ClipboardList,
  Plus,
  CalendarCheck,
  StickyNote,
  Tag,
  Users,
  Activity,
} from "lucide-react";

interface EmployeeData {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  hire_date: string | null;
  department_id: string | null;
  job_role_id: string | null;
  exposure_group_id: string | null;
  is_active: boolean;
  departments?: { id: string; name: string } | null;
  job_roles?: { id: string; title: string } | null;
  exposure_groups?: { id: string; name: string } | null;
  notes?: string | null;
  tags?: string[] | null;
}

interface HealthCheckup {
  id: string;
  checkup_date: string;
  status: string;
  notes: string | null;
  next_checkup_date: string | null;
}

interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
  file_type: string;
}

interface ActivityLog {
  id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  details: string | null;
}

interface Training {
  id: string;
  training_type: string;
  status: string;
  assigned_date: string;
  completion_date: string | null;
  expiry_date: string | null;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useAuth();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [formData, setFormData] = useState<Partial<EmployeeData>>({});
  const [loading, setLoading] = useState(true);

  // Derived state for first/last name from full_name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Data for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  // Tab data
  const [healthCheckups, setHealthCheckups] = useState<HealthCheckup[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Custom input states
  const [customDepartment, setCustomDepartment] = useState("");
  const [customJobRole, setCustomJobRole] = useState("");
  const [exposureGroups, setExposureGroups] = useState<any[]>([]);

  const { t } = useLanguage();

  useEffect(() => {
    if (id && companyId) {
      fetchEmployeeData();
      fetchDropdownData();
      fetchHealthCheckups();
      // fetchDocuments(); // Table doesn't exist yet
      // fetchActivityLogs(); // Table doesn't exist yet
      fetchTasks();
    }
  }, [id, companyId]);

  const fetchEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          departments (id, name),
          job_roles (id, title),
          exposure_groups (id, name)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      setEmployee(data as any);
      setFormData(data as any);
      setNotes((data as any)?.notes || "");
      setTags((data as any)?.tags || []);

      // Split full_name into first and last name
      if ((data as any)?.full_name) {
        const nameParts = (data as any).full_name.trim().split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    if (!companyId) return;

    try {
      const [depts, roles, groups] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId),
        supabase
          .from("job_roles")
          .select("id, title")
          .eq("company_id", companyId),
        supabase
          .from("exposure_groups")
          .select("id, name")
          .eq("company_id", companyId),
      ]);

      setDepartments(depts.data || []);
      setJobRoles(roles.data || []);
      setExposureGroups(groups.data || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const fetchHealthCheckups = async () => {
    try {
      const { data, error } = await supabase
        .from("training_records")
        .select("*")
        .eq("employee_id", id)
        .order("assigned_date", { ascending: false });

      if (error) throw error;
      setHealthCheckups((data as any) || []);
    } catch (error) {
      console.error("Error fetching health checkups:", error);
    }
  };

  const fetchDocuments = async () => {
    // Table employee_documents doesn't exist yet
    // Commenting out to prevent 404 errors
    // try {
    //   const { data, error } = await supabase
    //     .from("employee_documents")
    //     .select("*")
    //     .eq("employee_id", id)
    //     .order("uploaded_at", { ascending: false });
    //   if (error) throw error;
    //   setDocuments((data as any) || []);
    // } catch (error) {
    //   console.error("Error fetching documents:", error);
    // }
  };

  const fetchActivityLogs = async () => {
    // Table employee_activity_logs doesn't exist yet
    // Commenting out to prevent 404 errors
    // try {
    //   const { data, error } = await supabase
    //     .from("employee_activity_logs")
    //     .select("*")
    //     .eq("employee_id", id)
    //     .order("changed_at", { ascending: false })
    //     .limit(50);
    //   if (error) throw error;
    //   setActivityLogs((data as any) || []);
    // } catch (error) {
    //   console.error("Error fetching activity logs:", error);
    // }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks((data as any) || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleFieldEdit = (field: string) => {
    setEditMode({ ...editMode, [field]: true });
  };

  const handleFieldSave = async (field: string) => {
    try {
      let updateData: any = {};

      // Handle name fields - combine into full_name
      if (field === "first_name" || field === "last_name") {
        const newFullName = `${
          field === "first_name"
            ? firstName
            : employee?.full_name.split(" ")[0] || ""
        } ${
          field === "last_name"
            ? lastName
            : employee?.full_name.split(" ").slice(1).join(" ") || ""
        }`;
        updateData.full_name = newFullName.trim();
      }
      // Handle custom inputs
      else if (field === "department_id" && customDepartment) {
        // Create new department
        const { data: newDept, error: deptError } = await supabase
          .from("departments" as any)
          .insert({ name: customDepartment, company_id: companyId } as any)
          .select()
          .single();

        if (deptError) throw deptError;
        updateData.department_id = (newDept as any)?.id;
        setCustomDepartment("");
      } else if (field === "job_role_id" && customJobRole) {
        // Create new job role
        const { data: newRole, error: roleError } = await supabase
          .from("job_roles" as any)
          .insert({ title: customJobRole, company_id: companyId } as any)
          .select()
          .single();

        if (roleError) throw roleError;
        updateData.job_role_id = (newRole as any)?.id;
        setCustomJobRole("");
      } else {
        updateData[field] = formData[field as keyof EmployeeData];
      }

      const { error } = await (supabase as any)
        .from("employees")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      // Log the change (table doesn't exist yet)
      // await supabase.from("employee_activity_logs").insert({
      //   employee_id: id,
      //   action: `Updated ${field}`,
      //   changed_by: "Current User",
      //   changed_at: new Date().toISOString(),
      //   details: `Changed ${field} to ${updateData[field]}`,
      // } as any);

      toast.success("Updated successfully");
      setEditMode({ ...editMode, [field]: false });
      fetchEmployeeData();
      fetchDropdownData();
      // fetchActivityLogs(); // Table doesn't exist yet
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Failed to update");
    }
  };

  const handleFieldCancel = (field: string) => {
    setEditMode({ ...editMode, [field]: false });
    setFormData({
      ...formData,
      [field]: employee?.[field as keyof EmployeeData],
    });
    setCustomDepartment("");
    setCustomJobRole("");
  };

  const handleSaveNotes = async () => {
    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;
      toast.success("Notes saved successfully");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    const updatedTags = [...tags, newTag.trim()];

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;
      setTags(updatedTags);
      setNewTag("");
      toast.success("Tag added");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);

    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", id);

      if (error) throw error;
      setTags(updatedTags);
      toast.success("Tag removed");
      fetchEmployeeData();
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("employees")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      // await supabase.from("employee_activity_logs").insert({
      //   employee_id: id,
      //   action: `${isActive ? "Activated" : "Deactivated"} employee`,
      //   changed_by: "Current User",
      //   changed_at: new Date().toISOString(),
      //   details: `Employee status changed to ${
      //     isActive ? "Active" : "Inactive"
      //   }`,
      // } as any);

      toast.success(`Employee ${isActive ? "activated" : "deactivated"}`);
      fetchEmployeeData();
      // fetchActivityLogs(); // Table doesn't exist yet
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("employee-documents").getPublicUrl(fileName);

      // Save document record (table doesn't exist yet, just show success for upload)
      // const { error: dbError } = await supabase
      //   .from("employee_documents")
      //   .insert({
      //     employee_id: id,
      //     name: file.name,
      //     file_url: publicUrl,
      //     file_type: file.type,
      //     uploaded_at: new Date().toISOString(),
      //   } as any);

      // if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      // fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Employee not found</p>
            <Button onClick={() => navigate("/employees")} className="mt-4">
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderEditableField = (
    field: string,
    label: string,
    value: any,
    type: "text" | "select" | "date" = "text",
    options?: any[]
  ) => {
    const isEditing = editMode[field];

    // Get the actual value for first/last name
    const displayValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
        ? lastName
        : value;
    const inputValue =
      field === "first_name"
        ? firstName
        : field === "last_name"
        ? lastName
        : (formData[field as keyof EmployeeData] as string) || "";

    return (
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>

        {!isEditing ? (
          <div
            onClick={() => handleFieldEdit(field)}
            className="font-medium cursor-pointer hover:bg-muted/50 p-2 rounded border border-transparent hover:border-muted-foreground/20 transition-colors"
          >
            {displayValue || "-"}
          </div>
        ) : type === "select" && options ? (
          <div className="space-y-2">
            <Select
              value={formData[field as keyof EmployeeData] as string}
              onValueChange={(val) => {
                setFormData({ ...formData, [field]: val });
                handleFieldSave(field);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.id || opt} value={opt.id || opt}>
                    {opt.name || opt.title || opt.full_name || opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(field === "department_id" || field === "job_role_id") && (
              <div>
                <Label className="text-xs">Or enter manually:</Label>
                <Input
                  placeholder={`Type custom ${label.toLowerCase()}`}
                  value={
                    field === "department_id" ? customDepartment : customJobRole
                  }
                  onChange={(e) => {
                    if (field === "department_id")
                      setCustomDepartment(e.target.value);
                    else if (field === "job_role_id")
                      setCustomJobRole(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFieldSave(field);
                    } else if (e.key === "Escape") {
                      handleFieldCancel(field);
                    }
                  }}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        ) : (
          <Input
            type={type}
            value={inputValue}
            onChange={(e) => {
              if (field === "first_name") {
                setFirstName(e.target.value);
              } else if (field === "last_name") {
                setLastName(e.target.value);
              } else {
                setFormData({ ...formData, [field]: e.target.value });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFieldSave(field);
              } else if (e.key === "Escape") {
                handleFieldCancel(field);
              }
            }}
            onBlur={() => handleFieldCancel(field)}
            autoFocus
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/employees")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">
                {t("employees.employeeNumber")} #{employee.employee_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="active-toggle" className="text-sm font-medium">
                {employee.is_active
                  ? t("employees.active")
                  : t("employees.inactive")}
              </Label>
              <Switch
                id="active-toggle"
                checked={employee.is_active}
                onCheckedChange={handleToggleActive}
              />
            </div>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active
                ? t("employees.active")
                : t("employees.inactive")}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checkups">Check-Ups</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Personal Info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Employee Details & Records</CardTitle>
                  <CardDescription>
                    Click on any field to edit. Press Enter to save.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderEditableField(
                      "employee_number",
                      t("employees.employeeNumber"),
                      employee.employee_number
                    )}
                    {renderEditableField(
                      "email",
                      t("employees.email"),
                      employee.email
                    )}
                    {renderEditableField(
                      "first_name",
                      t("employees.firstName"),
                      firstName
                    )}
                    {renderEditableField(
                      "last_name",
                      t("employees.lastName"),
                      lastName
                    )}
                    {renderEditableField(
                      "hire_date",
                      t("employees.hireDate"),
                      employee.hire_date,
                      "date"
                    )}
                    {renderEditableField(
                      "department_id",
                      t("employees.department"),
                      employee.departments?.name,
                      "select",
                      departments
                    )}
                    {renderEditableField(
                      "job_role_id",
                      t("employees.jobRole"),
                      employee.job_roles?.title,
                      "select",
                      jobRoles
                    )}
                    {renderEditableField(
                      "exposure_group_id",
                      "Activity Group / Stress Group",
                      employee.exposure_groups?.name,
                      "select",
                      exposureGroups
                    )}

                    {/* Tags / Keywords - Full width below */}
                    <div className="md:col-span-2 space-y-3 pt-4 border-t">
                      <div>
                        <Label className="text-sm text-muted-foreground flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Tags / Keywords
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add tags to categorize this employee
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button size="sm" onClick={handleAddTag}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No tags added
                          </p>
                        ) : (
                          tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Tasks, Notes, Tags */}
              <div className="space-y-6">
                {/* Tasks */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="w-4 h-4" />
                          Tasks
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Assigned tasks for this employee
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/tasks?employee=${id}`)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] pr-4">
                      {tasks.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">
                          No tasks assigned
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {tasks.slice(0, 5).map((task) => (
                            <div key={task.id} className="p-2 border rounded">
                              <p className="text-sm font-medium">
                                {task.title}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {task.due_date
                                    ? new Date(
                                        task.due_date
                                      ).toLocaleDateString()
                                    : "No due date"}
                                </span>
                                <Badge
                                  variant={
                                    task.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <StickyNote className="w-4 h-4" />
                        Notes
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveNotes}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      Internal notes about this employee
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this employee..."
                      rows={6}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Check-Ups Tab */}
          <TabsContent value="checkups">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Listed Check-Ups (Coming Soon)
                    </CardTitle>
                    <CardDescription>
                      Scheduled health examinations which are coming soon - view
                      only
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {healthCheckups.filter(
                  (c) =>
                    c.status === "planned" ||
                    new Date(c.next_checkup_date || "") > new Date()
                ).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No upcoming check-ups scheduled
                  </p>
                ) : (
                  <div className="space-y-4">
                    {healthCheckups
                      .filter(
                        (c) =>
                          c.status === "planned" ||
                          new Date(c.next_checkup_date || "") > new Date()
                      )
                      .map((checkup) => (
                        <Card key={checkup.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {checkup.next_checkup_date
                                  ? new Date(
                                      checkup.next_checkup_date
                                    ).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "Date TBD"}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {checkup.notes || "Regular health check-up"}
                              </p>
                            </div>
                            <Badge variant="outline">{checkup.status}</Badge>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents
                    </CardTitle>
                    <CardDescription>
                      Employee documents and files
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleDocumentUpload}
                      />
                    </label>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No documents uploaded
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50"
                      >
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded{" "}
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  Track all changes and actions for this employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No activity recorded
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-4 pb-4 border-b last:border-0"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{log.action}</p>
                          {log.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {log.details}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(log.changed_at).toLocaleString()} •{" "}
                            {log.changed_by}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
