import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { mobileAppDevelopment } from '@/content/services/mobileAppDevelopment';

const MobileAppDevelopment = () => <ServicePage content={serviceContent(mobileAppDevelopment)} />;

export default MobileAppDevelopment;
