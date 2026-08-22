import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { saasDevelopment } from '@/content/services/saasDevelopment';

const SaasDevelopment = () => <ServicePage content={serviceContent(saasDevelopment)} />;

export default SaasDevelopment;
