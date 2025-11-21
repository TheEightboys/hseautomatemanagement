import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  GraduationCap,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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

const trainingSchema = z.object({
  employee_id: z.string().min(1, "Employee is required"),
  training_type_id: z.string().min(1, "Training type is required"),
  assigned_date: z.string().min(1, "Assigned date is required"),
  expiry_date: z.string().optional(),
  status: z.enum(["assigned", "in_progress", "completed", "expired"]),
});

const trainingTypeSchema = z.object({
  name: z.string().min(1, "Training type name is required"),
  description: z.string().optional(),
  duration_hours: z.string().optional(),
  validity_months: z.string().optional(),
});

type TrainingFormData = z.infer<typeof trainingSchema>;
type TrainingTypeFormData = z.infer<typeof trainingTypeSchema>;

export default function Training() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  type TrainingWithJoins = Tables<"training_records"> & {
    employees?: { full_name: string } | null;
    training_types?: { name: string } | null;
  };

  const [trainings, setTrainings] = useState<TrainingWithJoins[]>([]);
  const [employees, setEmployees] = useState<Tables<"employees">[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<
    Tables<"training_types">[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      employee_id: "",
      training_type_id: "",
      assigned_date: "",
      expiry_date: "",
      status: "assigned",
    },
  });

  const typeForm = useForm<TrainingTypeFormData>({
    resolver: zodResolver(trainingTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      duration_hours: "",
      validity_months: "",
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
  }, [user, loading, navigate, companyId]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [trainingsRes, employeesRes, typesRes] = await Promise.all([
        supabase
          .from("training_records")
          .select("*, employees(full_name), training_types(name)")
          .eq("company_id", companyId)
          .order("assigned_date", { ascending: false }),
        supabase
          .from("employees")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true),
        supabase.from("training_types").select("*").eq("company_id", companyId),
      ]);

      if (trainingsRes.error) throw trainingsRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (typesRes.error) throw typesRes.error;

      setTrainings((trainingsRes.data as TrainingWithJoins[]) || []);
      setEmployees((employeesRes.data as Tables<"employees">[]) || []);
      setTrainingTypes((typesRes.data as Tables<"training_types">[]) || []);
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

  const onSubmit = async (data: TrainingFormData) => {
    if (!companyId) return;

    try {
      const { error } = await (supabase as any)
        .from("training_records")
        .insert([
          {
            employee_id: data.employee_id,
            training_type_id: data.training_type_id,
            assigned_date: data.assigned_date,
            expiry_date: data.expiry_date || null,
            status: data.status,
            company_id: companyId,
          } as any,
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training assigned successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      fetchData();
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

  const onTypeSubmit = async (data: TrainingTypeFormData) => {
    if (!companyId) return;

    try {
      const { error } = await (supabase as any).from("training_types").insert([
        {
          company_id: companyId,
          name: data.name,
          description: data.description || null,
          duration_hours: data.duration_hours
            ? parseInt(data.duration_hours)
            : null,
          validity_months: data.validity_months
            ? parseInt(data.validity_months)
            : null,
        } as any,
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training type created successfully",
      });
      setIsTypeDialogOpen(false);
      typeForm.reset();
      fetchData();
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

  const filteredTrainings = trainings.filter(
    (training) =>
      training.employees?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      training.training_types?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "expired":
        return "destructive";
      default:
        return "outline";
    }
  };

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
              <h1 className="text-xl font-bold">{t("training.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("training.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {t("training.records")}
                  </CardTitle>
                  <CardDescription>{t("training.subtitle")}</CardDescription>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("training.assign")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t("training.assign")}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="employee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.employee")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("training.selectEmployee")}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="training_type_id"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>
                                {t("training.trainingType")}
                              </FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsTypeDialogOpen(true)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add New Type
                              </Button>
                            </div>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      trainingTypes.length === 0
                                        ? "No training types available - Click 'Add New Type' to create one"
                                        : t("training.selectType")
                                    }
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {trainingTypes.length === 0 ? (
                                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                    No training types found.
                                    <br />
                                    Click "Add New Type" to create one.
                                  </div>
                                ) : (
                                  trainingTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="assigned_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("training.assignedDate")}
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="expiry_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("training.expiryDate")} (
                                {t("common.optional")})
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("training.status")}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="assigned">
                                  {t("training.assigned")}
                                </SelectItem>
                                <SelectItem value="in_progress">
                                  {t("training.inProgress")}
                                </SelectItem>
                                <SelectItem value="completed">
                                  {t("training.completed")}
                                </SelectItem>
                                <SelectItem value="expired">
                                  {t("training.expired")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit">{t("training.assign")}</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("training.search")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("training.employee")}</TableHead>
                    <TableHead>{t("training.trainingType")}</TableHead>
                    <TableHead>{t("training.status")}</TableHead>
                    <TableHead>{t("training.assignedDate")}</TableHead>
                    <TableHead>{t("training.expiryDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <GraduationCap className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            No training records found
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Assign training to employees to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainings.map((training) => (
                      <TableRow
                        key={training.id}
                        className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                      >
                        <TableCell className="font-medium">
                          {training.employees?.full_name}
                        </TableCell>
                        <TableCell>{training.training_types?.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusColor(training.status)}
                            className="flex items-center gap-1 px-2.5 py-0.5 font-semibold w-fit"
                          >
                            {training.status === "completed" && (
                              <CheckCircle className="w-3 h-3" />
                            )}
                            {training.status === "in_progress" && (
                              <Clock className="w-3 h-3" />
                            )}
                            {training.status === "expired" && (
                              <XCircle className="w-3 h-3" />
                            )}
                            {training.status === "assigned" && (
                              <AlertCircle className="w-3 h-3" />
                            )}
                            {t(`training.${training.status.replace("_", "")}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>{(training as any).assigned_date}</TableCell>
                        <TableCell>{training.expiry_date || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Training Type Creation Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Training Type</DialogTitle>
          </DialogHeader>
          <Form {...typeForm}>
            <form
              onSubmit={typeForm.handleSubmit(onTypeSubmit)}
              className="space-y-4"
            >
              <FormField
                control={typeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Type Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Fire Safety Training"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={typeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description of this training"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={typeForm.control}
                  name="duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={typeForm.control}
                  name="validity_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity (months)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTypeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Training Type</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
