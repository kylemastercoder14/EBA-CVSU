import { StudentHeader } from '@/components/student/StudentHeader';
import { ReactNode } from "react";

const StudentProtectedLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-[#C8D6E4] flex items-center justify-center">
      <div className="mx-auto w-full max-w-245 overflow-hidden border border-[#0B525B] bg-[#C8D6E4] shadow-sm lg:min-h-[90vh]">
        <StudentHeader />
        {children}
      </div>
    </div>
  );
};

export default StudentProtectedLayout;
