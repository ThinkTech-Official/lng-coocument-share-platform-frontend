import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-white flex w-full" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      {/* Left Column - Desktop Cover & Branding */}
      <div 
        className="hidden lg:flex md:w-1/2 relative bg-cover bg-center flex-col items-center justify-center p-12 select-none"
        style={{ backgroundImage: `url('/dbdaa9a63da1f216e3e8aa7641c90b3f03cdd0f7.png')` }}
      >
        <div className=" max-w-sm text-center absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3">
          <img 
            src="/lng-logo.png" 
            alt="LNG Canada Logo" 
            className="h-auto mb-2 object-contain" 
          />
          <p className="text-sm font-semibold text-lng-blue text-nowrap">
            Opportunity for British Columbia. Energy for the world.
          </p>
        </div>
      </div>

      {/* Right Column - Card Container & JV Footer */}
      <div className="flex-1 min-h-screen flex flex-col justify-between relative overflow-y-auto bg-white">
        
        {/* Mobile-only Branding Header */}
        <div className="w-full md:hidden flex justify-center mt-6 mb-4">
          <img 
            src="/c73ffe7c8df1cebd8eafd509c08073206129cbf4.png" 
            alt="LNG Canada Logo" 
            className="h-16 w-auto object-contain" 
          />
        </div>
        
        {/* Desktop top spacer */}
        <div className="hidden md:block h-8" />

        {/* Auth Card */}
        <div className="w-[calc(100%-2rem)] max-w-md mx-4 md:mx-auto self-center bg-white rounded-[16px] border border-[#E9E9E9] p-8 md:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative overflow-hidden pb-20">
          <Outlet />

          <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none flex justify-center">
            <img 
              src="/6d5a2b8c4dede1dbf9939be49a823a9503741e63.png" 
              alt="" 
              className="w-60 -mb-2 h-auto object-contain opacity-80" 
            />
          </div>
        </div>

        <div className="w-full bg-[#EDEDED] py-6 flex flex-col items-center justify-center gap-3 border-t border-[#E5E5E5] mt-12">
          <span className="text-[10px] md:text-xs font-semibold tracking-wider text-lng-grey select-none uppercase">
            A joint venture project of:
          </span>
          <div className="flex items-center justify-center gap-6 px-4 flex-wrap select-none">
            <img src="/e549592befe507d8383404a349f3a43bb902b583.png" alt="Shell" className="h-6 md:h-12 w-auto object-contain" />
            <img src="/b208972f703cbfd495e421c89d40228c68aa9368.png" alt="Petronas" className="h-6 md:h-12 w-auto object-contain" />
            <img src="/46cca8833b575abe2a221a1e7ef53a9015ae0aff.png" alt="Partner Logo" className="h-6 md:h-12 w-auto object-contain" />
            <img src="/274e4746ae36fc7b07e20716c56afa7b4955f00b.png" alt="Mitsubishi Corporation" className="h-6 md:h-12 w-auto object-contain" />
            <img src="/ded5b661684c92f5ba09a9817a7b021e3c7d4717.png" alt="Partner Logo" className="h-6 md:h-12 w-auto object-contain" />
          </div>
        </div>

      </div>

    </div>
  );
}

