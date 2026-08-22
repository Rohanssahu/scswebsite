import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { netherlands } from '@/content/locations/netherlands';

const Netherlands = () => <LocationPage content={locationContent(netherlands)} />;

export default Netherlands;
