import { useState, useRef, useEffect } from "react";
import { 
  useListNotes, 
  useCreateNote, 
  useUpdateNote, 
  useDeleteNote,
  Note 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, StickyNote, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Notes() {
  const { data: notes, isLoading } = useListNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();

  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);

  useEffect(() => {
    if (notes && notes.length > 0 && !activeNoteId) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const handleCreate = () => {
    createNote.mutate(
      { data: { content: "New note..." } },
      {
        onSuccess: (newNote) => {
          queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
          setActiveNoteId(newNote.id);
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteNote.mutate(
      { noteId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
          if (activeNoteId === id) setActiveNoteId(null);
        }
      }
    );
  };

  const activeNote = notes?.find(n => n.id === activeNoteId);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight">Notes Base</h1>
          <p className="text-muted-foreground mt-1">Your personal knowledge repository.</p>
        </div>
        <Button onClick={handleCreate} className="font-mono">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar */}
        <div className="w-1/3 border rounded-lg bg-card overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-muted/50 font-mono text-sm font-semibold flex items-center text-muted-foreground">
            <StickyNote className="w-4 h-4 mr-2" />
            ALL NOTES
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : notes?.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">No notes yet.</div>
            ) : (
              notes?.map(note => (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    activeNoteId === note.id 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="truncate text-sm font-mono mb-1">
                    {note.content.split('\n')[0] || "Empty note"}
                  </div>
                  <div className="text-xs opacity-60 font-mono flex justify-between">
                    <span>{format(new Date(note.updatedAt), "MMM d")}</span>
                    {note.topicName && <span className="truncate ml-2">{note.topicName}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 border rounded-lg bg-card overflow-hidden flex flex-col relative">
          {activeNote ? (
            <Editor note={activeNote} onDelete={() => handleDelete(activeNote.id)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select or create a note
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Editor({ note, onDelete }: { note: Note, onDelete: () => void }) {
  const [content, setContent] = useState(note.content);
  const updateNote = useUpdateNote();
  const queryClient = useQueryClient();
  const initializedId = useRef<number | null>(null);

  useEffect(() => {
    if (initializedId.current !== note.id) {
      setContent(note.content);
      initializedId.current = note.id;
    }
  }, [note.id, note.content]);

  const handleSave = (newContent: string) => {
    if (newContent === note.content) return;
    updateNote.mutate(
      { noteId: note.id, data: { content: newContent } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
        }
      }
    );
  };

  return (
    <>
      <div className="p-3 border-b bg-muted/50 flex justify-between items-center shrink-0">
        <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
          {note.topicName && (
            <span className="bg-background px-2 py-1 rounded border">{note.topicName}</span>
          )}
          {note.questionTitle && (
            <span className="bg-background px-2 py-1 rounded border">{note.questionTitle}</span>
          )}
          {updateNote.isPending && <span className="text-primary flex items-center"><Save className="w-3 h-3 mr-1 animate-pulse" /> Saving...</span>}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={(e) => handleSave(e.target.value)}
        className="flex-1 border-0 rounded-none focus-visible:ring-0 p-6 resize-none font-mono text-sm leading-relaxed"
        placeholder="Start typing..."
      />
    </>
  );
}
