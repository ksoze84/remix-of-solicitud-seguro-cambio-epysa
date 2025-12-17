import { Badge } from "@/components/ui/badge";
import { RequestStatus, STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusVariant = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.BORRADOR:
        return "secondary";
      case RequestStatus.EN_REVISION:
        return "default";
      case RequestStatus.APROBADA:
        return "default";
      case RequestStatus.RECHAZADA:
        return "destructive";
      case RequestStatus.ANULADA:
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.BORRADOR:
        return "text-muted-foreground";
      case RequestStatus.EN_REVISION:
        return "text-warning-foreground bg-warning";
      case RequestStatus.APROBADA:
        return "text-success-foreground bg-success";
      case RequestStatus.RECHAZADA:
        return "";
      case RequestStatus.ANULADA:
        return "text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <Badge 
      variant={getStatusVariant(status)}
      className={cn(getStatusColor(status), className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}