import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "pending_titles":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      case "titles_ready":
        return "bg-purple-50 text-purple-700 ring-purple-600/20";
      case "processing":
        return "bg-yellow-50 text-yellow-700 ring-yellow-600/20";
      case "completed":
        return "bg-green-50 text-green-700 ring-green-600/20";
      case "completed_with_errors":
        return "bg-orange-50 text-orange-700 ring-orange-600/20";
      case "failed":
        return "bg-red-50 text-red-700 ring-red-600/20";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-600/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending_titles":
        return "Pending Titles";
      case "titles_ready":
        return "Titles Ready";
      case "processing":
        return "Processing";
      case "completed":
        return "Completed";
      case "completed_with_errors":
        return "Completed with Errors";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  return (
    <span className={cn(baseClasses, getStatusClasses(status), className)}>
      {getStatusText(status)}
    </span>
  );
}
