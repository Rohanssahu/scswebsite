import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { digitalMarketing } from '@/content/services/digitalMarketing';

const DigitalMarketing = () => <ServicePage content={serviceContent(digitalMarketing)} />;

export default DigitalMarketing;
