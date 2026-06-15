import { useGetMe, useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();

  if (userLoading || statsLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-8">
            <Skeleton className="h-24 w-24 rounded-full mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Operator Profile</h1>
        <p className="text-muted-foreground mt-1">Identity and global statistics.</p>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="h-32 bg-primary/10 w-full relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        </div>
        <CardContent className="p-8 relative">
          <div className="w-24 h-24 bg-card rounded-xl border-2 border-primary/30 flex items-center justify-center absolute -top-12 shadow-lg">
            <User className="w-12 h-12 text-primary" />
          </div>

          <div className="mt-12 space-y-6">
            <div>
              <h2 className="text-2xl font-bold font-mono">{user?.name}</h2>
              <div className="flex items-center text-muted-foreground mt-2 font-mono text-sm gap-6">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 opacity-70" />
                  {user?.email}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 opacity-70" />
                  Joined {user?.createdAt ? format(new Date(user.createdAt), "MMM yyyy") : "Unknown"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-dashed">
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">Total Solved</p>
                <p className="text-2xl font-bold text-primary">{stats?.solvedQuestions}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">Mastered Topics</p>
                <p className="text-2xl font-bold text-primary">{stats?.completedTopics}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-primary">{stats?.overallProgress.toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-muted-foreground">Status</p>
                <Badge className="font-mono mt-1">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
