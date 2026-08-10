'use client';

import { Icon } from './Icon';
import { pushToast } from './ToastQueue';
import type { Draft } from '@/lib/useDraft';

/**
 * The Save changes bar for a configuration screen.
 *
 * Renders nothing at all when there is nothing to save, so a screen the
 * player is only reading stays as quiet as it was before. Once they change
 * something it appears at the foot of the screen and stays there — the one
 * unmissable statement that an edit has been made and is waiting on them,
 * on screens whose previous feedback for a change was nothing whatsoever.
 *
 * It says what leaving does, because the honest answer is "keeps them": the
 * draft commits on unmount rather than evaporating (see `useDraft`), and a
 * bar that implied otherwise would be lying to make itself sound tidier.
 */
export default function SaveBar<T>({
  draft,
  /** What is being saved, e.g. "Tactics". Sentence-leading, so capitalised. */
  what,
}: {
  draft: Draft<T>;
  what: string;
}) {
  if (!draft.dirty) return null;

  return (
    <div className="fm-savebar" role="status" data-tour="save-bar">
      <span className="fm-savebar__icon" aria-hidden="true">
        <Icon name="warning" size={15} />
      </span>
      <span className="fm-savebar__text">
        <b>
          {draft.count} unsaved change{draft.count === 1 ? '' : 's'}
        </b>
        <span>Leaving this screen saves them too.</span>
      </span>
      <button
        type="button"
        className="fm-btn fm-btn--ghost fm-btn--small"
        onClick={() => {
          draft.discard();
          pushToast(`${what} reverted — back to your saved setup.`, 'info');
        }}
      >
        Discard
      </button>
      <button
        type="button"
        className="fm-btn fm-btn--primary fm-btn--small"
        onClick={() => {
          const n = draft.count;
          draft.save();
          pushToast(`${what} saved — ${n} change${n === 1 ? '' : 's'} applied.`, 'success');
        }}
      >
        <Icon name="check" size={13} /> Save changes
      </button>
    </div>
  );
}
