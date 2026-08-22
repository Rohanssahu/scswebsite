import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { webApplicationDevelopment } from '@/content/services/webApplicationDevelopment';

const WebApplicationDevelopment = () => <ServicePage content={serviceContent(webApplicationDevelopment)} />;

export default WebApplicationDevelopment;
