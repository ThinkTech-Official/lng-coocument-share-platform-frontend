import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <span className="text-2xl font-bold tracking-wide">
              <span className="text-lng-blue">LNG</span>
              <span className="text-lng-red"> CANADA</span>
            </span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
