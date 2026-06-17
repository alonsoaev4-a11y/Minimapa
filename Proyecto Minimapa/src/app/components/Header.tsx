import React from 'react';
import { Search } from 'lucide-react';

export const Header = () => {
  return (
    <header className="w-full bg-[#0055A5] text-white overflow-hidden relative">
      <div className="container mx-auto px-0 md:px-4 flex flex-col md:flex-row justify-between items-center h-auto md:h-32 relative">

        {/* Logo UAS */}
        <div className="flex-shrink-0 h-full py-2 flex items-center bg-white px-8 md:px-12 z-20">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Logo_UAS.png"
            alt="UAS Logo"
            className="h-24 object-contain"
          />
        </div>

        {/* Texto Central */}
        <div className="flex flex-col md:flex-row items-center justify-end flex-grow w-full relative h-full space-y-4 md:space-y-0">

          <div className="text-right flex flex-col justify-center px-4 md:px-8 z-10">
            <h1 className="text-xl md:text-3xl font-light tracking-wide mb-1">
              SUBDIRECCIÓN
            </h1>

            <h2 className="text-xl md:text-3xl font-light tracking-wide">
              DE SERVICIO SOCIAL
            </h2>
          </div>

          {/* Logo Subdirección */}
          <div className="hidden md:flex flex-shrink-0 h-full bg-white px-4 items-center justify-center relative z-20 min-w-[220px]">

            {/* Corte diagonal azul */}
            <div className="absolute top-0 bottom-0 left-[-20px] w-10 bg-[#0055A5] transform skew-x-[-15deg]"></div>

            <img
              src="/logo-subdireccion.png"
              alt="Subdirección Servicio Social UAS"
              className="h-28 object-contain relative z-10"
            />

          </div>

        </div>
      </div>

      {/* Barra inferior */}
      <div className="bg-[#004b87] w-full py-1 text-center hidden md:block border-t border-white/20">
        <p className="text-xs md:text-sm tracking-[0.2em] md:tracking-[0.4em] font-light text-white uppercase">
          U n i v e r s i d a d &nbsp; A u t ó n o m a &nbsp; d e &nbsp; S i n a l o a
        </p>
      </div>
    </header>
  );
};

export const Navigation = () => {
  const links = [
    "INICIO",
    "DGSS",
    "BRIGADISTAS",
    "ASESORES",
    "COORDINADORES",
    "UNIDADES RECEPTORAS",
    "NOTICIAS"
  ];

  return (
    <nav className="w-full bg-[#D4AF37] text-white sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center h-12 text-sm font-semibold tracking-wider">
          <ul className="flex space-x-10 items-center">
            {links.map((link) => (
              <li
                key={link}
                className="hover:text-[#0055A5] cursor-pointer transition-colors duration-200"
              >
                {link}
              </li>
            ))}

            <li className="cursor-pointer text-[#0055A5] hover:text-white transition-colors duration-200 ml-4">
              <Search size={18} />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};