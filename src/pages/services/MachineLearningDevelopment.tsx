import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { machineLearningDevelopment } from '@/content/services/machineLearningDevelopment';

const MachineLearningDevelopment = () => <ServicePage content={serviceContent(machineLearningDevelopment)} />;

export default MachineLearningDevelopment;
