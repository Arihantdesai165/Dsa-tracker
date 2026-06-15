import { useListRevisions, useCompleteRevision } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, CalendarClock, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, isToday } from "date-fns";

export default function Revisions() {
  const { data: dueToday, isLoading: loadingToday } = useListRevisions({ dueToday: true, status: "Pending" });
  const { data: upcoming, isLoading: loadingUpcoming } = useListRevisions({ dueToday: false, status: "Pending" });
  
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
        }
      }
    );
  };

  const isLoading = loadingToday || loadingUpcoming;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold font-mono">Spaced Repetition</h1>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1,2].map(i => <Skeleton key={i} className="h-24" />)}
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

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive font-mono font-bold tracking-tight">
          <AlertTriangle className="w-5 h-5" />
          <h2>DUE TODAY</h2>
        </div>
        
        {dueToday?.length === 0 ? (
          <Card className="border-dashed bg-secondary/10">
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary opacity-50" />
              <p>All caught up for today!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueToday?.map(rev => (
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

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-muted-foreground font-mono font-bold tracking-tight">
          <Clock className="w-5 h-5" />
          <h2>UPCOMING</h2>
        </div>

        {upcoming?.length === 0 ? (
          <div className="text-muted-foreground text-sm">No upcoming revisions scheduled. Solve new questions to trigger them!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming?.map(rev => (
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

function RevisionCard({ revision, onComplete, isUrgent = false }: any) {
  return (
    <Card className={isUrgent ? "border-destructive/30 shadow-sm" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">Rev #{revision.revisionNumber}</Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {isToday(new Date(revision.revisionDate)) ? "Today" : format(new Date(revision.revisionDate), "MMM d, yyyy")}
              </span>
            </div>
            <div>
              <h3 className="font-medium font-mono">{revision.questionTitle}</h3>
              <p className="text-sm text-muted-foreground">{revision.topicName}</p>
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
