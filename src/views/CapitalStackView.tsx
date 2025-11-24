import { DebtSummaryPanel } from '../components/DebtSummaryPanel';
import type { FullModelOutput } from '../engines/pipeline/modelPipeline';

interface CapitalStackViewProps {
    modelOutput: FullModelOutput | null;
}

export function CapitalStackView({ modelOutput }: CapitalStackViewProps) {
    if (!modelOutput) return null;

    return (
        <div className="capital-stack-view">
            <DebtSummaryPanel
                debtSchedule={modelOutput.capital.debtSchedule}
                debtKpis={modelOutput.capital.debtKpis}
            />
        </div>
    );
}
