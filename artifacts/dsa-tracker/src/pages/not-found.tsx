import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <Card className="w-full max-w-md mx-4 border-primary/20 hover:border-primary/50 transition-all duration-300">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
          <AlertCircle className="h-16 w-16 text-primary mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold font-mono tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-mono text-muted-foreground mb-4">ENTITY_NOT_FOUND</h2>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            The algorithm failed to locate this node in the graph. Check your pointers and try again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
