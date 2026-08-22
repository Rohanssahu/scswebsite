import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { customSoftwareDevelopment } from '@/content/services/customSoftwareDevelopment';

const CustomSoftwareDevelopment = () => <ServicePage content={serviceContent(customSoftwareDevelopment)} />;

export default CustomSoftwareDevelopment;
