import React from 'react';
import { GuideAction, GuideChatMessage } from '@/types/virtualGuide';
import QuickReplies from './QuickReplies';

interface GuideMessageProps {
  message: GuideChatMessage;
  onAction: (action: GuideAction) => void;
  /** Action buttons only stay clickable on the latest guide message. */
  actionsEnabled: boolean;
}

const GuideMessage = ({ message, onAction, actionsEnabled }: GuideMessageProps) => {
  if (message.from === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-orange-500 to-pink-500 px-3.5 py-2.5 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-700">
        {message.text}
      </div>
      {message.actions && message.actions.length > 0 && actionsEnabled && (
        <QuickReplies actions={message.actions} onAction={onAction} className="mt-2" />
      )}
    </div>
  );
};

export default GuideMessage;
