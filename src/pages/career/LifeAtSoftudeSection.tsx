import React from "react";

const officelife = [
  {
    img: 'https://www.scssoftwares.com/images/reception.jpeg',
  },
  {
    img: 'https://www.scssoftwares.com/images/inside.jpeg',
  },
  {
    img: 'https://cdn.prod.website-files.com/631ec5866e474e5b101f6a41/66742bdb7a0658b92e561400_Life-at-Softude%20(6).webp',
  },
  {
    img: 'https://officebanao.com/wp-content/uploads/2024/06/diverse-female-colleagues-discussion-using-tablet-casual-office-meeting-casual-office-teamwork-business-lifestyle-communication-work-unaltered.webp',
  },
  {
    img: 'https://infobeans.com/wp-content/uploads/2023/11/Career-Page.png',
  },
  {
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPf17SOXx3t51H6zapZXsKzoFO6ffn06HBry6Pmgd6hUWEaxypfGp5rQoJ1XHUOcxcZfo&usqp=CAU',
  },
];

const LifeAtSoftudeSection = () => {
  const loopedImages = [...officelife, ...officelife]; // Repeat images for smooth loop

  return (
    <section className="relative bg-white py-16 px-4 overflow-hidden">
      {/* Background pattern (left) */}
      <div className="absolute left-0 top-0 h-full w-full bg-[url('/images/bg-pattern.svg')] bg-no-repeat bg-left opacity-10 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold mb-2">
          We live freely! <span className="text-black">Life@SCS</span>
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 mb-10 max-w-xl mx-auto text-sm">
          At Scs, we believe in delivering remarkable experiences to both our customers as well as team members.
        </p>

        {/* Scrolling Image Row */}
        <div className="overflow-hidden">
          <div className="flex gap-8 animate-scroll-slow min-w-max">
            {loopedImages.map((item, idx) => (
              <img
                key={idx}
                src={item.img}
                alt={`Office life ${idx}`}
                className="rounded-lg shadow-md object-cover w-[300px] h-[200px] flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-slow {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default LifeAtSoftudeSection;
