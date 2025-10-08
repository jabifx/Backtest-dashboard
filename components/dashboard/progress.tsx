import { Progress } from "@/components/ui/progress";

interface BacktestProgressProps {
    progress: number;
    statusMessage: string;
}

export function BacktestProgress({ progress, statusMessage }: BacktestProgressProps) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
                <span>Progress</span>
                <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full h-2 shadow-inner" />
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </div>
    );
}