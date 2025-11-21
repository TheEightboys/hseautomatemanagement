import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// Removed unused import for Tables
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Filter,
  Users,
} from "lucide-react";
import { RefreshAuthButton } from "@/components/RefreshAuthButton";

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  department_id: string | null;
  hire_date: string | null;
  is_active: boolean;
  departments: { id: string; name: string } | null;
  job_roles: { title: string } | null;
  exposure_groups: { name: string } | null;
}

export default function Employees() {
  const { companyId, userRole, loading, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isJobRoleDialogOpen, setIsJobRoleDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobRoleFormData, setJobRoleFormData] = useState({
    title: "",
    description: "",
  });
  const [formData, setFormData] = useState({
    employee_number: "",
    first_name: "",
    last_name: "",
    email: "",
    hire_date: "",
    department_id: "",
    job_role: "",
  });

  // Filters
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  useEffect(() => {
    // Debug logging
    console.log("Employees page - Auth state:", {
      loading,
      user: user?.email,
      userId: user?.id,
      userRole,
      companyId,
    });

    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (companyId) {
      fetchEmployees();
      fetchDepartments();
      fetchJobRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, loading, user, navigate]);

  const fetchDepartments = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId);

    if (!error && data) {
      setDepartments(data);
    }
  };

  const fetchJobRoles = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("job_roles")
      .select("id, title")
      .eq("company_id", companyId);

    if (!error && data) {
      setJobRoles(data);
    }
  };

  const handleJobRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setIsSubmitting(true);
      const { error } = await (supabase as any).from("job_roles").insert({
        company_id: companyId,
        title: jobRoleFormData.title,
        description: jobRoleFormData.description || null,
      });

      if (error) throw error;

      toast.success("Job role added successfully!");
      setIsJobRoleDialogOpen(false);
      setJobRoleFormData({ title: "", description: "" });
      fetchJobRoles();
    } catch (error: any) {
      console.error("Error adding job role:", error);
      toast.error(error.message || "Failed to add job role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("employees.loadError"));
      console.error(error);
    } else {
      setEmployees((data as Employee[]) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Submit - Auth state:", {
      user: user?.email,
      userRole,
      companyId,
    });

    if (!companyId) {
      toast.error(t("employees.noCompanyId"));
      console.error("Missing companyId. User:", user?.email, "Role:", userRole);
      console.error(
        "Please check user_roles table in Supabase for user_id:",
        user?.id
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // If job role is provided, try to find or create it
      let jobRoleId: string | null = null;
      if (formData.job_role && formData.job_role.trim()) {
        const jobRoleTitle = formData.job_role.trim();

        // Check if job role exists
        const { data: existingRole } = await supabase
          .from("job_roles")
          .select("id")
          .eq("company_id", companyId)
          .eq("title", jobRoleTitle)
          .maybeSingle();

        if (existingRole) {
          jobRoleId = (existingRole as any).id;
        } else {
          // Create new job role
          const { data: newRole, error: roleError } = await supabase
            .from("job_roles")
            .insert({
              company_id: companyId,
              title: jobRoleTitle,
            } as any)
            .select("id")
            .single();

          if (roleError) {
            console.error("Error creating job role:", roleError);
            toast.error("Failed to create job role");
            return;
          }

          jobRoleId = (newRole as any)?.id || null;
        }
      }

      // Insert employee (combine first_name and last_name into full_name for DB)
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;

      const { data, error } = await supabase.from("employees").insert({
        employee_number: formData.employee_number,
        full_name: fullName,
        email: formData.email || null,
        hire_date: formData.hire_date || null,
        job_role_id: jobRoleId,
        department_id: formData.department_id || null,
        exposure_group_id: null,
        is_active: true,
        company_id: companyId,
      } as any);

      if (error) {
        const details =
          (error && (error.message || (error as any).details)) ||
          "Unknown error";
        toast.error(t("employees.addError") + ": " + details);
        console.error("Add employee error:", error);
        return;
      }

      toast.success(t("employees.addSuccess"));
      setIsDialogOpen(false);
      setFormData({
        employee_number: "",
        first_name: "",
        last_name: "",
        email: "",
        hire_date: "",
        department_id: "",
        job_role: "",
      });
      fetchEmployees();
      return data;
    } catch (err) {
      console.error("Unexpected error adding employee:", err);
      toast.error(t("employees.addError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewEmployee = async (employee: Employee) => {
    const { data } = await supabase
      .from("employees")
      .select(
        `
        *,
        departments(name),
        job_roles(title),
        exposure_groups(name)
      `
      )
      .eq("id", employee.id)
      .single();

    setSelectedEmployee((data as Employee) || null);
    setIsSheetOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => {
    // Search filter
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.email &&
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase());

    // Active status filter
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && emp.is_active) ||
      (filterActive === "inactive" && !emp.is_active);

    // Department filter
    const matchesDepartment =
      filterDepartment === "all" || emp.department_id === filterDepartment;

    return matchesSearch && matchesActive && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
        </div>

        {/* Setup warning */}
        {!companyId && user && !loading && (
          <Card className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-300">
                ⚠️ Company Setup Required
              </CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">
                Your account is not linked to a company. If you just created a
                company, please <strong>sign out and sign back in</strong> to
                refresh your session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <RefreshAuthButton />
                <Button
                  onClick={() => {
                    console.log("Signing out to refresh auth state...");
                    navigate("/auth");
                    window.location.href = "/auth"; // Force reload
                  }}
                  variant="default"
                  size="sm"
                >
                  Sign Out & Refresh
                </Button>
                <Button
                  onClick={() => navigate("/setup-company")}
                  variant="outline"
                  size="sm"
                  className="border-orange-600 text-orange-700"
                >
                  Set Up Company
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Logged in as: {user.email}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                Debug: User ID: {user.id?.substring(0, 8)}... | Company ID:{" "}
                {companyId?.substring(0, 8) || "null"} | Role:{" "}
                {userRole || "null"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {t("employees.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("employees.description")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog
                  open={isJobRoleDialogOpen}
                  onOpenChange={setIsJobRoleDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Job Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Job Role</DialogTitle>
                      <DialogDescription>
                        Create a new job role for your company
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleJobRoleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="role_title">Job Title *</Label>
                        <Input
                          id="role_title"
                          placeholder="e.g., Safety Officer"
                          value={jobRoleFormData.title}
                          onChange={(e) =>
                            setJobRoleFormData({
                              ...jobRoleFormData,
                              title: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role_description">
                          Description (Optional)
                        </Label>
                        <Input
                          id="role_description"
                          placeholder="Brief description of the role"
                          value={jobRoleFormData.description}
                          onChange={(e) =>
                            setJobRoleFormData({
                              ...jobRoleFormData,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsJobRoleDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Adding..." : "Add Job Role"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      {t("employees.addEmployee")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{t("employees.addNew")}</DialogTitle>
                      <DialogDescription>
                        {t("employees.enterDetails")}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 p-4">
                      <div className="space-y-2">
                        <Label htmlFor="employee_number">
                          {t("employees.employeeNumber")} *
                        </Label>
                        <Input
                          id="employee_number"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.employee_number}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              employee_number: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_name">
                          {t("employees.firstName")} *
                        </Label>
                        <Input
                          id="first_name"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.first_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              first_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">
                          {t("employees.lastName")} *
                        </Label>
                        <Input
                          id="last_name"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.last_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              last_name: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          {t("employees.emailOptional")}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job_role">
                          {t("employees.jobRole")}
                        </Label>
                        <Input
                          id="job_role"
                          list="job-roles-list"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          placeholder={t("employees.enterJobRole")}
                          value={formData.job_role}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              job_role: e.target.value,
                            })
                          }
                        />
                        <datalist id="job-roles-list">
                          {jobRoles.map((role) => (
                            <option key={role.id} value={role.title} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">
                          {t("employees.department")}
                        </Label>
                        <Select
                          value={formData.department_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, department_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("employees.selectDepartment")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("employees.hireDate")}</Label>
                        <Input
                          type="date"
                          className="h-11 border-2 focus:border-primary transition-colors"
                          value={formData.hire_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hire_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting
                            ? t("employees.adding")
                            : t("employees.addEmployee")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-2 sm:mb-0">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">
                  {t("employees.filterStatus")}
                </Label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("employees.filterStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("employees.allEmployees")}
                    </SelectItem>
                    <SelectItem value="active">
                      {t("employees.activeOnly")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("employees.inactiveOnly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">
                  {t("employees.filterDepartment")}
                </Label>
                <Select
                  value={filterDepartment}
                  onValueChange={setFilterDepartment}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("employees.filterDepartment")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("employees.allDepartments")}
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("employees.search")}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employees.employeeNumber")}</TableHead>
                    <TableHead>{t("employees.name")}</TableHead>
                    <TableHead>{t("employees.email")}</TableHead>
                    <TableHead>{t("employees.department")}</TableHead>
                    <TableHead>{t("employees.jobRole")}</TableHead>
                    <TableHead>{t("employees.hireDate")}</TableHead>
                    <TableHead>{t("employees.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            {t("employees.noEmployees")}
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Add your first employee to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow
                        key={employee.id}
                        className="cursor-pointer hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <TableCell>{employee.employee_number}</TableCell>
                        <TableCell className="font-medium">
                          {employee.full_name}
                        </TableCell>
                        <TableCell>{employee.email || "-"}</TableCell>
                        <TableCell>
                          {employee.departments?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {employee.job_roles?.title || "-"}
                        </TableCell>
                        <TableCell>{employee.hire_date || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              employee.is_active ? "default" : "secondary"
                            }
                            className="flex items-center gap-1 px-2.5 py-0.5 font-semibold w-fit"
                          >
                            {employee.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                {t("employees.active")}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                {t("employees.inactive")}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedEmployee?.full_name}</SheetTitle>
              <SheetDescription>{t("employees.details")}</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">{t("employees.info")}</TabsTrigger>
                <TabsTrigger value="risk">
                  {t("employees.riskProfile")}
                </TabsTrigger>
                <TabsTrigger value="training">
                  {t("employees.training")}
                </TabsTrigger>
                <TabsTrigger value="tasks">{t("employees.tasks")}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.employeeNumber")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.employee_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.email")}
                    </p>
                    <p className="font-medium">{selectedEmployee?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.hireDate")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.hire_date || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.department")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.departments?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.jobRole")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.job_roles?.title || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.exposureGroup")}
                    </p>
                    <p className="font-medium">
                      {selectedEmployee?.exposure_groups?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("employees.status")}
                    </p>
                    <Badge
                      variant={
                        selectedEmployee?.is_active ? "default" : "secondary"
                      }
                    >
                      {selectedEmployee?.is_active
                        ? t("employees.active")
                        : t("employees.inactive")}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="risk" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.riskAssignments")}
                </p>
              </TabsContent>

              <TabsContent value="training" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.trainingRecords")}
                </p>
              </TabsContent>

              <TabsContent value="tasks" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("employees.assignedTasks")}
                </p>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
