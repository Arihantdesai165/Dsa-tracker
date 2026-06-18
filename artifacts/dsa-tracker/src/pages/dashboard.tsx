import { useGetDashboardStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, CircleDashed, Code2, AlertTriangle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  if (statsLoading || activityLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-mono">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your DSA mission status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-primary/20 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">OVERALL PROGRESS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono mb-4 text-primary">
              {stats?.overallProgress.toFixed(1)}%
            </div>
            <Progress value={stats?.overallProgress} className="h-2" />
          </CardContent>
        </Card>
        <Card className="border-primary/20 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">TOPIC COMPLETION</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono mb-4 text-primary">
              {stats?.topicCompletionPct.toFixed(1)}%
            </div>
            <Progress value={stats?.topicCompletionPct} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="SOLVED QUESTIONS" value={stats?.solvedQuestions} icon={CheckCircle2} />
        <StatCard title="ATTEMPTED" value={stats?.attemptedQuestions} icon={CircleDashed} />
        <StatCard title="REVISIONS DUE" value={stats?.revisionsDueToday} icon={AlertTriangle} alert={stats?.revisionsDueToday ? stats.revisionsDueToday > 0 : false} />
        <StatCard title="UPCOMING REVISIONS" value={stats?.upcomingRevisions} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 transition-all hover:border-border/80 hover:shadow-md">
          <CardHeader>
            <CardTitle className="font-mono">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!activity?.length ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-secondary/20">
                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse text-primary" />
                <p>No activity yet. Start solving questions!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="bg-secondary p-2 rounded-full mt-1">
                      {item.type === 'topic_completed' && <BookOpen className="w-4 h-4 text-primary" />}
                      {item.type === 'question_solved' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      {item.type === 'revision_completed' && <Clock className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {format(new Date(item.timestamp), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transition-all hover:border-border/80 hover:shadow-md">
          <CardHeader>
            <CardTitle className="font-mono">Topic Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Topics</span>
                <span className="font-bold">{stats?.totalTopics}</span>
              </div>
              <div className="flex justify-between items-center text-primary">
                <span>Completed</span>
                <span className="font-bold">{stats?.completedTopics}</span>
              </div>
              <div className="flex justify-between items-center text-yellow-500">
                <span>In Progress</span>
                <span className="font-bold">{stats?.inProgressTopics}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, alert = false }: any) {
  return (
    <Card className={`transition-all hover:-translate-y-1 hover:shadow-md ${alert ? "border-destructive/50 bg-destructive/5 hover:shadow-destructive/10" : "hover:border-primary/30 hover:shadow-primary/5"}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium font-mono text-muted-foreground tracking-wider">
          {title}
        </CardTitle>
        <Icon className={`w-4 h-4 ${alert ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-mono ${alert ? "text-destructive" : ""}`}>{value ?? 0}</div>
      </CardContent>
    </Card>
  );
}
