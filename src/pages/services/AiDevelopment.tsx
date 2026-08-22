import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { aiDevelopment } from '@/content/services/aiDevelopment';

const AiDevelopment = () => <ServicePage content={serviceContent(aiDevelopment)} />;

export default AiDevelopment;
