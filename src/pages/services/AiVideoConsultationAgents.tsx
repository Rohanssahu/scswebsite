import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { aiVideoConsultationAgents } from '@/content/services/aiVideoConsultationAgents';

const AiVideoConsultationAgents = () => <ServicePage content={serviceContent(aiVideoConsultationAgents)} />;

export default AiVideoConsultationAgents;
