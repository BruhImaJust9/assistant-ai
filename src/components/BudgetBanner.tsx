// Budget notification — warns when token usage nears or passes the budget.

import { Gauge, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import { cx } from '@/utils';

interface BudgetBannerProps {
  onViewUsage: () => void;
}

export function BudgetBanner({ onViewUsage }: BudgetBannerProps) {
  const usage = useUsage();
  const pct = usage.tokenBudget > 0 ? (usage.totalEstimatedTokens / usage.tokenBudget) * 100 : 0;
  const exhausted = pct >= 100;
  const nearing = pct >= usage.alertThreshold;

  if (usage.alertDismissed || !nearing) return null;

  const remaining = Math.max(usage.tokenBudget - usage.totalEstimatedTokens, 0);
  const title = exhausted ? 'Token budget reached' : `You've used ${Math.floor(pct)}% of your token budget`;
  const body = exhausted
    ? 'Usage is now above the budget you set. Raise the budget or reset usage in Settings.'
    : `About ${remaining.toLocaleString()} tokens remain. Nova Lite uses the fewest tokens if you want to stretch what's left.`;

  return (
    <div
      role="status"
      className={cx(
        'mx-3 mt-3 flex items-start gap-3 rounded-xl border px-3.5 py-3 animate-fade-up sm:mx-6',
        exhausted ? 'border-error-500/30 bg-error-500/10' : 'border-warning-500/30 bg-warning-500/10',
      )}
    >
      {exhausted ? (
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error-400" />
      ) : (
        <Gauge size={16} className="mt-0.5 shrink-0 text-warning-400" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cx('text-sm font-semibold', exhausted ? 'text-error-400' : 'text-warning-400')}>{title}</p>
        <p className="mt-0.5 text-2xs leading-relaxed text-ink-200">{body}</p>
      </div>
      <button
        type="button"
        onClick={onViewUsage}
        className="shrink-0 rounded-md bg-white/[0.08] px-2 py-1 text-2xs font-medium text-white hover:bg-white/[0.14]"
      >
        View usage
      </button>
      <button
        type="button"
        onClick={usage.dismissAlert}
        aria-label="Dismiss budget notification"
        className="shrink-0 rounded-md p-1 text-ink-300 hover:bg-white/[0.08] hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  );
}
