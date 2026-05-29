import { useAuthStore } from '../../store/authStore';

export default function NotificationsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">

      {/* Announcement 1: Medical Fitness */}
      <div className="border border-lng-red/30 rounded-sm overflow-hidden shadow-sm">
        <div className="bg-lng-red text-white text-xs font-bold px-4 py-2.5">
          Medical Fitness to Work Updates January 1, 2026
        </div>
        <div className="bg-white p-4 text-xs text-lng-grey space-y-2 leading-relaxed">
          <p>
            The <strong>Acceptable Medication List</strong>, a component of the Offshore Medication Screening Process, has been updated. The <strong>Acceptable Medication List</strong> went live on <strong>January 1, 2026.</strong>
          </p>
          <p className="font-semibold text-lng-blue">
            Please refer to the "Medical Fitness to Work" document on the sidebar to learn more.
          </p>
        </div>
      </div>

      {/* Announcement 2: PED Restrictions */}
      <div className="border border-lng-orange/30 rounded-sm overflow-hidden shadow-sm">
        <div className="bg-lng-orange text-white text-xs font-bold px-4 py-2.5">
          Personal Electronic Device (PED) Restrictions starting October 1, 2025
        </div>
        <div className="bg-white p-4 text-xs text-lng-grey space-y-3 leading-relaxed">
          <p>
            Dear Partners in Safety,
          </p>
          <p>
            Effective October 1, 2025, new restrictions on the transportation of personal electronic devices (PEDs) by aircraft will be implemented to minimize the risks associated with lithium battery fires.
          </p>
          <p className="text-lng-red font-bold">
            Effective October 1, 2025, e-cigarettes/vapes and power banks will not be permitted on helicopter flights.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Laptops and tablets shall be completely switched OFF to avoid the battery overheating.</li>
            <li>Laptops and tablets shall be transported in a protective case or packaging.</li>
            <li>Mobile phones, earbuds, fitness trackers, and smart watches shall be switched OFF (if possible) and carried in a protective case on the passenger.</li>
          </ul>
        </div>
      </div>

      {/* Announcement 3: REAL ID */}
      <div className="border border-lng-blue/30 rounded-sm overflow-hidden shadow-sm">
        <div className="bg-lng-blue text-white text-xs font-bold px-4 py-2.5">
          REAL ID Required starting May 7th, 2025
        </div>
        <div className="bg-white p-4 text-xs text-lng-grey space-y-2 leading-relaxed">
          <p>
            Effective May 7, 2025, the Transportation Security Administration (TSA) will require passengers traveling by air to identify themselves using a REAL ID. This applies to all passengers traveling on contracted aircraft in the United States.
          </p>
          <p className="text-lng-red font-semibold">
            Passengers who do not present an acceptable form of REAL ID-compliant identification will be denied air transport.
          </p>
        </div>
      </div>

      {/* General HSE Info */}
      <div className="text-xs text-lng-grey space-y-3 leading-relaxed pt-2 border-t border-gray-100">
        <p>
          Protection of both the health and well-being of all employees and contractors and protection of the environment are of utmost concern to LNG Canada. To effectively manage contractor HSE performance, we utilize the Contractor HSE Management Process (CSMP).
        </p>
        <p>
          This process describes the identification, assessment, and control of HSE-related risk incurred by using contractors to provide services.
        </p>
      </div>
    </div>
  );
}
