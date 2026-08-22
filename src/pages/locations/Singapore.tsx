import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { singapore } from '@/content/locations/singapore';

const Singapore = () => <LocationPage content={locationContent(singapore)} />;

export default Singapore;
