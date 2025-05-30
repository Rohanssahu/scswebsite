const HeroSection = () => {
    return (
      <section className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Take Your Career to New Heights
        </h1>
        <p className="text-lg md:text-xl mb-6">
          Join our team and shape the future of technology with us!
        </p>
        <a
          href="#openings"
          className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
        >
          Explore Open Positions
        </a>
      </section>
    );
  };
  
  export default HeroSection;
  