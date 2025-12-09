/**
 * Ultra-modern asymmetric login page for GOOD Talent
 * Features innovative design with dynamic color flows and floating elements
 */

import LoginForm from '@/components/LoginForm'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      
      {/* Left Panel - Brand Section (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        
        {/* Original Background with Flowing Colors */}
        <div className="absolute inset-0">
          {/* Primary Flow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#004C4C] via-[#065C5C] to-[#0A6A6A]"></div>
          
          {/* Flowing Color Waves */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#87E0E0] via-transparent to-[#5FD3D2] opacity-20 transform rotate-12 scale-150"></div>
            <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-l from-[#58BFC2] via-transparent to-[#87E0E0] opacity-15 transform -rotate-12 scale-110"></div>
          </div>
          

        </div>
        
        {/* Perfectly Centered Content */}
        <div className="relative z-10 flex items-center justify-center w-full h-screen p-8">
          <div className="text-center max-w-xl">
            
            {/* Logo Clean */}
            <div className="mb-10 flex justify-center">
              <img 
                src="https://irvgruylufihzoveycph.supabase.co/storage/v1/object/public/generales/Logo.png"
                alt="GOOD Talent Logo"
                className="h-36 w-auto object-contain transform hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Modern Title */}
            <h1 className="text-4xl lg:text-5xl font-bold text-[#E6F5F7] mb-4 leading-tight">
              Tu portal
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] mt-2">
                corporativo integral
              </span>
            </h1>
            
            {/* Elegant Description */}
            <p className="text-lg text-[#E6F5F7] opacity-85 mb-8 leading-relaxed font-light">
              Plataforma unificada para la gestión completa de recursos humanos, nómina y cumplimiento legal
            </p>
            
            {/* Modern Feature Pills */}
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-3 py-3 px-5 bg-white bg-opacity-5 rounded-full backdrop-blur border border-[#87E0E0] border-opacity-20 hover:bg-opacity-10 transition-all duration-300">
                <div className="w-2 h-2 bg-gradient-to-r from-[#87E0E0] to-[#5FD3D2] rounded-full"></div>
                <span className="text-[#E6F5F7] text-sm font-medium">Gestión de nómina automatizada</span>
              </div>
              <div className="flex items-center justify-center space-x-3 py-3 px-5 bg-white bg-opacity-5 rounded-full backdrop-blur border border-[#5FD3D2] border-opacity-20 hover:bg-opacity-10 transition-all duration-300">
                <div className="w-2 h-2 bg-gradient-to-r from-[#5FD3D2] to-[#58BFC2] rounded-full"></div>
                <span className="text-[#E6F5F7] text-sm font-medium">Control SST y cumplimiento normativo</span>
              </div>
              <div className="flex items-center justify-center space-x-3 py-3 px-5 bg-white bg-opacity-5 rounded-full backdrop-blur border border-[#58BFC2] border-opacity-20 hover:bg-opacity-10 transition-all duration-300">
                <div className="w-2 h-2 bg-gradient-to-r from-[#58BFC2] to-[#87E0E0] rounded-full"></div>
                <span className="text-[#E6F5F7] text-sm font-medium">Reportes legales y auditorías</span>
              </div>
            </div>
            
          </div>
        </div>
        
      </div>
      
      {/* Right Panel - Login Section (Symmetric) */}
      <div className="w-full lg:w-1/2 bg-gradient-to-bl from-white via-[#E6F5F7] to-[#E6F5F7] flex items-center justify-center p-4 lg:p-8 relative min-h-screen lg:min-h-0">
        
        {/* Clean Background */}
        <div className="absolute inset-0 hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-l from-[#87E0E0] via-transparent to-[#5FD3D2] opacity-5"></div>
        </div>
        
        {/* Mobile Optimized Layout */}
        <div className="w-full lg:hidden flex flex-col justify-center min-h-screen py-4">
          {/* Mobile Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="https://irvgruylufihzoveycph.supabase.co/storage/v1/object/public/generales/Logo.png"
              alt="GOOD Talent Logo"
              className="h-24 w-auto object-contain"
            />
          </div>
          
          {/* Mobile Login Form */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm mx-auto px-6">
              <LoginForm />
            </div>
          </div>
        </div>
        
        {/* Desktop - Perfectly Centered Form */}
        <div className="hidden lg:flex lg:items-center lg:justify-center w-full h-screen p-8">
          <div className="w-full max-w-lg relative">
            {/* Modern Glass Card */}
            <div className="relative bg-white bg-opacity-90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white border-opacity-30 p-8 lg:p-10">
              {/* Subtle Gradient Border */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#87E0E0] via-transparent to-[#5FD3D2] opacity-10 rounded-3xl"></div>
              
              {/* Content */}
              <div className="relative z-10">
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
        

      </div>
    </div>
  )
}