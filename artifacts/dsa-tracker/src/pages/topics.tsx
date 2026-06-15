import { useState } from "react";
import { useListTopics, useUpdateTopicProgress, TopicWithProgress, TopicProgressInputStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Topics() {
  const { data: topics, isLoading } = useListTopics();
  const updateTopic = useUpdateTopicProgress();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusChange = (topic: TopicWithProgress, newStatus: TopicProgressInputStatus) => {
    updateTopic.mutate(
      { topicId: topic.id, data: { status: newStatus } },
      {
        onSuccess: (updatedTopic) => {
          if (newStatus === "Completed") {
            toast({
              title: "Topic Completed! 🎉",
              description: `You've mastered ${topic.name}. Great job!`,
              className: "bg-primary text-primary-foreground border-primary",
            });
          } else {
            toast({ title: "Progress updated", description: `${topic.name} marked as ${newStatus}` });
          }
          queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold font-mono">Topics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono tracking-tight">Topics</h1>
        <p className="text-muted-foreground mt-1">Master these 16 core Data Structures & Algorithms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics?.map((topic) => (
          <Card key={topic.id} className={`flex flex-col ${topic.status === 'Completed' ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant={topic.status === 'Completed' ? 'default' : topic.status === 'In Progress' ? 'secondary' : 'outline'} className="font-mono">
                  {topic.status}
                </Badge>
                <Select
                  value={topic.status}
                  onValueChange={(val) => handleStatusChange(topic, val as TopicProgressInputStatus)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <CardTitle className="font-mono text-xl">{topic.name}</CardTitle>
              <CardDescription className="line-clamp-2">{topic.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>Questions</span>
                  <span>{topic.solvedCount} / {topic.questionCount}</span>
                </div>
                <Progress 
                  value={topic.questionCount > 0 ? (topic.solvedCount / topic.questionCount) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
