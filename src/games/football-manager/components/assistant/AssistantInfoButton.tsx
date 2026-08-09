'use client';

import { useAssistant, type TriggerData } from '../../hooks/useLassoKentAssistant';
import type { AssistantPage } from '../../data/lassoKentDialogues';

export default function AssistantInfoButton({
  page,
  data,
  label = 'Ask Lasso and Kent for help',
}: {
  page: AssistantPage;
  data?: TriggerData;
  label?: string;
}) {
  const assistant = useAssistant();

  return (
    <button
      type="button"
      className="fm-assistant-info"
      aria-label={label}
      title={label}
      onClick={() => {
        assistant.trigger(page, data);
        assistant.setOpen(true);
      }}
    >
      i
    </button>
  );
}
