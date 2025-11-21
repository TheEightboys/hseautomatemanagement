import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Shield, AlertTriangle, AlertOctagon, Info } from "lucide-react";
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
import { DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

const riskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  risk_category_id: z.string().optional(),
  department_id: z.string().optional(),
  likelihood: z.number().min(1).max(5),
  severity: z.number().min(1).max(5),
  mitigation_measures: z.string().optional(),
  status: z.string().default("open"),
  assessment_date: z.string().min(1, "Assessment date is required"),
});

type RiskFormData = z.infer<typeof riskSchema>;

export default function RiskAssessments() {
  const { user, loading, companyId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  type RiskWithJoins = Tables<"risk_assessments"> & {
    risk_categories?: { name: string } | null;
    departments?: { name: string } | null;
    employees?: { full_name: string } | null;
  };

  const [risks, setRisks] = useState<RiskWithJoins[]>([]);
  const [categories, setCategories] = useState<Tables<"risk_categories">[]>([]);
  const [departments, setDepartments] = useState<Tables<"departments">[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const form = useForm<RiskFormData>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      title: "",
      description: "",
      risk_category_id: "",
      department_id: "",
      likelihood: 3,
      severity: 3,
      mitigation_measures: "",
      status: "open",
      assessment_date: "",
    },
  });

  const likelihood = form.watch("likelihood");
  const severity = form.watch("severity");
  const riskScore = likelihood * severity;

  const getRiskLevel = (score: number) => {
    if (score >= 20) return "critical";
    if (score >= 15) return "high";
    if (score >= 8) return "medium";
    return "low";
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (user && companyId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, navigate, companyId]);

  const fetchData = async () => {
    if (!companyId) return;

    setLoadingData(true);
    try {
      const [risksRes, categoriesRes, departmentsRes] = await Promise.all([
        supabase
          .from("risk_assessments")
          .select(
            "*, risk_categories(name), departments(name), employees(full_name)"
          )
          .eq("company_id", companyId)
          .order("assessment_date", { ascending: false }),
        supabase
          .from("risk_categories")
          .select("*")
          .eq("company_id", companyId),
        supabase.from("departments").select("*").eq("company_id", companyId),
      ]);

      if (risksRes.error) throw risksRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      setRisks((risksRes.data as RiskWithJoins[]) || []);
      setCategories((categoriesRes.data as Tables<"risk_categories">[]) || []);
      setDepartments((departmentsRes.data as Tables<"departments">[]) || []);
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

  const onSubmit = async (data: RiskFormData) => {
    if (!companyId) {
      toast({
        title: "No company found",
        description:
          "You need to set up a company before creating assessments.",
        variant: "destructive",
      });
      navigate("/setup-company");
      return;
    }

    const riskScore = data.likelihood * data.severity;
    const riskLevel = getRiskLevel(riskScore);

    try {
      const { data: created, error } = await supabase
        .from("risk_assessments")
        .insert([
          {
            title: data.title,
            description: data.description,
            risk_category_id: data.risk_category_id,
            department_id: data.department_id,
            likelihood: data.likelihood,
            severity: data.severity,
            mitigation_measures: data.mitigation_measures,
            status: data.status,
            assessment_date: data.assessment_date,
            company_id: companyId,
            // `risk_score` is computed in the database (generated column or trigger).
            // Do not send client-side value to avoid "cannot insert a non-DEFAULT value" errors.
            // risk_score: riskScore,
            // risk_level may also be computed server-side; omit if DB enforces it.
            risk_level: riskLevel,
          },
        ])
        .select("id");

      if (error) {
        console.error("Risk create error:", error);
        // Provide clearer guidance for RLS/permission errors
        const isRLS =
          String(error.message || "")
            .toLowerCase()
            .includes("row-level security") ||
          String(error.message || "")
            .toLowerCase()
            .includes("permission denied");
        toast({
          title: "Error creating risk assessment",
          description: isRLS
            ? "Permission denied. Ensure your account has a company assigned and RLS policies allow inserts."
            : error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Risk assessment created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      fetchData();
      console.debug("Created risk assessment: ", created);
    } catch (err: unknown) {
      console.error("Unexpected error creating risk assessment:", err);
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

  const filteredRisks = risks.filter((risk) =>
    risk.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

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
              <h1 className="text-xl font-bold">{t("risks.title")}</h1>
              <p className="text-xs text-muted-foreground">
                {t("risks.subtitle")}
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t("risks.title")}</CardTitle>
                  <CardDescription>{t("risks.subtitle")}</CardDescription>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("risks.new")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("risks.new")}</DialogTitle>
                    <DialogDescription>{t("risks.subtitle")}</DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("risks.riskTitle")}</FormLabel>
                            <FormControl>
                              <Input {...field} />
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
                            <FormLabel>{t("risks.description")}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="risk_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("risks.category")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={t("risks.selectCategory")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
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
                          name="department_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("risks.department")}</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue
                                      placeholder={t("risks.selectDepartment")}
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="likelihood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("risks.likelihood")} (1-5)
                              </FormLabel>
                              <Select
                                onValueChange={(val) =>
                                  field.onChange(parseInt(val))
                                }
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <SelectItem
                                      key={val}
                                      value={val.toString()}
                                    >
                                      {val}
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
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("risks.severity")} (1-5)</FormLabel>
                              <Select
                                onValueChange={(val) =>
                                  field.onChange(parseInt(val))
                                }
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5].map((val) => (
                                    <SelectItem
                                      key={val}
                                      value={val.toString()}
                                    >
                                      {val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div>
                          <FormLabel>{t("risks.riskScore")}</FormLabel>
                          <div className="h-10 flex items-center justify-center rounded-md border bg-muted font-bold text-lg">
                            {riskScore}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Level:{" "}
                            <span className="font-medium capitalize">
                              {getRiskLevel(riskScore)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="mitigation_measures"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("risks.mitigation")}</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assessment_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("risks.assessmentDate")}</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
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
                        <Button type="submit">
                          {t("common.create")} {t("risks.title").slice(0, -2)}
                        </Button>
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
                  placeholder={t("risks.search")}
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
                    <TableHead>{t("risks.riskTitle")}</TableHead>
                    <TableHead>{t("risks.category")}</TableHead>
                    <TableHead>{t("risks.department")}</TableHead>
                    <TableHead>{t("risks.riskLevel")}</TableHead>
                    <TableHead>{t("risks.riskScore")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("risks.assessmentDate")}</TableHead>
                    <TableHead>{t("common.by")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Shield className="w-16 h-16 text-muted-foreground/20 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-1">
                            No risk assessments found
                          </p>
                          <p className="text-sm text-muted-foreground/60">
                            Create your first risk assessment to get started
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRisks.map((risk) => (
                      <TableRow key={risk.id} className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group">
                        <TableCell className="font-medium">
                          {risk.title}
                        </TableCell>
                        <TableCell>
                          {risk.risk_categories?.name || "-"}
                        </TableCell>
                        <TableCell>{risk.departments?.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getRiskLevelColor(risk.risk_level)} className="flex items-center gap-1 px-2.5 py-0.5 font-semibold w-fit">
                            {risk.risk_level === 'critical' && <AlertOctagon className="w-3 h-3" />}
                            {risk.risk_level === 'high' && <AlertTriangle className="w-3 h-3" />}
                            {risk.risk_level === 'medium' && <Info className="w-3 h-3" />}
                            {risk.risk_level === 'low' && <Info className="w-3 h-3" />}
                            {risk.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{risk.risk_score}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              risk.status === "open" ? "default" : "secondary"
                            }
                          >
                            {risk.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{risk.assessment_date}</TableCell>
                        <TableCell>
                          {risk.employees?.full_name || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
