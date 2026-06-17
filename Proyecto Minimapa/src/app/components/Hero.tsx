import React from 'react';
import { Map, ArrowRight } from 'lucide-react';

interface HeroProps {
  onOpenMap: () => void;
}

export const Hero = ({ onOpenMap }: HeroProps) => {
  return (
    <section className="w-full bg-[#f4f7fb] py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 max-w-6xl mx-auto">
          
          {/* Left Side: Image Carousel Area */}
          <div className="w-full md:w-1/2 relative rounded-lg overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1/5 bg-gradient-to-r from-yellow-400 via-green-500 to-red-500 opacity-20"></div>
            <img 
              src="https://images.unsplash.com/photo-1760992003987-efc5259bcfbf?ixlib=rb-4.1.0&auto=format&fit=crop&w=1080&q=80" 
              alt="Community Service" 
              className="w-full h-[400px] object-cover"
            />
            {/* Overlay badge matching design */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0055A5] text-white py-2 px-4 flex items-center gap-4">
              <div className="bg-white rounded-full p-1 h-12 w-12 flex items-center justify-center -mt-6 ml-2 border-4 border-[#0055A5]">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Logo_UAS.png" alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <span className="font-semibold tracking-[0.2em] text-sm md:text-base">
                DIRECCIÓN GENERAL DE SERVICIO SOCIAL
              </span>
            </div>
          </div>

          {/* Right Side: Content */}
          <div className="w-full md:w-1/2 flex flex-col items-start space-y-6 px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-[#0055A5] leading-tight font-sans tracking-tight">
              ¡Puente entre el conocimiento y el bienestar!
            </h2>
            <h3 className="text-xl md:text-3xl font-semibold text-[#0055A5] leading-snug">
              La UAS, transformando a Sinaloa a través del Servicio Social y la solidaridad comunitaria
            </h3>
            
            <button className="flex items-center text-[#0055A5] font-semibold text-lg uppercase tracking-wide hover:underline mt-4 group">
              Sigue leyendo 
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-8 w-full">
               <button 
                  onClick={onOpenMap}
                  className="w-full md:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform"
               >
                 <Map className="w-6 h-6" />
                 ABRIR MAPA INTERACTIVO
               </button>
               <p className="text-sm text-gray-500 mt-3 font-medium">
                 Explora los módulos de atención y asesores por ubicación
               </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
