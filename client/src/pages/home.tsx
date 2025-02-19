import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleForm } from "@/components/article-form";
import { ProgressIndicator } from "@/components/progress-indicator";
import { SiOpenai } from "react-icons/si";
import { Newspaper } from "lucide-react";

export default function Home() {
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="flex items-center gap-2 font-semibold">
            <SiOpenai className="h-5 w-5" />
            <span>AI Article Generator</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 px-4">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-block p-3 rounded-2xl bg-primary/10 text-primary mb-2">
              <Newspaper className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Bulk Article Generator
            </h1>
            <p className="text-muted-foreground text-lg">
              Generate up to 2,500 AI-written articles in a single batch, with intelligent title generation and review.
            </p>
          </div>

          {/* Generator Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Create New Batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ArticleForm onSubmit={setCurrentBatchId} />

              {currentBatchId && (
                <div className="mt-8 border-t pt-6">
                  <ProgressIndicator batchId={currentBatchId} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid gap-4 sm:grid-cols-2 mt-12">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-2">Two-Phase Generation</h3>
              <p className="text-sm text-muted-foreground">
                Review and approve AI-generated titles before proceeding with full article creation.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-2">Color-Coded Status</h3>
              <p className="text-sm text-muted-foreground">
                Track your article generation progress with intuitive color-coded status indicators.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}