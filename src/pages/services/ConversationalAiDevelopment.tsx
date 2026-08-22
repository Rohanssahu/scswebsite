import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { conversationalAiDevelopment } from '@/content/services/conversationalAiDevelopment';

const ConversationalAiDevelopment = () => <ServicePage content={serviceContent(conversationalAiDevelopment)} />;

export default ConversationalAiDevelopment;
