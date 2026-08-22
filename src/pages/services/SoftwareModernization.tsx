import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { softwareModernization } from '@/content/services/softwareModernization';

const SoftwareModernization = () => <ServicePage content={serviceContent(softwareModernization)} />;

export default SoftwareModernization;
