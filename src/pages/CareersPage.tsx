import React from "react";
import HeroSection from "./career/HeroSection";
import CultureSection from "./career/CultureSection";
import JobOpenings from "./career/JobOpenings";
import ApplicationForm from "./ApplicationForm";
import LifeAtSoftudeSection from "./career/LifeAtSoftudeSection";
import EventsAtSoftudeSection from "./career/EventsAtSoftudeSection";
import BlogSection from "./career/BlogSection";
import Footer from "../components/Footer";
import Header from "../components/Header";
const CareersPage = () => {
  return (
    <div>
      <Header />
      <HeroSection />
      <CultureSection />
      <LifeAtSoftudeSection />
      <EventsAtSoftudeSection />
      <JobOpenings />
      <BlogSection />
      <Footer />
    </div>
  );
};

export default CareersPage;
