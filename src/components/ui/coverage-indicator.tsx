import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPercentage, getCoverageColor, getCoverageBadgeVariant } from "@/utils/coverage";
import { cn } from "@/lib/utils";

interface CoverageIndicatorProps {
  percentage: number;
  suggested?: number;
  showProgress?: boolean;
  className?: string;
}

export function CoverageIndicator({ 
  percentage, 
  suggested, 
  showProgress = false, 
  className 
}: CoverageIndicatorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Badge variant={getCoverageBadgeVariant(percentage)}>
          {formatPercentage(percentage)}
        </Badge>
      </div>
      {showProgress && (
        <Progress 
          value={percentage} 
          className="h-2"
        />
      )}
    </div>
  );
}