import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { cloudSolutions } from '@/content/services/cloudSolutions';

const CloudSolutions = () => <ServicePage content={serviceContent(cloudSolutions)} />;

export default CloudSolutions;
