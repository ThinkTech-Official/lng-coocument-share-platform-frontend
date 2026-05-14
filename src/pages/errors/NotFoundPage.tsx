import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import Button from '../../components/ui/Button';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 - Page Not Found | LNG Document Share';
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 relative overflow-hidden">
      <div className="flex flex-col items-center max-w-lg text-center z-10">
        <div className="relative mb-8 group">
          <div className="absolute -inset-8 bg-lng-blue/5 rounded-full blur-3xl animate-pulse group-hover:bg-lng-blue/10 transition-colors duration-500" />
          <div className="relative transform group-hover:scale-105 transition-transform duration-500">
            <FileQuestion size={160} strokeWidth={1} className="text-lng-blue/10" />
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-7xl font-bold text-lng-blue tracking-tighter">404</span>
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-lng-blue mb-4 tracking-tight">
          Oops! Page Not Found
        </h1>
        
        <p className="text-lng-grey mb-10 text-lg leading-relaxed">
          The page you are looking for might have been moved, deleted, 
          or maybe the URL is just mistyped. Let's get you back on track.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-6">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 py-3"
          >
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="flex-1 py-3 shadow-lg shadow-lng-blue/20 hover:shadow-xl hover:shadow-lng-blue/30 transition-shadow"
          >
            <Home size={18} className="mr-2" />
            Home Page
          </Button>
        </div>
      </div>
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-lng-blue/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-lng-orange/5 rounded-full translate-x-1/3 translate-y-1/3 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-64 h-64 bg-lng-yellow/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-[100px] pointer-events-none" />
      
      {/* Subtle pattern or grid could go here if needed, but clean white is premium too */}
    </div>
  );
};

export default NotFoundPage;
