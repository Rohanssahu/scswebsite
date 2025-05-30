const BlogSection = () => {
    const blogs = [
      {
        title: "How AI is Shaping the Metaverse: Unlocking New Opportunities",
        image: "https://cdn.prod.website-files.com/6320125ace536b6ad148eca3/682ad06a74f17c58e6ba13a2_Metaverse%20avatar%20collage%20concept-p-800.webp",
        tag: "Artificial Intelligence",
      },
      {
        title: "Smart Project Management with AI Agents: Capabilities, Tools, and Reality Check",
        image: "https://sixtysixten.com/wp-content/uploads/2024/12/ai-agent-for-project-management-1024x585.jpg",
        tag: "Artificial Intelligence",
      },
      {
        title: "From Smart to Sensitive: The Evolution of Emotional AI Agents",
        image: "https://aigptjournal.com/wp-content/uploads/2024/04/DALL%C2%B7E-2024-04-09-18.42.19-Two-side-by-side-images-in-a-3-to-2-ratio.-On-the-left-an-image-of-a-human-face-expressing-a-clear-emotion-such-as-happiness-or-surprise.-On-the-righ-1536x878.webp",
        tag: "Artificial Intelligence",
      },
    ];
  
    return (
      <section className="bg-white py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Our blogs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
              <div
                key={index}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="relative">
                  <img
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-48 object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    {blog.tag.toUpperCase()}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-2">{blog.title}</h3>
                  <a
                    href="#"
                    className="text-red-500 text-sm font-medium hover:underline flex items-center gap-1"
                  >
                    Read More →
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-6">
      <button
        className="px-6 py-2 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 text-white rounded-lg hover:bg-blue-700 transition duration-300"
        onClick={() => {
          window.location.href = '/BlogPage'; // Update with your route
        }}
      >
        View All Blogs
      </button>
    </div>
        </div>
      </section>
    );
  };
  
  export default BlogSection;
  