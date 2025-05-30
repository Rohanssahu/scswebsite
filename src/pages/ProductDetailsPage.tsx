import React, { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
const ProductDetailsPage = () => {
  const images = [
    'https://www.scssoftwares.com/images/roomji1.png',
    'https://www.scssoftwares.com/images/roomji2.png',
    'https://www.scssoftwares.com/images/roomji3.png',
    'https://www.scssoftwares.com/images/roomji4.png',
    'https://www.scssoftwares.com/images/roomji5.png',
  ];

  const product = {
    title: 'RoomJi',
    subtitle: 'Find & Book Rooms and Flats Online',
    description:
      'Search nearby rooms, flats, and all types of properties, with easy online booking and image galleries.',
    location: 'Indore MP, India',
    features: [
      'Instant booking confirmation',
      'High-quality images with virtual tours',
      '24/7 customer support',
      'Flexible cancellation policies',
    ],
    path: '/product/roomji',
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="relative overflow-hidden w-full h-72 md:h-[500px]">
  <div
    className="flex transition-transform duration-700 ease-in-out h-full"
    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
  >
    {images.map((img, i) => (
      <img
        key={i}
        src={img}
        alt={`${product.title} ${i + 1}`}
        className="w-full flex-shrink-0 object-cover h-full"
      />
    ))}
  </div>

      {/* Product Info below banner */}
      <div className="max-w-4xl mx-auto px-4 mt-10">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">{product.title}</h1>
        <h2 className="text-3xl font-semibold mb-6">{product.subtitle}</h2>
        <p className="text-gray-700 mb-8 text-lg">{product.description}</p>

        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-3">Location</h3>
          <p className="text-gray-600 text-lg">{product.location}</p>
        </div>

        <div className="mb-10">
          <h3 className="text-2xl font-semibold mb-4">Features</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2 text-lg">
            {product.features.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>

        <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition text-xl">
          Book Now
        </button>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default ProductDetailsPage;
