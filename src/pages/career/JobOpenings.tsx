import { Link, useLocation } from 'react-router-dom';
const JobOpenings = () => {
  const jobs = [
    {
      title: 'React Native Developer Intern',
      openings: 2,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'React.js Intern',
      openings: 2,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'MERN Stack Intern',
      openings: 2,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'UI/UX Designer Intern',
      openings: 1,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'Business Development Executive (BDE) Intern',
      openings: 1,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'Python Developer Intern',
      openings: 2,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
    {
      title: 'AI/ML Developer Intern',
      openings: 1,
      location: 'Indore',
      experience: '0 - 1 Year',
    },
  ];
  
  return (
    <section className="bg-gray-100 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-2">Join our team</h2>
        <p className="text-center text-gray-600 mb-8">
          Begin a professionally, financially and personally rewarding career with us. 
          Find the right business area for you and apply.
        </p>

        <div className="space-y-4">
          {jobs.map((job, index) => (
           <div
           key={index}
           className="bg-white px-6 py-4 rounded border flex flex-col md:flex-row md:items-center md:justify-between"
         >
           {/* Left: Job Title and Openings */}
           <div className="flex-1 mb-4 md:mb-0 md:w-1/3">
             <h3 className="text-lg font-semibold">{job.title}</h3>
             <p className="text-sm text-gray-500">{job.openings} openings</p>
           </div>
         
           {/* Middle: Location and Experience */}
           <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-gray-600 md:w-1/3">
             <div className="flex items-center gap-1">
               <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 2C6.14 2 3 5.14 3 9c0 5.25 7 9 7 9s7-3.75 7-9c0-3.86-3.14-7-7-7zM5 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.97-3.28 5.87-5 7.19C8.28 14.87 5 11.97 5 9z" />
                 <circle cx="10" cy="9" r="2.5" />
               </svg>
               <span>{job.location}</span>
             </div>
             <div className="flex items-center gap-1">
               <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 10V5h2v5h3v2H9z" />
               </svg>
               <span>{job.experience}</span>
             </div>
           </div>
         
           {/* Right: Buttons */}
           <div className="flex space-x-2 mt-4 md:mt-0 md:w-1/3 md:justify-end">
             <Link to="/ApplicationForm">
               <button className="border border-red-500 text-red-500 px-4 py-1 rounded hover:bg-red-50 text-sm">
                 Apply Now
               </button>
             </Link>
             <button className="border border-red-500 text-red-500 px-4 py-1 rounded hover:bg-red-50 text-sm">
               View Details
             </button>
           </div>
         </div>
         
          ))}
        </div>
      </div>
    </section>
  );
};

export default JobOpenings;
