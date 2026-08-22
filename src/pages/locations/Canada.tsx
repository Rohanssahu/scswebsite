import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { canada } from '@/content/locations/canada';

const Canada = () => <LocationPage content={locationContent(canada)} />;

export default Canada;
