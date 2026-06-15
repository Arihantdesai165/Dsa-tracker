import { useListRevisions, useCompleteRevision } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isPast } from "date-fns";

export default function Revisions() {
  // Fetch ALL pending revisions in a single call — avoid boolean coercion bug in query params
  const { data: allRevisions, isLoading } = useListRevisions({ status: "Pending" });

  const completeRevision = useCompleteRevision();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleComplete = (id: number) => {
    completeRevision.mutate(
      { revisionId: id },
      {
        onSuccess: () => {
          toast({ title: "Revision completed!" });
          queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
        },
      }
    );
  };

  // Split client-side: due today (or overdue) vs future
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueToday = allRevisions?.filter((r) => new Date(r.revisionDate) <= endOfToday) ?? [];
  const upcoming = allRevisions?.filter((r) => new Date(r.revisionDate) > endOfToday) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold font-mono">Spaced Repetition</h1>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Spaced Repetition</h1>
        <p className="text-muted-foreground mt-1">Review solved questions to reinforce your memory.</p>
      </div>

      {/* Due Today */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive font-mono font-bold tracking-tight">
          <AlertTriangle className="w-5 h-5" />
          <h2>DUE TODAY</h2>
          {dueToday.length > 0 && (
            <Badge variant="destructive" className="ml-1 font-mono">{dueToday.length}</Badge>
          )}
        </div>

        {dueToday.length === 0 ? (
          <Card className="border-dashed bg-secondary/10">
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary opacity-50" />
              <p>All caught up for today!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueToday.map((rev) => (
              <RevisionCard
                key={rev.id}
                revision={rev}
                onComplete={() => handleComplete(rev.id)}
                isUrgent
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-muted-foreground font-mono font-bold tracking-tight">
          <Clock className="w-5 h-5" />
          <h2>UPCOMING</h2>
          {upcoming.length > 0 && (
            <Badge variant="outline" className="ml-1 font-mono">{upcoming.length}</Badge>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4">
            No upcoming revisions. Solve questions to schedule them!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((rev) => (
              <RevisionCard
                key={rev.id}
                revision={rev}
                onComplete={() => handleComplete(rev.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RevisionCard({
  revision,
  onComplete,
  isUrgent = false,
}: {
  revision: any;
  onComplete: () => void;
  isUrgent?: boolean;
}) {
  const date = new Date(revision.revisionDate);
  const dateLabel = isToday(date) ? "Today" : format(date, "MMM d, yyyy");

  return (
    <Card className={isUrgent ? "border-destructive/40 bg-destructive/5" : "hover:border-primary/30 transition-colors"}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                Rev #{revision.revisionNumber}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{dateLabel}</span>
            </div>
            <div>
              <h3 className="font-medium font-mono truncate">
                {revision.questionTitle ?? revision.topicName ?? "—"}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {revision.questionTitle ? revision.topicName : "Topic revision"}
              </p>
              {revision.questionDifficulty && (
                <span className={`text-xs font-mono mt-1 inline-block ${
                  revision.questionDifficulty === "Easy"
                    ? "text-green-500"
                    : revision.questionDifficulty === "Medium"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}>
                  {revision.questionDifficulty}
                </span>
              )}
            </div>
          </div>
          <Button
            variant={isUrgent ? "default" : "secondary"}
            size="sm"
            onClick={onComplete}
            className="shrink-0"
          >
            Mark Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
