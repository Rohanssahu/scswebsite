import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = "G-1VQ1H1Y6S1";

let pageStartTime = 0;

export const initGA = () => {
  ReactGA.initialize(GA_MEASUREMENT_ID);
};


export const trackPageStart = () => {
  pageStartTime = Date.now();
};

export const trackPageEnd = (path: string) => {
  const durationSec = Math.round((Date.now() - pageStartTime) / 1000);
  ReactGA.event({
    category: "Page Engagement",
    action: "Time Spent",
    label: path,
    value: durationSec,  
  });
};


export const logPageView = (path: string, title = document.title) => {
  ReactGA.send({ hitType: "pageview", page: path, title });
};

export const logEvent = ({
  category,
  action,
  label,
  value,
}: {
  category: string;
  action: string;
  label?: string;
  value?: number;
}) => {
  ReactGA.event({ category, action, label, value });
};
