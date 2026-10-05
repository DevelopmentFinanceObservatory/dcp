/**
 * ErrorView — the graceful failure surface for the error/timeout state.
 *
 * Driven by store status (a transport failure has no ResolveResponse), so it takes
 * a message + retry callback rather than a response. Announced via role="alert"
 * and offers a keyboard-operable recovery ("try again", which replays the last
 * resolve/hydrate) plus, when wired, "start over" — retry isn't the only way out
 * of a dead end. Meaning is carried by text, not colour alone.
 */

export function ErrorView({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset?: () => void;
}) {
  return (
    <section role="alert" aria-label="Error" className="rounded-xl border border-g3 bg-g1 px-3.5 py-3">
      <p className="mb-2 text-[15px] text-g6">{message}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-lg border border-g6 bg-white px-3 py-1.5 text-[14px] text-g6"
        >
          Try again
        </button>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1.5 text-[14px] text-g5 underline hover:text-g6"
          >
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
