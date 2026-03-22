import React from 'react';

export const News = () => {
  const newsItems = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1758270705657-f28eec1a5694?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&q=80",
      category: "NOTICIAS",
      title: "UAS refuerza su compromiso social con nuevas brigadas",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1758270705317-3ef6142d306f?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&q=80",
      category: "NOTICIAS",
      title: "Encuentro estatal de prestadores de servicio social 2026",
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1643214410415-de1976ad74ff?ixlib=rb-4.1.0&auto=format&fit=crop&w=800&q=80",
      category: "NOTICIAS",
      title: "Impacto comunitario: Testimonios de éxito en el estado",
    }
  ];

  return (
    <section className="w-full bg-white py-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-4xl font-light text-black mb-12 border-b-2 border-gray-200 pb-4">
          Últimas noticias y eventos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsItems.map((item) => (
            <div key={item.id} className="flex flex-col group cursor-pointer">
              <span className="text-sm font-bold text-[#0055A5] uppercase tracking-widest mb-2">
                {item.category}
              </span>
              <div className="relative rounded-t-lg overflow-hidden border-2 border-transparent group-hover:border-[#0055A5] transition-all duration-300 shadow-md">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-64 object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay banner at bottom of image */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#0055A5] text-white py-2 flex items-center gap-3 pr-2">
                  <div className="bg-white rounded-full p-0.5 h-10 w-10 flex items-center justify-center -mt-6 ml-4 border-[3px] border-[#0055A5] shadow-sm flex-shrink-0">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Logo_UAS.png" alt="Logo" className="h-5 w-5 object-contain" />
                  </div>
                  <span className="font-semibold tracking-[0.1em] text-[10px] uppercase truncate">
                    DIRECCIÓN GENERAL DE SERVICIO SOCIAL
                  </span>
                </div>
              </div>
              
              <h3 className="mt-6 text-xl font-medium text-gray-800 group-hover:text-[#0055A5] transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
