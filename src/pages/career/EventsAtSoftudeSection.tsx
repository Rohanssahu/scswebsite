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
  
          {/* Diwali Celebration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-start">
            <div>
              <h3 className="text-xl font-bold mb-2">Diwali Celebration</h3>
              <p className="text-sm text-gray-700">
                At Scs, we make sure that the entire team celebrates Diwali by amalgamating prosperity and safety together. Our earnest efforts concern embracing the festival of lights as a guiding force towards camaraderie and togetherness.
              </p>
            </div>
            <div className="grid gap-2">
              <img src="https://www.scssoftwares.com/images/diwali.png"  
         
             className="w-full h-70 object-cover rounded" />
              
            </div>
          </div>
  
          {/* Independence Day Celebration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="grid  gap-2">
              <img src="https://www.scssoftwares.com/images/inde.png" className="w-full h-70 object-cover rounded" />
              
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Independence Day Celebration</h3>
              <p className="text-sm text-gray-700">
                Team Scs celebrated the 76th Independence Day “Azadi Ka Amrit Mahotsav” based on five themes — Freedom, Ideas, Resolve, Actions, and Achievements. We pay homage to our great freedom fighters because of whom we breathe the air of freedom today.
                Lot many patriotic songs and dances performed by the Scs Team were the attractions of the evening. May the future bring more glory to our great nation. We are proud to be Indian and wish all the Indians a Happy Independence Day!
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  };
  
  export default EventsAtSoftudeSection;
  