import React from 'react';
import { useTranslation } from 'react-i18next';
import { GuideAction, GuideChatMessage } from '@/types/virtualGuide';
import QuickReplies from './QuickReplies';

interface GuideMessageProps {
  message: GuideChatMessage;
  onAction: (action: GuideAction) => void;
  /** Action buttons only stay clickable on the latest guide message. */
  actionsEnabled: boolean;
}

const GuideMessage = ({ message, onAction, actionsEnabled }: GuideMessageProps) => {
  const { t } = useTranslation();
  if (message.from === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-se-sm bg-gradient-to-r from-orange-500 to-pink-500 px-3.5 py-2.5 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }
  // Guide bubbles re-render in the current language when they carry a key.
  const text = message.tKey ? t(message.tKey, { ...message.tParams, defaultValue: message.text }) : message.text;
  return (
    <div>
      <div className="max-w-[88%] rounded-2xl rounded-ss-sm border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-700">
        {text}
      </div>
      {message.actions && message.actions.length > 0 && actionsEnabled && (
        <QuickReplies actions={message.actions} onAction={onAction} className="mt-2" />
      )}
    </div>
  );
};

export default GuideMessage;
