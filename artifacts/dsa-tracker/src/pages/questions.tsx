import { useState } from "react";
import { 
  useListQuestions, 
  useUpdateQuestionProgress, 
  useListTopics,
  useCreateQuestion,
  QuestionWithProgress,
  ListQuestionsParams,
  QuestionProgressInputStatus
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, ExternalLink, Code2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Questions() {
  const [params, setParams] = useState<ListQuestionsParams>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    topicId: "",
    difficulty: "",
    platform: "LeetCode",
    link: "",
  });

  const { data: questions, isLoading } = useListQuestions(params, {
    query: {
      queryKey: ["/api/questions", params],
    }
  });
  const { data: topics } = useListTopics();
  const updateQuestion = useUpdateQuestionProgress();
  const createQuestion = useCreateQuestion();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleStatusChange = (question: QuestionWithProgress, status: QuestionProgressInputStatus) => {
    updateQuestion.mutate(
      { questionId: question.id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Progress updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
          queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
          queryClient.invalidateQueries({ queryKey: ["/api/revisions"] });
        }
      }
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.title || !newQuestion.topicId || !newQuestion.difficulty || !newQuestion.platform) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    createQuestion.mutate({
      data: {
        title: newQuestion.title,
        topicId: Number(newQuestion.topicId),
        difficulty: newQuestion.difficulty as any,
        platform: newQuestion.platform,
        link: newQuestion.link || "",
      }
    }, {
      onSuccess: () => {
        toast({ title: "Question added successfully!" });
        setIsDialogOpen(false);
        setNewQuestion({ title: "", topicId: "", difficulty: "", platform: "LeetCode", link: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
        queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      },
      onError: (err: any) => {
        toast({ title: "Failed to add question", description: err.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  const difficultyColors = {
    Easy: "text-green-500 bg-green-500/10 border-green-500/20",
    Medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Hard: "text-red-500 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Questions</h1>
          <p className="text-muted-foreground mt-1">Search, filter, and track your problem-solving progress.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-mono">Add Custom Question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title" 
                  value={newQuestion.title} 
                  onChange={e => setNewQuestion({...newQuestion, title: e.target.value})} 
                  placeholder="e.g. Two Sum" 
                />
              </div>
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Select value={newQuestion.topicId} onValueChange={v => setNewQuestion({...newQuestion, topicId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics?.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty *</Label>
                <Select value={newQuestion.difficulty} onValueChange={v => setNewQuestion({...newQuestion, difficulty: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform *</Label>
                  <Input 
                    id="platform" 
                    value={newQuestion.platform} 
                    onChange={e => setNewQuestion({...newQuestion, platform: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link">Link (Optional)</Label>
                  <Input 
                    id="link" 
                    value={newQuestion.link} 
                    onChange={e => setNewQuestion({...newQuestion, link: e.target.value})} 
                    placeholder="https://..." 
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={createQuestion.isPending}>
                  {createQuestion.isPending ? "Adding..." : "Add Question"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search problems..." 
            className="pl-9 font-mono"
            onChange={(e) => setParams(p => ({ ...p, search: e.target.value || undefined }))}
          />
        </div>
        
        <Select onValueChange={(val) => setParams(p => ({ ...p, topicId: val === "all" ? undefined : Number(val) }))}>
          <SelectTrigger className="w-[180px] font-mono">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {topics?.map(t => (
              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(val: any) => setParams(p => ({ ...p, difficulty: val === "all" ? undefined : val }))}>
          <SelectTrigger className="w-[140px] font-mono">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Difficulty</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(val: any) => setParams(p => ({ ...p, status: val === "all" ? undefined : val }))}>
          <SelectTrigger className="w-[140px] font-mono">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Status</SelectItem>
            <SelectItem value="Not Started">Not Started</SelectItem>
            <SelectItem value="Attempted">Attempted</SelectItem>
            <SelectItem value="Solved">Solved</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={(val: any) => setParams(p => ({ ...p, sortBy: val === "default" ? undefined : val }))}>
          <SelectTrigger className="w-[140px] font-mono bg-secondary/50">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="difficulty">Difficulty</SelectItem>
            <SelectItem value="recentlySolved">Recently Solved</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : questions?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-secondary/20">
          <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium font-mono mb-2">No questions found</h3>
          <p>Try adjusting your filters or start solving questions!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions?.map((q) => (
            <Card key={q.id} className="overflow-hidden transition-all hover:border-primary/50">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-center p-4 gap-4">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${difficultyColors[q.difficulty]}`}>
                        {q.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono truncate">{q.topicName}</span>
                    </div>
                    <a 
                      href={q.link || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-medium text-lg flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      {q.title}
                      {q.link && <ExternalLink className="w-4 h-4 opacity-50" />}
                    </a>
                    <div className="text-xs text-muted-foreground mt-1">Platform: {q.platform}</div>
                  </div>

                  <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-end">
                    <Select
                      value={q.status}
                      onValueChange={(val) => handleStatusChange(q, val as QuestionProgressInputStatus)}
                    >
                      <SelectTrigger className="w-[140px] font-mono">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="Attempted">Attempted</SelectItem>
                        <SelectItem value="Solved">Solved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
