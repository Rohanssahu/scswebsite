import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { aiAutomationIntegration } from '@/content/services/aiAutomationIntegration';

const AiAutomationIntegration = () => <ServicePage content={serviceContent(aiAutomationIntegration)} />;

export default AiAutomationIntegration;
