import React from 'react';
import LocationPage from '@/components/locations/LocationPage';
import { locationContent } from '@/content/locations';
import { turkey } from '@/content/locations/turkey';

const Turkey = () => <LocationPage content={locationContent(turkey)} />;

export default Turkey;
