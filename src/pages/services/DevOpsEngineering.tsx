import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { devopsEngineering } from '@/content/services/devopsEngineering';

const DevOpsEngineering = () => <ServicePage content={serviceContent(devopsEngineering)} />;

export default DevOpsEngineering;
