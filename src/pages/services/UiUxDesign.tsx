import React from 'react';
import ServicePage from '@/components/services/ServicePage';
import { serviceContent } from '@/content/services';
import { uiUxDesign } from '@/content/services/uiUxDesign';

const UiUxDesign = () => <ServicePage content={serviceContent(uiUxDesign)} />;

export default UiUxDesign;
