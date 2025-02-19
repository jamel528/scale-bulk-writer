import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertBatchRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Send } from "lucide-react";

export function ArticleForm({ onSubmit }: { onSubmit: (id: number) => void }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertBatchRequestSchema),
    defaultValues: {
      topics: "",
      keywords: "",
      count: 1
    }
  });

  async function handleSubmit(data: { topics: string; keywords: string; count: number }) {
    try {
      const res = await apiRequest("POST", "/api/batch", data);
      const batch = await res.json();
      onSubmit(batch.id);
      toast({
        title: "Success",
        description: "Article generation started"
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="topics"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topics</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter main topics (e.g., Artificial Intelligence, Machine Learning)"
                  className="min-h-[100px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Separate multiple topics with commas for better article variety
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keywords</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter keywords (e.g., neural networks, deep learning)"
                  className="min-h-[100px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include specific terms you want to appear in your articles
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="count"
          render={({ field: { onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Number of Articles</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={2500}
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value, 10) : 1;
                    onChange(isNaN(value) ? 1 : Math.max(1, Math.min(2500, value)));
                  }}
                />
              </FormControl>
              <FormDescription>Choose between 1 and 2,500</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          <Send className="mr-2 h-4 w-4" />
          Generate Articles
        </Button>
      </form>
    </Form>
  );
}