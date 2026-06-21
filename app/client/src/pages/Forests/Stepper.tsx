/**
 * Wizard stepper header: numbered step badges + a green progress bar.
 * Reproduces the "Add Forest" screenshot: filled green circle for the active
 * step, "1 Basic Info / 2 Grid Config / ..." labels, and a horizontal track
 * that fills green up to the current step.
 *
 * Accessibility: rendered as an ordered list; the active step carries
 * aria-current="step". Completed steps are clickable to jump back (never
 * forward past an unvalidated step — the parent only allows backward jumps).
 */
import type { StepKey } from './types';

export interface StepperProps {
  steps: readonly StepKey[];
  labels: Record<StepKey, string>;
  /** index of the current step (0-based). */
  current: number;
  /** Jump to a previous step. Only invoked for indices <= current. */
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, labels, current, onStepClick }: StepperProps) {
  const total = steps.length;
  // Progress fills proportionally to the current step (1-based) over total.
  const progressPct = total <= 1 ? 100 : (current / (total - 1)) * 100;

  return (
    <div className="px-1">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((key, i) => {
          const isActive = i === current;
          const isComplete = i < current;
          const clickable = i < current && Boolean(onStepClick);
          const badgeClasses = isActive || isComplete
            ? 'bg-primary text-white'
            : 'bg-white/10 text-textSecondary';
          const labelClasses = isActive
            ? 'text-textPrimary font-medium'
            : isComplete
              ? 'text-textPrimary'
              : 'text-textSecondary';
          return (
            <li key={key} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                aria-current={isActive ? 'step' : undefined}
                onClick={clickable ? () => onStepClick?.(i) : undefined}
                className={`flex items-center gap-2 rounded-button px-1 py-0.5 text-sm ${clickable ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${badgeClasses}`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className={`whitespace-nowrap ${labelClasses}`}>
                  {labels[key]}
                </span>
              </button>
              {i < total - 1 ? (
                <span className="mx-1 text-textSecondary" aria-hidden="true">/</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Progress track */}
      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-pill bg-white/10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        aria-label={`Step ${current + 1} of ${total}`}
      >
        <div
          className="h-full rounded-pill bg-primary transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
