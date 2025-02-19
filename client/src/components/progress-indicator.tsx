import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "./status-badge";
import type { BatchRequest } from "@shared/schema";

export function ProgressIndicator({ batchId }: { batchId: number }) {
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [batch, setBatch] = useState<BatchRequest | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  // Move WebSocket connection to a ref to persist across renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (batch?.status === "titles_ready") {
      const fetchTitles = async () => {
        const res = await apiRequest("GET", `/api/batch/${batch.id}`);
        const data = await res.json();
        setGeneratedTitles(data.generatedTitles);
      };
      fetchTitles();
    }
  }, [batch?.status]);

  // Add pagination for large title lists
  const [titlePage, setTitlePage] = useState(0);
  const TITLES_PER_PAGE = 100;

  // Paginate titles when displaying
  const paginatedTitles = generatedTitles?.slice(
    titlePage * TITLES_PER_PAGE,
    (titlePage + 1) * TITLES_PER_PAGE
  );

  const { data: initialBatch, isLoading } = useQuery<BatchRequest>({
    queryKey: [`/api/batch/${batchId}`],
    refetchInterval: false, // Disable polling since we're using WebSocket
  });

  useEffect(() => {
    if (initialBatch && !batch) {
      setBatch(initialBatch);
    }
  }, [initialBatch, batch]);

  useEffect(() => {
    function cleanup() {
      // Clear existing timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }

    function connect() {
      // Clean up any existing connection first
      cleanup();

      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
        window.location.host
      }/ws/batch-updates`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connection established");
        setReconnectAttempt(0);
        wsRef.current?.send(JSON.stringify({ type: "SUBSCRIBE_BATCH", batchId }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "BATCH_UPDATE") {
            setBatch(message.data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket connection closed");
        wsRef.current = null;

        // Only attempt reconnect if component is still mounted
        const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
        console.log(`Attempting to reconnect in ${backoffTime}ms`);

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt((prev) => prev + 1);
          connect();
        }, backoffTime);
      };
    }

    // Initial connection
    connect();

    // Set up ping interval
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "PING" }));
      }
    }, 30000);

    // Cleanup on unmount or batchId change
    return cleanup;
  }, [batchId]); // Only depend on batchId

  if (isLoading || !batch) return null;

  const isComplete = batch.status === "completed";
  const isFailed = batch.status === "failed";
  const isTitlesReady = batch.status === "titles_ready";
  const isProcessing = batch.status === "processing";
  const isPendingTitles = batch.status === "pending_titles";
  const showProgress = isProcessing || isPendingTitles;

  async function handleApproveTitles() {
    try {
      setIsApproving(true);
      if (!batch) {
        throw new Error("Batch not found");
      }
      if (!generatedTitles || !Array.isArray(generatedTitles)) {
        throw new Error("No titles available");
      }

      await apiRequest("POST", `/api/batch/${batchId}/approve`);

      toast({
        title: "Titles approved",
        description: "Article generation has started",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to approve titles",
      });
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={batch.status} />
        </div>
        <div className="text-sm text-muted-foreground">
          {showProgress ? `${batch.progress}%` : ""}
          {batch.queuePosition && !isComplete && !isFailed && (
            <span className="ml-2">Queue position: #{batch.queuePosition}</span>
          )}
        </div>
      </div>

      {showProgress && <Progress value={batch.progress} className="w-full" />}

      {isTitlesReady &&
        Array.isArray(generatedTitles) &&
        generatedTitles.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Generated Titles</h3>
                <span className="text-sm text-muted-foreground">
                  Total: {generatedTitles.length}
                </span>
              </div>

              <ul className="space-y-2">
                {paginatedTitles?.map((title: string, index: number) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {titlePage * TITLES_PER_PAGE + index + 1}.
                    </span>
                    {title}
                  </li>
                ))}
              </ul>

              {generatedTitles.length > TITLES_PER_PAGE && (
                <div className="flex justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTitlePage((p) => Math.max(0, p - 1))}
                    disabled={titlePage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {titlePage + 1} of{" "}
                    {Math.ceil(generatedTitles.length / TITLES_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTitlePage((p) => p + 1)}
                    disabled={
                      (titlePage + 1) * TITLES_PER_PAGE >=
                      generatedTitles.length
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={isApproving}
              onClick={handleApproveTitles}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Titles & Start Generation
            </Button>
          </div>
        )}

      {isComplete && (
        <Button asChild className="w-full">
          <a href={`/api/batch/${batchId}/download`} download>
            <Download className="mr-2 h-4 w-4" />
            Download Articles
          </a>
        </Button>
      )}
    </div>
  );
}
