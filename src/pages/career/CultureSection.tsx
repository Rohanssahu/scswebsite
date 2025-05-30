const CultureSection = () => {
  return (
    <section className="bg-gray-100 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">A Happy Place To Work</h2>

        <div className="grid md:grid-cols-2 gap-10 mb-12 items-start">
          {/* Left: Image */}
          <img
            src="https://phytontalent.com/wp-content/uploads/2020/08/diversity.png" // Replace with actual image path
            alt="Team working together"
            className="rounded shadow"
          />

          {/* Right: Inclusion and Diversity Text */}
          <div>
            <h3 className="text-xl font-bold mb-3">INCLUSION AND DIVERSITY</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
            Scs believes that a diverse and inclusive environment establishes a sense of belonging among
              the employees and when employees feel more connected at the workplace, it unleashes innovation and allows
              our people to perform better and better every day, producing higher output than usual.
              <br /><br />
              Scs purpose in conducting the business is to serve our people, clients, and communities while accelerating
              equality for all. Our purpose and our commitment towards our values drive our innovation agenda, help us deliver
              360 values, and ensure we act as a responsible business leader in society.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">
          {/* Left: Equal Opportunities Text */}
          <div>
            <h3 className="text-xl font-bold mb-3">EQUAL OPPORTUNITIES</h3>
            <ul className="text-gray-700 text-sm list-disc list-inside space-y-2">
              <li>Be a part of the select few CMMI Level 5 software company.</li>
              <li>We encourage technical training and certifications to expose you to best practices in the industry.</li>
              <li>We focus on nurturing people skills to give best performance at work.</li>
              <li>We encourage and support work-life balance.</li>
            </ul>
          </div>

          {/* Right: Image */}
          <img
            src="https://www.shiftbase.com/hs-fs/hubfs/Imported%20sitepage%20images/dac67781-1061-4ad6-bc25-72d30df3b267.jpeg?width=1000&height=667&name=dac67781-1061-4ad6-bc25-72d30df3b267.jpeg" // Replace with actual image path
            alt="Team smiling"
            className="rounded shadow"
          />
        </div>
      </div>
    </section>
  );
};

export default CultureSection;
