const EventsAtSoftudeSection = () => {
  return (
    <section className="bg-white py-16 px-4 text-gray-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Events@Scs</h2>
          <p className="text-sm text-gray-600 mt-2">
            At Scs, we believe in delivering remarkable experiences to both our customers as well as team members.
          </p>
        </div>

        {/* Diwali */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-start">
          <div>
            <h3 className="text-xl font-bold mb-2">Diwali Celebration</h3>
            <p className="text-sm text-gray-700">
              At Scs, we make sure that the entire team celebrates Diwali by amalgamating prosperity and safety together.
            </p>
          </div>
          <div>
            <img src="https://www.scssoftwares.com/images/aa.png" className="w-full h-70 object-cover rounded" />
          </div>
        </div>

        {/* Independence Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-start">
          <div>
            <img src="https://www.scssoftwares.com/images/cc.png" className="w-full h-70 object-cover rounded" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Independence Day Celebration</h3>
            <p className="text-sm text-gray-700">
              Team Scs celebrated Independence Day with pride, honoring our freedom fighters and enjoying patriotic performances.
            </p>
          </div>
        </div>

        {/* 🎂 Birthday Celebration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-start">
          <div>
            <h3 className="text-xl font-bold mb-2">Birthday Celebration</h3>
            <p className="text-sm text-gray-700">
              At Scs, we celebrate every team member’s birthday with joy and appreciation. Cake cutting, laughter, and warm wishes make the workplace feel like family.
            </p>
          </div>
          <div>
            <img src="https://www.scssoftwares.com/images/bb2.png" className="w-full h-70 object-cover rounded" />
          </div>
        </div>

        {/* 🎉 New Year Celebration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-start">
          <div>
            <img src="https://www.scssoftwares.com/images/dd.png" className="w-full h-70 object-cover rounded" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">New Year Celebration</h3>
            <p className="text-sm text-gray-700">
              We welcome the New Year with positivity, team bonding, and exciting celebrations. It’s a time to reflect on achievements and set new goals together.
            </p>
          </div>
        </div>

        {/* 🏆 Foundation Day */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          <div>
            <h3 className="text-xl font-bold mb-2">Foundation Day (22 December)</h3>
            <p className="text-sm text-gray-700">
              Foundation Day marks the beginning of our journey. We celebrate this special day with gratitude, team spirit, and pride in our achievements. It reminds us of our growth and motivates us for the future.
            </p>
          </div>
          <div>
            <img src="https://www.scssoftwares.com/images/ff.png" className="w-full h-70 object-cover rounded" />
          </div>
        </div>

      </div>
    </section>
  );
};

export default EventsAtSoftudeSection;