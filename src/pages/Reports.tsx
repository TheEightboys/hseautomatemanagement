import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportStats {
  totalEmployees: number;
  totalRiskAssessments: number;
  totalAudits: number;
  totalTasks: number;
  totalIncidents: number;
  totalMeasures: number;
  completedAudits: number;
  completedTasks: number;
  completedMeasures: number;
  openIncidents: number;
  trainingCompliance: number;
}

interface TrainingStatus {
  employee_name: string;
  total_required: number;
  completed: number;
  expired: number;
  compliance_rate: number;
}

export default function Reports() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    totalRiskAssessments: 0,
    totalAudits: 0,
    totalTasks: 0,
    totalIncidents: 0,
    totalMeasures: 0,
    completedAudits: 0,
    completedTasks: 0,
    completedMeasures: 0,
    openIncidents: 0,
    trainingCompliance: 0,
  });

  const [trainingMatrix, setTrainingMatrix] = useState<TrainingStatus[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId]);

  const fetchReportData = async () => {
    if (!companyId) return;

    try {
      // Fetch all stats in parallel
      const [
        employeesRes,
        risksRes,
        auditsRes,
        tasksRes,
        incidentsRes,
        measuresRes,
        completedAuditsRes,
        completedTasksRes,
        completedMeasuresRes,
        openIncidentsRes,
        trainingRes,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("risk_assessments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("investigation_status", "open"),
        supabase
          .from("training_records")
          .select("*")
          .eq("company_id", companyId),
      ]);

      const totalTraining = trainingRes.data?.length || 0;
      const completedTraining =
        trainingRes.data?.filter((t) => t.status === "completed").length || 0;
      const trainingComplianceRate =
        totalTraining > 0
          ? Math.round((completedTraining / totalTraining) * 100)
          : 0;

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalRiskAssessments: risksRes.count || 0,
        totalAudits: auditsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        totalIncidents: incidentsRes.count || 0,
        totalMeasures: measuresRes.count || 0,
        completedAudits: completedAuditsRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        completedMeasures: completedMeasuresRes.count || 0,
        openIncidents: openIncidentsRes.count || 0,
        trainingCompliance: trainingComplianceRate,
      });

      // Build training matrix
      await fetchTrainingMatrix();
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMatrix = async () => {
    if (!companyId) return;

    try {
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (empError) throw empError;

      const matrix: TrainingStatus[] = [];

      for (const emp of employees || []) {
        const { data: trainings, error: trainError } = await supabase
          .from("training_records")
          .select("*")
          .eq("employee_id", emp.id);

        if (trainError) throw trainError;

        const total = trainings?.length || 0;
        const completed =
          trainings?.filter((t) => t.status === "completed").length || 0;
        const expired =
          trainings?.filter((t) => t.status === "expired").length || 0;
        const compliance =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        matrix.push({
          employee_name: emp.full_name,
          total_required: total,
          completed,
          expired,
          compliance_rate: compliance,
        });
      }

      setTrainingMatrix(matrix);
    } catch (error: any) {
      console.error("Error fetching training matrix:", error);
    }
  };

  const exportReport = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export functionality will be available soon",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">{t("reports.title")}</h2>
            <p className="text-muted-foreground">{t("reports.subtitle")}</p>
          </div>
        </div>
        </div>
        <Button onClick={exportReport}>
          <Download className="w-4 h-4 mr-2" />
          {t("reports.exportPDF")}
        </Button>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.totalEmployees")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {t("reports.activeWorkforce")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.riskAssessments")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRiskAssessments}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("reports.totalGBU")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.safetyAudits")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAudits}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAudits} {t("reports.completed")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reports.trainingCompliance")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.trainingCompliance}%
            </div>
            <Progress value={stats.trainingCompliance} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("reports.overview")}</TabsTrigger>
          <TabsTrigger value="training">
            {t("reports.trainingMatrix")}
          </TabsTrigger>
          <TabsTrigger value="incidents">{t("reports.incidents")}</TabsTrigger>
          <TabsTrigger value="measures">{t("reports.measures")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("reports.auditCompletion")}</CardTitle>
                <CardDescription>{t("reports.auditMetrics")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("reports.totalAudits")}
                  </span>
                  <Badge>{stats.totalAudits}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <Badge variant="outline" className="bg-green-50">
                    {stats.completedAudits}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm font-bold">
                    {stats.totalAudits > 0
                      ? Math.round(
                          (stats.completedAudits / stats.totalAudits) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalAudits > 0
                      ? (stats.completedAudits / stats.totalAudits) * 100
                      : 0
                  }
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Completion Status</CardTitle>
                <CardDescription>Corrective action tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Tasks</span>
                  <Badge>{stats.totalTasks}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <Badge variant="outline" className="bg-green-50">
                    {stats.completedTasks}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm font-bold">
                    {stats.totalTasks > 0
                      ? Math.round(
                          (stats.completedTasks / stats.totalTasks) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalTasks > 0
                      ? (stats.completedTasks / stats.totalTasks) * 100
                      : 0
                  }
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incident Overview</CardTitle>
                <CardDescription>Workplace incident statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Incidents</span>
                  <Badge>{stats.totalIncidents}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Under Investigation
                  </span>
                  <Badge variant="destructive">{stats.openIncidents}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Closed</span>
                  <Badge variant="outline" className="bg-green-50">
                    {stats.totalIncidents - stats.openIncidents}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Measures Status</CardTitle>
                <CardDescription>
                  Corrective & preventive measures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Measures</span>
                  <Badge>{stats.totalMeasures}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <Badge variant="outline" className="bg-green-50">
                    {stats.completedMeasures}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm font-bold">
                    {stats.totalMeasures > 0
                      ? Math.round(
                          (stats.completedMeasures / stats.totalMeasures) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    stats.totalMeasures > 0
                      ? (stats.completedMeasures / stats.totalMeasures) * 100
                      : 0
                  }
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training Matrix Tab */}
        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>Employee Training Compliance Matrix</CardTitle>
              <CardDescription>
                Complete overview of training status for all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Total Required</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Compliance Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainingMatrix.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No training data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      trainingMatrix.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {item.employee_name}
                          </TableCell>
                          <TableCell>{item.total_required}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50">
                              {item.completed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.expired > 0 ? (
                              <Badge variant="destructive">
                                {item.expired}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>{item.compliance_rate}%</TableCell>
                          <TableCell>
                            {item.compliance_rate >= 80 ? (
                              <Badge className="bg-green-100 text-green-800">
                                Compliant
                              </Badge>
                            ) : item.compliance_rate >= 50 ? (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                Needs Attention
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Non-Compliant</Badge>
                            )}
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

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Incident Analytics</CardTitle>
              <CardDescription>
                Detailed incident reporting and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-red-600" />
                      <div className="text-3xl font-bold">
                        {stats.totalIncidents}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Incidents
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 text-orange-600" />
                      <div className="text-3xl font-bold">
                        {stats.openIncidents}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Under Investigation
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                      <div className="text-3xl font-bold">
                        {stats.totalIncidents - stats.openIncidents}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Closed Cases
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Measures Tab */}
        <TabsContent value="measures">
          <Card>
            <CardHeader>
              <CardTitle>Measures & Controls Overview</CardTitle>
              <CardDescription>
                Tracking of all corrective and preventive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-blue-600" />
                      <div className="text-3xl font-bold">
                        {stats.totalMeasures}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Measures
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 text-orange-600" />
                      <div className="text-3xl font-bold">
                        {stats.totalMeasures - stats.completedMeasures}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        In Progress
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                      <div className="text-3xl font-bold">
                        {stats.completedMeasures}
                      </div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
